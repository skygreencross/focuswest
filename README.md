# Focus West — Interactive Pitch Deck

A single-file HTML pitch deck for Focus West, rebuilt from the existing `focus_founder_led_coffee_pitch_v8` Google Slides deck. All client-specific content lives in `data.json` so the deck can be repointed at a new client by swapping one file.

## Files

- `index.html` — the deck. Self-contained except for Google Fonts and `data.json`.
- `data.json` — every piece of client-specific content. Schema mirrors what would be Google Sheets columns.
- `README.md` — this file.

## Running locally

`fetch('./data.json')` will not work from `file://` in most browsers due to CORS. Serve over HTTP:

```
cd outputs
python3 -m http.server 8000
# then open http://localhost:8000/
```

If you double-click the HTML and the data doesn't load, the deck falls back to an inline copy of the data so it still renders — but for real editing, use the local server.

## Controls

- **Scroll** or **↓ / ↑ / PageDown / PageUp / Space** — section nav
- **Home / End** — first / last section
- **F** — presentation mode (fullscreen + section-snap scrolling)
- **Esc** — exit presentation mode
- **Side dots** — jump to any section (hover for label)

## Swapping clients

Edit `data.json`. The schema is documented in the `_meta` block. Key sections:

- `client` — company name, industry, deck type, date
- `cover.headline_*` — hero copy on the cover
- `team[]` — partner bios (name, title, initials, bullets)
- `platform_stats[]` — the four large stats on the platform slide
- `founder_values[]` — the six "what matters" cards
- `buyers[]` — the four buyer category cards
- `process_steps[]` / `process_funnel[]` — the three-step process + funnel numbers
- `value_drivers[]` — the eight driver cards
- `valuation` — every number on the valuation page. All multiples and implied ranges are explicit fields so you can edit any one without recalculating.
- `engagement_terms[]` — the four terms rows
- `roadmap[]` — the three roadmap windows. `weeks_start`/`weeks_end` drive the Gantt bar widths (out of 26 total weeks).
- `disclaimer` — the legal text

## Migrating to Google Sheets (in Code)

The data shape is intentionally flat-row-friendly. Suggested approach:

1. **Sheet structure.** One workbook per pitch. Tabs named to match the JSON keys (`client`, `team`, `valuation`, etc.). Single-value sections become two-column key/value tabs; array sections become regular tables with a header row matching the JSON field names.
2. **Backend.** A thin serverless endpoint (Cloudflare Worker, Vercel function, GAS web app) that reads the sheet and shapes it into the exact JSON structure of `data.json`. Easiest: Apps Script bound to the sheet, deployed as a web app, returning `JSON.stringify(buildPayload())`.
3. **Frontend swap.** In `index.html`, change:
   ```js
   const res = await fetch('./data.json');
   ```
   to:
   ```js
   const res = await fetch(`/api/pitch?client=${clientId}`);
   ```
   That's it — the render code doesn't change.
4. **Multi-client.** Each row in a top-level "Pitches" sheet points to a client-specific sub-sheet; the API resolves `?client=` to the right sheet ID. The URL `pitch.focuswest.com/companya` renders the Company A deck; `/companyb` renders Company B.

## Brand notes

- Accent green (`#7BE0AD`) is set in one place — the `:root` `--accent` CSS variable. Swap it once and every accent updates.
- Typography pairs Fraunces (display serif) + Inter (body grotesque) + JetBrains Mono (data labels). All from Google Fonts.
- Header treats Focus West as the primary mark with a small "A division of Focus Investment Banking" endorsement to keep parent-brand visibility.
- Three wordmark directions were sketched separately in chat — the deck currently uses Option A. To switch to Option B or C, replace the `.brand` block in `index.html`.

## Known limitations

- Team avatars use initials, not photos. Swap each `team-avatar` div for an `<img>` once photos exist.
- Print/PDF export is not styled. If you need a one-pager fallback, add a `@media print` block.
- The roadmap Gantt assumes a 26-week total. If `weeks_end` for any item exceeds 26 in `data.json`, bars will overflow — adjust the divisor in the `roadmapBars` render block.
