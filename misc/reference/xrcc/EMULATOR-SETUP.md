# Task 1 — Run our WebSpatial app in the PICO Emulator (on Linux)

**Goal:** see our spatial web app running in an XR environment without a headset.

## TL;DR — which path?

| Path | Tool | Works on our Linux box? |
|------|------|--------------------------|
| **PICO Emulator** (WebSpatial runs by URL) | PICO Emulator 0.11.1 + `adb` | ✅ **Yes — this is our path** |
| visionOS Simulator (`pnpm dev:spatial` → `webspatial-builder run`) | Xcode + visionOS sim | ❌ **No — needs a Mac** |

PICO OS 6 has a **built-in WebSpatial Runtime**, so our app runs *directly by URL* in the
emulator's browser — no packaging, no Xcode, no Mac. Ignore `dev:spatial` for now.

---

## What's already verified ✅

- Node `v24.6.0`, pnpm `10.28.0`, git, docker — all present.
- `looka` deps install cleanly (`pnpm install`).
- `pnpm dev` boots Vite and serves the app (title `Looka`, HTTP 200).
- `looka` already has the spatial wiring: `jsxImportSource: @webspatial/react-sdk`
  (`tsconfig.app.json`), `enable-xr` markers in `src/App.tsx`, and an `xr_main_scene`
  in `public/manifest.webmanifest`. **Nothing more to install to make it spatial.**

> ⚠️ Port note: something else (a "Gridfin" dev server) may grab **5173**, so Vite falls
> back to **5174**. The emulator `adb reverse` step below assumes a fixed port — pin it with
> `pnpm dev --port 5173` and make sure 5173 is free first (`lsof -i :5173`).

---

## Step-by-step

### 1. Get `adb` (Android platform-tools)
The PICO emulator is Android-based; we talk to it with `adb`.
```bash
sudo apt install android-tools-adb      # Ubuntu/Debian
adb version                             # verify
```

### 2. Download & launch the PICO Emulator 0.11.1 (Linux)
Manual download (Google Drive):
<https://drive.google.com/file/d/1FPBAr3h5PssTPpaSEz-tJ5CeWgulTtmQ/view>

Unpack and run it. Docs (if the build differs): PICO emulator install guide →
<https://developer.picoxr.com/document/spatial-toolkit/install-pico-emulator/>

Confirm the emulator is a connected adb device:
```bash
adb devices        # the emulator should be listed
```

### 3. Start our app, pinned to port 5173
```bash
cd /home/frank/repos/looka
pnpm dev --port 5173 --strictPort
```

### 4. Reverse-forward the port into the emulator
The app must be reached over **`localhost`** inside the emulator (secure-context APIs like
`crypto.subtle`, and any WebSocket proxy, depend on it):
```bash
adb reverse tcp:5173 tcp:5173
```

### 5. Open it in the emulator's browser
Inside the PICO emulator, open:
```
http://localhost:5173
```
The panels marked `enable-xr` should now lift into space with translucent backplates and
depth — the thing that just looks flat in a desktop browser.

---

## When we wire up real agents (the actual project)

Our plan (spatial agent panels) maps 1:1 onto the **command-center kit** in
`reference/webspatial_openclaw_command_center/`. To run *that* reference end-to-end you also:

1. Run an **OpenClaw gateway** locally: `docker compose up` (gateway on `localhost:18789`).
   Kami already runs OpenClaw — we can point at that gateway instead.
2. Put `VITE_OPENCLAW_TOKEN` (+ optional `VITE_ELEVENLABS_API_KEY` for voice) in `.env`.
3. First connect returns `PAIRING_REQUIRED` → approve once:
   `docker compose run --rm openclaw-cli devices approve <requestId>` → reload.

For *our own* build the backend can start even simpler: **one API route** that relays a panel's
messages to an agent (OpenClaw, or a plain OpenAI/Anthropic call). Panels = frontend; the
gateway/relay = backend. See the kit's `src/lib/openclaw.ts` for the WebSocket pattern.

---

## Quick reference

```bash
# health-check the app on the desktop first (flat, but proves it serves)
cd /home/frank/repos/looka && pnpm dev --port 5173 --strictPort
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/   # expect 200

# then, with the emulator open:
adb devices
adb reverse tcp:5173 tcp:5173
# open http://localhost:5173 in the emulator browser
```
