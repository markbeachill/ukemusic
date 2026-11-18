// Setlists as text (4.90): the file format, shared by the desktop app (src/setlists.js, which
// keeps them in the songs folder's "Setlists" folder) and the web player (which keeps them on the
// device and, with Dropbox, in the same folder). One song title per line, in playing order:
//
//   # ukemusic setlist: one song title per line, in playing order
//   Oh! Susanna
//   Amazing Grace | +5
//
// "| +5" plays the song 5 semitones up. Pure functions: no files here.

const SETLIST_DIR = 'Setlists';
const EXTENSION = '.txt';
const HEADER = '# ukemusic setlist: one song title per line, in playing order';
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/;

function cleanName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '');
}

/** A setlist's name: { ok, name } or { ok: false, error }. taken: the names already used */
function checkName(rawName, taken = [], { except = '' } = {}) {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: 'Please give the setlist a name.' };
  if (ILLEGAL.test(name)) return { ok: false, error: 'Names can\'t contain any of these characters: < > : " / \\ | ? *' };
  if (name.length > 80) return { ok: false, error: 'Names can be at most 80 characters.' };
  if (name.toLowerCase() !== String(except).toLowerCase() && taken.some((t) => String(t).toLowerCase() === name.toLowerCase())) {
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

/** The lines of a setlist file (the songs), without the comments */
function parseSetlist(text) {
  return String(text || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
}

function formatSetlist(songs) {
  return `${HEADER}\n${(songs || []).map((s) => formatEntry(typeof s === 'string' ? parseEntry(s) : s)).filter(Boolean).join('\n')}\n`;
}

/** A song renamed: its title in a setlist's lines changes too (any key kept). -> the new lines, or null if none changed */
function renameInLines(lines, oldTitle, newTitle) {
  let changed = false;
  const out = lines.map((line) => {
    const entry = parseEntry(line);
    if (entry.title.toLowerCase() !== cleanName(oldTitle).toLowerCase()) return line;
    changed = true;
    return formatEntry({ ...entry, title: newTitle });
  });
  return changed ? out : null;
}

// A small, stable fingerprint of a setlist's text (to tell whether it changed since the last sync)
function hashText(text) {
  let h = 2166136261;
  const s = String(text || '').replace(/\r\n/g, '\n');
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

/** The setlist files in a Dropbox listing of the songs folder: [{ name, path, rev }] */
function setlistFiles(entries, root) {
  const dir = `/${[String(root || '').replace(/^\/+|\/+$/g, ''), SETLIST_DIR].filter(Boolean).join('/')}/`.toLowerCase();
  return (entries || [])
    .filter((e) => e.tag === 'file' && String(e.path).toLowerCase().startsWith(dir) && !String(e.path).slice(dir.length).includes('/') && String(e.path).toLowerCase().endsWith(EXTENSION))
    .map((e) => ({ name: String(e.path).split('/').pop().slice(0, -EXTENSION.length), path: e.path, rev: e.rev || '' }));
}

/**
 * What a sync does with the setlists. local: [{ name, text, rev, synced }] (synced: hashText of the
 * text at the last sync; rev: Dropbox's at the last sync), remote: setlistFiles(), deleted: names
 * deleted here since the last sync ([{ name, rev }]).
 *   pull     [{ local|null, remote }]   Dropbox's comes here (new there, or changed only there)
 *   push     [{ local, remote|null }]   this device's goes there (new here, or changed only here)
 *   conflict [{ local, remote }]        changed in both: Dropbox's comes in, this one is kept as a copy
 *   removeLocal [local]                 deleted there, not changed here
 *   removeRemote [remote]               deleted here, not changed there
 */
function planSetlistSync({ local = [], remote = [], deleted = [] }) {
  const key = (n) => cleanName(n).toLowerCase();
  const there = new Map(remote.map((r) => [key(r.name), r]));
  const gone = new Map(deleted.map((d) => [key(d.name), d]));
  const plan = { pull: [], push: [], conflict: [], removeLocal: [], removeRemote: [] };
  const seen = new Set();
  for (const l of local) {
    const k = key(l.name);
    seen.add(k);
    const r = there.get(k);
    const changedHere = !l.rev || hashText(l.text) !== l.synced;
    if (!r) {
      if (l.rev && !changedHere) plan.removeLocal.push(l);  // deleted in Dropbox
      else plan.push.push({ local: l, remote: null });     // new here (or changed here after it went there)
      continue;
    }
    const changedThere = r.rev !== l.rev;
    if (changedHere && changedThere) plan.conflict.push({ local: l, remote: r });
    else if (changedThere) plan.pull.push({ local: l, remote: r });
    else if (changedHere) plan.push.push({ local: l, remote: r });
  }
  for (const [k, r] of there) {
    if (seen.has(k)) continue;
    const d = gone.get(k);
    if (d && d.rev === r.rev) plan.removeRemote.push(r);   // deleted here, unchanged there
    else plan.pull.push({ local: null, remote: r });
  }
  return plan;
}

module.exports = { SETLIST_DIR, EXTENSION, HEADER, ILLEGAL, cleanName, checkName, parseEntry, formatEntry, parseSetlist, formatSetlist, renameInLines, hashText, setlistFiles, planSetlistSync };
