const assert = require('assert');
const keys = require('../src/keys');
const { transposeIR } = require('../src/transpose');
const versions = require('../src/versions');
const parse = require('../src/parser');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const detect = (chords) => keys.detectKey(chords.split(' ')).name;

test('guesses the key from common progressions', () => {
  assert.strictEqual(detect('C G Am F C'), 'C');
  assert.strictEqual(detect('G C D G'), 'G');
  assert.strictEqual(detect('E A B7 E'), 'E');
  assert.strictEqual(detect('F Bb C7 F'), 'F');
  assert.strictEqual(detect('Bb Eb F7 Bb'), 'Bb');
  assert.strictEqual(detect('C F C G7 C F C'), 'C'); // Amazing Grace
});

test('recognises minor keys when the song starts or ends on the minor home chord', () => {
  assert.strictEqual(detect('Am Dm E7 Am'), 'Am');
  assert.strictEqual(detect('Em C G D Em'), 'Em');
  assert.strictEqual(detect('C#m A E B C#m'), 'C#m');
});

test('no chords, no key', () => {
  assert.strictEqual(keys.detectKey([]), null);
});

test('parses and describes keys', () => {
  assert.strictEqual(keys.describeKey(keys.parseKey('F#m')), 'F# minor');
  assert.strictEqual(keys.describeKey(keys.parseKey('Bb')), 'Bb major');
  assert.strictEqual(keys.parseKey('auto'), null);
  assert.strictEqual(keys.transposeKey(keys.parseKey('G'), 2).name, 'A');
  assert.strictEqual(keys.transposeKey(keys.parseKey('Em'), 3).name, 'Gm');
});

const shift = (song, semitones) => {
  const ir = parse(song, { useDelimiters: false });
  const key = keys.detectKey(ir.filter((n) => n.type === 'chord').map((n) => n.content));
  return transposeIR(ir, semitones, { spelling: 'key', key }).filter((n) => n.type === 'chord').map((n) => n.content).join(' ');
};

test('sharp keys get sharps: E major up 2 = F# major (C#, not Db)', () => {
  assert.strictEqual(shift('[E]a [B]b [C#m]c [A]d [G#m]e [B7]f [E]g', 2), 'F# C# D#m B A#m C#7 F#');
});

test('flat keys get flats: C major up 8 = Ab major', () => {
  assert.strictEqual(shift('[C]a [G]b [Am]c [F]d [E7]e [Bb]f [C]g', 8), 'Ab Eb Fm Db C7 Gb Ab');
});

test('minor keys: A minor up 4 = C# minor (G#7, not Ab7)', () => {
  assert.strictEqual(shift('[Am]a [Dm]b [E7]c [Am]d', 4), 'C#m F#m G#7 C#m');
});

test('borrowed chords spelled sensibly: G major with Bb, up 2 = A major with C', () => {
  assert.strictEqual(shift('[G]a [C]b [Bb]c [D]d [G]e', 2), 'A D C E A');
});

test('slash chords: bass spelled in the new key', () => {
  assert.strictEqual(shift('[C]a [C/E]b [F]c [G]d [C]e', 4), 'E E/G# A B E');
});

test('awkward key spellings fall back to the usual names (no E#, Cb)', () => {
  // In F# major the chord a semitone below F# would be "E#": use F instead
  assert.strictEqual(shift('[E]a [D#7]b [E]c', 2), 'F# F7 F#');
});

test('version names and chord maps use the key', () => {
  const key = keys.parseKey('E');
  const options = versions.targetOptions('E', ['E', 'C#m', 'A', 'B7'], 'soprano', null, key);
  const toFsharp = options.find((o) => o.semitones === 2);
  assert.strictEqual(toFsharp.to, 'F#');
  assert.deepStrictEqual(toFsharp.map.map((m) => m.to), ['F#', 'D#m', 'B', 'C#7']);
  assert.strictEqual(versions.versionFromShift(2, ['E'], key).name, 'E to F# (+2)');
});

test('rankKeys: best first, with the chords that fit and those that don\'t', () => {
  const { rankKeys, keyConfidence } = require('../src/keys');
  const ranked = rankKeys(['G', 'G7', 'Em', 'G7', 'Am', 'G', 'C', 'G', 'Am', 'D', 'G']);
  assert.strictEqual(ranked[0].key.name, 'G');
  assert.deepStrictEqual(ranked[0].outside, []);
  assert.ok(ranked[0].starts && ranked[0].ends);
  assert.strictEqual(ranked.length, 12);
  assert.strictEqual(keyConfidence(ranked), 'high');
});

test('rankKeys: a song ending on the minor chord is in the minor key', () => {
  const { rankKeys } = require('../src/keys');
  assert.strictEqual(rankKeys(['Am', 'F', 'C', 'G', 'Am'])[0].key.name, 'Am');
  assert.strictEqual(rankKeys(['Am', 'F', 'C', 'G', 'C'])[0].key.name, 'C');
});

test('rankKeys: chords from outside the key are listed; few chords give low confidence', () => {
  const { rankKeys, keyConfidence } = require('../src/keys');
  const ranked = rankKeys(['C', 'F', 'G', 'Bb', 'C']);
  assert.strictEqual(ranked[0].key.name, 'C');
  assert.ok(ranked[0].outside.includes('Bb'));
  assert.strictEqual(keyConfidence(rankKeys(['C', 'G'])), 'low');
  assert.deepStrictEqual(rankKeys([]), []);
});

test('detectKey agrees with the top of rankKeys', () => {
  const { rankKeys, detectKey } = require('../src/keys');
  for (const song of [['D', 'A', 'Bm', 'G'], ['Em', 'C', 'G', 'D', 'Em'], ['F', 'Bb', 'C7', 'F']]) {
    assert.strictEqual(detectKey(song).name, rankKeys(song)[0].key.name);
  }
});


console.log('All key tests passed.');
