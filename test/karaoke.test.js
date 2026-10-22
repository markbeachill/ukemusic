const assert = require('assert');
const parse = require('../src/parser');
const { buildSchedule } = require('../src/playback-schedule');
const { buildKaraoke, pieceProgress } = require('../src/karaoke');
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
const close = (a, b) => Math.abs(a - b) < 1e-6;
const song = (text, opts = {}) => {
  const ir = parse(text, { useDelimiters: false, rhythmEnabled: true });
  const schedule = buildSchedule(ir, { library: soprano, tempo: 60, countIn: false, ...opts });
  return { schedule, k: buildKaraoke(ir, schedule, opts) };
};

test('each chord\'s words take that chord\'s bar', () => {
  const { k } = song('[C]Clementine, [G]lost and gone forever');
  const [line] = k.lines;
  assert.deepStrictEqual(line.pieces.map((p) => [p.chord, p.text]), [['C', 'Clementine, '], ['G', 'lost and gone forever']]);
  assert.ok(close(line.pieces[0].start, 0) && close(line.pieces[0].end, 4));
  assert.ok(close(line.pieces[1].start, 4) && close(line.pieces[1].end, 8));
  assert.ok(close(line.start, 0) && close(line.end, 8));
});

test('[] holds a chord for another bar, shown as a bar line', () => {
  const { k } = song('[Am]three [] [F]four');
  const [am, bar, f] = k.lines[0].pieces;
  assert.strictEqual(bar.chord, '|');
  assert.strictEqual(bar.bar, true);
  assert.ok(close(am.start, 0) && close(am.end, 4));
  assert.ok(close(bar.start, 4) && close(bar.end, 8));
  assert.ok(close(f.start, 8));
});

test('words after [] get the extra bar', () => {
  const { k } = song('[G]Oh Susanna\n[]Oh don\'t you [C]cry for me');
  const [bar, c] = k.lines[1].pieces;
  assert.deepStrictEqual([bar.chord, bar.text], ['|', 'Oh don\'t you ']);
  assert.ok(close(k.lines[0].pieces[0].end, 4) && close(bar.start, 4) && close(bar.end, 8) && close(c.start, 8));
});

test('a line of chords with no words is marked instrumental', () => {
  const { k } = song('[[Instrumental]]: [G] [C] [] [D]\n[G]words');
  assert.strictEqual(k.lines[0].label, 'Instrumental:');
  assert.strictEqual(k.lines[0].instrumental, true);
  assert.deepStrictEqual(k.lines[0].pieces.map((p) => p.chord), ['G', 'C', '|', 'D']);
  assert.strictEqual(k.lines[1].instrumental, false);
});

test('words before the first chord on a line share the previous chord\'s time', () => {
  const { k } = song('[C]one two\nfor I come from Ala[G]bama');
  const c = k.lines[0].pieces[0];
  const pickup = k.lines[1].pieces[0];
  assert.strictEqual(pickup.chord, null);
  assert.strictEqual(pickup.text, 'for I come from Ala');
  assert.ok(close(c.start, 0) && close(pickup.end, 4) && c.end < pickup.start + 1e-9);
  assert.ok(close(k.lines[1].pieces[1].start, 4));
});

test('headings and inline labels', () => {
  const { k } = song('[[Verse 1]]\n[C]la\n[[Intro:]] [Am] [F]');
  assert.deepStrictEqual(k.lines.map((l) => l.kind), ['heading', 'words', 'words']);
  assert.strictEqual(k.lines[0].label, 'Verse 1');
  assert.strictEqual(k.lines[2].label, 'Intro:');
  assert.deepStrictEqual(k.lines[2].pieces.map((p) => p.chord), ['Am', 'F']);
});

test('count-in shifts everything; startLine leaves earlier lines untimed', () => {
  const ir = parse('[C]one\n[G]two', { useDelimiters: false });
  const schedule = buildSchedule(ir, { library: soprano, tempo: 60, countIn: true, startLine: 2 });
  const k = buildKaraoke(ir, schedule, { startLine: 2 });
  assert.strictEqual(k.lines[0].start, null);
  assert.ok(close(k.lines[1].start, 4)); // after one bar of count-in
});

test('pieceProgress', () => {
  const p = { start: 2, end: 4 };
  assert.strictEqual(pieceProgress(p, 1), 0);
  assert.strictEqual(pieceProgress(p, 3), 0.5);
  assert.strictEqual(pieceProgress(p, 5), 1);
  assert.strictEqual(pieceProgress({ start: null, end: null }, 3), 0);
});

test('tab blocks get their own line and their bars, keeping later lines in step', () => {
  const { k } = song(['[C]one', '```tab', 'A|--0--1--3--5--|', 'E|---------------|', 'C|---------------|', 'G|---------------|', '```', '[G]two'].join('\n'));
  assert.deepStrictEqual(k.lines.map((l) => l.kind), ['words', 'tab', 'words']);
  assert.ok(close(k.lines[1].start, 4) && close(k.lines[1].end, 8));
  assert.ok(close(k.lines[2].start, 8));
  assert.ok(k.lines[1].text.startsWith('A|'));
});


test('tab notes have times matching playback and their place in the text', () => {
  const text = ['[C]one', '```tab', 'A|--0--1--3--5--|', 'E|---------------|', 'C|---------------|', 'G|---------------|', '```'].join('\n');
  const { k } = song(text);
  const tabLine = k.lines[1];
  assert.deepStrictEqual(tabLine.steps.map((s) => s.time), [4, 4.5, 5, 5.5]);   // tempo 60: bar 2, half a beat apart
  assert.deepStrictEqual(tabLine.steps.map((s) => s.pitches[0]), ['A4', 'A♯4', 'C5', 'D5']);
  assert.deepStrictEqual(tabLine.steps[1].marks, [{ row: 0, col: 7, len: 1 }]);
  assert.strictEqual(tabLine.text.split('\n')[0].slice(7, 8), '1');
});


console.log('All karaoke tests passed.');
