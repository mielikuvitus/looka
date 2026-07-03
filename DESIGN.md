# Design

Visual system for Looka, extracted from the shipped landing page
(`frontend/src/app/NonSpatialLanding.css`, Figma-derived) and its dark
sibling, the playground (`frontend/src/playground/playground.css`). Two
surfaces, one identity: a warm greige **brand surface** (landing) and a
near-black **scene surface** (playground / AR overlays). The Looka pink is
the single accent that binds them.

## Theme

Warm, physical, confident. Light greige pages with soft white glows for
marketing; deep neutral dark for the 3D scene so the bee and passthrough
carry the color. Never cream-SaaS, never neon-tech. One accent used
sparingly and decisively.

## Color palette

### Core (both surfaces)

| Token | Value | Role |
|---|---|---|
| `--looka-pink` | `#dc0073` | The brand accent: CTAs, active states, links on hover, recording pulse. Use decisively, ≤10% of any surface. |
| `--looka-pink-shadow` | `rgba(220, 0, 115, 0.20)` | Soft colored shadow under pink CTAs (`0 8px 12px`). |
| `--ink` | `#0d0d0d` | Text and true-black scene background. |

### Brand surface (landing)

| Token | Value | Role |
|---|---|---|
| `--surface-brand` | `#d9d5cb` | Page background. Committed brand greige — do not lighten toward cream. |
| `--ink-muted` | `rgba(13, 13, 13, 0.60)` | Secondary text on greige. |
| `--ink-faint` | `rgba(13, 13, 13, 0.45)` | Tertiary text (subheadings, footer links). Large/bold text only — fails AA for body sizes. |
| `--hairline` | `rgba(13, 13, 13, 0.12)` | Dividers. |
| `--badge-lavender` | `#f0e9ff` / `#473198` | Secondary chip pair (bg / text). The only non-pink color moment. |
| `--glass` | `rgba(255,255,255,0.13)` + `blur(20px)` + 1px `rgba(255,255,255,0.5)` border | The hero visual frame. Reserved for one showcase element per page — never a default card style. |
| glow | `radial-gradient(circle 320px, rgba(255,255,255,0.55), transparent)` | Soft white light behind heroes. |

### Scene surface (playground, AR dom-overlay)

| Token | Value | Role |
|---|---|---|
| `--surface-scene` | `#0d0d0d` | Page/scene background. |
| `--scene-text` | `#f5f2ec` | Primary text on dark. |
| `--scene-text-muted` | `rgba(245, 242, 236, 0.60)` | Secondary text on dark. |
| `--scene-panel` | `rgba(255, 255, 255, 0.04)` + 1px `rgba(255,255,255,0.08)` border | Status panels, overlay chrome. |

### In-scene state colors (3D objects: mic orb, indicators)

| State | Color | Motion |
|---|---|---|
| idle | orb shell `#2a2730`, pink rim | gentle float (part of bee group) |
| recording | `#dc0073` fill + pulsing ring | 1.6s ease pulse |
| working | white `#f5f2ec` dots, one per running job (max 3) | slow orbit around the orb |
| speaking | `#f5f2ec` waveform on orb | amplitude-driven |
| error | `#bf3b2f` rim flash | single 300ms flash + buzz, then idle |

## Typography

| Role | Font | Usage |
|---|---|---|
| Headings | **Outfit 700** | Display: `clamp(40px, 6vw, 84px)`, letter-spacing `-0.02em`. Section: 28–40px. Loaded via Google Fonts. |
| Body / UI | **Inter 400 / 600** | 14–22px. 600 for buttons, labels, badges. |

- Body line-height 1.6; cap line length ~65ch.
- Subheadings may use Outfit 700 at reduced opacity (`--ink-faint`) — an
  established landing pattern; keep to large sizes.
- No third font. No monospace in user-facing UI (dev pages exempt).

## Shape & depth

- **Radii:** 12px buttons/inputs · 24px large frames/cards · 100px pills
  (badges, chips, small CTAs like "Enter your space").
- **Borders:** 1px hairlines from the ink/white alpha ramps. No side-stripe
  accents.
- **Shadows:** soft and wide — `0 10px 10px rgba(0,0,0,0.06)` for floating
  chips; pink-tinted shadow under pink CTAs. Nothing harder.
- **Glass:** one glassmorphism element max per page (see `--glass`).

## Motion

- Bee/scene: continuous, organic (idle/think/talk clips, floating orb).
  This is where the motion budget goes.
- DOM: fast and few — 150–250ms ease-out transitions on hover/reveal;
  pulses only for live states (recording). No bounce, no elastic.
- Every DOM animation gets a `@media (prefers-reduced-motion: reduce)`
  fallback (crossfade or none). In-scene: reduce to essential motion only.

## Components

- **Primary CTA:** pink `#dc0073` fill, white Inter 600 16px, radius 12px
  (100px pill in-scene), pink-tinted shadow, no border.
- **Hint/note chip:** 1px `rgba(13,13,13,0.2)` border, radius 12px,
  transparent bg, 13px muted text (landing "Psst…" pattern).
- **Badge:** pill, lavender pair, Inter 600 13px uppercase, 0.02em.
- **Status panel (scene):** `--scene-panel`, radius 16–24px, centered
  Outfit heading + muted Inter body, max-width ~420px.
- **Floating badge:** white pill, soft shadow, icon + Inter 600 14px
  (landing "Spatial Enabled" pattern).
- **Transcript bubble (voice, planned):** scene-panel style anchored near
  the bee; shows the recognized text during long waits.

## Voice & copy

Light, direct, a little playful. Errors are one human line ("Couldn't reach
the hive — tap to retry"), never codes. Busy limit: "The hive is full —
three tasks at a time." British-dry over exclamation marks; at most one "!"
per screen (the landing headline owns it).

## Do not

- Cream/purple SaaS gradients, gradient text, KPI tiles, card grids.
- Terminal/monospace aesthetics in product UI.
- More than one accent moment per viewport; more than one glass element.
- Spinners for agent waits — always the character + orbiting dots.
