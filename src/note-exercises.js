// Single-note exercises for Practice: scales, scale sequences, arpeggios, picking patterns,
// melodies and call-and-response. They all make the same kind of note list as the spider walk
// (src/finger-exercises.js), so the same fretboard, hand, tab, Show me and sound modes work:
//
//   { string, fret, finger, round, position, back, rh?, shape?, chord?, hidden?, audible?, phase? }
//     string   0 = the first string in diagram order (G on a ukulele)
//     finger   fretting finger 1–4 (0 = open string)
//     rh       picking finger: p (thumb), i (index), m (middle), a (ring)
//     shape    the chord shape held while picking (absolute frets), with chord + shapeFingers
//     hidden   not shown yet (call and response: listen first)
//     audible  true / false to override the round-by-round sound setting
//
// Pure functions: unit tested.

const NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ROOTS = { C: 0, 'C#': 1, Db: 1, D: 2, Eb: 3, 'D#': 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, Ab: 8, 'G#': 8, A: 9, Bb: 10, 'A#': 10, B: 11 };

const SCALES = {
  major: { name: 'Major scale', steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { name: 'Natural minor scale', steps: [0, 2, 3, 5, 7, 8, 10] },
  majorPent: { name: 'Major pentatonic', steps: [0, 2, 4, 7, 9] },
  minorPent: { name: 'Minor pentatonic', steps: [0, 3, 5, 7, 10] },
  blues: { name: 'Blues scale', steps: [0, 3, 5, 6, 7, 10] }
};

/**
 * Where to play each pitch (MIDI) in a position: [{ string, fret, finger }].
 *   position 0 or 1: the open position (frets 0–3); otherwise frets position…position+3
 * The same string as the note before is kept when it can be (a run stays on one string until
 * it has to move); otherwise the string whose open note is nearest below the pitch.
 * Pitches that can't be played in the position are left out.
 */
function placeNotes(pitches, tuning, { position = 0 } = {}) {
  const open = position <= 1;
  const lo = open ? 0 : position;
  const hi = open ? 4 : position + 3;
  const out = [];
  let previous = null;
  for (const pitch of pitches) {
    const options = tuning.map((t, string) => ({ string, fret: pitch - t }))
      .filter((o) => o.fret >= lo && o.fret <= hi && (o.fret > 0 || open));
    if (!options.length) continue;
    // a re-entrant string (the high G on a ukulele) is used only when nothing else can play the note
    const reentrant = (s) => s + 1 < tuning.length && tuning[s] > tuning[s + 1];
    const usable = options.filter((o) => !reentrant(o.string));
    const list = usable.length ? usable : options;
    const lowest = Math.min(...list.map((o) => o.fret));
    // the lowest fret; between equals, stay on the string the run is on
    const best = list.filter((o) => o.fret === lowest);
    const pick = best.find((o) => o.string === previous) || best.sort((a, b) => b.string - a.string)[0];
    const base = open ? 1 : position;
    out.push({ string: pick.string, fret: pick.fret, finger: pick.fret === 0 ? 0 : Math.min(4, Math.max(1, pick.fret - base + 1)), pitch });
    previous = pick.string;
  }
  return out;
}

/** The pitches of a scale playable in a position, low to high (each pitch once) */
function scalePitches({ root = 'C', scale = 'major', tuning, position = 0 }) {
  const steps = (SCALES[scale] || SCALES.major).steps;
  const r = ROOTS[root] ?? 0;
  const open = position <= 1;
  const lo = Math.min(...tuning) + (open ? 0 : position);
  const hi = Math.max(...tuning) + (open ? 3 : position + 3);
  const pitches = [];
  for (let p = lo; p <= hi; p += 1) if (steps.includes(((p - r) % 12 + 12) % 12)) pitches.push(p);
  // start on the lowest root, so the scale sounds like itself
  const first = pitches.findIndex((p) => ((p - r) % 12 + 12) % 12 === 0);
  return first > 0 && pitches.length - first >= steps.length + 1 ? pitches.slice(first) : pitches;
}

/** Groups along a list: groups of 3 -> 1 2 3, 2 3 4, 3 4 5 … */
function sequence(list, size) {
  const out = [];
  for (let i = 0; i + size <= list.length; i += 1) out.push(...list.slice(i, i + size));
  return out;
}

/**
 * A scale exercise: up, then down (optionally in sequences of 3 or 4), `rounds` times.
 *   seq: 0 (straight), 3 or 4
 */
function scaleNotes({ root = 'C', scale = 'major', tuning, position = 0, rounds = 2, upAndBack = true, seq = 0 } = {}) {
  const up = scalePitches({ root, scale, tuning, position });
  const down = up.slice().reverse();
  const notes = [];
  for (let round = 0; round < Math.max(1, Math.min(16, rounds)); round += 1) {
    const goingUp = seq ? sequence(up, seq) : up;
    const goingDown = seq ? sequence(down, seq) : down.slice(1);
    for (const n of placeNotes(goingUp, tuning, { position })) notes.push({ ...n, round, position: Math.max(1, position), back: false });
    if (upAndBack) for (const n of placeNotes(goingDown, tuning, { position })) notes.push({ ...n, round, position: Math.max(1, position), back: true });
  }
  return notes;
}

// Picking patterns: which string (index into the strings in diagram order) and which finger.
// On a ukulele, G (string 0) is the thumb's string, then C index, E middle, A ring.
const PICK_FINGERS = ['p', 'i', 'm', 'a'];
const PICK_PATTERNS = [
  { id: 'up', name: 'Up: G C E A (p i m a)', strings: [0, 1, 2, 3] },
  { id: 'updown', name: 'Up and back: G C E A E C (p i m a m i)', strings: [0, 1, 2, 3, 2, 1] },
  { id: 'gecea', name: 'G E C A (p m i a)', strings: [0, 2, 1, 3] },
  { id: 'thumb', name: 'Alternating thumb: G E C A (p m p a… thumb on G and C)', strings: [0, 2, 1, 3], fingers: ['p', 'm', 'p', 'a'] },
  { id: 'down', name: 'Down: A E C G (a m i p)', strings: [3, 2, 1, 0] },
  { id: 'pinch', name: 'Pinch then roll: G+A, C, E (p+a, i, m)', strings: [[0, 3], 1, 2, 1] }
];
const FINGER_WORDS = { p: 'thumb (p)', i: 'index finger (i)', m: 'middle finger (m)', a: 'ring finger (a)' };

/** The picking finger for a string on an instrument with n strings (thumb on the lowest ones) */
function pickFinger(string, strings = 4) {
  if (strings === 4) return PICK_FINGERS[string] || 'a';
  return string <= strings - 4 ? 'p' : PICK_FINGERS[string - (strings - 4)];
}

/**
 * Picking a chord shape: the left hand holds the chord, the right hand picks the pattern.
 *   chords: [{ name, frets (absolute), fingers }] one per bar; patternId; perBar: notes a bar
 */
function pickingNotes({ chords, patternId = 'up', rounds = 2, perBar = 8, strings = 4 } = {}) {
  const pat = PICK_PATTERNS.find((p) => p.id === patternId) || PICK_PATTERNS[0];
  const notes = [];
  for (let round = 0; round < Math.max(1, Math.min(16, rounds)); round += 1) {
    for (const chord of chords) {
      for (let k = 0; k < perBar; k += 1) {
        const step = pat.strings[k % pat.strings.length];
        const list = Array.isArray(step) ? step : [step];
        list.forEach((s, j) => {
          const string = Math.min(strings - 1, strings === 4 ? s : s + (strings - 4));
          const fret = typeof chord.frets[string] === 'number' && chord.frets[string] >= 0 ? chord.frets[string] : 0;
          const rh = pat.fingers ? pat.fingers[k % pat.fingers.length] : pickFinger(string, strings);
          notes.push({ string, fret, finger: (chord.fingers && chord.fingers[string]) || 0, rh, round, position: 1, back: false, chord: chord.name, shape: chord.frets, shapeFingers: chord.fingers, together: j > 0 });
        });
      }
    }
  }
  return notes;
}

/** Single-string picking: each open string in turn, alternating index and middle (i m i m) */
function singleStringNotes({ strings = 4, rounds = 2, perString = 8 } = {}) {
  const notes = [];
  for (let round = 0; round < Math.max(1, Math.min(16, rounds)); round += 1) {
    for (let s = strings - 1; s >= 0; s -= 1) {
      for (let k = 0; k < perString; k += 1) notes.push({ string: s, fret: 0, finger: 0, rh: k % 2 ? 'm' : 'i', round, position: 1, back: false });
    }
  }
  return notes;
}

/** Alternating fingers across strings: i on one string, m on the next, open strings */
function alternatingNotes({ strings = 4, rounds = 2 } = {}) {
  const notes = [];
  const order = [];
  for (let s = 0; s < strings - 1; s += 1) order.push(s, s + 1);
  for (let s = strings - 1; s > 0; s -= 1) order.push(s, s - 1);
  for (let round = 0; round < Math.max(1, Math.min(16, rounds)); round += 1) {
    order.forEach((s, k) => notes.push({ string: s, fret: 0, finger: 0, rh: k % 2 ? 'm' : 'i', round, position: 1, back: k >= order.length / 2 }));
  }
  return notes;
}

// Short, well-known tunes (all long out of copyright), as pitches in C (MIDI 60 = middle C)
const MELODIES = [
  { id: 'twinkle', name: 'Twinkle, Twinkle, Little Star', pitches: [60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60] },
  { id: 'ode', name: 'Ode to Joy (Beethoven)', pitches: [64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62] },
  { id: 'jacques', name: 'Frère Jacques', pitches: [60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67] },
  { id: 'saints', name: 'When the Saints Go Marching In', pitches: [60, 64, 65, 67, 60, 64, 65, 67, 60, 64, 65, 67, 64, 60, 64, 62] },
  { id: 'mary', name: 'Mary Had a Little Lamb', pitches: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67] },
  { id: 'scarborough', name: 'Scarborough Fair (opening)', pitches: [62, 62, 69, 69, 64, 65, 64, 62] }
];

function melodyNotes({ id = 'twinkle', tuning, rounds = 2 } = {}) {
  const tune = MELODIES.find((m) => m.id === id) || MELODIES[0];
  const placed = placeNotes(tune.pitches, tuning, { position: 0 });
  const notes = [];
  for (let round = 0; round < Math.max(1, Math.min(16, rounds)); round += 1) {
    for (const n of placed) notes.push({ ...n, round, position: 1, back: false });
  }
  return notes;
}

/**
 * Call and response (ear training): a short phrase from a scale, starting on the root.
 * Each phrase comes three times: listen (played, hidden), your turn (silent, hidden),
 * answer (shown and played). rand: a 0–1 random number source (for tests).
 */
function callResponseNotes({ root = 'C', scale = 'majorPent', tuning, phrases = 4, length = 3, rand = Math.random } = {}) {
  const pool = scalePitches({ root, scale, tuning, position: 0 }).slice(0, 6);
  const notes = [];
  for (let p = 0; p < Math.max(1, Math.min(16, phrases)); p += 1) {
    const phrase = [pool[0]];
    let at = 0;
    while (phrase.length < length) {
      const step = Math.floor(rand() * 5) - 2 || 1;   // -2…+2, never stay put
      at = Math.max(0, Math.min(pool.length - 1, at + step));
      phrase.push(pool[at]);
    }
    const placed = placeNotes(phrase, tuning, { position: 0 });
    const phases = [['listen', true, true], ['you', false, true], ['answer', true, false]];
    phases.forEach(([phase, audible, hidden], k) => {
      for (const n of placed) notes.push({ ...n, round: p * 3 + k, position: 1, back: false, phase, audible, hidden, phrase: p });
    });
  }
  return notes;
}

/** "D", "Bb", from a pitch class */
function noteName(pc) {
  return NOTE[((pc % 12) + 12) % 12];
}

module.exports = {
  SCALES, PICK_PATTERNS, FINGER_WORDS, MELODIES, ROOTS,
  placeNotes, scalePitches, sequence, scaleNotes, pickingNotes, pickFinger, singleStringNotes,
  alternatingNotes, melodyNotes, callResponseNotes, noteName
};
