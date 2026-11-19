// 4.99: the shapes you know on another instrument: ukulele shapes on a baritone, baritone shapes on a ukulele
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const { buildSchedule } = require('../src/playback-schedule');
const { loadChordLibrary, getChordDefinition } = require('../src/chord-library');
const I = require('../src/instruments');
const F = require('../src/feature-levels.js');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');
const strumNotes = (sch) => sch.events.filter((e) => e.kind === 'strum' && !e.tune).map((e) => e.notes.filter((n) => typeof n === 'number').sort((a, b) => a - b));

test('two more instruments, after the four you choose first', () => {
  assert.deepStrictEqual(I.MAIN_INSTRUMENT_IDS, ['soprano', 'lowg', 'baritone', 'guitar']);
  const a = I.instrument('ukeonbaritone');
  assert.strictEqual(a.library, 'chords.json');
  assert.strictEqual(a.sameShapesAs, 'soprano');
  assert.strictEqual(a.soundShift, -5);
  // a low-G ukulele a fourth down is a baritone, string for string
  assert.deepStrictEqual(a.strings.map((m) => m + a.soundShift), I.instrument('baritone').strings);
  const b = I.instrument('baritoneonuke');
  assert.strictEqual(b.library, 'chords-baritone.json');
  assert.strictEqual(b.sameShapesAs, 'baritone');
  assert.deepStrictEqual(b.strings.map((m) => m + b.soundShift), I.instrument('lowg').strings);
  assert.ok(I.sameShapes('ukeonbaritone', 'soprano') && I.sameShapes('baritoneonuke', 'baritone'));
});

test('ukulele shapes on a baritone: C D7 F C, shaped as on a ukulele, sounds as on a baritone (G A7 C G)', () => {
  const ir = parse('{D}\n[C]one [D7]two [F]three [C]four');
  const soprano = loadChordLibrary(null, 'soprano');
  const baritone = loadChordLibrary(null, 'baritone');
  const asShapes = strumNotes(buildSchedule(ir, { library: soprano, instrument: 'ukeonbaritone', tempo: 60, countIn: false }));
  // the same frets as the ukulele's, on a baritone's strings
  const onBaritone = ['C', 'D7', 'F', 'C'].map((c) => getChordDefinition(soprano, c).frets.map((f, s) => I.instrument('baritone').strings[s] + f).sort((x, y) => x - y));
  assert.deepStrictEqual(asShapes, onBaritone);
  // and those are a baritone's G, A7 (no A), C/E, G
  assert.deepStrictEqual(asShapes[2], [52, 55, 60, 64]);   // F shape 2010: E3 G3 C4 E4
  assert.ok(baritone);
});

test('baritone shapes on a ukulele sound a fourth higher; the tune moves with them', () => {
  const ir = parse('{D}\n[G]one');
  const lib = loadChordLibrary(null, 'baritone');
  const plain = strumNotes(buildSchedule(ir, { library: lib, instrument: 'baritone', tempo: 60, countIn: false }));
  const moved = strumNotes(buildSchedule(ir, { library: lib, instrument: 'baritoneonuke', tempo: 60, countIn: false }));
  assert.deepStrictEqual(moved, plain.map((notes) => notes.map((n) => n + 5)));
  const first = buildSchedule(ir, { library: lib, instrument: 'baritoneonuke', tempo: 60, countIn: true, firstNote: 60 });
  assert.strictEqual(first.events.find((e) => e.cue).notes[0], 65, 'the note to sing from moves too');
});

test('in all features only; the sound, the status line and Free Practice', () => {
  const row = F.FEATURES.find((f) => f.id === 'shapesAcross');
  assert.ok(row && row.level === 'all' && row.app === 'both');
  assert.ok(DESKTOP.includes('<option value="ukeonbaritone" data-feature="shapesAcross"'));
  assert.ok(DESKTOP.includes('<option value="baritoneonuke" data-feature="shapesAcross"'));
  assert.ok(!/name="firstInstrument" value="ukeonbaritone"/.test(DESKTOP), 'not asked first');
  assert.ok(DESKTOP.includes("const like = globalThis.ukemusic?.instrument?.(instrument)?.soundsLike || instrument;"));
  assert.ok(DESKTOP.includes('if (sounds) bits.splice(1, 0, `sounds in ${sounds.name}`);'));
  assert.ok(DESKTOP.includes("window.ukemusic.instruments.filter((i) => !i.shapesFrom).map((i) => new Option(i.label, i.id))"));
  assert.ok(WEB.includes("i.shapesFrom ? ' data-feature=\"shapesAcross\"' : ''"));
  assert.ok(WEB.includes('UMW.INSTRUMENTS.filter((i) => !i.shapesFrom).map((i) => {'));
  assert.ok(WEB.includes('.soundsLike || instrument; return like === \'guitar\' || like === \'baritone\' ? \'guitar\' : \'sampled\';'));
});
