// Lyrics-only output: section headings and lyric lines; no chords, strums, tabs or diagrams.
const { isChordLine } = require('./chord-sheet');
const { lineCodes, styledHtml } = require('./rich-text');

/** Words with runs of spaces made single and the ends trimmed, keeping each letter's style */
function tidyWords(text, codes) {
  let out = '';
  const outCodes = [];
  for (let i = 0; i < text.length; i += 1) {
    const space = /\s/.test(text[i]);
    if (space && (out === '' || out.endsWith(' '))) continue;
    out += space ? ' ' : text[i];
    outCodes.push(codes[i] || 0);
  }
  while (out.endsWith(' ')) {
    out = out.slice(0, -1);
    outCodes.pop();
  }
  return { text: out, codes: outCodes };
}
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

/** IR -> [{ type: 'heading' | 'line' | 'blank', text }] with tidy spacing. */
function lyricsBlocks(irNodes) {
  const raw = [];
  for (const group of groupLines(irNodes || [])) {
    if (group.length === 0) {
      raw.push({ type: 'blank' });
      continue;
    }
    const structure = group.find((n) => n.type === 'structure');
    if (structure && group.every((n) => n.type === 'structure')) {
      raw.push({ type: 'heading', text: structure.content.trim() });
      continue;
    }
    const label = group[0].type === 'structure' ? group[0].content : null; // inline [[Label]]
    const words = tidyWords(group.filter((n) => n.type === 'lyric').map((n) => n.content).join(''), lineCodes(group));
    const lyric = words.text;
    // chord-only, strum-only and tab lines are dropped entirely — including
    // "chords above lyrics" lines that haven't been converted yet ("C  F  C  G7")
    const repeat = group.find((n) => n.type === 'repeat');
    if (lyric && !isChordLine(lyric)) raw.push({ type: 'line', text: repeat ? `${lyric} (x${repeat.count})` : lyric, codes: words.codes, label });
  }

  // Collapse blank runs, drop leading/trailing blanks, and put one blank before each heading
  const out = [];
  for (const block of raw) {
    const last = out[out.length - 1];
    if (block.type === 'blank') {
      if (last && last.type !== 'blank' && last.type !== 'heading') out.push(block);
      continue;
    }
    if (block.type === 'heading' && last && last.type !== 'blank') out.push({ type: 'blank' });
    out.push(block);
  }
  while (out.length && out[out.length - 1].type === 'blank') out.pop();
  return out;
}

function renderLyricsText(irNodes, { title = '' } = {}) {
  const lines = lyricsBlocks(irNodes).map((b) => {
    if (b.type === 'heading') return `[${b.text}]`;
    if (b.type === 'blank') return '';
    return b.label ? `${b.label} ${b.text}` : b.text;
  });
  return `${title ? `${title}\n\n` : ''}${lines.join('\n')}\n`;
}

/** Markup for the body of a lyrics page; sections are kept together when printing. */
function renderLyricsHtml(irNodes, { title = '' } = {}) {
  const parts = [];
  if (title) parts.push(`<h1 class="lyrics-title">${escapeHtml(title)}</h1>`);
  let open = false;
  let at = -1;
  let hasLines = false;
  let headed = false;
  const openSection = () => {
    at = parts.length;
    parts.push('<section class="song-section lyrics-section">');
    open = true;
    hasLines = false;
  };
  // A heading with no lines under it is a cue ("Chorus"): it stays when section names are hidden
  const closeSection = () => {
    if (!open) return;
    if (headed && !hasLines) parts[at] = '<section class="song-section lyrics-section section-cue">';
    parts.push('</section>');
  };
  for (const block of lyricsBlocks(irNodes)) {
    if (block.type === 'heading') {
      closeSection();
      openSection();
      headed = true;
      parts.push(`<h2 class="section">${escapeHtml(block.text)}</h2>`);
    } else {
      if (!open) { openSection(); headed = false; }
      if (block.type !== 'blank') hasLines = true;
      parts.push(block.type === 'blank'
        ? '<div class="lyric-gap"></div>'
        : `<p class="lyric-line">${block.label ? `<strong>${escapeHtml(block.label)}</strong> ` : ''}${styledHtml(block.text, block.codes, escapeHtml)}</p>`);
    }
  }
  closeSection();
  return parts.join('\n');
}

const LYRICS_CSS = `
  .lyrics-page { font-family: var(--font-family); color: var(--text-color); }
  .lyrics-title { font-family: var(--font-family); font-size: 1.6em; margin: 0 0 0.6em; }
  .lyrics-page .section { margin: 1.2em 0 0.3em; font-size: 1.1em; }
  .lyric-line { margin: 0; font-size: 1.15em; line-height: 1.5; }
  .lyric-gap { height: 0.8em; }
`;

module.exports = { lyricsBlocks, renderLyricsText, renderLyricsHtml, LYRICS_CSS };
