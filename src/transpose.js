/**
 * Transpose chord names by a number of semitones.
 *
 * Supports sharps and flats. The output uses sharps for positive transposition
 * and flats for negative, but this can be overridden with the preferFlats option.
 */

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Map any note name to a semitone index (0 = C)
const NOTE_TO_INDEX = {};
SHARP_NOTES.forEach((n, i) => { NOTE_TO_INDEX[n] = i; });
FLAT_NOTES.forEach((n, i) => { NOTE_TO_INDEX[n] = i; });

// Regex to extract the root note from a chord name
// Matches: C, C#, Db, etc. at the start, then captures the rest (m, 7, sus4, /G, etc.)
const CHORD_ROOT_RE = /^([A-G][#b]?)(.*)/;

// "Common" spelling: the names musicians usually write, whatever the direction of transposition.
// Majors/7ths prefer Bb, Eb, Ab, Db, F#; minors prefer C#m, F#m, G#m, Ebm, Bbm.
const COMMON_MAJOR = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const COMMON_MINOR = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

function isMinorSuffix(suffix) {
  return /^m(?!aj)/.test(suffix);
}

// useFlats: true | false | 'common-major' | 'common-minor'
function transposeNote(note, semitones, useFlats) {
  const index = NOTE_TO_INDEX[note];
  if (index === undefined) return note; // unknown note, return as-is

  const newIndex = ((index + semitones) % 12 + 12) % 12;
  let noteList = useFlats ? FLAT_NOTES : SHARP_NOTES;
  if (useFlats === 'common-major') noteList = COMMON_MAJOR;
  if (useFlats === 'common-minor') noteList = COMMON_MINOR;
  return noteList[newIndex];
}

function noteIndex(note) {
  const index = NOTE_TO_INDEX[note];
  return index === undefined ? null : index;
}

/**
 * transposeChord(name, semitones, useFlats | { spelling: 'common' })
 * With spelling 'common', roots are spelled the usual way for the chord type
 * and slash-bass notes use the major spelling.
 */
function transposeChord(chordName, semitones, useFlats) {
  if (semitones === 0) return chordName;

  const match = chordName.match(CHORD_ROOT_RE);
  if (!match) return chordName;

  const root = match[1];
  const suffix = match[2];
  const common = useFlats && typeof useFlats === 'object' && useFlats.spelling === 'common';
  const rootSpelling = common ? (isMinorSuffix(suffix) ? 'common-minor' : 'common-major') : useFlats;
  const bassSpelling = common ? 'common-major' : useFlats;

  // Check for slash chord (e.g. Am/G)
  const slashIndex = suffix.indexOf('/');
  if (slashIndex !== -1) {
    const beforeSlash = suffix.slice(0, slashIndex);
    const bassNote = suffix.slice(slashIndex + 1);
    const bassMatch = bassNote.match(/^([A-G][#b]?)(.*)/);
    if (bassMatch) {
      const transposedRoot = transposeNote(root, semitones, rootSpelling);
      const transposedBass = transposeNote(bassMatch[1], semitones, bassSpelling);
      return transposedRoot + beforeSlash + '/' + transposedBass + bassMatch[2];
    }
  }

  return transposeNote(root, semitones, rootSpelling) + suffix;
}

/** Semitones needed to turn chord A's root into chord B's root (0..11). */
function semitonesBetween(fromChord, toChord) {
  const a = noteIndex((String(fromChord).match(CHORD_ROOT_RE) || [])[1]);
  const b = noteIndex((String(toChord).match(CHORD_ROOT_RE) || [])[1]);
  if (a === null || b === null) return null;
  return ((b - a) % 12 + 12) % 12;
}

/** Pick the smaller way round: +7 becomes -5, +6 stays +6. */
function nearestShift(semitones) {
  const s = ((semitones % 12) + 12) % 12;
  return s > 6 ? s - 12 : s;
}

/**
 * Transpose all chord nodes in an IR array.
 * Returns a new array with transposed chord content (does not mutate).
 */
// Tab moves too: each note keeps its string where it can; tab written for another
// instrument (guitar tab on a ukulele, say) is converted to options.instrument (src/tab.js)
function transposeTabNodes(irNodes, semitones, options) {
  const { transposeTab, convertTab } = require('./tab');
  return irNodes.map((node) => {
    if (node.type !== 'tab') return node;
    const result = options.instrument
      ? convertTab(node.content, options.instrument, { semitones })
      : transposeTab(node.content, semitones, {});
    if (result.text === node.content && !result.warnings.length) return node;
    return { ...node, content: result.text, warnings: [...(node.warnings || []), ...result.warnings] };
  });
}

function transposeIR(irNodes, semitones, options = {}) {
  if (options.tab !== false && irNodes.some((n) => n.type === 'tab') && (semitones !== 0 || options.instrument)) {
    irNodes = transposeTabNodes(irNodes, semitones, options);
  }
  if (semitones === 0) return irNodes;

  // spelling 'key': spell for the new key (needs options.key, the song's key); otherwise 'common'
  if (options.spelling === 'key' && options.key) {
    const { transposeChordInKey } = require('./keys');
    const common = (name, s) => transposeChord(name, s, { spelling: 'common' });
    return irNodes.map((node) => (node.type !== 'chord' || node.noChord ? node : {
      ...node,
      content: transposeChordInKey(node.content, semitones, options.key, common)
    }));
  }

  const useFlats = options.spelling === 'common' || options.spelling === 'key'
    ? { spelling: 'common' }
    : (options.preferFlats || semitones < 0);

  return irNodes.map((node) => {
    if (node.type !== 'chord' || node.noChord) return node;
    return {
      ...node,
      content: transposeChord(node.content, semitones, useFlats)
    };
  });
}

module.exports = {
  transposeChord,
  transposeIR,
  transposeNote,
  semitonesBetween,
  nearestShift,
  isMinorSuffix,
  noteIndex,
  CHORD_ROOT_RE
};
