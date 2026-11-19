// 4.99.8: the website, README and user guide catch up with 4.99: features listed, pictures of each
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('../web/features');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');

test('the features list has 4.99\'s', () => {
  const rows = F.SECTIONS.flatMap((s) => s.rows.map((r) => r.f)).join('\n');
  for (const t of ['build your own and keep it in My strums', 'Practise this song', 'Learn a strum in steps', 'Your ukulele shapes on a baritone']) assert.ok(rows.includes(t), t);
  assert.ok(read('README.md').includes('Practise this song'), 'the README is made from it');
});

test('the user guide has a picture of each, and they exist', () => {
  const guide = read('docs/user-guide.md');
  for (const name of ['strum-builder', 'shapes-sounds', 'song-practice', 'learn-strum']) {
    assert.ok(guide.includes(`../site/img/${name}.webp`), name);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'site', 'img', `${name}.webp`)), `${name}.webp`);
    assert.ok(read('tools/site-pictures.js').includes(`scene('${name}'`), `site-pictures takes ${name}`);
  }
});
