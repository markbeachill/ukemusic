// Karaoke (4.74) is the same code in the desktop app and the web player. Desktop (index.html) is
// the source; web/k_js.js, k_css.css and k_markup.html are copies of its three parts.
//   node tools/sync-karaoke.js            check they match (npm test runs this)
//   node tools/sync-karaoke.js --write    copy the desktop's parts into web/ after a change
// What only the desktop has (trouble spots) is used behind karaokeTroubleSpots; the web player
// supplies the few helpers it needs (web/app.html: showToast, focusEditor…).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const normal = (s) => s.replace(/\r\n/g, '\n').trim();
const PARTS = {
  js: { file: 'k_js.js', from: '        // ── Karaoke view', to: '        async function toggleSongPlayback' },
  css: { file: 'k_css.css', from: '      .karaoke {', to: '      .capo-choices {' },
  markup: { file: 'k_markup.html', from: '    <div id="karaoke" class="karaoke"', to: '    <script src="src/song-ui.js"></script>' }
};
function parts(desktop) {
  const out = {};
  for (const [kind, p] of Object.entries(PARTS)) {
    const a = desktop.indexOf(p.from);
    const b = desktop.indexOf(p.to, a);
    if (a < 0 || b < 0) throw new Error(`Karaoke ${kind}: a marker is missing in index.html`);
    out[kind] = normal(desktop.slice(a, b));
  }
  return out;
}
function sync(write = false) {
  const desktop = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  const p = parts(desktop);
  for (const [kind, { file }] of Object.entries(PARTS)) {
    const web = path.join(ROOT, 'web', file);
    if (write) fs.writeFileSync(web, `${p[kind]}\n`);
    else if (normal(fs.readFileSync(web, 'utf8')) !== p[kind]) throw new Error(`Desktop/web karaoke ${kind} differs: run node tools/sync-karaoke.js --write after a change in index.html`);
  }
}
module.exports = { sync, parts };
if (require.main === module) { sync(process.argv.includes('--write')); console.log(`Desktop/web karaoke ${process.argv.includes('--write') ? 'copied' : 'checked'}.`); }
