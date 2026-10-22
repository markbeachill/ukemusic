const assert = require('assert');
const parse = require('../src/parser');
const { buildSchedule, parsePattern, voiceChord, defaultPattern } = require('../src/playback-schedule');
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

const soprano = loadChordLibrary(null, 'soprano');
const baritone = loadChordLibrary(null, 'baritone');
const close = (a, b) => Math.abs(a - b) < 1e-9;

test('patterns: letters, arrows, chucks, rests; spaced DDUUDU becomes D-DU-UDU', () => {
  assert.strictEqual(parsePattern('D-DU-UDU'), 'D-DU-UDU');
  assert.strictEqual(parsePattern('↓ ↓ ↑ ↑ ↓ ↑'), 'D-DU-UDU');
  assert.strictEqual(parsePattern('d x d x'), 'DXDX');
  assert.strictEqual(parsePattern('↓-↓↑-↑↓✕'), 'D-DU-UDX');
});

test('voicings use the diagram fingering in the right tuning', () => {
  assert.deepStrictEqual(voiceChord('C', soprano, 'soprano'), [67, 60, 64, 72]); // G4 C4 E4 C5
  assert.deepStrictEqual(voiceChord('C', baritone, 'baritone'), [52, 55, 60, 64]); // E3 G3 C4 E4
});

test('chords without a diagram still get a sensible voicing', () => {
  const notes = voiceChord('Fmaj7', soprano, 'soprano');
  const classes = new Set(notes.map((n) => n % 12));
  assert.deepStrictEqual([...classes].sort((a, b) => a - b), [0, 4, 5, 9]); // C E F A
});

test('one chord = one bar; [] adds a bar of the same chord', () => {
  const s = buildSchedule(parse('[C]Some[G]where []over'), { library: soprano, tempo: 120, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => b.chord), ['C', 'G', 'G']);
  assert.ok(close(s.bars[1].time, 2) && close(s.duration, 6)); // 4 beats at 120 bpm = 2 s per bar
});

test('pattern D-DU-UDU gives 6 strums per bar on eighth notes, accent on beat 1', () => {
  const s = buildSchedule(parse('{D-DU-UDU}\n[C]x'), { library: soprano, tempo: 120, countIn: false });
  const strums = s.events.filter((e) => e.kind === 'strum');
  assert.deepStrictEqual(strums.map((e) => e.direction), ['down', 'down', 'up', 'up', 'down', 'up']);
  assert.deepStrictEqual(strums.map((e) => +e.time.toFixed(2)), [0, 0.5, 0.75, 1.25, 1.5, 1.75]);
  assert.strictEqual(strums[0].velocity, 1);
});

test('pattern changes apply to following bars; chucks are separate events', () => {
  const s = buildSchedule(parse('{D D D D}\n[C]a\n{DXDX}\n[G]b'), { library: soprano, tempo: 60, countIn: false });
  const bar2 = s.events.filter((e) => e.barIndex === 1).map((e) => e.kind);
  assert.deepStrictEqual(bar2, ['strum', 'chuck', 'strum', 'chuck']);
});

test('count-in adds one bar of clicks before the music', () => {
  const s = buildSchedule(parse('[C]a'), { library: soprano, tempo: 60, countIn: true });
  assert.strictEqual(s.events.filter((e) => e.kind === 'click').length, 4);
  assert.ok(close(s.bars[0].time, 4));
});

test('3/4 time: bars are three beats', () => {
  const s = buildSchedule(parse('[C]a [G]b'), { library: soprano, tempo: 60, beatsPerBar: 3, countIn: false });
  assert.ok(close(s.bars[1].time, 3));
});

test('startLine skips earlier bars; bars carry their source line', () => {
  const s = buildSchedule(parse('[C]one\n[G]two\n[Am]three'), { library: soprano, countIn: false, startLine: 2 });
  assert.deepStrictEqual(s.bars.map((b) => [b.chord, b.line]), [['G', 2], ['Am', 3]]);
});

test('a song with no chords gives an empty schedule', () => {
  const s = buildSchedule(parse('just words'), { library: soprano });
  assert.strictEqual(s.bars.length, 0);
  assert.strictEqual(s.events.length, 0);
});

test('warns when a strum pattern does not fit the bar', () => {
  const odd = buildSchedule(parse('{D-DU-UD-U}\n[C]a'), { library: soprano, beatsPerBar: 4 });
  assert.strictEqual(odd.warnings.length, 1);
  assert.ok(/9 steps/.test(odd.warnings[0]));
  assert.strictEqual(buildSchedule(parse('{D-DU-UDU}\n[C]a'), { library: soprano }).warnings.length, 0);
  assert.strictEqual(buildSchedule(parse('{D-DUDU}\n[C]a'), { library: soprano, beatsPerBar: 3 }).warnings.length, 0);
});

test('default strum: simple = one heavy down-strum then three lighter ones', () => {
  const s = buildSchedule(parse('[C]a'), { library: soprano, countIn: false });
  const strums = s.events.filter((e) => e.kind === 'strum');
  assert.strictEqual(strums.length, 4);
  assert.ok(strums.every((e) => e.direction === 'down'));
  assert.strictEqual(strums[0].velocity, 1);
  assert.ok(strums.slice(1).every((e) => e.velocity < 0.6), strums.map((e) => e.velocity).join(','));
  assert.strictEqual(defaultPattern(3), 'D>DD');
});

test('default strum: island and custom', () => {
  const island = buildSchedule(parse('[C]a'), { library: soprano, countIn: false, defaultStrum: 'island' });
  assert.strictEqual(island.events.filter((e) => e.kind === 'strum').length, 6); // D-DU-UDU
  const custom = buildSchedule(parse('[C]a'), { library: soprano, countIn: false, defaultStrum: 'custom', customStrum: 'D>U D U' });
  assert.deepStrictEqual(custom.events.map((e) => e.direction), ['down', 'up', 'down', 'up']);
  assert.strictEqual(defaultPattern(4, 'custom', '???'), 'D>DDD'); // nothing usable: falls back to simple
  // A {pattern} in the song always wins over the default
  const own = buildSchedule(parse('{DUDU}\n[C]a'), { library: soprano, countIn: false, defaultStrum: 'island' });
  assert.strictEqual(own.events.length, 4);
});

test('">" accents a stroke; the others are played lighter', () => {
  assert.strictEqual(parsePattern('D>-DU-U>DU'), 'D>-DU-U>DU');
  assert.strictEqual(parsePattern('>D->>U'), 'D-U');
  const s = buildSchedule(parse('{D-DU-U>DU}\n[C]a'), { library: soprano, countIn: false });
  const strums = s.events.filter((e) => e.kind === 'strum');
  const accented = strums.filter((e) => e.accent);
  assert.strictEqual(accented.length, 1);
  assert.strictEqual(accented[0].velocity, 1);
  assert.ok(strums.filter((e) => !e.accent).every((e) => e.velocity <= 0.51));
  assert.strictEqual(s.warnings.length, 0); // ">" is not a step
});

test('bars carry their strum pattern (for the karaoke strum strip)', () => {
  const s = buildSchedule(parse('{D-DU-UDU}\n[C]a\n{D>DDD}\n[G]b'), { library: soprano, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => b.pattern), ['D-DU-UDU', 'D>DDD']);
});

test('tab blocks play their notes and take whole bars', () => {
  const song = ['[C]a', '```tab', 'A|--0--1--3--5--|', 'E|---------------|', 'C|---------------|', 'G|---------------|', '```', '[G]b'].join('\n');
  const s = buildSchedule(parse(song, { useDelimiters: false }), { library: soprano, tempo: 60, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => b.chord), ['C', 'Tab', 'G']);
  const picked = s.events.filter((e) => e.tabNote);
  assert.deepStrictEqual(picked.map((e) => e.notes.filter((x) => x !== undefined)), [[69], [70], [72], [74]]);
  assert.strictEqual(picked[0].notes.length, 4);
  assert.strictEqual(picked[0].notes[3], 69, 'A string is the last in diagram order (G C E A)');
  assert.ok(close(picked[0].time, 4) && close(picked[1].time, 4.5), 'evenly spaced notes are half a beat apart');
  assert.ok(close(s.bars[2].time, 8), 'the next chord comes after the tab bar');
});


test('capo: the shapes are raised so the song sounds in its key', () => {
  const plain = buildSchedule(parse('[C]a'), { library: soprano, countIn: false });
  const capo3 = buildSchedule(parse('[C]a'), { library: soprano, countIn: false, capo: 3 });
  assert.deepStrictEqual(capo3.events[0].notes, plain.events[0].notes.map((n) => n + 3));
  assert.strictEqual(capo3.bars[0].chord, 'C', 'the bar still shows the shape you play');
});


console.log('All playback schedule tests passed.');
