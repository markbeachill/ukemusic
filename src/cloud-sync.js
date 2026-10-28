// Songs kept in a cloud drive (4.47): the web player reads and writes the desktop's own songs
// folder in Dropbox (or another drive), so there's one set of songs, changed anywhere.
// Pure: no network here. The web player lists the folder, asks this module what to do, then does
// it (web/app.html, Cloud). The drive's own sync puts the files in the desktop's songs folder.
//
// A song in the drive is a folder, as the desktop keeps it:
//   <songs folder>/<Title>/<Title>-song.txt   the words and chords (the folder's name is the title)
//                          song.ini           key, tempo, artist… (the song's settings)
//                          notes.txt          the notes
// Everything else (exports, .history, learn, Archived songs, Setlists) is left alone.
//
// Each song here remembers what it was when it last matched the drive (song.cloud: the folder,
// the files' revisions there, and a fingerprint of the song). So at the next sync it's known
// which side changed: only the drive (bring it in), only here (send it), or both (keep both).

const ini = require('ini');
const { settingsFromIni } = require('./song-files');

const SONG_SUFFIX = '-song.txt';
const SKIP_FOLDERS = new Set(['archived songs', 'setlists', 'exports']);
const ARCHIVE = 'Archived songs';

const lower = (p) => String(p || '').toLowerCase();
const baseName = (p) => String(p || '').split('/').filter(Boolean).pop() || '';
const joinPath = (...parts) => `/${parts.map((p) => String(p).replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')}`;

/** A small, steady fingerprint of a string (FNV-1a, 52 bits as hex) */
function hashText(text) {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const s = String(text);
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 ^ c, 2246822519) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + (h2 & 0xfffff).toString(16).padStart(5, '0');
}

/** JSON with the keys in order, so the same settings always give the same text */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableJson(value[k])}`).join(',')}}`;
  return JSON.stringify(value === undefined ? null : value);
}

const clean = (t) => String(t || '').replace(/\r\n?/g, '\n');

/** A song's fingerprint: its words and chords, settings and notes (the title is its folder) */
function songHash(song) {
  const settings = JSON.parse(JSON.stringify(song.settings || {}));
  if (settings.song) delete settings.song.settings_format;
  return hashText(`${clean(song.text)}\u0000${clean(song.notes).replace(/\s+$/, '')}\u0000${stableJson(settings)}`);
}

/** song.ini as the desktop writes it (settings_format 2: only the song's own settings) */
function iniText(settings) {
  const s = JSON.parse(JSON.stringify(settings || {}));
  s.song = { ...(s.song || {}), settings_format: 2 };
  const header = '; ukemusic song settings: this song\'s facts (key, tempo, versions…) plus any setting\n'
    + '; you made custom for this song. Anything not listed here uses the global default.\n';
  return header + ini.stringify(s, { whitespace: true });
}

/** A song -> its files in the drive: { folder, files: { song: { path, text }, ini, notes } } */
function songToFiles(song, root) {
  const folder = joinPath(root, song.title);
  const out = {
    song: { path: `${folder}/${song.title}${SONG_SUFFIX}`, text: clean(song.text) },
    ini: { path: `${folder}/song.ini`, text: iniText(song.settings) }
  };
  if (String(song.notes || '').trim()) out.notes = { path: `${folder}/notes.txt`, text: clean(song.notes) };
  return { folder, files: out };
}

/** A song folder's files (as read) -> a song */
function filesToSong(info, texts) {
  return {
    title: info.title,
    text: clean(texts.song),
    settings: texts.ini ? settingsFromIni(texts.ini) : {},
    notes: texts.notes !== undefined ? clean(texts.notes) : ''
  };
}

/**
 * The songs in the drive, from a listing of the songs folder.
 *   entries: [{ tag: 'file' | 'folder', path (as shown), rev }] (any depth: deeper ones are left out)
 * -> Map(lower-case folder path -> { folder, title, song: { path, rev }, ini?, notes?, revs })
 */
function songFolders(entries, root) {
  const rootPath = joinPath(root);
  const depthOf = (p) => p.split('/').filter(Boolean).length;
  const rootDepth = depthOf(rootPath);
  const folders = new Map();
  for (const e of entries || []) {
    if (e.tag !== 'file') continue;
    const p = String(e.path);
    if (!lower(p).startsWith(`${lower(rootPath)}/`) || depthOf(p) !== rootDepth + 2) continue;
    const parts = p.split('/').filter(Boolean);
    const folderName = parts[rootDepth];
    if (SKIP_FOLDERS.has(lower(folderName)) || folderName.startsWith('.')) continue;
    const folder = joinPath(rootPath, folderName);
    const key = lower(folder);
    if (!folders.has(key)) folders.set(key, { folder, title: folderName, files: [] });
    folders.get(key).files.push({ name: parts[parts.length - 1], path: p, rev: e.rev || '' });
  }
  const out = new Map();
  for (const [key, f] of folders) {
    // the desktop's rule: the first "…-song.txt" in the folder, by name
    const songFiles = f.files.filter((x) => lower(x.name).endsWith(SONG_SUFFIX)).sort((a, b) => a.name.localeCompare(b.name));
    if (!songFiles.length) continue;
    const pick = (name) => f.files.find((x) => lower(x.name) === name);
    const info = { folder: f.folder, title: f.title, song: songFiles[0] };
    const iniFile = pick('song.ini');
    const notesFile = pick('notes.txt');
    if (iniFile) info.ini = iniFile;
    if (notesFile) info.notes = notesFile;
    info.revs = revsOf(info);
    out.set(key, info);
  }
  return out;
}

/** The revisions of a song folder's files: { song, ini, notes } */
function revsOf(info) {
  return { song: info.song ? info.song.rev : '', ini: info.ini ? info.ini.rev : '', notes: info.notes ? info.notes.rev : '' };
}
const sameRevs = (a, b) => Boolean(a && b) && a.song === b.song && (a.ini || '') === (b.ini || '') && (a.notes || '') === (b.notes || '');

/**
 * What to do, song by song.
 *   local: the songs here [{ id, title, text, settings, notes, cloud?: { folder, revs, hash }, cloudSkip? }]
 *   remote: songFolders(…)
 *   deleted: songs deleted here since they were last in the drive [{ folder, revs }]
 * -> {
 *   pull:    [{ info, song? }]   new in the drive, or changed only there: bring it in
 *   push:    [{ song, info? }]   new here, or changed only here: send it (info: where it is now)
 *   conflict:[{ song, info }]    changed in both places: the drive's comes in, this one is kept as a copy
 *   match:   [{ song, info }]    here and in the drive, never synced: compare them once
 *   removeLocal: [song]          gone from the drive (deleted or archived there), unchanged here
 *   recreate:   [song]           gone from the drive, but changed here: send it again
 *   archive:    [tombstone]      deleted here, unchanged in the drive: move it to Archived songs
 *   newLocal:   [song]           here only, never in the drive (the first sync asks first)
 *   same: n
 * }
 */
function planSync({ local = [], remote = new Map(), deleted = [] } = {}) {
  const plan = { pull: [], push: [], conflict: [], match: [], removeLocal: [], recreate: [], archive: [], newLocal: [], same: 0 };
  const claimed = new Set();
  const byTitle = new Map();
  for (const [key, info] of remote) byTitle.set(lower(info.title), key);
  for (const song of local) {
    if (song.cloud && song.cloud.folder) {
      const key = lower(song.cloud.folder);
      const info = remote.get(key);
      const changedHere = songHash(song) !== song.cloud.hash || lower(baseName(song.cloud.folder)) !== lower(song.title);
      if (!info) {
        if (changedHere) plan.recreate.push(song); else plan.removeLocal.push(song);
        continue;
      }
      claimed.add(key);
      const changedThere = !sameRevs(info.revs, song.cloud.revs);
      if (changedHere && changedThere) plan.conflict.push({ song, info });
      else if (changedHere) plan.push.push({ song, info });
      else if (changedThere) plan.pull.push({ info, song });
      else plan.same += 1;
      continue;
    }
    if (song.cloudSkip) continue;
    const key = byTitle.get(lower(song.title));
    if (key && !claimed.has(key)) { claimed.add(key); plan.match.push({ song, info: remote.get(key) }); continue; }
    plan.newLocal.push(song);
  }
  for (const t of deleted) {
    const key = lower(t.folder);
    const info = remote.get(key);
    if (!info) continue;   // gone already
    claimed.add(key);
    // changed in the drive since it was deleted here: keep it (it comes back)
    if (sameRevs(info.revs, t.revs)) plan.archive.push(t); else plan.pull.push({ info });
  }
  for (const [key, info] of remote) if (!claimed.has(key)) plan.pull.push({ info });
  return plan;
}

/** Where a deleted song goes: the desktop's Archived songs folder */
function archivePath(root, folder) {
  return joinPath(root, ARCHIVE, baseName(folder));
}

module.exports = { hashText, stableJson, songHash, iniText, songToFiles, filesToSong, songFolders, revsOf, sameRevs, planSync, archivePath, joinPath, baseName, SONG_SUFFIX, ARCHIVE };
