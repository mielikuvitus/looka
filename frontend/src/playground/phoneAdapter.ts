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
import type { ArSessionContext, FrameCallback } from './xrSession'
import * as THREE from 'three'
import { BEE_TARGET_SIZE_M } from './beeLoader'
import { createReticle } from './reticle'

export interface PhoneAdapterOptions {
  ctx: ArSessionContext
  bee: LoadedBee
  /** The #ar-overlay element (revealed by this adapter only), or null when missing. */
  overlayRoot: HTMLElement | null
}

export interface PhoneAdapter {
  dispose: () => void
}

export function createPhoneAdapter(options: PhoneAdapterOptions): PhoneAdapter {
  const { ctx, bee, overlayRoot } = options
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
  function onSelect() {
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
      overlayRoot?.removeEventListener('beforexrselect', suppressXrSelect)
      if (hintEl)
        hintEl.textContent = initialHint
      if (overlayRoot)
        overlayRoot.hidden = true
      bee.anchor.visible = true // hand a visible bee to whatever comes next
    },
  }
}
