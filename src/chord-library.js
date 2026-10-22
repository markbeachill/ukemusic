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
  return null;
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
