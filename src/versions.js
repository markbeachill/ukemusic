// Transposed versions of a song.
//
// A version is just a rule, "chord <from> becomes <to>", i.e. a semitone shift.
// The song text is never copied, so editing the song updates every version.
// Stored in song.ini as  [versions] list = 5:C:F,-2:G:F
const { transposeChord, semitonesBetween, nearestShift, CHORD_ROOT_RE } = require('./transpose');
const { transposeChordInKey } = require('./keys');

const ORIGINAL_FOLDER = 'Song'; // 4.19: was "Original"
const SPELLING = { spelling: 'common' };

// Chords many players find awkward. Used only for hints when choosing a new key.
const HARDER_CHORDS = {
  soprano: ['E', 'Eb', 'Ab', 'Db', 'B', 'Bb', 'F#', 'C#', 'Ebm', 'D#m', 'Bbm', 'A#m', 'G#m', 'Abm', 'Gb', 'Dbm'],
  baritone: ['F', 'Bb', 'Eb', 'Ab', 'Db', 'B', 'F#', 'C#', 'Gb', 'Fm', 'Bbm', 'A#m', 'Ebm', 'D#m', 'G#m', 'Abm', 'F#m', 'Dbm']
};

function signed(n) {
  return n > 0 ? `+${n}` : String(n);
}

// Chord names in version labels/folders: drop any slash bass, keep root + quality.
function shortChord(name) {
  return String(name || '').split('/')[0];
}

function versionName(version) {
  return `${shortChord(version.from)} to ${shortChord(version.to)} (${signed(version.semitones)})`;
}

function parseVersions(value) {
  if (!value || typeof value !== 'string') return [];
  const seen = new Set();
  const out = [];
  for (const part of value.split(',')) {
    const [s, from, to] = part.trim().split(':');
    const semitones = Number(s);
    if (!Number.isInteger(semitones) || semitones === 0 || semitones < -11 || semitones > 11) continue;
    if (!from || !to || seen.has(semitones)) continue;
    seen.add(semitones);
    out.push({ semitones, from: from.trim(), to: to.trim() });
  }
  return out.map((v) => ({ ...v, name: versionName(v) }));
}

function formatVersions(list) {
  return (list || []).map((v) => `${v.semitones}:${shortChord(v.from)}:${shortChord(v.to)}`).join(',');
}

/** Folder under exports/ for a given shift: "Song" (the song as written) or the saved version's name. */
function versionFolder(semitones, versions) {
  if (!semitones) return ORIGINAL_FOLDER;
  const saved = (versions || []).find((v) => v.semitones === semitones);
  return saved ? saved.name : `Shift ${signed(semitones)}`;
}

/** Distinct chords in the order they first appear. */
function songChords(irNodes) {
  const seen = new Set();
  const out = [];
  for (const node of irNodes || []) {
    if (node.type === 'chord' && !node.noChord && !seen.has(node.content)) {
      seen.add(node.content);
      out.push(node.content);
    }
  }
  return out;
}

// key (optional): the song's key, so names are spelled for the new key (C# in A, Db in Ab)
function transposeName(chord, semitones, key = null) {
  if (key) {
    const common = (name, s) => transposeChord(name, s, SPELLING);
    return transposeChordInKey(chord, semitones, key, common);
  }
  return transposeChord(chord, semitones, SPELLING);
}

function chordMap(chords, semitones, key = null) {
  return chords.map((chord) => ({ from: chord, to: transposeName(chord, semitones, key) }));
}

// 7th/6th/sus chords that are easy shapes even where the plain major is awkward
const EASY_EXTENDED = {
  soprano: ['C7', 'D7', 'E7', 'F7', 'G7', 'A7', 'B7', 'Bb7', 'Cmaj7', 'Fmaj7', 'Gmaj7', 'Dsus4', 'Gsus4', 'Asus4', 'Csus4'],
  baritone: ['C7', 'D7', 'E7', 'G7', 'A7', 'B7', 'Cmaj7', 'Dmaj7', 'Gmaj7', 'Dsus4', 'Asus4', 'Esus4']
};

function isHarder(chord, instrument) {
  const key = HARDER_CHORDS[instrument] ? instrument : 'soprano';
  const name = shortChord(chord);
  if (HARDER_CHORDS[key].includes(name)) return true;
  if (EASY_EXTENDED[key].includes(name)) return false;
  const extended = name.match(/^([A-G][#b]?m?)(7|maj7|m7|6|9|sus2|sus4|add9)$/);
  return Boolean(extended && HARDER_CHORDS[key].includes(extended[1]));
}

/**
 * All 11 possible targets for "chord <from> becomes …", each with the full chord map
 * and hints about harder chords / chords with no diagram.
 *   hasDiagram(chordName) -> boolean   (optional)
 */
function targetOptions(fromChord, chords, instrument = 'soprano', hasDiagram = null, key = null) {
  const options = [];
  for (let step = 1; step <= 11; step += 1) {
    const semitones = nearestShift(step);
    const to = transposeName(fromChord, semitones, key);
    const map = chordMap(chords, semitones, key);
    const harder = map.map((m) => m.to).filter((c) => isHarder(c, instrument));
    const noDiagram = hasDiagram ? map.map((m) => m.to).filter((c) => !hasDiagram(c)) : [];
    options.push({ semitones, from: shortChord(fromChord), to: shortChord(to), map, harder, noDiagram });
  }
  return options.sort((a, b) => a.semitones - b.semitones);
}

function makeVersion(fromChord, toChord) {
  const raw = semitonesBetween(fromChord, toChord);
  if (raw === null || raw === 0) return null;
  const semitones = nearestShift(raw);
  const version = { semitones, from: shortChord(fromChord), to: shortChord(toChord) };
  return { ...version, name: versionName(version) };
}

/** Add (or replace the same shift) and keep the list sorted by shift. */
function addVersion(list, version) {
  return [...(list || []).filter((v) => v.semitones !== version.semitones), version]
    .sort((a, b) => a.semitones - b.semitones);
}

function removeVersion(list, semitones) {
  return (list || []).filter((v) => v.semitones !== semitones);
}

/** A version for a shift using the song's first chord as the reference (used when exporting an unsaved key). */
function versionFromShift(semitones, chords, key = null) {
  const reference = (chords || []).find((c) => CHORD_ROOT_RE.test(c)) || 'C';
  return makeVersion(reference, transposeName(reference, semitones, key));
}

module.exports = {
  ORIGINAL_FOLDER,
  HARDER_CHORDS,
  versionName,
  parseVersions,
  formatVersions,
  versionFolder,
  songChords,
  transposeName,
  chordMap,
  isHarder,
  targetOptions,
  makeVersion,
  addVersion,
  removeVersion,
  versionFromShift
};
