// 4.68: the home page's features as coloured cards; the Features page's table in colour
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const FEATURES = require('../web/features');
const pages = require('../web/pages');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const home = fs.readFileSync(path.join(ROOT, 'site/index.html'), 'utf8').replace(/\r\n/g, '\n');

test('every section has a card: a heading, one line, a colour and an icon', () => {
  for (const s of FEATURES.SECTIONS) {
    assert.ok(s.card && s.card.h && s.card.p.length > 30 && s.card.p.length < 120, s.title);
    assert.ok(['teal', 'coral', 'amber', 'blue'].includes(s.tone), s.title);
    assert.ok(FEATURES.ICONS[s.icon], s.title);
  }
  assert.strictEqual(FEATURES.SECTIONS[1].card.h, 'Play along, with karaoke');
});

test('home page: the cards, linking to each section\'s page, and the shared styles', () => {
  assert.strictEqual((home.match(/<a class="f-card tone-/g) || []).length, FEATURES.SECTIONS.length);
  for (const s of FEATURES.SECTIONS) assert.ok(home.includes(`href="${s.link}">`), s.link);
  assert.ok(home.includes(FEATURES.CSS), 'the styles come from web/features.js');
  assert.strictEqual(pages.withFeatures(home, 'home'), home, 'run node web/make.js');
  assert.strictEqual((home.match(/id="features"/g) || []).length, 1, 'one section with that id');
  assert.match(home, /<section id="what-it-does">/);
});

test('Features page: a coloured band for each section, round ticks', () => {
  const table = FEATURES.tableHtml();
  assert.strictEqual((table.match(/<tbody class="tone-/g) || []).length, FEATURES.SECTIONS.length);
  assert.match(table, /<td class="yes"><span class="mark" aria-label="Yes">✓<\/span><\/td>/);
  assert.match(table, /<td class="no"><span class="mark" aria-label="Not in this one">–<\/span><\/td>/);
  // dark mode has its own colours
  assert.match(FEATURES.CSS, /:root\[data-theme="dark"\] \.tone-coral/);
  assert.match(FEATURES.CSS, /@media \(prefers-color-scheme: dark\)/);
});

test('rows say what you get', () => {
  const rows = FEATURES.SECTIONS.flatMap((s) => s.rows.map((r) => r.f));
  assert.ok(rows.includes('It plays along with you: the chords and the strum, or picking'));
  assert.ok(!rows.some((f) => /^Playback with/.test(f)));
});

test('4.68.1: the tests also run on Windows (\\r\\n line endings), on Node 24 actions', () => {
  const wf = (f) => fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8');
  assert.match(wf('test.yml'), /os: \[ubuntu-latest, windows-latest\]/);
  for (const f of ['test.yml', 'release.yml', 'web.yml']) assert.ok(!/actions\/(checkout|setup-node|upload-artifact)@v4\b/.test(wf(f)), f);
  const pkg = require('../package.json');
  assert.strictEqual(pkg.devDependencies.electron, '^45.2.3');
});

console.log('v4.68 tests passed');
