# PicoChallenge — reference & resources

Working folder for the **PICO Tech Layer** track at **XRCC'26** (Berlin).
Everything here is *reference material we can look things up in* — the cloned repos
are read-only inspiration, not our build. Our actual app lives elsewhere
(`/home/frank/repos/looka` today).

> The idea in one line: **managing many AI agents on a flat screen is a UX problem, not a
> mind problem. Give each agent a rectangle and distribute them in space so you can
> actually keep an overview.** See `../source-data/16-kami-fit-analysis.txt` for the
> full strategy and `spatial-agents-pitch.html` (in this folder / `/tmp`) for the pitch.

## Layout

```
PicoChallenge/
├── README.md                 ← you are here
├── EMULATOR-SETUP.md         ← Task 1: how to run our WebSpatial app in the PICO emulator (Linux)
├── resources/
│   ├── pico-resources.md     ← curated PICO Resources hub (links, kits, docs, videos)
│   ├── webspatial-llms.txt   ← WebSpatial docs index (short, for LLM context)
│   └── webspatial-llms-full.txt ← the ENTIRE WebSpatial docs in one file (~3.3k lines)
└── reference/                ← cloned repos, read-only reference
    ├── sample-techshop/                  ← official WebSpatial e-commerce demo (given to us)
    ├── webspatial_openclaw_command_center/ ← ★ literally our idea, pre-built: spatial agent
    │                                          panels + per-agent chat + voice, runs in PICO emulator
    └── SensAI-PICO-Kits/                 ← collection of PICO starter kits (voice, world model…)
```

## The two most useful references

1. **`reference/webspatial_openclaw_command_center/`** — this is our idea already scaffolded.
   Floating agent list → tap an agent → a per-agent spatial chat window opens, with streaming
   responses and voice input. It talks to an OpenClaw gateway over WebSocket. Read its `README.md`
   and `src/AgentsPanel.tsx` / `src/AgentChatPanel.tsx` for exactly how to render agents as
   spatial panels. **This is the pattern to copy.**

2. **`resources/webspatial-llms-full.txt`** — the full WebSpatial API/concepts docs in one file.
   Grep this instead of guessing an API. (Also mirrored locally in `looka/.webspatial/docs/`.)

## How the pieces relate

- **PICO OS 6** ships a built-in **WebSpatial Runtime**, so a WebSpatial web app runs *directly
  by URL* on a PICO headset or in the **PICO Emulator** — no packaging, no app store, no Mac.
- That means the `webspatial-builder run` / visionOS-simulator path (which **needs a Mac**) is
  **not** our path. We use the PICO Emulator on Linux. → see `EMULATOR-SETUP.md`.

*Sources: XRCC'26 Notion board (scraped in `../source-data/`), webspatial.dev docs, and the
GitHub repos listed above. Compiled 2026-07-01.*
