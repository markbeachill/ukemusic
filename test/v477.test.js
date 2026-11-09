// 4.77: Edit chords on the sheet (an option): drag a chord to where it's played, change it, take it
// out or put one in, on the sheet; the change is made in the song's text, as if typed
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');
const parse = require('../src/parser');
const ce = require('../src/chord-edit');
const { renderHtml } = require('../src/renderer-html');
const { wrapLines } = require('../src/line-wrap');
const lib = require('../src/song-library');

const T = '--START MUSIC--\nI [C]come from **Ala**[G7x2]bama\n[F:2]Oh [C][G]Su\n--END MUSIC--';
const line = (text, n) => text.split('\n')[n - 1];

test('the letters are counted as the parser counts them (every public-domain song)', () => {
  let lines = 0;
  for (const s of lib.listSongs(path.join(ROOT, 'public domain songs', 'Public Domain Songs'))) {
    const text = lib.readSong(s.folder).content.replace(/\r\n/g, '\n');
    const by = {};
    for (const n of parse(text)) if (n.type === 'chord' && typeof n.offset === 'number') (by[n.line] = by[n.line] || []).push(n.offset);
    for (const [ln, offsets] of Object.entries(by)) {
      const info = ce.lineInfo(text.split('\n')[ln - 1]);
      assert.deepStrictEqual(info.chords.filter((c) => !/^\[|^[|%]$/.test(c.inner)).map((c) => c.at), offsets, `${s.title} line ${ln}`);
      lines += 1;
    }
  }
  assert.ok(lines > 200);
});

test('move: the chord goes before the letter it was dropped on; the words stay as they were', () => {
  assert.strictEqual(line(ce.apply(T, { type: 'move', line: 2, at: 2, nth: 0, toAt: 7 }), 2), 'I come [C]from **Ala**[G7x2]bama');
  assert.strictEqual(line(ce.apply(T, { type: 'move', line: 2, at: 15, nth: 0, toAt: 0 }), 2), '[G7x2]I [C]come from **Ala**bama', 'with its timing');
  const other = ce.apply(T, { type: 'move', line: 2, at: 2, nth: 0, toLine: 3, toAt: 3 });
  assert.strictEqual(line(other, 2), 'I come from **Ala**[G7x2]bama');
  assert.strictEqual(line(other, 3), '[F:2]Oh [C][G][C]Su', 'onto another line, after the chords already there');
  assert.strictEqual(ce.apply(T, { type: 'move', line: 2, at: 2, nth: 0, toAt: 2 }), T, 'nowhere: no change');
});

test('change, remove, put in; two chords on one letter; a chord named in another key', () => {
  assert.strictEqual(line(ce.apply(T, { type: 'change', line: 2, at: 15, name: 'Am' }), 2), 'I [C]come from **Ala**[Amx2]bama', 'x2 kept');
  assert.strictEqual(line(ce.apply(T, { type: 'change', line: 3, at: 0, name: 'A' }, { shift: 2 }), 3), '[G:2]Oh [C][G]Su', 'shown 2 up: A on the sheet is G');
  assert.strictEqual(line(ce.apply(T, { type: 'remove', line: 3, at: 3, nth: 1 }), 3), '[F:2]Oh [C]Su', 'the second of [C][G]');
  assert.strictEqual(line(ce.apply(T, { type: 'insert', line: 3, at: 5, name: 'E' }), 3), '[F:2]Oh [C][G]Su[E]', 'at the end of the line');
  assert.strictEqual(line(ce.apply(T, { type: 'insert', line: 3, at: 4, name: '[Bb]' }), 3), '[F:2]Oh [C][G]S[Bb]u', 'brackets typed are not doubled');
  assert.strictEqual(ce.apply(T, { type: 'remove', line: 2, at: 9 }), T, 'no chord there: no change');
  assert.strictEqual(ce.apply(T, { type: 'insert', line: 99, at: 0, name: 'C' }), T);
  assert.strictEqual(ce.sourceName('D', 2), 'C');
  assert.strictEqual(ce.sourceName('Am7', 0), 'Am7');
});

test('the sheet says where each chord and letter is (only when editable)', () => {
  const ir = parse('--START MUSIC--\nSo [Cmaj7]do [Am7]re [Fmaj7]mi fa so\n--END MUSIC--\n');
  assert.ok(!renderHtml(ir, { layout: 'lines' }).includes('data-at'), 'not otherwise: exports are as they were');
  const lines = renderHtml(ir, { layout: 'lines', editable: true });
  assert.match(lines, /<span class="chord" data-at="3">Cmaj7<\/span>/);
  assert.match(lines, /<div class="lyrics" data-pad="6:3,9:1">/);
  assert.match(renderHtml(ir, { layout: 'table', editable: true }), /<td class="chord" data-at="6">Am7<\/td>[\s\S]*<td class="lyric" data-from="6">/);
  assert.match(renderHtml(ir, { layout: 'raised', editable: true }), /<span class="ichord up" data-at="9">Fmaj7<\/span>/);
  // a line split for a narrow screen: its second half knows where its letters were
  const long = parse('--START MUSIC--\nI come from Alabama with my [C]banjo on my knee\n--END MUSIC--\n');
  const split = wrapLines(long, 24);
  const rest = split.filter((n) => n.type === 'lyric')[1];
  assert.ok(rest.srcShift > 0);
  assert.strictEqual(split.find((n) => n.type === 'chord').srcAt, 28);
  assert.match(renderHtml(long, { layout: 'lines', editable: true, maxLineChars: 24 }), /data-at="28"/);
});

test('an option, off at first; desktop and web', () => {
  assert.match(read('main.js'), /chord_edit: false/);
  assert.match(DESKTOP, /<input id="viewChordEdit" type="checkbox" data-config-path="general\.chord_edit" \/> Edit chords on the sheet/);
  assert.match(DESKTOP, /<script src="src\/sheet-chord-editor\.js"><\/script>/);
  assert.match(DESKTOP, /state\.chordEditOn = chordEditWanted\(\) && !stageLook && !numbers;/);
  assert.match(DESKTOP, /window\.ukemusic\.chordEdit\.apply\(before, op, \{ shift: state\.transpose - songCapo\(\) \}\)/);
  assert.match(DESKTOP, /UkeSheetChordEditor\.attach\(doc\.body, \{ onEdit: applyChordEdit,/);
  assert.match(read('src/preload.js'), /chordEdit: \{ apply: /);
  assert.match(WEB, /<input id="chordEditToggle" type="checkbox"> Edit chords on the sheet/);
  assert.match(WEB, /const chordEdit = sheet\.id === 'editSheet' && look\.chordEdit === true && !stage;/);
  assert.match(WEB, /U\.chordEdit\.apply\(before, op, \{ shift: p\.transpose - p\.capo \}\)/);
  assert.match(read('web/build.js'), /'sheet-chord-editor\.js'[\],]/);
  const { attach } = require('../src/sheet-chord-editor');
  assert.strictEqual(typeof attach, 'function');
});

console.log('v4.77 tests passed');
