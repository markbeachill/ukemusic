// Easy to read text (4.71): song sheets and Stage copies in Atkinson Hyperlegible, a typeface the
// Braille Institute made for readers with low vision. It keeps apart the letters that are easily
// confused (I l 1, O 0, b d), which helps at arm's length on a music stand or under stage lights.
//
// Two of its families: Mono where chords line up over the words with spaces (chords above the
// words: every letter the same width, like the Courier it replaces), and Next everywhere else
// (Stage copies' words, chords in columns or in the words, headings).
//
// The fonts are inside the CSS (src/easy-read-fonts.js), so they work offline, in PDFs and in a
// downloaded sheet. The setting marks the page <html data-easy-read>; the rules below then swap
// the font variables every style set and the web player use. !important, because a style set
// or a dark theme sets them on more specific selectors. Pure; unit tested.

const FACES = require('./easy-read-fonts');

const NEXT = '"Atkinson Hyperlegible Next", "Segoe UI", Arial, sans-serif';
const MONO = '"Atkinson Hyperlegible Mono", "Courier New", monospace';

const facesCss = () => FACES.map((f) => `@font-face { font-family: "${f.family}"; font-style: normal; font-weight: ${f.weight}; font-display: swap; src: url(data:font/woff2;base64,${f.data}) format("woff2"); unicode-range: ${f.range}; }`).join('\n');

const RULES = `
:root[data-easy-read], :root[data-easy-read] [data-theme], :root[data-easy-read] .sheet {
  --monospace-font: ${MONO} !important;
  --font-family: ${NEXT} !important;
  --stage-font: ${MONO} !important;
  --stage-words-font: ${NEXT} !important;
}
/* the Session screen (desktop's second screen, the web player's too) sets its own fonts */
:root[data-easy-read] .ss-screen, :root[data-easy-read] .ss-screen .ss-strum .sl { font-family: ${NEXT} !important; }
:root[data-easy-read] .ss-screen .ss-strum, :root[data-easy-read] .ss-screen .ss-tab { font-family: ${MONO} !important; }`;

let cached = '';
/** The CSS for Easy to read text: the fonts, and the rules that use them on <html data-easy-read> */
function css() {
  if (!cached) cached = `${facesCss()}\n${RULES}`;
  return cached;
}

module.exports = { css, RULES, NEXT, MONO, FAMILIES: ['Atkinson Hyperlegible Next', 'Atkinson Hyperlegible Mono'] };
