// 4.95: the website looks like a manual: four text sizes, the system font, no decoration (checked by
// site-check), plain headings; and a user guide (docs/user-guide.md → user-guide.html) with the
// website's pictures and the UI review's (copied by tools/guide-pictures.js).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const check = require('../tools/site-check');
const { markdownToHtml } = require('../src/guide');

test('site-check keeps the website\'s style', () => {
  assert.deepStrictEqual([...check.FONT_SIZES].sort(), ['14px', '16px', '20px', '28px', 'inherit']);
  assert.deepStrictEqual(check.styleProblems('<style>h1 { font-size: 28px } p { font: 16px/1.6 var(--sans) }</style>'), []);
  const bad = check.styleProblems('<style>.a { font-size: 15px; box-shadow: 0 1px 2px #000; text-transform: uppercase } .b { font-size: clamp(30px, 5vw, 50px) }</style><p class="eyebrow">x</p><a class="f-card tone-teal"></a><link href="https://fonts.googleapis.com/css2?family=X">');
  for (const bit of ['15px', 'clamp', 'shadow', 'uppercase', 'eyebrow', 'feature card', 'web font']) assert.ok(bad.some((p) => p.includes(bit)), bit);
  assert.ok(read('AGENTS.md').includes("## The website's style"));
});

test('the pages: the system font, no web fonts, plain headings', () => {
  const home = read('site/index.html');
  assert.ok(home.includes('--sans: system-ui,'));
  assert.ok(!/fonts\.googleapis/.test(home + read('web/pages.js') + read('web/docs.js')));
  assert.ok(!home.includes('class="eyebrow"') && !home.includes('id="doors"'));
  assert.match(home, /<h1>ukemusic: chord sheets, play-along and practice for the ukulele<\/h1>/);
  assert.match(read('web/pages.js'), /h1: 'Playing at a gig or a club night',/);
  assert.match(read('web/pages.js'), /<figure><img class="shot" src="img\/\$\{f\.img\}"[^`]*<figcaption>\$\{esc\(f\.cap \|\| f\.alt \|\| ''\)\}<\/figcaption><\/figure>/);
});

test('the guide converter: pictures with captions, and numbered steps', () => {
  const md = 'Text\n\n![A picture](../site/img/x.webp)\n\n1. one\n2. two\n';
  const web = markdownToHtml(md, { image: (u) => u.replace('../site/', ''), ordered: true });
  assert.ok(web.html.includes('<figure><img src="img/x.webp" alt="A picture" loading="lazy"><figcaption>A picture</figcaption></figure>'));
  assert.ok(web.html.includes('<ol><li>one</li><li>two</li></ol>'));
  assert.ok(!markdownToHtml(md).html.includes('<img'), 'the app\'s own guide leaves pictures out');
});

test('the user guide: a page of the website, in the menu, its pictures there', () => {
  const docs = require('../web/docs');
  const page = docs.PAGES.find((p) => p.html === 'user-guide.html');
  assert.ok(page && page.md === 'docs/user-guide.md' && page.fold === false);
  assert.ok(require('../web/pages').NAV.some((n) => n.href === 'user-guide.html'));
  assert.ok(read('.gitignore').includes('site/user-guide.html'));
  const guide = read('docs/user-guide.md');
  for (const h of ['## Getting started', '## Adding a song', '## A song: reading and editing', '## Saving, and taking changes back', '## Playing along', '## Learning a song by heart', '## Free Practice', '## Setlists', '## Reading at a gig: Music stand and Session screen', '## Printing and exporting', '## Settings and the simple view', '## On a phone or tablet']) assert.ok(guide.includes(h), h);
  const pics = [...guide.matchAll(/!\[[^\]]*\]\(\.\.\/(site\/img\/[^)]+)\)/g)].map((m) => m[1]);
  assert.ok(pics.length >= 25, `${pics.length} pictures`);
  for (const p of pics) assert.ok(fs.existsSync(path.join(ROOT, p)), p);
});

test('guide-pictures copies the UI review pictures the guide names', () => {
  const gp = require('../tools/guide-pictures');
  assert.deepStrictEqual(gp.wanted('![x](../site/img/guide/desktop-L4.jpg) ![y](../site/img/guide/iphone-F1.jpg) ![x](../site/img/guide/desktop-L4.jpg)'), [{ file: 'desktop-L4.jpg', app: 'desktop', id: 'L4' }, { file: 'iphone-F1.jpg', app: 'iphone', id: 'F1' }]);
  assert.match(read('package.json'), /"guide-pictures": "node tools\/guide-pictures\.js"/);
  assert.ok(read('tools/ui-review/desktop.js').includes("await shot('L4', 'New song: paste, write or import (4.94)');"));
});
