// 4.86: polish from the UI review (docs/ui-improvements.md C5, D3, D4, W1, W2, W4, E4, A2, A3, L9)
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

test('C5: questions are asked in the app\'s own dialog, the button named for what it does', () => {
  // Free Practice's restore-a-backup question is shared code with its own sync check: it keeps the browser's box
  const strip = (s) => s.replace(/askConfirm\(/g, '').replace(/if \(!confirm\('Replace practice progress[^\n]*/, '');
  assert.ok(!/\bconfirm\(/.test(strip(DESKTOP)), 'desktop');
  assert.ok(!/\bconfirm\(/.test(strip(WEB)), 'web');
  assert.match(DESKTOP, /await askConfirm\(`Remove the saved key "\$\{version\.name\}"\?[^`]*`, \{ ok: 'Remove', danger: true \}\)/);
  assert.match(DESKTOP, /\{ ok: 'Rewrite the song' \}/);
  assert.match(WEB, /\{ ok: back \? 'Delete my changes' : 'Delete this song', danger: true \}/);
  assert.match(WEB, /\{ ok: 'Add to Dropbox', cancel: 'Not now' \}/);
  assert.match(WEB, /\{ ok: 'Disconnect' \}/);
  // web dialogs: the heading first, Close at the foot
  assert.match(WEB, /<dialog id="featuresDialog" class="features-dialog">\n\s*<h2>Features<\/h2>/);
  assert.match(WEB, /<button id="featuresClose" class="btn primary" type="button">Close<\/button><\/div>\n<\/dialog>/);
  assert.match(WEB, /<dialog id="downloadDialog">\n\s*<h2>Download<\/h2>/);
});

test('D3, D4: Help → Keyboard Shortcuts; strum patterns beside the writing guide', () => {
  assert.match(read('main.js'), /\{ label: 'Keyboard Shortcuts', click: \(\) => sendMenuAction\('shortcuts'\) \}/);
  assert.match(DESKTOP, /case 'shortcuts':\n\s*document\.getElementById\('shortcutsDialog'\)\.showModal\(\);/);
  const list = DESKTOP.match(/<dialog id="shortcutsDialog"[\s\S]*?<\/dialog>/)[0];
  for (const key of ['<kbd>F5</kbd>', '<kbd>Shift</kbd>+<kbd>F5</kbd>', '<kbd>Space</kbd>', '<kbd>F1</kbd>', '<kbd>Ctrl</kbd>+<kbd>K</kbd>', '<kbd>Ctrl</kbd>+<kbd>L</kbd>']) assert.ok(list.includes(key), key);
  assert.match(DESKTOP, /<button id="strumsButton2" class="rib-button" type="button" data-icon="patterns"[^>]*>Strums<\/button>/);
});

test('W1, W2, W4: plain words in the status bar and the library', () => {
  assert.ok(!DESKTOP.includes('No parser warnings') || /instead of "No parser warnings\."/.test(DESKTOP));
  assert.ok(!/>No parser warnings\.</.test(DESKTOP) && !/\|\| 'No parser warnings\.'/.test(DESKTOP));
  assert.match(DESKTOP, /cursorLabel\.textContent = `Line \$\{cursor\.line\}`;/);
  assert.match(DESKTOP, /`Prints on \$\{n\} page\$\{n === 1 \? '' : 's'\}`/);
  assert.match(DESKTOP, /if \(!tab\.classList\.contains\('active'\) && stickyNotice\) setNotice\(''\);/, 'a message goes with its tab');
  assert.match(DESKTOP, /if \(days === 0\) return `Today \$\{time\}`;/);
});

test('A2, A3: a focus ring on everything; no ribbon label under 12px', () => {
  assert.match(DESKTOP, /\n {6}:focus-visible \{ outline: 2px solid var\(--accent, #0e6b64\); outline-offset: 2px; \}/);
  assert.match(DESKTOP, /\.rib-label \{[^}]*font-size: 12px;/);
});

test('L9, E4: the web player while playing on a phone; the section list; the edit preview', () => {
  assert.match(WEB, /@media \(max-width: 640px\) \{ \.player\.active #restartBtn, \.player\.active #accompanimentBtn, \.player\.active #karaokeButton, \.player\.active #learnBtn, \.player\.active #sessionBtn \{ display: none; \}/);
  assert.match(WEB, /\.section-jump select \{min-height:36px;/);
  assert.match(WEB, /\.edit-wrap \.sheet \{ position: sticky; top: 170px; height: calc\(100vh - 200px\);/);
});

console.log('v4.86 tests passed');
