// ChordPro import (4.34): what an imported file's details become in ukemusic, and bringing in a
// whole folder of ChordPro files at once (a club's songbook, say).
//
//   importSettings(meta, instrumentId) -> { song: {…}, shapes: {…} }   the song's settings
//   importFolder(source, songsFolder)   -> { added, skipped, setlists }  one song per file
//
// A folder of files becomes songs in the library; each subfolder with songs in it also becomes
// a setlist of those songs (a songbook's monthly supplements, say). Songs already in the library
// (same title) are left alone. Imported songs are marked "for my own use" (Info → Licence), so
// they aren't shared in a library pack by mistake.
const fs = require('fs');
const path = require('path');
const { chordProToUkemusic } = require('./chordpro');
const songs = require('./song-library');
const links = require('./links');
const setlists = require('./setlists');
const shapes = require('./shapes');
const { instrument } = require('./instruments');
const keys = require('./keys');

const EXTENSIONS = /\.(cho|chordpro|chopro|crd|pro)$/i;

/** The song settings for an imported file's details (meta from chordProToUkemusic) */
function importSettings(meta = {}, instrumentId = 'soprano') {
  const song = {};
  const key = meta.key && keys.parseKey(meta.key);
  if (key) song.key = key.name;
  const beats = Number((String(meta.time || '').match(/^\s*(\d+)\s*\//) || [])[1]);
  if ([2, 3, 4, 6].includes(beats)) song.beats_per_bar = beats;
  // No {artist}: many sites put the artist in the subtitle ({st: Paul Simon})
  if (meta.artist || meta.subtitle) song.artist = String(meta.artist || meta.subtitle).trim();
  const tempo = Math.round(Number(String(meta.tempo || '').match(/\d+(\.\d+)?/)?.[0]));
  if (tempo >= 40 && tempo <= 240) song.tempo = tempo;
  // {capo} is kept on the ChordPro tab, not made the song's capo: ChordPro files write the
  // capo shapes, ukemusic writes the sounding chords and works the shapes out from the capo
  const writers = [meta.composer, meta.lyricist].filter(Boolean).map((w) => String(w).trim());
  if (writers.length) song.writer = [...new Set(writers)].join(', ');
  if (meta.album) song.album = String(meta.album).trim();
  const year = String(meta.year || '').match(/\b(1\d{3}|2[01]\d{2})\b/);
  if (year) song.year = Number(year[1]);
  if (meta.tags && meta.tags.length) song.tags = [...new Set(meta.tags.map((t) => String(t).trim()).filter(Boolean))].join(', ');

  // {define} shapes: for the song's instrument; {define-baritone} / {define-guitar} for those
  const out = { song };
  const byKey = {};
  for (const d of meta.defines || []) {
    const id = d.instrument || instrumentId;
    let inst;
    try { inst = instrument(id); } catch (_e) { continue; }
    if (!inst || d.frets.length !== inst.strings.length) continue;
    const k = inst.sameShapesAs || inst.id;
    (byKey[k] = byKey[k] || {})[d.name] = d.frets;
  }
  if (Object.keys(byKey).length) {
    out.shapes = Object.fromEntries(Object.entries(byKey).map(([k, map]) => [k, shapes.formatShapeSetting(map)]));
  }
  return out;
}

/** A song title from the file: its {title}, or the file name without " - Artist" */
function titleFor(meta, file) {
  const fromFile = path.basename(file).replace(EXTENSIONS, '').replace(/\s+-\s+[^-]+$/, '');
  const raw = (meta.title || fromFile || 'Song').trim();
  return raw.replace(/[<>:"/\\|?*]+/g, '').replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim() || fromFile;
}

/** The ChordPro files in a folder and its subfolders (two levels), grouped by subfolder */
function findFiles(source) {
  const groups = [];
  const walk = (dir, depth) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { return; }
    const files = entries.filter((e) => e.isFile() && EXTENSIONS.test(e.name)).map((e) => path.join(dir, e.name)).sort((a, b) => a.localeCompare(b));
    if (files.length) groups.push({ folder: dir, name: path.basename(dir), files });
    if (depth < 2) for (const e of entries) if (e.isDirectory() && !e.name.startsWith('.')) walk(path.join(dir, e.name), depth + 1);
  };
  walk(source, 0);
  return groups;
}

/**
 * Bring every ChordPro file in `source` (and its subfolders) into the library at `songsFolder`.
 * options: { instrument, setlists: true, source: 'where they came from' }
 */
function importFolder(source, songsFolder, options = {}) {
  const instrumentId = options.instrument || 'soprano';
  const groups = findFiles(source);
  const report = { added: [], skipped: [], setlists: [], files: 0, tunes: { matched: [], kept: [] } };
  const makeSetlists = options.setlists !== false && groups.length > 1;
  for (const group of groups) {
    const inGroup = [];
    for (const file of group.files) {
      report.files += 1;
      let text;
      try { text = fs.readFileSync(file, 'utf8'); } catch (error) { report.skipped.push({ file: path.basename(file), reason: error.message }); continue; }
      const converted = chordProToUkemusic(text);
      const title = titleFor(converted.meta, file);
      const check = songs.validateSongTitle(title, songsFolder);
      if (!check.ok) {
        const clash = /already a song/.test(check.error);
        report.skipped.push({ file: path.basename(file), title, reason: clash ? 'already in the library' : check.error });
        if (clash) inGroup.push(title);
        continue;
      }
      const settings = importSettings(converted.meta, instrumentId);
      settings.song.licence = 'personal';
      if (options.source) settings.song.source = options.source;
      try {
        const song = songs.createSong(songsFolder, check.title, converted.text, settings);
        if (converted.kept) songs.writeChordPro(song.folder, converted.kept);
        if ((converted.meta.links || []).length) links.writeLinks(song.folder, converted.meta.links);
        report.added.push(check.title);
        // 4.44: ABC tunes in the file: made {melody} lines, or kept on the ChordPro tab
        const t = converted.report.tunes;
        if (t && t.matched) report.tunes.matched.push(check.title);
        if (t && t.kept) report.tunes.kept.push(check.title);
        inGroup.push(check.title);
      } catch (error) {
        report.skipped.push({ file: path.basename(file), title, reason: error.message });
      }
    }
    if (makeSetlists && inGroup.length) {
      try {
        const name = group.name.replace(/[<>:"/\\|?*]+/g, '').trim() || 'Imported';
        setlists.writeSetlist(songsFolder, name, inGroup);
        report.setlists.push({ name, songs: inGroup.length });
      } catch (error) {
        report.skipped.push({ file: group.name, reason: `setlist not made: ${error.message}` });
      }
    }
  }
  return report;
}

module.exports = { importSettings, importFolder, titleFor, findFiles, EXTENSIONS };
