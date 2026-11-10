// 4.79: Edit chords on the sheet: on the Write tab, and on or off by right-clicking the sheet; the
// guide, the website and the Features table say so
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

test('desktop: Write → Edit chords → On the sheet (a toggle), not on Display', () => {
  const write = DESKTOP.match(/data-ribbon-panel="write"[\s\S]*?(?=\n {10}<div class="ribbon-panel")/)[0];
  assert.match(write, /<div class="rib-group" data-feature="chordEdit">\s*<div class="rib-items">\s*<button id="chordEditButton" class="rib-button" type="button" data-icon="move" aria-pressed="false"[^>]*>On the sheet<\/button>\s*<\/div>\s*<span class="rib-label">Edit chords<\/span>/);
  const view = DESKTOP.match(/data-ribbon-panel="view"[\s\S]*?(?=\n {10}<div class="ribbon-panel")/)[0];
  assert.ok(!/chordEdit|Edit chords/.test(view));
  assert.match(DESKTOP, / {10}move: 'M12 3v18M3 12h18/, 'its icon');
  assert.match(DESKTOP, /function setChordEdit\(on\) \{/);
  assert.match(DESKTOP, /button\.setAttribute\('aria-pressed', String\(chordEditWanted\(\)\)\)/);
});

test('right-click the sheet: on or off (desktop preview, web Edit preview)', () => {
  const { contextToggle } = require('../src/sheet-chord-editor');
  assert.strictEqual(typeof contextToggle, 'function');
  const src = read('src/sheet-chord-editor.js');
  assert.match(src, /item\.setAttribute\('role', 'menuitemcheckbox'\);/);
  assert.match(src, /doc\.addEventListener\('contextmenu', \(e\) => \{\n\s*if \(opts\.within && !opts\.within\.contains\(e\.target\)\) return;/, 'only on the sheet');
  assert.ok(!/addEventListener\('scroll', close/.test(src), 'the preview scrolls itself as it follows the song: that doesn\'t close the menu');
  assert.match(DESKTOP, /UkeSheetChordEditor\.contextToggle\(doc, \{ isOn: chordEditWanted, onToggle: setChordEdit, unavailable: \(\) => state\.chordEditBlocked \|\| '' \}\);/);
  assert.match(WEB, /UkeSheetChordEditor\.contextToggle\(document, \{ within: \$\('editSheet'\), isOn: \(\) => look\.chordEdit === true, onToggle: setChordEdit,/);
});

test('the guide, the website, the Features table and the picture', () => {
  assert.match(read('WRITING.md'), /### Or move the chords on the sheet\n\nRather not type brackets\? Turn on \*\*Edit chords on the sheet\*\*: on the desktop, \*\*Write → On the sheet\*\*, or right-click the preview/);
  const pages = read('web/pages.js');
  assert.match(pages, /Or turn on <b>Edit chords on the sheet<\/b> and drag each chord to the word where it's played/);
  assert.match(pages, /h3: 'Or move the chords with the mouse'[^\n]*img: 'chord-edit\.webp'/);
  assert.ok(fs.existsSync(path.join(ROOT, 'site', 'img', 'chord-edit.webp')));
  assert.match(read('tools/site-pictures.js'), /await scene\('chord-edit', async \(\) => \{/);
  assert.match(read('web/features.js'), /Drag a chord to the right word on the sheet: Edit chords on the sheet \(Write tab, or right-click the sheet\)/);
  assert.strictEqual(require('../src/feature-levels').FEATURES.find((f) => f.id === 'chordEdit').where, 'Write; web: the Edit page');
});

console.log('v4.79 tests passed');
