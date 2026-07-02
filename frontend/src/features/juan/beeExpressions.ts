import * as THREE from 'three'

/**
 * juan — bee expression/speech framework. Owner: juan (gentle default).
 *
 * A small, self-contained animation layer for `Bee_Kinde.glb`, built so a
 * future speech/TTS implementation only ever has to call
 * `controller.setState('speaking')` / `setState('idle')` — everything about
 * how the bee expresses that state (which skeletal clip plays, how the
 * mouth moves, blinking) lives in here.
 *
 * ## What's in the .glb (confirmed by parsing the file directly — see
 * `frontend/src/features/juan/README.md` for the full investigation)
 *
 * Four baked animation clips:
 * - `SitLeftRightLook` — sitting/idle, looking around (full skeleton)
 * - `TalkiTwoHand`     — talking, gestures with both hands (full skeleton)
 * - `Think`            — a dedicated thinking pose, added later specifically
 *                        to replace `WingsAnimation` below (full skeleton)
 * - `WingsAnimation`   — a short, isolated wing-flutter (only touches the
 *                        4 wing-adjacent nodes, not the whole skeleton) —
 *                        no longer used for `'thinking'` (see below), kept
 *                        around in the file, unused by this module
 *
 * Plus 4 morph targets (blend shapes) on one mesh (`polySurface9`, the
 * face), **not used by any baked clip** — fully free for procedural
 * control:
 * - `Bee_Blink.polySurface20` — eyes closed
 * - `Bee_Oo.polySurface21`    — mouth "oo" shape
 * - `Bee_Wide.polySurface22`  — mouth wide shape
 * - `Bee_Open.polySurface23`  — mouth open shape
 *
 * (The exact dictionary keys three.js exposes include the
 * `.polySurfaceNN` suffix Maya's exporter appended — this module matches
 * by prefix so that's an implementation detail callers don't need to
 * know.)
 *
 * ## Mental model
 *
 * Three states — `'idle' | 'thinking' | 'speaking'` — each map to one
 * skeletal clip (crossfaded smoothly on change), see `BeeExpressionConfig`
 * to remap which clip plays for which state.
 *
 * FIXED ISSUE (history, in case this regresses): `'thinking'` originally
 * played `WingsAnimation`, which only has keyframes for 4 wing-adjacent
 * nodes, not the whole skeleton — crossfading to it like a normal full-body
 * clip meant every *other* bone lost its only active influence once the
 * previous clip's weight reached 0, snapping to the rig's bind pose (a
 * T-pose) for as long as 'thinking' was active. Two workarounds (additive
 * blending, procedurally rotating just the wing nodes) were tried and
 * reverted — both fixed the T-pose but made the wing motion visually
 * indistinguishable from idle. The actual fix was a proper full-skeleton
 * `Think` clip (added directly to the .glb), which needs no special-casing
 * at all — same simple crossfade as idle/speaking. `WingsAnimation` is
 * unused now; don't reintroduce it as `thinkingClipName` without redoing
 * one of those workarounds.
 *
 * On top of that:
 *
 * - `blink()` does one deliberate, explicit blink: snap the eyes closed,
 *   hold briefly, snap back open. No easing curve, no automatic/periodic
 *   triggering — call it (e.g. from a debug button) and that's it. (An
 *   earlier version auto-triggered blinks on a random timer with an eased
 *   open/close envelope; that looked jumpy — the auto-timer could re-fire
 *   mid-blink and restart the envelope — so it's simplified to this for
 *   now. Revisit with a real easing curve / audio-driven triggering later
 *   if it needs to look more natural.)
 * - While in the `'speaking'` state, a **mouth-flap loop** cycles the
 *   three mouth morph targets on a randomized interval, layered on top of
 *   whatever clip is currently playing. This is a generic "talking wiggle"
 *   placeholder, not real lip-sync — there's no audio pipeline yet. If/when
 *   real audio arrives, replace `#updateMouthFlap` with something driven by
 *   audio amplitude (e.g. a Web Audio `AnalyserNode`) — the morph-target
 *   plumbing (`#setMouthWeights`) is already audio-agnostic and can be
 *   reused as-is.
 *
 * ## Usage
 *
 * ```ts
 * const controller = new BeeExpressionController(model, gltf.animations)
 * controller.setState('idle') // call once after the model loads
 *
 * // ... later, e.g. wired to a speech feature:
 * controller.setState('thinking') // while awaiting a backend/LLM response
 * controller.setState('speaking') // while audio/text is being "spoken"
 * controller.setState('idle')     // once done
 *
 * // every frame, in the same render loop that calls renderer.render(...):
 * controller.update(deltaSeconds)
 *
 * // when the XR session ends / the scene is torn down:
 * controller.dispose()
 * ```
 */

export type BeeState = 'idle' | 'thinking' | 'speaking'

export interface BeeExpressionConfig {
  /** Clip played on loop for the 'idle' state. Default: 'SitLeftRightLook'. */
  idleClipName?: string
  /** Clip played on loop for the 'thinking' state. Default: 'Think'. */
  thinkingClipName?: string
  /** Clip played on loop for the 'speaking' state. Default: 'TalkiTwoHand'. */
  speakingClipName?: string
  /** Crossfade duration (seconds) when switching between states. Default: 0.3. */
  crossfadeSeconds?: number
  /** How long (seconds) a triggered blink stays fully closed before reopening. Default: 0.3. */
  blinkHoldSeconds?: number
  /** Random range (seconds) between mouth-flap frames while speaking. Default: [0.08, 0.18]. */
  mouthFlapIntervalRange?: [number, number]
}

const DEFAULT_CONFIG: Required<BeeExpressionConfig> = {
  idleClipName: 'SitLeftRightLook',
  thinkingClipName: 'Think',
  speakingClipName: 'TalkiTwoHand',
  crossfadeSeconds: 0.3,
  blinkHoldSeconds: 0.3,
  mouthFlapIntervalRange: [0.08, 0.18],
}

/** Prefixes to match against `mesh.morphTargetDictionary` keys (see file-level doc). */
const MORPH_PREFIX = {
  blink: 'Bee_Blink',
  oo: 'Bee_Oo',
  wide: 'Bee_Wide',
  open: 'Bee_Open',
} as const

type MorphKey = keyof typeof MORPH_PREFIX

/** A mesh with morph targets, paired with the target indices we care about. */
interface MorphMesh {
  mesh: THREE.Mesh
  indices: Partial<Record<MorphKey, number>>
}

function randomInRange([min, max]: [number, number]): number {
  return min + Math.random() * (max - min)
}

export class BeeExpressionController {
  private readonly config: Required<BeeExpressionConfig>
  private readonly mixer: THREE.AnimationMixer
  private readonly actions: Partial<Record<BeeState, THREE.AnimationAction>>
  private readonly morphMeshes: MorphMesh[]

  private currentState: BeeState | null = null
  private currentAction: THREE.AnimationAction | null = null

  /** > 0 while the eyes are held closed from a triggered blink; counts down to 0. */
  private blinkHoldTimer = 0

  private mouthFlapTimer = 0
  private mouthTarget: MorphKey | 'closed' = 'closed'

  /**
   * @param model The loaded model root (e.g. `gltf.scene`) — searched for
   *   morph-target meshes and used as the AnimationMixer's root.
   * @param clips `gltf.animations` from the same load.
   */
  constructor(model: THREE.Object3D, clips: THREE.AnimationClip[], config: BeeExpressionConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.mixer = new THREE.AnimationMixer(model)
    this.actions = {}

    const clipFor = (name: string) => clips.find(clip => clip.name === name)
    const stateClipNames: Record<BeeState, string> = {
      idle: this.config.idleClipName,
      thinking: this.config.thinkingClipName,
      speaking: this.config.speakingClipName,
    }
    for (const [state, clipName] of Object.entries(stateClipNames) as [BeeState, string][]) {
      const clip = clipFor(clipName)
      if (!clip) {
        console.warn(`[bee-expressions] clip "${clipName}" not found for state "${state}"; available:`, clips.map(c => c.name))
        continue
      }
      this.actions[state] = this.mixer.clipAction(clip)
    }

    this.morphMeshes = []
    model.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!(mesh instanceof THREE.Mesh) || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences)
        return

      const indices: MorphMesh['indices'] = {}
      for (const [key, prefix] of Object.entries(MORPH_PREFIX) as [MorphKey, string][]) {
        const dictKey = Object.keys(mesh.morphTargetDictionary).find(k => k.startsWith(prefix))
        if (dictKey !== undefined)
          indices[key] = mesh.morphTargetDictionary[dictKey]
      }
      if (Object.keys(indices).length > 0)
        this.morphMeshes.push({ mesh, indices })
    })

    if (this.morphMeshes.length === 0)
      console.warn('[bee-expressions] no morph-target mesh found — blink/mouth-flap will be no-ops.')
  }

  /**
   * Switch the bee's expression state, crossfading between skeletal clips.
   * Safe to call repeatedly with the same state (no-op). This is the one
   * method a speech feature needs to know about.
   */
  setState(state: BeeState): void {
    if (state === this.currentState)
      return

    const nextAction = this.actions[state]
    const previousAction = this.currentAction

    if (nextAction) {
      nextAction.reset().setEffectiveWeight(1).setEffectiveTimeScale(1).play()
      if (previousAction && previousAction !== nextAction)
        previousAction.crossFadeTo(nextAction, this.config.crossfadeSeconds, false)
      else
        nextAction.fadeIn(this.config.crossfadeSeconds)
      this.currentAction = nextAction
    }

    if (state !== 'speaking')
      this.mouthTarget = 'closed'

    this.currentState = state
  }

  getState(): BeeState | null {
    return this.currentState
  }

  /**
   * One deliberate blink: eyes snap closed immediately, hold for
   * `blinkHoldSeconds`, then snap back open. No auto-triggering — call
   * this explicitly (e.g. from a debug button). See the file-level doc
   * for why this is intentionally simple for now.
   */
  blink(): void {
    this.setMorphWeight('blink', 1)
    this.blinkHoldTimer = this.config.blinkHoldSeconds
  }

  /** Advance the mixer, blink hold timer, and (while speaking) the mouth-flap loop. Call every frame. */
  update(deltaSeconds: number): void {
    this.mixer.update(deltaSeconds)

    if (this.blinkHoldTimer > 0) {
      this.blinkHoldTimer -= deltaSeconds
      if (this.blinkHoldTimer <= 0)
        this.setMorphWeight('blink', 0)
    }

    if (this.currentState === 'speaking')
      this.updateMouthFlap(deltaSeconds)
    else
      this.setMouthWeights({})
  }

  /** Stop all actions and clear morph weights. Call when the scene/session is torn down. */
  dispose(): void {
    this.mixer.stopAllAction()
    this.setMouthWeights({})
    this.setMorphWeight('blink', 0)
  }

  private updateMouthFlap(deltaSeconds: number): void {
    this.mouthFlapTimer -= deltaSeconds
    if (this.mouthFlapTimer > 0)
      return

    this.mouthFlapTimer = randomInRange(this.config.mouthFlapIntervalRange)

    // Placeholder "talking wiggle": randomly pick a mouth shape (or closed,
    // for a natural gap between flaps) each interval. Swap this function
    // out for audio-amplitude-driven weights once real speech audio exists.
    const options: (MorphKey | 'closed')[] = ['open', 'oo', 'wide', 'closed']
    this.mouthTarget = options[Math.floor(Math.random() * options.length)]
    this.setMouthWeights(this.mouthTarget === 'closed' ? {} : { [this.mouthTarget]: 1 })
  }

  private setMouthWeights(weights: Partial<Record<'open' | 'oo' | 'wide', number>>): void {
    this.setMorphWeight('open', weights.open ?? 0)
    this.setMorphWeight('oo', weights.oo ?? 0)
    this.setMorphWeight('wide', weights.wide ?? 0)
  }

  private setMorphWeight(key: MorphKey, weight: number): void {
    for (const { mesh, indices } of this.morphMeshes) {
      const index = indices[key]
      if (index !== undefined && mesh.morphTargetInfluences)
        mesh.morphTargetInfluences[index] = weight
    }
  }
}
