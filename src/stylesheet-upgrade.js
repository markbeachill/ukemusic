// Bring an older style.css up to date with what the app now keeps in the stylesheet (4.15):
// the Stage look, the tab options and the export title. Only adds; never changes what's there.
// Pure: unit tested.
const MARKER = '/* ── Stage';
const SECTIONS_FROM = '/* ── Tab ─';

/** The --name: value in the first block that has it, or fallback */
function cssVariable(css, name, fallback = '') {
  const m = String(css).match(new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : fallback;
}

/** Add a variable to the first :root block if it isn't there */
function addRootVariable(css, name, value) {
  if (new RegExp(`${name.replace(/[-]/g, '\\-')}\\s*:`).test(css)) return css;
  const root = css.match(/:root\s*\{[\s\S]*?\}/);
  if (!root) return `:root {\n  ${name}: ${value};\n}\n\n${css}`;
  return css.replace(root[0], root[0].replace(/\}\s*$/, `  ${name}: ${value};\n}`));
}

/** A font name typed in Settings ("Consolas") as a CSS font list */
function fontList(name) {
  const clean = String(name || '').replace(/["<>;{}]/g, '').trim() || 'Consolas';
  return `"${clean}", "Lucida Console", "DejaVu Sans Mono", monospace`;
}

/**
 * userCss: the user's style.css; defaultCss: the app's default-style.css;
 * stage: { font, size } from the old Settings → Export (export.stage_font / stage_size).
 * Returns { css, changed }.
 */
function upgradeStylesheet(userCss, defaultCss, stage = {}) {
  let css = String(userCss || '');
  if (css.includes(MARKER)) return { css, changed: false };
  const size = Math.max(12, Math.min(32, Number(stage.size) || 18));
  css = addRootVariable(css, '--stage-font', fontList(stage.font));
  css = addRootVariable(css, '--stage-size', `${size}px`);
  css = addRootVariable(css, '--stage-color', '#000000');
  const at = String(defaultCss || '').indexOf(SECTIONS_FROM);
  if (at >= 0) css = `${css.replace(/\s+$/, '')}\n\n${defaultCss.slice(at).replace(/\s+$/, '')}\n`;
  return { css, changed: true };
}

// 4.16: the strum box size and the chord diagram colours. Adds that section once, and
// lifts the old default strum text size (12px, too small to read) to 14px.
const MARKER_416 = '/* ── Strum boxes and chord diagrams';
function upgradeStylesheet416(userCss, defaultCss) {
  const before = String(userCss || '');
  let css = before.replace(/(--rhythm-size\s*:\s*)12px\s*;/, '$114px;');
  if (css.includes(MARKER_416)) return { css, changed: css !== before };
  const at = String(defaultCss || '').indexOf(MARKER_416);
  if (at >= 0) css = `${css.replace(/\s+$/, '')}\n\n${defaultCss.slice(at).replace(/\s+$/, '')}\n`;
  return { css, changed: true };
}

// 4.16.2: plain strum patterns bigger and bold (--plain-strum-scale, View → Plain strums);
// the strum boxes as they were in 4.16.0. Brings 4.16.0 and 4.16.1 style sets up to date, once.
const PLAIN_RULE = '/* Plain strum patterns */\n.rhythm, .chord-table .rhythm-row td { font-size: calc(var(--monospace-size) * var(--plain-strum-scale, 1.2)); font-weight: 700; color: var(--text-color); }';
const BOX_RULE = '.strum-box, .strum-legend { --strum-size: calc(var(--monospace-size) * 1.15); }';
function upgradeStrumScale(userCss) {
  const before = String(userCss || '');
  let css = before;
  // 4.16.1's bigger boxes go back to 4.16.0's size
  css = css.replace(/--strum-size:\s*min\(calc\(var\(--monospace-size\)\s*\*\s*var\(--strum-scale,\s*[\d.]+\)\),\s*30px\);/g, '--strum-size: calc(var(--monospace-size) * 1.15);');
  css = css.replace(/\.rhythm \{ font-size: max\(var\(--rhythm-size\), calc\(var\(--monospace-size\) \* var\(--strum-scale, [\d.]+\) \* 0\.8\)\); \}\n?/g, '');
  css = css.replace(/[ \t]*\/\* Strum patterns: how much bigger than the words \(View → Strum size\) \*\/\n/g, '');
  css = css.replace(/[ \t]*--strum-scale\s*:[^;]*;\n?/g, '');
  if (!/--plain-strum-scale\s*:/.test(css)) {
    css = addRootVariable(css, '--plain-strum-scale', '1.2');
  }
  if (!css.includes('/* Plain strum patterns */')) {
    css = css.includes(BOX_RULE) ? css.replace(BOX_RULE, `${BOX_RULE}\n${PLAIN_RULE}`) : `${css.replace(/\s+$/, '')}\n\n${PLAIN_RULE}\n`;
  }
  return { css, changed: css !== before };
}

// 4.17: section names can be Small or Hidden (Export → Section names). Adds that section once.
const MARKER_417 = '/* ── Section names';
function upgradeSectionNames(userCss, defaultCss) {
  const css = String(userCss || '');
  if (css.includes(MARKER_417)) return { css, changed: false };
  const at = String(defaultCss || '').indexOf(MARKER_417);
  if (at < 0) return { css, changed: false };
  const end = defaultCss.indexOf('/* ── ', at + MARKER_417.length);
  const part = defaultCss.slice(at, end < 0 ? undefined : end).replace(/\s+$/, '');
  return { css: `${css.replace(/\s+$/, '')}\n\n${part}\n`, changed: true };
}

// 4.29: 4.28 changed the Stage style's chords-in-the-words lines (closer lines, another font);
// that made printed Stage copies hard to scan, so it's put back as it was. (The new looks are
// Stage formats, src/stage-formats.js.) Only the lines as ukemusic wrote them are changed.
const STAGE_427 = [
  '/* Chords in the words: white on black, so they never blend into the (bold) words */\n.inline-line { font-family: var(--monospace-font); font-size: var(--monospace-size); line-height: 1.7; }',
  '.inline-line .ichord { background: var(--stage-color); color: #ffffff; padding: 0 0.25em; border-radius: 0.2em; margin-right: 0.12em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }'
];
const STAGE_428 = [
  '/* Chords in the words: white on black, so they never blend into the (bold) words. An ordinary\n   bold font (nothing needs lining up here) and closer lines, so a song fits on fewer pages (4.28) */\n.inline-line { font-family: var(--stage-inline-font, "Segoe UI", Arial, "Liberation Sans", Helvetica, sans-serif); font-size: var(--monospace-size); line-height: 1.45; }',
  '.inline-line .ichord { background: var(--stage-color); color: #ffffff; padding: 0 0.18em; border-radius: 0.18em; margin-right: 0.08em; -webkit-print-color-adjust: exact; print-color-adjust: exact; }'
];
function undoStage428(css) {
  let out = String(css || '');
  let changed = false;
  STAGE_428.forEach((line, i) => {
    if (out.includes(line)) { out = out.replace(line, STAGE_427[i]); changed = true; }
  });
  return { css: out, changed };
}

module.exports = { undoStage428, STAGE_427, STAGE_428, upgradeSectionNames, MARKER_417, upgradeStrumScale, upgradeStylesheet416, MARKER_416, upgradeStylesheet, cssVariable, addRootVariable, fontList, MARKER };
