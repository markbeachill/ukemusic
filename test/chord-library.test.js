const assert = require('assert');
const { loadChordLibrary, getChordDefinition, candidateNames } = require('../src/chord-library');
const { chordPitchClasses, parseChordName, SUFFIX_INTERVALS, isChordName } = require('../src/chord-names');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const TUNINGS = { soprano: [67, 60, 64, 69], baritone: [50, 55, 59, 64] };

for (const instrument of ['soprano', 'baritone']) {
  const library = loadChordLibrary(null, instrument);
  const names = Object.keys(library.chords);

  test(`${instrument}: 500+ chords, every name is a chord the app recognises`, () => {
    assert.ok(names.length >= 500, `only ${names.length}`);
    const bad = names.filter((n) => !isChordName(n) || !chordPitchClasses(n));
    assert.deepStrictEqual(bad, []);
  });

  test(`${instrument}: every fingering plays only notes of its chord, with its 3rd (and root for simple chords)`, () => {
    const problems = [];
    for (const name of names) {
      const def = library.chords[name];
      const allowed = new Set(chordPitchClasses(name));
      const { rootIndex, canonicalSuffix } = parseChordName(name);
      const intervals = SUFFIX_INTERVALS[canonicalSuffix];
      const sounded = def.frets.map((f, s) => (TUNINGS[instrument][s] + f) % 12);
      if (sounded.some((pc) => !allowed.has(pc))) problems.push(`${name} wrong note ${def.frets}`);
      const third = intervals.includes(4) ? 4 : intervals.includes(3) ? 3 : intervals.includes(2) ? 2 : 5;
      if (!sounded.includes((rootIndex + third) % 12)) problems.push(`${name} no 3rd ${def.frets}`);
      if (intervals.length <= 4 && !sounded.includes(rootIndex)) problems.push(`${name} no root ${def.frets}`);
      if (def.fingers.some((f) => f > 4)) problems.push(`${name} finger > 4`);
    }
    assert.deepStrictEqual(problems, []);
  });
}

test('the hand-checked beginner shapes are kept', () => {
  const s = loadChordLibrary(null, 'soprano');
  const b = loadChordLibrary(null, 'baritone');
  assert.deepStrictEqual(getChordDefinition(s, 'C').frets, [0, 0, 0, 3]);
  assert.deepStrictEqual(getChordDefinition(s, 'B7').frets, [2, 3, 2, 2]);
  assert.deepStrictEqual(getChordDefinition(b, 'C').frets, [2, 0, 1, 0]);
  assert.deepStrictEqual(getChordDefinition(b, 'A7').frets, [2, 2, 2, 3]);
});

test('common extended chords get the usual easy shapes', () => {
  const s = loadChordLibrary(null, 'soprano');
  assert.deepStrictEqual(getChordDefinition(s, 'Am7').frets, [0, 0, 0, 0]);
  assert.deepStrictEqual(getChordDefinition(s, 'Cmaj7').frets, [0, 0, 0, 2]);
  assert.deepStrictEqual(getChordDefinition(s, 'Dsus2').frets, [2, 2, 0, 0]);
  assert.deepStrictEqual(getChordDefinition(s, 'Em7').frets, [0, 2, 0, 2]);
});

test('other ways of writing a chord find the same fingering', () => {
  const s = loadChordLibrary(null, 'soprano');
  const same = (a, b) => assert.deepStrictEqual(getChordDefinition(s, a).frets, getChordDefinition(s, b).frets, `${a} vs ${b}`);
  same('CM7', 'Cmaj7');
  same('CΔ', 'Cmaj7');
  same('B°', 'Bdim');
  same('Bø', 'Bm7b5');
  same('C+', 'Caug');
  same('Csus', 'Csus4');
  same('A#m7', 'Bbm7');
  same('Gb7#9', 'F#7#9');
  same('Am7/G', 'Am7');
  assert.ok(candidateNames('CM7/E').includes('Cmaj7'));
});

test('a chord type the library does not have returns null (placeholder diagram)', () => {
  assert.strictEqual(getChordDefinition(loadChordLibrary(null, 'soprano'), 'C13#11b9'), null);
});

console.log('All chord library tests passed.');
