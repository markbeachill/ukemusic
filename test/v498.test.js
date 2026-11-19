// 4.98: the song's sections are a rail of tabs down the left edge; reading, the column beside it can be hidden
const assert = require('assert');
const fs = require('fs');
const path = require('path');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DESKTOP = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

test('the tabs are a rail down the left, each an icon with its name', () => {
  assert.ok(DESKTOP.includes('<div class="editor-tabs" role="tablist" aria-orientation="vertical">'));
  assert.ok(DESKTOP.includes('grid-template-columns: 68px minmax(0, 1fr);'));
  for (const [id, icon, label] of [['tabSong', 'rename', 'Words &amp; chords'], ['tabDetails', 'info', 'Details'], ['tabLinks', 'link', 'Links'], ['tabExports', 'export', 'Exports'], ['tabNotes', 'note', 'Notes'], ['tabChordPro', 'cho', 'ChordPro']]) {
    assert.match(DESKTOP, new RegExp(`<button id="${id}"[^>]*><span data-icon="${icon}"></span><span class="rail-label">${label}</span></button>`), id);
  }
  for (const icon of ['info', 'link', 'note', 'chevronLeft']) assert.match(DESKTOP, new RegExp(`\\n          ${icon}: '`), icon);
});

test('reading, the column hides: the open tab or Hide; any tab shows it; kept between songs', () => {
  assert.ok(DESKTOP.includes('<button id="panelToggle" class="rail-toggle" type="button" data-read-only'));
  assert.ok(DESKTOP.includes('html[data-panel-closed]:not([data-editing]) .workspace { grid-template-columns: 68px 0 minmax(0, 1fr) !important; }'));
  assert.ok(DESKTOP.includes('html[data-panel-closed]:not([data-editing]) #splitter { visibility: hidden; }'), 'the splitter keeps its grid place');
  assert.ok(DESKTOP.includes("else if (button.classList.contains('active')) { setSongPanelClosed(true); event.stopPropagation(); }"));
  assert.ok(DESKTOP.includes("localStorage.setItem('ukemusic.songPanelClosed', closed ? '1' : '0')"));
  assert.ok(DESKTOP.includes('if (songPanelChoice() === null) setSongPanelClosed(!hasNotes, { remember: false });'));
  assert.ok(DESKTOP.includes('html[data-editing] .editor-tabs [data-read-only] { display: none; }'), 'editing, the column is always there');
});

test('a dot on Notes when the song has notes', () => {
  assert.ok(DESKTOP.includes('#tabNotes.has-notes::after'));
  assert.ok((DESKTOP.match(/markSongNotes\(\);/g) || []).length >= 3);
});
