# Backend Brief — Focus West Pitch System

The frontend deck is built. This document specifies what to build behind it.

---

## Vision

A multi-tenant pitch system where the Focus West team can spin up a new client pitch by adding a row to a Google Sheet, then send a unique URL to the founder. The URL renders the same deck template, populated with that client's numbers. No copy-paste, no Photoshop, no hand-edited JSON files.

A single founder visiting their unique URL sees a personalized deck. The Focus West team has a small admin view to manage clients and see who's viewed what.

---

## Architecture options, ranked

### Option A: Google Apps Script (recommended for v1)

The simplest possible backend. Zero infrastructure, zero hosting cost, deploys in under an hour.

**Stack:**
- Google Sheet with one row per client (columns map 1:1 to deck JSON fields).
- A Google Apps Script `.gs` file bound to the sheet, deployed as a web app.
- The script's `doGet(e)` reads the row matching `e.parameter.client` and returns shaped JSON.
- Frontend: deck served from Netlify/GitHub Pages, fetches `https://script.google.com/.../exec?client={clientId}` for its data.

**Pros:**
- Free, no servers.
- Trivial to edit data (just edit the sheet, the deck updates on next load).
- Google handles auth for the team (you log in with your Google account to edit the sheet).
- The IB team is already using Google Workspace — no new tools to learn.

**Cons:**
- Apps Script web apps are publicly accessible — anyone with the URL gets data. Means password auth must be enforced separately.
- Cold starts can be slow (~1–3s for the first request).
- No fine-grained access logs.

**Build steps:**
1. Create a Google Sheet titled "Focus West Pitches" with the column schema in `data-schema.md` (Claude Code should generate this file when it starts).
2. Tools → Apps Script → write `doGet(e)` and `doPost(e)` handlers.
3. Deploy → New Deployment → Web App → Execute as Me, Access Anyone with link.
4. In `index.html`, change `fetch('./data.json')` to `fetch('${APPS_SCRIPT_URL}?client=${clientId}')`. Extract `clientId` from the URL query param.

### Option B: Cloudflare Worker + KV (recommended for v2)

If/when Apps Script gets limiting (cold starts, no real auth, no analytics).

**Stack:**
- Cloudflare Worker as the API endpoint.
- Cloudflare KV (or D1 SQLite) for client data.
- Cloudflare Access in front for real auth.
- Frontend: same deck file, deployed to Cloudflare Pages.

**Pros:**
- Real auth via Cloudflare Access (Google SSO for the team, magic-link for recipients).
- ~10ms cold starts.
- Built-in analytics on every request.
- Effectively free at this volume.

**Cons:**
- More to learn if the team isn't already on Cloudflare.
- Data lives in KV, not Sheets — IB team needs an admin UI to edit (more dev).

### Option C: Vercel + Postgres + NextAuth

If we eventually want a full SaaS-shaped product with self-serve onboarding, dashboards, payments, etc.

Not for v1. Skip.

**Recommendation: start with A, plan for B.** Apps Script gets us to a real product this week. Worker is the right v2.

---

## Data model

The JSON shape in `data.json` and the embedded bundle is the source of truth. The Google Sheet should have one tab named "Pitches" with one row per client and the following columns (camelCase to match JSON keys):

**Top-level fields:**
- `clientId` (unique slug, used in the URL — e.g., `aroma`, `secretspot`)
- `companyName`, `industry`, `preparedDate` (ISO), `deckType`
- `coverEyebrow`, `coverHeadlineLine1`, `coverHeadlineLine2`, `coverSubhead`
- `pitchPassword` (per-client access code; replaces the global `PITCH_PASSWORD`)

**Snapshot:**
- `snapshotSubhead`, `snapshotGeography`, `snapshotTrajectoryCaption`
- `snapshotTrajectoryYears` (JSON array, e.g. `["2022","2023","2024","2025"]`)
- `snapshotTrajectoryRevenue` (JSON array of numbers)
- `snapshotStats` (JSON array of 4 `{value, label}` objects)
- `snapshotLocations` (JSON array of `{x, y, name, address}` — embed as JSON string in cell)

**Valuation:**
- `valuationRangeLow`, `valuationRangeHigh`
- `valuationApproach`, `valuationCaveat`
- `revenue2025`, `revenueYoyPct`, `ebitda2025`, `ebitdaMarginPct`
- `ebitdaMultLow`, `ebitdaMultHigh`, `ebitdaImpliedLow`, `ebitdaImpliedHigh`
- `revenueMultLow`, `revenueMultHigh`, `revenueImpliedLow`, `revenueImpliedHigh`
- `valuationNormalizationNote`, `valuationSource`

**Waterfall:**
- `wfDefaultTv`, `wfDefaultOwnershipPct`, `wfDefaultBasisK`, `wfDefaultState`
- `wfWorkingCapitalPegPct`, `wfDebtOutstanding`, `wfClosingCosts`
- `wfFedCapGainsPct`, `wfStatesJson` (JSON array of `{name, rate}`)

**Engagement:**
- `successFeePct`, `retainerMonthlyUsd`
- `engagementTermsJson` (JSON array of `{term, value, detail}`)
- `engagementCloser`

**Roadmap:**
- `roadmapJson` (JSON array of `{id, label, window, weeksStart, weeksEnd, body}`)
- `roadmapCta`

**Disclaimer:**
- `disclaimer`

**Other arrays** (store as stringified JSON in their respective cells, parse in the Apps Script):
- `teamJson` — `[{name, title, initials, accentRole, photoUrl, bullets}]`
- `platformStatsJson` — `[{value, label, detail}]`
- `platformDealsJson` — `[{year, sector, value, buyerType}]`
- `founderValuesJson` — `[{id, title, body}]`
- `founderValuesPullQuote` — string
- `buyersJson` — `[{category, headline, body, stats}]`
- `buyersTakeaway` — string
- `processStepsJson` — `[{id, title, body}]`
- `processFunnelJson` — `[{value, label}]`
- `valueDriversJson` — `[{title, body, spark}]`
- `risksJson` — `[{title, risk, mitigation}]`
- `comparablesJson` — `[{target, year, sector, evM, evEbitda, evRevenue, buyerType, note}]`
- `scenariosJson` — `[{id, name, headline, evLowM, evHighM, retentionPct, holdPeriod, founderRolePost, implications}]`

For the cells that hold JSON: the Apps Script handler does `JSON.parse(row[col])` to turn them back into arrays/objects. The team will edit JSON in cells — annoying but tractable. **Phase 1.5** could be a small Apps Script-driven editor that hides the JSON behind a real form. **Phase 2** is the proper admin UI.

---

## Apps Script handler shape

Approximate, for Claude Code to refine:

```javascript
function doGet(e) {
  const clientId = (e.parameter.client || '').toLowerCase();
  if (!clientId) return jsonError(400, 'missing client');

  const sheet = SpreadsheetApp.getActive().getSheetByName('Pitches');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const row = data.find((r, i) => i > 0 && String(r[headers.indexOf('clientId')]).toLowerCase() === clientId);
  if (!row) return jsonError(404, 'client not found');

  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i]; });

  // Reshape obj into the structure data.json expects
  const payload = {
    client: { company_name: obj.companyName, industry: obj.industry, prepared_date: obj.preparedDate, deck_type: obj.deckType },
    cover: { eyebrow: obj.coverEyebrow, headline_line_1: obj.coverHeadlineLine1, headline_line_2: obj.coverHeadlineLine2, subhead: obj.coverSubhead },
    snapshot: {
      subhead: obj.snapshotSubhead,
      geography: obj.snapshotGeography,
      trajectory_caption: obj.snapshotTrajectoryCaption,
      trajectory_years: JSON.parse(obj.snapshotTrajectoryYears),
      trajectory_data: JSON.parse(obj.snapshotTrajectoryRevenue),
      stats: JSON.parse(obj.snapshotStats),
      locations: JSON.parse(obj.snapshotLocations),
    },
    team: JSON.parse(obj.teamJson),
    // ...etc for every section
  };

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(code, msg) {
  return ContentService.createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## Auth migration (replacing the client-side gate)

The current `PITCH_PASSWORD = 'aroma2026'` constant in `index.html` needs to be replaced by a per-client check.

**Option 1 (simplest, still client-side):** The Apps Script returns `pitchPassword` as a top-level field. The deck reads it from `DATA.client.pitchPassword` and checks against user input. Still bypassable via DevTools, but at least each client has their own password.

**Option 2 (proper):** The deck POSTs the entered password to a `doPost(e)` Apps Script endpoint, which checks against the sheet's `pitchPassword` column. If correct, the script issues a short-lived signed token (HMAC-SHA256 of `clientId+timestamp` with a secret stored in Script Properties). The deck stores the token in `sessionStorage` and includes it in subsequent data fetches. The script rejects fetches without a valid unexpired token.

**Option 3 (real):** Move auth to Cloudflare Access in front of the deck. Founders get a magic-link email; the link puts them through Cloudflare's auth, which sets a session cookie. The deck never sees the password — Cloudflare gates access at the edge.

For v1, Option 1 is fine. Build Option 2 once we have more than three live pitches. Option 3 is v2 territory.

---

## URL design

Suggested URL shape: `https://pitch.focuswest.com/{clientId}` — e.g., `pitch.focuswest.com/secretspot`. Implementation:

- Static deploy of `index.html` at the apex.
- A wildcard route or `?client={id}` query param feeds `clientId` to the deck's fetch call.
- Pretty URLs (no `?client=` visible to the founder) require either Cloudflare Pages with a rewrite rule, or a small middleware on Vercel/Netlify that maps `/secretspot` → `/?client=secretspot`. Both are easy.

---

## Admin tooling (deferred but worth scoping)

For the IB team to manage pitches without editing the Google Sheet directly:

- A separate `admin.html` (same deck framework, different mode) that lists all clients from the sheet, lets you click into one, and presents the JSON as a form.
- Saves via `doPost(e)` to the Apps Script.
- Same auth pattern — but with internal SSO (Google login via Apps Script's native session).

This is probably Week 3 work. Document the shape but don't build until v1 is shipped.

---

## Suggested order of operations for Claude Code

1. **Refactor the deck into a maintainable structure.** Split `index.html` into `index.html` (markup), `styles.css`, `app.js`, with a `build.js` script that re-bundles to single-file for shipping. Bundle step is critical — preserves single-file portability while making development saner.
2. **Set up the Google Sheet** with the column schema in this file. Populate one row of test data matching the current bundle.
3. **Write the Apps Script `doGet(e)` handler.** Deploy as web app. Confirm it returns the same JSON shape the deck currently bundles.
4. **Change the deck's data load** from bundled-or-fetch-data.json to `fetch(${APPS_SCRIPT_URL}?client=${clientId})`. Read `clientId` from `location.search`.
5. **Add per-client `pitchPassword`** to the data model. Deck reads it from `DATA.client.pitchPassword` and uses that for the gate check.
6. **Smoke-test with two clients.** Confirm `?client=aroma` and `?client=test` both load with different content and different passwords.
7. **Add basic logging.** Apps Script can log each fetch to a "Visits" tab — clientId, timestamp, IP (limited in Apps Script, but you get something).
8. **Document the new flow** in README.md so the IB team can add a new client in minutes.

Estimated effort: a focused weekend, or a developer-week part-time.

---

## Open questions for the IB team (don't build assumptions)

- Should each founder have a **unique** password, or per-client (everyone at the company shares one)?
- Should the deck **expire** after N days, or stay live indefinitely?
- Should the founder be able to **download a PDF** of their deck? (The `@media print` styles support this today; might want a dedicated "Download PDF" button that uses a real PDF renderer like Playwright headless.)
- Should we **track engagement** (which sections were viewed, time on each)? Easy to add via PostHog / Plausible.
- Does Focus West want a **white-label option** so other IB firms can use this engine? (Affects branding architecture significantly. Probably no — but worth confirming.)

---

## How to start with Claude Code

In your terminal:

```bash
cd "/Users/skypinnick/Library/Application Support/Claude/local-agent-mode-sessions/29eca65b-ed20-4f7a-89ed-5f458a293c67/f561f07c-6adb-4b8f-ac29-d0c7f0f79776/local_9c9de509-19c6-478d-b86a-8c0448d5f68f/outputs"
npx @anthropic-ai/claude-code
```

Claude Code will read `CLAUDE.md` automatically and pick up the project context. Then ask it something like:

> Read CLAUDE.md and BACKEND_BRIEF.md, then propose a plan for step 1 (refactor into separate files with a build step). Don't write code yet — let me approve the plan first.

Iterate from there.
