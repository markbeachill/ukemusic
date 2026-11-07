// 4.66: a features table (one list, web/features.js), and "Add songs from the web" as the main way in
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FEATURES = require('../web/features');
const pages = require('../web/pages');
const home = read('site/index.html');
const readme = read('README.md');
const html = read('index.html');
const app = read('web/app.html');

test('features: getting songs in comes first; every row says what each app does', () => {
  assert.strictEqual(FEATURES.SECTIONS[0].title, 'Get songs in');
  assert.strictEqual(FEATURES.SECTIONS[0].rows[0].f, 'Paste a chord sheet from any website');
  for (const s of FEATURES.SECTIONS) {
    assert.ok(s.link && s.rows.length, s.title);
    for (const r of s.rows) {
      for (const app of ['web', 'desktop']) assert.ok(r[app] === true || r[app] === false || (typeof r[app] === 'string' && r[app]), `${r.f}: ${app}`);
    }
  }
});

test('features: works offline and no account are features, and on the home page', () => {
  const rows = FEATURES.SECTIONS.flatMap((s) => s.rows);
  for (const f of ['Works offline', 'No account needed, no adverts', 'Free and open source']) {
    const row = rows.find((r) => r.f === f);
    assert.ok(row && row.home && row.web && row.desktop, f);
  }
});

test('features: what the web player lacks is marked, not hidden', () => {
  const rows = FEATURES.SECTIONS.flatMap((s) => s.rows);
  for (const f of ['Setlists', 'Loop a part', 'Songbook PDFs of a setlist']) assert.strictEqual(rows.find((r) => r.f === f).web, false, f);
  assert.ok(!FEATURES.featureList('web').includes('Setlists'));
  assert.ok(FEATURES.featureList('desktop').includes('Setlists'));
});

test('home page and README tables are up to date with web/features.js', () => {
  assert.strictEqual(pages.withFeatures(home, 'home'), home, 'run node web/make.js');
  assert.strictEqual(pages.withFeatures(readme, 'readme'), readme, 'run node web/make.js');
  assert.match(home, /<table class="features short">/);
  assert.match(readme, /\| Paste a chord sheet from any website \| ✓ \| ✓ \|/);
});

test('home page: structured data lists each app\'s features', () => {
  assert.ok(home.includes(`"featureList": ${JSON.stringify(FEATURES.featureList('desktop'))}`));
  assert.ok(home.includes(`"featureList": ${JSON.stringify(FEATURES.featureList('web'))}`));
});

test('the sell: any chord sheet from the web, free, offline, no account', () => {
  const h1 = 'Any chord sheet from the web, ready to play along, learn and practise.';
  assert.ok(home.includes(`<h1>${h1}</h1>`) || home.includes(h1));
  assert.ok(readme.includes(h1));
  assert.match(home, /Works offline · No account, no adverts/);
});

test('site: Features first in the menu; songs page is "Add songs"', () => {
  assert.strictEqual(pages.FEATURES_PAGE.file, 'features.html');
  assert.match(home, /<a class="opt" href="features\.html">Features<\/a>/);
  assert.match(home, />Add songs</);
  assert.ok(!/>Your songs<\/a>/.test(home));
});

test('songs page: paste from a website first, then the other ways in', () => {
  const src = read('web/pages.js');
  const i = src.indexOf("title: 'Add songs from the web'");
  assert.ok(i > 0);
  const page = src.slice(i);
  const order = ['Paste from a website', 'More ways in', 'Your club', 'Difficult sheets'].map((t) => page.indexOf(t));
  assert.ok(order.every((n, k) => n > 0 && (k === 0 || n > order[k - 1])), order.join(','));
});

test('web player: Paste from a website, before New song, makes a song in your instrument', () => {
  assert.ok(app.indexOf('id="pasteSongBtn"') > 0 && app.indexOf('id="pasteSongBtn"') < app.indexOf('id="newSongBtn"'));
  assert.match(app, /<dialog id="pasteSongDialog">/);
  assert.match(app, /U\.songFiles\.songFromText\(`\$\{title\}\.txt`, raw\)/);
  assert.match(app, /instrument: myInstrument\(\)/);
});

test('desktop library: Paste from a website, before New song', () => {
  assert.ok(html.indexOf('id="libPaste"') > 0 && html.indexOf('id="libPaste"') < html.indexOf('id="libNew"'));
  assert.match(html, /id="libNew" class="library-new secondary"/);
  assert.match(html, /getElementById\('libPaste'\)\?\.addEventListener\('click', \(\) => fromLibrary\(pasteNewSong\)\)/);
});

console.log('v4.66 tests passed');
