// 4.70: Stage copies: Auto (chords above on screen, in the words when printed) is the default;
// the formats are named by where the chords go; Sheet/Layout is hidden while a Stage copy ignores it
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sf = require('../src/stage-formats');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings: read them as \n
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');

test('Auto: chords above on screen, in the words in print; a chosen format is the same on both', () => {
  assert.strictEqual(sf.DEFAULT_FORMAT, 'auto');
  assert.strictEqual(sf.formatOf('auto', { screen: true }).id, 'clear');
  assert.strictEqual(sf.formatOf('auto').id, 'compact');
  assert.strictEqual(sf.formatOf(undefined, { screen: true }).id, 'clear');
  for (const id of ['clear', 'brackets', 'compact', 'heavy']) {
    assert.strictEqual(sf.formatOf(id, { screen: true }).id, id);
    assert.strictEqual(sf.formatOf(id).id, id);
  }
});

test('the formats are named by where the chords go', () => {
  assert.deepStrictEqual(sf.CHOICES.map((f) => f.name.split(':')[0]), ['Auto', 'Chords above', 'Chords above, in [ ]', 'Chords in the words', 'Chords raised in the words', 'Heavy']);
  assert.strictEqual(sf.nameOf('compact'), 'Chords in the words');
  assert.strictEqual(sf.nameOf(undefined).split(':')[0], 'Auto');
  const app = read('web/app.html');
  assert.match(app, /<option value="auto">Auto: chords above \(printed: in the words\)<\/option><option value="clear">Chords above<\/option>/);
  const html = read('index.html');
  assert.match(html, /<option value="auto">Auto: chords above on screen, in the words when printed \(the default\)<\/option>/);
  assert.match(html, /<option value="clear">Chords above<\/option>\n\s*<option value="brackets">Chords above, in \[ \]<\/option>/);
  assert.ok(!/<option value="compact">Compact<\/option>/.test(html));
});

test('web player: on screen as Auto says, a download as printed; Sheet hidden for a Stage copy', () => {
  const app = read('web/app.html');
  assert.match(app, /sheet\.dataset\.stageFormat = stageFormatId\(true\);/);
  assert.match(app, /stageOptions\(base, 48, 680, 20, false\)/);
  assert.match(app, /data-stage-format="\$\{stageFormatId\(false\)\}"/);
  assert.match(app, /\$\('layoutTool'\)\.hidden = look\.style === 'stage';/);
});

test('desktop: the preview is on screen, everything printed is not; Layout hidden for a Stage copy', () => {
  const html = read('index.html');
  assert.match(html, /stageRenderOptions\(baseOptions, undefined, \{ screen: true \}\)/);
  assert.match(html, /docAttrs\(undefined, \{ stage: previewLook\(\) === 'stage', screen: true \}\)/);
  assert.strictEqual((html.match(/screen: true/g) || []).length, 2, 'only the preview');
  assert.match(html, /document\.getElementById\('viewLayout'\)\.closest\('\.rib-field'\)\.hidden = stageLook;/);
  assert.match(html, /<p id="viewLayoutStage" class="rib-note" hidden[^>]*>Chords: as the Stage format<\/p>/);
});

test('desktop settings: Compact (the default since 4.52) moves to Auto once; a choice since is kept', () => {
  const src = read('main.js');
  const body = src.slice(src.indexOf('// 4.70: Auto became the default'), src.indexOf('// 4.55: the one-line strum box'));
  // eslint-disable-next-line no-new-func
  const move = new Function('parsed', `${body.replace(/^\s*\/\/.*$/gm, '')}; return parsed;`);
  assert.deepStrictEqual(move({ export: { stage_format: 'compact', stage_compact: true } }).export, { stage_format: 'auto', stage_compact: true, stage_auto: true });
  assert.deepStrictEqual(move({ export: { stage_format: 'clear', stage_compact: true } }).export.stage_format, 'clear');
  assert.deepStrictEqual(move({ export: { stage_format: 'compact', stage_auto: true } }).export.stage_format, 'compact', 'chosen after 4.70: kept');
  assert.match(src, /stage_auto: true, {10}\/\/ 4\.70/);
});

console.log('v4.70 tests passed');
