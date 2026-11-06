// 4.59: your instrument: asked on the first start, first in Settings, and new songs are made for it
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

test('the first start asks what you play, before the songs folder', () => {
  assert.match(html, /<dialog id="instrumentDialog">/);
  for (const id of ['soprano', 'lowg', 'baritone', 'guitar']) assert.ok(html.includes(`name="firstInstrument" value="${id}"`), id);
  assert.match(html, /if \(!state\.config\?\.library\?\.songs_folder\) \{\s*await askFirstInstrument\(\);\s*await ensureSongsFolder\(\);/);
});

test('Settings → All songs: Your instrument is the first setting', () => {
  const all = html.slice(html.indexOf('<div id="allSettingsPane"'));
  const first = all.match(/<section class="settings-group" id="([^"]+)"/)[1];
  assert.strictEqual(first, 'set-instrument');
  assert.ok(all.indexOf('id="song-instrument"') < all.indexOf('id="set-library"'));
});

test('new songs are made for an instrument of their own', () => {
  assert.match(html, /settings\.song\.instrument = defaultInstrumentId\(\); \/\/ 4\.59/, 'New song');
  assert.match(html, /instrument: settings\.song\?\.instrument \|\| songInstrument\(\)\.id \}/, 'Save (as new)');
  assert.match(html, /transpose: 0, instrument: songInstrument\(\)\.id \}/, 'written out with a picking pattern');
});

test('a ChordPro folder import is made for the instrument chosen for it', () => {
  const { importFolder } = require('../src/chordpro-import');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cho-'));
  const from = path.join(tmp, 'in'); const into = path.join(tmp, 'songs');
  fs.mkdirSync(from); fs.mkdirSync(into);
  fs.writeFileSync(path.join(from, 'a.cho'), '{title: Oh Susanna}\n[C]I come from Alabama\n');
  importFolder(from, into, { instrument: 'baritone' });
  const ini = fs.readFileSync(path.join(into, 'Oh Susanna', 'song.ini'), 'utf8');
  assert.match(ini, /instrument\s*=\s*baritone/);
});
