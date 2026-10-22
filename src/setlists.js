// Setlists: an ordered list of songs, for a gig, a jam or a club night.
// Each is a small text file in the songs folder's "Setlists" folder, one song title per line:
//
//   # ukemusic setlist
//   Oh! Susanna
//   Amazing Grace | +5
//
// "| +5" plays the song in one of its saved keys (5 semitones up) instead of the original.
// ("|" can't be in a song title, so it can't be mistaken for part of one.)
//
// The titles are the song folder names, so the file can be edited by hand. A song that has
// been renamed or deleted shows as missing in the app. The songbook PDF made from a setlist
// goes next to it: Setlists\Club night.pdf.

const fs = require('fs');
const path = require('path');

const SETLIST_DIR = 'Setlists';
const EXTENSION = '.txt';
const HEADER = '# ukemusic setlist: one song title per line, in playing order';
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/;

function setlistFolder(songsFolder) {
  return path.join(songsFolder, SETLIST_DIR);
}

function cleanName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
}

/** { ok, name } or { ok: false, error } */
function validateName(rawName, songsFolder, { except = '' } = {}) {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: 'Please give the setlist a name.' };
  if (ILLEGAL.test(name)) return { ok: false, error: 'Names can\'t contain any of these characters: < > : " / \\ | ? *' };
  if (name.length > 80) return { ok: false, error: 'Names can be at most 80 characters.' };
  if (songsFolder && name.toLowerCase() !== except.toLowerCase()
    && listSetlists(songsFolder).some((s) => s.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: `There's already a setlist called "${name}".` };
  }
  return { ok: true, name };
}

/** "Amazing Grace | +5" -> { title: 'Amazing Grace', shift: 5 }; no key -> shift 0 */
function parseEntry(line) {
  const [title, key] = String(line || '').split('|');
  const shift = Math.trunc(Number(String(key || '').trim())) || 0;
  return { title: cleanName(title), shift: shift >= -11 && shift <= 11 ? shift : 0 };
}

function formatEntry({ title, shift = 0 }) {
  return shift ? `${cleanName(title)} | ${shift > 0 ? '+' : ''}${shift}` : cleanName(title);
}

function parseSetlist(text) {
  return String(text || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function formatSetlist(songs) {
  return `${HEADER}\n${(songs || []).map((s) => formatEntry(typeof s === 'string' ? parseEntry(s) : s)).filter(Boolean).join('\n')}\n`;
}

/** All setlists, by name: [{ name, file, songs, modified }] */
function listSetlists(songsFolder) {
  const folder = setlistFolder(songsFolder);
  let names = [];
  try {
    names = fs.readdirSync(folder).filter((f) => f.toLowerCase().endsWith(EXTENSION));
  } catch (_err) {
    return [];
  }
  return names.map((f) => {
    const file = path.join(folder, f);
    return {
      name: f.slice(0, -EXTENSION.length),
      file,
      songs: parseSetlist(fs.readFileSync(file, 'utf8')),
      modified: fs.statSync(file).mtimeMs
    };
  }).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function readSetlist(songsFolder, name) {
  return listSetlists(songsFolder).find((s) => s.name === name) || null;
}

/** Save a setlist (creating the Setlists folder if needed). Renames when `oldName` differs. */
function writeSetlist(songsFolder, name, songs, { oldName = '' } = {}) {
  const check = validateName(name, songsFolder, { except: oldName || name });
  if (!check.ok) throw new Error(check.error);
  const folder = setlistFolder(songsFolder);
  fs.mkdirSync(folder, { recursive: true });
  const file = path.join(folder, `${check.name}${EXTENSION}`);
  require('./safe-write').writeFileSafe(file, formatSetlist(songs));
  if (oldName && oldName !== check.name) {
    const old = path.join(folder, `${oldName}${EXTENSION}`);
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  return readSetlist(songsFolder, check.name);
}

/** A song was renamed: change its title in every setlist. Returns the setlists changed. */
function renameSongInSetlists(songsFolder, oldTitle, newTitle) {
  const changed = [];
  for (const s of listSetlists(songsFolder)) {
    let hit = false;
    const songs = s.songs.map((line) => {
      const entry = parseEntry(line);
      if (entry.title !== oldTitle) return line;
      hit = true;
      return formatEntry({ ...entry, title: newTitle });
    });
    if (hit) {
      fs.writeFileSync(s.file, formatSetlist(songs), 'utf8');
      changed.push(s.name);
    }
  }
  return changed;
}

function deleteSetlist(songsFolder, name) {
  const file = path.join(setlistFolder(songsFolder), `${cleanName(name)}${EXTENSION}`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

/** Where a setlist's songbook PDF goes */
function songbookPath(songsFolder, name) {
  return path.join(setlistFolder(songsFolder), `${cleanName(name)}.pdf`);
}

module.exports = {
  SETLIST_DIR, validateName, parseEntry, formatEntry, renameSongInSetlists, parseSetlist, formatSetlist, listSetlists, readSetlist,
  writeSetlist, deleteSetlist, songbookPath, setlistFolder
};
