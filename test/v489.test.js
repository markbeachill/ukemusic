// 4.89: the music stand view: one player reading songs from an iPad (or a laptop) on a stand.
// The Session screen's machinery (src/session-screen.js, src/session-fit.js) with size 'book':
// one steady text size, columns only when no line wraps, pages rather than smaller text, the
// right half of the screen goes on and the left half back, the top shows the bar.
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
const FIT = read('src/session-fit.js');
const WEB = read('web/app.html');
const DESKTOP = read('index.html');

test('one steady size, about an A4 chord sheet shrunk to an iPad page; + and − change it', () => {
  const { BOOK, bookUsual } = require('../src/session-screen');
  assert.deepStrictEqual(BOOK, { min: 14, max: 48, usual: 22 });
  assert.strictEqual(bookUsual(820, 1180), 23, 'iPad Air, upright');
  assert.strictEqual(bookUsual(1180, 820), 23, 'on its side: the same');
  assert.strictEqual(bookUsual(744, 1133), 21, 'iPad mini');
  assert.strictEqual(bookUsual(390, 844), 18, 'a phone: no smaller than 18');
  assert.strictEqual(bookUsual(1920, 1080), 26, 'a big screen: no bigger than 26');
  assert.ok(SCREEN.includes("const [minPx, maxPx] = book() ? [s.bookPx, s.bookPx] : s.size === 'same'"));
  assert.match(SCREEN, /else if \(\(k === '\+' \|\| k === '='\) && book\(\)\) \{ s\.bookPx = Math\.min\(BOOK\.max, \(s\.bookPx \|\| BOOK\.usual\) \+ 1\); layout\(\); \}/);
  assert.match(SCREEN, /else if \(\(k === 's' \|\| k === 'S'\) && book\(\)\) return true;/, 'S doesn\'t leave it');
});

test('columns only when no line wraps in them; pages, never smaller text', () => {
  assert.match(SCREEN, /maxCols: book\(\) \? \(rect\.width > rect\.height \* 1\.05 \? 3 : 2\) : 3, noWrap: book\(\)/);
  assert.match(SCREEN, /const bookModes = s\.mode === 'auto' \? \['over'\] : \[s\.mode\];/, 'chords above the words, unless M');
  assert.match(FIT, /return !noWrap \|\| c === 1 \|\| widestAt\(px\) <= column;/);
  assert.match(FIT, /for \(let c = fewestCols; c <= maxCols; c \+= 1\) \{/); // 4.92.1: fewestCols, 1 but for wrapped columns
});

test('taps: the right half on, the left half back, the top the bar (which hides at the next turn)', () => {
  assert.match(SCREEN, /if \(e\.clientY - r\.top < Math\.max\(60, r\.height \* 0\.14\)\) \{ setBar\(!rootEl\.classList\.contains\('ss-bar-on'\)\); return; \}\n\s*go\(e\.clientX - r\.left > r\.width \/ 2 \? 1 : -1\);/);
  assert.match(SCREEN, /function go\(dir\) \{\n\s*setBar\(false\);/);
  assert.match(SCREEN, /<button class="ss-bookbtn ss-smaller" type="button" title="Smaller text \(−\)" aria-label="Smaller text">A−<\/button><button class="ss-bookbtn ss-bigger"/);
  assert.match(SCREEN, /<b>← Tap the left half<\/b>/, 'shown the first time (4.91: a guide, not a few seconds of zones)');
  assert.match(SCREEN, /\.ss-screen\.ss-book \.ss-foot \{ display: block; \}/, 'the title and page along the bottom');
  // the Session screen on a TV is as it was: a third back, two thirds on
  assert.match(SCREEN, /go\(e\.clientX - r\.left > r\.width \/ 3 \? 1 : -1\);/);
});

test('web player: Music stand in the simple view, through the songs as listed; its size kept', () => {
  assert.match(WEB, /<button id="standBtn" data-feature="musicStand" class="btn" type="button" title="Music stand:/);
  assert.match(WEB, /\$\('standBtn'\)\.addEventListener\('click', \(\) => openSession\(\{ stand: true \}\)\);/);
  assert.match(WEB, /if \(stand\) \{ if \(st\.bookPx && look\.standPx !== st\.bookPx\) \{ look\.standPx = st\.bookPx; local\.set\('look', look\); \} return; \}/, 'and not the Session screen\'s size');
  assert.match(WEB, /size: stand \? 'book' : \(look\.sessionSize \|\| 'fit'\)[^\n]*bookPx: look\.standPx \|\| 0, showTaps: stand && !look\.standSeen \}\);/);
  const { FEATURES } = require('../src/feature-levels');
  const row = FEATURES.find((f) => f.id === 'musicStand');
  assert.ok(row && row.app === 'both' && row.level === 'simple');
});

test('desktop: Music stand on the Play tab and in a setlist, on this screen (not the TV), its size kept', () => {
  assert.match(DESKTOP, /<button id="standButton" data-feature="musicStand" class="rib-button" type="button" data-icon="screen"/);
  assert.match(DESKTOP, /<button id="setlistStand" class="appbar-button" type="button" data-icon="screen"/);
  assert.match(DESKTOP, /document\.getElementById\('setlistStand'\)\.addEventListener\('click', \(\) => sessionSetlist\(\{ stand: true \}\)\);/);
  assert.match(DESKTOP, /const standOptions = stand \? \{ size: 'book', bookPx: Number\(state\.config\?\.export\?\.stand_px\) \|\| 0, showTaps: !state\.config\?\.export\?\.stand_seen \} : \{\};/);
  assert.match(DESKTOP, /if \(s\.size === 'book'\) \{\n[^\n]*\n\s*if \(s\.bookPx && Number\(ex\.stand_px\) !== s\.bookPx\) \{ ex\.stand_px = s\.bookPx;/);
  const MAIN = read('main.js');
  assert.match(MAIN, /const stand = payload\.size === 'book';\n\s*const other = stand \? null : screen\.getAllDisplays\(\)/);
  assert.match(MAIN, /stand_px: 0,/);
  const SESSION = read('session.html');
  assert.match(SESSION, /closeButton: stand\n/);
  assert.match(SESSION, /document\.title = data\.size === 'book' \? 'ukemusic: Music stand' : 'ukemusic: Session screen';/);
});

console.log('v4.89 tests passed');
