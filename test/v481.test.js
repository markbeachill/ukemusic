// 4.81: the simple view sealed (docs/ui-improvements.md S3, S5, S6, S8, S9) and a short menu bar (L2)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');
const MAIN = read('main.js');
const F = require('../src/feature-levels');
const level = (id) => F.FEATURES.find((f) => f.id === id).level;

test('S3, S9: more of the app belongs to a feature', () => {
  for (const id of ['versions', 'tidy', 'capoSuggest', 'keyVersions', 'libraries', 'libraryTools', 'detailsMore', 'exportMore', 'downloadMore']) assert.strictEqual(level(id), 'all', id);
  assert.strictEqual(level('phone'), 'simple');
  for (const [id, feature] of [['historyButton', 'versions'], ['convertLinesButton', 'tidy'], ['capoSuggestButton', 'capoSuggest'], ['libSwitch', 'libraries'], ['libOpenFolder', 'libraryTools'], ['libExportAll', 'libraryTools'], ['libPhone', 'phone'], ['detailsAlbum', 'detailsMore'], ['detailsLicence', 'detailsMore']]) {
    assert.match(DESKTOP, new RegExp(`id="${id}" data-feature="${feature}"`), id);
  }
  assert.match(DESKTOP, /<details class="rib-menu" id="keyMenu" data-feature="keyVersions">/);
  assert.match(DESKTOP, /if \(!featureGone\('setlists'\)\) menuButton\(menu, `Add to a setlist…/, 'the ⋯ menu');
});

test('S3: the Export choices: only what shows is ticked', () => {
  assert.match(DESKTOP, /<label class="export-main" data-feature="stage"><input type="checkbox" name="format" value="sheet_stage" \/>/);
  assert.match(DESKTOP, /<label class="export-main" data-feature="twoPage"[^>]*><input type="checkbox" name="format" value="sheet_stage2" \/>/);
  assert.match(DESKTOP, /<details id="exportMore" class="export-more" data-feature="exportMore">/);
  assert.match(DESKTOP, /<fieldset data-feature="exportKeys">/);
  assert.match(DESKTOP, /box\.checked = ticked\.includes\(box\.value\) && !hiddenBox\(box\);/);
  assert.match(DESKTOP, /if \(!boxes\.some\(\(box\) => box\.checked\)\) boxes\.find\(\(box\) => box\.value === 'sheet_pdf'\)\.checked = true;/);
  assert.match(WEB, /<button type="button" data-dl="stage" data-feature="stage">/);
  assert.match(WEB, /<button type="button" data-dl="chordpro" data-feature="downloadMore">/);
});

test('S5: greyed settings are their heading; Settings opens on the page you can change', () => {
  const css = F.css();
  assert.match(css, /\[data-feature~="setStage"\]\[data-feature-grey\] > :not\(h3\) \{ display: none !important; \}/);
  assert.match(css, /content: " · shown with all features"/);
  assert.match(DESKTOP, /if \(shouldShow && document\.documentElement\.hasAttribute\('data-simple'\)\) showSettingsTab\('all'\);/);
});

test('S6: More features: one click, one click back, the same tab', () => {
  assert.match(DESKTOP, /<button id="moreFeaturesButton"[^>]*>More features<\/button>/);
  assert.match(DESKTOP, /const was = document\.querySelector\('\.ribbon-tab\.active\[data-ribbon\]'\);\n\s*saveFeatures\(null, true\);\n\s*was\?\.click\(\);/);
  assert.match(DESKTOP, /action: 'Back to simple', onAction: \(\) => saveFeatures\(null, false\)/);
});

test('S8: the Features table: grouped, the tick box alone', () => {
  const html = F.tableHtml('desktop');
  assert.match(html, /<thead><tr><th>Feature<\/th><th>Simple view<\/th><\/tr><\/thead>/);
  assert.strictEqual((html.match(/<tr class="feature-where"><th colspan="2" scope="colgroup">File<\/th>/g) || []).length, 1);
  assert.ok(!/>in the simple view</.test(html), 'not repeated on every row');
  assert.match(html, /aria-label="Capo: in the simple view" checked>/);
});

test('L2: a short menu bar; the keys of what left it still work', () => {
  const labels = [...MAIN.slice(MAIN.indexOf('const template = ['), MAIN.indexOf('Menu.setApplicationMenu')).matchAll(/^ {4}\{\n {6}label: '([^']+)'/gm)].map((m) => m[1]);
  assert.deepStrictEqual(labels, ['File', 'Edit', 'View', 'Help']);
  for (const gone of ['Earlier Versions…', 'Guess the Key…', 'Suggest a Capo…', 'Chord Patterns…', 'Edit Style…', 'Tidy Chords Above Words', 'Switch Library…']) assert.ok(!MAIN.includes(gone), gone);
  assert.match(MAIN, /\{ label: 'How to Write Songs', accelerator: 'F1', click: \(\) => sendMenuAction\('guide'\) \}/);
  assert.match(DESKTOP, /case 'guide':\n\s*openGuide\(\);/);
  // F5 plays, Shift+F5 stops, Ctrl+K guesses the key, Ctrl+Alt+E opens the style
  const src = MAIN.slice(MAIN.indexOf('const KEYS_OFF_MENU'), MAIN.indexOf('function setMenuState'));
  const keyOffMenu = new Function(`${src}; return keyOffMenu;`)();
  const press = (key, more = {}) => keyOffMenu({ type: 'keyDown', key, control: false, meta: false, alt: false, shift: false, ...more });
  assert.strictEqual(press('F5'), 'play');
  assert.strictEqual(press('F5', { shift: true }), 'stop');
  assert.strictEqual(press('k', { control: true }), 'guess-key');
  assert.strictEqual(press('K', { meta: true }), 'guess-key');
  assert.strictEqual(press('e', { control: true, alt: true }), 'edit-stylesheet');
  assert.strictEqual(press('e', { control: true }), null, 'Ctrl+E is still the menu\'s Export');
  assert.strictEqual(press('k'), null);
  assert.strictEqual(keyOffMenu({ type: 'keyUp', key: 'F5' }), null);
  assert.match(MAIN, /mainWindow\.webContents\.on\('before-input-event'/);
});

console.log('v4.81 tests passed');
