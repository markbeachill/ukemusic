// 4.99.4: My strums: the strums you build in the strum builder (src/strum-builder.js), kept in
// your settings (the desktop's playback.my_strums; the web player's look.myStrums) as one line:
//   Skiffle = 4/4 D-DUXUDU; Slow waltz = 3/4 B-D-D-
// A song that uses one keeps its pattern (playback.custom_strum, or a {pattern} line), so it
// plays the same on a computer that hasn't got your strums.

(function (root) {
const TIMES = { 4: '4/4', 3: '3/4', 6: '6/8', 2: '2/4' };
const BEATS = { '4/4': 4, '3/4': 3, '6/8': 6, '2/4': 2 };
const MAX = 40;

/** A name that fits in the line: no ; or =, one line, at most 40 characters */
function cleanName(name) {
  return String(name || '').replace(/[;=\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
}

/** The strokes of a pattern, as the song notation keeps them (D U X M B b - and >) */
function cleanPattern(pattern) {
  return String(pattern || '')
    .replace(/[↓]/g, 'D').replace(/[↑]/g, 'U').replace(/[✕×]/g, 'X').replace(/[⇣]/g, 'M')
    .replace(/[duxm]/g, (c) => c.toUpperCase())
    .replace(/[^DUXMBb>-]/g, '')
    .replace(/^>+/, '')
    .slice(0, 48);
}

/** "Skiffle = 4/4 D-DUXUDU; …" -> [{ name, beats, pattern }] (bad entries are left out) */
function parseMyStrums(text) {
  const out = [];
  for (const part of String(text || '').split(';')) {
    const m = part.match(/^\s*([^=]+?)\s*=\s*(?:(\d\/\d)\s+)?(.+?)\s*$/);
    if (!m) continue;
    const name = cleanName(m[1]);
    const pattern = cleanPattern(m[3]);
    const beats = BEATS[m[2]] || 4;
    if (!name || !pattern.replace(/[->]/g, '') || out.some((s) => s.name.toLowerCase() === name.toLowerCase())) continue;
    out.push({ name, beats, pattern });
    if (out.length >= MAX) break;
  }
  return out;
}

/** [{ name, beats, pattern }] -> "Skiffle = 4/4 D-DUXUDU; …" */
function formatMyStrums(list) {
  return parseMyStrums((list || []).map((s) => `${cleanName(s.name)} = ${TIMES[s.beats] || '4/4'} ${cleanPattern(s.pattern)}`).join('; '))
    .map((s) => `${s.name} = ${TIMES[s.beats] || '4/4'} ${s.pattern}`).join('; ');
}

/** The list with this strum added (or replacing one of the same name) */
function saveStrum(list, strum) {
  const name = cleanName(strum.name);
  const rest = (list || []).filter((s) => s.name.toLowerCase() !== name.toLowerCase());
  return parseMyStrums(formatMyStrums([...rest, { ...strum, name }]));
}

/** The list without the strum called name */
function removeStrum(list, name) {
  return (list || []).filter((s) => s.name.toLowerCase() !== String(name || '').toLowerCase());
}

const api = { parseMyStrums, formatMyStrums, saveStrum, removeStrum, cleanName, cleanPattern, TIMES, BEATS, MAX };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.UkeMyStrums = api;   // a page script: the desktop app and the web player
})(typeof window !== 'undefined' ? window : globalThis);
