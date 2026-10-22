const { chordLabel } = require('./song-syntax');

function repeatSpaces(count) {
  return count > 0 ? ' '.repeat(count) : '';
}

function groupLineNodes(nodes) {
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

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

function renderPositionedLine(nodes, renderer) {
  const positioned = nodes
    .filter((node) => node.type === 'chord' || node.type === 'bar' || node.type === 'rhythm')
    .sort((a, b) => {
      const aOffset = typeof a.offset === 'number' ? a.offset : 0;
      const bOffset = typeof b.offset === 'number' ? b.offset : 0;
      return aOffset - bOffset;
    });

  if (positioned.length === 0) {
    return '';
  }

  let line = '';
  let cursor = 0;

  for (const node of positioned) {
    const offset = typeof node.offset === 'number' ? node.offset : cursor;
    if (offset > cursor) {
      line += repeatSpaces(offset - cursor);
      cursor = offset;
    }

    const text = renderer(node);
    line += text;
    cursor += node.type === 'bar' ? 1 : (node.type === 'chord' ? chordLabel(node) : node.content).length;
  }

  return line;
}

function renderChordLine(nodes) {
  return renderPositionedLine(
    nodes.filter((node) => node.type === 'chord' || node.type === 'bar'),
    (node) => (node.type === 'bar' ? '|' : chordLabel(node))
  );
}

// Same mapping as the HTML renderer: one character in, one character out, so alignment is unaffected
const ARROW_MAP = { D: '↓', d: '↓', U: '↑', u: '↑', X: '✕', x: '✕' };

function transformRhythmNotation(text, notation) {
  if (notation !== 'arrows') return text;
  return text.replace(/[DdUuXx]/g, (ch) => ARROW_MAP[ch] || ch);
}

// {A: …} / {A} / {stop}
function rhythmText(node, notation) {
  if (node.stop) return 'Stop: one strum, let it ring';
  if (node.recall) return `Strum ${node.strumName}`;
  const text = transformRhythmNotation(node.content, notation);
  return node.strumName ? `${node.strumName}: ${text}` : text;
}

function renderRhythmLine(nodes, notation) {
  const rhythmNodes = nodes.filter((node) => node.type === 'rhythm' && !node.inlineStop);
  if (rhythmNodes.length === 0) {
    return '';
  }

  const allStandalone = rhythmNodes.every((node) => node.offset === null);
  if (allStandalone && rhythmNodes.length === 1) {
    return rhythmText(rhythmNodes[0], notation);
  }

  return renderPositionedLine(rhythmNodes, (node) => rhythmText(node, notation));
}

function renderLyricLine(nodes) {
  return nodes
    .filter((node) => node.type === 'lyric')
    .map((node) => node.content)
    .join('');
}

/**
 * Build aligned chord + lyric lines, padding lyrics when chord names
 * are wider than the lyric text beneath them, and inserting matching
 * spaces for bar markers.
 */
function renderAlignedLines(nodes) {
  const chordNodes = nodes
    .filter((n) => n.type === 'chord' || n.type === 'bar')
    .sort((a, b) => {
      const ao = typeof a.offset === 'number' ? a.offset : 0;
      const bo = typeof b.offset === 'number' ? b.offset : 0;
      return ao - bo;
    });

  const lyricText = nodes.filter((n) => n.type === 'lyric').map((n) => n.content).join('');

  if (chordNodes.length === 0) {
    return { chordLine: '', lyricLine: lyricText };
  }

  const MIN_GAP = 1;
  let chordCursor = 0;
  const items = [];

  for (const node of chordNodes) {
    const origOffset = typeof node.offset === 'number' ? node.offset : chordCursor;
    const width = node.type === 'bar' ? 1 : chordLabel(node).length;
    let adjustedOffset = origOffset;
    if (chordCursor > origOffset) {
      adjustedOffset = chordCursor;
    }
    // (also when a chord starts exactly where the previous one ends, e.g. "[C] [F]",
    // which used to print as "CF")
    if (items.length > 0 && adjustedOffset < chordCursor + MIN_GAP) {
      adjustedOffset = chordCursor + MIN_GAP;
    }
    items.push({ origOffset, adjustedOffset, width, node, isBar: node.type === 'bar' });
    chordCursor = adjustedOffset + width;
  }

  // Pad lyric string
  let paddedLyric = lyricText;
  const insertions = [];
  let totalShift = 0;
  for (const item of items) {
    const shiftExtra = item.adjustedOffset - item.origOffset - totalShift;
    if (item.isBar) {
      const barPad = Math.max(shiftExtra, 0) + 1;
      insertions.push({ at: item.origOffset, count: barPad });
      totalShift += barPad;
    } else if (shiftExtra > 0) {
      insertions.push({ at: item.origOffset, count: shiftExtra });
      totalShift += shiftExtra;
    }
  }
  for (let i = insertions.length - 1; i >= 0; i--) {
    const { at, count } = insertions[i];
    const insertAt = Math.min(at, paddedLyric.length);
    paddedLyric = paddedLyric.slice(0, insertAt) + ' '.repeat(count) + paddedLyric.slice(insertAt);
  }

  // Build chord line using adjusted offsets
  let chordLine = '';
  let cursor = 0;
  for (const item of items) {
    if (item.adjustedOffset > cursor) {
      chordLine += repeatSpaces(item.adjustedOffset - cursor);
      cursor = item.adjustedOffset;
    }
    const text = item.node.type === 'bar' ? '|' : chordLabel(item.node);
    chordLine += text;
    cursor += item.width;
  }

  return { chordLine, lyricLine: paddedLyric };
}

function styleRhythm(text, style) {
  if (!text) {
    return '';
  }

  if (style === 'bold') {
    return `**${text}**`;
  }

  if (style === 'italic') {
    return `*${text}*`;
  }

  return text;
}

function fenceCodeBlock(lines) {
  return ['```', ...lines, '```'].join('\n');
}

function renderGroup(group, config) {
  if (group.length === 0) {
    return '';
  }

  const firstNode = group[0];

  if (group.length === 1 && firstNode.type === 'structure') {
    return `## ${firstNode.content}`;
  }

  if (group.length === 1 && firstNode.type === 'tab') {
    return ['```tab', firstNode.content, '```'].join('\n');
  }

  // A bar line: "| C | G C | % |" as written, in a code block
  if (group.some((n) => n.grid)) {
    const bars = [];
    for (const n of group) {
      if (!n.grid || n.hidden) continue;
      (bars[n.gridBar] = bars[n.gridBar] || []).push(n.mark || chordLabel(n));
    }
    const repeat = group.find((n) => n.type === 'repeat');
    return fenceCodeBlock([`| ${bars.filter(Boolean).map((b) => b.join(' ')).join(' | ')} |${repeat ? `  x${repeat.count}` : ''}`]);
  }

  const rhythmLine = renderRhythmLine(group, config && (config.rhythmNotation || config.rhythm_notation));
  const { chordLine, lyricLine } = renderAlignedLines(group);
  const style = (config && config.markdown_rhythm_style) || 'plain';

  if (rhythmLine && !chordLine && !lyricLine) {
    return styleRhythm(rhythmLine, style);
  }

  const parts = [];

  if (rhythmLine) {
    parts.push(styleRhythm(rhythmLine, style));
  }

  if (chordLine || lyricLine) {
    const blockLines = [];
    if (chordLine) {
      blockLines.push(chordLine);
    }
    if (lyricLine || chordLine) {
      blockLines.push(lyricLine);
    }
    const repeat = group.find((n) => n.type === 'repeat');
    if (repeat) blockLines[blockLines.length - 1] = `${blockLines[blockLines.length - 1].replace(/\s+$/, '')}  x${repeat.count}`;
    parts.push(fenceCodeBlock(blockLines));
  }

  return parts.join('\n');
}

// [[Label]] + content on one line: label at the start of the line (plain text in a code block)
function withInlineLabel(group, config) {
  if (!(group.length > 1 && group[0].type === 'structure')) return renderGroup(group, config);
  const label = group[0].content;
  const body = group.slice(1);
  if (!body.some((n) => n.type !== 'lyric' || n.content.trim())) return renderGroup([group[0]], config);
  const hasLyrics = body.some((n) => n.type === 'lyric' && n.content.trim());
  const out = renderGroup(body, config);
  const lines = out.split('\n');
  const fence = lines.indexOf('```');
  if (fence === -1) return `**${label}** ${out}`;
  const chordIndex = fence + 1;
  const hasChordLine = lines[fence + 2] !== undefined && lines[fence + 2] !== '```';
  const pad = ' '.repeat(label.length);
  if (body.some((n) => n.grid)) {
    lines[chordIndex] = `${label} ${lines[chordIndex]}`;
  } else if (hasChordLine) {
    lines[chordIndex] = (hasLyrics ? pad : label) + lines[chordIndex];
    lines[chordIndex + 1] = (hasLyrics ? label : pad) + lines[chordIndex + 1];
  } else {
    lines[chordIndex] = label + lines[chordIndex];
  }
  return lines.join('\n');
}

function renderMarkdown(irNodes, config = {}) {
  if (!Array.isArray(irNodes)) {
    throw new TypeError('renderMarkdown expects an array of IR nodes.');
  }

  return groupLineNodes(irNodes)
    .map((group) => withInlineLabel(group, config))
    .join('\n');
}

module.exports = renderMarkdown;
module.exports.renderMarkdown = renderMarkdown;
