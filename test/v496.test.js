// 4.96: the simple view, reviewed: what it hid that made little difference is now in it (the song's
// Links, Exports and ChordPro tabs, its other details, Earlier versions, Suggest a capo, Learn's
// chord changes); Settings starts with your instrument and the simple view's switch; from the home
// screen, Settings is only the settings for all songs.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DESKTOP = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const F = require('../src/feature-levels');
const level = (id) => F.FEATURES.find((f) => f.id === id).level;

test('the simple view keeps what made little difference', () => {
  for (const id of ['songLinks', 'songExports', 'songChordPro', 'detailsMore', 'versions', 'capoSuggest', 'learnFingers']) assert.strictEqual(level(id), 'simple', id);
  for (const id of ['style', 'stage', 'exportMore', 'session', 'sound', 'learnTheory', 'picking']) assert.strictEqual(level(id), 'all', id);
});

test('Settings: your instrument, then the simple view, then opening a song; the table at the end', () => {
  const order = [...DESKTOP.matchAll(/<section class="settings-group" id="(set-[a-z-]+)"/g)].map((m) => m[1]);
  const all = order.slice(order.indexOf('set-instrument'));
  assert.deepStrictEqual(all.slice(0, 4), ['set-instrument', 'set-features', 'set-editing', 'set-library']);
  assert.strictEqual(all[all.length - 1], 'set-feature-table');
  const features = DESKTOP.slice(DESKTOP.indexOf('id="set-features"'), DESKTOP.indexOf('id="set-editing"'));
  assert.ok(features.includes('Show all features') && features.includes('data-settings-jump="set-feature-table"') && !features.includes('id="featureTable"'));
  assert.ok(DESKTOP.slice(DESKTOP.indexOf('id="set-feature-table"')).includes('<div id="featureTable" class="field"></div>'));
});

test('from the home screen, Settings is for all songs only', () => {
  assert.ok(DESKTOP.includes("if (shouldShow) document.getElementById('settingsTabSong').hidden = !libraryEl.hidden;"));
  assert.match(DESKTOP, /getElementById\('libSettingsButton'\)\.addEventListener\('click', \(\) => \{\n\s+toggleSettingsPanel\(true\);\n\s+showSettingsTab\('all'\);/);
});
