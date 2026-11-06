// 4.60: Free Practice for your instrument (ukulele, low G, baritone, guitar)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const PL = require('../src/practice-catalog');
const NL = require('../src/note-exercises');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ex = (id, inst) => PL.exerciseFor(PL.EXERCISES.find((e) => e.id === id), inst);

test('ukulele and low G: the exercises as written', () => {
  for (const e of PL.EXERCISES) {
    assert.strictEqual(PL.exerciseFor(e, 'soprano'), e);
    assert.strictEqual(PL.exerciseFor(e, 'lowg'), e);
  }
});

test('baritone and guitar: the G family to start with, F as the first barre, the blues in E', () => {
  for (const inst of ['baritone', 'guitar']) {
    assert.strictEqual(ex('shape-drill', inst).set.prDrillSet, 'G Em C D');
    assert.strictEqual(ex('downs', inst).set.prChords, 'G Em C D');
    assert.strictEqual(ex('flowing', inst).set.prPickChords, 'G D Em C');
    assert.deepStrictEqual([ex('chord-change', inst).set.prFromRoot, ex('chord-change', inst).set.prToRoot], ['G', 'C']);
    assert.deepStrictEqual([ex('barre', inst).set.prFromRoot, ex('barre', inst).set.prToRoot, ex('barre', inst).title], ['C', 'F', 'First barre: F']);
    assert.strictEqual(ex('blues', inst).set.prBluesKey, 'E');
    assert.strictEqual(ex('progressions', inst).set.prProgKey, 'G');
    assert.strictEqual(ex('c-major', inst).set.prScaleRoot, 'C', 'scales stay as they are');
  }
  // the catalogue itself isn't changed
  assert.strictEqual(PL.EXERCISES.find((e) => e.id === 'shape-drill').set.prDrillSet, 'C Am F G');
});

test('picking patterns are named with your strings', () => {
  assert.ok(NL.PICK_PATTERNS.every((p) => NL.pickPatternName(p.id) === p.name), 'ukulele names as before');
  assert.strictEqual(NL.pickPatternName('up', [40, 45, 50, 55, 59, 64]), 'Up: D G B E (p i m a)');
  assert.strictEqual(NL.pickPatternName('thumb', [50, 55, 59, 64]), 'Alternating thumb: D B G E (p m p a… thumb on D and G)');
  assert.strictEqual(NL.pickPatternName('pinch', [55, 60, 64, 69]), 'Pinch then roll: G+A, C, E (p+a, i, m)');
});

test('Free Practice follows your instrument; it isn\'t kept with an exercise', () => {
  assert.match(html, /\.filter\(\(el\) => el\.id && el\.id !== 'prVolume' && \(withInstrument \|\| el\.id !== 'prInstrument'\)\)/);
  assert.match(html, /if \(!el \|\| id === 'prInstrument' \|\|/, 'old saved settings with an instrument are ignored');
  assert.match(html, /const id = pr\.sessionInstrument \|\| songInstrument\(effectiveConfig\(\)\)\.id;/);
  assert.match(html, /pr\.sessionInstrument = null; \/\/ next time: your instrument again/);
});

test('your changes and one-minute scores are kept for each instrument', () => {
  assert.match(html, /const prPrefKey = \(id, family = pr\.prefFamily \|\| prFamily\(\)\) => \(family === 'uke' \? id : `\$\{id\}@\$\{family\}`\);/);
  assert.match(html, /pr\.progress\.preferences\[prPrefKey\(pr\.exId\)\] = prCaptureSettings\(\);/);
  assert.match(html, /label: `\$\{ex\.from\}>\$\{ex\.to\}\$\{prFamily\(\) === 'uke' \? '' : ` \(\$\{prFamily\(\)\}\)`\}`/);
});

test('an exercise opened from a song can be started (progress is loaded)', () => {
  assert.match(html, /if \(!pr\.progress\) prLoadProgress\(\); \/\/ opened straight into an exercise/);
});
