const assert = require('assert');
const parse = require('../src/parser');
const v = require('../src/versions');
const { transposeChord, transposeIR } = require('../src/transpose');
const { loadChordLibrary, getChordDefinition } = require('../src/chord-library');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('"C becomes F" is +5 semitones, not "two notes"', () => {
  assert.deepStrictEqual(v.makeVersion('C', 'F'), { semitones: 5, from: 'C', to: 'F', name: 'C to F (+5)' });
});

test('shifts take the shorter way round', () => {
  assert.strictEqual(v.makeVersion('C', 'G').semitones, -5);
  assert.strictEqual(v.makeVersion('C', 'Bb').semitones, -2);
  assert.strictEqual(v.makeVersion('C', 'F#').semitones, 6);
  assert.strictEqual(v.makeVersion('C', 'C'), null);
});

test('reference chord can be minor: Am becomes Dm is +5', () => {
  assert.strictEqual(v.makeVersion('Am', 'Dm').semitones, 5);
});

test('common spelling: Bb not A#, C#m not Dbm, F# not Gb', () => {
  const sp = { spelling: 'common' };
  assert.strictEqual(transposeChord('C', 10, sp), 'Bb');
  assert.strictEqual(transposeChord('Am', 4, sp), 'C#m');
  assert.strictEqual(transposeChord('C', 6, sp), 'F#');
  assert.strictEqual(transposeChord('G', -4, sp), 'Eb');
  assert.strictEqual(transposeChord('Am/G', 5, sp), 'Dm/C');
});

test('transposeIR with common spelling', () => {
  const out = transposeIR(parse('[C]a [G]b [Am]c'), 3, { spelling: 'common' })
    .filter((n) => n.type === 'chord').map((n) => n.content);
  assert.deepStrictEqual(out, ['Eb', 'Bb', 'Cm']);
});

test('versions round-trip through the song.ini string', () => {
  const list = v.addVersion(v.addVersion([], v.makeVersion('C', 'F')), v.makeVersion('G', 'F'));
  const str = v.formatVersions(list);
  assert.strictEqual(str, '-2:G:F,5:C:F');
  assert.deepStrictEqual(v.parseVersions(str).map((x) => x.name), ['G to F (-2)', 'C to F (+5)']);
});

test('the same shift is stored once; bad entries ignored', () => {
  const list = v.addVersion([v.makeVersion('C', 'F')], v.makeVersion('G', 'C'));
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].name, 'G to C (+5)');
  assert.deepStrictEqual(v.parseVersions('0:C:C,99:C:D,x,5:C:F,5:G:C').map((x) => x.semitones), [5]);
});

test('export folder per version', () => {
  const list = [v.makeVersion('C', 'F')];
  assert.strictEqual(v.versionFolder(0, list), 'Song');
  assert.strictEqual(v.versionFolder(5, list), 'C to F (+5)');
  assert.strictEqual(v.versionFolder(3, list), 'Shift +3');
});

test('slash chords are shortened in version names and folders', () => {
  assert.strictEqual(v.makeVersion('Am/G', 'Dm/C').name, 'Am to Dm (+5)');
});

test('target options list all 11 keys with full chord map and hints', () => {
  const chords = v.songChords(parse('[C]a [G]b [Am]c [F]d'));
  const options = v.targetOptions('C', chords, 'soprano');
  assert.strictEqual(options.length, 11);
  const toF = options.find((o) => o.to === 'F');
  assert.deepStrictEqual(toF.map.map((m) => m.to), ['F', 'C', 'Dm', 'Bb']);
  assert.deepStrictEqual(toF.harder, ['Bb']);
  assert.deepStrictEqual(options.find((o) => o.to === 'D').harder, []);
});

test('versionFromShift uses the first chord as reference', () => {
  assert.strictEqual(v.versionFromShift(2, ['G', 'C']).name, 'G to A (+2)');
});

test('diagram lookup tries the other spelling and drops slash bass', () => {
  const lib = loadChordLibrary(null, 'soprano');
  assert.deepStrictEqual(getChordDefinition(lib, 'A#').frets, getChordDefinition(lib, 'Bb').frets);
  assert.deepStrictEqual(getChordDefinition(lib, 'Am/G').frets, getChordDefinition(lib, 'Am').frets);
  assert.strictEqual(getChordDefinition(lib, 'Am/G').name, 'Am/G');
  assert.strictEqual(getChordDefinition(lib, 'Xyz'), null);
});

console.log('All version tests passed.');
