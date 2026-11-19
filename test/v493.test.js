// 4.93: Edit words & chords. A song opens as the sheet to play from, the whole width; the button
// (or F2) shows the words and chords beside it, and Done hides them. Save and Discard sit beside
// "Not saved" whenever anything is unsaved, editing or not (a tempo or picking pattern changed while
// playing too). New and imported songs open ready to change; a setting opens every song that way.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const MAIN = read('main.js');
const WEB = read('web/app.html');
const F = require('../src/feature-levels.js');

test('the song opens as the sheet: the editor, the Write tab and Tidy chords only while editing', () => {
  // 4.95.1: reading, the song's other tabs stay beside the sheet; only Words & chords waits for editing
  assert.ok(DESKTOP.includes('html:not([data-editing]) .workspace { grid-template-columns: minmax(330px, 0.6fr) 6px minmax(0, 1.4fr) !important; }'));
  assert.match(DESKTOP, /<button id="tabSong" type="button" role="tab" class="active" data-edit-only[^>]*><span data-icon="rename"><\/span><span class="rail-label">Words &amp; chords<\/span><\/button>/); // 4.98: in the rail
  assert.ok(DESKTOP.includes('html:not([data-editing]) [data-edit-only] { display: none !important; }'));
  assert.match(DESKTOP, /<button id="ribbonTabWrite" data-edit-only class="ribbon-tab"/);
  assert.match(DESKTOP, /<button id="convertLinesButton" data-feature="tidy" data-edit-only/);
  assert.match(DESKTOP, /<button id="editWordsButton" type="button" data-feature="editWords" aria-pressed="false"[^>]*>✎ Edit words &amp; chords<\/button>/);
  assert.ok(DESKTOP.includes("button.textContent = on ? 'Done' : '✎ Edit words & chords';"));
});

test('when it shows the words: a new or imported song, the setting, F2, the Write tab, Edit chords on the sheet', () => {
  assert.ok(DESKTOP.includes('setEditing(keepEditing ?? Boolean(state.config?.general?.open_editing)); // 4.93'));
  assert.ok(DESKTOP.includes('setEditing(true); // 4.93: a new song is for writing'));
  assert.ok(DESKTOP.includes('setEditing(true); // 4.93: something brought in (or not yet a song) opens ready to change'));
  assert.match(DESKTOP, /case 'edit-words':\n\s+if \(!libraryEl\.hidden\) break;\n\s+setEditing\(!isEditing\(\), \{ focus: true \}\);/);
  assert.match(MAIN, /\{ id: 'song-edit-words', label: 'Edit Words and Chords', accelerator: 'F2', click: \(\) => sendMenuAction\('edit-words'\) \}/);
  assert.ok(DESKTOP.includes('document.querySelector(`.ribbon-tab[data-ribbon="${name}"][data-edit-only]`)) setEditing(true);'));
  assert.ok(DESKTOP.includes("function chordEditWanted() { return isEditing() && ("));
  assert.ok(DESKTOP.includes('if (on && !isEditing()) setEditing(true); // 4.93: changing chords is editing'));
  assert.match(MAIN, /all_features: false, feature_levels: '', open_editing: false \}/);
  assert.match(DESKTOP, /<input id="general-open_editing" type="checkbox" data-config-path="general\.open_editing" \/> Open songs with the words and chords showing, ready to change/);
});

test('Save and Discard beside "Not saved", editing or not; Discard asks, then reloads the saved song', () => {
  assert.match(DESKTOP, /<button id="barSave" class="bar-save" type="button" data-feature="save"[^>]*hidden>Save<\/button>/);
  assert.match(DESKTOP, /<button id="barDiscard" class="bar-save ghost" type="button" data-feature="save"[^>]*hidden>Discard<\/button>/);
  assert.ok(DESKTOP.includes("dirtyLabel.textContent = state.dirty ? 'Not saved' : (state.song ? 'Saved' : 'Not saved yet');"));
  assert.ok(DESKTOP.includes("document.getElementById('barSave').hidden = !(state.dirty || !state.song);"));
  assert.ok(DESKTOP.includes("document.getElementById('barDiscard').hidden = !(state.dirty && state.song);"));
  assert.match(DESKTOP, /askConfirm\('Discard your changes\? The song goes back to how it was when you last saved it\.', \{ ok: 'Discard', danger: true \}\)/);
  assert.ok(DESKTOP.includes('await loadSong(state.song.folder, { keepEditing: editing });'));
});

test('the web player says the same; the feature table has its row; the names we use', () => {
  assert.ok(WEB.includes('<button id="editBtn" data-feature="editWords" class="btn" type="button" title="Change the words and chords, the details and the notes"><span>✎ Edit<span class="edit-long"> words &amp; chords</span></span></button>'));
  assert.ok(WEB.includes('@media (max-width: 640px) { .edit-long { display: none; } }'));
  assert.strictEqual(F.FEATURES.find((f) => f.id === 'editWords').level, 'simple');
  assert.ok(read('AGENTS.md').includes('| Showing the words and chords to change them (a song opens as the sheet) | Edit words & chords; Done goes back |'));
  assert.ok(read('README.md').includes('A song opens as the **sheet to play from**'));
  assert.ok(read('web/pages.js').includes('<strong>✎ Edit words &amp; chords</strong> puts the words beside it'));
});
