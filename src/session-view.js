// Session screen (4.35): a song laid out for a group to play from one screen (a TV or a
// projector at a club night). The song is cut into blocks (a verse, a chorus…) that are never
// split; src/session-fit.js then finds the columns and the largest text that fit the screen.
//
//   sessionHtml(ir, { mode })   ir (transposed) -> HTML. mode 'over': chords above their words,
//                               built so lines can wrap anywhere (a chord sits on top of the
//                               first word after it); 'inline': chords in the words.
//   sessionChords(ir)           the chords the song uses, in order (for the diagrams)
//   SESSION_CSS                 the styles both modes need
// Pure functions (no DOM): unit tested, used by the desktop app and the web player.
const { chordLabel } = require('./song-syntax');
const { styledHtml } = require('./rich-text');

const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** IR -> lines (one array of nodes per source line), blank lines as [] */
function lines(ir) {
  const out = [];
  let cur = [];
  for (const n of ir || []) {
    if (n.type === 'linebreak') { out.push(cur); cur = []; } else cur.push(n);
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Lines -> blocks: a blank line or a heading on its own line starts a new one */
function blocks(ir) {
  const out = [];
  let block = null;
  const start = (label = '') => { block = { label, lines: [] }; out.push(block); };
  for (const line of lines(ir)) {
    if (!line.length) { block = null; continue; }
    if (line.length === 1 && line[0].type === 'structure') { start(line[0].content.trim()); continue; }
    if (!block) start();
    block.lines.push(line);
  }
  return out.filter((b) => b.lines.length || b.label);
}

/** Text of a run of lyric nodes with their style codes (bold, italic…) */
function styledText(nodes) {
  let text = '';
  const codes = [];
  for (const n of nodes) {
    const t = String(n.content);
    text += t;
    for (let i = 0; i < t.length; i += 1) codes.push((n.styles && n.styles[i]) || 0);
  }
  return { text, codes };
}
const styled = (text, codes) => styledHtml(text, codes, esc);

/** One chord's label as HTML */
function chordHtml(n, cls = 'c') {
  if (n.type === 'bar') return `<b class="${cls} bar">|</b>`;
  const kind = n.noChord ? ' nc' : '';
  return `<b class="${cls}${kind}">${esc(chordLabel(n))}</b>`;
}

/** A line of bars, "| C | G C | % |" */
function gridLine(line) {
  const bars = [];
  for (const n of line) {
    if (!n.grid || n.hidden) continue;
    (bars[n.gridBar] = bars[n.gridBar] || []).push(n.mark ? esc(n.mark) : chordHtml(n, 'c'));
  }
  return `<span class="g">| ${bars.filter(Boolean).map((b) => b.join(' ')).join(' | ')} |</span>`;
}

/**
 * A line of words and chords, chords above the words. It's built word by word: a chord sits on
 * the letters after it, and a word with a chord in it never breaks, so the line can wrap at any
 * space and the chords stay over their words.
 */
function overLine(line) {
  const items = []; // { chord } or { ch, code }
  for (const n of line) {
    if (n.type === 'chord' || n.type === 'bar') items.push({ chord: n });
    else if (n.type === 'lyric') [...String(n.content)].forEach((ch, i) => items.push({ ch, code: (n.styles && n.styles[i]) || 0 }));
  }
  // words: split at spaces (chords belong to the word they're in, or stand alone between spaces)
  const words = [];
  let word = [];
  for (const it of items) {
    if (it.ch !== undefined && /\s/.test(it.ch)) { if (word.length) words.push(word); word = []; } else word.push(it);
  }
  if (word.length) words.push(word);
  const hasChords = items.some((it) => it.chord);
  const html = words.map((w) => {
    let out = '';
    let unit = false;
    for (let i = 0; i < w.length; i += 1) {
      if (!w[i].chord) {
        let j = i;
        while (j < w.length && !w[j].chord) j += 1;
        out += styled(w.slice(i, j).map((x) => x.ch).join(''), w.slice(i, j).map((x) => x.code));
        i = j - 1;
        continue;
      }
      // the letters under this chord: up to the next chord or the end of the word
      let j = i + 1;
      while (j < w.length && !w[j].chord) j += 1;
      const under = w.slice(i + 1, j);
      const text = under.length ? styled(under.map((x) => x.ch).join(''), under.map((x) => x.code)) : '&nbsp;';
      out += `<span class="u">${chordHtml(w[i].chord)}<span class="w">${text}</span></span>`;
      unit = true;
      i = j - 1;
    }
    return unit ? `<span class="wd">${out}</span>` : out;
  }).join(' ');
  return { html, hasChords };
}

/** A line of words and chords, chords in the words */
function inlineLine(line) {
  let html = '';
  let hasChords = false;
  for (const n of line) {
    if (n.type === 'chord' || n.type === 'bar') { html += chordHtml(n, 'ci'); hasChords = true; } else if (n.type === 'lyric') html += styled(n.content, n.styles || []);
  }
  return { html, hasChords };
}

/** One line -> HTML */
function lineHtml(line, mode) {
  const tab = line.find((n) => n.type === 'tab');
  if (tab) return `<pre class="ss-tab">${esc(tab.content)}</pre>`;
  const rhythms = line.filter((n) => n.type === 'rhythm' && !n.inlineStop);
  const rest = line.filter((n) => n.type !== 'rhythm' && n.type !== 'repeat');
  const repeat = line.find((n) => n.type === 'repeat');
  const label = rest[0] && rest[0].type === 'structure' ? `<span class="il">${esc(rest[0].content)}</span> ` : '';
  const body = rest.filter((n) => n.type !== 'structure');
  const rep = repeat ? ` <span class="rep">×${repeat.count}</span>` : '';
  if (!body.length) {
    if (!rhythms.length) return label ? `<div class="ln">${label}${rep}</div>` : '';
    // a strum on its own line: small, as written
    return `<div class="ss-strum"><span class="sl">Strum</span> ${rhythms.map((r) => esc(r.stop ? 'stop' : (r.recall ? r.strumName : (r.strumName ? `${r.strumName}: ${r.content.split(':').slice(1).join(':').trim() || r.content}` : r.content.trim())))).join(' ')}</div>`;
  }
  if (body.some((n) => n.grid)) return `<div class="ln grid">${label}${gridLine(body)}${rep}</div>`;
  const { html, hasChords } = mode === 'inline' ? inlineLine(body) : overLine(body);
  const harmony = body.some((n) => n.harmony) ? ' harmony' : '';
  return `<div class="ln${hasChords ? ' ch' : ''}${harmony}">${label}${html}${rep}</div>`;
}

/** The song as session-screen blocks */
function sessionHtml(ir, { mode = 'over' } = {}) {
  return blocks(ir).map((b) => {
    const label = b.label ? `<div class="lab">${esc(b.label)}</div>` : '';
    const body = b.lines.map((l) => lineHtml(l, mode)).join('');
    return `<section class="blk">${label}${body}</section>`;
  }).join('\n');
}

/** The chords a song uses, in the order they first come (no N.C.) */
function sessionChords(ir) {
  const seen = [];
  for (const n of ir || []) if (n.type === 'chord' && !n.noChord && !n.hidden && !seen.includes(n.content)) seen.push(n.content);
  return seen;
}

// Sizes are in em, so the fit (src/session-fit.js) only has to set one font size.
const SESSION_CSS = `
.ss-lyrics { column-fill: auto; overflow: visible; line-height: 1.3; }
.ss-lyrics .blk { break-inside: avoid; padding-bottom: 0.7em; }
.ss-lyrics .lab { font-weight: 800; font-size: 0.82em; letter-spacing: 0.02em; color: var(--ss-label, #1a5276); margin-bottom: 0.1em; }
.ss-lyrics .ln { margin: 0; overflow-wrap: anywhere; }
.ss-lyrics.over .ln.ch { line-height: 1.15; padding-top: 0.15em; }
.ss-lyrics .wd { white-space: nowrap; }
/* a chord over its word: an inline block whose baseline is the word's, so it lines up with the words around it */
.ss-lyrics .u { display: inline-block; text-indent: 0; }
.ss-lyrics .u .c { display: block; font-size: 0.85em; line-height: 1.15; padding-right: 0.3em; white-space: nowrap; }
.ss-lyrics .u .w { display: block; }
.ss-lyrics .c, .ss-lyrics .ci { color: var(--ss-chord, #b22222); font-weight: 800; }
.ss-lyrics .ci { font-size: 0.85em; margin: 0 0.12em; white-space: nowrap; }
.ss-lyrics .bar { color: var(--ss-faint, #888); font-weight: 400; }
.ss-lyrics .nc { color: var(--ss-faint, #888); }
.ss-lyrics .il { font-weight: 800; font-size: 0.82em; color: var(--ss-label, #1a5276); }
.ss-lyrics .rep { font-weight: 800; color: var(--ss-label, #1a5276); white-space: nowrap; }
.ss-lyrics .grid .g { white-space: nowrap; }
.ss-lyrics .grid .c { font-size: 1em; }
.ss-lyrics .harmony { font-style: italic; }
.ss-lyrics .ss-strum .sl { font-family: "Segoe UI", Arial, "Liberation Sans", sans-serif; font-weight: 800; color: var(--ss-label, #1a5276); margin-right: 0.3em; }
.ss-lyrics .ss-strum { font-size: 0.75em; color: var(--ss-faint, #777); font-family: ui-monospace, Consolas, monospace; }
.ss-lyrics .ss-tab { font-size: 0.7em; line-height: 1.15; margin: 0.2em 0; font-family: ui-monospace, Consolas, "Courier New", monospace; white-space: pre; }
`;

/**
 * Everything the Session screen needs for one song: its HTML both ways and its chord shapes.
 *   shown     the song's IR, already in the key and capo to show
 *   library   the chord library for the instrument (shapes for the diagrams)
 *   common    the song's common-chords list (diagrams.common_chords), or undefined for the usual
 */
function sessionSong(shown, { title = '', sub = '', folder = '', library = null, common, leftHanded = false } = {}) {
  const { getChordDefinition } = require('./chord-library');
  const renderDiagramSvg = require('./diagram-svg');
  const { isCommonChord } = require('./renderer-html');
  const diagrams = sessionChords(shown).map((name) => {
    let svg = '';
    try {
      const def = library ? getChordDefinition(library, name) : null;
      if (def) svg = String(renderDiagramSvg({ ...def, name }, { left_handed: leftHanded, show_fingers: true }));
    } catch (_e) { /* no shape */ }
    return { name, common: isCommonChord(name, common), svg };
  });
  return { title, sub, folder, diagrams, html: { over: sessionHtml(shown, { mode: 'over' }), inline: sessionHtml(shown, { mode: 'inline' }) } };
}

module.exports = { sessionHtml, sessionChords, sessionSong, blocks, SESSION_CSS };
