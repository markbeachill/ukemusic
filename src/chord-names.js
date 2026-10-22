// One place for what counts as a chord name, and what notes each chord type contains.
// Used by the parser, the editor highlighting, the chord-sheet converter, the chord
// library lookup and playback.

// Root, then any sequence of suffix parts, then an optional /bass.
// Covers: m, maj, min, dim, aug, sus, add, dom, alt, M, 6, 7, 9, 11, 13, 5, 2, 4,
// altered tones (b5 #5 b9 #9 #11 b13), and the symbols ° ø + Δ.
const CHORD_INNER_PATTERN = String.raw`[A-G][#b]?(?:maj|min|m|dim|aug|sus|add|dom|alt|M|Δ|°|ø|\+|[#b](?:5|9|11|13)|13|11|9|7|6|5|4|2|\/[A-G][#b]?)*`;
const CHORD_RE = new RegExp(`^${CHORD_INNER_PATTERN}$`);

// Intervals (semitones above the root) allowed in each chord type. Upper extensions
// often drop the 5th (and sometimes the root) on a 4-string instrument, so these are
// the notes a voicing may contain, not notes it must contain.
const SUFFIX_INTERVALS = {
  '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], dim7: [0, 3, 6, 9], aug: [0, 4, 8],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '7sus4': [0, 5, 7, 10], '7sus2': [0, 2, 7, 10],
  5: [0, 7], 6: [0, 4, 7, 9], 69: [0, 2, 4, 7, 9], m6: [0, 3, 7, 9], m69: [0, 2, 3, 7, 9],
  7: [0, 4, 7, 10], '7b5': [0, 4, 6, 10], aug7: [0, 4, 8, 10], '7b9': [0, 1, 4, 7, 10],
  '7#9': [0, 3, 4, 7, 10], '7b9#5': [0, 1, 4, 8, 10], alt: [0, 1, 3, 4, 6, 8, 10],
  9: [0, 2, 4, 7, 10], '9b5': [0, 2, 4, 6, 10], aug9: [0, 2, 4, 8, 10], '9#11': [0, 2, 4, 6, 7, 10],
  11: [0, 2, 4, 5, 7, 10], 13: [0, 2, 4, 5, 7, 9, 10], '13b9': [0, 1, 4, 7, 9, 10],
  '13b5b9': [0, 1, 4, 6, 9, 10], '7b9b13': [0, 1, 4, 7, 8, 10], '7#9b13': [0, 3, 4, 7, 8, 10],
  maj7: [0, 4, 7, 11], maj7b5: [0, 4, 6, 11], 'maj7#5': [0, 4, 8, 11], maj9: [0, 2, 4, 7, 11],
  maj11: [0, 2, 4, 5, 7, 11], maj13: [0, 2, 4, 5, 7, 9, 11],
  m7: [0, 3, 7, 10], m7b5: [0, 3, 6, 10], m9: [0, 2, 3, 7, 10], m9b5: [0, 2, 3, 6, 10],
  m11: [0, 2, 3, 5, 7, 10], mmaj7: [0, 3, 7, 11], mmaj7b5: [0, 3, 6, 11],
  mmaj9: [0, 2, 3, 7, 11], mmaj11: [0, 2, 3, 5, 7, 11], add9: [0, 2, 4, 7], madd9: [0, 2, 3, 7]
};

// Other ways people write the same chord type -> the name used in the chord library
const SUFFIX_ALIASES = {
  maj: '', M: '', major: '', min: 'm', minor: 'm', mi: 'm',
  M7: 'maj7', Δ: 'maj7', Δ7: 'maj7', ma7: 'maj7', maj79: 'maj9', M9: 'maj9',
  min7: 'm7', mi7: 'm7', min6: 'm6', min9: 'm9', min11: 'm11', mM7: 'mmaj7', mmaj: 'mmaj7',
  '°': 'dim', o: 'dim', '°7': 'dim7', o7: 'dim7', ø: 'm7b5', ø7: 'm7b5', m7b5: 'm7b5',
  '+': 'aug', '+7': 'aug7', '7+': 'aug7', '7#5': 'aug7', sus: 'sus4', '7sus': '7sus4',
  dom7: '7', dom: '7', add2: 'add9', madd2: 'madd9', '2': 'sus2', '4': 'sus4',
  '6/9': '69', '9+': 'aug9', '9#5': 'aug9',
  // chords-db writes these with a leading "b", which would read as a flat root ("Cb13b9")
  b13b9: '7b9b13', 'b13#9': '7#9b13'
};

const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11, 'B#': 0 };

/** "Bbm7b5/E" -> { root: 'Bb', suffix: 'm7b5', bass: 'E', canonicalSuffix: 'm7b5', rootIndex: 10 } */
function parseChordName(name) {
  const match = String(name || '').match(/^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/);
  if (!match) return null;
  const [, root, suffix, bass = null] = match;
  const canonicalSuffix = Object.prototype.hasOwnProperty.call(SUFFIX_ALIASES, suffix) ? SUFFIX_ALIASES[suffix] : suffix;
  return { root, suffix, bass, canonicalSuffix, rootIndex: NOTE_INDEX[root] };
}

/** Pitch classes (0-11) a chord may contain, or null if the chord type isn't known. */
function chordPitchClasses(name) {
  const parsed = parseChordName(name);
  if (!parsed) return null;
  const intervals = SUFFIX_INTERVALS[parsed.canonicalSuffix];
  if (!intervals) return null;
  const set = intervals.map((i) => (parsed.rootIndex + i) % 12);
  if (parsed.bass) set.push(NOTE_INDEX[parsed.bass]);
  return [...new Set(set)];
}

function isChordName(text) {
  return CHORD_RE.test(String(text || ''));
}

module.exports = {
  CHORD_INNER_PATTERN,
  CHORD_RE,
  SUFFIX_INTERVALS,
  SUFFIX_ALIASES,
  NOTE_INDEX,
  parseChordName,
  chordPitchClasses,
  isChordName
};
