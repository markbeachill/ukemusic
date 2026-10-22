// Song library: one folder per song inside a user-chosen songs folder.
//
//   <songs folder>/
//     Somewhere Over the Rainbow/
//       Somewhere Over the Rainbow-song.txt   <- the song (any file ending "-song.txt")
//       song.ini                              <- per-song settings (incl. saved versions)
//       notes.txt                             <- the user's notes + a dated history
//       exports/
//         Original/Somewhere Over the Rainbow.html
//         C to F (+5)/Somewhere Over the Rainbow (+5).pdf
//         Lyrics/Somewhere Over the Rainbow (lyrics).txt
//
// Pure Node (no Electron) so it can be unit tested.
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const { writeFileSafe, retryBusy, explain } = require('./safe-write');

const SONG_SUFFIX = '-song.txt';
const SONG_SETTINGS_FILE = 'song.ini';
const NOTES_FILE = 'notes.txt';
const EXPORTS_DIR = 'exports';
const MAX_TITLE_LENGTH = 100;

// What song.ini holds:
//   * song facts — always per song: its key shift, tempo, time signature, key, saved versions
//   * overrides — a song's own value for a setting whose default lives in the global settings.
//     Present = "custom for this song"; absent = "use the default". Defaults are never copied in.
const SONG_FACT_PATHS = [
  'song.artist',          // who it's by (shown and searched in the library)
  'song.year',            // when it was written or first recorded: 1848
  'song.writer',          // songwriters, if not the artist
  'song.album',           // album or collection
  'song.source',          // where it came from: a website, a book, a teacher
  'song.difficulty',      // beginner, intermediate or advanced
  'song.tags',            // "folk, singalong" (searched in the library)
  'song.licence',         // public-domain, own, permission or personal (4.25: what may be shared)
  'shapes.<instrument>',  // chord shapes chosen for this song: "Am 2000, F 2010" (src/shapes.js)
  'song.transpose',
  'song.tempo',
  'song.beats_per_bar',
  'song.key',
  'versions.list'
];
const SONG_OVERRIDE_PATHS = [
  'song.instrument',
  'export.layout',
  'export.markdown_rhythm_style',
  'rhythm.style',
  'rhythm.notation',
  'diagrams.enable',
  'diagrams.placement',
  'font.family',
  'font.size',
  'font.bold',
  'playback.default_strum',
  'playback.custom_strum',
  'playback.swing',        // 4.25: these two were lost when a song was saved
  'export.section_names',  // 4.25: the song's own export setting (show, small or hide)
  'export.stage_format',   // 4.29: the song's own Stage format (clear, brackets, compact, heavy)
  'export.stage_chorus',   // 4.30: Stage: repeated choruses in full (full) or once (once)
  'export.stage_diagrams'  // 4.32: Stage: chord diagrams as the song has them (song) or none
];
const SONG_SETTING_PATHS = [...SONG_FACT_PATHS, ...SONG_OVERRIDE_PATHS];
const SETTINGS_FORMAT = 2; // 1 = old song.ini with a copy of every default

const { INSTRUMENT_IDS: INSTRUMENTS } = require('./instruments');

// 4.31: Windows won't rename or move a folder while something in it is open (a PDF viewer,
// Explorer, the Exports-tab preview): try a few times, then say what to do
function renameBusy(from, to) {
  try {
    retryBusy(() => fs.renameSync(from, to));
  } catch (error) {
    if (['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) {
      throw new Error('Windows says something in this song\'s folder is in use. Close any of its files or folders (a PDF viewer, Explorer) and try again.');
    }
    throw error;
  }
}
const { detectKey } = require('./keys');
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
const ILLEGAL_CHARS = /[<>:"/\\|?*\u0000-\u001f]/;

// 4.31: words stay words: a source of "0123" or a tag of "true" isn't turned into a number or
// a yes/no (only settings that really are numbers or yes/no are converted)
const TEXT_KEYS = new Set(['artist', 'writer', 'album', 'source', 'tags', 'licence', 'title', 'list', 'custom_strum', 'family']);
function normalizeValue(value, key = '') {
  if (TEXT_KEYS.has(key) && typeof value !== 'object') return value === undefined || value === null ? value : String(value);
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeValue(v, k);
    return out;
  }
  return value;
}

function getPath(obj, dotted) {
  return dotted.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function setPath(obj, dotted, value) {
  const keys = dotted.split('.');
  let target = obj;
  for (const key of keys.slice(0, -1)) {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

function deletePath(obj, dotted) {
  const keys = dotted.split('.');
  const parent = keys.slice(0, -1).reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  if (parent && typeof parent === 'object') delete parent[keys[keys.length - 1]];
  // tidy empty sections
  if (parent && typeof parent === 'object' && !Object.keys(parent).length && keys.length > 1) deletePath(obj, keys.slice(0, -1).join('.'));
}

/**
 * Song-level settings from an object: all song facts (with their defaults) plus only the
 * overrides that are actually present.
 */
function pickSongSettings(config) {
  const out = {};
  const transpose = Number(getPath(config, 'song.transpose')) || 0;
  setPath(out, 'song.transpose', Math.max(-11, Math.min(11, Math.trunc(transpose))));
  const tempo = Number(getPath(config, 'song.tempo')) || 100;
  setPath(out, 'song.tempo', Math.max(40, Math.min(240, Math.round(tempo))));
  const beats = Number(getPath(config, 'song.beats_per_bar'));
  setPath(out, 'song.beats_per_bar', [2, 3, 4, 6].includes(beats) ? beats : 4);
  const key = String(getPath(config, 'song.key') || 'auto');
  setPath(out, 'song.key', /^(auto|[A-G][#b]?m?)$/.test(key) ? key : 'auto');
  const list = getPath(config, 'versions.list');
  setPath(out, 'versions.list', typeof list === 'string' ? list : '');
  // Artist and tags: only written when set
  const artist = String(getPath(config, 'song.artist') || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 120);
  if (artist) setPath(out, 'song.artist', artist);
  const year = normalizeYear(getPath(config, 'song.year'));
  if (year) setPath(out, 'song.year', year);
  for (const [key, max] of [['writer', 160], ['album', 160], ['source', 300]]) {
    const text = String(getPath(config, `song.${key}`) || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
    if (text) setPath(out, `song.${key}`, text);
  }
  const difficulty = String(getPath(config, 'song.difficulty') || '').toLowerCase();
  if (['beginner', 'intermediate', 'advanced'].includes(difficulty)) setPath(out, 'song.difficulty', difficulty);
  const tags = normalizeTags(getPath(config, 'song.tags'));
  if (tags) setPath(out, 'song.tags', tags);
  const licence = String(getPath(config, 'song.licence') || '').toLowerCase();
  if (['public-domain', 'own', 'permission', 'personal'].includes(licence)) setPath(out, 'song.licence', licence);
  // Chord shapes chosen for this song, per instrument
  for (const id of INSTRUMENTS) {
    const shapes = getPath(config, `shapes.${id}`);
    if (typeof shapes === 'string' && shapes.trim()) setPath(out, `shapes.${id}`, shapes.trim());
  }
  // Capo (0–11): only written when there is one
  const capo = Math.max(0, Math.min(11, Math.trunc(Number(getPath(config, 'song.capo')) || 0)));
  if (capo) setPath(out, 'song.capo', capo);

  for (const p of SONG_OVERRIDE_PATHS) {
    let value = getPath(config, p);
    if (value === undefined || value === null || value === '') continue;
    if (p === 'song.instrument' && !INSTRUMENTS.includes(value)) continue;
    if (p === 'rhythm.style' && !['comic', 'clean', 'compact', 'plain'].includes(value)) continue;
    if (p === 'playback.default_strum' && !['simple', 'island', 'custom'].includes(value) && !require('./strums').strum(value)) continue;
    if (p === 'export.section_names' && !['show', 'small', 'hide'].includes(value)) continue;
    if (p === 'export.stage_format' && !['clear', 'brackets', 'compact', 'heavy'].includes(value)) continue;
    if (p === 'export.stage_chorus' && !['full', 'once'].includes(value)) continue;
    if (p === 'export.stage_diagrams' && !['song', 'none'].includes(value)) continue;
    if (p === 'playback.swing' && !['auto', 'straight', 'light', 'swing', 'shuffle'].includes(value)) continue;
    if (p === 'playback.custom_strum') value = String(value).replace(/[^DUXdux>\- ↓↑✕]/g, '').trim() || undefined;
    if (p === 'font.size') value = Math.max(8, Math.min(40, Math.round(Number(value) || 0))) || undefined;
    if (p === 'font.bold') value = value === true || value === 'true';
    if (p === 'font.family') value = String(value).replace(/["<>;{}]/g, '').trim() || undefined;
    if (value !== undefined) setPath(out, p, value);
  }
  return out;
}

/** A year (1000–2199) from "1848", "c. 1848", "(1848)"; '' if there isn't one */
function normalizeYear(value) {
  const m = String(value ?? '').match(/\b(1\d{3}|2[01]\d{2})\b/);
  return m ? Number(m[1]) : '';
}

/** "Folk,  singalong ,folk" -> "folk, singalong" (lower case, no repeats) */
function normalizeTags(value) {
  const seen = [];
  for (const tag of String(value || '').split(/[,;]+/)) {
    const t = tag.replace(/[\r\n]+/g, ' ').trim().toLowerCase().slice(0, 40);
    if (t && !seen.includes(t)) seen.push(t);
  }
  return seen.join(', ');
}

function cleanTitle(title) {
  return String(title || '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
}

function listFolderNames(songsFolder) {
  try {
    return fs.readdirSync(songsFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (_err) {
    return [];
  }
}

/**
 * Check a proposed song title. Returns { ok: true, title } or { ok: false, error }.
 * Rejects empty, "untitled…", characters Windows can't use, reserved names,
 * and any title whose folder already exists (case-insensitive, as on Windows).
 */
function validateSongTitle(rawTitle, songsFolder) {
  const title = cleanTitle(rawTitle);
  if (!title) return { ok: false, error: 'Please enter a song title.' };
  if (/^untitled\b/i.test(title)) return { ok: false, error: '"Untitled" isn\'t allowed — please give the song a real title.' };
  if (ILLEGAL_CHARS.test(title)) return { ok: false, error: 'Titles can\'t contain any of these characters: < > : " / \\ | ? *' };
  if (WINDOWS_RESERVED.test(title)) return { ok: false, error: `"${title}" is a name Windows reserves — please choose another.` };
  if (title.length > MAX_TITLE_LENGTH) return { ok: false, error: `Titles can be at most ${MAX_TITLE_LENGTH} characters.` };
  if ([EXPORTS_DIR, 'setlists', 'archived songs', '.history'].includes(title.toLowerCase())) return { ok: false, error: 'Please choose another title.' };
  if (songsFolder) {
    const clash = listFolderNames(songsFolder).find((name) => name.toLowerCase() === title.toLowerCase());
    if (clash) return { ok: false, error: `There's already a song folder called "${clash}".` };
  }
  return { ok: true, title };
}

/** The song file in a folder: any file ending "-song.txt" (first alphabetically if several). */
function findSongFile(folder) {
  try {
    const matches = fs.readdirSync(folder, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(SONG_SUFFIX))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
    return matches.length ? path.join(folder, matches[0]) : null;
  } catch (_err) {
    return null;
  }
}

function songInfo(folder) {
  return {
    title: path.basename(folder),
    folder,
    songFile: findSongFile(folder),
    exportsFolder: path.join(folder, EXPORTS_DIR)
  };
}

/** The chord names in a song's text, in order: [C], [G7]… (not [[Section]] labels). */
function chordsInText(text) {
  const names = [];
  for (const match of String(text || '').matchAll(/(?<!\[)\[([^\[\]\n]+)\](?!\])/g)) {
    const name = match[1].trim();
    if (name) names.push(name);
  }
  return names;
}

/** Saved versions in other keys, each with the key it's in (when the song's key is known) */
function songVersions(settings, content) {
  const { parseVersions } = require('./versions');
  const { parseKey, transposeKey } = require('./keys');
  const keyName = songKeyName(settings, content);
  const key = keyName ? parseKey(keyName) : null;
  return parseVersions(getPath(settings || {}, 'versions.list') || '').map((v) => ({
    semitones: v.semitones,
    name: v.name,
    key: key ? transposeKey(key, v.semitones).name : ''
  }));
}

/** Rename a song: its folder and song file. Returns the song (readSong) under its new name. */
function renameSong(folder, rawTitle) {
  const songsFolder = path.dirname(folder);
  const oldTitle = path.basename(folder);
  const wanted = cleanTitle(rawTitle);
  const caseOnly = wanted !== oldTitle && wanted.toLowerCase() === oldTitle.toLowerCase();
  const check = validateSongTitle(rawTitle, songsFolder);
  if (!check.ok && !caseOnly) throw new Error(check.error);
  const title = check.ok ? check.title : wanted;
  if (title === oldTitle) return readSong(folder);
  const target = path.join(songsFolder, title);
  const songFile = findSongFile(folder);
  if (caseOnly) {
    // Windows ignores case in names: go via a temporary name
    const temp = path.join(songsFolder, `${title}.renaming-${Date.now()}`);
    renameBusy(folder, temp);
    renameBusy(temp, target);
  } else {
    renameBusy(folder, target);
  }
  if (songFile) renameBusy(path.join(target, path.basename(songFile)), path.join(target, `${title}${SONG_SUFFIX}`));
  appendNoteLine(target, `Renamed from "${oldTitle}"`);
  return readSong(target);
}

/**
 * A song's key for the library list: the key set in song.ini, or else guessed from its chords
 * ("G", "Em"); '' if there are no chords.
 */
function songKeyName(settings, content) {
  const set = getPath(settings || {}, 'song.key');
  if (set && set !== 'auto') return String(set);
  return detectKey(chordsInText(content))?.name || '';
}

/**
 * All songs in the songs folder (sub-folders that contain a "-song.txt" file), sorted by title.
 * Each has its title, folders, when it last changed, its key, its own instrument (null when it
 * follows the default) and whether it's one of the starter songs.
 */
function listSongs(songsFolder) {
  return listFolderNames(songsFolder)
    .map((name) => songInfo(path.join(songsFolder, name)))
    .filter((song) => song.songFile)
    .map((song) => {
      const settings = readSongSettings(song.folder) || {};
      let content = '';
      try {
        content = fs.readFileSync(song.songFile, 'utf8');
      } catch (_err) {
        // unreadable: listed without a key
      }
      return {
        ...song,
        modified: fs.statSync(song.songFile).mtimeMs,
        key: songKeyName(settings, content),
        instrument: getPath(settings, 'song.instrument') || null,
        artist: getPath(settings, 'song.artist') || '',
        year: getPath(settings, 'song.year') || '',
        writer: getPath(settings, 'song.writer') || '',
        album: getPath(settings, 'song.album') || '',
        source: getPath(settings, 'song.source') || '',
        difficulty: getPath(settings, 'song.difficulty') || '',
        tags: getPath(settings, 'song.tags') || '',
        licence: getPath(settings, 'song.licence') || '',
        starter: /^Starter song: /m.test(readNotes(song.folder)),
        // the song's saved keys: [{ semitones, name: 'C to F (+5)', key: 'F' }]
        versions: songVersions(settings, content)
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

/** song.ini -> settings; settings.song.settings_format tells old (1) from current (2) files. */
function readSongSettings(folder) {
  let text;
  try {
    text = fs.readFileSync(path.join(folder, SONG_SETTINGS_FILE), 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null; // no song.ini yet: caller uses general defaults
    // 4.31: any other problem (locked by OneDrive or antivirus…) is reported, never treated as
    // "no settings" — that used to replace the song's settings with blank ones
    throw new Error(`This song's settings (song.ini) can't be read: ${explain(error, 'song.ini')}`);
  }
  const raw = normalizeValue(ini.parse(text));
  const picked = pickSongSettings(raw);
  picked.song.settings_format = Number(getPath(raw, 'song.settings_format')) || 1;
  return picked;
}

function writeSongSettings(folder, settings) {
  const picked = pickSongSettings(settings);
  picked.song.settings_format = SETTINGS_FORMAT;
  // 4.31: anything in song.ini that this version doesn't know about is kept (added by a newer
  // version, or by hand), rather than dropped on every save
  const file = path.join(folder, SONG_SETTINGS_FILE);
  let kept = {};
  try {
    kept = ini.parse(fs.readFileSync(file, 'utf8'));
  } catch (_e) {
    kept = {};
  }
  for (const p of SONG_SETTING_PATHS) {
    if (p.startsWith('shapes.')) { for (const id of INSTRUMENTS) deletePath(kept, `shapes.${id}`); } else deletePath(kept, p);
  }
  for (const p of ['song.capo', 'song.settings_format']) deletePath(kept, p);
  const out = mergeObjects(kept, picked);
  const header = '; ukemusic song settings: this song\'s facts (key, tempo, versions…) plus any setting\n'
    + '; you made custom for this song. Anything not listed here uses the global default.\n';
  writeFileSafe(file, header + ini.stringify(out, { whitespace: true }));
  return picked;
}

/** b's values over a's, section by section (for song.ini) */
function mergeObjects(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && a[k] && typeof a[k] === 'object' ? mergeObjects(a[k], v) : v;
  }
  for (const [k, v] of Object.entries(out)) if (v && typeof v === 'object' && !Object.keys(v).length) delete out[k];
  return out;
}

/** Create a new song folder. Fails if the title is invalid or the folder already exists. */
function createSong(songsFolder, rawTitle, content, settings) {
  if (!songsFolder || !fs.existsSync(songsFolder)) throw new Error('The songs folder does not exist. Choose one in Settings.');
  const check = validateSongTitle(rawTitle, songsFolder);
  if (!check.ok) throw new Error(check.error);
  const folder = path.join(songsFolder, check.title);
  fs.mkdirSync(folder); // not recursive: throws EEXIST if another process created it meanwhile
  fs.mkdirSync(path.join(folder, EXPORTS_DIR));
  const songFile = path.join(folder, `${check.title}${SONG_SUFFIX}`);
  fs.writeFileSync(songFile, String(content || ''), 'utf8');
  writeSongSettings(folder, settings || {});
  // The song's facts (artist, key, capo, source…) are fields (song.ini); the notes are for notes
  writeNotes(folder, `${check.title}\n\n\nHistory\n${today()}  Song created\n`);
  return readSong(folder);
}

function readSong(folder) {
  const info = songInfo(folder);
  if (!info.songFile) throw new Error(`No "*${SONG_SUFFIX}" file found in ${folder}`);
  return {
    ...info,
    content: fs.readFileSync(info.songFile, 'utf8'),
    settings: readSongSettings(folder),
    notes: readNotes(folder),
    links: require('./links').readLinks(folder),
    chordPro: readChordPro(folder)
  };
}

// 4.27: the song's ChordPro fields (its ChordPro tab), as ChordPro lines in chordpro.txt
const CHORDPRO_FILE = 'chordpro.txt';
function readChordPro(folder) {
  try {
    return fs.readFileSync(path.join(folder, CHORDPRO_FILE), 'utf8');
  } catch (_err) {
    return '';
  }
}
function writeChordPro(folder, text) {
  if (!folder || !fs.existsSync(folder)) throw new Error('Save the song first.');
  const file = path.join(folder, CHORDPRO_FILE);
  const clean = String(text || '').replace(/\r\n?/g, '\n');
  if (!clean.trim()) { if (fs.existsSync(file)) fs.unlinkSync(file); return ''; }
  writeFileSafe(file, clean.endsWith('\n') ? clean : `${clean}\n`);
  return readChordPro(folder);
}

// 4.31: each save keeps the song as it was in the song's .history folder (the last 20), so a
// slip that's saved can always be undone: Notes → History, or the files themselves
const HISTORY_DIR = '.history';
const HISTORY_KEEP = 20;
function stamp(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}${p(date.getMinutes())}`;
}
function keepHistory(songFile, previous) {
  const dir = path.join(path.dirname(songFile), HISTORY_DIR);
  fs.mkdirSync(dir, { recursive: true });
  const title = path.basename(songFile).slice(0, -SONG_SUFFIX.length);
  fs.writeFileSync(path.join(dir, `${title} ${stamp()}.txt`), previous, 'utf8');
  const old = fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort();
  for (const f of old.slice(0, Math.max(0, old.length - HISTORY_KEEP))) fs.rmSync(path.join(dir, f), { force: true });
}
/** Earlier versions of a song: [{ file, name, when }], newest first */
function songHistory(folder) {
  const dir = path.join(folder || '', HISTORY_DIR);
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.txt')).sort().reverse()
      .map((f) => ({ file: path.join(dir, f), name: f, when: (f.match(/(\d{4}-\d\d-\d\d \d{4})\.txt$/) || [])[1] || '' }));
  } catch (_e) {
    return [];
  }
}

/**
 * Save the song's text. Refuses (error code EMPTYSAVE) to write an empty song over one that
 * has words in it, unless allowEmpty; keeps the text it replaces in .history.
 */
function saveSong(songFile, content, { allowEmpty = false } = {}) {
  if (!songFile || !songFile.toLowerCase().endsWith(SONG_SUFFIX)) throw new Error('Not a song file: ' + songFile);
  if (typeof content !== 'string') throw new Error('Nothing to save (the song text is missing).');
  let previous = null;
  try {
    previous = fs.readFileSync(songFile, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const blank = (t) => !String(t || '').replace(/--(START|END) MUSIC--/g, '').trim();
  if (!allowEmpty && previous !== null && blank(content) && !blank(previous)) {
    const error = new Error('The song is now empty. Save it empty anyway?');
    error.code = 'EMPTYSAVE';
    throw error;
  }
  if (previous !== null && previous !== content && previous.trim()) {
    try { keepHistory(songFile, previous); } catch (_e) { /* history is a bonus: never stop a save */ }
  }
  writeFileSafe(songFile, content);
  return songFile;
}

/**
 * Export names carry the instrument's code, so files for different instruments never mix:
 *   "Song_uke.html", "Song (+2)_bar.pdf", "Song (-3, capo 2)_gtr.md".
 * instrument: null leaves the code off (lyrics are the same on every instrument).
 */
function exportFileName(title, { instrument = 'soprano', transpose = 0, capo = 0 } = {}, extension = 'html') {
  const { instrument: profile } = require('./instruments');
  const tags = [];
  const t = Number(transpose) || 0;
  if (t !== 0) tags.push(t > 0 ? `+${t}` : String(t));
  const c = Number(capo) || 0;
  if (c > 0) tags.push(`capo ${c}`);
  const code = instrument === null ? '' : `_${profile(instrument).code}`;
  return `${title}${tags.length ? ` (${tags.join(', ')})` : ''}${code}.${extension}`;
}

/** Write into exports/<subfolder>/<fileName>. Content may be text or binary (PDF). */
function writeExport(folder, fileName, content, subfolder = '') {
  if (ILLEGAL_CHARS.test(fileName)) throw new Error('Invalid export file name: ' + fileName);
  if (subfolder && (ILLEGAL_CHARS.test(subfolder) || subfolder === '.' || subfolder === '..')) {
    throw new Error('Invalid export folder name: ' + subfolder);
  }
  const exportsFolder = path.join(folder, EXPORTS_DIR, subfolder || '');
  fs.mkdirSync(exportsFolder, { recursive: true });
  const target = path.join(exportsFolder, fileName);
  if (content instanceof Uint8Array) {
    fs.writeFileSync(target, content);
  } else {
    fs.writeFileSync(target, String(content || ''), 'utf8');
  }
  return target;
}

/**
 * 4.19: exports/Original is now exports/Song, and the Stage copies live in exports/Stage.
 * Brings an older song's exports folder into line (once; nothing is deleted).
 * Returns the number of things moved.
 */
function migrateExportFolders(folder) {
  const root = path.join(folder, EXPORTS_DIR);
  if (!fs.existsSync(root)) return 0;
  let moved = 0;
  const original = path.join(root, 'Original');
  const song = path.join(root, 'Song');
  if (fs.existsSync(original) && !fs.existsSync(song)) {
    fs.renameSync(original, song);
    moved += 1;
  }
  const stage = path.join(root, 'Stage');
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'Stage') continue;
    const dir = path.join(root, entry.name);
    for (const f of fs.readdirSync(dir)) {
      if (!/ \(stage\)\.[^.]+$/.test(f)) continue;
      fs.mkdirSync(stage, { recursive: true });
      const target = path.join(stage, f);
      if (fs.existsSync(target)) fs.rmSync(target);
      fs.renameSync(path.join(dir, f), target);
      moved += 1;
    }
  }
  return moved;
}

// ── Archive (4.21): a song put away goes into "Archived songs" in the songs folder, from
// where it can come back (or be deleted for good). It drops out of the song list and setlists
// show it as missing until it's back.
const ARCHIVE_DIR = 'Archived songs';

/** A free name in a folder: "Rainbow", then "Rainbow (2)"… */
function freeName(parent, name) {
  let candidate = name;
  for (let n = 2; fs.existsSync(path.join(parent, candidate)); n += 1) candidate = `${name} (${n})`;
  return candidate;
}

/** Move a song folder into the archive; returns { folder } (where it is now) */
function archiveSong(folder) {
  if (!folder || !fs.existsSync(folder)) throw new Error('That song\'s folder is missing');
  const songsFolder = path.dirname(folder);
  const archive = path.join(songsFolder, ARCHIVE_DIR);
  fs.mkdirSync(archive, { recursive: true });
  const target = path.join(archive, freeName(archive, path.basename(folder)));
  renameBusy(folder, target);
  return { folder: target };
}

/** The archived songs: [{ title, folder, archived (ms) }], newest first */
function listArchived(songsFolder) {
  const archive = path.join(songsFolder || '', ARCHIVE_DIR);
  return listFolderNames(archive)
    .map((name) => songInfo(path.join(archive, name)))
    .filter((song) => song.songFile)
    .map((song) => ({ title: song.title, folder: song.folder, archived: fs.statSync(song.folder).mtimeMs }))
    .sort((a, b) => b.archived - a.archived);
}

/** Bring an archived song back; its name must be free in the songs folder */
function restoreSong(folder) {
  if (!folder || !fs.existsSync(folder)) throw new Error('That archived song is missing');
  const songsFolder = path.dirname(path.dirname(folder));
  const target = path.join(songsFolder, path.basename(folder));
  if (fs.existsSync(target)) throw new Error(`There's already a song called "${path.basename(folder)}". Rename that one first.`);
  renameBusy(folder, target);
  return { folder: target };
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readNotes(folder) {
  try {
    return fs.readFileSync(path.join(folder, NOTES_FILE), 'utf8');
  } catch (_err) {
    return '';
  }
}

function writeNotes(folder, text) {
  writeFileSafe(path.join(folder, NOTES_FILE), String(text || ''));
  return text;
}

/** Add a dated line to the end of the notes, e.g. "2026-10-07  Created version C to F (+5)". */
function appendNoteLine(folder, line) {
  const current = readNotes(folder);
  // 4.33: one "Exported …" line a day: a later export the same day replaces it
  if (/^Exported /.test(line)) {
    const lines = current.replace(/\n+$/, '').split('\n');
    const last = lines[lines.length - 1] || '';
    if (last.startsWith(`${today()}  Exported `)) {
      lines[lines.length - 1] = `${today()}  ${line}`;
      const next = `${lines.join('\n')}\n`;
      writeNotes(folder, next);
      return next;
    }
  }
  const next = `${current}${current && !current.endsWith('\n') ? '\n' : ''}${today()}  ${line}\n`;
  writeNotes(folder, next);
  return next;
}

/** Suggest a title from an imported file name: "rainbow-song.txt" -> "rainbow" */
function suggestTitleFromFile(filePath) {
  const base = path.basename(String(filePath || ''));
  return cleanTitle(base.replace(/-song\.txt$/i, '').replace(/\.(txt|md|cho|chordpro|chopro|crd|pro)$/i, ''));
}

module.exports = {
  HISTORY_DIR,
  songHistory,
  renameBusy,
  CHORDPRO_FILE,
  readChordPro,
  writeChordPro,
  ARCHIVE_DIR,
  freeName,
  listFolderNames,
  archiveSong,
  listArchived,
  restoreSong,
  migrateExportFolders,
  SONG_FACT_PATHS,
  SONG_OVERRIDE_PATHS,
  SETTINGS_FORMAT,
  getPath,
  setPath,
  deletePath,
  SONG_SUFFIX,
  SONG_SETTINGS_FILE,
  NOTES_FILE,
  EXPORTS_DIR,
  SONG_SETTING_PATHS,
  INSTRUMENTS,
  validateSongTitle,
  findSongFile,
  listSongs,
  renameSong,
  normalizeTags,
  normalizeYear,
  chordsInText,
  songKeyName,
  readSong,
  saveSong,
  createSong,
  readSongSettings,
  writeSongSettings,
  pickSongSettings,
  exportFileName,
  writeExport,
  readNotes,
  writeNotes,
  appendNoteLine,
  today,
  suggestTitleFromFile
};
