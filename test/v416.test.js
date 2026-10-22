// 4.16: style sets, readable strum boxes, chord diagram parts
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sets = require('../src/style-sets');
const up = require('../src/stylesheet-upgrade');
const { renderDiagramSvg } = require('../src/diagram-svg');
const { strumCss } = require('../src/strum-box');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DEFAULT = fs.readFileSync(path.join(__dirname, '..', 'src', 'default-style.css'), 'utf8');

test('six built-in style sets (4.19), each a whole stylesheet with its name on the first line', () => {
  const all = sets.builtInStyleSets(DEFAULT);
  assert.deepStrictEqual(all.map((s) => s.id), ['classic', 'big', 'songbook', 'ink', 'modern', 'night']);
  for (const s of all) {
    assert.strictEqual(sets.styleSetInfo(s.css).name, s.name);
    for (const part of ['[data-style="stage"]', '[data-tab-box] .tab', '.song-title', '--strum-size', '--diagram-dot']) assert.ok(s.css.includes(part), `${s.id}: ${part}`);
  }
  assert.strictEqual(all[0].css, DEFAULT);
});
test('each set has its own colours and sizes in :root', () => {
  const [, big, songbook, ink] = sets.builtInStyleSets(DEFAULT);
  const v = (css, n) => up.cssVariable(css, n);
  assert.strictEqual(v(big.css, '--monospace-size'), '20px');
  assert.strictEqual(v(songbook.css, '--bg-color'), '#fffaf0');
  assert.strictEqual(v(ink.css, '--chord-color'), '#000000');
  assert.ok(songbook.css.includes('/* ── This style set: Songbook'));
});
test('names, ids and headers', () => {
  assert.strictEqual(sets.styleSetId('My Gig Look!'), 'my-gig-look');
  assert.strictEqual(sets.styleSetId('Æ'), 'style');
  assert.deepStrictEqual(sets.styleSetInfo('.x{}', 'mine'), { name: 'mine', description: '' });
  const renamed = sets.withHeader(DEFAULT, 'Gig', 'copied from Classic');
  assert.deepStrictEqual(sets.styleSetInfo(renamed), { name: 'Gig', description: 'copied from Classic' });
  assert.strictEqual(renamed.match(/ukemusic style set/g).length, 1);
  assert.ok(sets.withHeader('.x{}', 'A */ b').startsWith('/* ukemusic style set: A  b */'));
});
test('an older style.css gets the strum and diagram section once, and 12px strums become 14px', () => {
  const r = up.upgradeStylesheet416(':root {\n  --rhythm-size: 12px;\n  --chord-color: #123456;\n}\n', DEFAULT);
  assert.ok(r.changed && r.css.includes('--rhythm-size: 14px') && r.css.includes('#123456') && r.css.includes(up.MARKER_416));
  assert.strictEqual(up.upgradeStylesheet416(r.css, DEFAULT).changed, false);
  assert.strictEqual(up.upgradeStylesheet416(DEFAULT, DEFAULT).changed, false);
  const viaOld = up.upgradeStylesheet416(up.upgradeStylesheet(':root { --rhythm-size: 12px; }', DEFAULT).css, DEFAULT);
  assert.ok(viaOld.css.includes('--rhythm-size: 14px;') && viaOld.css.split(up.MARKER_416).length === 2);
});
test('every part of a chord diagram can be styled', () => {
  const svg = renderDiagramSvg({ name: 'Bb', frets: [3, 2, 1, 1], fingers: [3, 2, 1, 1], barre: { fret: 1, strings: [2, 3] }, base_fret: 1 });
  for (const c of ['line', 'dot', 'finger', 'barre', 'name']) assert.ok(svg.includes(`class="${c}"`), c);
  const open = renderDiagramSvg({ name: 'C', frets: [0, 0, 0, 3], base_fret: 1 });
  assert.ok(open.includes('class="open"'));
  const muted = renderDiagramSvg({ name: 'D', frets: [-1, 2, 2, 2], base_fret: 5 });
  assert.ok(muted.includes('class="muted"') && muted.includes('class="fret-label"'));
});
test('strum boxes follow --strum-size, and are bigger than the words by default', () => {
  const css = strumCss();
  assert.ok(/\.strum-box \{ --sb-size: var\(--strum-size, max\(14px, calc\(var\(--monospace-size, 14px\) \* 1\.15\)\)\)/.test(css));
  assert.ok(css.includes('.strum-box .sb-n { font-size: 1em'));
});
test('4.16.2: plain strums are --plain-strum-scale (View → Plain strums); 4.16.0 and 4.16.1 sets are brought up to date once', () => {
  assert.ok(DEFAULT.includes('--plain-strum-scale: 1.2;') && DEFAULT.includes('.strum-box, .strum-legend { --strum-size: calc(var(--monospace-size) * 1.15); }') && !DEFAULT.includes('--strum-scale'));
  const v160 = fs.readFileSync(path.join(__dirname, 'fixture-style-4.16.0.css'), 'utf8');
  const v161 = v160.replace('--verse-spacing: 1em;\n', '--verse-spacing: 1em;\n  /* Strum patterns: how much bigger than the words (View → Strum size) */\n  --strum-scale: 1.7;\n')
    .replace('.strum-box, .strum-legend { --strum-size: calc(var(--monospace-size) * 1.15); }', '.strum-box, .strum-legend { --strum-size: min(calc(var(--monospace-size) * var(--strum-scale, 1.4)), 30px); }\n.rhythm { font-size: max(var(--rhythm-size), calc(var(--monospace-size) * var(--strum-scale, 1.4) * 0.8)); }');
  assert.notStrictEqual(v161, v160);
  for (const old of [v160, v161]) {
    const r = up.upgradeStrumScale(old);
    assert.ok(r.changed);
    assert.strictEqual(up.cssVariable(r.css, '--plain-strum-scale'), '1.2');
    assert.ok(!r.css.includes('--strum-scale') && !r.css.includes('Strum size'));
    assert.ok(r.css.includes('.strum-box, .strum-legend { --strum-size: calc(var(--monospace-size) * 1.15); }'));
    assert.strictEqual(r.css.split('/* Plain strum patterns */').length, 2);
    assert.strictEqual(up.upgradeStrumScale(r.css).changed, false);
  }
  assert.strictEqual(up.upgradeStrumScale(DEFAULT).changed, false);
  for (const s of sets.builtInStyleSets(DEFAULT)) assert.strictEqual(up.upgradeStrumScale(s.css).changed, false, s.id);
});
