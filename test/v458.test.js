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

// The website (4.58): what Bing's Site Scan checks
const pages = require('../web/pages');
const docs = fs.readFileSync(path.join(ROOT, 'web/docs.js'), 'utf8');
const titleOf = (p) => p.seoTitle || `${p.title} · ukemusic`;

test('every website page: a title of 25 to 70 characters and a description of 50 to 160', () => {
  const all = [...pages.PAGES, pages.SONGS_PAGE, pages.PHONE_PAGE, pages.DROPBOX_PAGE, pages.GALLERY_PAGE, pages.PRACTICE_PAGE];
  pages.PRACTICE_PAGE.body(); // sets its description
  for (const p of all) {
    assert.ok(titleOf(p).length >= 25 && titleOf(p).length <= 70, `${p.file} title: ${titleOf(p)}`);
    assert.ok(p.blurb.length >= 50 && p.blurb.length <= 160, `${p.file} description: ${p.blurb.length}`);
  }
  const home = read('site/index.html');
  assert.ok(home.match(/<title>([^<]*)<\/title>/)[1].length <= 70);
  assert.ok(home.match(/<meta name="description" content="([^"]*)"/)[1].length <= 160);
  assert.ok(read('web/build.js').match(/<meta name="description" content="([^"]*)"/)[1].length <= 160);
});

test('the documents have a canonical address and a long enough title and description', () => {
  assert.match(docs, /<link rel="canonical" href="https:\/\/markbeachill\.github\.io\/ukemusic\/\$\{esc\(p\.html\)\}">/);
  for (const m of docs.matchAll(/seoTitle: "([^"]+)"/g)) assert.ok(m[1].length >= 25 && m[1].length <= 70, m[1]);
  for (const m of docs.matchAll(/blurb: '([^']+)'/g)) assert.ok(m[1].length >= 50 && m[1].length <= 160, m[1]);
});

test('one main heading on the web player (Your songs is a second-level heading)', () => {
  const app = read('web/app.html');
  assert.ok(app.includes('<h2 id="libTitle">Your songs</h2>') && !app.includes('<h1 id="libTitle">'));
});

test('the gallery\'s song pages have a title, description and address; doing it twice changes nothing', () => {
  for (const slug of ['wild-rover', 'brahms-lullaby', 'danny-boy']) {
    const html = read(`site/gallery/${slug}/sheet.html`);
    assert.match(html, /<title>[^<]+: ukulele chord sheet · ukemusic gallery<\/title>/);
    assert.match(html, /<meta name="description" content="[^"]{50,160}">/);
    assert.ok(html.includes(`<link rel="canonical" href="https://markbeachill.github.io/ukemusic/gallery/${slug}/sheet.html">`));
    assert.strictEqual(pages.galleryPageHead(html, 'X', slug), html);
  }
});
