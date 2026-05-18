# Focus West — Pitch Deck Project

Project primer for Claude Code. This file is read automatically when you launch `claude` in this directory.

---

## What this is

A modern, interactive HTML5 sell-side pitch deck for **Focus West**, the founder-led division of **FOCUS Investment Banking** (an established middle-market IB). The deck is delivered to founders considering an exit; each instance is customized for one client.

The first version is the file `index.html` in this folder — a 619 KB single self-contained HTML file with 16 sections, ~15 interactive components, embedded JSON data, embedded team photos, an audio narration player, and a client-side password gate. It's deliberately portable: drop the file anywhere and it works.

The next phase is to convert this into a real product: a backend-driven, multi-tenant pitch system where the Focus West team can spin up a new client deck by adding a row to a Google Sheet. See `BACKEND_BRIEF.md` in this directory for the full spec.

---

## How to read the codebase

The deck is currently one file with two notional layers:

1. **The render layer** — `index.html` contains all markup, CSS, and JS. CSS variables at the top of the `<style>` block control the entire visual system (colors, type, spacing). JavaScript at the bottom of `<body>` reads a data object (`DATA`), populates each section's DOM via a `render(d)` function, and wires up interactivity for every interactive component.
2. **The data layer** — Today, data lives in TWO places: an embedded `<script type="application/json" id="bundled-data">` block inside `index.html` (the canonical source for the deployed file), and a sibling `data.json` (the dev-time source). At boot, the deck tries `fetch('./data.json')` first and falls back to the embedded JSON if the fetch fails. Same shape in both.

The JSON is **flat-row friendly** — meaning every field maps cleanly to a Google Sheets column or a row in a typed sheet. This was a deliberate design choice to make the backend migration cheap.

---

## Conventions to preserve

When Claude Code makes changes, follow these conventions unless there's a specific reason to break them:

**CSS:**
- All colors, font sizes, and spacing units flow through CSS custom properties defined in `:root { ... }`. Don't hardcode hex colors in component CSS; reference variables.
- The accent color is **champagne** (`--accent: #D4B36A`) with a sage secondary (`--secondary: #95C5A4`). The whole palette inverts cleanly in `@media print`.
- Typography: **Newsreader** (serif display, from Google Fonts), **Inter** (body), **JetBrains Mono** (data labels, eyebrows). All loaded via one `<link>` tag in `<head>`.
- All animations use `cubic-bezier(0.2, 0.7, 0.2, 1)` for the standard ease-out feel.
- Reveal-on-scroll uses two classes: `.reveal` (single element) and `.reveal-stagger` (parent that staggers its children). An `IntersectionObserver` adds `.in` when the element crosses the threshold.
- Interactive components (slider, fee calc, waterfall, scenario picker, drag-to-reorder) share a visual vocabulary: pulsing accent dot in the header, champagne track, sage success states. Keep them visually consistent.

**JS:**
- No build step. ES modules are NOT used. Code is written as plain `<script>`-tag JavaScript with `$()` and `$$()` helpers for `document.querySelector` and `[...querySelectorAll]`.
- `DATA` is the only global. Every render reads from it; every interaction updates DOM in place and (where applicable) the live model.
- Each section has a `renderX(d)` function and (for interactive ones) a `wireX()` function. They're called from `render(d)` and `boot()` respectively.
- Section numbering is **auto-computed** from DOM order via `autoNumberEyebrows()` and `wireNav()`. Don't hardcode section numbers in eyebrow strings — they're rewritten at boot.

**HTML:**
- Section IDs are stable (`#cover`, `#snapshot`, `#team`, etc.) — they're referenced by the audio player, the share button, and the side nav.
- Data attributes (`data-section`, `data-label`) are populated programmatically in `wireNav()`.

**File state:**
- `index.html` is the **source of truth** for what gets shipped. The bundled JSON inside it is authoritative.
- `data.json` is a dev-time convenience that overrides the bundle when present.
- `team-photos/` exists for source reference but the JPEGs are also base64-inlined inside the bundled JSON, so they survive when the file moves.
- `audio-narration/` is empty by default; if MP3s are dropped in matching section IDs (`cover.mp3`, `snapshot.mp3`, etc.), the audio player auto-detects them.

---

## File map

- **`index.html`** — the deck. Everything visual is in here. 619 KB.
- **`data.json`** — readable copy of the data, edited during development. The bundling step (see `scripts/` below if added later) re-syncs it into `index.html`.
- **`team-photos/`** — Conor, Skyler, Jared headshots. Bundled as base64 inside index.html.
- **`audio-narration/`** — drop section-named MP3s here for the narration player. `README.md` inside has provider-specific instructions.
- **`NARRATION_SCRIPTS.md`** — per-section ~45-second scripts ready to paste into ElevenLabs / OpenAI TTS.
- **`github-deploy/`** — minimal deploy-ready subset (just `index.html`, `README.md`, `.gitignore`) for dropping onto Netlify or pushing to GitHub Pages.
- **`README.md`** — high-level project doc for humans.
- **`BACKEND_BRIEF.md`** — what to build next. Start here for the backend work.
- **`CLAUDE.md`** — this file.

---

## Current state

What works today:
- All 16 sections render from the embedded JSON.
- Interactive components: valuation sensitivity slider, fee calculator, waterfall with live inputs, scenario picker (clicks update the waterfall), comparable transactions panel, drag-to-reorder priority cards, hover-revealed sparklines on value drivers, draggable roadmap "today" marker, audio player.
- Client-side password gate (`PITCH_PASSWORD` constant near the bottom of the `<script>` block).
- `@media print` styles that produce a usable PDF.

What doesn't yet exist:
- Backend / data API. Everything is hardcoded for "Company A" (placeholder) with a real Waikiki client's location data already wired in.
- Multi-tenancy. Spinning up a new client deck requires editing JSON by hand.
- Real (server-side) authentication. The current password gate is bypassable by anyone with browser DevTools.
- Analytics. We don't know who has opened a deck, when, or how far they scrolled.
- Admin UI for the IB team.

---

## What NOT to do without thinking

- **Don't break the single-file portability.** The deck currently works dropped into any folder, on any host, online or offline. If you split it into multiple files for maintainability, make sure there's a build step that re-bundles to a single file for the final deployment.
- **Don't trust the client-side password gate.** It's polite friction. If real confidentiality matters, the auth must move server-side.
- **Don't change the JSON shape without checking.** It's designed to map to Google Sheets columns. Adding a deep nested structure makes the Sheets migration painful. Stay flat-row-friendly.
- **Don't add external runtime dependencies** beyond Google Fonts. The deck must work offline once loaded.

---

## How to test

There's no test suite yet. Manual checks before a change ships:
- Open `index.html` via `file://` (double-click). Confirm the password gate appears, accepts `aroma2026`, and the deck renders.
- Serve via `python3 -m http.server` and confirm the deck pulls `data.json` instead of the bundle (look at the network tab for a 200 on `data.json`).
- Walk every section. Confirm count-up animations fire when their elements enter view, not before.
- Drag every slider and check the math updates live.
- Hit Cmd+P, save to PDF, confirm the print styles look reasonable.

A first task for Claude Code, if useful: set up a Playwright smoke test that renders the deck headless and screenshots each section. That'd give us a real regression catch.

---

## When in doubt

Read `ARCHITECTURE.md` for deeper technical context on specific subsystems (the waterfall math, the audio player, the bundle/unbundle script). Read `BACKEND_BRIEF.md` for the next phase's spec.
