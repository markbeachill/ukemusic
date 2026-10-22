const assert = require('assert');
const box = require('../src/strum-box');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');
const { buildSchedule } = require('../src/playback-schedule');
const { buildKaraoke } = require('../src/karaoke');
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

test('time signature in a pattern', () => {
  assert.deepStrictEqual(box.strumTime('3/4 D-DUDU'), { beats: 3, label: '3/4' });
  assert.deepStrictEqual(box.strumTime('6/8 D>DDD>DD'), { beats: 6, label: '6/8' });
  assert.strictEqual(box.strumTime('D-DU-UDU'), null);
  assert.strictEqual(box.timeLabel(6), '6/8');
  assert.strictEqual(box.timeLabel(3), '3/4');
});

test('strokes, accents and rests', () => {
  assert.deepStrictEqual(box.strumSteps('3/4 D>-DU').map((s) => s.stroke + (s.accent ? '>' : '')), ['D>', '-', 'D', 'U']);
  assert.deepStrictEqual(box.strumSteps('↓ ↑ ✕').map((s) => s.stroke), ['D', 'U', 'X']);
});

test('the count under the strokes', () => {
  assert.deepStrictEqual(box.strumCounts(8, 4).map((c) => c.text).join(' '), '1 & 2 & 3 & 4 &');
  assert.deepStrictEqual(box.strumCounts(4, 4).map((c) => c.text).join(' '), '1 2 3 4');
  assert.deepStrictEqual(box.strumCounts(12, 4).map((c) => c.text).join(' '), '1 & a 2 & a 3 & a 4 & a');
  assert.deepStrictEqual(box.strumCounts(16, 4).slice(0, 4).map((c) => c.text).join(' '), '1 e & a');
  assert.deepStrictEqual(box.strumCounts(2, 4).map((c) => c.text).join(' '), '1 3');
  assert.strictEqual(box.strumCounts(9, 4), null);
});

test('library names', () => {
  assert.strictEqual(box.strumName(box.strumSteps('D-DU-UDU'), 4), 'Island (calypso)');
  assert.strictEqual(box.strumName(box.strumSteps('D-DUDU'), 3), 'Waltz');
  assert.strictEqual(box.strumName(box.strumSteps('DUDUDUUU'), 4), '');
});

test('styles render the right pieces', () => {
  const comic = box.renderStrum('D>-DU-UDU', { style: 'comic', beats: 4, tempo: 112, first: true });
  assert.match(comic, /strum-box style-comic/);
  assert.match(comic, /<span class="sb-time">4\/4<\/span><span class="sb-sub">112 bpm<\/span>/);
  assert.match(comic, /sb-a acc">↓/);
  assert.match(comic, /sb-n beat">4/);
  const change = box.renderStrum('3/4 D-DUDU', { style: 'clean', beats: 3, timeLabel: '3/4', timeChanged: true });
  assert.match(change, /time-change/);
  assert.match(change, /new time/);
  assert.match(change, /Waltz/);
  assert.match(box.renderStrum('D-DU', { style: 'compact', beats: 2 }), /sb-letters">D-DU</);
  assert.strictEqual(box.renderStrum('D-du', { style: 'plain', notation: 'arrows' }), '<div class="rhythm">↓-↓↑</div>');
  assert.match(box.strumCss(), /@media print/);
});

test('sheet: time carries on and changes are marked', () => {
  const ir = parse('{D-DU-UDU}\n[C]one\n{3/4 D-DUDU}\n[F]two\n{D-DUDU}\n[G]three', { useDelimiters: false });
  const html = renderHtml(ir, { strumStyle: 'comic', beatsPerBar: 4, tempo: 100 });
  const times = [...html.matchAll(/class="sb-time">([^<]+)</g)].map((m) => m[1]);
  assert.deepStrictEqual(times, ['4/4', '3/4', '3/4']);
  assert.strictEqual((html.match(/time-change/g) || []).length, 1);
  assert.strictEqual((html.match(/100 bpm/g) || []).length, 1, 'tempo only in the first box');
  const plain = renderHtml(ir, { strumStyle: 'plain' });
  assert.match(plain, /<div class="rhythm">3\/4&nbsp;D-DUDU<\/div>/);
});

test('playback and karaoke follow a time change', () => {
  const library = loadChordLibrary('soprano');
  const ir = parse('{D-DU-UDU}\n[C]one\n{3/4 D-DUDU}\n[F]two [G]three', { useDelimiters: false });
  const s = buildSchedule(ir, { library, tempo: 60, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => [b.chord, b.time, b.duration]), [['C', 0, 4], ['F', 4, 3], ['G', 7, 3]]);
  assert.deepStrictEqual(s.warnings, []);
  const strokes = s.events.filter((e) => e.barIndex === 1).length;
  assert.strictEqual(strokes, 5, 'D-DUDU: five strokes in the 3/4 bar');
  const k = buildKaraoke(ir, s);
  const line = k.lines.find((l) => l.line === 4);
  assert.ok(Math.abs(line.pieces[1].start - 7) < 1e-6);
});

console.log('All strum box tests passed.');
