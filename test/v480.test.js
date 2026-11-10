// 4.80: the simple view settles after it hides things (docs/ui-improvements.md S1, S2, S4, A1, T1):
// the ribbon is fitted again, the hint line doesn't name what's hidden, a group's name follows
// what's left, greyed settings can't be reached from the keyboard, and the UI review looks at it
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

test('S1, S4, A1: after the features are applied', () => {
  const settled = DESKTOP.match(/function featuresSettled\(\) \{[\s\S]*?\n {8}\}/)[0];
  assert.match(settled, /window\.ukemusicFoldRibbon\?\.\(\);/, 'the ribbon is fitted again');
  assert.match(settled, /window\.ukemusicRibbonHint\?\.\(\);/);
  assert.match(settled, /el\.inert = getComputedStyle\(el\)\.pointerEvents === 'none';/, 'greyed: not by keyboard either');
  assert.match(settled, /tabs\.hidden = gone\('setlists'\);/, 'no lone Songs tab');
  assert.match(DESKTOP, /featureTabsShown\(\);\n {10}featuresSettled\(\);/);
  assert.match(DESKTOP, /state\.songUsesShown !== document\.documentElement\.dataset\.songUses\) \{[^\n]*featuresSettled\(\);/, 'and when a song brings a feature back');
  assert.match(DESKTOP, /<span class="rib-label" data-label-without="tabLook:Layout">Layout and tab<\/span>/);
  assert.match(DESKTOP, /<span class="rib-label" data-label-without="session:Karaoke">Full screen<\/span>/);
  assert.match(DESKTOP, /\.library-tabs\[hidden\] \{ display: none; \}/);
});

test('S2: the simple view\'s hints name nothing it hides', () => {
  const hints = DESKTOP.match(/const RIBBON_HINTS_SIMPLE = \{[\s\S]*?\};/)[0];
  for (const word of ['Loop', 'Practice', 'practise changes', 'new key', 'Stage', 'Help →']) assert.ok(!hints.includes(word), word);
  assert.match(DESKTOP, /document\.documentElement\.hasAttribute\('data-simple'\) && RIBBON_HINTS_SIMPLE\[tab\]/);
  assert.ok(!/Point at a control for its scope/.test(DESKTOP));
});

test('T1: the UI review looks at the simple view, and the web review at every feature', () => {
  const catalog = JSON.parse(read('tools/ui-review/catalog.json'));
  assert.ok(catalog.sections.some((s) => s.key === 'B'));
  for (const id of ['B1', 'B4', 'B9', 'B10']) assert.ok(catalog.items[id], id);
  assert.match(read('tools/ui-review/desktop.js'), /await safe\('B', async \(\) => \{/);
  const web = read('tools/ui-review/web.js');
  assert.match(web, /await safe\('B', async \(\) => \{/);
  assert.match(web, /look\.allFeatures = true;/);
  assert.ok(!catalog.notIn.ipad.includes('L6'), 'the web player has Paste from a website');
});

console.log('v4.80 tests passed');
