// 4.83: the web player's library and phone layout (docs/ui-improvements.md C7, S7, E1, E2, E3, C2)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const WEB = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.html'), 'utf8').replace(/\r\n/g, '\n');

test('C7: Paste and New song are above the list; the rest behind More', () => {
  const lib = WEB.slice(WEB.indexOf('<section id="libraryView"'), WEB.indexOf('<section id="songView"'));
  assert.ok(lib.indexOf('id="pasteSongBtn"') < lib.indexOf('id="search"'), 'above the search box and the list');
  assert.ok(lib.indexOf('id="newSongBtn"') < lib.indexOf('id="songList"'));
  const more = lib.match(/<details id="libMore" class="lib-more">[\s\S]*?<\/details>/)[0];
  for (const id of ['for="updateInput"', 'id="cloudBtn"', 'id="backupBtn"']) assert.ok(more.includes(id), id);
  assert.match(WEB, /\.library:has\(#instrumentAsk:not\(\[hidden\]\)\) \.my-instrument \{ display: none; \}/, 'the instrument is asked once');
});

test('S7: Settings on the library: all features, and the display for all songs, without opening a song', () => {
  const lib = WEB.slice(WEB.indexOf('<section id="libraryView"'), WEB.indexOf('<section id="songView"'));
  assert.match(lib, /<button id="appSettingsBtn" class="btn" type="button"[^>]*>Settings<\/button>/);
  const dialog = WEB.match(/<dialog id="appSettingsDialog"[\s\S]*?<\/dialog>/)[0];
  assert.match(dialog, /<input id="allFeatures" type="checkbox"> Show all features/);
  assert.match(dialog, /<div id="appDisplaySlot"><\/div>/);
  assert.match(WEB, /\$\('appDisplaySlot'\)\.appendChild\(d\); d\.open = true;/, 'the display choices move in…');
  assert.match(WEB, /\$\('moreTools'\)\.insertBefore\(d, \$\('appSettingsRow'\)\);/, '…and back');
  assert.match(WEB, /if \(!view\.song\) \{ renderLookControls\(\); return; \}/, 'changing one with no song open');
  assert.match(WEB, /<button id="appSettingsBtn2" class="btn" type="button">Settings for all songs…<\/button>/);
});

test('C2: tick boxes with fixed labels', () => {
  assert.match(WEB, /<input id="commonBtn" type="checkbox"> Hide common<\/label>/);
  assert.match(WEB, /<input id="leftBtn" type="checkbox"> Left-handed<\/label>/);
  assert.match(WEB, /<input id="easyBtn" type="checkbox"> Easy to read<\/label>/);
  for (const old of ['Common: shown', 'Left-handed: off', 'Easy to read: on']) assert.ok(!WEB.includes(old), old);
});

test('E1: on a phone, 44px to tap and 13px to read', () => {
  const css = WEB.slice(WEB.indexOf('/* 4.83: on a touch screen'), WEB.indexOf('</style>'));
  assert.match(css, /@media \(pointer: coarse\), \(max-width: 640px\) \{/);
  assert.match(css, /\.tool button, \.tool select \{ min-width: 44px; min-height: 44px; \}/);
  assert.match(css, /\.tempo button \{ width: 44px; height: 44px; \}/);
  assert.ok(!/font-size:\s*1[12](\.\d)?px/.test(css));
  assert.ok(!/#songMeta \{font-size:11px/.test(WEB) && !/\.player-row \.btn \{padding:6px 8px;font-size:12px\}/.test(WEB));
});

test('E2, E3: the Edit page starts with the song; Edit chords on the sheet shows the sheet', () => {
  const edit = WEB.slice(WEB.indexOf('<section id="editView"'), WEB.indexOf('<div id="editInfoPanel"'));
  assert.ok(edit.indexOf('class="editor-box"') < edit.indexOf('Help with insertion buttons'), 'the help lines are under the editor');
  assert.match(WEB, /\$\('autosaveNote'\)\.hidden = local\.get\('autosaveSeen', false\) === true; local\.set\('autosaveSeen', true\);/);
  assert.match(WEB, /if \(on && \$\('editPreviewBtn'\)\.offsetParent && !\$\('editWrap'\)\.classList\.contains\('previewing'\)\) \{ \$\('editPreviewBtn'\)\.click\(\); return; \}/);
});

console.log('v4.83 tests passed');
