// Chords edited on the sheet (4.77): the changes made by dragging or clicking a chord on the song
// sheet, made to the song's text, as if typed: [C] moved, put in, changed or taken out.
// The sheet (src/sheet-chord-editor.js) says where, as the parser counts it: the line (from 1, as
// in the file) and the letter in that line's words (with the [chords], {strums} and **bold**
// markers left out: a chord node's `offset`). Pure functions; unit tested.
//
//   apply(text, op, { shift })   the song text after op, or the same text if op can't be done
//     op: { type: 'move', line, at, nth, toLine, toAt }
//         { type: 'remove', line, at, nth }
//         { type: 'change', line, at, nth, name }
//         { type: 'insert', line, at, name }
//     nth: which chord, when more than one is on the same letter ([C][G]), counting from 0
//     shift: the semitones the sheet is shown moved by (key and capo): a chord named on the sheet
//            is written back in the song's own key

const { scanMarkers } = require('./rich-text');

/**
 * A line of song text as the parser reads it: its words without the markup, where each of their
 * letters is in the line (map[i]; map[words.length] is the end), and its [chords].
 */
function lineInfo(lineText) {
  const text = String(lineText || '');
  const { markers, escapes } = scanMarkers(text);
  const map = [];
  const chords = [];
  let words = '';
  let i = 0;
  while (i < text.length) {
    if (escapes.has(i)) { map.push(i + 1); words += text[i + 1]; i += 2; continue; }
    const ch = text[i];
    if (ch === '[' || ch === '{') {
      const close = text.indexOf(ch === '[' ? ']' : '}', i + 1);
      if (close !== -1) {
        if (ch === '[') chords.push({ start: i, end: close + 1, inner: text.slice(i + 1, close), at: words.length });
        i = close + 1;
        continue;
      }
    }
    const marker = markers.get(i);
    if (marker) { i += marker.length; continue; }
    map.push(i);
    words += ch;
    i += 1;
  }
  map.push(text.length);
  return { words, map, chords };
}

const isChord = (c) => c.inner && !/^\[|^[|%]$/.test(c.inner);
/** The chord at letter `at` (the nth there) */
function findChord(info, at, nth = 0) {
  return info.chords.filter((c) => c.at === at && isChord(c))[nth] || null;
}
/** Where a chord put at letter `at` goes in the line: before that letter, after any chords already there */
function placeFor(info, at) {
  const a = Math.max(0, Math.min(at, info.words.length));
  let pos = info.map[a];
  // a chord at the very end of the line, or chords already before this letter: after them
  for (const c of info.chords) if (c.at === a && c.end > pos && c.start <= pos) pos = c.end;
  if (a === info.words.length) { const last = info.chords.filter((c) => c.at === a).pop(); if (last) pos = Math.max(pos, last.end); }
  return pos;
}

// What follows a chord's name in its brackets and is kept when the chord changes: x2, :2, ↓…
const SUFFIX = /(?:[x×]\d.*|:.*|[↓↑].*|\s.*)$/;
const splitInner = (inner) => { const m = String(inner).match(SUFFIX); return m ? [inner.slice(0, m.index), m[0]] : [inner, '']; };

/** A chord as named on the sheet, in the song's own key */
function sourceName(name, shift = 0) {
  const clean = String(name || '').trim().replace(/[[\]]/g, '');
  if (!clean || !shift) return clean;
  try {
    const { transposeChord } = require('./transpose');
    const [base, rest] = splitInner(clean);
    return transposeChord(base, -shift, { spelling: 'common' }) + rest;
  } catch (_e) { return clean; }
}

function apply(text, op, { shift = 0 } = {}) {
  const lines = String(text).split('\n');
  const get = (n) => (n >= 1 && n <= lines.length ? lines[n - 1] : null);
  const setLine = (n, value) => { lines[n - 1] = value; };
  if (!op || !op.type) return text;
  if (op.type === 'insert') {
    const src = get(op.line);
    const name = sourceName(op.name, shift);
    if (src === null || !name) return text;
    const pos = placeFor(lineInfo(src), op.at);
    setLine(op.line, `${src.slice(0, pos)}[${name}]${src.slice(pos)}`);
    return lines.join('\n');
  }
  const src = get(op.line);
  if (src === null) return text;
  const chord = findChord(lineInfo(src), op.at, op.nth || 0);
  if (!chord) return text;
  if (op.type === 'remove') {
    setLine(op.line, src.slice(0, chord.start) + src.slice(chord.end));
    return lines.join('\n');
  }
  if (op.type === 'change') {
    const [, rest] = splitInner(chord.inner);
    const [base] = splitInner(sourceName(op.name, shift));
    if (!base) return text;
    setLine(op.line, `${src.slice(0, chord.start)}[${base}${rest}]${src.slice(chord.end)}`);
    return lines.join('\n');
  }
  if (op.type === 'move') {
    const toLine = op.toLine || op.line;
    if (get(toLine) === null) return text;
    if (toLine === op.line && op.toAt === op.at) return text;
    setLine(op.line, src.slice(0, chord.start) + src.slice(chord.end)); // the words' letters don't move
    const target = lines[toLine - 1];
    const pos = placeFor(lineInfo(target), op.toAt);
    setLine(toLine, `${target.slice(0, pos)}[${chord.inner}]${target.slice(pos)}`);
    return lines.join('\n');
  }
  return text;
}

module.exports = { apply, lineInfo, findChord, sourceName, placeFor };
