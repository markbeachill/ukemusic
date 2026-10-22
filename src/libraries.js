// Libraries (4.25), as in Calibre: each library is a folder of songs with its own setlists and
// archive, and a library.ini saying what it is (name, description, who made it, licence).
// Songs can be copied or moved between libraries, and a library can be shared as a library
// pack: one .ukelib file (a plain zip) that opens as a new library or adds to one.
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const songs = require('./song-library');
const { writeZip, readZip } = require('./zip');

const LIBRARY_FILE = 'library.ini';
const PACK_EXTENSION = '.ukelib';
const SETLISTS_DIR = 'Setlists';
// What each song may be: the first three can be shared in a pack without a second thought
const LICENCES = {
  'public-domain': 'Public domain',
  own: 'My own song',
  permission: 'Shared with permission',
  personal: 'Copyrighted: for my own use'
};
const SHAREABLE = ['public-domain', 'own', 'permission'];
// Files that travel with a song (exports are made again from the song; notes only if asked)
const SONG_FILES = /(-song\.txt|^song\.ini|^links\.txt|^chordpro\.txt)$/i;

const oneLine = (text, max) => String(text || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

/** library.ini -> { name, description, author, licence, created } (the name defaults to the folder's) */
function readInfo(folder) {
  let raw = {};
  try {
    raw = ini.parse(fs.readFileSync(path.join(folder, LIBRARY_FILE), 'utf8')).library || {};
  } catch (_err) {
    // no library.ini: an ordinary songs folder
  }
  return {
    name: oneLine(raw.name, 80) || path.basename(String(folder || '')) || 'Songs',
    description: String(raw.description || '').replace(/\\n/g, '\n').trim().slice(0, 1000),
    author: oneLine(raw.author, 120),
    licence: oneLine(raw.licence, 120),
    created: oneLine(raw.created, 20)
  };
}

function writeInfo(folder, info = {}) {
  const current = readInfo(folder);
  const next = { ...current, ...info };
  const library = {
    name: oneLine(next.name, 80) || path.basename(folder),
    description: String(next.description || '').trim().slice(0, 1000).replace(/\r?\n/g, '\\n'),
    author: oneLine(next.author, 120),
    licence: oneLine(next.licence, 120),
    created: next.created || new Date().toISOString().slice(0, 10)
  };
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, LIBRARY_FILE), ini.stringify({ library }), 'utf8');
  return readInfo(folder);
}

/** "C:\a|D:\b" (as kept in config.ini) <-> ['C:\a', 'D:\b'], no blanks or repeats */
function parseList(text) {
  const seen = new Set();
  return String(text || '').split('|').map((x) => x.trim()).filter((x) => {
    const k = x.toLowerCase();
    if (!x || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
const formatList = (list) => parseList((list || []).join('|')).join('|');

/** The song folders in a library */
function songFolders(folder) {
  return songs.listFolderNames(folder)
    .filter((name) => songs.findSongFile(path.join(folder, name)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/** [{ path, exists, name, description, author, licence, count }] for the libraries in the list */
function listLibraries(paths) {
  return parseList(Array.isArray(paths) ? paths.join('|') : paths).map((p) => {
    const exists = fs.existsSync(p);
    return { path: p, exists, ...readInfo(p), count: exists ? songFolders(p).length : 0 };
  });
}

/** A new, empty library: a folder in parent named after it, with its library.ini */
function createLibrary(parent, name, info = {}) {
  const clean = String(name || '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
  if (!clean) throw new Error('Please give the library a name.');
  if (/[<>:"/\\|?*]/.test(clean)) throw new Error('Library names can\'t contain any of these characters: < > : " / \\ | ? *');
  if (!parent || !fs.existsSync(parent)) throw new Error('Choose where to keep the library first.');
  const folder = path.join(parent, songs.freeName(parent, clean));
  fs.mkdirSync(folder, { recursive: true });
  writeInfo(folder, { ...info, name: clean });
  return folder;
}

function copyFolder(from, to, { skip = () => false } = {}) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (skip(entry)) continue;
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyFolder(a, b);
    else if (entry.isFile()) fs.copyFileSync(a, b);
  }
}

/** Rename a copied song's file to match its new folder name ("Rainbow (2)-song.txt") */
function matchSongFile(folder) {
  const file = songs.findSongFile(folder);
  const wanted = path.join(folder, `${path.basename(folder)}-song.txt`);
  if (file && file !== wanted && !fs.existsSync(wanted)) fs.renameSync(file, wanted);
}

/**
 * Copy (or move) a song into another library. A song of the same name there: { clash: name }
 * unless keepBoth (then "Rainbow (2)"). Copies leave the exports behind (make them again
 * there); a move takes everything.
 */
function copySong(songFolder, library, { move = false, keepBoth = false } = {}) {
  if (!songFolder || !songs.findSongFile(songFolder)) throw new Error('That song\'s folder is missing.');
  if (!library || !fs.existsSync(library)) throw new Error('That library\'s folder is missing.');
  if (path.resolve(path.dirname(songFolder)).toLowerCase() === path.resolve(library).toLowerCase()) throw new Error('The song is already in that library.');
  const name = path.basename(songFolder);
  const clash = songs.listFolderNames(library).find((n) => n.toLowerCase() === name.toLowerCase());
  if (clash && !keepBoth) return { clash };
  const target = path.join(library, clash ? songs.freeName(library, name) : name);
  if (move) {
    try {
      songs.renameBusy(songFolder, target);
    } catch (err) { // another drive: copy, then remove
      if (err.code !== 'EXDEV') throw err;
      copyFolder(songFolder, target);
      fs.rmSync(songFolder, { recursive: true, force: true });
    }
  } else {
    copyFolder(songFolder, target, { skip: (e) => e.isDirectory() && ['exports', '.history'].includes(e.name.toLowerCase()) });
  }
  matchSongFile(target);
  return { folder: target };
}

/** Songs in a library that aren't marked as fine to share: [{ title, licence }] */
function licenceCheck(library, names = null) {
  return (names || songFolders(library)).map((name) => {
    const settings = songs.readSongSettings(path.join(library, name)) || {};
    const licence = String(settings.song?.licence || '');
    return { title: name, licence };
  }).filter((s) => !SHAREABLE.includes(s.licence));
}

/**
 * A library pack: library.ini, songs/<Title>/… (the song, its song.ini and links; notes if
 * asked) and the setlists. Returns { file, songs: n }.
 */
function exportPack(library, file, { names = null, notes = false, setlists = true } = {}) {
  const chosen = names || songFolders(library);
  const entries = [];
  const info = readInfo(library);
  entries.push({ name: LIBRARY_FILE, data: ini.stringify({ library: { ...info, description: info.description.replace(/\r?\n/g, '\\n') }, pack: { format: 1, made: new Date().toISOString().slice(0, 10), songs: chosen.length } }) });
  for (const name of chosen) {
    const folder = path.join(library, name);
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!SONG_FILES.test(entry.name) && !(notes && entry.name.toLowerCase() === 'notes.txt')) continue;
      entries.push({ name: `songs/${name}/${entry.name}`, data: fs.readFileSync(path.join(folder, entry.name)) });
    }
  }
  if (setlists) {
    const dir = path.join(library, SETLISTS_DIR);
    for (const n of (fs.existsSync(dir) ? fs.readdirSync(dir) : []).filter((x) => /\.txt$/i.test(x))) {
      entries.push({ name: `${SETLISTS_DIR}/${n}`, data: fs.readFileSync(path.join(dir, n)) });
    }
  }
  const out = /\.(ukelib|zip)$/i.test(file) ? file : `${file}${PACK_EXTENSION}`;
  fs.writeFileSync(out, writeZip(entries));
  return { file: out, songs: chosen.length };
}

// Only these, and nothing that climbs out of the library folder
const safePart = (p) => p && p !== '.' && p !== '..' && !/[<>:"|?*\\]/.test(p);
function packFiles(file) {
  const entries = readZip(fs.readFileSync(file));
  const songsIn = new Map();
  let info = null;
  const setlists = [];
  for (const e of entries) {
    const parts = e.name.split('/');
    if (e.name === LIBRARY_FILE) {
      const parsed = ini.parse(e.data.toString('utf8'));
      info = { ...(parsed.library || {}), description: String(parsed.library?.description || '').replace(/\\n/g, '\n') };
    } else if (parts.length === 3 && parts[0] === 'songs' && parts.every(safePart)) {
      if (!songsIn.has(parts[1])) songsIn.set(parts[1], []);
      songsIn.get(parts[1]).push({ name: parts[2], data: e.data });
    } else if (parts.length === 2 && parts[0] === SETLISTS_DIR && safePart(parts[1]) && /\.txt$/i.test(parts[1])) {
      setlists.push({ name: parts[1], data: e.data });
    }
  }
  const songList = [...songsIn.entries()].filter(([, files]) => files.some((f) => /-song\.txt$/i.test(f.name)));
  if (!info && !songList.length) throw new Error('This isn\'t a ukemusic library pack.');
  return { info: { name: oneLine(info?.name, 80) || path.basename(file).replace(/\.(ukelib|zip)$/i, ''), description: info?.description || '', author: oneLine(info?.author, 120), licence: oneLine(info?.licence, 120) }, songs: songList, setlists };
}

/** What's in a pack, before opening it: { name, description, author, licence, titles } */
function readPack(file) {
  const p = packFiles(file);
  return { ...p.info, titles: p.songs.map(([t]) => t).sort((a, b) => a.localeCompare(b)) };
}

/**
 * Open a pack: as a new library in parent ({ into: null }), or adding its songs to a library
 * ({ into: folder }; songs it already has are left alone). Returns { folder, added, skipped }.
 */
function importPack(file, { parent = null, into = null } = {}) {
  const p = packFiles(file);
  let folder = into;
  if (!folder) folder = createLibrary(parent, p.info.name, { description: p.info.description, author: p.info.author, licence: p.info.licence });
  const added = [];
  const skipped = [];
  const have = new Set(songs.listFolderNames(folder).map((n) => n.toLowerCase()));
  for (const [title, files] of p.songs) {
    if (have.has(title.toLowerCase())) { skipped.push(title); continue; }
    const dir = path.join(folder, title);
    fs.mkdirSync(dir, { recursive: true });
    for (const f of files) fs.writeFileSync(path.join(dir, f.name), f.data);
    added.push(title);
  }
  if (p.setlists.length) {
    const dir = path.join(folder, SETLISTS_DIR);
    fs.mkdirSync(dir, { recursive: true });
    for (const s of p.setlists) if (!fs.existsSync(path.join(dir, s.name))) fs.writeFileSync(path.join(dir, s.name), s.data);
  }
  return { folder, added, skipped };
}

module.exports = {
  LIBRARY_FILE, PACK_EXTENSION, LICENCES, SHAREABLE,
  readInfo, writeInfo, parseList, formatList, listLibraries, songFolders, createLibrary,
  copySong, licenceCheck, exportPack, readPack, importPack
};
