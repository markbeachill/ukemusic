// The song's exports (4.22): what's there, when it was made and how, and whether it's older
// than the song. Used by the Exports tab. exports/export-log.json keeps how each file was made.
const fs = require('fs');
const path = require('path');

const EXPORTS_DIR = 'exports';
const LOG_FILE = 'export-log.json';
const TEXT_EXT = ['md', 'txt', 'cho'];

const kindOf = (name) => {
  const ext = (name.match(/\.([^.]+)$/) || ['', ''])[1].toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (TEXT_EXT.includes(ext)) return 'text';
  return 'other';
};

/** Folders in the order they're shown: the song, its saved keys, Stage, Lyrics, anything else */
// 4.40.5: learn sheets (in the song's learn folder) are listed with the exports
const LEARN_DIR = 'learn';
const LEARN_GROUP = 'Learn sheets';
function groupRank(name) {
  if (name === 'Song') return 0;
  if (name === 'Stage') return 2;
  if (name === 'Lyrics') return 3;
  if (name === LEARN_GROUP) return 4;
  return 1;
}

/** When the song last changed: its text or its settings */
function songChanged(folder) {
  let latest = 0;
  for (const f of fs.readdirSync(folder)) {
    if (/-song\.txt$/i.test(f) || f === 'song.ini') latest = Math.max(latest, fs.statSync(path.join(folder, f)).mtimeMs);
  }
  return latest;
}

function readLog(folder) {
  try {
    return JSON.parse(fs.readFileSync(path.join(folder, EXPORTS_DIR, LOG_FILE), 'utf8')) || {};
  } catch (_e) {
    return {};
  }
}

/** Remember how files were made: entries [{ rel: 'Stage/x.pdf', details: {…} }] */
function recordExports(folder, entries, at = Date.now()) {
  const log = readLog(folder);
  for (const e of entries || []) log[e.rel.replace(/\\/g, '/')] = { ...(e.details || {}), at };
  fs.mkdirSync(path.join(folder, EXPORTS_DIR), { recursive: true });
  fs.writeFileSync(path.join(folder, EXPORTS_DIR, LOG_FILE), JSON.stringify(log, null, 1), 'utf8');
  return log;
}

/**
 * Why a file is out of date, or '' (4.32): made before the song last changed; made by another
 * version of ukemusic; made in a look that has changed since (style, Stage format, layout…);
 * or named after the song's old name. current: { app, looks: { standard, stage } }.
 */
/** Is an export file named after this title? "Rainbow_uke.pdf", "Rainbow (+5)_uke.pdf",
 *  "Rainbow (lyrics).txt", "Rainbow (capo 2)…" — but not "Rainbow (Live)_uke.pdf" */
function namedFor(name, title) {
  const t = String(title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${t}(_|\\.| \\((lyrics|learn|[+-]\\d+|capo|stage)\\b)`, 'i').test(name);
}
/** The song's title, from its song file (else its folder's name) */
function songTitle(folder) {
  try {
    const f = fs.readdirSync(folder).find((x) => /-song\.txt$/i.test(x));
    if (f) return f.replace(/-song\.txt$/i, '');
  } catch (_e) { /* no folder */ }
  return path.basename(folder);
}

function staleReason(file, made, changed, title, current = {}) {
  if (file.modified < changed - 1000) return 'song';
  if (title && !namedFor(file.name, title)) return 'name';
  if (current.app) {
    if (!made || !made.app) return 'app';
    if (made.app !== current.app) return 'app';
    const kind = made.kind || (/stage/i.test(made.style || '') ? 'stage' : 'standard');
    const now = current.looks && current.looks[kind];
    if (made.look && now && made.look !== now) return 'look';
  }
  return '';
}
const REASONS = {
  song: 'Made before the song last changed',
  name: 'Named after the song\'s old name',
  app: 'Made by an earlier version of ukemusic',
  look: 'Made before the look changed (style, Stage format, layout or section names)'
};

/**
 * Everything in exports/: { songChanged, groups: [{ name, files: [{ name, rel, path, size,
 * modified, kind, outOfDate, why, made }] }], count, outOfDate }
 */
function listExports(folder, current = {}) {
  const root = path.join(folder, EXPORTS_DIR);
  const changed = fs.existsSync(folder) ? songChanged(folder) : 0;
  const log = readLog(folder);
  const title = songTitle(folder);
  const groups = [];
  if (fs.existsSync(root)) {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      const files = fs.readdirSync(dir, { withFileTypes: true })
        .filter((f) => f.isFile())
        .map((f) => {
          const full = path.join(dir, f.name);
          const st = fs.statSync(full);
          const rel = `${entry.name}/${f.name}`;
          const file = { name: f.name, rel, path: full, size: st.size, modified: st.mtimeMs, kind: kindOf(f.name), made: log[rel] || null };
          file.reason = staleReason(file, file.made, changed, title, current);
          file.outOfDate = Boolean(file.reason);
          file.why = REASONS[file.reason] || '';
          return file;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      if (files.length) groups.push({ name: entry.name, files });
    }
  }
  // the learn sheets (not trouble-spots.json, which is yours)
  const learnDir = path.join(folder, LEARN_DIR);
  if (fs.existsSync(learnDir)) {
    const files = fs.readdirSync(learnDir, { withFileTypes: true })
      .filter((f) => f.isFile() && /\.(pdf|html)$/i.test(f.name))
      .map((f) => {
        const full = path.join(learnDir, f.name);
        const st = fs.statSync(full);
        const file = { name: f.name, rel: `${LEARN_DIR}/${f.name}`, path: full, size: st.size, modified: st.mtimeMs, kind: kindOf(f.name), made: null, learn: true };
        // only the song and its name: a learn sheet isn't in the export log
        file.reason = staleReason(file, null, changed, title, {});
        file.outOfDate = Boolean(file.reason);
        file.why = REASONS[file.reason] || '';
        return file;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    if (files.length) groups.push({ name: LEARN_GROUP, files });
  }
  groups.sort((a, b) => groupRank(a.name) - groupRank(b.name) || a.name.localeCompare(b.name));
  const all = groups.flatMap((g) => g.files);
  return { songChanged: changed, groups, count: all.length, outOfDate: all.filter((f) => f.outOfDate).length };
}

/** A short description of how a file was made, from its log entry */
function madeText(made) {
  if (!made) return '';
  const bits = [];
  if (made.style) bits.push(made.style);
  if (made.key) bits.push(made.key);
  if (made.page) bits.push(made.page);
  if (made.sections && made.sections !== 'show') bits.push(made.sections === 'hide' ? 'section names hidden' : 'section names small');
  if (made.layout) bits.push(made.layout);
  return bits.join(' · ');
}

module.exports = { LEARN_DIR, LEARN_GROUP, namedFor, songTitle, staleReason, REASONS, EXPORTS_DIR, LOG_FILE, listExports, readLog, recordExports, madeText, kindOf, songChanged };
