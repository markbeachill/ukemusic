// Split chord+lyric lines that are too long to print at the chosen font size.
// Without this, a long line makes the PDF shrink the whole page to fit.
//
// A line is split at a space — preferably after a comma (or ; . ! ?) — choosing the break
// nearest the middle that lets both halves fit, so the halves come out balanced. Chords travel
// with their words; a chord sitting on the break goes to the start of the next part.
// Continuation lines are indented slightly. Chords-only lines are split into chunks.
// Works on parser IR; pure function, unit tested.

function groupLines(nodes) {
  const groups = [];
  let current = [];
  for (const node of nodes) {
    if (node.type === 'linebreak') {
      groups.push(current);
      current = [];
    } else {
      current.push(node);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

const { chordLabel } = require('./song-syntax');
const { lineCodes, hasStyles } = require('./rich-text');

const positionedTypes = new Set(['chord', 'bar', 'rhythm']);

function nodeWidth(node) {
  if (node.type === 'bar') return 1;
  return node.type === 'chord' ? chordLabel(node).length : String(node.content).length;
}

/** Printed width of a line in characters: the longer of the lyric and the chord line. */
function lineWidth(group) {
  const lyric = group.filter((n) => n.type === 'lyric').map((n) => n.content).join('').replace(/\s+$/, '');
  let cursor = 0;
  let first = true;
  for (const node of group.filter((n) => positionedTypes.has(n.type) && n.offset !== null).sort((a, b) => a.offset - b.offset)) {
    const start = first ? node.offset : Math.max(node.offset, cursor + 1);
    cursor = start + nodeWidth(node);
    first = false;
  }
  return Math.max(lyric.length, cursor);
}

function lyricOf(group) {
  return group.filter((n) => n.type === 'lyric').map((n) => n.content).join('');
}

function makeLine(template, text, positioned, codes = null) {
  const line = template.line;
  const lyric = { type: 'lyric', content: text, line, offset: null, warnings: [] };
  if (codes && hasStyles(codes)) lyric.styles = codes;
  return [
    ...positioned.filter((n) => n.offset === null),
    lyric,
    ...positioned.filter((n) => n.offset !== null).sort((a, b) => a.offset - b.offset)
  ];
}

function splitChordsOnly(group, max) {
  const positioned = group.filter((n) => positionedTypes.has(n.type) && n.offset !== null).sort((a, b) => a.offset - b.offset);
  const parts = [];
  let current = [];
  let width = 0;
  for (const node of positioned) {
    const w = nodeWidth(node) + (current.length ? 1 : 0);
    if (current.length && width + w > max) {
      parts.push(current);
      current = [];
      width = 0;
    }
    current.push({ ...node, offset: 0 });
    width += current.length > 1 ? nodeWidth(node) + 1 : nodeWidth(node);
  }
  if (current.length) parts.push(current);
  return parts.map((chunk) => makeLine(group[0], '', chunk));
}

function splitGroup(group, max, indent) {
  if (!group.length || group.some((n) => n.type === 'structure' || n.type === 'tab' || n.grid)) return [group];
  if (lineWidth(group) <= max) return [group];

  const lyric = lyricOf(group);
  if (!lyric.trim()) return splitChordsOnly(group, max);

  const text = lyric.replace(/\s+$/, '');
  const positioned = group.filter((n) => positionedTypes.has(n.type));
  const fits = (i) => {
    const first = makeLine(group[0], text.slice(0, i), positioned.filter((n) => n.offset === null || n.offset < i));
    return lineWidth(first) <= max;
  };
  const restFits = (i) => indent + (text.length - i - 1) <= max;

  const spaces = [];
  for (let i = 1; i < text.length - 1; i += 1) {
    if (text[i] === ' ' && text[i - 1] !== ' ') spaces.push(i);
  }
  const middle = text.length / 2;
  const byMiddle = (a, b) => Math.abs(a - middle) - Math.abs(b - middle);
  const punctuated = spaces.filter((i) => /[,;.!?:]/.test(text[i - 1]));
  const candidates = [
    punctuated.filter((i) => fits(i) && restFits(i)).sort(byMiddle)[0],
    spaces.filter((i) => fits(i) && restFits(i)).sort(byMiddle)[0],
    // nothing balanced fits: take the latest break that fits and split the rest again
    [...punctuated].reverse().find((i) => fits(i) && i > max * 0.5),
    [...spaces].reverse().find((i) => fits(i))
  ];
  const at = candidates.find((i) => i !== undefined);
  if (at === undefined) return [group];

  const pad = ' '.repeat(indent);
  const codes = lineCodes(group); // bold/italic/underline go with the words
  const firstPart = makeLine(group[0], text.slice(0, at), positioned.filter((n) => n.offset === null || n.offset < at), codes.slice(0, at));
  const rest = makeLine(
    group[0],
    pad + text.slice(at + 1),
    positioned
      .filter((n) => n.offset !== null && n.offset >= at)
      .map((n) => ({ ...n, offset: Math.max(indent, n.offset - at - 1 + indent) })),
    [...new Array(indent).fill(0), ...codes.slice(at + 1, text.length)]
  );
  return [firstPart, ...splitGroup(rest, max, indent)];
}

/** Returns a new IR with lines longer than maxChars split. maxChars <= 0 or missing: unchanged. */
function wrapLines(irNodes, maxChars, { indent = 2 } = {}) {
  if (!maxChars || maxChars < 10) return irNodes;
  const out = [];
  for (const group of groupLines(irNodes || [])) {
    const parts = splitGroup(group, maxChars, indent);
    for (const part of parts) {
      out.push(...part);
      out.push({ type: 'linebreak', content: '', line: part[0]?.line ?? group[0]?.line, offset: null, warnings: [] });
    }
    if (!group.length) continue;
  }
  return out;
}

module.exports = { wrapLines, lineWidth };
