// 4.85: where settings live (docs/ui-improvements.md L5, L6, L7, L8)
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
const panel = (key) => DESKTOP.match(new RegExp(`<div class="ribbon-panel" data-ribbon-panel="${key}"[\\s\\S]*?(?=\\n {10}<div class="ribbon-panel"|\\n {10}<div id="ribbonHint")`))[0];

test('L5: Details has the title, tempo and time too (and the Song tab still does)', () => {
  assert.match(DESKTOP, /<span id="detailsTitle" class="details-value"><\/span>\n\s*<button id="detailsRename" type="button"[^>]*>Rename…<\/button>/);
  assert.match(DESKTOP, /<input id="detailsTempo" class="short" type="number" min="40" max="240" step="1" data-config-path="song\.tempo" data-scope="song"/);
  assert.match(DESKTOP, /<select id="detailsBeats" class="short" data-config-path="song\.beats_per_bar" data-scope="song"/);
  assert.match(panel('thissong'), /<input id="tempoInput"[^>]*data-config-path="song\.tempo" data-scope="song"/);
  assert.match(panel('thissong'), /<span class="rib-label">Key to play in<\/span>/, 'not to be confused with Details → Written in');
  assert.ok(!DESKTOP.includes('Change on This song'));
});

test('L6: a group of settings says what it applies to, and holds one scope', () => {
  const view = panel('view');
  for (const [name, scope] of [['Style', 'all'], ['Chord diagrams', 'song'], ['Text', 'song'], ['The tune', 'song'], ['Strum patterns', 'song'], ['Layout', 'song']]) assert.ok(view.includes(`<span class="rib-label" data-scope-label="${scope}">${name}</span>`), name);
  // Left-handed, Hide common and Easy to read are for every song: a group of their own
  const every = view.split(/(?=<div class="rib-group")/).find((g) => g.includes('<span class="rib-label">For every song</span>'));
  for (const id of ['viewLeftHanded', 'viewSkipCommon', 'viewEasyRead']) assert.ok(every.includes(`id="${id}"`), id);
  const exp = panel('export');
  for (const [name, scope] of [['PDFs', 'all'], ['Keys', 'all'], ['Section names', 'song'], ['Stage copy', 'song'], ['Two-page Stage', 'all']]) assert.ok(exp.includes(`<span class="rib-label" data-scope-label="${scope}">${name}</span>`), name);
  assert.match(DESKTOP, /\.rib-label\[data-scope-label="song"\]::after \{ content: " · this song";/);
  assert.match(DESKTOP, /\.rib-label\[data-scope-label="all"\]::after \{ content: " · all songs";/);
});

test('L7: the Export dialog\'s buttons stay in view', () => {
  assert.match(DESKTOP, /#exportDialog \.dialog-actions \{ position: sticky; bottom: -20px;/);
});

test('L8: the web player has one name for the strum or picking it plays', () => {
  assert.match(WEB, /<label for="strumSel">Strum or pick<\/label>/);
  assert.match(WEB, /<button id="accompanimentBtn"[^>]*>Strum or pick<\/button>/);
  assert.match(WEB, /<dialog id="pickDialog">\n\s*<h2>Strum or pick<\/h2>/);
  assert.match(WEB, /<label for="pickStrumming">Strum or pick<\/label>/);
  assert.ok(!/>Accompaniment</.test(WEB) && !/>Strumming</.test(WEB));
});

console.log('v4.85 tests passed');
