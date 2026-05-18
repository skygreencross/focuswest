# Focus West — Interactive Pitch Deck

A modern HTML5 sell-side pitch deck for [Focus West](https://focusbankers.com), a division of FOCUS Investment Banking.

The deck is a 16-section interactive experience with a Waikiki street-map snapshot, live valuation sensitivity slider, fee calculator, net-proceeds waterfall, comparable-transactions panel, drag-to-reorder priority cards, animated process funnel, draggable roadmap marker, audio narration player, and a client-side password gate. Bundles into a single self-contained HTML file that works offline.

---

## Quick start

```bash
# Install Node (if you don't have it): https://nodejs.org — anything ≥ 18 works
# No other dependencies. No npm install required.

npm run build       # bundle src/ → dist/index.html
npm run start       # build + open the deck in your default browser
npm run preview     # open the last build without rebuilding
```

To iterate quickly without rebuilding on every change, serve `src/` directly:

```bash
cd src
python3 -m http.server 8000
# then open http://localhost:8000/
```

Edits to `src/styles.css`, `src/app.js`, or `src/data.json` show up on refresh.

The current access code (set in `src/app.js`, near the bottom): `aroma2026`.

---

## Project structure

```
focuswest-hawaiianaroma/
├── src/                     ← edit these
│   ├── index.html           ← markup template
│   ├── styles.css           ← all CSS
│   ├── app.js               ← all JS
│   ├── data.json            ← all client content
│   └── team-photos/         ← team JPGs
│
├── dist/                    ← generated; don't edit
│   └── index.html           ← shippable single-file deck (~619 KB)
│
├── audio-narration/         ← drop MP3s here for the narration player (optional)
├── build.js                 ← bundler (no dependencies)
├── package.json
│
├── README.md                ← this file
├── CLAUDE.md                ← project primer for Claude Code (auto-loaded)
├── BACKEND_BRIEF.md         ← spec for the next phase (Google Sheets backend)
├── NARRATION_SCRIPTS.md     ← per-section narration scripts for TTS
└── DEPLOY.md                ← how to ship to Netlify / GitHub Pages
```

---

## What's built (v1.1)

- 16 sections covering the full sell-side narrative — cover, snapshot, team, platform, founder values, buyer strategy, process, risks, value drivers, valuation, comparables, scenarios, founder takeaway (waterfall), engagement terms, roadmap, disclaimer.
- ~15 interactive widgets: valuation slider, fee calculator, scenario picker, net-proceeds waterfall with 4 live inputs, drag-to-reorder priority cards, hover-revealed sparklines, draggable roadmap marker, audio narration player, animated process funnel, count-up stats.
- Champagne accent (`#D4B36A`) with sage secondary (`#95C5A4`); inverts cleanly in print.
- Single self-contained build output. No build pipeline beyond `node build.js`. No external dependencies at runtime except Google Fonts.
- Client-side password gate. Free-tier-host-friendly. (Not real auth — see `BACKEND_BRIEF.md` for the upgrade path.)

---

## What's next

See `BACKEND_BRIEF.md` for Phase 2 — multi-tenancy via a Google Apps Script backend pointed at a Google Sheet, so the Focus West team can add a new client deck by adding a row.

---

## Credits

Map data on the Snapshot slide is a stylized rendering based on geographic reference data from OpenStreetMap, © OpenStreetMap contributors, used under the Open Database License.

---

## License

Proprietary — Focus Investment Banking LLC. All rights reserved.
