const assert = require('assert');
const { transposeChord, transposeIR, transposeNote } = require('../src/transpose');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('transposeNote shifts up correctly', () => {
  assert.strictEqual(transposeNote('C', 2, false), 'D');
  assert.strictEqual(transposeNote('A', 3, false), 'C');
  assert.strictEqual(transposeNote('G', 1, false), 'G#');
});

test('transposeNote shifts down with flats', () => {
  assert.strictEqual(transposeNote('D', -2, true), 'C');
  assert.strictEqual(transposeNote('C', -1, true), 'B');
  assert.strictEqual(transposeNote('A', -1, true), 'Ab');
});

test('transposeNote wraps around', () => {
  assert.strictEqual(transposeNote('B', 1, false), 'C');
  assert.strictEqual(transposeNote('C', -1, true), 'B');
});

test('transposeChord handles simple chords', () => {
  assert.strictEqual(transposeChord('C', 2, false), 'D');
  assert.strictEqual(transposeChord('Am', 2, false), 'Bm');
  assert.strictEqual(transposeChord('G7', 2, false), 'A7');
});

test('transposeChord handles complex suffixes', () => {
  assert.strictEqual(transposeChord('F#m7', 2, false), 'G#m7');
  assert.strictEqual(transposeChord('Bbdim', -2, true), 'Abdim');
  assert.strictEqual(transposeChord('Asus4', 5, false), 'Dsus4');
});

test('transposeChord handles slash chords', () => {
  assert.strictEqual(transposeChord('C/G', 2, false), 'D/A');
  assert.strictEqual(transposeChord('Am/E', -2, true), 'Gm/D');
});

test('transposeChord with zero semitones returns unchanged', () => {
  assert.strictEqual(transposeChord('Am7', 0, false), 'Am7');
});

test('transposeIR transposes only chord nodes', () => {
  const ir = [
    { type: 'chord', content: 'C', line: 1, offset: 0, warnings: [] },
    { type: 'lyric', content: 'Hello ', line: 1, offset: null, warnings: [] },
    { type: 'chord', content: 'G', line: 1, offset: 6, warnings: [] },
    { type: 'lyric', content: 'world', line: 1, offset: null, warnings: [] },
  ];

  const result = transposeIR(ir, 2);
  assert.strictEqual(result[0].content, 'D');
  assert.strictEqual(result[1].content, 'Hello ');
  assert.strictEqual(result[2].content, 'A');
  assert.strictEqual(result[3].content, 'world');
});

test('transposeIR does not mutate original', () => {
  const ir = [
    { type: 'chord', content: 'C', line: 1, offset: 0, warnings: [] },
  ];
  const result = transposeIR(ir, 3);
  assert.strictEqual(ir[0].content, 'C');
  assert.strictEqual(result[0].content, 'D#');
});

console.log('All transpose tests passed.');
