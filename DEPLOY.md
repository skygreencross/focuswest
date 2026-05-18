# How to deploy the deck

Build first, then ship `dist/index.html`. That's the only file the host needs.

```bash
npm run build
```

Then pick one of the deploy paths below.

---

## Netlify drag-and-drop (recommended, ~3 minutes, free)

1. Go to **https://app.netlify.com/drop** (sign up free if needed).
2. Drag **`dist/index.html`** onto the drop zone. Just the file — no folder needed.
3. ~10 seconds later you get a deploy URL like `https://wandering-coast-a8f3c2.netlify.app`.
4. Click **Site configuration → Change site name** → rename to `focus-west-pitch` or similar. Final URL: `https://focus-west-pitch.netlify.app`.
5. Share the URL plus the access code with the founder.

**To update** the deck after a code change: `npm run build` again, then drag the new `dist/index.html` onto the same site card on your Netlify dashboard. It redeploys in place.

---

## GitHub Pages

Free, public-by-default. Useful if you've got a private repo with GitHub Pro for unguessable-URL privacy.

```bash
# Make sure dist/ is committed
git add dist/index.html
git commit -m "Build: $(date +%Y-%m-%d)"
git push

# Then in your repo's Settings → Pages:
#   Source: Deploy from a branch
#   Branch: main
#   Folder: /dist
# Save. URL appears at top of Pages settings.
```

Note: GitHub Pages expects the deployable at the repo root or under `/docs`. To use `/dist`, you'll either need to move the build output (`build.js` is easy to tweak) or commit `dist/index.html` to root under a different name. The simplest move: build, copy `dist/index.html` to repo root as `index.html`, push.

---

## Real password protection (Netlify Pro, $19/mo)

The client-side gate in `src/app.js` is polite friction, not real auth. For a real client pitch where leakage would matter, upgrade Netlify to Pro:

1. Deploy as above.
2. **Site configuration → Visitor access → Password protection** → set a password.
3. Remove the client-side gate from `src/app.js` (find `PITCH_PASSWORD` and set it to empty string), rebuild, redeploy.

Alternative: Vercel password-protected previews are free and equivalent. Same drag-and-drop UX as Netlify.

---

## Changing the access code

Edit `src/app.js`, find:

```javascript
const PITCH_PASSWORD = 'aroma2026';
```

Change the string. Save. `npm run build`. Redeploy.

To **disable the gate entirely**, set:

```javascript
const PITCH_PASSWORD = '';
```

---

## What the client-side password gate actually does

It's a JavaScript overlay that hides the deck until the access code is entered. Pros: free, works offline, requires no paid tier. Cons: bypassable via browser DevTools. Stops 99% of casual viewers (the recipient sharing the URL accidentally) but not a determined attacker.

For most founder-pitch situations this is sufficient. The recipient isn't going to crack open DevTools to look at your source — and if they do, they're not the buyer you want.
