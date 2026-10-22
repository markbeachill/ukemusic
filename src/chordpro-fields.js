// ChordPro fields (4.27): every {field} a song has in ChordPro, kept in chordpro.txt in the
// song's folder so nothing in an imported file is lost. Fields that ukemusic also has (artist,
// tempo, key…) are linked: the song's own Info and settings win when the song is exported.
// Anything else — {subtitle}, {copyright}, {meta: …}, {x_…}, formatting lines, # comments — is
// kept as it was and written back out. Pure; unit tested.
//
// chordpro.txt is itself ChordPro:
//   {subtitle: Paul Simon}
//   {meta: source Folk songbook}
//   # a comment from the file
//   {textfont: Georgia}

// Standard fields, in the order they're written. `link` is where ukemusic keeps the same thing.
const FIELDS = [
  { name: 'title', link: 'title', where: 'the song\'s name' },
  { name: 'sorttitle' },
  { name: 'subtitle' },
  { name: 'artist', link: 'song.artist', where: 'Info → Artist' },
  { name: 'composer', link: 'song.writer', where: 'Info → Written by' },
  { name: 'lyricist' },
  { name: 'arranger' },
  { name: 'album', link: 'song.album', where: 'Info → Album' },
  { name: 'year', link: 'song.year', where: 'Info → Year' },
  { name: 'copyright' },
  { name: 'key', link: 'song.key', where: 'Info → Written in' },
  { name: 'capo' }, // kept, not linked: ChordPro writes capo shapes, ukemusic the sounding chords
  { name: 'tempo', link: 'song.tempo', where: 'This song → Tempo' },
  { name: 'time', link: 'song.beats_per_bar', where: 'This song → Time' },
  { name: 'duration' }
];
const NAMES = FIELDS.map((f) => f.name);
const ALIASES = { t: 'title', st: 'subtitle' };
const DIRECTIVE = /^\s*\{\s*([A-Za-z_][\w-]*)\s*(?::\s*([^}]*?)|\s+([^}]*?))?\s*\}\s*$/;

const cleanName = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
const cleanValue = (value) => String(value ?? '').replace(/[\r\n{}]+/g, ' ').trim();

/** chordpro.txt -> { fields: [{ name, value }], other: [lines] } */
function parseFields(text) {
  const fields = [];
  const other = [];
  for (const line of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (!line.trim()) continue;
    const m = line.match(DIRECTIVE);
    if (!m) { other.push(line); continue; }
    let name = m[1].toLowerCase();
    const value = (m[2] ?? m[3] ?? '').trim();
    name = ALIASES[name] || name;
    if (name === 'meta') {
      const [k, ...rest] = value.split(/\s+/);
      const key = cleanName(k);
      if (key) fields.push({ name: ALIASES[key] || key, value: rest.join(' ').trim() });
      continue;
    }
    if (NAMES.includes(name) || name.startsWith('x_')) fields.push({ name, value });
    else other.push(line);
  }
  return { fields, other };
}

/** { fields, other } -> chordpro.txt (standard fields first, in order; then the rest) */
function formatFields({ fields = [], other = [] } = {}) {
  const lines = [];
  const seen = new Set();
  const list = (fields || []).map((f) => ({ name: cleanName(f.name), value: cleanValue(f.value) })).filter((f) => f.name && f.value);
  for (const name of NAMES) {
    for (const f of list.filter((x) => x.name === name)) lines.push(`{${name}: ${f.value}}`);
    seen.add(name);
  }
  for (const f of list.filter((x) => !seen.has(x.name))) {
    lines.push(f.name.startsWith('x_') ? `{${f.name}: ${f.value}}` : `{meta: ${f.name} ${f.value}}`);
  }
  for (const line of other || []) if (String(line).trim()) lines.push(String(line).replace(/\s+$/, ''));
  return lines.length ? `${lines.join('\n')}\n` : '';
}

/** The first value of a field, or '' */
const valueOf = (fields, name) => ((fields || []).find((f) => f.name === name) || {}).value || '';

/**
 * The header of an exported .cho: the song's own values (linked fields) win; the kept fields
 * fill the rest; then any other kept lines. linked: { title, artist, … } from the song.
 */
function headerLines(storedText, linked = {}) {
  const { fields, other } = parseFields(storedText);
  const merged = [];
  for (const name of NAMES) {
    const own = linked[name];
    if (own !== undefined && own !== null && String(own).trim() !== '') merged.push({ name, value: String(own) });
    else for (const f of fields.filter((x) => x.name === name)) merged.push(f);
  }
  for (const f of fields.filter((x) => !NAMES.includes(x.name))) merged.push(f);
  const text = formatFields({ fields: merged, other });
  return text ? text.replace(/\n$/, '').split('\n') : [];
}

/** "3/4" -> 3; "6/8" -> 6; anything else -> null */
function beatsFromTime(time) {
  const m = String(time || '').match(/^\s*(\d+)\s*\/\s*(\d+)/);
  const n = m ? Number(m[1]) : NaN;
  return [2, 3, 4, 6].includes(n) ? n : null;
}

module.exports = { FIELDS, NAMES, parseFields, formatFields, headerLines, valueOf, beatsFromTime };
