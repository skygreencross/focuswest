# How to deploy this deck

The deck is a single self-contained HTML file with a client-side password gate. Drop it on any static host and it works.

The current access code is **`aroma2026`** — change it by editing one line in `index.html` (see "Changing the password" below) before you deploy.

---

## Recommended path — Netlify drag-and-drop (≈3 minutes, free)

Netlify's free tier doesn't include site-wide password protection (Pro feature, $19/mo), but the deck has a built-in client-side gate that works without paying.

1. Go to **https://app.netlify.com** (sign up free if you don't have an account).
2. On the team dashboard, look for the drag-and-drop zone labeled **"Want to deploy a new site without connecting to Git? Drag and drop your site output folder here."**
3. Drag this entire `github-deploy/` folder onto that zone.
4. Wait ~10 seconds. Netlify generates a random URL like `https://wandering-coast-a8f3c2.netlify.app`.
5. Click **Site settings → Change site name** to give it a friendlier slug like `focus-west-pitch` or `secret-spot-pitch`. Final URL becomes `https://focus-west-pitch.netlify.app`.

Send the founder:
- The URL
- The access code `aroma2026` (or whatever you change it to)

Optional but recommended:
- **Site settings → Build & deploy → Post processing → Asset optimization** → leave defaults on (CSS minify, etc.)
- **Domain management → Add custom domain** → point `pitch.focuswest.com` at it for a cleaner shareable URL.

---

## Real password protection — Netlify Pro tier ($19/mo)

If you want server-side password protection (not bypassable via DevTools):

1. Deploy as above.
2. Upgrade your Netlify team to Pro.
3. **Site configuration → Visitor access → Password protection** → set a password.
4. Optionally remove the client-side gate from `index.html` (delete the `<div class="gate">` block and set `PITCH_PASSWORD = ''` in the JS).

---

## Alternative — GitHub Pages

Free, but no built-in password support. The client-side gate still works, but the deck source is visible to anyone who can find the repo. See below for steps.

### Web UI

1. Go to **https://github.com/new**, name it (e.g., `focus-west-pitch`).
2. Visibility: **Public** if you're okay with the repo being searchable; **Private** if you have GitHub Pro ($4/mo) and want unguessable-URL privacy.
3. Add a README, create.
4. **Add file → Upload files** → drag `index.html`, `README.md`, `.gitignore` from this folder.
5. Commit.
6. **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save.**
7. URL appears at top of Pages settings: `https://YOUR-USERNAME.github.io/REPO-NAME/`.

### Command line

```bash
cd path/to/github-deploy

git init -b main
git add .
git commit -m "Initial deck commit"
git remote add origin https://github.com/YOUR-USERNAME/REPO-NAME.git

# First push:
git push -u origin main

# If the repo was initialized with a README (non-fast-forward error):
git pull origin main --allow-unrelated-histories
git push -u origin main
```

Then turn on Pages via the web UI (step 6 above).

---

## Changing the password

Open `index.html` in any text editor and search for `PITCH_PASSWORD`. You'll find:

```javascript
const PITCH_PASSWORD = 'aroma2026';
```

Change the string. Save. Re-deploy (drag the folder to Netlify again, or push to GitHub).

To **disable the gate entirely** (e.g., for a public-facing version), set the password to an empty string:

```javascript
const PITCH_PASSWORD = '';
```

---

## What the password gate actually does

It's a client-side overlay that hides the deck until the access code is entered. The check happens in JavaScript in the browser. Pros:

- Stops 99% of casual viewers — anyone who shares the URL accidentally.
- Free, requires no paid tier or auth provider.
- Works offline (the HTML is self-contained).

Cons:

- Anyone who opens browser DevTools can find the password string in the JS source or skip the gate via the console.
- For a real high-stakes pitch where leakage is unacceptable, use Netlify Pro password protection or Vercel password-protected previews instead.

For most founder-pitch sharing situations, the client-side gate is enough. The recipient isn't going to crack open DevTools to look at your source — and if they do, they're not your buyer.

---

## Updating the deck after deploy

Anything you edit in `index.html` ships next time you redeploy. To update:

- **Edit content (company name, valuation, team, locations):** find the `<script type="application/json" id="bundled-data">` block inside `index.html` and edit the JSON. Or place a `data.json` next to `index.html` — the deck prefers it when present.
- **Edit visuals (typography, accent color):** the `:root { ... }` CSS variables at the top of the `<style>` block control everything.
- **Add audio narration:** generate MP3s from `NARRATION_SCRIPTS.md`, drop them in a `audio-narration/` folder next to `index.html`, re-deploy, and the player will auto-detect them.

For Netlify, just drag the updated folder onto the same site card on your dashboard — it redeploys in place.
