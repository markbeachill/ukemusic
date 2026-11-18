#!/usr/bin/env node
// The user guides' pictures from the UI review (4.95). The guides (docs/user-guide.md, and 4.97's
// docs/user-guide-phone.md for the web player on a phone) use the
// website's own pictures (site/img/*.webp, from npm run site-pictures) and, for the many screens
// those don't show, pictures from the UI review, copied into site/img/guide/ by this script.
//
//   npm run ui-review            first (or: npm run ui-review -- desktop iphone)
//   npm run guide-pictures       then: copies the pictures the guide uses, and lists any missing
//   npm run guide-pictures -- --from "D:\Review"     the UI review's folder, if not "UI review"
//
// The guide names a review picture by app and step: ../site/img/guide/desktop-L4.jpg is the
// desktop app's step L4 (New song), iphone-F1.jpg the web player's step F1 on an iPhone. The step
// ids and what each shows are in tools/ui-review/catalog.json. Only the pictures the guide uses are
// copied; ones it no longer uses are removed from site/img/guide/.
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const GUIDES = ['user-guide.md', 'user-guide-phone.md'].map((f) => path.join(REPO, 'docs', f));   // 4.97: and the phone guide
const OUT = path.join(REPO, 'site', 'img', 'guide');

/** The review pictures the guide uses: [{ file: 'desktop-L4.jpg', app: 'desktop', id: 'L4' }] */
function wanted(markdown) {
  const seen = new Map();
  for (const m of String(markdown).matchAll(/site\/img\/guide\/((desktop|ipad|iphone)-([A-Z]+\d+)\.jpg)/g)) seen.set(m[1], { file: m[1], app: m[2], id: m[3] });
  return [...seen.values()];
}

function copy({ from = path.join(REPO, 'UI review') } = {}) {
  const list = wanted(GUIDES.filter((f) => fs.existsSync(f)).map((f) => fs.readFileSync(f, 'utf8')).join('\n'));
  fs.mkdirSync(OUT, { recursive: true });
  const missing = [];
  let copied = 0;
  for (const p of list) {
    const src = path.join(from, 'images', p.app, `${p.id}.jpg`);
    if (!fs.existsSync(src)) { missing.push(`${p.app} ${p.id}`); continue; }
    const dest = path.join(OUT, p.file);
    const same = fs.existsSync(dest) && fs.readFileSync(dest).equals(fs.readFileSync(src));
    if (!same) { fs.copyFileSync(src, dest); copied += 1; }
  }
  const keep = new Set(list.map((p) => p.file));
  const removed = fs.readdirSync(OUT).filter((f) => f.endsWith('.jpg') && !keep.has(f));
  for (const f of removed) fs.rmSync(path.join(OUT, f));
  return { used: list.length, copied, missing, removed };
}

if (require.main === module) {
  const at = process.argv.indexOf('--from');
  const from = at > 0 ? path.resolve(process.argv[at + 1]) : undefined;
  const r = copy({ from });
  console.log(`Guide pictures: the guide uses ${r.used} from the UI review; ${r.copied} copied or updated${r.removed.length ? `, ${r.removed.length} no longer used removed` : ''}.`);
  if (r.missing.length) {
    console.error(`Not in the UI review (run it, or that app and section, e.g. npm run ui-review -- desktop L): ${r.missing.join(', ')}`);
    process.exitCode = 1;
  }
}

module.exports = { wanted, copy, OUT };
