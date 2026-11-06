// 4.61: Chords by key (a sheet to print) and Progressions from memory
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const K = require('../src/key-charts');
const PL = require('../src/practice-catalog');
const CL = require('../src/chord-library');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('a key\'s chords: I ii iii IV V vi and V7, with the main four marked, and its relative minor', () => {
  const g = K.keyRow('G');
  assert.deepStrictEqual(g.chords.map((c) => c.name), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'D7']);
  assert.deepStrictEqual(g.chords.filter((c) => c.main).map((c) => c.numeral), ['I', 'IV', 'V', 'vi']);
  assert.strictEqual(g.minor, 'Em');
  assert.strictEqual(K.keyRow('Bb').chords[5].name, 'Gm');
});

test('the keys suit the instrument', () => {
  assert.deepStrictEqual(K.chartKeys('soprano'), ['C', 'G', 'F', 'D', 'A', 'Bb']);
  assert.deepStrictEqual(K.chartKeys('lowg'), K.chartKeys('soprano'));
  assert.deepStrictEqual(K.chartKeys('guitar'), ['G', 'C', 'D', 'A', 'E', 'F']);
  assert.deepStrictEqual(K.chartKeys('baritone'), K.chartKeys('guitar'));
});

test('progressions in any key, major and minor (in the relative minor)', () => {
  assert.deepStrictEqual(K.progressionIn('pop', 'D'), ['D', 'A', 'Bm', 'G']);
  assert.deepStrictEqual(K.progressionIn('minor-v7', 'C'), ['Am', 'Dm', 'E7', 'Am']);
  assert.deepStrictEqual(K.progressionIn('andalusian', 'G'), ['Em', 'D', 'C', 'B']);
  assert.strictEqual(K.keyName('epic', 'F'), 'Dm');
  // the trainer's progressions agree
  for (const id of ['minor-three', 'minor-v7', 'epic', 'andalusian']) assert.deepStrictEqual(PL.progressionChords(id, 'A'), K.progressionIn(id, 'A'));
});

test('every chord on the sheet has a diagram, on every instrument', () => {
  for (const inst of ['soprano', 'lowg', 'baritone', 'guitar']) {
    const lib = CL.getBuiltInLibrary(inst);
    const missing = K.chartChords(inst).filter((n) => !CL.getChordDefinition(lib, n));
    assert.deepStrictEqual(missing, [], inst);
  }
});

test('the sheet: two pages, with the diagrams the app draws and the instrument named', () => {
  const page = K.chartHtml({ instrumentId: 'guitar', instrumentName: 'Guitar', diagram: (n) => `<i>${n}</i>` });
  assert.strictEqual((page.match(/<section class="page">/g) || []).length, 2);
  assert.match(page, /<title>Chords by key · Guitar<\/title>/);
  assert.ok(page.includes('<i>F#m</i>') && page.includes('<i>B7</i>'), 'the E row');
  assert.match(page, /--rhythm-color/, 'the diagrams\' colours are set');
});

test('Free Practice: the sheet card in Chords & changes; the desktop saves a PDF in Practice sheets', () => {
  assert.match(html, /if \(cat\.id === 'chords'\) \$p\('prCards'\)\.appendChild\(prChartCard\(\)\);/);
  assert.match(fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'), /handle\('practice:chartPdf'[\s\S]{0,400}path\.join\(songsFolder, 'Practice sheets'\)/);
  assert.match(fs.readFileSync(path.join(ROOT, 'src/song-library.js'), 'utf8'), /'practice sheets'/, 'no song can take that folder\'s name');
});

test('Progressions from memory: the numbers first, the chords later', () => {
  const e = PL.EXERCISES.find((x) => x.id === 'progression-memory');
  assert.ok(e && e.memory && e.mode === 'strum' && e.cat === 'chords');
  assert.strictEqual(PL.EXERCISES.length, 40);
  assert.match(html, /if \(pr\.memo\) pr\.memoryHide = pr\.from \+ barNo < pr\.memo\.hideBars;/);
  assert.match(html, /const keys = window\.ukemusic\.keyCharts\.chartKeys\(prInstrument\(\)\);/);
});
