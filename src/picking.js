// Picking a strummed song (4.44): the chords stay, the strum becomes a picking pattern.
//
// The patterns are the standard ones ukulele fingerpicking is taught with. Each is written for
// the picking fingers, one finger to a string as beginners learn it:
//   p  thumb: the 4th string (g on a ukulele)       P  thumb on its other string (C)
//   i  index: the 3rd string (C)                     m  middle: the 2nd string (E)
//   a  ring: the 1st string (A)
// One token per step: '-' is a rest, 'p+a' two strings picked together (a pinch). Steps are
// eighths: 8 in a bar of 4/4, 6 in 3/4, and in 6/8 one per eighth (6).
//
// A guitar's thumb takes the chord's bass note (its root on the lower strings), the fingers the
// top three strings; its other thumb string is the D string (or G, when the bass is on D).

const { parseChordName, NOTE_INDEX } = require('./chord-names');
const { instrument: profile } = require('./instruments');

const PATTERNS = [
  {
    id: 'up', level: 1, name: 'One string a beat', strings: 'g C E A',
    tip: 'Thumb, index, middle, ring: one string a beat, from the top string down. The way in: just hold the chord and keep time.',
    four: ['p', '-', 'i', '-', 'm', '-', 'a', '-'], three: ['p', '-', 'i', '-', 'm+a', '-'], six: ['p', '-', '-', 'm+a', '-', '-']
  },
  {
    id: 'up8', level: 2, name: 'Up, twice a bar', strings: 'g C E A g C E A',
    tip: 'The same four strings in eighths: twice through in a bar of 4/4.',
    four: ['p', 'i', 'm', 'a', 'p', 'i', 'm', 'a'], three: ['p', 'i', 'm', 'a', 'm', 'i'], six: ['p', 'i', 'm', 'a', 'm', 'i']
  },
  {
    id: 'upback', level: 3, name: 'Up and back', strings: 'g C E A E C',
    tip: 'Across the strings and back again. Made for 3/4 and 6/8; in 4/4 it runs on into the next round.',
    four: ['p', 'i', 'm', 'a', 'm', 'i', 'p', 'i'], three: ['p', 'i', 'm', 'a', 'm', 'i'], six: ['p', 'i', 'm', 'a', 'm', 'i']
  },
  {
    id: 'pinch', level: 4, name: 'Pinch and roll', strings: 'g+A C E C',
    tip: 'Thumb and ring finger together on the beat (a pinch), then index, middle, index.',
    four: ['p+a', 'i', 'm', 'i', 'p+a', 'i', 'm', 'i'], three: ['p+a', 'i', 'm', 'i', 'm', 'i'], six: ['p+a', 'i', 'm', 'p+a', 'i', 'm']
  },
  {
    id: 'travis', level: 5, name: 'Alternating thumb (Travis)', strings: 'g+A E C A g E C A',
    tip: 'The thumb on every beat, swapping between g and C; the fingers on E and A in between. The classic folk pattern.',
    four: ['p+a', 'm', 'P', 'a', 'p', 'm', 'P', 'a'], three: ['p+a', 'm', 'P', 'a', 'p', 'm'], six: ['p+a', 'm', 'a', 'P', 'm', 'a']
  },
  {
    id: 'melody', level: 6, name: 'Chord melody (the tune)', strings: 'the tune on top', needsTune: true,
    tip: 'A picked solo: the tune on the top strings, from the chord shape you\'re holding, with a chord note under it on beat 1. Needs the song\'s tune ({melody} lines); a line without one is picked One string a beat.',
    // lines without a tune: One string a beat
    four: ['p', '-', 'i', '-', 'm', '-', 'a', '-'], three: ['p', '-', 'i', '-', 'm+a', '-'], six: ['p', '-', '-', 'm+a', '-', '-']
  }
];

function pattern(id) {
  return PATTERNS.find((p) => p.id === id) || null;
}

/** The steps of a pattern for a bar: `beats` counts, compound (6/8: one step per eighth) */
function patternFor(id, beats = 4, compound = false) {
  const p = pattern(id);
  if (!p) return [];
  if (compound) return Array.from({ length: beats }, (_, k) => p.six[k % p.six.length]);
  const base = beats === 3 ? p.three : p.four;
  return Array.from({ length: beats * 2 }, (_, k) => base[k % base.length]);
}

/** Each string's name as players say them: a re-entrant (high) first string in lower case (g C E A) */
function stringNames(instrumentId) {
  const prof = profile(instrumentId);
  const names = prof.tabNames.slice().reverse();
  return names.map((n, s) => (s === 0 && prof.strings.length > 1 && prof.strings[0] > prof.strings[1] ? n.toLowerCase() : n));
}

/**
 * Which string each finger picks, for a chord shape. frets in diagram order (string 0 = the
 * lowest-written string); -1 or null = not played.  -> { p, P, i, m, a } string indexes
 */
function roleStrings(frets, chordName, instrumentId = 'soprano') {
  const tuning = profile(instrumentId).strings;
  const n = tuning.length;
  if (n <= 4) return { p: 0, P: 1, i: 1, m: 2, a: 3 };   // ukuleles and the baritone: a finger to a string
  const plays = (s) => typeof frets[s] === 'number' && frets[s] >= 0;
  const fingers = { i: n - 3, m: n - 2, a: n - 1 };
  const low = [];
  for (let s = 0; s < n - 3; s += 1) if (plays(s)) low.push(s);
  if (!low.length) return { p: n - 4, P: n - 4, ...fingers };
  const parsed = parseChordName(chordName || '');
  const root = parsed ? (parsed.bass && NOTE_INDEX[parsed.bass] !== undefined ? NOTE_INDEX[parsed.bass] : parsed.rootIndex) : null;
  const p = low.find((s) => root !== null && (tuning[s] + frets[s]) % 12 === root) ?? low[0];
  const P = p < n - 4 ? n - 4 : n - 3;   // the D string (or G when the bass is on D)
  return { p, P: plays(P) ? P : p, ...fingers };
}

/** A token ('p+a') as strings for a chord, in the order picked together */
function tokenStrings(token, roles) {
  if (!token || token === '-') return [];
  // a finger (p i m a P), or a string by number ('s2', from a pattern written by string name)
  return [...new Set(token.split('+').map((r) => (/^s\d+$/.test(r) ? Number(r.slice(1)) : roles[r])).filter((s) => s !== undefined))];
}

// ── {pick} lines (4.44): the pattern from here on, by name, or written out ──
//   {pick: up and back}         a pattern by name (or id: upback)
//   {pick: g C E A E C}         your own, by string (g+A picked together, - a rest)
//   {pick: p i m a m i}         your own, by finger (p thumb, i index, m middle, a ring)
//   {pick V: g C E A}           named, to use again later with {pick V}
//   {pick: strum}               back to strumming (also off, none)
const ALIASES = { 'one string': 'up', 'one string a beat': 'up', 'up': 'up', 'up twice': 'up8', 'up, twice a bar': 'up8', 'up twice a bar': 'up8',
  'up and back': 'upback', 'pinch': 'pinch', 'pinch and roll': 'pinch', 'travis': 'travis', 'alternating thumb': 'travis', 'alternating thumb (travis)': 'travis',
  'melody': 'melody', 'chord melody': 'melody', 'chord melody (the tune)': 'melody', 'tune': 'melody' };

/**
 * A {pick} line's pattern -> { id } (a pattern), { custom: tokens, label } (your own),
 * { off: true } (strum again), or { error }
 */
function resolvePick(spec, instrumentId = 'soprano') {
  const text = String(spec || '').trim();
  const low = text.toLowerCase().replace(/\s+/g, ' ');
  if (!text) return { error: 'no pattern given' };
  if (/^(strum|strummed|off|none|no)$/.test(low)) return { off: true };
  const byName = PATTERNS.find((p) => p.id === low) || pattern(ALIASES[low]);
  if (byName) return { id: byName.id, label: byName.name };
  const toks = text.split(/[\s,]+/).filter(Boolean);
  // by finger
  if (toks.every((t) => /^(-|[pPima](\+[pPima])*)$/.test(t))) return { custom: toks, label: toks.join(' '), kind: 'fingers' };
  // by string name: the instrument's own names (g C E A); on a guitar e is the top string
  const names = stringNames(instrumentId);
  const indexOf = (nm) => {
    let k = names.indexOf(nm);
    if (k < 0) k = names.findIndex((x) => x.toLowerCase() === nm.toLowerCase());
    return k;
  };
  const out = [];
  for (const t of toks) {
    if (t === '-') { out.push('-'); continue; }
    const parts = t.split('+').map(indexOf);
    if (parts.some((k) => k < 0)) return { error: `"${t}" isn't a string (${names.join(' ')}) or a finger (p i m a)` };
    out.push(parts.map((k) => `s${k}`).join('+'));
  }
  return { custom: out, label: toks.join(' '), kind: 'strings' };
}

/** A pick's steps for a bar: a pattern's, or your own repeated to fill the bar (eighths) */
function pickTokens(pick, beats = 4, compound = false) {
  if (!pick || pick.off || pick.error) return [];
  if (pick.id) return patternFor(pick.id, beats, compound);
  const n = compound ? beats : beats * 2;
  return Array.from({ length: n }, (_, k) => pick.custom[k % pick.custom.length]);
}

/** "g C E A": a chord's pattern as string names, rests left out */
function pickText(id, { frets, chord = '', instrument = 'soprano', beats = 4, compound = false, tokens = null } = {}) {
  const roles = roleStrings(frets || [], chord, instrument);
  const names = stringNames(instrument);
  const list = tokens || patternFor(id, beats, compound);
  return list.filter((t) => t && t !== '-').map((t) => tokenStrings(t, roles).map((s) => names[s]).join('+')).join(' ');
}

/** "p i m a": the picking fingers of a pattern (P is the thumb too) */
function fingerText(id, beats = 4, compound = false) {
  return patternFor(id, beats, compound).filter((t) => t !== '-').map((t) => t.replace(/P/g, 'p')).join(' ');
}

// ── Chord melody (4.44): the tune on top, the chord under it ──
/**
 * Where to play a tune note with a chord held: the shape's own fret on a string if it has the
 * note, else the nearest fret to the shape; the top strings (E and A on a ukulele) first.
 *   midi: the note relative to the capo; frets: the chord shape -> { string, fret } | null
 */
function placeNote(midi, frets, instrumentId = 'soprano', prevString = null) {
  const tuning = profile(instrumentId).strings;
  const n = tuning.length;
  const reentrant = n === 4 && tuning[0] > tuning[1];
  const fretted = frets.filter((f) => typeof f === 'number' && f > 0);
  const lo = fretted.length ? Math.min(...fretted) : 0;
  const hi = fretted.length ? Math.max(...fretted) : 0;
  let best = null;
  for (let s = n - 1; s >= 0; s -= 1) {
    const f = midi - tuning[s];
    if (f < 0 || f > 12) continue;
    let cost = f === frets[s] ? 0 : f === 0 ? 1 : 3 + Math.max(0, lo - f, f - hi);
    cost += reentrant ? [2.5, 1.5, 0.5, 0][s] : (n - 1 - s) * 0.7;
    if (prevString !== null) cost += 0.2 * Math.abs(s - prevString);
    if (!best || cost < best.cost - 1e-9) best = { string: s, fret: f, cost };
  }
  return best ? { string: best.string, fret: best.fret } : null;
}

/** The chord note under a tune note on the beat: a lower string from the shape (C, then g, on a
 *  ukulele; the bass note on a guitar) -> string | null */
function bassUnder(frets, chordName, instrumentId, melodyString) {
  const n = profile(instrumentId).strings.length;
  const plays = (s) => typeof frets[s] === 'number' && frets[s] >= 0;
  const order = n <= 4 ? [1, 0] : [roleStrings(frets, chordName, instrumentId).p];
  return order.find((s) => s < melodyString && plays(s)) ?? null;
}

// ── The first note to sing (4.44): song.first_note, "E", "F#" or "Bb4" ──
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** "E" | "f#" | "Bb4" -> "E" | "F#" | "Bb4" (tidied), or '' when it isn't a note */
function normalizeNote(text) {
  const m = String(text || '').trim().match(/^([A-Ga-g])([#b♯♭]?)([1-7]?)$/);
  if (!m) return '';
  return `${m[1].toUpperCase()}${m[2].replace('♯', '#').replace('♭', 'b')}${m[3]}`;
}

/** The note as MIDI, moved by `transpose` semitones (the key it's played in). Without an octave,
 *  it's put between middle C and the B above (where a ukulele plays it). -> number | null */
function noteMidi(text, transpose = 0) {
  const n = normalizeNote(text);
  if (!n) return null;
  const m = n.match(/^([A-G])([#b]?)(\d?)$/);
  const pc = (NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  if (m[3]) return 12 * (Number(m[3]) + 1) + pc + transpose;
  return 60 + ((pc + transpose) % 12 + 12) % 12;
}

/** The note's name after moving by `transpose` semitones: "E" + 2 -> "F#" */
function noteName(text, transpose = 0) {
  const midi = noteMidi(text, transpose);
  return midi === null ? '' : SHARP_NAMES[((midi % 12) + 12) % 12];
}

module.exports = { resolvePick, pickTokens, placeNote, bassUnder, normalizeNote, noteMidi, noteName, PATTERNS, pattern, patternFor, stringNames, roleStrings, tokenStrings, pickText, fingerText };
