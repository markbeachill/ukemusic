// 4.94: the home screen: Songs | Free Practice tabs in the top bar (Free Practice opens under the
// bar, Songs takes you back); New song asks how (paste from a website, write your own, import);
// the songs as tiles or a list. In a song: × closes it; while reading, a firm line above the song
// and no Bring in (import, paste); Practice speed in the simple view. The web player alike.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');
const F = require('../src/feature-levels.js');

test('desktop home: Songs and Free Practice tabs at the top; no orange button; practice under the bar', () => {
  const bar = DESKTOP.slice(DESKTOP.indexOf('<header class="library-bar">'), DESKTOP.indexOf('</header>', DESKTOP.indexOf('<header class="library-bar">')));
  assert.ok(bar.includes('<button id="homeTabSongs" class="home-tab active"'));
  assert.ok(bar.includes('<button id="libPractice" class="home-tab practice-tab"'));
  assert.ok(!DESKTOP.includes('class="practice-cta" type="button"'));
  assert.ok(DESKTOP.includes("practiceEl.classList.add('pr-under-home');"));
  assert.ok(DESKTOP.includes(".practice.pr-under-home { top: var(--home-bar-h, 60px); }"));
  assert.ok(DESKTOP.includes("document.getElementById('homeTabSongs').addEventListener('click', () => { if (!practiceEl.hidden) document.getElementById('practiceClose').click(); });"));
});

test('desktop: New song asks how; the songs as tiles or a list, kept', () => {
  const heading = DESKTOP.slice(DESKTOP.indexOf('<div class="library-heading">'), DESKTOP.indexOf('<div class="library-tabs"'));
  assert.ok(!heading.includes('id="libPaste"'), 'no Paste button of its own');
  assert.match(DESKTOP, /<dialog id="newSongDialog" class="new-song-dialog"[\s\S]*?id="libPaste"[\s\S]*?id="libWrite"[\s\S]*?id="libImport"[\s\S]*?<\/dialog>/);
  assert.ok(DESKTOP.includes("document.getElementById('libNew').addEventListener('click', () => newSongDialog.showModal());"));
  assert.match(DESKTOP, /<button id="libViewTiles" type="button" aria-pressed="true"[^>]*>▦ Tiles<\/button><button id="libViewList"/);
  assert.ok(DESKTOP.includes(".library-songs.tiles #libList { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }"));
  assert.ok(DESKTOP.includes("try { setLibraryView(localStorage.getItem(LIB_VIEW_KEY) || 'tiles'); }"));
});

test('desktop song: × closes it; reading: a firm line above the song, no Bring in; Practice speed simple', () => {
  assert.match(DESKTOP, /<button id="closeSongX" class="appbar-close" type="button" title="Close the song \(Ctrl\+W\)" aria-label="Close the song">×<\/button>/);
  assert.ok(DESKTOP.includes("html:not([data-editing]) .workspace > .preview-panel { border-top: 3px solid"));
  assert.ok(DESKTOP.includes('<div class="rib-group" data-feature="bringIn" data-edit-only>'));
  assert.strictEqual(F.FEATURES.find((f) => f.id === 'practice').level, 'simple');
});

test('web player alike: the tabs, New song\'s choices', () => {
  assert.match(WEB, /<nav class="home-tabs" role="tablist" aria-label="ukemusic"><button id="homeTabSongs"[^>]*>Songs<\/button><button id="libPractice" class="home-tab practice-tab"/);
  assert.ok(!WEB.includes('class="practice-cta" type="button"'));
  assert.match(WEB, /<dialog id="newWayDialog" class="new-way-dialog">[\s\S]*?id="pasteSongBtn"[\s\S]*?id="writeSongBtn"[\s\S]*?for="updateInput"[\s\S]*?<\/dialog>/);
  assert.ok(WEB.includes("$('newSongBtn').addEventListener('click', () => $('newWayDialog').showModal());"));
  assert.ok(WEB.includes("practiceEl.classList.add('pr-under-home');"));
});
