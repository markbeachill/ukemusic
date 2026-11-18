// 4.91: the Music stand, easier the first time and with setlists: a guide when it first opens
// (and from ? in its menu), a ☰ Menu button always in the corner, Close named, the songs to jump
// to, "next:" at the end of a song; setlists in the simple view, and + Setlist on a song in the
// web player. The website and the guide describe it, with pictures.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const SCREEN = read('src/session-screen.js');
const WEB = read('web/app.html');

test('the first time: a guide to the taps, closed by Start reading (or a tap outside it, or Enter)', () => {
  assert.match(SCREEN, /<div class="ss-guide" role="dialog" aria-modal="true" aria-label="How the Music stand works">/);
  for (const words of ['<b>Tap the top, or ☰ Menu</b>', '<b>← Tap the left half</b>', '<b>Tap the right half →</b>', 'Esc closes it', '<button type="button" class="ss-guide-ok">Start reading</button>']) assert.ok(SCREEN.includes(words), words);
  assert.match(SCREEN, /if \(e\.target\.closest && e\.target\.closest\('\.ss-guide'\)\) \{ if \(e\.target\.closest\('\.ss-guide-ok'\) \|\| !e\.target\.closest\('\.ss-guide-card'\)\) guide\(false\); return; \}/, 'a tap on it never turns a page');
  assert.match(SCREEN, /if \(rootEl\.classList\.contains\('ss-guiding'\)\) \{ if \(\['Enter', ' ', 'Escape', 'ArrowRight'\]\.includes\(k\)\) guide\(false\); return true; \}/);
  assert.match(SCREEN, /if \(book\(\) && data\.showTaps\) guide\(true\);/);
  assert.match(SCREEN, /<button class="ss-bookbtn ss-helpbtn" type="button" title="How the Music stand works"/, 'and from ? in the menu');
});

test('the way out is never hidden: ☰ Menu in the corner; Close named; the songs to jump to; what comes next', () => {
  assert.match(SCREEN, /<button class="ss-menubtn" type="button" aria-label="Menu: close, songs, text size">☰ Menu<\/button>/);
  assert.match(SCREEN, /\.ss-screen\.ss-book \.ss-menubtn \{ display: block; \}/);
  assert.match(SCREEN, /×<span class="ss-xlabel"> Close<\/span><\/button>/);
  assert.match(SCREEN, /<select class="ss-songs" aria-label="Go to a song" title="Go to a song" hidden><\/select>/);
  assert.match(SCREEN, /const nextUp = s\.songs\[s\.i \+ 1\] && s\.page >= s\.pages - 1 \? `next: \$\{s\.songs\[s\.i \+ 1\]\.title\} →` : '';/);
});

test('setlists: in the simple view, and + Setlist on a song in the web player', () => {
  const { FEATURES } = require('../src/feature-levels');
  assert.strictEqual(FEATURES.find((f) => f.id === 'setlists').level, 'simple');
  assert.match(WEB, /<button id="addToSetlistBtn" data-feature="setlists" class="btn" type="button"/);
  assert.match(WEB, /<dialog id="addToSetlistDialog" class="setlist-dialog" aria-labelledby="addToSetlistTitle">/);
  assert.match(WEB, /if \(k >= 0\) lines\.splice\(k, 1\); else lines\.push\(\{ title: song\.title, shift: 0 \}\);/, 'in and out again');
  assert.match(WEB, /editSetlist\(null\); slEdit\.lines = \[\{ title: view\.song\.title, shift: 0 \}\];/, 'a new setlist with this song');
});

test('the website, the README and the guide describe the Music stand, with pictures', () => {
  const HOME = read('site/index.html');
  assert.match(HOME, /<h3>The Music stand, for reading on a tablet<\/h3>/);
  assert.match(HOME, /<img src="img\/music-stand\.webp" loading="lazy" width="1360" height="1020"/);
  const PAGES = read('web/pages.js');
  assert.match(PAGES, /\{ h3: 'How to use the Music stand', p: \[[^\]]*\], img: 'music-stand-guide\.webp', h: 1020,/);
  assert.match(read('WRITING.md'), /### On a tablet on a music stand: the Music stand/);
  assert.match(read('README.md'), /Music stand: read song after song on an iPad or laptop, a tap to turn the page/);
  for (const f of ['music-stand.webp', 'music-stand-guide.webp']) assert.ok(fs.existsSync(path.join(ROOT, 'site', 'img', f)), f);
  assert.match(read('tools/site-pictures.js'), /if \(want\('music-stand-guide'\)\) \{ await p\.screenshot\(\{ path: path\.join\(RAW, 'music-stand-guide\.png'\) \}\);/);
});

console.log('v4.91 tests passed');
