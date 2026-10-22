const assert = require('assert');
const { rankCapos, suggestCapo, shapeDifficulty } = require('../src/capo');
const { loadChordLibrary } = require('../src/chord-library');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const guitar = loadChordLibrary(null, 'guitar');

test('a song in Eb on guitar: a capo gives easier shapes; C shapes at capo 3 are among the best', () => {
  const ranked = rankCapos(['Eb', 'Ab', 'Bb', 'Cm'], guitar);
  assert.ok(ranked[0].capo > 0);
  const top3 = ranked.slice(0, 3);
  const c = top3.find((r) => r.capo === 3);
  assert.ok(c, top3.map((r) => r.capo).join(','));
  assert.deepStrictEqual(c.shapes, ['C', 'F', 'G', 'Am']);
});

test('a song already in easy shapes needs no capo', () => {
  assert.strictEqual(suggestCapo(['G', 'C', 'D', 'Em'], guitar).capo, 0);
});

test('every capo position is ranked, best first', () => {
  const ranked = rankCapos(['F#', 'B', 'C#'], guitar);
  assert.strictEqual(ranked.length, 8);
  assert.ok(ranked[0].score <= ranked[1].score);
  assert.ok(ranked[0].capo > 0, 'F# B C# is easier with a capo');
});

test('barre chords and missing shapes count as hard', () => {
  assert.ok(shapeDifficulty(guitar.chords.F) > shapeDifficulty(guitar.chords.C));
  assert.strictEqual(shapeDifficulty(null), 40);
});

console.log('All capo tests passed.');
