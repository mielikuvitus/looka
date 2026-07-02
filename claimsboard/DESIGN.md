# Claimsboard design language

Editorial black-and-white. One accent: none. If it needs color, it needs a
better idea. The register is a well-set insurance ledger, not a SaaS dashboard.

## Tokens (already wired in `app/assets/css/main.css`)

- Paper `#FAF9F6` (`bg-paper`), Ink `#16150F` (`text-ink`, `bg-ink`). Grays are
  Tailwind `zinc-*` only.
- Type: **Fraunces** (`font-serif`) for page titles, KPI numbers, card
  headlines; **Hanken Grotesk** (`font-sans`, body default); **Spline Sans
  Mono** (`font-mono`) for claim numbers, money, dates, labels.
- `.stamp` class = mono 11px uppercase tracked-out — eyebrows, table headers,
  badges, metadata. Add your own `text-zinc-500` etc.; color is inherited.

## Rules

- **Hairlines, not shadows.** `border-zinc-200` separates everything; no
  rounded corners on cards/sections (rounded-full only for avatars), no
  drop shadows except the mobile drawer.
- **Solid ink is the loudest voice** — reserve it for the primary action and
  at most one "alarm" surface per page (e.g. the past-SLA KPI card inverts to
  `bg-ink text-paper`).
- Grid-with-gap-px trick for card rows: wrapper `border border-zinc-200
  bg-zinc-200 gap-px grid`, cells `bg-paper` — crisp shared hairlines.
- Money: always via `formatCents`/`formatCentsShort` from `~/utils/format`,
  rendered `font-mono`. Claim numbers render `#4459` in `font-mono`.
- Status: ALWAYS `<StatusBadge :status :sub-status />` — never re-invent.
- Activity: ALWAYS `<ActivityFeed :items :show-claim />`.
- Empty states: `<EmptyState icon title hint>` (dashed hairline box).
- Loading: prefer `USkeleton` blocks in the page's real layout; errors get a
  plain bordered sentence, not a red toast wall.
- Density: pages open with a `.stamp` eyebrow + serif `text-xl/2xl` heading
  only when the header title isn't enough; content sits in `px-4 md:px-6`,
  `py-6` rhythm. Generous whitespace beats boxes.
- Icons: lucide via `UIcon`, `size-4`/`size-4.5`, `text-zinc-400` at rest.
- Nuxt UI components inherit the monochrome theme (primary = ink). Use
  `color="primary"` for the one main action, `variant="outline"
  color="neutral"` for everything else. Never `color="error"`-style rainbow
  feedback; errors speak in words.
