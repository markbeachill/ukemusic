// 4.58: a right-click menu in the desktop app
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const { contextTemplate } = require('../src/context-menu');
const labels = (t) => t.map((i) => (i.type === 'separator' ? '--' : i.label + (i.enabled === false ? '(off)' : '')));

test('where you can type: Undo, Redo, Cut, Copy, Paste, Select all', () => {
  const t = contextTemplate({ isEditable: true, selectionText: '', editFlags: { canUndo: true, canRedo: false, canPaste: true } });
  assert.deepStrictEqual(labels(t), ['Undo', 'Redo(off)', '--', 'Cut(off)', 'Copy(off)', 'Paste', 'Select all']);
  const sel = contextTemplate({ isEditable: true, selectionText: 'Clementine', editFlags: {} });
  assert.ok(labels(sel).includes('Cut') && labels(sel).includes('Copy'));
});

test('selected text you can\'t change (the preview): Copy and Select all; nothing to do: no menu', () => {
  assert.deepStrictEqual(labels(contextTemplate({ selectionText: 'Oh my darling' })), ['Copy', 'Select all']);
  assert.strictEqual(contextTemplate({}).length, 0);
});

test('spelling: suggestions first, and Add to dictionary', () => {
  const runs = [];
  const t = contextTemplate({ isEditable: true, misspelledWord: 'practse', dictionarySuggestions: ['practise', 'practice'] }, null, (i) => runs.push(i));
  assert.deepStrictEqual(labels(t).slice(0, 4), ['practise', 'practice', 'Add to dictionary', '--']);
  t[0].click();
  assert.deepStrictEqual(runs[0], { replace: 'practise' });
});

test('the song editor: its own Undo, then the song items the page gives', () => {
  const runs = [];
  const t = contextTemplate({ selectionText: '' }, [{ id: 'shape', label: 'Chord shape for G…' }, { separator: true }, { action: 'insert-tab', label: 'Insert tab block' }], (i) => runs.push(i));
  assert.deepStrictEqual(labels(t), ['Undo', 'Redo', '--', 'Cut(off)', 'Copy(off)', 'Paste', 'Select all', '--', 'Chord shape for G…', '--', 'Insert tab block']);
  t[0].click(); t[t.length - 1].click(); t[6].click();
  assert.deepStrictEqual(runs.slice(0, 3), [{ action: 'editor-undo' }, { action: 'insert-tab', label: 'Insert tab block' }, { edit: 'selectAll' }]);
});

test('wired up: the main window gets the menu; the page offers chord items for the chord clicked', () => {
  assert.match(read('main.js'), /attachContextMenu\(mainWindow, \{ Menu, sendAction: sendMenuAction \}\)/);
  const html = read('index.html');
  for (const s of ['window.ukemusicContextItems = (x, y)', 'Chord shape for ${chord}…', 'Practise changing ${chord} to ${to}', "action: 'paste-chord-sheet'", "action: 'convert-chord-lines'", "action: 'insert-tab'"]) assert.ok(html.includes(s), s);
  assert.match(read('src/preload.js'), /editorContextPoint: \(x, y\)/);
  assert.match(read('src/codemirror-ukemusic.js'), /contextPoint\(x, y\) \{/);
});
