// 4.8: finger exercises (the spider walk)
const assert = require('assert');
const f = require('../src/finger-exercises');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
const NAMES = ['G', 'C', 'E', 'A'];

test('the basic walk: frets 1-2-3-4 on each string, G to A', () => {
  const notes = f.spiderNotes({ rounds: 1, upAndBack: false });
  assert.strictEqual(notes.length, 16);
  assert.deepStrictEqual(notes.slice(0, 5).map((n) => `${n.string}:${n.fret}:${n.finger}`), ['0:1:1', '0:2:2', '0:3:3', '0:4:4', '1:1:1']);
  assert.strictEqual(f.spiderTab(notes, NAMES).text, [
    'A |-------------------------1-2-3-4-|',
    'E |-----------------1-2-3-4---------|',
    'C |---------1-2-3-4-----------------|',
    'G |-1-2-3-4-------------------------|'
  ].join('\n'));
});
test('the other patterns, and coming back reversed', () => {
  assert.deepStrictEqual(f.spiderNotes({ patternId: '1324', rounds: 1, upAndBack: false }).slice(0, 4).map((n) => n.fret), [1, 3, 2, 4]);
  assert.deepStrictEqual(f.spiderNotes({ patternId: '1423', rounds: 1, upAndBack: false }).slice(0, 4).map((n) => n.fret), [1, 4, 2, 3]);
  const back = f.spiderNotes({ rounds: 1, upAndBack: true });
  assert.strictEqual(back.length, 32);
  assert.deepStrictEqual(back.slice(16, 20).map((n) => `${n.string}:${n.fret}`), ['3:4', '3:3', '3:2', '3:1']);
  assert.ok(back[16].back);
});
test('warm-up: one round of each of the four patterns', () => {
  const w = f.spiderNotes({ patternId: 'warmup', rounds: 1, upAndBack: false });
  assert.strictEqual(w.length, 64);
  assert.deepStrictEqual([0, 16, 32, 48].map((i) => w.slice(i, i + 4).map((n) => n.finger).join('')), ['1234', '1324', '1423', '4321']);
});
test('moving up the neck a fret each round, then back down', () => {
  const m = f.spiderNotes({ rounds: 7, upAndBack: false, moveUp: true });
  assert.deepStrictEqual([...new Set(m.map((n) => `${n.round}:${n.position}`))].map((x) => Number(x.split(':')[1])), [1, 2, 3, 4, 3, 2, 1]);
  assert.strictEqual(f.spiderNotes({ startFret: 3, rounds: 1 })[0].fret, 3);
});
test('the tab marks where each note is', () => {
  const notes = f.spiderNotes({ rounds: 1, upAndBack: false, startFret: 5 }).slice(0, 6);
  const tab = f.spiderTab(notes, NAMES);
  const rows = tab.text.split('\n');
  assert.strictEqual(rows[3].substr(tab.cells[0].col, tab.cells[0].len), '5');
  assert.strictEqual(rows[2].substr(tab.cells[4].col, tab.cells[4].len), '5', 'C string is the third row');
  assert.strictEqual(rows[3].substr(tab.cells[3].col, 1), '8');
});
test('schedule: notes on, click only, and "hear it, then you"', () => {
  const notes = f.spiderNotes({ rounds: 2, upAndBack: false });
  const on = f.spiderSchedule(notes, { tempo: 60, countIn: true });
  const strums = on.events.filter((e) => e.kind === 'strum');
  assert.strictEqual(strums.length, 32);
  assert.strictEqual(strums[0].notes[0], 67 + 1, 'G string, fret 1');
  assert.strictEqual(strums[0].time, 4);
  assert.strictEqual(on.duration, 4 + 32);
  assert.strictEqual(on.bars.length, 8);
  const demo = f.spiderSchedule(notes, { tempo: 60, sound: 'demo' });
  assert.deepStrictEqual([demo.events.filter((e) => e.kind === 'strum').length, demo.events.filter((e) => e.kind === 'cue').length], [16, 16]);
  const click = f.spiderSchedule(notes, { tempo: 60, sound: 'click', countIn: false });
  assert.strictEqual(click.events.filter((e) => e.kind === 'strum').length, 0);
  assert.strictEqual(click.events.filter((e) => e.kind === 'click').length, 32);
  const off = f.spiderSchedule(notes, { tempo: 60, sound: 'off', countIn: false });
  assert.strictEqual(off.events.filter((e) => e.kind === 'click').length, 0);
  const fast = f.spiderSchedule(notes, { tempo: 60, notesPerBeat: 2, countIn: false });
  assert.strictEqual(fast.duration, 16);
  assert.strictEqual(f.noteAt(fast, 1.6), 3);
});
test('describing a note, and string names from a tuning', () => {
  assert.strictEqual(f.describeNote({ finger: 4, string: 3, fret: 4 }, NAMES), 'Little finger (4) · A string · fret 4');
  assert.deepStrictEqual(f.stringNames([67, 60, 64, 69]), NAMES);
  assert.deepStrictEqual(f.stringNames([40, 45, 50, 55, 59, 64]), ['E', 'A', 'D', 'G', 'B', 'E']);
});

console.log('All 4.8 tests passed.');
