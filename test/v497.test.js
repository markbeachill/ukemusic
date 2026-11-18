// 4.97: a user guide for phones and tablets (docs/user-guide-phone.md → user-guide-phone.html), with
// iPhone pictures from the UI review; the main guide links to it at the top.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');

test('the phone guide: a page of the website, linked from the top of the main guide', () => {
  const page = require('../web/docs').PAGES.find((p) => p.html === 'user-guide-phone.html');
  assert.ok(page && page.md === 'docs/user-guide-phone.md' && page.fold === false);
  assert.ok(read('.gitignore').includes('site/user-guide-phone.html'));
  const main = read('docs/user-guide.md');
  assert.ok(main.split('\n').slice(0, 5).join('\n').includes('[the guide for phones and tablets](user-guide-phone.md)'), 'at the top');
  const phone = read('docs/user-guide-phone.md');
  for (const h of ['## Putting it on your Home Screen', '## Your songs', '## Adding a song', '## A song', '## Playing along', '## Learning a song by heart', '## Changing a song', '## Free Practice', '## Setlists', '## The Music stand, on a tablet', '## Downloading and printing', '## Keeping your songs safe']) assert.ok(phone.includes(h), h);
  assert.ok(phone.includes('[main user guide](user-guide.md)'));
});

test('its pictures are there, from the iPhone', () => {
  const phone = read('docs/user-guide-phone.md');
  const pics = [...phone.matchAll(/!\[[^\]]*\]\(\.\.\/(site\/img\/[^)]+)\)/g)].map((m) => m[1]);
  assert.ok(pics.filter((p) => p.includes('/guide/iphone-')).length >= 15);
  for (const p of pics) assert.ok(fs.existsSync(path.join(ROOT, p)), p);
  assert.ok(read('tools/guide-pictures.js').includes("const GUIDES = ['user-guide.md', 'user-guide-phone.md']"));
});
