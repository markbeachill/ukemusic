// UI review: puts the pictures and the review page together in the "UI review" folder.
//   node tools/ui-review/build.js <work folder> <output folder>
// The page (page.html) is one file with the list of screens in it; the pictures sit beside it in
// images/desktop, images/ipad and images/iphone, named by their id (S4.jpg).
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const WORK = path.resolve(process.argv[2]);
const OUT = path.resolve(process.argv[3] || path.join(REPO, 'UI review'));
const APPS = ['desktop', 'ipad', 'iphone'];
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const version = require(path.join(REPO, 'package.json')).version;

// a JPEG's size, from its header (no image library needed)
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i += 1; continue; }
    const marker = b[i + 1];
    const len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return { w: 0, h: 0 };
}

fs.rmSync(path.join(OUT, 'images'), { recursive: true, force: true });
const shots = {};
const problems = [];
for (const app of APPS) {
  shots[app] = {};
  const mf = path.join(WORK, `manifest-${app}.json`);
  if (!fs.existsSync(mf)) { problems.push(`no pictures for ${app} (run it first)`); continue; }
  fs.mkdirSync(path.join(OUT, 'images', app), { recursive: true });
  for (const m of JSON.parse(fs.readFileSync(mf, 'utf8'))) {
    const src = path.join(WORK, 'shots', app, `${m.id}.jpg`);
    if (!fs.existsSync(src)) { problems.push(`${app} ${m.id}: picture missing`); continue; }
    if (!catalog.items[m.id]) { problems.push(`${app} ${m.id}: not in catalog.json (give it a name there)`); continue; }
    fs.copyFileSync(src, path.join(OUT, 'images', app, `${m.id}.jpg`));
    shots[app][m.id] = { caption: m.caption, ...jpegSize(src) };
  }
}

const num = (id) => Number((id.match(/\d+/) || [0])[0]);
const sections = catalog.sections.map((s) => ({
  ...s,
  items: Object.keys(catalog.items)
    .filter((id) => id.replace(/\d+$/, '') === s.key && APPS.some((a) => shots[a][id]))
    .sort((a, b) => num(a) - num(b))
    .map((id) => ({ id, name: catalog.items[id] }))
}));
const unused = Object.keys(catalog.items).filter((id) => !APPS.some((a) => shots[a][id]));
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const data = {
  subtitle: `version ${version} · pictures taken ${today}`,
  sections,
  shots,
  intro: {
    desktop: 'The desktop app (Windows, Mac and Linux), in a 1440 × 900 window, with the public-domain songs.',
    ipad: 'The web player on an iPad (820 × 1106, portrait, as Safari shows it), with the public-domain songs. Taken in a browser set to the iPad\'s size, touch and user agent, not on a real iPad.',
    iphone: 'The web player on an iPhone (393 × 740, as Safari shows it), with the public-domain songs. Taken in a browser set to the iPhone\'s size, touch and user agent, not on a real iPhone.'
  }
};
const page = fs.readFileSync(path.join(__dirname, 'page.html'), 'utf8')
  .replace('/*DATA*/null', () => JSON.stringify(data).replace(/</g, '\\u003c'));
fs.writeFileSync(path.join(OUT, 'index.html'), page);
fs.writeFileSync(path.join(OUT, 'README.txt'), [
  'ukemusic UI review',
  '',
  'Pictures of every screen of the desktop app and of the web player on an iPad and an iPhone,',
  `for reviewing the user interface. Version ${version}, ${today}.`,
  '',
  'Open index.html in a browser. "By app" goes through one app section by section; "Compare apps"',
  'shows each screen in the three apps side by side. Notes typed under "Look closer" stay in that browser.',
  '',
  'Made by tools/ui-review (see tools/ui-review/README.md): run "npm run ui-review" to make it again.',
  ''
].join('\n'));

console.log(`UI review: ${APPS.map((a) => `${a} ${Object.keys(shots[a]).length}`).join(', ')} pictures, in ${OUT}`);
if (unused.length) console.log(`Screens in catalog.json with no picture in any app: ${unused.join(' ')}`);
for (const p of problems) console.log(`  ! ${p}`);
