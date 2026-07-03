# Product

## Register

product

## Users

Two audiences, one demo. Primary: XRCC'26 hackathon judges and visitors who
meet Looka for 2–10 minutes on a PICO headset, a phone, or a laptop — zero
onboarding, someone else's device, high novelty expectations. Secondary:
back-office knowledge workers (the ERGO/insurance track) who would delegate
paperwork tasks ("create this claim", "pull that report") to an agent and
check back minutes later. Both meet the same character: the bee.

## Product Purpose

Looka is an agent-workflow visualiser: long-running backend agents (Nextcloud,
gridfin, SolidTime, Claimsboard) get a face. Instead of a chat log, you talk
to a bee that lives in your space — it listens, thinks while the agents work
(minutes, not seconds), and speaks the answer. Success looks like: a judge
puts on the headset, meets the bee, asks it something real, and understands
within seconds that the bee is a front end to genuine multi-minute agent work
— and enjoys the wait.

## Brand Personality

**Companionable · alive · quietly cutting-edge.**

The bee is a friendly companion who happens to be loaded with the latest tech.
Warmth is the delivery; the tech is the trick. The interface never brags about
WebXR, agents, or pipelines — it just works, and the character carries it.
Tone of voice: light, direct, a little playful ("the hive is full"), never
corporate, never cutesy-childish.

## Anti-references

- **Generic SaaS dashboard** — card grids, KPI tiles, cream-and-purple
  gradient heroes. Looka has one hero per screen: the bee.
- **Dev-tool console** — terminal aesthetics, monospace-everything, matrix
  green. The tech stays under the hood.
- **Childish toy** — the bee is charming, not a kids' app. No rainbow
  palettes, no bouncy elastic motion.
- **Corporate insurance beige** — stock-photo trust imagery, navy blazers,
  lifeless forms. Even the ERGO story is told through the companion.

## Design Principles

1. **The bee is the interface.** Every screen has one hero. UI chrome exists
   to get you to the character, then get out of the way — a status panel, a
   button, an orb; never a dashboard.
2. **Warm delivery, precise execution.** Playful copy and a living character
   on top of exact spacing, real contrast, and honest states. Charm is not an
   excuse for sloppiness.
3. **The wait is part of the product.** Agent tasks run 1–6 minutes. Waiting
   states (thinking bee, orbiting dots) are designed as first-class moments,
   not spinners.
4. **In-scene beats on-screen.** Where a control can live in the 3D scene
   (the mic orb), it does — the same object works on desktop, phone AR, and
   headset. DOM overlays are the fallback, not the default.
5. **Spend motion on the character.** The bee moves; the chrome barely does.
   One living thing per screen keeps "alive" from becoming "busy".

## Accessibility & Inclusion

Demo-first product, but the floor is: WCAG AA contrast on all DOM text
(≥4.5:1 body, ≥3:1 large), `prefers-reduced-motion` honored on every DOM/CSS
animation (scene content keeps only essential motion), all voice interactions
also show their state as text (transcript bubble, status line — never
audio-only feedback), and every AR flow has a working flat fallback.
