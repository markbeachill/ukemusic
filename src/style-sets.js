// Style sets (4.16): several stylesheets to choose from (View → Style set). Each is a whole
// style.css, kept in the styles folder beside config.ini, so every one can be edited.
// The built-in ones are made from default-style.css (Classic) with their own colours,
// fonts and sizes, plus a few rules of their own. Pure: unit tested.

const HEADER = /^\s*\/\*\s*ukemusic style set:\s*([^—*\n-][^—*\n]*?)\s*(?:—\s*([^*]*?))?\s*\*\//;

/** Set --name: value in the first :root block (adds it when missing) */
function setRootVariable(css, name, value) {
  const root = css.match(/:root\s*\{[\s\S]*?\}/);
  if (!root) return `:root {\n  ${name}: ${value};\n}\n\n${css}`;
  const re = new RegExp(`(${name.replace(/-/g, '\\-')}\\s*:\\s*)[^;]+;`);
  const block = re.test(root[0]) ? root[0].replace(re, `$1${value};`) : root[0].replace(/\}\s*$/, `  ${name}: ${value};\n}`);
  return css.replace(root[0], block);
}

/** The name and description from a set's first line */
function styleSetInfo(css, fallbackName = '') {
  const m = String(css || '').match(HEADER);
  return m ? { name: m[1].trim(), description: (m[2] || '').trim() } : { name: fallbackName, description: '' };
}

/** Give css a first line naming the set (replacing the one it has) */
function withHeader(css, name, description = '') {
  const clean = (t) => String(t || '').replace(/\*\//g, '').replace(/\n/g, ' ').trim();
  const line = `/* ukemusic style set: ${clean(name)}${description ? ` — ${clean(description)}` : ''} */`;
  const text = String(css || '');
  return HEADER.test(text) ? text.replace(HEADER, line) : `${line}\n\n${text}`;
}

/** A file name for a set's name: "My Gig Look" → "my-gig-look" */
function styleSetId(name) {
  return String(name || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'style';
}

// Colour variables a set pins for every app theme (so dark mode doesn't swap them for Classic's)
const COLOUR_VARS = ['--bg-color', '--text-color', '--chord-color', '--rhythm-color', '--section-color'];

const BUILT_IN = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'the usual look: red chords, blue headings, grey strums',
    vars: {},
    extra: ''
  },
  {
    id: 'big',
    name: 'Big and clear',
    description: 'large dark text, bold red chords, headings in black bars, big diagrams: easy to read from a music stand',
    vars: {
      '--bg-color': '#ffffff',
      '--text-color': '#111111',
      '--chord-color': '#c00000',
      '--rhythm-color': '#222222',
      '--section-color': '#111111',
      '--monospace-font': '"Consolas", "Lucida Console", "DejaVu Sans Mono", monospace',
      '--monospace-size': '20px',
      '--rhythm-size': '18px',
      '--line-spacing': '1.5',
      '--section-spacing': '1.3em'
    },
    extra: `
.chords, .chord-table .chord-row td, .inline-line .ichord { font-weight: 800; }
.lyrics, .chord-table .lyric-row td, .inline-line { font-weight: 600; }
.section { display: inline-block; background: #111111; color: #ffffff; font-size: 1.15em; padding: 0.12em 0.6em; border-radius: 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.song-title { font-size: 2em; }
.chord-diagram { --diagram-size: 110px; --diagram-line: #222222; }`
  },
  {
    id: 'songbook',
    name: 'Songbook',
    description: 'warm paper, serif headings and boxed chord diagrams, like a printed songbook',
    vars: {
      '--bg-color': '#fffaf0',
      '--text-color': '#2b2118',
      '--chord-color': '#9a3412',
      '--rhythm-color': '#7c5a3a',
      '--section-color': '#5b3a1a',
      '--monospace-font': '"Courier Prime", "Courier New", monospace',
      '--font-family': 'Georgia, "Times New Roman", serif',
      '--monospace-size': '15px',
      '--rhythm-size': '14px'
    },
    extra: `
.section { font-variant: small-caps; letter-spacing: 0.04em; border-bottom: 1px solid #d6c3a5; padding-bottom: 0.15em; }
.chords { font-weight: 700; }
.song-title { font-variant: small-caps; letter-spacing: 0.03em; }
.chord-diagram { background: #ffffff; border: 1px solid #d6c3a5; border-radius: 8px; padding: 4px 6px 2px; --diagram-line: #7c5a3a; --diagram-dot: #2b2118; }`
  },
  {
    id: 'ink',
    name: 'Ink saver',
    description: 'black only and compact: small, tight and plain, to fit more on a page and print on anything',
    vars: {
      '--bg-color': '#ffffff',
      '--text-color': '#000000',
      '--chord-color': '#000000',
      '--rhythm-color': '#000000',
      '--section-color': '#000000',
      '--monospace-size': '13px',
      '--rhythm-size': '12px',
      '--line-spacing': '1.2',
      '--section-spacing': '0.7em',
      '--verse-spacing': '0.5em'
    },
    extra: `
.chords, .chord-table .chord-row td, .inline-line .ichord { font-weight: 700; }
.section { text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.9em; margin-bottom: 0.2em; }
.song-title { font-size: 1.3em; }
.tab .tab-fret { color: #000000; }
.chord-diagram { --diagram-size: 62px; --diagram-line: #000000; --diagram-dot: #000000; --diagram-name: #000000; }
.chord-diagrams { gap: 0.4rem; margin-bottom: 0.5rem; }
.strum-box { margin: 0.2em 0 0.3em; }
.strum-box.style-comic { box-shadow: none; }
.strum-box .sb-a.acc { color: #000000; }`
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'clean and colourful: teal chord chips, indigo headings with a side bar, soft tinted diagrams',
    vars: {
      '--bg-color': '#ffffff',
      '--text-color': '#1f2937',
      '--chord-color': '#0f766e',
      '--rhythm-color': '#6b7280',
      '--section-color': '#4338ca',
      '--monospace-font': '"Cascadia Mono", "Consolas", "DejaVu Sans Mono", monospace',
      '--font-family': '"Segoe UI", system-ui, -apple-system, sans-serif',
      '--monospace-size': '15px',
      '--rhythm-size': '14px'
    },
    extra: `
.chords, .chord-table .chord-row td { font-weight: 700; }
.inline-line .ichord { background: #ccfbf1; border-radius: 4px; padding: 0 0.2em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.inline-line .ichord .ib { display: none; }
.section { border-left: 5px solid #4338ca; padding-left: 0.5em; font-weight: 700; }
.song-title { color: #111827; letter-spacing: -0.01em; }
.chord-diagram { background: #f0fdfa; border-radius: 10px; padding: 6px 8px 4px; --diagram-line: #94a3b8; --diagram-dot: #0f766e; --diagram-name: #0f766e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.strum-box.style-comic { border-color: #0f766e; box-shadow: 0.2em 0.2em 0 #99f6e4; }
.strum-box.style-comic .sb-tag { background: #0f766e; }`
  },
  {
    id: 'night',
    name: 'Night',
    description: 'light text on a dark background, for reading on a screen or tablet in a dim room (prints dark: use another set for paper)',
    vars: {
      '--bg-color': '#111827',
      '--text-color': '#e5e7eb',
      '--chord-color': '#fbbf24',
      '--rhythm-color': '#9ca3af',
      '--section-color': '#93c5fd',
      '--monospace-size': '16px',
      '--rhythm-size': '15px'
    },
    extra: `
.chords, .chord-table .chord-row td, .inline-line .ichord { font-weight: 700; }
.chord-diagram { --diagram-line: #9ca3af; --diagram-dot: #e5e7eb; --diagram-finger: #111827; --diagram-name: #fbbf24; }
.strum-box.style-comic { background: #1f2937; color: #e5e7eb; border-color: #e5e7eb; box-shadow: 0.2em 0.2em 0 #4b5563; }
.strum-box.style-comic .sb-tag { background: #e5e7eb; color: #111827; }
.strum-box .sb-ref { background: #e5e7eb; color: #111827; }
.tab { color: #e5e7eb; }
html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }`
  }
];

// 4.19: Stage is a style of its own, used for every Stage copy (exports/Stage, stage
// songbooks, View → Look: Stage) whatever style set the song copies use. Bold and black,
// a sturdy fixed-width font, big enough to read off a music stand.
const STAGE = {
  id: 'stage',
  name: 'Stage',
  description: 'bold black text in a sturdy font, for reading at a gig (used for every Stage copy)',
  vars: {
    '--bg-color': '#ffffff',
    '--text-color': 'var(--stage-color)',
    '--chord-color': 'var(--stage-color)',
    '--rhythm-color': 'var(--stage-color)',
    '--section-color': 'var(--stage-color)',
    '--monospace-font': 'var(--stage-font)',
    '--monospace-size': 'var(--stage-size)',
    '--rhythm-size': 'calc(var(--stage-size) - 2px)',
    '--line-spacing': '1.3',
    '--section-spacing': '1em'
  },
  extra: `
/* Everything bold: words, chords, tab, strums, headings */
.chords, .lyrics, .tab, .rhythm, .chord-table td, .inline-line, .lyric-line { font-weight: 700; color: var(--stage-color); }
.section, .song-title, .lyrics-title { font-weight: 800; color: var(--stage-color); }
.song-subtitle, .song-artist { color: var(--stage-color); }
.tab .tab-fret, .tab .tab-string { color: var(--stage-color); opacity: 1; }
.tab .tab-fret { font-weight: 900; }
/* Chords in the words: white on black, so they never blend into the (bold) words */
.inline-line { font-family: var(--monospace-font); font-size: var(--monospace-size); line-height: 1.7; }
.inline-line .ichord { background: var(--stage-color); color: #ffffff; padding: 0 0.25em; border-radius: 0.2em; margin-right: 0.12em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.inline-line .ichord .ib { display: none; }
@media print { html .inline-line .ichord { color: #ffffff; background: #000000; } }
/* Chords on their own line: a little bigger than the words */
.chords, .chord-table .chord-row td { font-size: calc(var(--monospace-size) * 1.08); }
/* **Bold** words: the words are all bold already, so these get a grey band (prints in black and white) */
.lyrics strong:not(.inline-label), .inline-line strong:not(.inline-label), .chord-table .lyric strong, .lyric-line strong { background: #d9d9d9; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
/* Diagrams in black */
.chord-diagram { --diagram-line: var(--stage-color); --diagram-dot: var(--stage-color); --diagram-name: var(--stage-color); }
.chord-diagram svg .name { font-weight: 800; }
.strum-box .sb-a.acc { color: var(--stage-color); }
/* The lyrics page */
.lyric-line { font-size: calc(var(--stage-size) * 1.1); }
/* Empty lines: a small gap, not a big one */
.lyrics:empty { min-height: 0.6em; }`
};

/** The css for a built-in set, made from Classic (defaultCss) */
function builtInCss(set, defaultCss) {
  let css = String(defaultCss || '');
  for (const [name, value] of Object.entries(set.vars || {})) css = setRootVariable(css, name, value);
  css = withHeader(css, set.name, set.description);
  // A set with its own colours keeps them in the app's dark mode too
  const pinned = COLOUR_VARS.filter((v) => set.vars && set.vars[v] && !String(set.vars[v]).startsWith('var('));
  const pin = pinned.length ? `\n:root[data-theme] { ${pinned.map((v) => `${v}: ${set.vars[v]};`).join(' ')} }` : '';
  if (set.extra || pin) css = `${css.replace(/\s+$/, '')}\n\n/* ── This style set: ${set.name} ─────────────────────── */${pin}${set.extra || ''}\n`;
  return css;
}

/** Every built-in set: [{ id, name, description, css }] */
function builtInStyleSets(defaultCss) {
  return BUILT_IN.map((set) => ({ id: set.id, name: set.name, description: set.description, css: builtInCss(set, defaultCss) }));
}

/** The Stage style, from Classic; stage: { font, size } to start it with (from an older set) */
function stageCss(defaultCss, stage = {}) {
  let css = builtInCss(STAGE, defaultCss);
  const font = String(stage.font || '').trim();
  if (font) css = setRootVariable(css, '--stage-font', font);
  const size = Number.parseInt(stage.size, 10);
  if (size >= 12 && size <= 32) css = setRootVariable(css, '--stage-size', `${size}px`);
  return css;
}

const MINE = { id: 'mine', name: 'My style', description: 'your own style.css from before style sets' };

module.exports = { STAGE, stageCss, BUILT_IN, MINE, builtInStyleSets, builtInCss, styleSetInfo, withHeader, styleSetId, setRootVariable };
