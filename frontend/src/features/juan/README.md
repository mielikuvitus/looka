# juan / SolidTime Bee — WebXR AR agent

Owner: juan (gentle default, per `AGENTS.md` — edit freely). This doc covers
the "materialize a bee in AR" feature specifically. juan's `/api/juan/*`
report/weather agent (`backend/src/api/juan/`) is separate and unrelated to
the WebXR work below.

## What it does

The **SolidTime Bee** card (`JuanCard.tsx`) shows one button, "Materialize
agent". Tapping it:

1. Requests a WebXR `immersive-ar` session directly (no intermediate window).
2. Loads `frontend/public/models/Bee_Kinde.glb` via three.js's `GLTFLoader`.
3. Auto-scales the model to ~0.4m and re-centers it (native export scale/
   origin is unknown ahead of time), positions it ~0.6m in front of the
   user.
4. Plays the bee's idle animation (`SitLeftRightLook`) on loop via
   `THREE.AnimationMixer`.
5. Lets the user grab and reposition the bee with a WebXR controller: point
   the controller ray at the bee, hold select to pick it up
   (`controller.attach(beeAnchor)`), release to drop it wherever moved
   (`scene.attach(beeAnchor)`). A thin ray line renders from the controller
   for aiming feedback.

Ending the session (system/headset exit gesture, or Escape key as a
desktop-testing fallback) resets the card back to idle, ready to
materialize again.

## Why raw WebXR + three.js, not WebSpatial's `<Model>`/`<Reality>`

Neither of WebSpatial's own 3D container components worked for this model:

- `<Model>` only rendered part of the mesh (one hand visible).
- Switching to `<Reality>`/`<ModelEntity>` (a different loading path) had
  the same partial-render problem.
- Parsing `Bee_Kinde.glb`'s JSON chunk directly (`glTF` binary format: 12-byte
  header + JSON chunk + BIN chunk) confirmed why: the mesh is split across a
  dozen+ separate skinned primitives (`polySurface6`, `polySurface9`, ...)
  all bound to one Mixamo-style skeleton (`mixamorig:*`), plus extra
  decorative parts (`Adds_Bee:*`). WebSpatial's importer appears to only
  handle a single primary skinned mesh.
- Neither `<Model>` nor `<Reality>`'s `<ModelEntity>` expose any animation
  clip/rig control API at all (checked both docs) — `<Reality>`'s own
  animation guidance is "poll and update Transform props with JS", i.e.
  procedural transforms only, not skeletal clip playback.

Three.js's `GLTFLoader` handles the multi-primitive skinned mesh correctly
and exposes `gltf.animations` (an array of `THREE.AnimationClip`) with full
playback control via `AnimationMixer` — confirmed clips in this file:

- `SitLeftRightLook` — sitting/idle (the one currently played, looped)
- `TalkiTwoHand` — talking with hands (not wired up yet)
- `WingsAnimation` — wings (not wired up yet)

## Key gotchas discovered (all fixed in current code)

- **`enable-xr` breaks WebXR user activation.** AR worked fine when the
  button lived in a plain page with zero `enable-xr` markers, and started
  throwing `SecurityError: requires user activation` once the button moved
  inside an `enable-xr` section. Working theory: WebSpatial's synthetic
  spatial-tap event pipeline (see
  `.webspatial/docs/concepts/natural-interactions.md`) doesn't carry
  trusted user activation the way a real click does. **`JuanCard`'s tree
  intentionally has no `enable-xr` anywhere** — don't add it back to the
  card or its ancestors without retesting AR.
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

- Controller grab-and-drag is implemented per the standard WebXR pattern
  but **untested on real hardware** — the software emulator may not
  simulate a controller/hand input source at all.
- `TalkiTwoHand` and `WingsAnimation` clips exist but aren't triggered by
  anything yet (only the idle clip auto-plays).
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
