// Strum info boxes: how a {strum pattern} is shown on the song sheet.
//
// Strumming matters on a ukulele: it makes up for the small range of notes and gives the
// rhythm its bounce. So a pattern gets a small box with the time signature, the pattern's
// name (when it's one from the strum library), arrows, the letters, and the count
// (1 & 2 & …), all lined up.
//
// Styles (Settings → Look → Strum patterns), so more can be added later:
//   comic    bold black box with a solid time panel and a drop shadow ("info box")
//   clean    light rounded box, quieter
//   compact  one line: time, arrows, letters, name (good for printing long songs)
//   plain    the pattern as typed (letters, or arrows if chosen), as before
//
// Readability: every size is relative to the sheet's own font (--monospace-size), and
// nothing goes below 0.85 of it (or 12px). All styles work printed in black and white:
// accents are bold and underlined, a time change is written out, not just coloured.
//
// A pattern can carry its own time signature: {3/4 D-DUDU}. From there on the song is in
// that time (playback too) until another one says otherwise.

const ARROWS = { D: '↓', U: '↑', X: '✕', '-': '·' };
/** How a number of beats is usually written: 4 → 4/4, 3 → 3/4, 6 → 6/8 */
const timeLabel = (beats) => ({ 6: '6/8', 12: '12/8', 9: '9/8' }[beats] || `${beats}/4`);
const STYLES = ['comic', 'clean', 'compact', 'plain'];

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** "3/4 D-DUDU" -> { beats: 3, label: '3/4' }; no time signature -> null */
function strumTime(text) {
  const m = String(text || '').match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})(?:\s|$)/);
  if (!m) return null;
  const beats = Number(m[1]);
  if (![2, 3, 4, 5, 6, 7, 9, 12].includes(beats)) return null;
  return { beats, label: `${m[1]}/${m[2]}` };
}

/** The strokes: [{ stroke: 'D'|'U'|'X'|'-', accent }] (same reading as playback) */
function strumSteps(text) {
  const slots = String(text || '')
    .replace(/(?:^|\s)\d{1,2}\s*\/\s*\d{1,2}(?=\s|$)/g, ' ')
    .replace(/[↓]/g, 'D').replace(/[↑]/g, 'U').replace(/[✕×]/g, 'X')
    .toUpperCase()
    .replace(/[^DUX>-]/g, '')
    .replace(/^>+/, '')
    .replace(/-?>+/g, (m) => (m[0] === '-' ? '-' : '>'));
  const steps = [];
  for (const ch of slots === 'DDUUDU' ? 'D-DU-UDU' : slots) {
    if (ch === '>') {
      if (steps.length) steps[steps.length - 1].accent = true;
    } else {
      steps.push({ stroke: ch, accent: false });
    }
  }
  return steps;
}

/**
 * What to count under each stroke: beat numbers on the beat, "&" halfway, "e" and "a" for
 * sixteenths, "&" "a" for triplets. Returns [{ text, beat }] or null if the pattern doesn't
 * divide the bar evenly.
 */
function strumCounts(count, beats) {
  if (!count || !beats) return null;
  if (count % beats === 0) {
    const per = count / beats;
    const subs = { 1: [], 2: ['&'], 3: ['&', 'a'], 4: ['e', '&', 'a'] }[per];
    if (!subs) return null;
    const out = [];
    for (let b = 1; b <= beats; b += 1) {
      out.push({ text: String(b), beat: true });
      for (const s of subs) out.push({ text: s, beat: false });
    }
    return out;
  }
  if (beats % count === 0) {
    const per = beats / count;
    return Array.from({ length: count }, (_, i) => ({ text: String(i * per + 1), beat: true }));
  }
  return null;
}

/** The library strum this pattern is (exactly, or the same strokes without the accents) */
function strumName(steps, beats) {
  let library = [];
  try {
    library = require('./strums').STRUMS;
  } catch (_err) {
    return '';
  }
  const key = (s, accents) => s.map((x) => x.stroke + (accents && x.accent ? '>' : '')).join('');
  const exact = key(steps, true);
  const plain = key(steps, false);
  const fits = library.filter((s) => !beats || s.beats === beats);
  const match = fits.find((s) => key(strumSteps(s.pattern), true) === exact)
    || fits.find((s) => key(strumSteps(s.pattern), false) === plain);
  return match ? match.name : '';
}

/**
 * The HTML for one {pattern}.
 *   text: what's between the braces
 *   ctx:  { style, notation ('raw'|'arrows'), beats (time in force), timeLabel, tempo,
 *           first (the song's first box), timeChanged }
 */
function renderStrum(text, ctx = {}) {
  const style = STYLES.includes(ctx.style) ? ctx.style : 'comic';
  const ownName = ctx.strumName ? String(ctx.strumName) : '';
  if (style === 'plain') {
    if (ctx.stop) return '<div class="rhythm">Stop: one strum, let it ring</div>';
    if (ctx.recall) return `<div class="rhythm">Strum ${escapeHtml(ownName)}</div>`;
    const shown = ctx.notation === 'arrows'
      ? String(text).replace(/[DdUuXx]/g, (ch) => ({ d: '↓', u: '↑', x: '✕' }[ch.toLowerCase()]))
      : String(text);
    return `<div class="rhythm">${ownName ? `${escapeHtml(ownName)}: ` : ''}${escapeHtml(shown)}${ctx.feelLabel ? ` <span class="sb-feel">(${escapeHtml(ctx.feelLabel)})</span>` : ''}</div>`;
  }
  const arrow = (s) => ARROWS[s.stroke] || s.stroke;
  const arrowSpans = (steps) => steps.map((s) => `<span class="sb-a${s.accent ? ' acc' : ''}${s.stroke === '-' ? ' rest' : ''}">${arrow(s)}</span>`).join('');

  // {stop}: one strum on the next chord, left to ring
  if (ctx.stop) {
    return `<div class="strum-box strum-stop style-${style}"><span class="sb-ref">STOP</span><span class="sb-arrows"><span class="sb-a">↓</span></span><span class="sb-note">one strum, let it ring</span></div>`;
  }
  // {A}: a strum named earlier. A small tag with the arrows as a reminder.
  if (ctx.recall) {
    const parts = String(text).split('|').map(strumSteps).filter((p) => p.length);
    return `<div class="strum-box strum-recall style-${style}"><span class="sb-ref">${escapeHtml(ownName)}</span>`
      + `<span class="sb-arrows">${parts.map(arrowSpans).join('<span class="sb-sep">|</span>')}</span></div>`;
  }

  // Bars that take turns: {D-DU-UDU | D-DUDU}
  const parts = String(text).split('|').map((p) => p.trim()).filter(Boolean);
  const partSteps = parts.map(strumSteps);
  const steps = partSteps.flat();
  if (!steps.length || partSteps.some((p) => !p.length)) return `<div class="rhythm">${escapeHtml(text)}</div>`;
  const beats = ctx.beats || 4;
  const label = ctx.timeLabel || timeLabel(beats);
  const libraryName = parts.length === 1 ? strumName(steps, beats) : '';
  const name = [ownName ? `Strum ${ownName}` : '', libraryName || (parts.length > 1 ? `${parts.length} bars, taking turns` : ''), ctx.feelLabel || '']
    .filter(Boolean).join(' · ');
  // 6/8 and the like: the tempo is per dotted quarter (♩.)
  const bpm = ctx.tempo ? (ctx.compound ? `♩. = ${ctx.tempo}` : `${ctx.tempo} bpm`) : '';
  const sub = ctx.timeChanged ? 'new time' : (ctx.first ? bpm : '');
  const classes = `strum-box style-${style}${ctx.timeChanged ? ' time-change' : ''}${parts.length > 1 ? ' strum-turns' : ''}`;

  if (style === 'compact') {
    const arrows = partSteps.map(arrowSpans).join('<span class="sb-sep">|</span>');
    const letters = partSteps.map((p) => p.map((s) => (s.stroke === '-' ? '-' : s.stroke) + (s.accent ? '>' : '')).join('')).join(' | ');
    return `<div class="${classes}"><span class="sb-time">${escapeHtml(label)}${ctx.timeChanged ? ' <em>new time</em>' : ''}</span>`
      + `${ownName ? `<span class="sb-ref">${escapeHtml(ownName)}</span>` : ''}`
      + `<span class="sb-arrows">${arrows}</span><span class="sb-letters">${escapeHtml(letters)}</span>`
      + `${libraryName ? `<span class="sb-name">${escapeHtml(libraryName)}</span>` : ''}`
      + `${ctx.feelLabel ? `<span class="sb-name sb-feel">${escapeHtml(ctx.feelLabel)}</span>` : ''}</div>`;
  }

  const grid = (p, k) => {
    const counts = strumCounts(p.length, beats);
    const cells = [];
    for (const s of p) cells.push(`<span class="sb-a${s.accent ? ' acc' : ''}${s.stroke === '-' ? ' rest' : ''}">${arrow(s)}</span>`);
    for (const s of p) cells.push(`<span class="sb-l${s.accent ? ' acc' : ''}">${s.stroke}</span>`);
    if (counts) for (const c of counts) cells.push(`<span class="sb-n${c.beat ? ' beat' : ''}">${escapeHtml(c.text)}</span>`);
    const head = partSteps.length > 1 ? `<span class="sb-bar">bar ${k + 1}</span>` : '';
    return `<div class="sb-part">${head}<div class="sb-grid" style="--steps:${p.length}">${cells.join('')}</div></div>`;
  };
  return `<div class="${classes}">`
    + `<div class="sb-tag"><span class="sb-time">${escapeHtml(label)}</span>${sub ? `<span class="sb-sub">${escapeHtml(sub)}</span>` : ''}</div>`
    + `<div class="sb-body">${name ? `<div class="sb-name">${escapeHtml(name)}</div>` : ''}`
    + `<div class="sb-parts">${partSteps.map(grid).join('')}</div></div></div>`;
}

/** A key to the song's named strums, for the top of the sheet: [{ name, pattern }] */
function renderStrumLegend(named, ctx = {}) {
  if (!named.length) return '';
  const style = STYLES.includes(ctx.style) ? ctx.style : 'comic';
  if (style === 'plain') {
    return `<div class="rhythm strum-legend-plain">Strums: ${named.map((n) => `${escapeHtml(n.name)} ${escapeHtml(n.pattern)}`).join(' · ')}</div>`;
  }
  const rows = named.map((n) => {
    const parts = String(n.pattern).split('|').map(strumSteps).filter((p) => p.length);
    const arrows = parts.map((p) => p.map((s) => `<span class="sb-a${s.accent ? ' acc' : ''}${s.stroke === '-' ? ' rest' : ''}">${ARROWS[s.stroke] || s.stroke}</span>`).join('')).join('<span class="sb-sep">|</span>');
    const letters = String(n.pattern).replace(/\s*\|\s*/g, ' | ');
    return `<div class="sl-row"><span class="sb-ref">${escapeHtml(n.name)}</span><span class="sb-arrows">${arrows}</span><span class="sb-letters">${escapeHtml(letters)}</span></div>`;
  }).join('');
  return `<div class="strum-legend style-${style}"><div class="sl-title">Strums</div>${rows}</div>`;
}

/** CSS for every style (added to the preview, exports, PDFs and songbooks) */
function strumCss() {
  return `
  .strum-box { --sb-size: var(--strum-size, max(14px, calc(var(--monospace-size, 14px) * 1.15))); font-size: var(--sb-size); font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: var(--text-color, #111); margin: 0.35em 0 0.6em; break-inside: avoid; page-break-inside: avoid; }
  .strum-box .sb-grid { display: grid; grid-template-columns: repeat(var(--steps), 2em); justify-items: center; align-items: end; row-gap: 0.1em; }
  .strum-box .sb-a { font-size: 1.5em; line-height: 1.05; font-weight: 600; }
  .strum-box .sb-a.acc { font-weight: 900; text-decoration: underline; text-decoration-thickness: 0.12em; text-underline-offset: 0.15em; color: var(--chord-color, #b22222); }
  .strum-box .sb-a.rest { opacity: 0.45; }
  .strum-box .sb-l { font: 700 1.05em/1.2 var(--monospace-font, "Courier New", monospace); }
  .strum-box .sb-l.acc { font-weight: 900; }
  .strum-box .sb-n { font-size: 1em; line-height: 1.2; opacity: 0.85; }
  .strum-box .sb-n.beat { font-weight: 800; opacity: 1; }
  .strum-box .sb-name { font-weight: 800; font-size: 1em; line-height: 1.3; }
  .strum-box .sb-sub { font-size: 0.9em; font-weight: 700; line-height: 1.2; }
  .strum-box .sb-time { font-weight: 900; line-height: 1; }

  /* comic: the info box */
  .strum-box.style-comic { display: inline-grid; grid-template-columns: auto auto; border: 2px solid #000; box-shadow: 0.2em 0.2em 0 #000; background: #fff; color: #000; }
  .strum-box.style-comic .sb-tag { background: #000; color: #fff; padding: 0.35em 0.7em; display: grid; align-content: center; gap: 0.15em; min-width: 4.4em; }
  .strum-box.style-comic .sb-time { font-size: 1.9em; font-family: "Arial Black", "Segoe UI", sans-serif; }
  .strum-box.style-comic .sb-body { padding: 0.3em 0.7em 0.35em; display: grid; gap: 0.15em; }
  .strum-box.style-comic .sb-name { text-transform: uppercase; letter-spacing: 0.04em; }
  .strum-box.style-comic.time-change .sb-tag { background: #fff; color: #000; border-right: 2px solid #000; background-image: repeating-linear-gradient(-45deg, transparent 0 0.35em, rgba(0,0,0,0.12) 0.35em 0.5em); }
  .strum-box.style-comic.time-change .sb-sub { text-transform: uppercase; }

  /* clean: light and rounded */
  .strum-box.style-clean { display: inline-grid; grid-template-columns: auto auto; border: 1.5px solid var(--rhythm-color, #666); border-radius: 0.6em; overflow: hidden; }
  .strum-box.style-clean .sb-tag { padding: 0.35em 0.7em; display: grid; align-content: center; gap: 0.15em; border-right: 1.5px solid var(--rhythm-color, #666); min-width: 4em; }
  .strum-box.style-clean .sb-time { font-size: 1.7em; }
  .strum-box.style-clean .sb-body { padding: 0.3em 0.7em 0.35em; display: grid; gap: 0.15em; }
  .strum-box.style-clean.time-change { border-width: 3px; }
  .strum-box.style-clean.time-change .sb-tag { border-right-width: 3px; }

  /* compact: one line */
  .strum-box.style-compact { display: inline-flex; align-items: baseline; gap: 0.7em; border: 1.5px solid var(--text-color, #111); border-radius: 0.3em; padding: 0.1em 0.7em 0.1em 0; }
  .strum-box.style-compact .sb-time { background: var(--text-color, #111); color: var(--bg-color, #fff); padding: 0.15em 0.5em; font-size: 1.05em; }
  .strum-box.style-compact .sb-time em { font-style: normal; font-size: 0.8em; text-transform: uppercase; margin-left: 0.3em; }
  .strum-box.style-compact .sb-arrows { display: inline-flex; gap: 0.25em; }
  .strum-box.style-compact .sb-a { font-size: 1.3em; }
  .strum-box.style-compact .sb-letters { font: 700 1em var(--monospace-font, "Courier New", monospace); }
  .strum-box.style-compact .sb-name { font-weight: 700; }

  /* several bars taking turns: {D-DU-UDU | D-DUDU} */
  .strum-box .sb-parts { display: flex; gap: 0.9em; align-items: end; }
  .strum-box .sb-part + .sb-part { border-left: 2px solid currentColor; padding-left: 0.9em; }
  .strum-box .sb-bar { display: block; font-size: 0.85em; font-weight: 700; line-height: 1.3; }
  .strum-box .sb-sep { font-weight: 400; margin: 0 0.4em; }

  /* a strum named earlier ({A}) and {stop}: one small line */
  .strum-box.strum-recall, .strum-box.strum-stop { display: inline-flex; align-items: center; gap: 0.6em; padding: 0.1em 0.7em 0.1em 0; border: 1.5px solid var(--text-color, #111); border-radius: 0.3em; box-shadow: none; background: transparent; color: inherit; }
  .strum-box .sb-ref { background: var(--text-color, #111); color: var(--bg-color, #fff); font-weight: 900; padding: 0.1em 0.55em; line-height: 1.3; letter-spacing: 0.03em; }
  .strum-box.style-compact .sb-ref { padding: 0.15em 0.5em; }
  .strum-box .sb-arrows { display: inline-flex; gap: 0.25em; align-items: center; }
  .strum-box.strum-recall .sb-a, .strum-box.strum-stop .sb-a { font-size: 1.3em; }
  .strum-box .sb-note { font-weight: 700; }
  .strum-box.strum-stop { border-width: 2.5px; }

  /* the key to the named strums, at the top of the sheet */
  .strum-legend { --sb-size: var(--strum-size, max(14px, calc(var(--monospace-size, 14px) * 1.15))); font-size: var(--sb-size); font-family: "Segoe UI", system-ui, -apple-system, sans-serif; display: inline-grid; grid-template-columns: auto auto auto; gap: 0.25em 0.8em; align-items: center; border: 1.5px solid var(--text-color, #111); border-radius: 0.3em; padding: 0.4em 0.8em 0.5em; margin: 0.2em 0 0.8em; break-inside: avoid; }
  .strum-legend .sl-title { grid-column: 1 / -1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; font-size: 0.9em; }
  .strum-legend .sl-row { display: contents; }
  .strum-legend .sb-ref { background: var(--text-color, #111); color: var(--bg-color, #fff); font-weight: 900; padding: 0.1em 0.55em; text-align: center; }
  .strum-legend .sb-arrows { display: inline-flex; gap: 0.25em; }
  .strum-legend .sb-a { font-size: 1.3em; font-weight: 600; }
  .strum-legend .sb-a.acc { font-weight: 900; text-decoration: underline; }
  .strum-legend .sb-a.rest { opacity: 0.45; }
  .strum-legend .sb-sep { margin: 0 0.4em; }
  .strum-legend .sb-letters { font: 700 1em var(--monospace-font, "Courier New", monospace); }

  @media print {
    .strum-box .sb-a.acc { color: #000; }
  }`;
}

module.exports = { STYLES, timeLabel, strumTime, strumSteps, strumCounts, strumName, renderStrum, renderStrumLegend, strumCss };
