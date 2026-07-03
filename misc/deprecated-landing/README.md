# Deprecated landing (previous design)

**Deprecated 2026-07-03.** These are verbatim copies of the original
non-spatial landing page, kept for reference only. They are **not imported**
anywhere and are not part of the build.

- `NonSpatialLanding.tsx`
- `NonSpatialLanding.css`

## What replaced it

The live landing (`frontend/src/app/NonSpatialLanding.tsx` + `.css`) was
rewritten into the **companion-flow** design: reorganised hero copy ("Meet
Looka — the bee that runs your agents"), and the old `preview-content.png`
mockup image was replaced by an inline animated SVG that shows how Looka
works — *you ask → the bee listens → the orchestrator routes → the right
agent works → the bee speaks the answer*. A single "You ask" speech bubble
cycles through one example prompt per application (Nextcloud, gridfin,
SolidTime, Claimsboard), lighting up the matching agent as it goes.

The Figma-derived brand system (greige surface, Looka pink, Outfit + Inter,
the one glass frame, `logo-group.svg` / `looka-script.svg` wordmarks) was
preserved — see `DESIGN.md`.

The design was prototyped as a standalone HTML file first; that scratch file
is not checked in.
