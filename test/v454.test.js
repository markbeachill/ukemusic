// 4.54: the Stage copy on two pages
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const main = read('main.js');

test('an export format, with its settings', () => {
  assert.match(html, /<input type="checkbox" name="format" value="sheet_stage2" \/> <strong>Two-page Stage PDF<\/strong>/);
  assert.match(html, /id="export-stage_two_chords" data-config-path="export\.stage_two_chords"/);
  assert.match(html, /id="export-stage_two_min" data-config-path="export\.stage_two_min"/);
  assert.match(main, /stage_two_chords: 'format'/);
  assert.match(main, /stage_two_min: 12,/);
  assert.match(html, /\(stage, two pages\)\.pdf/);
});

test('printed as a Stage copy, fitted by src/two-pager.js', () => {
  assert.match(main, /const twoPager = printStyle === 'stage2';/);
  assert.match(main, /path\.join\(__dirname, 'src', 'two-pager\.js'\)/);
  assert.match(main, /UkeTwoPager\.fit\(/);
  const tp = require('../src/two-pager');
  assert.strictEqual(typeof tp.fit, 'function');
  assert.strictEqual(typeof tp.pack, 'function');
  // the order it tries: one column, gaps closed, two columns, then chorus once
  const src = read('src/two-pager.js');
  const order = ["{ cols: 1, once: '0', spacing: 'normal' }", "{ cols: 1, once: '0', spacing: 'tight' }", "{ cols: 2, once: '0', spacing: 'tight' }", "{ cols: 1, once: '1', spacing: 'tight' }, { cols: 2, once: '1', spacing: 'tight' }"];
  let at = -1;
  for (const step of order) { const i = src.indexOf(step); assert.ok(i > at, step); at = i; }
});

test('12pt is the smallest text to start with (16px), bold words, gaps closed only when needed', () => {
  const fn = html.slice(html.indexOf('function twoPagerMinPx'), html.indexOf('function twoPagerMinPx') + 400);
  const pt = 12;
  assert.match(fn, /Number\(config\?\.export\?\.stage_two_min\) \|\| 12/);
  assert.strictEqual(Math.round(pt * (96 / 72) * 2) / 2, 16);
  assert.match(html, /html\[data-two-pager\] \.inline-line[^{]*\{ font-weight: 600 !important; \}/);
  assert.match(html, /html\[data-tp-spacing="tight"\] \.line-group:has\(> \.lyrics:empty:only-child\) \{ display: none; \}/);
});

test('Chord sheet, Stage and two-page Stage are three separate choices, with the two-page options on the ribbon', () => {
  const dialog = html.slice(html.indexOf('<dialog id="exportDialog">'), html.indexOf('id="exportMore"'));
  for (const v of ['sheet_pdf', 'sheet_stage', 'sheet_stage2']) assert.ok(dialog.includes(`value="${v}"`), v);
  assert.ok(!dialog.includes('stage_two_'), 'the two-page choices are on the ribbon, not in the Export box');
  // and on the ribbon's Export tab
  assert.match(html, /id="ribTwoChords" data-config-path="export\.stage_two_chords"/);
  assert.match(html, /id="ribTwoMin" data-config-path="export\.stage_two_min"/);
  assert.match(html, /<option value="above">Above the words<\/option>/);
  assert.match(html, /<span class="rib-label">Two-page Stage<\/span>/);
  // the Stage PDF only when it's ticked
  assert.match(html, /formats\.includes\(printStyle === 'stage' \? 'sheet_stage' : 'sheet_pdf'\)/);
});

test('a usual list from before 4.54 with the chord sheet PDF still gets the Stage PDF', () => {
  const src = html.slice(html.indexOf('function usualFormats'), html.indexOf('async function runExportInner'));
  const usualFormats = new Function(`${src}; return usualFormats;`)();
  assert.deepStrictEqual(usualFormats({ export: { usual_formats: '' } }), ['sheet_pdf', 'sheet_stage']);
  assert.deepStrictEqual(usualFormats({ export: { usual_formats: 'sheet_pdf,lyrics_txt' } }), ['sheet_pdf', 'lyrics_txt', 'sheet_stage']);
  assert.deepStrictEqual(usualFormats({ export: { usual_formats: 'sheet_pdf', usual_stage_split: true } }), ['sheet_pdf']);
  assert.deepStrictEqual(usualFormats({ export: { usual_formats: 'sheet_stage2', usual_stage_split: true } }), ['sheet_stage2']);
});

test('it tries one page before two (4.55)', () => {
  const src = read('src/two-pager.js');
  assert.match(src, /let chosen = fitIn\(1\) \|\| fitIn\(2\);/);
  assert.match(html, /on one page if it fits, otherwise two/);
});
