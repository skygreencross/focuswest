# Focus West — Interactive Pitch Deck

A modern HTML5 pitch deck for [Focus West](https://focusbankers.com), a division of FOCUS Investment Banking.

The entire deck is a **single self-contained HTML file**. No build step, no server, no dependencies. Drag `index.html` into any browser and it works.

## Live preview

If GitHub Pages is enabled on this repo: open the Pages URL in any browser. Press **F** for presentation mode (fullscreen + section-snap scrolling), or just scroll naturally.

## What's inside

Sixteen interactive sections covering the full sell-side narrative — cover, company snapshot with map, team, platform, founder values, buyer strategy, process, risks, value drivers, valuation, comparable transactions, scenarios, founder-takeaway waterfall, engagement terms, roadmap, disclaimer. Sliders that recalculate live (valuation sensitivity, fee calculator, net proceeds waterfall), a draggable timeline marker, drag-to-reorder priority cards, hover-revealed sparklines, and an audio narration player that auto-activates if MP3 files are dropped into `audio-narration/`.

## Updating content

All client-specific content (company name, team, valuation numbers, scenarios, locations, etc.) lives in an embedded JSON block inside `index.html`. Look for:

```html
<script type="application/json" id="bundled-data">
{ ... }
</script>
```

Edit that block and commit. GitHub Pages will redeploy automatically.

For local iteration, the deck also tries to `fetch('./data.json')` first — drop a `data.json` next to `index.html` and it overrides the embedded data, letting you iterate without re-bundling.

## Controls

- **Scroll** or **↓ / ↑ / Space / PageDown / PageUp** — section nav
- **Home / End** — jump to first or last section
- **F** — toggle presentation mode (fullscreen + scroll-snap)
- **Esc** — exit presentation mode
- **Side dots** — jump to any section

## Tech notes

- Single file, ~600 KB (includes data, team photos, all styling, all JS)
- No build pipeline; just commit and serve
- No external dependencies at runtime except Google Fonts (Newsreader, Inter, JetBrains Mono)
- Works offline once loaded
- `@media print` styles produce a usable PDF if anyone saves the page

## Credits

Map data on the Snapshot slide is a stylized rendering based on geographic reference data from OpenStreetMap, © OpenStreetMap contributors, used under the Open Database License.

## License

Proprietary — Focus Investment Banking LLC. All rights reserved.
