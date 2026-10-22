const assert = require('assert');
const { isChordName, parseChordName, chordPitchClasses } = require('../src/chord-names');
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

test('recognises extended, altered and symbol chord names', () => {
  for (const name of ['C', 'Am', 'F#m7', 'Bbmaj7', 'Cmaj9', 'Bm7b5', 'G7#9', 'C7b9b13', 'E7sus4', 'Dsus2', 'Cadd9', 'G°', 'Bø', 'A+', 'CΔ', 'C6', 'C69', 'Calt', 'Ebmaj9/G', 'C/E']) {
    assert.ok(isChordName(name), name);
  }
});

test('ordinary words are not chord names', () => {
  for (const word of ['Bed', 'Cab', 'Ad', 'Dog', 'Am I', 'Hello', 'c']) assert.ok(!isChordName(word), word);
});

test('parses root, type, bass and the usual name of the type', () => {
  assert.deepStrictEqual(parseChordName('Bbm7b5/E'), { root: 'Bb', suffix: 'm7b5', bass: 'E', canonicalSuffix: 'm7b5', rootIndex: 10 });
  assert.strictEqual(parseChordName('CM7').canonicalSuffix, 'maj7');
  assert.strictEqual(parseChordName('G°').canonicalSuffix, 'dim');
});

test('chord notes', () => {
  assert.deepStrictEqual(chordPitchClasses('C').sort((a, b) => a - b), [0, 4, 7]);
  assert.deepStrictEqual(chordPitchClasses('Am7').sort((a, b) => a - b), [0, 4, 7, 9]);
  assert.deepStrictEqual(chordPitchClasses('C/E').sort((a, b) => a - b), [0, 4, 7]);
  assert.strictEqual(chordPitchClasses('Cxyz'), null);
});

test('the song reader accepts the new chord names without warnings', () => {
  const nodes = parse('[Cmaj7]a [Bm7b5]b [G7#9]c [A+]d [Bø]e', { useDelimiters: false });
  assert.deepStrictEqual(nodes.filter((n) => n.type === 'chord').map((n) => n.content), ['Cmaj7', 'Bm7b5', 'G7#9', 'A+', 'Bø']);
  assert.strictEqual(nodes.flatMap((n) => n.warnings).length, 0);
});

console.log('All chord name tests passed.');
