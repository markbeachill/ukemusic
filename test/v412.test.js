// 4.12: the Practice section — catalogue, note exercises, progress
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const n = require('../src/note-exercises');
const c = require('../src/practice-catalog');
const p = require('../src/practice-progress');
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
const UKE = [67, 60, 64, 69];   // G C E A (re-entrant)

// ── Catalogue ──
test('catalogue: 7 categories, every exercise in one, ids unique', () => {
  assert.strictEqual(c.CATEGORIES.length, 7);
  const cats = new Set(c.CATEGORIES.map((x) => x.id));
  const ids = new Set();
  for (const e of c.EXERCISES) {
    assert.ok(cats.has(e.cat), e.id);
    assert.ok(['Beginner', 'Improver', 'Intermediate'].includes(e.level), e.id);
    assert.ok(e.title && e.aim, e.id);
    assert.ok(!ids.has(e.id), `duplicate ${e.id}`);
    ids.add(e.id);
  }
  assert.ok(c.EXERCISES.length >= 35);
});
test('catalogue: every preset control exists in the Practice window', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const e of c.EXERCISES) {
    for (const id of Object.keys(e.set || {})) assert.ok(html.includes(`id="${id}"`), `${e.id}: ${id}`);
  }
});
test('routines only use exercises that exist', () => {
  const ids = new Set(c.EXERCISES.map((e) => e.id));
  for (const r of c.DEFAULT_ROUTINES) for (const s of r.steps) assert.ok(ids.has(s.id), `${r.name}: ${s.id}`);
  assert.strictEqual(c.DEFAULT_ROUTINES[0].steps.reduce((a, s) => a + s.minutes, 0), 10);
});
test('progressions in any key', () => {
  assert.deepStrictEqual(c.progressionChords('pop', 'C'), ['C', 'G', 'Am', 'F']);
  assert.deepStrictEqual(c.progressionChords('pop', 'G'), ['G', 'D', 'Em', 'C']);
  assert.deepStrictEqual(c.progressionChords('twofive', 'C').slice(0, 3), ['Dm', 'G7', 'C']);
});
test('planText: a strum line wherever the pattern changes, bars of chords', () => {
  const text = c.planText([
    { chords: ['C'], pattern: 'D-DU-UDU' }, { chords: ['G'], pattern: 'D-DU-UDU' },
    { chords: ['Am'], pattern: 'DDDD' }, { chords: ['F', 'G'], pattern: 'DDDD' }
  ]);
  assert.strictEqual(text, '{D-DU-UDU}\n| C | G |\n{DDDD}\n| Am | F G |');
});
test('rhythm ladder with soft and loud pairs', () => {
  const plan = c.strumPlan({ steps: c.LADDER, chords: ['C'], barsEach: 2, rounds: 1, dynamics: true });
  assert.strictEqual(plan.bars, c.LADDER.length * 2);
  assert.deepStrictEqual(plan.levels.slice(0, 4), ['soft', 'soft', 'loud', 'loud']);
  const sched = { events: [{ kind: 'strum', barIndex: 0, velocity: 1 }, { kind: 'strum', barIndex: 2, velocity: 1 }, { kind: 'click', barIndex: 0 }] };
  const out = c.applyDynamics(sched, ['soft', 'soft', 'loud']);
  assert.ok(out[0].velocity < out[1].velocity);
});
test('metronome: accents, sub-clicks; tap tempo', () => {
  const m = c.metronomeSchedule({ tempo: 120, beats: 3, bars: 2, sub: 2 });
  assert.strictEqual(m.events.length, 12);
  assert.strictEqual(m.duration, 3);
  assert.strictEqual(m.events.filter((e) => e.accent).length, 2);
  assert.ok(m.events.filter((e) => e.sub).every((e) => e.level < 1));
  assert.strictEqual(c.tapTempo([0, 500]), null);
  assert.strictEqual(c.tapTempo([0, 500, 1000, 1500]), 120);
});
test('shape drill never repeats a chord straight away (even with a fixed random)', () => {
  const picks = c.drillChords(['C', 'G', 'Am'], 20, () => 0.1);
  assert.strictEqual(picks.length, 20);
  for (let i = 1; i < picks.length; i += 1) assert.notStrictEqual(picks[i], picks[i - 1]);
  assert.deepStrictEqual(c.drillChords(['C'], 3), ['C', 'C', 'C']);
});
test('noodling: safe notes, chord tones, the key note', () => {
  assert.deepStrictEqual(c.chordTones('C'), [0, 4, 7]);
  assert.deepStrictEqual(c.chordTones('Am7'), [9, 0, 4, 7]);
  const dots = c.safeNotes({ key: 'C', set: 'pent', tuning: UKE, frets: 7 });
  assert.ok(dots.every((d) => [0, 2, 4, 7, 9].includes(d.pc)));
  assert.ok(dots.some((d) => d.root && d.pc === 0));
  const four = new Set(c.safeNotes({ key: 'C', set: 'four', tuning: UKE, frets: 5 }).map((d) => d.pc));
  assert.strictEqual(four.size, 4);
  const phrase = c.qaPhrase({ key: 'C', set: 'pent', tuning: UKE, length: 4, rand: () => 0.5 });
  assert.strictEqual(phrase.length, 4);
  assert.strictEqual(phrase[0] % 12, 0);   // starts on the key note
});
test('save as a song: backing bars and an empty tab block', () => {
  const text = c.melodySongText({ chords: ['C', 'G', 'Am', 'F'], pattern: 'D-DU-UDU', names: ['G', 'C', 'E', 'A'] });
  assert.ok(/\| C \| G \| Am \| F \|/.test(text));
  assert.ok(/```tab\nA\|/.test(text));
});

// ── Notes engine ──
test('C major scale in open position: open strings, never the re-entrant G', () => {
  const notes = n.scaleNotes({ root: 'C', scale: 'major', tuning: UKE, rounds: 1, upAndBack: false });
  assert.deepStrictEqual(notes.map((x) => `${x.string}:${x.fret}`), ['1:0', '1:2', '2:0', '2:1', '2:3', '3:0', '3:2', '3:3']);
  assert.deepStrictEqual(notes.map((x) => x.finger), [0, 2, 0, 1, 3, 0, 2, 3]);
});
test('scales: up and back, sequences', () => {
  const up = n.scaleNotes({ root: 'C', scale: 'major', tuning: UKE, rounds: 1, upAndBack: true });
  assert.strictEqual(up.length, 15);
  assert.ok(up.slice(8).every((x) => x.back));
  const seq = n.sequence([1, 2, 3, 4, 5], 3);
  assert.deepStrictEqual(seq, [1, 2, 3, 2, 3, 4, 3, 4, 5]);
  for (const id of Object.keys(n.SCALES)) assert.ok(n.scaleNotes({ root: 'A', scale: id, tuning: UKE, rounds: 1 }).length >= 5, id);
});
test('picking: the chord is held, right-hand fingers p i m a', () => {
  const notes = n.pickingNotes({ chords: [{ name: 'C', frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3] }], patternId: 'gecea', rounds: 1 });
  assert.deepStrictEqual(notes.slice(0, 4).map((x) => `${x.string}${x.rh}`), ['0p', '2m', '1i', '3a']);
  assert.strictEqual(notes[3].fret, 3);
  assert.deepStrictEqual(notes[0].shape, [0, 0, 0, 3]);
  for (const pat of n.PICK_PATTERNS) assert.ok(n.pickingNotes({ chords: [{ name: 'C', frets: [0, 0, 0, 3] }], patternId: pat.id, rounds: 1 }).length > 0, pat.id);
});
test('single string and alternating fingers: open strings, i and m', () => {
  const single = n.singleStringNotes({ rounds: 1 });
  assert.ok(single.every((x) => x.fret === 0));
  assert.deepStrictEqual(single.slice(0, 4).map((x) => x.rh), ['i', 'm', 'i', 'm']);
  assert.ok(n.alternatingNotes({ rounds: 1 }).length > 0);
});
test('melodies: every tune fits the ukulele', () => {
  for (const m of n.MELODIES) {
    const notes = n.melodyNotes({ id: m.id, tuning: UKE, rounds: 1 });
    assert.ok(notes.length >= 8, m.id);
    assert.ok(notes.every((x) => x.fret >= 0 && x.fret <= 7), m.id);
  }
});
test('call and response: listen (hidden, heard), your turn (silent), answer (shown, heard)', () => {
  const notes = n.callResponseNotes({ root: 'C', tuning: UKE, phrases: 2, rand: () => 0.3 });
  const phases = notes.map((x) => `${x.phase}${x.hidden ? 'H' : ''}${x.audible ? 'A' : ''}`);
  assert.deepStrictEqual(phases.slice(0, 9), ['listenHA', 'listenHA', 'listenHA', 'youH', 'youH', 'youH', 'answerA', 'answerA', 'answerA']);
  assert.strictEqual(notes[0].phrase, notes[6].phrase);
  assert.deepStrictEqual(notes.slice(6, 9).map((x) => x.fret), notes.slice(0, 3).map((x) => x.fret));
});

// ── Finger work additions ──
test('string hopping skips a string each note', () => {
  const notes = f.spiderNotes({ rounds: 1, upAndBack: false, hop: true });
  assert.deepStrictEqual(notes.slice(0, 8).map((x) => `${x.string}:${x.fret}`), ['0:1', '2:2', '0:3', '2:4', '1:1', '3:2', '1:3', '3:4']);
});
test('stretching starts high and comes down a fret each round', () => {
  const notes = f.spiderNotes({ rounds: 3, upAndBack: false, moveDown: true, startFret: 5 });
  assert.deepStrictEqual([0, 1, 2].map((r) => notes.find((x) => x.round === r).fret), [5, 4, 3]);
});

// ── Progress ──
test('progress: time, tempo, clean (+5), scores, streak', () => {
  let d = p.emptyProgress();
  assert.strictEqual(d.routines.length, c.DEFAULT_ROUTINES.length);
  p.logSession(d, 'island', { date: '2026-10-14', seconds: 120, tempo: 80 });
  p.logSession(d, 'island', { date: '2026-10-15', seconds: 60, tempo: 85 });
  p.logSession(d, 'blues', { date: '2026-10-16', seconds: 30 });
  assert.strictEqual(d.exercises.island.seconds, 180);
  assert.strictEqual(d.exercises.island.last_tempo, 85);
  assert.strictEqual(p.logClean(d, 'island', { date: '2026-10-16', tempo: 90 }), 95);
  assert.strictEqual(d.exercises.island.best_tempo, 90);
  assert.strictEqual(p.streak(d, '2026-10-16'), 3);
  assert.strictEqual(p.streak(d, '2026-10-17'), 3);   // not yet today: counts to yesterday
  assert.strictEqual(p.streak(d, '2026-10-18'), 0);
  assert.strictEqual(p.todaySeconds(d, '2026-10-16'), 30);
  for (let k = 0; k < 35; k += 1) p.logScore(d, 'one-minute', { date: '2026-10-16', count: k, label: 'C>F' });
  p.logScore(d, 'one-minute', { date: '2026-10-16', count: 50, label: 'G>Bb' });
  assert.strictEqual(d.exercises['one-minute'].scores.length, 30);
  assert.strictEqual(p.bestScore(d, 'one-minute', 'C>F'), 34);
  assert.strictEqual(p.bestScore(d, 'one-minute', null), 50);
  assert.strictEqual(p.bestScore(d, 'nothing', null), null);
  assert.strictEqual(p.formatMinutes(20), 'under 1 min');
  assert.strictEqual(p.formatMinutes(0), '0 min');
  assert.strictEqual(p.formatMinutes(3900), '1 h 5 min');
  d = null;
});
test('progress file: practice.json in the songs folder, read back, bad file → fresh', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke-practice-'));
  const d = p.emptyProgress();
  p.logSession(d, 'island', { date: '2026-10-16', seconds: 100, tempo: 80 });
  assert.strictEqual(p.writeProgress(dir, d), true);
  assert.strictEqual(p.readProgress(dir).exercises.island.seconds, 100);
  fs.writeFileSync(path.join(dir, p.FILE), '{ not json');
  assert.deepStrictEqual(p.readProgress(dir).exercises, {});
  assert.strictEqual(p.readProgress('').routines.length, c.DEFAULT_ROUTINES.length);
  fs.rmSync(dir, { recursive: true, force: true });
});
