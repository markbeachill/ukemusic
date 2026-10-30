// Practice is shared by desktop and web. Desktop remains the canonical source.
// --from-web imports an edited web fragment into desktop; normal builds check parity.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const file = path.join(ROOT, 'index.html');
const normal = (s) => s.replace(/\r\n/g, '\n').trim();
const markers = {
  js: ['        // ── Practice: a menu', '        // ── Song / Notes tabs']
};
function spans(text) {
  const start = text.indexOf('        <div id="practice"');
  const end = text.indexOf('</dialog>', text.indexOf('<dialog id="prHelpDialog"', start)) + '</dialog>'.length;
  const c0 = text.indexOf('      /* ── Practice window');
  const c1 = text.indexOf('      /* ──', c0 + 10);
  const j0 = text.indexOf(markers.js[0]);
  const j1 = text.indexOf(markers.js[1], j0);
  if ([start, c0, c1, j0, j1].some((n) => n < 0) || end < start) throw new Error('Practice section marker missing');
  return { markup: [start, end], css: [c0, c1], js: [j0, j1] };
}
function stripDesktopHelpers(s) {
  return s.replace(/        \/\/ 4\.39: Learn → practise[\s\S]*?(?=        window\.ukemusicPracticeState)/, '');
}
function sync(fromWeb = false) {
  let desktop = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  let ranges = spans(desktop);
  const shared = {};
  for (const kind of ['markup', 'css', 'js']) shared[kind] = fs.readFileSync(path.join(ROOT, 'web', `pr_${kind === 'markup' ? 'markup.html' : kind === 'css' ? 'css.css' : 'js.js'}`), 'utf8').replace(/\r\n/g, '\n');
  if (fromWeb) {
    const helpers = desktop.match(/        \/\/ 4\.39: Learn → practise[\s\S]*?(?=        window\.ukemusicPracticeState)/)?.[0] || '';
    for (const kind of ['js', 'markup', 'css'].sort((a,b) => ranges[b][0] - ranges[a][0])) {
      let content = shared[kind];
      if (kind === 'js') content = content.replace('        window.ukemusicPracticeState', helpers + '        window.ukemusicPracticeState');
      desktop = desktop.slice(0,ranges[kind][0]) + content.trimEnd() + '\n' + desktop.slice(ranges[kind][1]);
    }
    fs.writeFileSync(file, desktop);
  }
  ranges = spans(desktop);
  for (const kind of ['markup','css','js']) {
    let content = desktop.slice(...ranges[kind]);
    if (kind === 'js') content = stripDesktopHelpers(content);
    if (normal(content) !== normal(shared[kind])) throw new Error(`Desktop/web practice ${kind} differs: run node tools/sync-practice.js --from-web after shared edits`);
  }
}
module.exports = { sync };
if (require.main === module) { sync(process.argv.includes('--from-web')); console.log('Desktop/web practice parity checked.'); }
