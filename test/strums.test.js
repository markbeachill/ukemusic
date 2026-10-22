const assert = require('assert');
const { STRUMS, strum, strumsFor, strokeCount, arrows } = require('../src/strums');
const { parsePattern, defaultPattern, buildSchedule } = require('../src/playback-schedule');
const parse = require('../src/parser');
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

test('every pattern fits its bar and reads back unchanged', () => {
  for (const s of STRUMS) {
    const n = strokeCount(s.pattern);
    assert.ok(n % s.beats === 0 || s.beats % n === 0, `${s.id}: ${n} strokes in ${s.beats} beats`);
    assert.strictEqual(parsePattern(s.pattern), s.pattern, s.id);
    assert.ok(s.name && s.description && s.uses && s.style, s.id);
  }
});

test('ukulele defaults come first: Simple then Island', () => {
  assert.deepStrictEqual(STRUMS.slice(0, 2).map((s) => s.id), ['simple', 'island']);
  assert.strictEqual(defaultPattern(4, 'simple'), 'D>DDD');
  assert.strictEqual(defaultPattern(4, 'island'), 'D-DU-UDU');
});

test('a library strum can be the default; one for another time signature falls back to Simple', () => {
  assert.strictEqual(defaultPattern(4, 'chuck'), 'D-X-D-X-');
  assert.strictEqual(defaultPattern(3, 'chuck'), 'D>DD');
  assert.strictEqual(defaultPattern(3, 'waltz'), 'D-DUDU');
});

test('strums by time signature', () => {
  assert.ok(strumsFor(3).every((s) => s.beats === 3));
  assert.deepStrictEqual(strumsFor(3).map((s) => s.id), ['waltz-simple', 'waltz']);
  assert.strictEqual(strum('nope'), undefined);
});

test('arrows for display', () => {
  assert.strictEqual(arrows('D-XU'), '↓·✕↑');
});

test('swing (12 strokes) plays as triplets without a warning', () => {
  const s = buildSchedule(parse('{D-UD-UD-UD-U}\n[C]a', { useDelimiters: false, rhythmEnabled: true }),
    { library: loadChordLibrary(null, 'soprano'), tempo: 60, countIn: false });
  assert.deepStrictEqual(s.warnings, []);
  assert.strictEqual(s.events.length, 8); // 4 downs + 4 ups
});

test('styles: country, rock, blues and funk are all there', () => {
  const styles = new Set(STRUMS.map((s) => s.style));
  for (const style of ['Country', 'Rock', 'Blues / jazz', 'Funk', 'Reggae / ska']) assert.ok(styles.has(style), style);
  assert.strictEqual(strokeCount(strum('funk').pattern), 16);
  assert.strictEqual(strokeCount(strum('slow-blues').pattern), 12);
});


console.log('All strum library tests passed.');
