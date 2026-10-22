// Bold, italic and underline in the words (4.13).
//
//   **bold**   *italic*   __underline__   (and \* or \_ for a real * or _)
//
// The parser takes the markers out of the words, so everything that counts letters (chord
// positions, line wrapping, karaoke, lyrics, ChordPro…) sees plain text. Each lyric node that
// has formatting gets `styles`: one number per character (1 bold, 2 italic, 4 underline).
// The HTML renderers put the formatting back with styledHtml().
// A marker only counts when it has a partner later in the same line, so a lone * stays a *.
// Pure functions: unit tested.

const BOLD = 1;
const ITALIC = 2;
const UNDERLINE = 4;
const KINDS = [
  { text: '**', bit: BOLD },
  { text: '__', bit: UNDERLINE },
  { text: '*', bit: ITALIC }
];

/**
 * Find the markers in a line of song text (outside [chords] and {strums}).
 * Returns { markers: Map(index -> { bit, length }), escapes: Set(index) }.
 */
function scanMarkers(lineText) {
  const text = String(lineText || '');
  const found = { [BOLD]: [], [ITALIC]: [], [UNDERLINE]: [] };
  const escapes = new Set();
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\' && (text[i + 1] === '*' || text[i + 1] === '_')) {
      escapes.add(i);
      i += 2;
      continue;
    }
    if (ch === '[' || ch === '{') {
      const close = text.indexOf(ch === '[' ? ']' : '}', i + 1);
      if (close !== -1) {
        i = close + 1;
        continue;
      }
    }
    const kind = KINDS.find((k) => text.startsWith(k.text, i));
    if (kind) {
      found[kind.bit].push(i);
      i += kind.text.length;
      continue;
    }
    i += 1;
  }
  const markers = new Map();
  for (const kind of KINDS) {
    const list = found[kind.bit];
    const paired = list.length - (list.length % 2); // a lone last one is just a character
    for (let k = 0; k < paired; k += 1) markers.set(list[k], { bit: kind.bit, length: kind.text.length });
  }
  return { markers, escapes };
}

function hasStyles(codes) {
  return Array.isArray(codes) && codes.some(Boolean);
}

/** One style number per character of a lyric node (zeros when it has no formatting) */
function nodeCodes(node) {
  const length = String(node.content || '').length;
  if (Array.isArray(node.styles) && node.styles.length === length) return node.styles;
  return new Array(length).fill(0);
}

/** The style numbers for the words of a line (its lyric nodes joined) */
function lineCodes(nodes) {
  const out = [];
  for (const node of nodes) if (node.type === 'lyric') out.push(...nodeCodes(node));
  return out;
}

/** Spaces put into the words (to make room for chords) keep the formatting both sides share */
function insertCodes(codes, at, count) {
  const before = at > 0 ? codes[at - 1] || 0 : 0;
  const after = codes[at] || 0;
  const fill = before & after;
  return [...codes.slice(0, at), ...new Array(count).fill(fill), ...codes.slice(at)];
}

/** HTML for text with its style numbers: <strong>, <em>, <u> around each run */
function styledHtml(text, codes, toHtml) {
  const str = String(text || '');
  if (!hasStyles(codes)) return toHtml(str);
  let html = '';
  let start = 0;
  for (let i = 1; i <= str.length; i += 1) {
    if (i === str.length || (codes[i] || 0) !== (codes[start] || 0)) {
      const code = codes[start] || 0;
      let run = toHtml(str.slice(start, i));
      if (code & UNDERLINE) run = `<u>${run}</u>`;
      if (code & ITALIC) run = `<em>${run}</em>`;
      if (code & BOLD) run = `<strong>${run}</strong>`;
      html += run;
      start = i;
    }
  }
  return html;
}

module.exports = { BOLD, ITALIC, UNDERLINE, scanMarkers, hasStyles, nodeCodes, lineCodes, insertCodes, styledHtml };
