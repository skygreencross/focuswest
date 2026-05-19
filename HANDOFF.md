# Handoff to Claude Code

State of the project as of build `build-20260518-2255` (May 18, 2026). Use this with `CLAUDE.md` to brief Claude Code on where to pick up.

---

## What's in the repo right now

```
focuswest-hawaiianaroma/
├── src/                         ← edit these
│   ├── index.html               markup template (loads CSS, JS; fetches data)
│   ├── styles.css               all CSS (76 KB)
│   ├── app.js                   all JS (57 KB) — has the SHEET_API_URL constant
│   ├── data.json                bundled client data (offline fallback)
│   └── team-photos/             three founder JPGs
│
├── dist/index.html              ← shippable single-file build (621 KB)
│
├── scripts/AppsScript.gs        ← Apps Script handler (v2 transposed layout)
│
├── audio-narration/             empty; drop MP3s here named by section
├── focus-west-pitches.csv       snapshot of the current data, in case the sheet
│                                  ever needs to be rebuilt from CSV
│
├── build.js                     bundler — no dependencies, pure Node
├── package.json                 npm scripts: build / start / preview
│
├── README.md                    public-facing project intro
├── CLAUDE.md                    project primer (auto-read by Claude Code)
├── BACKEND_BRIEF.md             original spec for the backend phase
├── DEPLOY.md                    Netlify / GitHub Pages deploy instructions
├── NARRATION_SCRIPTS.md         per-section TTS scripts
└── HANDOFF.md                   this file
```

---

## Live infrastructure (sky@rageproductions.com)

**Google Sheet:** `Focus West Pitches`
- ID: `1GddiynaYr7i0fHxcW320UWokzYGiL-L83TWjm5FRp0g`
- URL: https://docs.google.com/spreadsheets/d/1GddiynaYr7i0fHxcW320UWokzYGiL-L83TWjm5FRp0g/edit
- Layout: **transposed** (column A = field names, column B = `aroma` client, columns C+ for future clients)
- Tab name: `Pitches`

**Apps Script web app**
- Currently deployed URL (v2): `https://script.google.com/macros/s/AKfycbz8JxwoIASjU51ch1dB_fchnPIwem3soQuHL7rqndSf97Lh9sPGWPCu8nefiCw7isGr/exec`
- Old URL (v1, wide-format, unused): `https://script.google.com/macros/s/AKfycbxljV9us6Fq2AOfPL0uYrkUjoVmNodwDX143D_fnB-b9uUcb2kLpL-r9TYhu3TiHMD9/exec`
- Test it: append `?client=aroma` to the v2 URL — should return JSON
- Source code lives at `scripts/AppsScript.gs`

**GitHub**
- Repo: https://github.com/skygreencross/hawaiiaroma.git
- Status: created, initial commit pushed earlier in the session; refactor changes have **not yet been committed** (git is locked by fuse mount; see below)

**Netlify**
- A previous version of the deck was deployed; we did not capture the URL
- The new `dist/index.html` (with sheet API wiring) has **not yet been redeployed**
- Drag-and-drop at https://app.netlify.com/drop, OR drop onto an existing site card to update in place

---

## Immediate to-do list (in Code)

### 1. Commit the refactor work (5 sec)

The sandbox couldn't write to `.git/` due to fuse mount permissions, so the refactor work is uncommitted on disk. Run:

```bash
cd ~/focuswest-hawaiianaroma
rm -f .git/index.lock          # clears any stale lock from sandbox attempts
git add -A
git commit -m "Refactor: split into src/ + dist/ + backend wiring"
git push origin main
```

### 2. Verify the live backend end-to-end (60 sec)

Open in any browser:

```
https://script.google.com/macros/s/AKfycbz8JxwoIASjU51ch1dB_fchnPIwem3soQuHL7rqndSf97Lh9sPGWPCu8nefiCw7isGr/exec?client=aroma
```

Expected: a wall of JSON starting with `{"_meta":{"schemaVersion":"1.0","source":"google-sheet","client":"aroma"},...`. Cmd+F for `"company_name"` and confirm the value matches whatever you last typed in cell B2 of the sheet.

If you see `{"error":"Client \"aroma\" not found."}` instead, the deployed script is the old v1 wide-format code. Either redeploy via the Apps Script UI (Manage deployments → ✏ → Version: New version → Deploy) **or** set up clasp (option 4 below) and push the code from this folder.

### 3. Deploy `dist/index.html` to Netlify (60 sec)

Option A — drag-and-drop new site:
- Open https://app.netlify.com/drop
- Drag `dist/index.html` onto the page
- New URL appears; rename via Site configuration if you want a clean slug

Option B — update existing site:
- Open https://app.netlify.com → Sites → click your existing site
- On the site overview, drag `dist/index.html` onto the drag-and-drop zone in **Deploys**

Either way, the deck visits should use `?client=aroma` in the URL:

```
https://your-site.netlify.app/?client=aroma
```

Without the query parameter, the deck uses bundled data (the snapshot frozen into the HTML at build time).

### 4. (Optional) Set up clasp for ongoing Apps Script management

Skip this if you don't plan to change the script code often. If you do:

```bash
npm install -g @google/clasp

# Enable the Apps Script API for your account (one-time):
open https://script.google.com/home/usersettings
# Toggle "Google Apps Script API" to On

clasp login            # OAuth as sky@rageproductions.com
cd ~/focuswest-hawaiianaroma/scripts
clasp clone 1GddiynaYr7i0fHxcW320UWokzYGiL-L83TWjm5FRp0g   # sheet ID; clasp finds the bound script

# To push changes:
cp AppsScript.gs Code.gs
clasp push
clasp deploy --description "v3"   # creates a new version under the same deployment slot
```

Note: `clasp deploy` without a `--deploymentId` creates a NEW deployment (new URL). To **update the existing deployment** (same URL), get its ID via `clasp deployments` and pass `--deploymentId <id>`.

### 5. End-to-end sanity check (30 sec)

In your Netlify-deployed deck at `?client=aroma`:
1. Confirm the deck loads (password gate appears, accepts `aroma2026`)
2. Open browser DevTools → Network tab → look for a successful 200 to your `script.google.com` URL
3. Edit a value in cell B2 of the sheet (e.g., change `companyName`)
4. Save the sheet
5. Reload the Netlify URL — the new value should appear within ~1 second

If that loop works, you have a working multi-tenant pitch system. Adding a second client = adding column C to the sheet.

---

## Known gotchas

**Sandbox couldn't delete some files.** A few leftover artifacts from earlier sessions: `_ref/`, `team-photos/pdfimg-*` (the original 5 PDF-extracted JPGs before I renamed them to conor/skyler/jared), and `team-photos/` at the root level (now empty). All gitignored. `rm -rf _ref team-photos/pdfimg-* team-photos` if you want a clean working tree.

**The `$$` → `$` build bug.** `String.prototype.replace`'s replacement string interprets `$$` as a literal `$`, which would mangle the `$$` JS helper. `build.js` uses replacement callbacks instead of strings to dodge this. Don't switch back to string replacements.

**The fuse mount blocks git writes.** That's the reason this handoff exists. In Code where you have real filesystem access, none of these permission issues apply.

**Apps Script deployments — "Manage deployments" vs "New deployment".** Manage deployments → ✏ → New version keeps the same URL and just updates code. New deployment creates a fresh URL. If you create a fresh URL, you have to update `SHEET_API_URL` in `src/app.js` and rebuild.

**No CORS issues observed, but worth knowing.** Apps Script web apps deployed with "Anyone" access set `Access-Control-Allow-Origin: *` automatically. They DO 302-redirect to a `googleusercontent.com` URL for actual content delivery, which fetch follows transparently. If you ever see CORS errors, the deployment's access setting may have drifted.

---

## What's left on the roadmap

From `BACKEND_BRIEF.md`'s 8-step plan, here's the status:

| Step | Status |
|------|--------|
| 1. Refactor to src/ + dist/ + build.js | ✅ done |
| 2. Set up Google Sheet | ✅ done |
| 3. Write Apps Script `doGet(e)` handler | ✅ done |
| 4. Change deck data load to fetch from sheet | ✅ done |
| 5. Add per-client `pitchPassword` | ✅ done (in data, gate checks against it) |
| 6. Smoke-test with two clients | ⏳ pending — only `aroma` exists |
| 7. Add basic logging (Visits tab in sheet) | ⏳ not started |
| 8. Document for the IB team | ⏳ partial; CLAUDE.md and BACKEND_BRIEF.md cover devs |

After steps 6-8, the BACKEND_BRIEF.md mentions optional v2 work: admin UI for editing JSON cells through a form, real server-side auth (doPost validates password), analytics, white-label.

---

## Where to start in Code

In Terminal:

```bash
cd ~/focuswest-hawaiianaroma
claude
```

First prompt to Claude Code:

> Read CLAUDE.md and HANDOFF.md. The refactor + sheet backend are done; we need to (1) commit the uncommitted refactor work, (2) verify the live Apps Script endpoint works, and (3) deploy the new dist/ to Netlify. Walk me through it.

Claude Code can drive npm scripts, commit/push to git, use the GitHub CLI if installed, and (with the appropriate permissions) shell out to `clasp` for Apps Script management. None of the Cowork-mode roadblocks apply.
