# juan / SolidTime Bee — WebXR AR agent

Owner: juan (gentle default, per `AGENTS.md` — edit freely). This doc covers
the "materialize a bee in AR" feature specifically. juan's `/api/juan/*`
report/weather agent (`backend/src/api/juan/`) is separate and unrelated to
the WebXR work below. See `AGENTS.md`'s "Current room state" section for why
`Room.tsx` lands directly here instead of a multi-agent grid.

## What it does

`JuanCard.tsx` renders one full-screen button, "Tap to see the bee in AR"
(no card/title chrome — see `AGENTS.md`). Tapping it:

1. Requests a WebXR `immersive-ar` session directly (no intermediate window).
2. Loads `frontend/public/models/Bee_Kinde.glb` via three.js's `GLTFLoader`.
3. Auto-scales the model to ~0.4m and re-centers it (native export scale/
   origin is unknown ahead of time), positions it ~0.6m in front of the
   user.
4. Hands the loaded model to a `BeeExpressionController`
   (`beeExpressions.ts` — see the dedicated section below), which starts it
   in the `'idle'` state (sitting/looking-around animation).
5. Lets the user grab and reposition the bee with a WebXR controller: point
   the controller ray at the bee, hold select to pick it up
   (`controller.attach(beeAnchor)`), release to drop it wherever moved
   (`scene.attach(beeAnchor)`). A thin ray line renders from the controller
   for aiming feedback.

Ending the session (system/headset exit gesture, or Escape key as a
desktop-testing fallback) resets the button back to idle, ready to
materialize again.

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

**Three baked, full-skeleton animation clips** (192 channels / 64 target
nodes each for the two full-body ones):

| Clip name          | What it is                          | Mapped state |
| ------------------- | ------------------------------------ | ------------ |
| `SitLeftRightLook`  | Sitting, looking around              | `idle`       |
| `TalkiTwoHand`      | Talking, gestures with both hands    | `speaking`   |
| `WingsAnimation`    | Short wing-flutter (only 4 channels, just the wing meshes — not a full-body clip) | `thinking`   |

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
crossfades between the three skeletal clips above (`crossFadeTo`, default
0.3s) — remap which clip plays for which state via the constructor's
`BeeExpressionConfig` (`idleClipName`/`thinkingClipName`/
`speakingClipName`) if that mapping ever needs to change.

**Known issue, checkpointed as-is (not yet fixed):** `WingsAnimation` only
has keyframes for 4 wing-adjacent nodes, not the whole skeleton.
Crossfading to it like a normal full-body clip means every *other* bone
loses its only active influence once the previous clip's weight reaches 0,
and snaps to the rig's bind pose — a T-pose — for as long as `'thinking'`
is active. Two fixes were tried:

1. Layering `WingsAnimation` in **additively** on top of the idle base
   (`AnimationUtils.makeClipAdditive` + `AdditiveAnimationBlendMode`)
   instead of crossfading to it — fixed the T-pose, but the wing motion
   became visually indistinguishable from idle (the clip's actual
   rotation delta on those nodes reads as too subtle at this scale).
2. Dropping the clip entirely and **procedurally** rotating the 4 known
   wing nodes with a sine-wave oscillation, layered on top of an
   untouched idle base — same result, no visible difference from idle.

Both were reverted back to this simplest version — visibly broken (the
T-pose) but visibly *working* (the wings clearly, unmistakably move) — as
a known-good checkpoint, since "nothing visibly happens" is a worse state
than "the wrong bones freeze while the wings flap." Revisit getting the
wings to flap without the T-pose as a follow-up — worth checking whether
the wing rotation delta needs to be amplified/exaggerated well beyond the
clip's authored values, or whether the flap should be procedural but with
a much larger, more obviously-wrong-if-still-invisible amplitude to first
confirm the wing nodes are even the right target before dialing it back.
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
  `'end'` handler in `JuanCard.tsx` since the whole renderer/scene gets
  discarded anyway — add a call there if that stops being true).
- Adding a 4th state (e.g. `'listening'`) means: add it to the `BeeState`
  union, add a config field + default clip name, add a case in the
  constructor's `stateClipNames` map. The crossfade/blink/mouth-flap
  machinery doesn't need to change.

## Debugging with PICO controller buttons

Four actions (`idle`, `thinking`, `speaking`, `blink`) map onto the PICO
controllers' four face buttons — X/Y on the left controller, A/B on the
right. `JuanCard.tsx` wires up **two independent input paths** to the same
four actions, since it isn't certain which one the emulator actually
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
   Space, B → `Delete`), so `JuanCard.tsx` also listens for those directly
   as a guaranteed-to-work fallback, logging:
   ```
   [bee-debug] key "<key>" pressed -> <action>
   ```

Both tables live near the top of `JuanCard.tsx` and are freely remappable:

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
  trusted user activation the way a real click does. **`JuanCard`'s tree
  intentionally has no `enable-xr` anywhere** — don't add it back to the
  button or its ancestors without retesting AR.
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

- **`'thinking'` shows a T-pose** while the wings flap (see "The state
  machine" above for the full story and what's been tried). Checkpointed
  as-is because the alternatives tried so far traded the T-pose for no
  visible wing motion at all, which is worse.
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
  the framework section above) — revisit once actual speech audio exists.
- No actual speech/TTS/audio playback exists yet — this framework only
  covers the animation side of "the bee speaks."
- The debug status bar (`.juan-status-bar`) is currently hidden via
  `display: none` in `JuanCard.css` for a clean demo — remove that line to
  bring back step-by-step status text (click → session request → session
  started → model loading → loaded) with errors highlighted in red.

## Orphaned files (kept, not deleted)

`WeatheryWindow.tsx`/`.css`, `XRCubeDemo.tsx`/`.css`, `weathery.html`,
`weathery-main.tsx` implement an earlier iteration: materializing into a
**separate popup window** (`window.open` + `initScene`, closed-window
polling to grey out the card) showing a plain test cube instead of the
bee. Nothing in the active app references them anymore, but they still
build (still wired into `vite.config.ts`'s `rollupOptions.input`). They're
useful history for the AR/VR/reference-space debugging journey documented
above; safe to delete once confirmed unneeded.

## Dependencies added

`three`, `@types/three`, `@types/webxr` (frontend `dependencies`/
`devDependencies`). `"webxr"` added to `frontend/tsconfig.app.json`'s
`compilerOptions.types` (that array opts out of auto-including all
`@types/*` packages, so it must be listed explicitly). `.glb` added to the
backend's static-file MIME map (`model/gltf-binary`) for prod serving.
