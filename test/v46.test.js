// 4.6: chords shorter than a bar ([Em:2]), no chord ([N.C.]), every chord starts the strum afresh
const assert = require('assert');
const parse = require('../src/parser');
const syntax = require('../src/song-syntax');
const { buildSchedule, songSlots } = require('../src/playback-schedule');
const { buildKaraoke } = require('../src/karaoke');
const renderHtml = require('../src/renderer-html');
const { transposeIR } = require('../src/transpose');
const { rewriteText } = require('../src/rekey');
const { songChords } = require('../src/versions');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
const plan = (text, opts = {}) => buildSchedule(parse(text), { tempo: 60, countIn: false, ...opts });
const lengths = (s) => s.bars.map((b) => `${b.chord}:${b.duration}`).join(' ');

test('[Em:2] is read as 2 beats; [N.C.] and [NC] as no chord', () => {
  assert.deepStrictEqual(syntax.parseChordToken('Em:2'), { name: 'Em', bars: 1, beats: 2 });
  assert.deepStrictEqual(syntax.parseChordToken('NC'), { name: 'N.C.', bars: 1, noChord: true });
  assert.deepStrictEqual(syntax.parseChordToken('N.C.:2'), { name: 'N.C.', bars: 1, noChord: true, beats: 2 });
  assert.strictEqual(syntax.parseChordToken('C:2 x3'), null);
  assert.strictEqual(syntax.parseChordToken('C:0'), null);
  assert.ok(!parse('[Em:2]a [N.C.]b [NC:2]').some((n) => n.warnings.length));
});
test('a short chord lasts its beats; a plain chord after it fills the bar', () => {
  assert.strictEqual(lengths(plan('[C]a [Em:2]stay a[Am]way so [D]long')), 'C:4 Em:2 Am:2 D:4');
  assert.strictEqual(lengths(plan('[C:3]a [G]b [F]c')), 'C:3 G:1 F:4');
  assert.strictEqual(lengths(plan('{3/4 D-DUDU}\n[C:1]a [G]b')), 'C:1 G:2');
});
test('a chord longer than the bar is split at the bar line', () => {
  assert.strictEqual(lengths(plan('[C:6]a [G]b')), 'C:4 C:2 G:2');
});
test('every chord starts the strum afresh: Island on 2 beats is D-DU', () => {
  const s = plan('{D-DU-UDU}\n[C:2]a [G:2]b');
  const strokes = (from, to) => s.events.filter((e) => e.time >= from && e.time < to).map((e) => `${e.time - from}${e.direction[0]}`).join(' ');
  assert.strictEqual(strokes(0, 2), '0d 1d 1.5u');
  assert.strictEqual(strokes(2, 4), '0d 1d 1.5u');
});
test('[N.C.] stops the strings and plays nothing', () => {
  const s = plan('{DUDU}\n[C]a [N.C.:2]b [G:2]c');
  assert.strictEqual(lengths(s), 'C:4 N.C.:2 G:2');
  assert.ok(s.bars[1].rest);
  const inRest = s.events.filter((e) => e.time >= 4 && e.time < 6);
  assert.deepStrictEqual(inRest.map((e) => e.kind), ['mute']);
});
test('N.C. is not a chord for keys, diagrams or key changes', () => {
  const ir = parse('[C]a [N.C.]b [G]c');
  assert.deepStrictEqual(songChords(ir), ['C', 'G']);
  assert.strictEqual(transposeIR(ir, 2).find((n) => n.noChord).content, 'N.C.');
  assert.ok(!renderHtml(ir, { diagrams: { placement: 'song_start' } }).includes('data-chord="N.C."'));
  assert.strictEqual(rewriteText('[C:2]a [N.C.]b [NC:2]', 2), '[D:2]a [N.C.]b [NC:2]');
  assert.strictEqual(rewriteText('| C:3 G | N.C. |', 2), '| D:3 A | N.C. |');
});
test('shown as typed: Em:2, N.C.', () => {
  const html = renderHtml(parse('[Em:2]stay a[Am]way [N.C.]'));
  assert.ok(html.includes('>Em:2<') && html.includes('>N.C.<'));
});
test('bar lines: beats and N.C.', () => {
  assert.strictEqual(lengths(plan('| C:3 G | N.C. | Am F |')), 'C:3 G:1 N.C.:4 Am:2 F:2');
  assert.strictEqual(lengths(plan('| C:1 G Am | % |')), 'C:1 G:1.5 Am:1.5 C:1 G:1.5 Am:1.5');
});
test('karaoke matches playback bar for bar', () => {
  for (const text of ['[C:6]a [G]b [] c', '[C]tell me [Em:2]stay [Am]way [N.C.:2] [D]long (x2)', '| C:3 G | % | N.C. |']) {
    const ir = parse(text);
    const s = buildSchedule(ir, { tempo: 60, countIn: false });
    const k = buildKaraoke(ir, s);
    const pieces = k.lines.flatMap((l) => l.pieces || []).filter((p) => p.chord);
    assert.ok(pieces.every((p) => p.start !== null), text);
    assert.strictEqual(Math.max(...pieces.map((p) => p.end)), s.duration, text);
  }
  assert.strictEqual(songSlots(parse('[C:6]a')).slots.length, 2);
});

console.log('All 4.6 tests passed.');
