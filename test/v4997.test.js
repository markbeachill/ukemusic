// 4.99.7: the changes page: each version in a line (a headline), minor ones greyed, details a click away
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const docs = require('../web/docs');
const { notesFor } = require('../tools/release-notes');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const CHANGELOG = read('CHANGELOG.md');

test('every version in CHANGELOG.md has a headline', () => {
  const heads = CHANGELOG.match(/^## .*$/gm);
  assert.ok(heads.length > 150);
  for (const h of heads) assert.match(h, /^## v\d+\.\d+\.\d+ · \S.{3,}$/, h);
  assert.match(CHANGELOG, /^## v4\.99\.2 · Minor updates: fixes and small changes$/m);
});

test('the page: the version, its headline; minor ones greyed; the anchor is the version', () => {
  const html = docs.headlines('<h2 id="guide-v4-99-6-x">v4.99.6 · Practise a song</h2><h2 id="guide-y">v4.99.2 · Minor updates: fixes</h2>');
  assert.strictEqual(html, '<h2 id="guide-v4-99-6"><span class="ver">v4.99.6</span> <span class="headline">Practise a song</span></h2><h2 id="guide-v4-99-2"><span class="ver">v4.99.2</span> <span class="headline minor">Minor updates: fixes</span></h2>');
  const page = docs.PAGES.find((p) => p.html === 'changes.html');
  assert.ok(page.headlines && page.toc === false);
  assert.match(read('web/docs.js'), /\.doc \.headline\.minor \{ color: var\(--muted\); \}/);
});

test('release notes lead with the headline (not a minor one)', () => {
  assert.match(notesFor(CHANGELOG, 'v4.99.6'), /^\*\*Practise a song: a Free Practice plan made from the song\*\*\n\n- /);
  assert.ok(!/Minor updates/.test(notesFor(CHANGELOG, 'v4.99.2')));
  assert.match(read('AGENTS.md'), /`## v4\.99\.2 · Minor updates: fixes and small changes`/);
});
