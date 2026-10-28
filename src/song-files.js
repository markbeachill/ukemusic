// Songs from files, for the web player (4.45): the player on a phone or tablet can't open your
// songs folder, so songs come in as files you pick (from the Files app, Google Drive, Downloads…)
// and go out as files (a backup of every song, or one song). Pure (no fs, no Buffer): it runs in
// the browser and in the unit tests.
//
//   * a song file: ukemusic's own (Title-song.txt), ChordPro (.cho, .chopro, .pro, .crd, or a
//     .txt that looks like ChordPro), or a chord sheet with the chords above the words
//   * a zip of song folders: a zipped copy of the desktop's songs folder (or one song's folder);
//     each folder's song file, song.ini (key, tempo, artist…) and notes.txt
//   * a backup / "Songs for the web" file (.json): every song at once (src/web-songs.js)
//
// planImport compares what came in with the songs already here, by title: new songs, songs
// that are different, and the same.

const ini = require('ini');
const { songId, readWebSongs } = require('./web-songs');
const { chordProToUkemusic } = require('./chordpro');
const { importSettings } = require('./chordpro-import');
const { convertChordSheet, findChordLines } = require('./chord-sheet');

const SONG_SUFFIX = '-song.txt';
const CHORDPRO_EXT = /\.(cho|chordpro|chopro|crd|pro)$/i;
const TEXT_EXT = /\.(txt|md|text|cho|chordpro|chopro|crd|pro)$/i;

/** A file name -> a song title: "Amazing Grace-song.txt" -> "Amazing Grace" */
function titleFromFile(name) {
  const base = String(name || '').split(/[\\/]/).pop();
  return base.replace(/-song\.txt$/i, '').replace(/\.(txt|md|text|cho|chordpro|chopro|crd|pro)$/i, '')
    .replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'New song';
}

/** Does this text look like ChordPro? ({title:…}, {start_of_chorus}, {soc}…) */
function looksLikeChordPro(text) {
  return /^\s*\{\s*(title|t|subtitle|st|artist|start_of_\w+|so[cvbt]|eo[cvbt]|comment|c|key|capo|tempo|time)\s*[:}]/im.test(String(text || ''));
}

/**
 * One song file -> { title, text, settings, notes, from }
 *   from: 'ukemusic' | 'chordpro' | 'chord sheet' | 'text'
 */
function songFromText(name, raw) {
  const text = String(raw || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const title = titleFromFile(name);
  if (/--START MUSIC--/.test(text)) return { title, text, settings: {}, notes: '', from: 'ukemusic' };
  if (CHORDPRO_EXT.test(name) || looksLikeChordPro(text)) {
    const r = chordProToUkemusic(text);
    const settings = importSettings(r.meta || {});
    return { title: (r.meta && r.meta.title) || title, text: r.text, settings: settings.song && Object.keys(settings.song).length ? { song: settings.song } : {}, notes: '', from: 'chordpro' };
  }
  const wrap = (body) => `--START MUSIC--\n${body.replace(/\n+$/, '')}\n--END MUSIC--\n`;
  if (findChordLines(text, { useDelimiters: false }).length) return { title, text: wrap(convertChordSheet(text).text), settings: {}, notes: '', from: 'chord sheet' };
  return { title, text: wrap(text), settings: {}, notes: '', from: 'text' };
}

// ── zip files (a zipped songs folder), read with the browser's own inflate ──
const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser can\'t open zip files. Unzip it first, then choose the song files.');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A zip file (Uint8Array / ArrayBuffer) -> [{ name, data: Uint8Array }] */
async function readZip(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  let endAt = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i -= 1) {
    if (u32(b, i) === 0x06054b50) { endAt = i; break; }
  }
  if (endAt < 0) throw new Error('This isn\'t a zip file (or it is damaged).');
  const count = u16(b, endAt + 10);
  let at = u32(b, endAt + 16);
  const names = new TextDecoder('utf-8');
  const out = [];
  for (let n = 0; n < count; n += 1) {
    if (u32(b, at) !== 0x02014b50) throw new Error('The zip file is damaged.');
    const method = u16(b, at + 10);
    const size = u32(b, at + 20);
    const nameLength = u16(b, at + 28);
    const extraLength = u16(b, at + 30);
    const commentLength = u16(b, at + 32);
    const localAt = u32(b, at + 42);
    const name = names.decode(b.subarray(at + 46, at + 46 + nameLength));
    at += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    const dataAt = localAt + 30 + u16(b, localAt + 26) + u16(b, localAt + 28);
    const body = b.subarray(dataAt, dataAt + size);
    if (method === 0) out.push({ name, data: body.slice() });
    else if (method === 8) out.push({ name, data: await inflateRaw(body) });
    // anything else (encrypted, other packing) is left out
  }
  return out;
}

/** song.ini text -> settings (as the desktop reads them: numbers and yes/no where they are) */
function settingsFromIni(text) {
  const TEXT_KEYS = new Set(['artist', 'writer', 'album', 'source', 'tags', 'licence', 'title', 'list', 'custom_strum', 'family', 'first_note', 'key', 'pick']);
  const norm = (value, key = '') => {
    if (TEXT_KEYS.has(key) && typeof value !== 'object') return value === undefined || value === null ? value : String(value);
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value);
    if (value && typeof value === 'object') { const o = {}; for (const [k, v] of Object.entries(value)) o[k] = norm(v, k); return o; }
    return value;
  };
  try {
    const s = norm(ini.parse(String(text || '')));
    if (s.song) delete s.song.settings_format;
    return s;
  } catch (_e) { return {}; }
}

/**
 * Files picked (or found in a zip) -> songs.
 *   files: [{ name (with any folders), text } | { name, bytes }]
 * -> { songs: [{ title, text, settings, notes, from }], skipped: [names], backups: n }
 * A folder with a "…-song.txt" in it is one song (with its song.ini and notes.txt); other text
 * files are a song each; a backup (.json) gives all its songs.
 */
async function songsFromFiles(files) {
  const flat = [];
  const skipped = [];
  let backups = 0;
  const decode = (bytes) => new TextDecoder('utf-8').decode(bytes);
  for (const f of files) {
    const name = String(f.name || '');
    if (/\.zip$/i.test(name)) {
      const bytes = f.bytes || new TextEncoder().encode(f.text || '');
      try {
        for (const e of await readZip(bytes)) {
          if (/(^|\/)(__MACOSX|\.history|exports|learn)\//i.test(e.name) || /(^|\/)\.[^/]*$/.test(e.name)) continue;
          flat.push({ name: e.name, text: TEXT_EXT.test(e.name) || /\.(ini|json)$/i.test(e.name) ? decode(e.data) : null });
        }
      } catch (error) { skipped.push(`${name} (${error.message})`); }
      continue;
    }
    flat.push({ name, text: f.text !== undefined ? f.text : (f.bytes ? decode(f.bytes) : '') });
  }
  const songs = [];
  // song folders: Title/Title-song.txt with song.ini and notes.txt beside it
  const dirOf = (n) => n.includes('/') ? n.slice(0, n.lastIndexOf('/')) : '';
  const byDir = new Map();
  for (const f of flat) { const d = dirOf(f.name); if (!byDir.has(d)) byDir.set(d, []); byDir.get(d).push(f); }
  const used = new Set();
  for (const [dir, list] of byDir) {
    const songFile = list.find((f) => f.name.toLowerCase().endsWith(SONG_SUFFIX) && f.text !== null);
    if (!songFile) continue;
    used.add(songFile);
    const iniFile = list.find((f) => /(^|\/)song\.ini$/i.test(f.name));
    const notesFile = list.find((f) => /(^|\/)notes\.txt$/i.test(f.name));
    for (const extra of [iniFile, notesFile, ...list.filter((f) => /(^|\/)(links|chordpro)\.txt$/i.test(f.name))]) if (extra) used.add(extra);
    const folderTitle = dir.split('/').pop();
    const fileTitle = titleFromFile(songFile.name);
    songs.push({
      title: fileTitle || folderTitle,
      text: songFile.text.replace(/^﻿/, '').replace(/\r\n?/g, '\n'),
      settings: iniFile ? settingsFromIni(iniFile.text) : {},
      notes: notesFile ? notesFile.text.replace(/\r\n?/g, '\n') : '',
      from: 'ukemusic'
    });
  }
  for (const f of flat) {
    if (used.has(f) || f.text === null) { if (f.text === null && !used.has(f)) skipped.push(f.name); continue; }
    if (/\.json$/i.test(f.name)) {
      const r = readWebSongs(f.text);
      if (r.ok) { backups += 1; for (const s of r.songs) songs.push({ ...s, from: 'backup' }); } else skipped.push(f.name);
      continue;
    }
    if (/(^|\/)(song\.ini|notes\.txt|links\.txt|chordpro\.txt|practice\.json)$/i.test(f.name)) continue;
    if (!TEXT_EXT.test(f.name) || !String(f.text).trim()) { skipped.push(f.name); continue; }
    songs.push(songFromText(f.name, f.text));
  }
  return { songs, skipped, backups };
}

/** The song facts compared when deciding whether two copies of a song differ */
const FACTS = ['artist', 'year', 'writer', 'key', 'tempo', 'beats_per_bar', 'capo', 'tags', 'instrument', 'transpose'];
function sameSong(a, b) {
  const t = (s) => String(s || '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  if (t(a.text) !== t(b.text)) return false;
  if (t(a.notes) !== t(b.notes)) return false;
  for (const k of FACTS) {
    const x = a.settings?.song?.[k];
    const y = b.settings?.song?.[k];
    if (String(x ?? '') !== String(y ?? '')) return false;
  }
  return true;
}

/** What differs: ['words and chords', 'notes', 'details'] */
function differences(a, b) {
  const t = (s) => String(s || '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');
  const out = [];
  if (t(a.text) !== t(b.text)) out.push('words and chords');
  if (t(a.notes) !== t(b.notes)) out.push('notes');
  if (FACTS.some((k) => String(a.settings?.song?.[k] ?? '') !== String(b.settings?.song?.[k] ?? ''))) out.push('details');
  return out;
}

/**
 * Songs coming in, against the songs here (matched by title).
 *   current: [{ id, title, text, settings, notes, edited }]
 * -> { add: [song], update: [{ song, current, what, editedHere }], same: [song], missing: [current] }
 */
function planImport(current, incoming) {
  const here = new Map((current || []).map((s) => [songId(s.title), s]));
  const seen = new Set();
  const plan = { add: [], update: [], same: [], missing: [] };
  for (const song of incoming || []) {
    const id = songId(song.title);
    if (seen.has(id)) continue;   // the same song twice in what was picked: the first one
    seen.add(id);
    const cur = here.get(id);
    if (!cur) { plan.add.push(song); continue; }
    if (sameSong(cur, song)) { plan.same.push(song); continue; }
    plan.update.push({ song, current: cur, what: differences(cur, song), editedHere: Boolean(cur.edited) });
  }
  for (const [id, cur] of here) if (!seen.has(id)) plan.missing.push(cur);
  return plan;
}

module.exports = { titleFromFile, looksLikeChordPro, songFromText, readZip, settingsFromIni, songsFromFiles, planImport, sameSong, differences };
