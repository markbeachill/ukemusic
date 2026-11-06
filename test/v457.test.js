// 4.57: a song's settings (instrument, tempo, details…) are part of Save, so closing asks
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const { settingsKey } = require('../src/song-ui');

test('a change of instrument is a change; key order, number vs text and empty values are not', () => {
  const saved = { song: { transpose: 0, tempo: 96, instrument: 'soprano', settings_format: 3 } };
  assert.strictEqual(settingsKey(saved), settingsKey({ song: { instrument: 'soprano', tempo: '96', transpose: 0, artist: '' } }));
  assert.notStrictEqual(settingsKey(saved), settingsKey({ song: { ...saved.song, instrument: 'baritone' } }));
  assert.strictEqual(settingsKey(null), settingsKey({ export: {} }));
  assert.notStrictEqual(settingsKey(null), settingsKey({ song: { instrument: 'guitar' } }));
});

test('changing a setting no longer writes song.ini; Save does, and the badge counts it', () => {
  const persist = html.slice(html.indexOf('async function persistSongSettings()'), html.indexOf('async function writeSongSettingsNow('));
  assert.ok(!persist.includes('writeSongSettings('), 'a change waits for Save');
  assert.match(html, /state\.dirty = getEditorValue\(\) !== state\.savedContent \|\| songSettingsChanged\(\);/);
  const save = html.slice(html.indexOf('async function saveFileInner('), html.indexOf('async function requireSongForExport('));
  assert.match(save, /await writeSongSettingsNow\(\);/);
  assert.match(html, /state\.savedSongSettings = clone\(state\.songSettings\);/, 'opening a song remembers its saved settings');
});

test('a new song keeps its own settings instead of changing the defaults', () => {
  assert.match(html, /const saveToSong = songScoped;/);
  assert.match(html, /mergeConfig\(newSongFacts\(\), state\.songSettings \|\| \{\}\)/);
  const look = html.slice(html.indexOf('async function setLookSetting('), html.indexOf("document.getElementById('viewDiagrams')"));
  assert.ok(!look.includes('state.config'), 'the ribbon never changes the defaults');
});

test('Save version and Remove version are kept at once', () => {
  assert.strictEqual((html.match(/await writeSongSettingsNow\(\['versions', 'song\.transpose'\]\)/g) || []).length, 2);
});

test('the Settings note says this song\'s settings are kept by Save', () => {
  assert.match(html, /tab === 'song' \? 'Kept when you save the song' : 'Changes are saved as you make them'/);
});
