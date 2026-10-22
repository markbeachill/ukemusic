// Finger exercises: the "spider walk" (also called the spider crawl, finger walking, the
// chromatic walk, the 1-2-3-4 exercise or the moonwalker). One finger per fret: index on the
// first fret of the position, middle on the next, ring on the next, little finger on the fourth.
// Walk the pattern on each string in turn, then (optionally) come back down.
//
//   1-2-3-4  the basic walk           1-3-2-4  finger independence
//   1-4-2-3  coordination             4-3-2-1  the reverse walk
//   warm-up  all four, one after another
//
// Pure functions (unit tested): the notes, the tab, and a schedule the player can play,
// with the notes on, off (click only), or one round on and the next off ("demo, then you").

const PATTERNS = [
  { id: '1234', name: '1-2-3-4: the basic walk', fingers: [1, 2, 3, 4], tip: 'Keep each finger down until it has to move: by the 4th note, all four fingers are on the string.' },
  { id: '1324', name: '1-3-2-4: finger independence', fingers: [1, 3, 2, 4], tip: 'The ring finger goes before the middle one: go slowly until it stops pulling the middle finger with it.' },
  { id: '1423', name: '1-4-2-3: coordination', fingers: [1, 4, 2, 3], tip: 'From index straight to the little finger: stretch from the knuckles and keep the thumb behind the neck.' },
  { id: '4321', name: '4-3-2-1: the reverse walk', fingers: [4, 3, 2, 1], tip: 'Put all four fingers down first, then lift one at a time, from the little finger back to the index.' },
  { id: 'warmup', name: 'Warm-up: all four, one after another', fingers: null, tip: 'One round of each pattern: a 2–3 minute warm-up before you play.' }
];
const FINGER_NAMES = { 1: 'index', 2: 'middle', 3: 'ring', 4: 'little' };
const NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function pattern(id) {
  return PATTERNS.find((p) => p.id === id) || PATTERNS[0];
}

/**
 * The notes of the exercise, in order: [{ string, fret, finger, round, position, back }]
 *   strings: how many strings (4 for a ukulele), walked from string 0 (G on a ukulele) up
 *   patternId, startFret (1–7), rounds, upAndBack (come back down the strings, fingers reversed),
 *   moveUp (start one fret higher each round, then come back down the neck)
 */
function spiderNotes({ patternId = '1234', strings = 4, startFret = 1, rounds = 2, upAndBack = true, moveUp = false, moveDown = false, hop = false } = {}) {
  if (hop) return hopNotes({ patternId, strings, startFret, rounds, upAndBack });
  const ids = patternId === 'warmup' ? ['1234', '1324', '1423', '4321'] : [patternId];
  const count = Math.max(1, Math.min(16, Number(rounds) || 1));
  const notes = [];
  const start = Math.max(1, Math.min(7, Number(startFret) || 1));
  for (let round = 0; round < count * ids.length; round += 1) {
    const fingers = pattern(ids[round % ids.length]).fingers;
    let position = start;
    if (moveDown) {
      // finger stretching: start high on the neck (frets close together) and come down a fret
      // each round, so the stretch grows gently: 7 6 5 4 3 2 1 1…
      position = Math.max(1, start - round);
    } else if (moveUp) {
      // up a fret each round, then back down: 1 2 3 4 3 2 1 2…
      const span = 4;
      const step = round % (span * 2 - 2 || 1);
      position = start + (step < span ? step : span * 2 - 2 - step);
    }
    for (let s = 0; s < strings; s += 1) {
      for (const finger of fingers) notes.push({ string: s, fret: position + finger - 1, finger, round, position, back: false });
    }
    if (upAndBack) {
      const reversed = fingers.slice().reverse();
      for (let s = strings - 1; s >= 0; s -= 1) {
        for (const finger of reversed) notes.push({ string: s, fret: position + finger - 1, finger, round, position, back: true });
      }
    }
  }
  return notes;
}

/**
 * String hopping: the walk on two strings that aren't next to each other, a note on each in
 * turn (G and E, then C and A on a ukulele): the picking hand has to jump a string every note.
 */
function hopNotes({ patternId = '1234', strings = 4, startFret = 1, rounds = 2, upAndBack = true } = {}) {
  const ids = patternId === 'warmup' ? ['1234', '1324', '1423', '4321'] : [patternId];
  const count = Math.max(1, Math.min(16, Number(rounds) || 1));
  const position = Math.max(1, Math.min(7, Number(startFret) || 1));
  const pairs = [];
  for (let s = 0; s + 2 < strings; s += 1) pairs.push([s, s + 2]);
  const notes = [];
  for (let round = 0; round < count * ids.length; round += 1) {
    const fingers = pattern(ids[round % ids.length]).fingers;
    const walk = (list, back) => {
      for (const [a, b] of list) {
        fingers.forEach((finger, k) => {
          const string = (k % 2 === 0) !== back ? a : b;
          notes.push({ string, fret: position + finger - 1, finger, round, position, back });
        });
      }
    };
    walk(pairs, false);
    if (upAndBack) walk(pairs.slice().reverse().map(([a, b]) => [b, a]), true);
  }
  return notes;
}

/**
 * The tab for one round: { text, cells } where cells[i] = { row, col, len } is where note i
 * sits in the text (row 0 = the top line, the highest string, as tab is written).
 *   names: the string names in diagram order (G C E A)
 */
function spiderTab(notes, names) {
  const rows = names.length;
  const width = Math.max(...names.map((n) => n.length));
  // tab is written with the highest string on top: row 0 = the last string in diagram order
  const lines = names.slice().reverse().map((n) => `${n.padEnd(width)} |-`);
  const cells = [];
  for (const note of notes) {
    const text = note.hidden ? '?' : String(note.fret);
    const row = rows - 1 - note.string;
    for (let r = 0; r < rows; r += 1) {
      if (r === row) {
        cells.push({ row: r, col: lines[r].length, len: text.length });
        lines[r] += `${text}-`;
      } else {
        lines[r] += `${'-'.repeat(text.length)}-`;
      }
    }
  }
  return { text: lines.map((l) => `${l}|`).join('\n'), cells };
}

/**
 * A schedule for the player (the same shape as buildSchedule's).
 *   tuning: MIDI of each open string (diagram order); tempo; notesPerBeat (1 or 2);
 *   sound: 'notes' | 'click' (notes silent) | 'off' (nothing) | 'demo' (odd rounds with notes,
 *          even rounds silent: watch, then you); click: metronome clicks; countIn
 * Each note gets an event { kind: 'strum' (a single picked note) or 'cue' (silent), noteIndex }.
 */
function spiderSchedule(notes, { tuning = [67, 60, 64, 69], tempo = 60, notesPerBeat = 1, sound = 'notes', click = true, countIn = true, beatsPerBar = 4 } = {}) {
  const beat = 60 / Math.max(30, Math.min(220, Number(tempo) || 60));
  const per = notesPerBeat === 2 ? 2 : 1;
  const step = beat / per;
  const events = [];
  let time = 0;
  if (countIn) {
    for (let b = 0; b < beatsPerBar; b += 1) events.push({ time: b * beat, kind: 'click', accent: b === 0, barIndex: -1 });
    time = beat * beatsPerBar;
  }
  const countInDuration = time;
  const barLength = beat * beatsPerBar;
  const audible = (note) => (typeof note.audible === 'boolean' ? note.audible && sound !== 'off' && sound !== 'click'
    : sound === 'notes' || (sound === 'demo' && note.round % 2 === 0));
  notes.forEach((note, i) => {
    const at = countInDuration + i * step;
    const barIndex = Math.floor((i * step) / barLength + 1e-9);
    if (audible(note)) {
      const sounding = new Array(tuning.length);
      sounding[note.string] = tuning[note.string] + note.fret;
      events.push({ time: at, kind: 'strum', direction: 'down', notes: sounding, velocity: i % per === 0 ? 0.9 : 0.75, barIndex, tabNote: true, noteIndex: i });
    } else {
      events.push({ time: at, kind: 'cue', barIndex, noteIndex: i });
    }
  });
  const length = notes.length * step;
  const barCount = Math.ceil(length / barLength - 1e-9);
  const bars = [];
  for (let b = 0; b < barCount; b += 1) {
    const first = notes[Math.min(notes.length - 1, Math.round((b * barLength) / step))];
    bars.push({ time: countInDuration + b * barLength, duration: barLength, chord: `Round ${first.round + 1}`, line: 0, beats: beatsPerBar, pattern: '' });
  }
  if (click && sound !== 'off') {
    for (let b = 0; b < barCount * beatsPerBar; b += 1) {
      events.push({ time: countInDuration + b * beat, kind: 'click', accent: b % beatsPerBar === 0, barIndex: -2 });
    }
  }
  events.sort((a, b) => a.time - b.time);
  return { events, bars, duration: countInDuration + barCount * barLength, countInDuration, tempo: Math.round(60 / beat), beatsPerBar, step, noteCount: notes.length };
}

/** Which note is being played at time t (seconds on the schedule's clock); -1 before the first */
function noteAt(schedule, t) {
  if (t < schedule.countInDuration) return -1;
  return Math.min(schedule.noteCount - 1, Math.floor((t - schedule.countInDuration) / schedule.step + 1e-6));
}

/** "Index finger (1) · G string · fret 1" */
function describeNote(note, names) {
  if (note.hidden) return 'Listen…';
  if (!note.fret) return `Open ${names[note.string]} string`;
  const finger = FINGER_NAMES[note.finger];
  if (!finger) return `${names[note.string]} string · fret ${note.fret}`;
  return `${finger[0].toUpperCase()}${finger.slice(1)} finger (${note.finger}) · ${names[note.string]} string · fret ${note.fret}`;
}

/** String names from the tuning: [67, 60, 64, 69] -> ['G', 'C', 'E', 'A'] */
function stringNames(tuning) {
  return tuning.map((m) => NOTE[m % 12]);
}

module.exports = { PATTERNS, FINGER_NAMES, pattern, spiderNotes, hopNotes, spiderTab, spiderSchedule, noteAt, describeNote, stringNames };
