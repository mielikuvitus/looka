// Looka playground — handheld AR interaction: viewer-space hit-testing, a
// placement reticle, and tap-to-place, plus the dom-overlay UI (hint + exit
// button) that only makes sense on a phone screen. Plain three.js + WebXR +
// DOM, no WebSpatial, no React (see main.ts header).
//
// If the hit-test source can't be created (feature not granted, or the
// browser exposes no requestHitTestSource), the adapter degrades gracefully
// to a fixed headset-style placement in front of the user instead of
// leaving an invisible bee.

import type { LoadedBee } from './beeLoader'
import type { MicOrb } from './micOrb'
import type { Phase, VoiceLoop } from './voiceLoop'
import type { ArSessionContext, FrameCallback } from './xrSession'
import * as THREE from 'three'
import { BEE_TARGET_SIZE_M } from './beeLoader'
import { createReticle } from './reticle'

export interface PhoneAdapterOptions {
  ctx: ArSessionContext
  bee: LoadedBee
  /** The #ar-overlay element (revealed by this adapter only), or null when missing. */
  overlayRoot: HTMLElement | null
  /** The mic orb — a tap on it taps the voice loop instead of moving the bee. */
  orb: MicOrb
  /** The voice loop — invoked when the orb ray hits. */
  voiceLoop: VoiceLoop
}

export interface PhoneAdapter {
  dispose: () => void
}

export function createPhoneAdapter(options: PhoneAdapterOptions): PhoneAdapter {
  const { ctx, bee, overlayRoot, orb, voiceLoop } = options
  const { session, renderer, scene } = ctx

  let disposed = false
  let hitTestSource: XRHitTestSource | null = null

  // The bee stays hidden until the user places it (or we degrade below).
  bee.anchor.visible = false

  // --- dom-overlay UI (phone only — headsets never construct this adapter) --
  const hintEl = overlayRoot?.querySelector<HTMLElement>('#ar-hint') ?? null
  // Capture the pristine playground.html hint so dispose() can restore it —
  // otherwise a re-entered session starts with last session's stale text.
  const initialHint = hintEl?.textContent ?? ''
  const exitButton = overlayRoot?.querySelector<HTMLButtonElement>('#ar-exit') ?? null
  const endSession = () => session.end().catch(() => {})
  if (overlayRoot)
    overlayRoot.hidden = false
  exitButton?.addEventListener('click', endSession)

  // --- "Talk to the bee" button — phone AR's primary voice affordance -------
  // A fixed DOM button, so voice starts on a reliable screen tap instead of
  // requiring a precise hit on the small, bobbing 3D orb. The click is a user
  // gesture, so the getUserMedia mic prompt (voiceLoop.tap → startRecording)
  // is allowed to fire. Its label mirrors the voice phase.
  const talkButton = overlayRoot?.querySelector<HTMLButtonElement>('#ar-talk') ?? null
  const initialTalkLabel = talkButton?.textContent ?? 'Talk to the bee'
  const onTalk = () => voiceLoop.tap()
  talkButton?.addEventListener('click', onTalk)

  const TALK_LABEL: Record<Phase, string> = {
    idle: 'Talk to the bee',
    recording: 'Tap to send',
    working: 'Thinking…',
    speaking: 'Speaking…',
  }
  const unsubscribePhase = voiceLoop.onPhase((phase) => {
    if (!talkButton)
      return
    talkButton.textContent = TALK_LABEL[phase]
    talkButton.classList.toggle('is-recording', phase === 'recording')
    // working/speaking are tap() no-ops — disable so the dead tap reads as busy.
    talkButton.disabled = phase === 'working' || phase === 'speaking'
  })

  // Taps that land on overlay UI (the exit button) must not double as
  // placement 'select' events — per the WebXR DOM Overlays spec they do
  // unless beforexrselect's default is prevented. #ar-overlay itself is
  // pointer-events: none, so tap-to-place is unaffected.
  const suppressXrSelect = (event: Event) => event.preventDefault()
  overlayRoot?.addEventListener('beforexrselect', suppressXrSelect)

  // --- reticle + hit-testing ------------------------------------------------
  const reticle = createReticle()
  scene.add(reticle.mesh)

  const onFrame: FrameCallback = (_time, frame) => {
    const referenceSpace = renderer.xr.getReferenceSpace()
    if (hitTestSource && referenceSpace)
      reticle.updateFromHitTest(frame, hitTestSource, referenceSpace)
  }
  ctx.addFrameCallback(onFrame)

  function degradeToFixedPlacement(reason: unknown) {
    console.warn('[playground] hit-test unavailable, degrading to fixed placement:', reason)
    if (disposed)
      return
    reticle.mesh.visible = false
    bee.anchor.position.set(0, ctx.gotFloorSpace ? 1.4 : 0, -0.6)
    bee.anchor.visible = true
    if (hintEl)
      hintEl.textContent = 'Surface detection is unavailable here — the bee is hovering in front of you.'
  }

  // Viewer-space hit-testing: the source casts along the camera's forward
  // ray, so the reticle lands where the phone is pointed.
  ;(async () => {
    if (!session.requestHitTestSource)
      throw new Error('XRSession.requestHitTestSource is not exposed')
    const viewerSpace = await session.requestReferenceSpace('viewer')
    const source = await session.requestHitTestSource({ space: viewerSpace })
    if (!source)
      throw new Error('requestHitTestSource returned no source')
    if (disposed) {
      source.cancel()
      return
    }
    hitTestSource = source
  })().catch(degradeToFixedPlacement)

  // --- tap to place -----------------------------------------------------------
  const placement = new THREE.Vector3()
  const orbRaycaster = new THREE.Raycaster()
  const tapOrigin = new THREE.Vector3()
  const tapOrientation = new THREE.Quaternion()
  function onSelect(event: XRInputSourceEvent) {
    // Orb first: a screen tap whose ray hits the orb cycles it and skips
    // placement, so the orb stays reachable once the bee is down. Gated on
    // the bee being placed — three.js raycasting ignores `visible=false`, so
    // without this guard the orb's proxy (parented to the still-invisible
    // anchor at the tracking origin) would intercept the FIRST placement tap.
    const referenceSpace = renderer.xr.getReferenceSpace()
    const targetRaySpace = event.inputSource?.targetRaySpace
    if (event.frame && targetRaySpace && referenceSpace) {
      const pose = event.frame.getPose(targetRaySpace, referenceSpace)
      if (pose) {
        const { position, orientation } = pose.transform
        tapOrigin.set(position.x, position.y, position.z)
        tapOrientation.set(orientation.x, orientation.y, orientation.z, orientation.w)
        orbRaycaster.ray.origin.copy(tapOrigin)
        orbRaycaster.ray.direction.set(0, 0, -1).applyQuaternion(tapOrientation)
        if (bee.anchor.visible && orb.raycast(orbRaycaster)) {
          voiceLoop.tap()
          return
        }
      }
    }
    if (!reticle.mesh.visible)
      return
    placement.setFromMatrixPosition(reticle.mesh.matrix)
    // The anchor origin is the bee's visual center — lift it half its size
    // so the bee sits on the tapped surface instead of clipping into it.
    bee.anchor.position.set(placement.x, placement.y + BEE_TARGET_SIZE_M / 2, placement.z)
    bee.anchor.visible = true
    if (hintEl)
      hintEl.textContent = 'Tap another spot to move the bee.'
  }
  session.addEventListener('select', onSelect)

  return {
    dispose() {
      if (disposed)
        return
      disposed = true
      session.removeEventListener('select', onSelect)
      ctx.removeFrameCallback(onFrame)
      hitTestSource?.cancel()
      hitTestSource = null
      reticle.dispose()
      exitButton?.removeEventListener('click', endSession)
      talkButton?.removeEventListener('click', onTalk)
      unsubscribePhase()
      if (talkButton) {
        // Restore the pristine label so a re-entered session never opens on a
        // stale "Speaking…"/disabled state (mirrors the initialHint restore).
        talkButton.textContent = initialTalkLabel
        talkButton.disabled = false
        talkButton.classList.remove('is-recording')
      }
      overlayRoot?.removeEventListener('beforexrselect', suppressXrSelect)
      if (hintEl)
        hintEl.textContent = initialHint
      if (overlayRoot)
        overlayRoot.hidden = true
      bee.anchor.visible = true // hand a visible bee to whatever comes next
    },
  }
}
