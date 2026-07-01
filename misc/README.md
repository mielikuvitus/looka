# misc

Everything that isn't the app itself: the vision doc, reference material, and a
helper script for pulling external repos.

## What's here

```
misc/
├── reference/
│   ├── vision.html          the full Looka pitch / plan (open in a browser)
│   ├── refs.json            list of external repos worth reading
│   ├── webspatial/          bundled WebSpatial docs (llms-full.txt)
│   ├── xrcc/                key XRCC PICO challenge notes (README, emulator setup)
│   └── external/            cloned reference repos — gitignored, pulled on demand
└── pull-references.sh       clones the repos in refs.json into external/
```

## Pulling the external references

The repos in `reference/external/` are read-only inspiration, not part of our
build, so they're gitignored. Pull them when you want them:

```bash
pnpm refs:pull
```

That clones (or updates) every repo listed in
[`reference/refs.json`](./reference/refs.json) into `reference/external/`.

## The bundled docs

- `reference/webspatial/webspatial-llms-full.txt` — the entire WebSpatial docs
  in one file, handy for LLM context. The structured version also lives in
  `.webspatial/docs/` at the repo root and is the source of truth.
- `reference/xrcc/` — the PICO challenge README and emulator setup notes.
