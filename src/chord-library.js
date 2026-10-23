const fs = require('fs');
const path = require('path');
const { getBundledResourcePath } = require('./resource-paths');
const { parseChordName } = require('./chord-names');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readJsonFileSafe(targetPath, fallback = null) {
  try {
    if (!targetPath || !fs.existsSync(targetPath)) {
      return fallback;
    }
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
}

function normalizeChordDefinition(name, definition = {}) {
  return {
    // 4 strings for ukuleles, 6 for guitar: keep however many the shape has
    frets: Array.isArray(definition.frets) ? definition.frets.slice(0, 12) : [0, 0, 0, 0],
    fingers: Array.isArray(definition.fingers) ? definition.fingers.slice(0, 12) : [0, 0, 0, 0],
    barre: definition.barre || null,
    base_fret: Number(definition.base_fret) > 0 ? Number(definition.base_fret) : 1,
    name: definition.name || name,
    ...(definition.custom ? { custom: true } : {})   // a shape the song chose (src/shapes.js)
  };
}

function mergeLibraries(baseLibrary, overrideLibrary) {
  const merged = clone(baseLibrary || { meta: {}, chords: {} });
  merged.meta = { ...(baseLibrary?.meta || {}), ...(overrideLibrary?.meta || {}) };
  merged.chords = { ...(baseLibrary?.chords || {}) };

  for (const [name, definition] of Object.entries(overrideLibrary?.chords || {})) {
    merged.chords[name] = normalizeChordDefinition(name, {
      ...(merged.chords[name] || {}),
      ...definition
    });
  }

  for (const [name, definition] of Object.entries(merged.chords)) {
    merged.chords[name] = normalizeChordDefinition(name, definition);
  }

  return merged;
}

// Each instrument has its own library (src/instruments.js): chords.json (ukulele, GCEA),
// chords-baritone.json (DGBE), chords-guitar.json (EADGBE).
// The same file name in the user's config folder overrides/extends the built-in library.
function libraryFileName(instrument = 'soprano') {
  return require('./instruments').instrument(instrument).library;
}

function getBuiltInLibraryPath(instrument = 'soprano') {
  const fileName = libraryFileName(instrument);
  return getBundledResourcePath(fileName) || path.join(__dirname, fileName);
}

function getBuiltInLibrary(instrument = 'soprano') {
  const loaded = readJsonFileSafe(getBuiltInLibraryPath(instrument), { meta: {}, chords: {} });
  return mergeLibraries({ meta: {}, chords: {} }, loaded);
}

function loadUserLibrary(configDirectory, instrument = 'soprano') {
  if (!configDirectory) {
    return null;
  }

  const userPath = path.join(configDirectory, libraryFileName(instrument));
  return readJsonFileSafe(userPath, null);
}

function loadChordLibrary(configDirectory, instrument = 'soprano') {
  const base = getBuiltInLibrary(instrument);
  const userLibrary = loadUserLibrary(configDirectory, instrument);
  return userLibrary ? mergeLibraries(base, userLibrary) : base;
}

const ENHARMONIC = {
  'C#': 'Db', Db: 'C#', 'D#': 'Eb', Eb: 'D#', 'F#': 'Gb', Gb: 'F#',
  'G#': 'Ab', Ab: 'G#', 'A#': 'Bb', Bb: 'A#', 'B#': 'C', Cb: 'B', 'E#': 'F', Fb: 'E'
};

// Names to try for a chord: as written; with the chord type in its usual form (CM7 -> Cmaj7,
// C° -> Cdim, Cø -> Cm7b5, C+ -> Caug, Csus -> Csus4); the other spelling of the root
// (A# <-> Bb); then without a slash bass (Am/G -> Am), since the upper shape is what's fingered.
function candidateNames(chordName) {
  const names = [];
  const add = (name) => {
    if (!names.includes(name)) names.push(name);
  };
  add(chordName);
  const parsed = parseChordName(chordName);
  if (!parsed) return names;
  const roots = [parsed.root, ENHARMONIC[parsed.root]].filter(Boolean);
  const suffixes = [parsed.suffix, parsed.canonicalSuffix];
  const bass = parsed.bass ? `/${parsed.bass}` : '';
  for (const root of roots) for (const suffix of suffixes) add(root + suffix + bass);
  if (bass) for (const root of roots) for (const suffix of suffixes) add(root + suffix);
  return names;
}

function getChordDefinition(library, chordName) {
  if (!library || !library.chords) {
    return null;
  }
  for (const name of candidateNames(chordName)) {
    const definition = library.chords[name];
    if (definition) return normalizeChordDefinition(chordName, { ...definition, name: chordName });
  }
  const power = powerChord(library, chordName);
  return power ? normalizeChordDefinition(chordName, power) : null;
}

// 4.34: power chords (C5: the root and the fifth, no third), worked out for the tuning, since the
// chord libraries have none. Ukulele GCEA and baritone DGBE share a shape: the root on the second
// string (C / G) with the fifth below it and both an octave up three frets higher.
const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function powerChord(library, chordName) {
  const m = String(chordName || '').match(/^([A-G][#b]?)5$/);
  if (!m || NOTE_INDEX[m[1]] === undefined) return null;
  const root = NOTE_INDEX[m[1]];
  const tuning = String(library?.meta?.tuning || 'GCEA').toUpperCase();
  const shape = (frets, fingers, barre) => {
    const played = frets.filter((f) => f > 0);
    const low = played.length ? Math.min(...played) : 1;
    return { name: chordName, frets, fingers, barre, base_fret: Math.max(...frets) > 4 ? low : 1 };
  };
  if (tuning === 'EADGBE') {
    const r = (root - 4 + 12) % 12;             // root on the low E string
    if (r === 0) return shape([0, 2, 2, -1, -1, -1], [0, 1, 2, 0, 0, 0], null);
    if (r <= 7) return shape([r, r + 2, r + 2, -1, -1, -1], [1, 3, 4, 0, 0, 0], null);
    const a = (root - 9 + 12) % 12;             // or on the A string
    return shape([-1, a, a + 2, a + 2, -1, -1], [0, 1, 3, 4, 0, 0], null);
  }
  // Two shapes; the one lower on the neck is used.
  //   root on the 2nd string (C on a ukulele, G on a baritone): r r r+3 r+3
  //   root on the 1st string (G on a ukulele, D on a baritone): g g+2 g+3 g+5
  const baritone = tuning === 'DGBE';
  const r = (root - (baritone ? 7 : 0) + 12) % 12;
  const g = (root - (baritone ? 2 : 7) + 12) % 12;
  if (r === 0) return shape([0, 0, 3, 3], [0, 0, 2, 3], null);
  if (g + 5 < r + 3) return shape([g, g + 2, g + 3, g + 5], g === 0 ? [0, 1, 2, 4] : [1, 2, 3, 4], null);
  return shape([r, r, r + 3, r + 3], [1, 1, 3, 4], { fret: r, strings: [0, 1] });
}

module.exports = {
  candidateNames,
  libraryFileName,
  getBuiltInLibrary,
  getBuiltInLibraryPath,
  mergeLibraries,
  loadChordLibrary,
  getChordDefinition,
  normalizeChordDefinition
};
