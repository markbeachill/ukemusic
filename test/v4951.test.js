// 4.95.1: reading (not editing), the song's Details, Links, Exports, Notes and ChordPro stay beside
// the sheet in a narrower column; only Words & chords waits for Edit words & chords. Done goes
// back to the tab you were reading (the notes, if the song has any, at first).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DESKTOP = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

test('the song\'s other tabs while reading; Words & chords while editing', () => {
  assert.ok(DESKTOP.includes('html:not([data-editing]) .workspace { grid-template-columns: minmax(260px, 0.6fr) 6px minmax(0, 1.4fr) !important; }'));
  assert.ok(!DESKTOP.includes('html:not([data-editing]) .workspace > .editor-panel'), 'the column isn\'t hidden');
  assert.ok(DESKTOP.includes('<button id="tabSong" type="button" role="tab" class="active" data-edit-only>Words &amp; chords</button>'));
  assert.ok(DESKTOP.includes("if (on && !was) showTab('song');"));
  assert.ok(DESKTOP.includes("if (!on && document.getElementById('tabSong').classList.contains('active')) showTab(state.readingTab || (notesEditor.value.trim() ? 'notes' : 'details'));"));
  assert.match(DESKTOP, /if \(!isEditing\(\)\) state\.readingTab = tab;/);
});
