# Looka media kit

Designed imagery for the XRCC portal submission (Media Gallery → *Thumbnail
Image* + *Image Gallery*) and any other press/marketing surface. Everything
here follows the visual system in [`../../DESIGN.md`](../../DESIGN.md): greige
brand surface, the single Looka pink accent, Outfit 700 headings / Inter body,
soft glows, glass, and rounded frames.

## Upload map (XRCC portal)

| Portal slot | File |
|---|---|
| **Thumbnail Image** | `looka-thumbnail.png` (1920×1080) |
| **Image Gallery** | everything in `gallery/`, in filename order |

## Contents

```
looka-thumbnail.png        Hero thumbnail — greige, wordmark, AR bee in a glass frame
gallery/
  01-meet-looka.png        The "Meet Looka" flow: you ask → bee → orchestrator → agents
  02-meet-the-bee.png      The 3D bee on the dark scene surface
  03-emulator-landing.png  The landing running in the PICO emulator browser
  04-emulator-spatial.png  The spatial "Welcome to Looka" panel in the emulator room
  05-handheld-ar.png       The bee placed in a real room via handheld WebXR
  06-real-world.png        AR bee out in the real world (from the pitch video)
  07-in-the-room.png       Meet the bee alongside a person (from the pitch video)
  08-open-doors.png        Brand slate — "Chatbots open windows. We open doors."
brand/                     Gathered landing/brand source assets (logo, glow, icons,
                           spatial preview). Copies — the live landing still serves
                           its own originals from frontend/public/landing/.
source/                    Reproducible design sources (see below)
```

All gallery images are 1600×1000; the thumbnail is 1920×1080. Each was rendered
at 2× and downscaled for crisp edges.

## Where the imagery comes from

- **01 / 02** are cleaned crops of real product screens (`source/screenshots/`):
  the upcoming "Meet Looka" landing and the 3D bee, browser chrome removed,
  framed on the brand surface.
- **03 / 04 / 05** are on-device proof shots (`source/screenshots/`): the
  landing in the PICO emulator browser, the spatial panel placed in the
  emulator room, and the bee placed in a real room via handheld WebXR AR.
- **06 / 07** are frames pulled from `../looka-pitch-video.mp4` (the AR bee
  composited into real scenes), cropped clean of the video's colour bars.
- **08** is a type-only brand slate built from the design tokens.

## Re-rendering / editing

The cards are plain HTML + CSS rendered with headless Chrome, so captions,
crops, and copy are easy to tweak.

```bash
cd source
./render.sh            # writes looka-thumbnail.png + gallery/* into ../
```

- `tokens.css` — the design system as CSS variables (fonts load from Google
  Fonts, same as the app).
- `thumbnail.html` · `slate.html` — standalone cards.
- `gallery.html` — full-bleed photo card; params: `img`, `pos`, `tag`, `cap`.
- `screen.html` — framed-screenshot card; params: `img`, `h`, `tag`, `cap`.
- `assets/` — the cropped stills the cards pull in.
- `screenshots/` — the original raw screenshots before cleanup.

Requires `google-chrome` and ImageMagick `convert`, plus network access for the
webfonts.
