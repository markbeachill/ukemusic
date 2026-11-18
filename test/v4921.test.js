// 4.92.1: the Music stand on a laptop (or an iPad on its side): when a long line would keep a song
// in one column, over more pages than columns need, the columns win and that line wraps. Upright,
// it stays one column of whole lines. The hint sits above the page dots.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const FIT = read('src/session-fit.js');
const SCREEN = read('src/session-screen.js');

test('fit: whole lines first; wrapped columns only on a wide screen, and only for no more pages', () => {
  assert.match(FIT, /if \(!wrapToColumns \|\| strict\.cols > 1 \|\| maxCols < 2 \|\| strict\.pages < 2\) return strict;/);
  assert.match(FIT, /const loose = layoutSong\(\{ \.\.\.args, noWrap: false, fewestCols: 2 \}\);\n    if \(loose\.cols > 1 && loose\.pages <= strict\.pages\) return loose;/);
  assert.match(FIT, /if \(fewestCols > 1 && column < widestAt\(px\) \* 0\.6\) return false;/, 'most lines stay whole');
  assert.match(FIT, /for \(let c = fewestCols; c <= maxCols; c \+= 1\) \{\n        const px = best\(c\);/);
});

test('the music stand asks for it only when the screen is wider than tall', () => {
  assert.ok(SCREEN.includes('noWrap: book(), wrapToColumns: book() && rect.width > rect.height * 1.05,'));
  assert.ok(SCREEN.includes('.ss-screen.ss-book .ss-hint { bottom: 22px; right: 18px; }'));
});
