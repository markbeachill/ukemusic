// Stage formats (4.29): Stage copies (for a gig, or practising at home) come in a choice of
// formats, because one look doesn't suit every song or every player. Each format is a layout
// plus a layer of CSS on top of the Stage style (styles/stage.css), scoped to
// <html data-stage-format="…"> so it wins over the Stage style's own rules.
// 4.32: section names are landmarks: full size, bold, in a light band with a bar at the left.
// The aim: words easy to read and scan (regular weight, room between lines, a clear gap between
// parts), chords that stand out without taking over, and not too many pages.
// Pure; unit tested.

const WORDS_FONT = 'var(--stage-words-font, "Segoe UI", Arial, "Liberation Sans", Helvetica, sans-serif)';

const FORMATS = [
  { id: 'clear', name: 'Clear: chords above the words', layout: 'table', description: 'Words in plain type, chords in bold above them, a clear gap between parts. The easiest to scan.' },
  { id: 'brackets', name: 'Brackets: chords above, in [ ]', layout: 'table', description: 'As Clear, with each chord in light brackets: [C].' },
  { id: 'compact', name: 'Compact: chords in the words', layout: 'inline', description: 'Chords in bold brackets inside the words: [C]Oh, Susanna. The default: the fewest pages.' },
  { id: 'heavy', name: 'Heavy: everything bold, white-on-black chords', layout: null, description: 'The Stage look from 4.19: all bold, chords as black blocks. Uses the song\'s own layout.' }
];
const DEFAULT_FORMAT = 'compact';   // 4.52 (was Clear)

const formatOf = (id) => FORMATS.find((f) => f.id === id) || FORMATS.find((f) => f.id === DEFAULT_FORMAT);

/** Shared by the formats that read like a song sheet: plain words, a gap between parts */
function wordsCss(s) {
  return `
${s} .chord-table td.lyric, ${s} .chord-table .lyric-row td, ${s} .lyrics, ${s} .inline-line, ${s} .lyric-line {
  font-family: ${WORDS_FONT}; font-weight: 400; color: #000;
}
${s} .song-section { margin-top: 1.15em; }
${s} .section { font-family: ${WORDS_FONT}; font-weight: 800; font-size: var(--stage-size); letter-spacing: 0; text-transform: none; color: #000; margin: 0 0 0.3em; padding: 0.05em 0.45em; border-left: 0.3em solid #000; background: #ececec; display: inline-block; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${s} .song-section.section-cue .section { font-size: var(--stage-size); }
${s} .inline-label { font-family: ${WORDS_FONT}; font-weight: 700 !important; }
${s} .lyric-line { font-size: var(--stage-size); line-height: 1.5; }`;
}

/** The CSS for every format, each scoped to its own data-stage-format */
function formatsCss() {
  const out = ['/* Stage formats (4.29): ukemusic adds these to the Stage style. */'];
  for (const id of ['clear', 'brackets']) {
    const s = `html[data-stage-format="${id}"]`;
    out.push(wordsCss(s));
    out.push(`
${s} .chord-table { border-collapse: collapse; margin: 0; }
${s} .chord-table td { padding-left: 0; padding-right: 0; }
${s} .chord-table td.lyric, ${s} .chord-table .lyric-row td { font-size: var(--stage-size); line-height: 1.25; padding-bottom: 0.2em; }
${s} .chord-table td.chord, ${s} .chord-table .chord-row td { font-family: ${WORDS_FONT}; font-weight: 800; font-size: calc(var(--stage-size) * 0.95); line-height: 1.1; padding-top: 0.45em; padding-right: 0.35em; color: #000; }
${s} .chords { font-weight: 800; color: #000; }
${s} .lyrics { font-weight: 400; }`);
  }
  out.push(`
html[data-stage-format="brackets"] .chord-table td.chord::before { content: "["; font-weight: 400; color: #666; }
html[data-stage-format="brackets"] .chord-table td.chord::after { content: "]"; font-weight: 400; color: #666; }`);
  const c = 'html[data-stage-format="compact"]';
  out.push(wordsCss(c));
  out.push(`
${c} .inline-line { font-size: var(--stage-size); line-height: 1.7; }
${c} .inline-line .ichord { background: none !important; color: #000 !important; font-weight: 800; padding: 0; margin: 0 0.04em 0 0; border-radius: 0; }
${c} .inline-line .ichord .ib { display: inline !important; font-weight: 400; color: #666; }`);
  return out.join('\n');
}

/** Line-wrapping width for a format's layout (characters across the printed page) */
function charsAcross(formatId, { pageWidthPx, sizePx, monospaceChars }) {
  const f = formatOf(formatId);
  if (!f.layout || f.layout === 'lines') return monospaceChars;
  // proportional words: about half an em a character, plus room for the chords
  return Math.max(24, Math.floor(pageWidthPx / (sizePx * 0.5)));
}

/**
 * Repeated parts printed once (4.29): a part that comes back exactly the same — same words,
 * same chords — is printed in full the first time and then as a one-line cue: "Chorus — as
 * before", or "… as before, twice" when it comes twice in a row. A part that comes back changed (a different
 * last line, say) is printed in full. sections: from the chord-pattern analysis
 * ({ line, name, labelled }); only parts of two lines or more, that the song names with a
 * heading, are shortened (4.30).
 * Returns { text, shortened }.
 */
function collapseRepeats(text, sections) {
  const lines = String(text || '').split('\n');
  const starts = (sections || []).map((s) => s.line).filter((n) => n >= 1 && n <= lines.length).sort((a, b) => a - b);
  if (starts.length < 2) return { text: String(text || ''), shortened: 0 };
  const isHeading = (l) => /^\s*\[\[[^\]]*\]\]\s*$/.test(l);
  const blocks = starts.map((start, i) => {
    let end = (i + 1 < starts.length ? starts[i + 1] : lines.length + 1) - 1;
    // stop at the end of the part: the music markers and blank lines after it stay as they are
    while (end > start && (!lines[end - 1].trim() || /^--END MUSIC--/.test(lines[end - 1]))) end -= 1;
    const body = lines.slice(start - 1, end).filter((l) => !isHeading(l));
    const key = body.map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
    const section = sections.find((s) => s.line === start) || {};
    // 4.30: only parts the song itself names with a heading; a part ukemusic only guessed
    // ("Chorus" in a song with no headings) is never shortened
    return { start, end, key, size: body.filter((l) => l.trim()).length, labelled: Boolean(section.labelled), name: String(section.name || 'Chorus').replace(/[:：]\s*$/, '').replace(/\s+\d+$/, '') };
  });
  const seen = new Set();
  const replace = new Map(); // start line -> cue text ('' = merged into the cue before)
  let lastCue = null;
  for (const b of blocks) {
    if (b.size >= 2 && b.labelled && seen.has(b.key)) {
      if (lastCue && lastCue.key === b.key && lastCue.end + 1 >= b.start - 2) {
        lastCue.times += 1;
        lastCue.end = b.end;
        replace.set(b.start, { remove: true, end: b.end });
        replace.get(lastCue.start).times = lastCue.times;
      } else {
        lastCue = { start: b.start, end: b.end, key: b.key, times: 1, name: b.name };
        replace.set(b.start, { cue: b.name, times: 1, end: b.end });
      }
      continue;
    }
    seen.add(b.key);
    lastCue = null;
  }
  if (!replace.size) return { text: String(text || ''), shortened: 0 };
  const out = [];
  let shortened = 0;
  for (let n = 1; n <= lines.length; n += 1) {
    const r = replace.get(n);
    if (!r) { out.push(lines[n - 1]); continue; }
    shortened += 1;
    // a one-line cue ("Chorus — as before"), not a heading: in a song without headings a heading
    // would run on into the next part
    if (!r.remove) out.push(`[[${r.cue}]] — as before${r.times > 1 ? `, ${r.times === 2 ? 'twice' : `${r.times} times`}` : ''}`);
    // drop the part's own lines, and the blank line between two merged repeats
    n = r.end;
    if (r.remove) while (out.length && !out[out.length - 1].trim()) out.pop();
  }
  return { text: out.join('\n'), shortened };
}

module.exports = { FORMATS, DEFAULT_FORMAT, formatOf, formatsCss, charsAcross, collapseRepeats };
