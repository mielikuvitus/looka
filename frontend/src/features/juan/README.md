# juan / SolidTime Bee — WebXR AR agent

Owner: juan (gentle default, per `AGENTS.md` — edit freely). This doc covers
the "materialize a bee in AR" feature specifically. juan's `/api/juan/*`
report/weather agent (`backend/src/api/juan/`) is separate and unrelated to
the WebXR work below.

**Live entry point:** `App.tsx` renders `SpatialLanding.tsx` (frank's
branded landing page — logo, headline, "Tap to meet your first assistant!")
once WebSpatial Runtime is detected, which uses the `useBeeLaunch()` hook
in this folder for all the AR/bee logic. `Room.tsx`/`JuanCard.tsx` — an
earlier, simpler landing UI with the same bee logic inlined instead of in a
hook — are **no longer rendered by anything** since that change, but are
kept as-is (not deleted); see "Orphaned files" below.

## What it does

`useBeeLaunch()` (used by `SpatialLanding.tsx`) exposes a `handleMaterialize`
called from a landing button. Tapping it:

1. Requests a WebXR `immersive-ar` session directly (no intermediate window).
2. Loads the bee via `loadBee()` (`../../playground/beeLoader.ts` — shared
   with the `playground/` page): fetches `Bee_Kinde.glb`, auto-scales it to
   ~0.4m and re-centers it (native export scale/origin is unknown ahead of
   time) inside a fresh anchor group, and starts a
   `BeeExpressionController` (`beeExpressions.ts` — see the dedicated
   section below) in the `'idle'` state. Positions the anchor ~0.6m in
   front of the user.
3. Lets the user grab and reposition the bee with a WebXR controller: point
   the controller ray at the bee, hold select to pick it up
   (`controller.attach(beeAnchor)`), release to drop it wherever moved
   (`scene.attach(beeAnchor)`). A thin ray line renders from the controller
   for aiming feedback.
4. Creates a **mic orb** above the bee's head (`createMicOrb`,
   `../../playground/micOrb.ts`) and a **voice loop**
   (`createVoiceLoop`, `../../playground/voiceLoop.ts`) — both reused
   directly from the `playground/` page, which pioneered this pattern (see
   "Voice: the in-scene mic orb" below).

Ending the session (system/headset exit gesture, or Escape key as a
desktop-testing fallback) resets the button back to idle, ready to
materialize again.

## Voice: the in-scene mic orb

Talking to the bee happens entirely **inside the AR session**, via a small
tappable sphere that floats above its head — not a separate DOM button. Aim
the controller ray at the orb and pull the trigger: first tap starts
recording (pink pulsing ring), second tap sends it to `POST /api/bee/voice`
(orbiting "working" dot + `Think` clip), then the reply plays back
(`TalkiTwoHand` clip + audio). The orb-hit check in `onSelectStart` runs
*before* the bee-grab check, so aiming at the orb always wins over picking
up the bee.

This reuses `playground/{micOrb,voiceLoop}.ts` as-is (both are plain
three.js/TypeScript with no React or WebSpatial dependency, so importing
them here doesn't violate the playground's own "no React" isolation rule —
that rule only constrains what `playground/` itself imports). Previously,
voice was a standalone DOM button (`useBeeVoice.ts`, since deleted) sitting
next to the "Tap to meet your first assistant!" button on `SpatialLanding`.
That button's `getUserMedia` call raced the live XR session for a browser
permission prompt, which killed the session — looking exactly like a page
reload, with no way back into AR. Moving voice into the scene (the pattern
`playground/` used from the start) removes the second, independent input
path entirely, which removes the race.

## Bee expression / speech framework (`beeExpressions.ts`)

This is the part a future speech/TTS implementation taps into. Full API
docs live as JSDoc directly on `BeeExpressionController` in
`beeExpressions.ts` — this section is the narrative version.

### The short version

```ts
import { BeeExpressionController } from './beeExpressions'

const controller = new BeeExpressionController(model, gltf.animations)
controller.setState('idle') // once, right after the model loads

// wherever a speech feature lives:
controller.setState('thinking') // while awaiting a backend/LLM response
controller.setState('speaking') // while audio/text is being "spoken"
controller.setState('idle')     // once done

// every frame, in the same loop that calls renderer.render(...):
controller.update(deltaSeconds)
```

That's the entire integration surface. Everything about *how* each state
looks (which animation clip, blinking, mouth movement) is handled inside
the controller — a speech feature should never need to touch `THREE.
AnimationMixer` or morph targets directly.

### What's actually in `Bee_Kinde.glb` (found by parsing the file directly)

A `.glb` is glTF's binary container: a 12-byte header, then a JSON chunk
(scene graph, materials, animation channel definitions) and a BIN chunk
(vertex/animation data). Reading the JSON chunk directly (`node -e` script
run against `misc/beekind/Bee_Kinde.glb`, not through any 3D engine)
confirmed:

**Four baked animation clips**, three of them full-skeleton (192 channels /
64 target nodes):

| Clip name          | What it is                          | Mapped state |
| ------------------- | ------------------------------------ | ------------ |
| `SitLeftRightLook`  | Sitting, looking around              | `idle`       |
| `TalkiTwoHand`      | Talking, gestures with both hands    | `speaking`   |
| `Think`             | Dedicated thinking pose, full skeleton | `thinking` |
| `WingsAnimation`    | Short wing-flutter (only 4 channels, just the wing meshes — not a full-body clip) | *unused* — see below |

`Think` was added later specifically to replace `WingsAnimation` as the
`'thinking'` clip — see "The state machine" below for why.

**Four morph targets (blend shapes)**, all on one mesh (`polySurface9`, the
face), confirmed to have **zero animation channels touching them in any
clip** — fully free for procedural control:

| Dictionary key (exact, as GLTFLoader exposes it) | Meaning     |
| -------------------------------------------------- | ----------- |
| `Bee_Blink.polySurface20`                          | Eyes closed |
| `Bee_Oo.polySurface21`                             | Mouth "oo"  |
| `Bee_Wide.polySurface22`                           | Mouth wide  |
| `Bee_Open.polySurface23`                           | Mouth open  |

`beeExpressions.ts` matches these by **prefix** (`'Bee_Blink'`, `'Bee_Oo'`,
etc.), not exact string, since the `.polySurfaceNN` suffix is an artifact
of Maya's exporter and isn't meaningful — callers of the controller never
see these keys at all.

### The state machine

`BeeExpressionController.setState('idle' | 'thinking' | 'speaking')`
crossfades between the three *in-use* clips above (`SitLeftRightLook`/
`Think`/`TalkiTwoHand` — `crossFadeTo`, default 0.3s) — remap which clip
plays for which state via the constructor's `BeeExpressionConfig`
(`idleClipName`/`thinkingClipName`/`speakingClipName`) if that mapping
ever needs to change.

**Fixed issue (history, in case this regresses):** `'thinking'` originally
played `WingsAnimation`, which only has keyframes for 4 wing-adjacent
nodes, not the whole skeleton — crossfading to it like a normal full-body
clip meant every *other* bone lost its only active influence once the
previous clip's weight reached 0, snapping to the rig's bind pose (a
T-pose) for as long as `'thinking'` was active. Two workarounds (additive
blending via `AnimationUtils.makeClipAdditive`; procedurally rotating just
the wing nodes) were tried and reverted — both fixed the T-pose but made
the wing motion visually indistinguishable from idle, which was worse than
a working-but-imperfect T-pose. The actual fix was a proper full-skeleton
`Think` clip added directly to the `.glb`, which needs no special-casing
at all — same simple crossfade as idle/speaking. Don't repoint
`thinkingClipName` at `WingsAnimation` without redoing one of those
workarounds.
- `blink()` is a separate, **explicitly-triggered-only** action — not part
  of `setState`. Calling it snaps `Bee_Blink`'s morph weight to 1
  immediately, holds for `blinkHoldSeconds` (default 0.3s), then snaps
  back to 0. No easing curve, no automatic/periodic triggering. (An
  earlier version auto-triggered blinks on a random timer with an eased
  open/close envelope; the auto-timer could re-fire mid-blink and restart
  the envelope, which looked jumpy — simplified to this for now.)
- While in `'speaking'`, additionally runs a **mouth-flap loop**: every
  ~80–180ms (randomized), it picks a random mouth shape (`Bee_Open`/
  `Bee_Oo`/`Bee_Wide`/closed) and sets that morph weight to 1, others to 0.

  **This is a placeholder "talking wiggle", not real lip-sync** — there's
  no audio pipeline in this codebase yet, so there's no actual phoneme/
  viseme timing to drive it. When real speech audio exists, replace the
  private `updateMouthFlap` method with something driven by audio
  amplitude (e.g. a Web Audio `AnalyserNode` sampling the TTS output) —
  the morph-weight plumbing (`setMouthWeights`/`setMorphWeight`) is already
  audio-agnostic and can be reused as-is; only the *decision* of which
  shape/weight to use each frame needs to change.

### Extending it

- `controller.blink()` — trigger one blink outside the auto-schedule (used
  by the debug controller-button wiring below).
- `controller.getState()` — read the current state.
- `controller.dispose()` — stops all actions and zeroes morph weights; call
  when tearing down the scene/session (not currently wired to the session
  `'end'` handler in `useBeeLaunch.ts` since the whole renderer/scene gets
  discarded anyway — add a call there if that stops being true).
- Adding a 4th state (e.g. `'listening'`) means: add it to the `BeeState`
  union, add a config field + default clip name, add a case in the
  constructor's `stateClipNames` map. The crossfade/blink/mouth-flap
  machinery doesn't need to change.

## Debugging with PICO controller buttons

Four actions (`idle`, `thinking`, `speaking`, `blink`) map onto the PICO
controllers' four face buttons — X/Y on the left controller, A/B on the
right. `useBeeLaunch.ts` wires up **two independent input paths** to the
same four actions, since it isn't certain which one the emulator actually
surfaces to the page:

1. **WebXR gamepad buttons** — the standard "xr-standard" mapping for
   Quest/PICO-style controllers puts each controller's two face buttons at
   indices 4 and 5. This is the path real hardware uses. Every button
   press, on any controller/index, is logged to console regardless of
   whether it's mapped, so you can confirm/correct the layout:
   ```
   [bee-debug] gamepad button <N> pressed (source <M>, <handedness>)
   ```
2. **Plain keyboard keys** — the Android Studio PICO emulator maps
   physical controller presses to keyboard input (X → `x`, Y → `z`, A →
   Space, B → `Delete`), so `useBeeLaunch.ts` also listens for those
   directly as a guaranteed-to-work fallback, logging:
   ```
   [bee-debug] key "<key>" pressed -> <action>
   ```

Both tables live near the top of `useBeeLaunch.ts` and are freely
remappable (an identical copy also lives in the orphaned `JuanCard.tsx` —
see "Orphaned files"):

```ts
const DEBUG_GAMEPAD_BUTTON_MAP: Record<'left' | 'right', Partial<Record<number, BeeDebugAction>>> = {
  left: { 4: 'idle', 5: 'thinking' }, // X, Y
  right: { 4: 'speaking', 5: 'blink' }, // A, B
}

const DEBUG_KEYBOARD_MAP: Record<string, BeeDebugAction> = {
  x: 'idle', // X
  z: 'thinking', // Y
  ' ': 'speaking', // A (Space)
  Delete: 'blink', // B (Del)
}
```

Gamepad button presses are edge-detected (fires once per press, not every
frame while held) via a `Map` of previous per-button pressed state, so
it's safe to hold a button down without spamming `setState`.

## Why raw WebXR + three.js, not WebSpatial's `<Model>`/`<Reality>`

Neither of WebSpatial's own 3D container components worked for this model:

- `<Model>` only rendered part of the mesh (one hand visible).
- Switching to `<Reality>`/`<ModelEntity>` (a different loading path) had
  the same partial-render problem.
- The dozen+ separate skinned primitives (`polySurface6`, `polySurface9`,
  ...) all bound to one Mixamo-style skeleton (`mixamorig:*`), plus extra
  decorative parts (`Adds_Bee:*`), are almost certainly why — WebSpatial's
  importer appears to only handle a single primary skinned mesh.
- Neither `<Model>` nor `<Reality>`'s `<ModelEntity>` expose any animation
  clip/rig or morph-target control API at all (checked both docs) —
  `<Reality>`'s own animation guidance is "poll and update Transform props
  with JS", i.e. procedural rigid transforms only, nothing like this file's
  skeletal-clip crossfading or blend-shape control.

Three.js's `GLTFLoader` handles the multi-primitive skinned mesh correctly
and exposes both `gltf.animations` (full `AnimationMixer` clip playback)
and per-mesh `morphTargetDictionary`/`morphTargetInfluences` (blend shape
control) — which is what `beeExpressions.ts` is built on.

## Key gotchas discovered (all fixed in current code)

- **`enable-xr` breaks WebXR user activation.** AR worked fine when the
  button lived in a plain page with zero `enable-xr` markers, and started
  throwing `SecurityError: requires user activation` once the button moved
  inside an `enable-xr` section. Working theory: WebSpatial's synthetic
  spatial-tap event pipeline (see
  `.webspatial/docs/concepts/natural-interactions.md`) doesn't carry
  trusted user activation the way a real click does. **The AR launch
  button's own tree must have no `enable-xr` anywhere** — true today in
  both `JuanCard.tsx` and `SpatialLanding.tsx` (whose `<Model enable-xr>`
  logo elements are unrelated siblings, not ancestors of the CTA button) —
  don't add it back without retesting AR.
- **`requestSession` must be the very first `await`** after the click
  handler starts. Any `await` before it — even a fast one, like a separate
  `isSessionSupported` pre-check — can expire the browser's transient user
  activation window and cause the same `SecurityError`. There's no
  pre-check; an unsupported mode just rejects `requestSession` itself.
- **`immersive-ar` can hang instead of rejecting** on the Android Studio
  emulator (no real passthrough camera to grant permission for). An 8s
  timeout (`SESSION_REQUEST_TIMEOUT_MS`) wraps the request so this shows up
  as a message instead of a frozen "Requesting…" state.
- **`local-floor` reference space isn't supported on this emulator**
  (`NotSupportedError`, confirmed live). Code tries `local-floor` first,
  falls back to `local` on rejection, and adjusts the bee's height
  accordingly (`local-floor` origin ~ floor, so y: 1.4 ~ eye height;
  `local` origin ~ wherever the headset was at session start, so y: 0).
- **Native `.glb` scale/origin is unknown ahead of time** — the bee is
  auto-fit to `BEE_TARGET_SIZE_M` (0.4m) via a bounding-box measurement
  and re-centered, rather than assuming any fixed scale.

## Testing setup (Android Studio PICO emulator)

- WebXR requires a secure context. `10.0.2.2:5173` (the emulator's alias
  for the host) is **not** treated as secure by Chromium. `localhost` is
  whitelisted regardless of HTTPS, so browse to `http://localhost:5173` /
  `http://localhost:8787` inside the emulator instead.
- To make `localhost` inside the emulator actually reach the host's dev
  servers, forward the ports with adb (adb path on this machine:
  `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe`):
  ```
  adb reverse tcp:5173 tcp:5173
  adb reverse tcp:8787 tcp:8787
  ```
  **These forwards reset on emulator restart** — re-run them each time.
- Run `pnpm dev` separately inside `backend/` and `frontend/` rather than
  the root combined `pnpm dev` — the root `pnpm -r --parallel dev` has
  unreliably failed to bind the backend on this Windows machine.
- The PICO AVD (`PICO_0.13`) crashes when launched via `emulator.exe`
  directly (access violation) — launch it from Android Studio's GUI.

## Not yet done / known gaps

- Controller grab-and-drag, and the debug-button wiring, are implemented
  per the standard WebXR pattern but **untested on real hardware** — the
  software emulator may not simulate a controller/hand input source at
  all, in which case none of this is reachable there.
- `DEBUG_GAMEPAD_BUTTON_MAP`'s indices (`4`/`5` per hand) are the standard
  "xr-standard" layout, not yet confirmed against this specific emulator —
  the `DEBUG_KEYBOARD_MAP` keys were given directly, so that path is more
  likely correct. Watch the `[bee-debug]` console logs and correct either
  table if needed.
- The mouth-flap loop is a randomized placeholder, not real lip-sync (see
  the framework section above) — revisit once real per-phoneme audio
  amplitude data is available to drive it (the STT/TTS round trip and
  reply-audio playback themselves are real, via the mic orb's voice loop —
  see "Voice: the in-scene mic orb" above).
- The in-scene mic orb has no phone-style hit-test/tap-to-place counterpart
  ported from `playground/phoneAdapter.ts` — `useBeeLaunch` only implements
  the fixed-placement + controller-ray-grab ("headset") interaction style,
  same as before voice moved in-scene.
- `SpatialLanding.tsx` (the live path) only shows a status bar on error
  (`spatial-error-bar`) — there's no step-by-step status text (click →
  session request → session started → model loading → loaded) like
  `JuanCard.tsx` had (hidden there via `display: none` in `JuanCard.css`
  for a clean demo). Bring that back in `SpatialLanding.tsx` if
  step-by-step debugging is needed again.

## Orphaned files (kept, not deleted)

- **`Room.tsx` + `JuanCard.tsx`** — an earlier landing UI (a plain
  full-screen "Tap to see the bee in AR" button, no branding) with the
  same AR/bee logic `useBeeLaunch.ts` now has, just inlined directly in
  the component instead of extracted into a hook. `App.tsx` rendered
  `Room` until frank's `SpatialLanding` commit replaced it; nothing
  renders `Room`/`JuanCard` anymore. Keep both files' debug-button tables
  in sync manually if you change one (there's some duplication between
  `JuanCard.tsx` and `useBeeLaunch.ts` now — worth deduplicating into a
  shared hook/module if `JuanCard.tsx` won't be needed again).
- **`WeatheryWindow.tsx`/`.css`, `XRCubeDemo.tsx`/`.css`, `weathery.html`,
  `weathery-main.tsx`** — an even earlier iteration: materializing into a
  **separate popup window** (`window.open` + `initScene`, closed-window
  polling to grey out the card) showing a plain test cube instead of the
  bee. Still builds (wired into `vite.config.ts`'s `rollupOptions.input`)
  but nothing references it.

All of the above are useful history for the AR/VR/reference-space
debugging journey documented in this file; safe to delete once confirmed
unneeded.

## Dependencies added

`three`, `@types/three`, `@types/webxr` (frontend `dependencies`/
`devDependencies`). `"webxr"` added to `frontend/tsconfig.app.json`'s
`compilerOptions.types` (that array opts out of auto-including all
`@types/*` packages, so it must be listed explicitly). `.glb` added to the
backend's static-file MIME map (`model/gltf-binary`) for prod serving.
