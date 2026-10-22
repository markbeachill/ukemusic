// Keys: guess a song's key from its chords, and spell transposed chords the way they're
// written in the new key (C# in A major, Db in Ab major), instead of a fixed sharp/flat choice.
// The user never has to know the key: it's only used to choose between equivalent spellings.
const { parseChordName, NOTE_INDEX } = require('./chord-names');

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// Usual names for keys (one per pitch class)
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
// Scale step (0-6 letters above the key note) used for each number of semitones above it:
// 1 b2 2 b3 3 4 #4 5 b6 6 b7 7
const DEGREE_STEP = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
// Chords that belong in a major key: semitones above the key note -> chord quality
const MAJOR_DIATONIC = { 0: 'maj', 2: 'min', 4: 'min', 5: 'maj', 7: 'maj', 9: 'min', 11: 'dim' };

function quality(suffix) {
  if (/^(dim|°|m7b5|ø)/.test(suffix)) return 'dim';
  if (/^m(?!aj)/.test(suffix) || /^min/.test(suffix)) return 'min';
  return 'maj';
}

/** { tonic: 0-11, mode: 'major'|'minor', name: 'G' | 'Em' } */
function makeKey(tonic, mode) {
  const pc = ((tonic % 12) + 12) % 12;
  return { tonic: pc, mode, name: mode === 'minor' ? `${MINOR_KEYS[pc]}m` : MAJOR_KEYS[pc] };
}

/** Parse a key name: "G", "Bb", "F#m", "C#m" (or "auto"/"" -> null). */
function parseKey(name) {
  const m = String(name || '').trim().match(/^([A-G][#b]?)(m|min|minor)?$/);
  if (!m || NOTE_INDEX[m[1]] === undefined) return null;
  return makeKey(NOTE_INDEX[m[1]], m[2] ? 'minor' : 'major');
}

/**
 * Guess the key from the chords (in order of appearance, repeats included).
 * Scores each major key by how many chords belong to it, with extra weight for the
 * first and last chord being the home chord; chooses the relative minor when the song
 * starts or ends on it. Returns null if there are no chords.
 */
/**
 * Rank the likely keys for a song's chords (in song order, repeats count).
 * Each tonic is scored by how well the chords fit its major scale (I ii iii IV V vi vii°,
 * plus V7), with extra weight for the chord the song starts and, more, ends on. A major key
 * and its relative minor share the same chords, so the mode is decided by the home chord:
 * minor if the song ends (or starts, without ending on the major) on the vi chord.
 * Returns [{ key, score, inKey: [names], outside: [names], starts, ends }] best first.
 */
function rankKeys(chordNames) {
  const chords = (chordNames || []).map((name) => ({ name, parsed: parseChordName(name) }))
    .filter((c) => c.parsed && c.parsed.rootIndex !== undefined);
  if (!chords.length) return [];
  const first = chords[0];
  const last = chords[chords.length - 1];
  const results = [];
  for (let tonic = 0; tonic < 12; tonic += 1) {
    let score = 0;
    const inKey = new Set();
    const outside = new Set();
    for (const c of chords) {
      const rel = (c.parsed.rootIndex - tonic + 12) % 12;
      const q = quality(c.parsed.canonicalSuffix);
      if (MAJOR_DIATONIC[rel] === q || (rel === 7 && q === 'maj')) {
        score += 2;
        inKey.add(c.name);
      } else if (MAJOR_DIATONIC[rel] !== undefined) {
        score += 0.5;                     // right root, unusual type (e.g. a major II): borrowed
        inKey.add(c.name);
      } else {
        score -= 1;
        outside.add(c.name);
      }
    }
    for (const [c, weight] of [[first, 2], [last, 3]]) {
      const rel = (c.parsed.rootIndex - tonic + 12) % 12;
      const q = quality(c.parsed.canonicalSuffix);
      if ((rel === 0 && q === 'maj') || (rel === 9 && q === 'min')) score += weight;
    }
    const relOf = (c) => (c.parsed.rootIndex - tonic + 12) % 12;
    const minorHome = (c) => relOf(c) === 9 && quality(c.parsed.canonicalSuffix) === 'min';
    const majorHome = (c) => relOf(c) === 0 && quality(c.parsed.canonicalSuffix) === 'maj';
    const minor = minorHome(last) || (minorHome(first) && !majorHome(last));
    const key = minor ? makeKey(tonic + 9, 'minor') : makeKey(tonic, 'major');
    const home = (c) => (minor ? minorHome(c) : majorHome(c));
    results.push({ key, score, inKey: [...inKey], outside: [...outside], starts: home(first), ends: home(last), first: first.name, last: last.name });
  }
  // Highest score first; ties keep the lower tonic, as detectKey always did
  return results.map((r, i) => ({ ...r, order: i })).sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ order, ...r }) => r);
}

/** How sure the guess is: 'high', 'medium' or 'low', from the lead over the next key and how many chords fit. */
function keyConfidence(ranked) {
  if (!ranked.length) return 'low';
  const [best, next] = ranked;
  const lead = next ? best.score - next.score : best.score;
  const total = best.inKey.length + best.outside.length;
  const fit = total ? best.inKey.length / total : 0;
  if (lead >= 4 && fit >= 0.8 && (best.starts || best.ends)) return 'high';
  if (lead >= 2 && fit >= 0.6) return 'medium';
  return 'low';
}

function detectKey(chordNames) {
  const ranked = rankKeys(chordNames);
  return ranked.length ? ranked[0].key : null;
}

/** Key name after moving by some semitones: G +2 -> A, Em +3 -> Gm */
function transposeKey(key, semitones) {
  return key ? makeKey(key.tonic + semitones, key.mode) : null;
}

/** Spell a pitch class in a key by its scale step; null if that needs Cb/Fb/E#/B# or a double accidental. */
function spellInKey(pc, key) {
  const keyNote = key.name.replace(/m$/, '');
  const letterIndex = LETTERS.indexOf(keyNote[0]);
  const rel = (pc - key.tonic + 12) % 12;
  const letter = LETTERS[(letterIndex + DEGREE_STEP[rel]) % 7];
  let diff = (pc - LETTER_PC[letter] + 12) % 12;
  if (diff > 6) diff -= 12;
  if (Math.abs(diff) > 1) return null;
  const name = letter + (diff === 1 ? '#' : diff === -1 ? 'b' : '');
  return ['Cb', 'Fb', 'E#', 'B#'].includes(name) ? null : name;
}

/**
 * Transpose a chord name and spell it for the new key.
 *   fromKey: the song's key (object from parseKey/detectKey); fallback(name, semitones) used if
 *   the key spelling would be awkward or the chord can't be parsed.
 */
function transposeChordInKey(chordName, semitones, fromKey, fallback) {
  if (!semitones) return chordName;
  const parsed = parseChordName(chordName);
  if (!parsed || parsed.rootIndex === undefined || !fromKey) return fallback(chordName, semitones);
  const toKey = transposeKey(fromKey, semitones);
  const root = spellInKey(parsed.rootIndex + semitones, toKey);
  const bass = parsed.bass ? spellInKey(NOTE_INDEX[parsed.bass] + semitones, toKey) : null;
  if (!root || (parsed.bass && !bass)) return fallback(chordName, semitones);
  return root + parsed.suffix + (bass ? `/${bass}` : '');
}

/** "G major" / "E minor" */
function describeKey(key) {
  if (!key) return '';
  return `${key.name.replace(/m$/, '')} ${key.mode}`;
}

const KEY_CHOICES = [
  ...MAJOR_KEYS.map((n) => n),
  ...MINOR_KEYS.map((n) => `${n}m`)
];

module.exports = { detectKey, rankKeys, keyConfidence, parseKey, makeKey, transposeKey, spellInKey, transposeChordInKey, describeKey, KEY_CHOICES };
