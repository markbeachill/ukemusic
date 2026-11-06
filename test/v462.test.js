// 4.62: your instrument in the web player; the website says what it's for
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const app = read('web/app.html');

test('the web player: Your instrument under Your songs, asked on the first visit', () => {
  assert.match(app, /<label class="my-instrument"[^>]*>Your instrument <select id="myInstrument"><\/select><\/label>/);
  assert.match(app, /<div id="instrumentAsk" class="banner" hidden><strong>What do you play\?<\/strong>/);
  assert.match(app, /\$\('instrumentAsk'\)\.hidden = local\.get\('instrument', null\) !== null;/);
});

test('songs without one of their own, new songs and Free Practice use it', () => {
  assert.match(app, /instrument: UMW\.INSTRUMENTS\.some\(\(i\) => i\.id === s\.instrument\) \? s\.instrument : myInstrument\(\),/);
  assert.match(app, /settings = \{ song: \{ tempo: 100, beats_per_bar: 4, instrument: myInstrument\(\) \} \}/);
  assert.match(app, /\$\('libPractice'\)\.addEventListener\('click', \(\) => \{ stop\(\); state\.config\.song\.instrument = myInstrument\(\); \}, true\);/);
});

test('the website: Free Practice for each instrument, and the Chords by key sheet', () => {
  const pages = read('web/pages.js');
  assert.match(pages, /<li><strong>Your instrument<\/strong>ukulele \(high or low G\), baritone ukulele or guitar/);
  assert.match(pages, /<li><strong>Chords by key, to print<\/strong>/);
  assert.match(pages, /works the same for ukulele with a low G, baritone ukulele and guitar/);
  assert.match(read('README.md'), /prints a two-page \*\*Chords by key\*\* sheet/);
});
