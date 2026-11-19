// 4.97.1: one name for the guide to what you can type, How to write songs (was "the song guide",
// "Writing" on the Write tab); both user guides have "Writing a song: the basics" and link to it and
// to ukemusic and ChordPro, from a line at the top.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');

test('one name: How to write songs', () => {
  assert.ok(read('WRITING.md').startsWith('# How to write songs in ukemusic\n'));
  assert.ok(read('index.html').includes('(F1)">How to write</button>'));
  for (const f of ['site/index.html', 'web/pages.js', 'web/docs.js', 'docs/user-guide.md', 'docs/user-guide-phone.md', 'README.md']) assert.ok(!/song guide/i.test(read(f)), f);
});

test('the user guides: the basics, and links to How to write songs and ChordPro at the top', () => {
  for (const f of ['docs/user-guide.md', 'docs/user-guide-phone.md']) {
    const s = read(f);
    const top = s.split('\n## ')[0];
    assert.ok(top.includes('[How to write songs](../WRITING.md)') && top.includes('[ukemusic and ChordPro](../CHORDPRO.md)'), f);
    assert.ok(s.includes('## Writing a song: the basics') && s.includes('[[Verse 1]]') && s.includes('{D-DU-UDU}'), f);
  }
});
