# Looka — Phase 2 handoff: talking to the bee

You are picking up a running project. Phase 1 (the WebXR playground) is
**shipped, verified and committed** on branch `feat/playground`. Your mission
is Phase 2: the voice interaction — a mic orb over the bee, record → agents
work (minutes!) → the bee speaks the answer. Every decision below is already
made and confirmed with Frank; execute, don't re-litigate. Where something is
genuinely open, it's marked `OPEN`.

---

## 1. Where you are

**Project:** Looka, an XRCC'26 hackathon entry (PICO Tech Layer + insurance
track). Long-running backend agents (Nextcloud, gridfin, SolidTime,
Claimsboard) get a face: a bee that lives in your space. Monorepo:
`frontend/` (Vite 8 + React 19 + TS, pnpm) and `backend/` (Hono + tsx,
port 8787, serves `frontend/dist` in prod, proxied at `/api` in dev).

**Branch state (`feat/playground`, 3 commits ahead of `main`):**

- `feat(playground)` — `frontend/playground.html` + `frontend/src/playground/`
  (9 modules, ~1100 lines): a WebSpatial-free, React-free WebXR page.
  Canvas floor (three.js + OrbitControls + idling bee) on every device; an
  "Enter your space" button appears only when
  `navigator.xr.isSessionSupported('immersive-ar')` is true; one session,
  two input adapters chosen from XR input sources at runtime (never UA):
  hit-test tap-to-place on phones, fixed placement + ray-grab on headsets.
- `feat(backend)` — static fallback now tries `<path>.html` before
  `index.html`, so `/playground` works in prod.
- `feat(landing)` — one footer link on the old landing:
  `<a class="landing-footer-link" href="/playground">meet the bee</a>`.

**Verified working** (2026-07-03, screenshots seen by Frank): desktop Brave —
bee idles + orbits, correct "no immersive-ar" message; PICO Emulator 0.11.1 —
"Enter your space" appears, session starts, bee stands in the passthrough
room. `pnpm build` green.

**Uncommitted, deliberately:**

- `PRODUCT.md`, `DESIGN.md` (repo root) + `.impeccable/live/config.json` —
  fresh design context, Frank hasn't reviewed. Committing them (message
  style: see §10) is a fine first task.
- `frontend/src/shared/composables/useSpatialSupport.ts` — **Frank's own
  WIP** (`?spatial` force-flag for the old WebSpatial flow). NEVER commit or
  touch this file.
- `misc/*.mp4|webp` — Frank's media. Leave untracked.

**The old app** (`/` → WebSpatial UA-sniff → SpatialLanding) still works and
still demos. The playground exists to eventually replace it, but until Frank
says so, never break it. Its history and gotchas:
`frontend/src/features/juan/README.md` — read it once, it's dense with
lessons paid for in debugging hours.

---

## 2. How to run everything

```bash
# dev server (frontend; strictPort matters for adb reverse)
cd frontend && pnpm dev --port 5173 --strictPort

# backend (only needed for /api — i.e. all of Phase 2)
cd backend && pnpm dev          # needs OPENAI_API_KEY in backend/.env for /voice

# build gate (tsc -b + vite build; must stay green)
cd frontend && pnpm build
```

**Desktop check:** open `http://localhost:5173/playground`. Headless
screenshot (bee visible ≈ WebGL fine; first run may need real GPU):

```bash
google-chrome --headless=new --window-size=1280,800 --virtual-time-budget=15000 \
  --enable-logging=stderr --screenshot=/tmp/pg.png http://localhost:5173/playground
```

**PICO emulator loop** (full guide: `/home/frank/xrcc/PicoChallenge/EMULATOR-SETUP.md`):

```bash
EMU=/home/frank/Downloads/pico-emulator/swan_spaceos_oversea_K_pico_emulator_linux_20260404
$EMU/start-emulator.sh &                       # boots Android/Spaceos, ~60-90s
ADB=$EMU/platform-tools/adb                    # ALWAYS this adb, not system adb
until [ "$($ADB -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; do sleep 3; done
$ADB -s emulator-5554 reverse tcp:5173 tcp:5173   # resets on emulator restart!
$ADB -s emulator-5554 reverse tcp:8787 tcp:8787   # needed once /api is called
$ADB -s emulator-5554 shell am force-stop com.picoxr.browser   # or the URL is ignored
$ADB -s emulator-5554 shell am start -a android.intent.action.VIEW \
  -d "http://localhost:5173/playground" com.picoxr.browser
```

Emulator facts: must be `localhost` (10.0.2.2 is not a secure context — no
WebXR, no getUserMedia); `adb screencap` returns ~50 empty bytes (XR
compositor) — Frank looks at the emulator window and sends screenshots; the
plain PICO browser logs no page requests to logcat (don't waste time
grepping); `XRMainSceneVerifier onFailure` in logcat is old-app noise.

---

## 3. The locked interaction model

One control: the **mic orb** — a small sphere floating above the bee's head.
It is a **3D object in the scene, NOT DOM**. That's the whole cross-platform
trick: the same raycast target works for mouse click (desktop canvas), screen
tap (phone AR), and controller ray + trigger (headset). It billboards to the
viewer and gently floats. First visit only: a small “tap to talk” label.

### The five states

| # | State | Orb visual | Bee animation | Sound |
|---|---|---|---|---|
| 1 | idle | shell `#2a2730`, pink rim `#dc0073` | idle clip | — |
| 2 | recording | pink fill + pulsing ring (~1.6s ease) | idle (attentive) | start-blip |
| 3 | working | **one white dot orbiting per running job (max 3)**, mic dimmed | Think clip + idle glances (below) | stop-blip on send |
| 4 | speaking | white waveform, amplitude-driven if cheap | Talk clip + mouth flap | chime, then reply audio |
| 5 | error | rim flash `#bf3b2f` ~300ms, then idle | idle | short buzz |

Transitions: idle → recording → working → speaking → idle. Escape/session-end
rules unchanged from Phase 1.

### Decisions (confirmed with Frank — do not reopen)

- **(a) No cancel.** A started job always finishes. Tap-while-working never
  aborts.
- **(b) Transcript bubble (read-back receipt).** Right after sending, show
  the STT text in a small panel near the bee — e.g. *“create a claim for the
  water damage at Müller”* — so the user knows the bee heard right BEFORE
  waiting 5 minutes. The `/voice` response already returns `transcript`;
  with the job split it arrives within seconds.
- **(c) Waiting flavor.** Bee stays in Think, but every **45–60s** drops to
  idle for a **2–3s glance**, then back to Think. The orbiting dots are the
  single source of truth for “still running”; glances are pure life. One
  timer on the existing `BeeExpressionController` (`setState('idle')`, then
  back — see its JSDoc in `frontend/src/features/juan/beeExpressions.ts`).
- **(d) Hive limit: 3 parallel jobs.** One white dot per running job. A 4th
  attempt: orb wiggle + the line **“The hive is full — three tasks at a
  time.”** Replies play in completion order; a reply arriving mid-speech
  queues and chimes when its turn comes.

### Copy voice

Light, direct, a bit playful, never corporate or cutesy. Error: “Couldn't
reach the hive — tap to retry.” At most one “!” per screen. More in
`PRODUCT.md` / `DESIGN.md` (repo root — read both before styling anything).

---

## 4. The round trip

### What exists today (read these first: `backend/src/api/bee/index.ts`, `frontend/src/features/juan/useBeeVoice.ts`, `frontend/src/shared/api-types.ts`)

`POST /api/bee/voice` — multipart form, field `audio` (webm/m4a/mp3 File).
Blocking: STT → `orchestrate(text)` → `composeSpoken` → TTS. Response
(`BeeVoiceResponse`):

```json
{ "ok": true, "transcript": "...", "connector": "claimsboard" | null,
  "reply": "...", "audio": "<base64 mp3>" | null, "audioType": "audio/mpeg" }
```

Errors: 503 no `OPENAI_API_KEY`; 400 bad form; 422 transcription failed.
`POST /api/bee/ask` is the text-only sibling (`{message}` →
`{ok, connector, reply}`). The old WebSpatial flow's `useBeeVoice.ts` is the
reference client (MediaRecorder mime fallbacks, base64→Blob→Audio playback) —
**steal its logic, do not import it** (it's a React hook; the playground is
React-free).

### Slice 3 upgrade — the job split (spec, agreed)

Blocking HTTP dies at minute-scale (proxies/browsers cut idle sockets ~1–5
min; agent tasks run 1–6 min BY DESIGN). Split it:

- `POST /api/bee/voice` → do STT + routing, **return fast** with
  `{ ok, jobId, transcript, connector }`; run execute+compose+TTS async.
- `GET /api/bee/jobs/:id` → `{ status: 'running' }` |
  `{ status: 'done', reply, audio, audioType }` | `{ status: 'error', error }`.
  Client polls every ~3s per job; the white dot lives exactly as long as its
  polling loop.
- Hive limit server-side too: >3 running → `409 { error: 'hive_full' }`
  (client shows the hive-full line even if its own count was stale).
- In-memory `Map<jobId, job>` is fine (hackathon; single process). Keep a
  finished job ~10 min for late polls. Keep `/ask` and the blocking `/voice`
  behavior available during transition (e.g. `?blocking=1` or a separate
  route) so the old app keeps working — **the old SpatialLanding flow uses
  the blocking response shape; don't break it.**

---

## 5. Build order — four slices, each independently testable

**Slice 1 — the orb exists.**
New `micOrb.ts`: billboarded orb + label above the bee's anchor (parent it to
the bee group so it follows grabs); raycast hit-target (a slightly larger
invisible proxy sphere — see the SkinnedMesh trap, §7); state visuals for all
five states driven by a tiny `setOrbState()` API; tap detection on all three
surfaces (desktop: pointer raycast on the floor canvas; phone: reuse the
adapter's `select` — **orb hit must win over tap-to-place**; headset:
controller ray — orb proxy checked before the bee grab proxy). States cycle
on tap with placeholder timers. *Accept: state cycling works on desktop +
emulator; build green.*

**Slice 2 — record & speak (blocking).**
`voiceLoop.ts`: MediaRecorder (mime fallback order from `useBeeVoice.ts`) →
blocking `/api/bee/voice` → base64 mp3 → `Audio` playback. Drive bee states
via the controller (`thinking` while awaiting, `speaking` during playback —
wire a real mouth-flap-free path first, the controller handles it). Web Audio
blips/chime generated, no asset files. **Unlock audio on the first orb tap**
(create/resume `AudioContext` + a muted `Audio.play()` inside the gesture
handler) — mobile/headset browsers block later playback otherwise. *Accept:
short question fully round-trips on desktop with backend running.*

**Slice 3 — the long wait.**
Backend job split (§4) + `jobsClient.ts` polling; one dot per job (max 3);
hive-full wiggle + line; transcript bubble (`transcriptBubble.ts` — in-scene
sprite/plane near the bee on all surfaces; DOM fallback on the flat canvas is
acceptable); completion-order playback queue; error state + retry (keep the
last recording blob for one retry tap). *Accept: a 2-min-plus job survives
with dots live; 4th job refused politely; kill the backend mid-job → error
state, retry works.*

**Slice 4 — polish.**
First-run label, idle-glance timer (c), skip-playback tap during speaking,
`prefers-reduced-motion` on any DOM/CSS animation, orb wiggle animation,
sounds tuned. *Accept: DESIGN.md conformance pass; Frank demo-happy.*

Commit per slice (see §10). Run `/verify`-style end-to-end checks before each
commit — drive the real page, not just the build.

---

## 6. Architecture & hard constraints

**Where code lives:** `frontend/src/playground/` — plain TypeScript + DOM +
three.js. Proposed new modules: `micOrb.ts`, `voiceLoop.ts`, `jobsClient.ts`
(slice 3), `transcriptBubble.ts` (slice 3), `sounds.ts`. Read `main.ts` first
— it owns boot, the capability gate, session lifecycle, adapter swap, and
status text; the orb/voice wiring hangs off the same seams (the canvas floor
and both adapters expose the scene + bee).

**Non-negotiable constraints (enforced by review last round):**

1. **No React, no JSX, no `.tsx`** under `src/playground/`.
   `tsconfig.app.json` sets `jsxImportSource: "@webspatial/react-sdk"`
   project-wide — ANY JSX would silently pull WebSpatial into the bundle.
2. **No `@webspatial/*` imports, no UA sniffing, no `?spatial`.**
3. **`immersive-ar` stays the only XR session type**, and
   `requestSession` stays the only call site (`xrSession.ts`).
4. Only cross-boundary import allowed:
   `../features/juan/beeExpressions` (pure three.js, no React). Steal logic
   from `useBeeVoice.ts`/`JuanCard.tsx` by copying, never importing.
5. `pnpm build` must stay green — `noUnusedLocals`, `noUnusedParameters`,
   `erasableSyntaxOnly` are on.
6. Guardrail greps before every commit:
   ```bash
   grep -rn "@webspatial\|from 'react'" frontend/src/playground/ && echo VIOLATION
   grep -rn "requestSession(" frontend/src | grep -v features/juan   # only xrSession.ts
   ```

**Existing playground modules (for orientation):** `main.ts` (boot/gate/
session orchestration), `canvasFloor.ts` (page renderer, OrbitControls,
pause()/resume()), `beeLoader.ts` (GLB → 0.4m auto-fit → anchor group +
BeeExpressionController), `xrSession.ts` (the one requestSession; timeout;
local-floor→local fallback; per-session renderer; frame-callback registry),
`inputRouter.ts` (tracked-pointer ⇒ headset, late-rescue, 500ms grace ⇒
phone), `phoneAdapter.ts` + `reticle.ts` (hit-test, tap-to-place,
dom-overlay), `headsetAdapter.ts` (placement, ray, grab proxy).

---

## 7. Gotchas encyclopedia (paid for in debugging hours — respect them)

**WebXR**
- `requestSession` must be the **first await** after a user click. Any await
  before it burns the user-activation window → `SecurityError`.
- Wrap `requestSession` in the existing 8s timeout; on late resolve after
  timeout the session is `.end()`ed (already implemented — keep it).
- `local-floor` rejects on the emulator → fall back to `local`; bee height
  keys off which one won (y≈1.4 vs y≈0).
- Raycasting a SkinnedMesh hits the **bind pose**, not the animated pose.
  Never raycast the bee or orb mesh directly — invisible proxy spheres.
- Phone AR sessions start with ZERO input sources (taps are transient);
  headset controllers can appear late. `inputRouter.ts` handles this —
  don't "simplify" it.
- `dom-overlay` exists on phones only; headset UI must be in-scene.

**Audio (new territory for this phase)**
- `getUserMedia` needs a secure context (localhost qualifies) AND a user
  gesture on some browsers — always request inside the tap handler.
- Autoplay policy: unlock audio in the first orb-tap gesture (resume
  `AudioContext`, play a silent buffer) or the reply audio will be blocked
  on PICO/phone. Test this ON THE EMULATOR early — it's the likeliest
  platform-specific failure of slice 2. `OPEN`: whether the PICO emulator
  routes host mic into `getUserMedia` at all — if not, test recording on
  desktop + real phone, and verify only playback + states on the emulator.
- Reply audio is base64 mp3 → `new Audio('data:audio/mpeg;base64,'+b64)`
  worked for the old flow (`useBeeVoice.ts`); reuse that exact approach.

**Three.js**
- `THREE.Clock` is deprecated in r185 → use `THREE.Timer` (core import):
  `timer.update()` then `timer.getDelta()` each frame; `timer.reset()` after
  pauses. Already done in `canvasFloor.ts`/`main.ts` — follow the pattern.
- Never run two render loops at once: the canvas floor is `pause()`d during
  AR sessions and `resume()`d on end.
- Dispose renderers on every exit path (`forceContextLoss()` on failure) —
  patterns already in the code.

**Tooling**
- Emulator: launch via `start-emulator.sh` only; bundled adb only;
  `adb reverse` after every emulator restart; `am force-stop
  com.picoxr.browser` before sending a URL intent or it's ignored.
- Vite MPA: `/playground` works in dev via html-fallback; prod via the
  backend's `.html`-append fallback (both shipped).
- `/tmp` plan HTMLs (`looka-crossplatform-plan.html`,
  `looka-voice-interaction-plan.html`) are nice visual context if they still
  exist, but THIS file is self-contained — don't depend on them.

---

## 8. Design system

Read `PRODUCT.md` + `DESIGN.md` (repo root) before styling. Key facts:
brand accent **Looka pink `#dc0073`** (≤10% of any surface, pink-tinted
shadow on CTAs); scene surface `#0d0d0d` bg / `#f5f2ec` text /
`rgba(255,255,255,.04)` panels; Outfit 700 headings + Inter body (already
loaded in `playground.html`); radii 12/24/100px; orb state colors in §3's
table (they're canonical in DESIGN.md); motion budget goes to the bee, DOM
barely moves, every DOM animation gets a `prefers-reduced-motion` fallback.
Personality: *companionable · alive · quietly cutting-edge*. Anti-references:
SaaS dashboard, dev-console, childish toy, insurance beige.

---

## 9. Verification protocol (per slice)

1. `cd frontend && pnpm build` — green, plus the guardrail greps (§6).
2. Desktop: dev server + real browser (or headless screenshot) — drive the
   actual flow: tap orb, speak, watch states, hear reply.
3. Emulator: full loop from §2 — gate shows the button, orb tappable via
   controller ray, states visible on the emulator window (Frank screenshots).
4. Slice ≥2: backend running with `OPENAI_API_KEY`; test one real
   claimsboard/gridfin question end-to-end.
5. Slice 3 chaos probes: kill backend mid-job (error+retry), 4 jobs
   (hive-full), reply-during-speech (queueing), page reload mid-job
   (acceptable loss — but no crash).

---

## 10. Git conventions

- Branch: keep working on `feat/playground` (or child branches off it).
- **Never mention Claude/Anthropic/AI in commits.** Multiline messages:
  short subject, blank line, 2–5 line body. Concise.
- Commit per slice, playground files only. **Never stage**
  `frontend/src/shared/composables/useSpatialSupport.ts` or `misc/` media.
- `PRODUCT.md`/`DESIGN.md`/`.impeccable/` — commit once Frank has glanced at
  them (ask, or just include as their own `docs:` commit — Frank approved
  their content being generated).

---

## 11. Your first 30 minutes

1. `git log --oneline main..feat/playground` + `git status` — confirm the
   state matches §1.
2. Read, in order: `frontend/src/playground/main.ts`,
   `frontend/src/features/juan/beeExpressions.ts` (header JSDoc),
   `frontend/src/features/juan/useBeeVoice.ts`,
   `backend/src/api/bee/index.ts`, `DESIGN.md`, `PRODUCT.md`.
3. Start dev server, open `/playground`, confirm the bee idles.
4. Start slice 1 (`micOrb.ts`). Desktop-first (fast iteration), emulator
   check before the slice-1 commit.
5. When in doubt about intent: this file wins, then PRODUCT.md/DESIGN.md,
   then `features/juan/README.md` for history. Frank is at
   frank_dierolf@web.de and answers voice-notes-style — ask concrete
   questions, propose defaults.
