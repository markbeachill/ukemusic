// 4.18: swing (Play → Feel, {swing …}) and 6/8 tempo per dotted quarter
const assert = require('assert');
const parse = require('../src/parser');
const { buildSchedule, isCompound } = require('../src/playback-schedule');
const { renderHtml } = require('../src/renderer-html');
const { takeFeel, feelFor } = require('../src/song-syntax');
const { addClicks } = require('../src/training');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const near = (a, b) => Math.abs(a - b) < 1e-6;
const strums = (s) => s.events.filter((e) => e.kind === 'strum').map((e) => e.time);
const play = (song, opts) => buildSchedule(parse(song), { countIn: false, tempo: 100, beatsPerBar: 4, ...opts });

test('the feel word in a pattern', () => {
  assert.deepStrictEqual(takeFeel('swing D-DU-UDU'), { feel: 'swing', text: 'D-DU-UDU' });
  assert.deepStrictEqual(takeFeel('3/4 light swing D-DUDU'), { feel: 'light', text: '3/4 D-DUDU' });
  assert.deepStrictEqual(takeFeel('Shuffle DUDU'), { feel: 'shuffle', text: 'DUDU' });
  assert.deepStrictEqual(takeFeel('D-DU-UDU'), { feel: null, text: 'D-DU-UDU' });
  assert.strictEqual(feelFor('D>-DU-UDU', null, 'auto'), 'light');
  assert.strictEqual(feelFor('DDDD', null, 'auto'), 'straight');
  assert.strictEqual(feelFor('DDDD', 'swing', 'straight'), 'swing');
  const nodes = parse('{swing}\n{A: shuffle D-DU-UDU}\n{A}').filter((n) => n.type === 'rhythm');
  assert.ok(nodes[0].feelOnly && !nodes[0].unknownStrum && !(nodes[0].warnings || []).length);
  assert.ok(nodes[2].recall && nodes[2].feel === 'shuffle' && nodes[2].content === 'D-DU-UDU');
});
test('straight: eighths evenly spaced; the bpm and bar length never change with the feel', () => {
  const straight = play('{D-DU-UDU}\n[C]x', { swing: 'straight' });
  assert.deepStrictEqual(strums(straight).map((t) => +t.toFixed(3)), [0, 0.6, 0.9, 1.5, 1.8, 2.1]);
  for (const swing of ['straight', 'light', 'swing', 'shuffle', 'auto']) {
    const s = play('{D-DU-UDU}\n[C]x [G]y', { swing });
    assert.ok(near(s.bars[0].duration, 2.4) && near(s.bars[1].time, 2.4) && near(s.duration, 4.8), swing);
  }
});
test('swung: beats stay put, each "&" comes late by the feel\'s share', () => {
  const at = (swing) => strums(play('{D-DU-UDU}\n[C]x', { swing })).map((t) => +t.toFixed(3));
  assert.deepStrictEqual(at('light'), [0, 0.6, 0.948, 1.5 + 0.048, 1.8, 2.148]);
  assert.deepStrictEqual(at('swing'), [0, 0.6, 0.972, 1.572, 1.8, 2.172]);
  assert.deepStrictEqual(at('shuffle'), [0, 0.6, 1, 1.6, 1.8, 2.2]);
  assert.deepStrictEqual(at('auto'), at('light'));
  // missing option (other callers): straight, as before
  assert.deepStrictEqual(strums(play('{D-DU-UDU}\n[C]x', {})).map((t) => +t.toFixed(3)), [0, 0.6, 0.9, 1.5, 1.8, 2.1]);
});
test('what swings: pairs of eighths or sixteenths in simple time; not quarters, triplets or 6/8', () => {
  assert.deepStrictEqual(strums(play('{DDDD}\n[C]x', { swing: 'swing' })).map((t) => +t.toFixed(3)), [0, 0.6, 1.2, 1.8]);
  const sixteenths = strums(play('{DUDUDUDUDUDUDUDU}\n[C]x', { swing: 'shuffle' }));
  assert.ok(near(sixteenths[1], 0.2) && near(sixteenths[2], 0.3));
  const triplets = strums(play('{DUDDUDDUDDUD}\n[C]x', { swing: 'shuffle' }));
  assert.ok(near(triplets[1], 0.2));
  const sixEight = strums(play('{6/8 DUDUDU}\n[C]x', { swing: 'shuffle', tempo: 60 }));
  assert.deepStrictEqual(sixEight.map((t) => +t.toFixed(3)), [0, 0.333, 0.667, 1, 1.333, 1.667]);
});
test('{swing …} and {straight …} in the song win over the setting, from there on', () => {
  const s = play('{swing D-DU-UDU}\n[C]x\n{straight D-DU-UDU}\n[G]y', { swing: 'auto' });
  assert.strictEqual(s.bars[0].feel, 'swing');
  assert.strictEqual(s.bars[1].feel, undefined);
  const t = play('{swing}\n{DUDUDUDU}\n[C]x', { swing: 'straight' });
  assert.strictEqual(t.bars[0].feel, 'swing');
});
test('6/8: the tempo is per dotted quarter, two a bar; count-in loud on 1 and 4', () => {
  assert.ok(isCompound(6) && isCompound(12, '12/8') && !isCompound(6, '6/4') && !isCompound(3));
  const s = buildSchedule(parse('{D-DU-U}\n[C]x [G]y'), { tempo: 60, beatsPerBar: 6, countIn: true });
  const clicks = s.events.filter((e) => e.kind === 'click');
  assert.deepStrictEqual(clicks.map((c) => +c.time.toFixed(3)), [0, 0.333, 0.667, 1, 1.333, 1.667]);
  assert.deepStrictEqual(clicks.map((c) => c.level || 1), [1, 0.35, 0.35, 1, 0.35, 0.35]);
  assert.ok(near(s.countInDuration, 2) && near(s.bars[0].duration, 2) && near(s.bars[1].time, 4));
  const inline = buildSchedule(parse('{6/8 D--D--}\n[C]x'), { tempo: 90, beatsPerBar: 4, countIn: false });
  assert.ok(near(inline.bars[0].duration, 4 / 3));
  // 3/4 and 4/4 unchanged
  assert.ok(near(buildSchedule(parse('{DDD}\n[C]x'), { tempo: 90, beatsPerBar: 3, countIn: false }).bars[0].duration, 2));
  // practice metronome: a click per dotted quarter
  const withClicks = addClicks({ ...inline, countInDuration: 0 }).filter((e) => e.kind === 'click');
  assert.strictEqual(withClicks.length, 2);
});
test('4.21: the sheet doesn\'t name the feel (it\'s for playback)', () => {
  const plain = renderHtml(parse('{D-DU-UDU}\n[C]x'), { strumStyle: 'comic', swing: 'shuffle' });
  assert.ok(!/swing|shuffle/.test(plain));
  assert.ok(!renderHtml(parse('{swing}\n[C]x'), { strumStyle: 'plain' }).includes('Feel'));
});
test('with showFeel, the sheet says how it\'s played', () => {
  const box = (song, o) => renderHtml(parse(song), { strumStyle: 'comic', tempo: 96, showFeel: true, ...o });
  assert.ok(box('{D-DU-UDU}\n[C]x', { swing: 'auto' }).includes('Island (calypso) · light swing'));
  assert.ok(!box('{D-DU-UDU}\n[C]x', { swing: 'straight' }).includes('swing'));
  assert.ok(!box('{DDDD}\n[C]x', { swing: 'shuffle' }).includes('shuffle'));
  assert.ok(box('{6/8 D-DU-U}\n[C]x', {}).includes('♩. = 96'));
  assert.ok(box('{D-DU-UDU}\n[C]x', { swing: 'auto', strumStyle: 'plain' }).includes('(light swing)'));
  assert.ok(box('{swing}\n[C]x', { strumStyle: 'plain' }).includes('Feel: swing from here'));
});
