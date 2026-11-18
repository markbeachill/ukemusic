// 4.92: the website and the feature list keep printing apart from the Music stand: the Music stand
// has its own feature section ("Read from a tablet"), the Perform page compares the Music stand, the
// Session screen and the Stage copy, and each points to the others.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const FEATURES = read('web/features.js');
const PAGES = read('web/pages.js');
const INDEX = read('site/index.html');
const WRITING = read('WRITING.md');

test('the feature list: the Music stand has its own section, apart from printing and from playing together', () => {
  assert.match(FEATURES, /title: 'Read from a tablet', link: 'perform\.html#music-stand'/);
  assert.match(FEATURES, /card: \{ h: 'Reading from a tablet'/); // 4.95: plain headings
  assert.match(FEATURES, /tablet: '<rect/);
  assert.ok(FEATURES.includes("f: 'Stage copies to print: big and easy to read at a gig'"));
  const together = FEATURES.slice(FEATURES.indexOf("title: 'Play together'"));
  assert.ok(!/f: 'Music stand/.test(together.slice(0, together.indexOf('] }'))), 'no Music stand row under Play together');
});

test('Perform: which one? compares the Music stand, the Session screen and the Stage copy', () => {
  assert.match(PAGES, /<h2>Which one to use: paper, your tablet or the room's screen<\/h2>/); // 4.95: no eyebrows
  for (const row of ['For', 'On', 'Text', 'Turning', 'A setlist', 'In']) assert.ok(PAGES.includes(`<th scope="row">${row}</th>`) || PAGES.includes(`<th>${row}</th>`), row);
  for (const id of ['music-stand', 'session-screen', 'stage-copies']) assert.ok(PAGES.includes(`{ id: '${id}'`), id);
  assert.ok(PAGES.includes('Three ways to read a song at a gig: a Stage copy on paper, the Music stand on your own tablet, and the Session screen on the TV for the whole room.'));
  assert.match(PAGES, /featureRow[\s\S]*f\.id \? ` id="\$\{f\.id\}"`/);
});

test('the home page and the writing guide point from each to the others', () => {
  assert.ok(INDEX.includes('<a href="perform.html">Music stand, Session screen or Stage copy: which one?</a>')); // 4.95
  assert.ok(WRITING.includes('### Which to use at a gig'));
  assert.ok(WRITING.includes('### Printed for a music stand: the Stage copy on two pages'));
});
