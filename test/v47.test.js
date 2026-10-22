// 4.7: Practice (strum, 12-bar blues, chord change)
const assert = require('assert');
const t = require('../src/training');
const parse = require('../src/parser');
const { buildSchedule } = require('../src/playback-schedule');
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
const soprano = loadChordLibrary('soprano');

test('exercises are written as bar lines the parser reads', () => {
  assert.strictEqual(t.barLines([['C'], ['Am'], ['F'], ['G'], ['C']]), '| C | Am | F | G |\n| C |');
  const ex = t.strumExercise({ bars: 6 });
  assert.strictEqual(ex.text, '{D-DU-UDU}\n| C | Am | F | G |\n| C | Am |');
  const s = buildSchedule(parse(ex.text), { tempo: 60, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => b.chord), ['C', 'Am', 'F', 'G', 'C', 'Am']);
});
test('12-bar blues: standard, quick change, turnaround, sevenths', () => {
  assert.deepStrictEqual(t.bluesChart({ key: 'G', sevenths: false, turnaround: false }), ['G', 'G', 'G', 'G', 'C', 'C', 'G', 'G', 'D', 'C', 'G', 'G']);
  const c = t.bluesChart({ key: 'C', quickChange: true });
  assert.strictEqual(c[1], 'F7');
  assert.strictEqual(c[11], 'G7');
  assert.strictEqual(t.bluesExercise({ key: 'A', rounds: 2 }).bars, 24);
});
test('shuffle shape: one finger two frets up on the 5th', () => {
  assert.deepStrictEqual(t.shuffleShape('C7', soprano).frets, [2, 0, 0, 1]);
  assert.deepStrictEqual(t.shuffleShape('G7', soprano).frets, [0, 4, 1, 2]);
  assert.deepStrictEqual(t.shuffleShape('A7', soprano).frets, [0, 1, 2, 0]);
  assert.deepStrictEqual(t.shuffleShape('E7', soprano).frets, [1, 2, 0, 4]);
  for (const key of Object.keys(t.BLUES_KEYS)) {
    for (const chord of new Set(t.bluesChart({ key }))) assert.ok(t.shuffleShape(chord, soprano), `${chord} has a shuffle shape`);
  }
});
test('shuffle in playback: beats 2 and 4 use the shuffle shape', () => {
  const s = buildSchedule(parse('{DDDD}\n| C7 |'), { tempo: 60, countIn: false, library: soprano });
  const events = t.applyShuffle(s, { C7: t.shuffleShape('C7', soprano) });
  const strums = events.filter((e) => e.kind === 'strum');
  assert.deepStrictEqual(strums.map((e) => Boolean(e.shuffle)), [false, true, false, true]);
  assert.strictEqual(strums[1].notes[0], 67 + 2, 'G string fret 2 = A');
});
test('metronome clicks on every beat, accent on the first', () => {
  const s = buildSchedule(parse('{D}\n| C | G |'), { tempo: 60, countIn: false });
  const clicks = t.addClicks(s).filter((e) => e.kind === 'click');
  assert.strictEqual(clicks.length, 8);
  assert.deepStrictEqual(clicks.map((c) => c.accent), [true, false, false, false, true, false, false, false]);
  const half = buildSchedule(parse('{D}\n| C G |'), { tempo: 60, countIn: true });
  assert.deepStrictEqual(t.addClicks(half).filter((e) => e.kind === 'click' && e.barIndex === -2).map((c) => c.accent), [true, false, false, false]);
});
test('chord change: every bar or every 2 beats', () => {
  const bar = t.changeExercise({ from: 'C', to: 'F', bars: 4 });
  assert.strictEqual(bar.text.split('\n')[1], '| C | F | C | F |');
  const half = t.changeExercise({ from: 'Am', to: 'F', every: 'half', bars: 2 });
  const s = buildSchedule(parse(half.text), { tempo: 60, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => `${b.chord}:${b.duration}`), ['Am:2', 'F:2', 'Am:2', 'F:2']);
});
test('change tips: fingers that stay down, open strings, barres', () => {
  assert.ok(t.changeTips('Am', 'F', soprano).some((tip) => /Keep this finger down: G string, fret 2/.test(tip)));
  assert.ok(t.changeTips('C', 'F', soprano).some((tip) => /No finger stays put/.test(tip)));
  assert.ok(t.changeTips('G', 'Bb', soprano).some((tip) => /barre/.test(tip)));
  assert.deepStrictEqual(t.changeTips('C', 'Xyz', soprano), []);
});
test('partners for a chord: the ones a 4th and 5th away first', () => {
  const p = t.partnersFor('F');
  assert.deepStrictEqual(p.slice(0, 2), ['C', 'Bb']);
  assert.ok(!p.includes('F'));
});

console.log('All 4.7 tests passed.');
