// Practice: three trainers that don't need a song open (the Practice window in index.html).
//
//   1. Strum         a strum pattern over a few easy chords, like a visual metronome
//   2. 12-bar blues  the blues in a key, with 7ths, quick change, turnaround and the shuffle
//                    (one finger two frets up on alternate beats: the chord's 5th becomes a 6th)
//   3. Chord change  back and forth between a chord you know and the one you're learning
//
// Each exercise is written as ordinary song text (a bar line, "| C | Am | F | G |") so the
// usual parser and playback (buildSchedule) play it; the extra bits (metronome clicks, the
// shuffle) are added to the schedule afterwards. Pure functions: unit tested.

const { getChordDefinition } = require('./chord-library');
const { parseChordName } = require('./chord-names');
const { noteIndex } = require('./transpose');

const EASY_CHORDS = ['C', 'Am', 'F', 'G'];
const BLUES_KEYS = {
  C: ['C', 'F', 'G'],
  G: ['G', 'C', 'D'],
  A: ['A', 'D', 'E'],
  D: ['D', 'G', 'A'],
  F: ['F', 'Bb', 'C'],
  E: ['E', 'A', 'B']
};
const ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const TYPES = [
  { suffix: '', label: 'major' },
  { suffix: 'm', label: 'minor (m)' },
  { suffix: '7', label: '7' },
  { suffix: 'm7', label: 'm7' },
  { suffix: 'maj7', label: 'maj7' },
  { suffix: '6', label: '6' },
  { suffix: 'sus2', label: 'sus2' },
  { suffix: 'sus4', label: 'sus4' },
  { suffix: '9', label: '9' },
  { suffix: 'dim', label: 'dim' },
  { suffix: 'aug', label: 'aug' }
];

/** Bars as bar lines, four to a line: [['C'], ['Am']…] -> "| C | Am | F | G |\n…" */
function barLines(bars) {
  const lines = [];
  for (let i = 0; i < bars.length; i += 4) {
    lines.push(`| ${bars.slice(i, i + 4).map((b) => b.join(' ')).join(' | ')} |`);
  }
  return lines.join('\n');
}

/** A strum over chords: { text, bars } (one chord a bar, round and round, `bars` bars) */
function strumExercise({ chords = EASY_CHORDS, pattern = 'D-DU-UDU', bars = 8, time = '' } = {}) {
  const list = chords.filter(Boolean).length ? chords.filter(Boolean) : EASY_CHORDS;
  const count = Math.max(1, Math.min(64, Number(bars) || 8));
  const grid = Array.from({ length: count }, (_, i) => [list[i % list.length]]);
  return { text: `{${time ? `${time} ` : ''}${pattern}}\n${barLines(grid)}`, bars: count };
}

/** The 12 bars of a blues: chord names */
function bluesChart({ key = 'C', sevenths = true, quickChange = false, turnaround = true } = {}) {
  const [one, four, five] = BLUES_KEYS[key] || BLUES_KEYS.C;
  const s = sevenths ? '7' : '';
  const I = one + s;
  const IV = four + s;
  const V = five + s;
  return [
    I, quickChange ? IV : I, I, I,
    IV, IV, I, I,
    V, IV, I, turnaround ? V : I
  ];
}

/** A blues exercise: the 12 bars, `rounds` times */
function bluesExercise({ rounds = 2, pattern = 'D-UD-UD-UD-U', ...chart } = {}) {
  const twelve = bluesChart(chart);
  const times = Math.max(1, Math.min(8, Number(rounds) || 2));
  const grid = [];
  for (let r = 0; r < times; r += 1) for (const c of twelve) grid.push([c]);
  return { text: `{${pattern}}\n${barLines(grid)}`, bars: grid.length, chart: twelve };
}

/** Back and forth between two chords: every bar ('bar') or every 2 beats ('half') */
function changeExercise({ from = 'C', to = 'F', every = 'bar', bars = 8, pattern = 'DDDD' } = {}) {
  const count = Math.max(2, Math.min(64, Number(bars) || 8));
  const grid = [];
  for (let i = 0; i < count; i += 1) grid.push(every === 'half' ? [from, to] : [i % 2 ? to : from]);
  return { text: `{${pattern}}\n${barLines(grid)}`, bars: count };
}

/** MIDI note of each open string, for an instrument's tuning */
function tuningFor(instrument) {
  const { TUNINGS } = require('./playback-schedule');
  return TUNINGS[instrument] || TUNINGS.soprano;
}

/** The fret numbers of a shape as played (base_fret counted in) */
function absoluteFrets(definition) {
  const base = Math.max(1, Number(definition.base_fret) || 1);
  return definition.frets.map((f) => (typeof f === 'number' && f > 0 ? f + base - 1 : f));
}

/**
 * The shuffle shape: the chord with one more finger, two frets up on the string playing the
 * chord's 5th (so the 5th becomes a 6th). Returns { frets, string, from, to } in absolute frets,
 * or null if the shape has no 5th within reach. The highest-sounding string with a 5th is used.
 */
function shuffleShape(chordName, library, instrument = 'soprano') {
  const definition = getChordDefinition(library, chordName);
  const parsed = parseChordName(chordName);
  if (!definition || !parsed) return null;
  const root = noteIndex(parsed.root);
  if (root === null) return null;
  const fifth = (root + 7) % 12;
  const tuning = tuningFor(instrument);
  const frets = absoluteFrets(definition);
  const candidates = frets
    .map((fret, string) => ({ fret, string, pitch: typeof fret === 'number' && fret >= 0 ? tuning[string] + fret : null }))
    .filter((c) => c.pitch !== null && c.pitch % 12 === fifth && c.fret + 2 <= Math.max(5, Math.max(...frets) + 2))
    .sort((a, b) => b.pitch - a.pitch);
  if (!candidates.length) return null;
  const pick = candidates[0];
  const next = frets.slice();
  next[pick.string] = pick.fret + 2;
  // the finger to add: the next one free (usually the 3rd or the little finger)
  const fingers = (definition.fingers || frets.map(() => 0)).slice();
  const used = new Set(fingers.filter((f) => f > 0));
  fingers[pick.string] = [3, 4, 2, 1].find((f) => !used.has(f)) || 4;
  return { frets: next, fingers, finger: fingers[pick.string], string: pick.string, from: pick.fret, to: pick.fret + 2 };
}

/** A shape (absolute frets) as a diagram definition */
function definitionFromFrets(frets, name, fingers = null) {
  const played = frets.filter((f) => typeof f === 'number' && f > 0);
  const top = played.length ? Math.max(...played) : 0;
  const base = top > 4 ? Math.min(...played) : 1;
  return {
    name,
    frets: frets.map((f) => (typeof f === 'number' && f > 0 ? f - base + 1 : f)),
    fingers: fingers || frets.map(() => 0),
    barre: null,
    base_fret: base
  };
}

/** MIDI notes of a shape */
function notesOf(frets, instrument = 'soprano') {
  const tuning = tuningFor(instrument);
  return frets.map((f, string) => (typeof f === 'number' && f >= 0 ? tuning[string] + f : null));
}

/**
 * The shuffle in a schedule: strums on beats 2 and 4 (every other beat) use the shuffle shape.
 * shapes: { chordName: { frets } }. Returns a new events list.
 */
function applyShuffle(schedule, shapes, instrument = 'soprano', capo = 0) {
  return schedule.events.map((event) => {
    if (event.kind !== 'strum' || event.barIndex < 0) return event;
    const bar = schedule.bars[event.barIndex];
    const shape = bar && shapes[bar.chord];
    if (!shape) return event;
    const beat = (bar.unit || 60 / schedule.tempo) * (bar.pulse || 1);
    const beatInBar = Math.floor((event.time - bar.time) / beat + 1e-6);
    if (beatInBar % 2 !== 1) return event;
    const notes = notesOf(shape.frets, instrument).map((n) => (n === null ? null : n + capo));
    // keep the string order playback expects (index = string), leaving out unplayed strings
    return { ...event, notes: notes.map((n) => (n === null ? undefined : n)), shuffle: true };
  });
}

/** Metronome clicks on every beat (louder on the first) after the count-in */
function addClicks(schedule) {
  const clicks = [];
  for (const bar of schedule.bars) {
    // a click per beat of the tempo (in 6/8: per dotted quarter, on 1 and 4)
    const beat = (bar.unit || 60 / schedule.tempo) * (bar.pulse || 1);
    const count = Math.round(bar.duration / beat);
    const barLength = (bar.unit || 60 / schedule.tempo) * (bar.beats || schedule.beatsPerBar || 4);
    for (let b = 0; b < count; b += 1) {
      const time = bar.time + b * beat;
      const intoBar = (time - (schedule.countInDuration || 0)) % barLength;
      clicks.push({ time, kind: 'click', accent: intoBar < 1e-6 || barLength - intoBar < 1e-6, barIndex: -2 });
    }
  }
  return [...schedule.events, ...clicks].sort((a, b) => a.time - b.time);
}

/**
 * Tips for changing between two shapes: fingers that can stay down, strings that stay open.
 * Returns plain sentences.
 */
function changeTips(fromName, toName, library, instrument = 'soprano') {
  const a = getChordDefinition(library, fromName);
  const b = getChordDefinition(library, toName);
  if (!a || !b) return [];
  const { instrument: profile } = require('./instruments');
  const NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const names = (profile(instrument).strings || []).map((m) => NOTE[m % 12]);
  const fa = absoluteFrets(a);
  const fb = absoluteFrets(b);
  const tips = [];
  const anchors = [];
  fa.forEach((f, s) => {
    if (typeof f === 'number' && f > 0 && f === fb[s]) anchors.push(`${names[s] || `string ${s + 1}`} string, fret ${f}`);
  });
  if (anchors.length) tips.push(`Keep ${anchors.length > 1 ? 'these fingers' : 'this finger'} down: ${anchors.join('; ')}.`);
  const moves = fb.filter((f, s) => f !== fa[s]).length;
  if (!anchors.length && moves) tips.push('No finger stays put: lift them all together and place the new shape as one.');
  const opens = fb.filter((f) => f === 0).length;
  if (opens) tips.push(`${toName} has ${opens} open string${opens > 1 ? 's' : ''}: let ${opens > 1 ? 'them' : 'it'} ring.`);
  if (b.barre) tips.push(`${toName} has a barre: flatten one finger across the strings, then add the others.`);
  return tips;
}

/** Chords to come from when learning `target`: the common ones in its keys */
function partnersFor(target) {
  const common = ['C', 'G', 'Am', 'F', 'D', 'Em', 'A', 'Dm', 'E7', 'G7', 'C7', 'D7', 'A7'];
  const parsed = parseChordName(target);
  const root = parsed ? noteIndex(parsed.root) : null;
  if (root === null) return common.filter((c) => c !== target).slice(0, 6);
  // the chords a 4th and 5th away (the ones most songs move between), then common open chords
  const name = (semi) => ROOTS[(root + semi) % 12];
  const near = [name(7), name(5), `${name(9)}m`, name(0) === target ? `${name(0)}7` : name(0)];
  return [...new Set([...near, ...common])].filter((c) => c !== target).slice(0, 8);
}

module.exports = {
  barLines, EASY_CHORDS, BLUES_KEYS, ROOTS, TYPES, strumExercise, bluesChart, bluesExercise, changeExercise,
  shuffleShape, definitionFromFrets, applyShuffle, addClicks, changeTips, partnersFor, absoluteFrets, notesOf
};
