#!/usr/bin/env node
/**
 * Focus West pitch deck — build script.
 *
 * Reads from src/ and produces a single self-contained dist/index.html
 * with CSS inlined, JS inlined, data.json embedded, and team photos
 * encoded as base64 data URIs.
 *
 * Usage: node build.js
 * (or: npm run build)
 *
 * No external dependencies — pure Node.
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'src');
const DIST = path.join(__dirname, 'dist');

function readFile(p) { return fs.readFileSync(p, 'utf8'); }
function readBinary(p) { return fs.readFileSync(p); }

function buildStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `build-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function inlinePhotos(data) {
  // Walk data.team[] and convert any photo: "team-photos/..." path to a data URI.
  if (!data.team) return data;
  data.team = data.team.map(member => {
    if (!member.photo || member.photo.startsWith('data:')) return member;
    // member.photo is "team-photos/foo.jpg" — relative to src/
    const photoPath = path.join(SRC, member.photo);
    if (!fs.existsSync(photoPath)) {
      console.warn(`  ⚠ Photo not found: ${member.photo} (leaving path as-is)`);
      return member;
    }
    const buf = readBinary(photoPath);
    const ext = path.extname(photoPath).slice(1).toLowerCase();
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
               : ext === 'png' ? 'image/png'
               : ext === 'webp' ? 'image/webp'
               : 'application/octet-stream';
    return { ...member, photo: `data:${mime};base64,${buf.toString('base64')}` };
  });
  return data;
}

function copyPhotos() {
  const src = path.join(SRC, 'team-photos');
  const dst = path.join(DIST, 'team-photos');
  if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true });
  const named = ['conor-miller.jpg', 'skyler-pinnick.jpg', 'jared-peterson.jpg'];
  named.forEach(f => {
    const s = path.join(src, f), d = path.join(dst, f);
    if (fs.existsSync(s)) { fs.copyFileSync(s, d); console.log(`  photo → dist/team-photos/${f}`); }
    else console.warn(`  ⚠ photo not found: ${f}`);
  });
}

function build() {
  console.log('Building dist/index.html …');
  if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });

  // ─── Read source files ───
  const css = readFile(path.join(SRC, 'styles.css'));
  const js = readFile(path.join(SRC, 'app.js'));
  const template = readFile(path.join(SRC, 'index.html'));

  console.log(`  styles.css ${(css.length / 1024).toFixed(1)} KB`);
  console.log(`  app.js     ${(js.length / 1024).toFixed(1)} KB`);
  console.log(`  (client data not bundled — deck fetches live from Apps Script)`);

  // ─── Replace template links with inlined blocks ───
  let html = template;

  // Replace the build stamp in the title
  const stamp = buildStamp();
  html = html.replace(/\(build-\d{8}-\d{4}\)/, `(${stamp})`);

  // NOTE: pass replacement as a function — String.replace with a string
  // interprets $$ as a literal $, which would mangle our `$$` JS helper.

  // Replace <link rel="stylesheet" href="styles.css"> with inline <style>
  html = html.replace(
    /<link\s+rel="stylesheet"\s+href="styles\.css"\s*\/?>/,
    () => `<style>\n${css}\n</style>`
  );

  // Replace <script src="app.js"></script> with inline <script>
  html = html.replace(
    /<script\s+src="app\.js"\s*><\/script>/,
    () => `<script>\n${js}\n</script>`
  );

  // ─── Write dist/index.html ───
  const outPath = path.join(DIST, 'index.html');
  fs.writeFileSync(outPath, html, 'utf8');

  // ─── Copy team photos ───
  copyPhotos();

  console.log(`\n✓ Wrote dist/index.html — ${(html.length / 1024).toFixed(1)} KB`);
  console.log(`  Build stamp: ${stamp}`);
  console.log(`  Sections: ${(html.match(/class="deck-section"/g) || []).length}`);
  console.log(`\nOpen dist/index.html in a browser to preview.`);
}

try {
  build();
} catch (e) {
  console.error('\n✗ Build failed:', e.message);
  process.exit(1);
}
