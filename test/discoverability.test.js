// The website for search engines and AI assistants: the Free Practice page (practice/) matches the
// practice catalogue, every page has a canonical address, structured data parses, the sitemap lists
// the pages, and the web player says what it is without JavaScript.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pages = require('../web/pages');
const catalog = require('../src/practice-catalog');

const SITE_CSS = '/* test */';
const practiceBody = pages.PRACTICE_PAGE.body();
const jsonOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('the practice page lists every exercise, with its count and levels from the catalogue', () => {
  const n = catalog.EXERCISES.length;
  for (const e of catalog.EXERCISES) assert.ok(practiceBody.includes(e.title.replace(/&/g, '&amp;')), e.title);
  assert.ok(practiceBody.includes(`<h2>All ${n} exercises</h2>`));
  assert.match(pages.PRACTICE_PAGE.blurb, new RegExp(`${n} ukulele exercises`));
  // the page's title says the same number
  assert.match(pages.PRACTICE_PAGE.title, new RegExp(`\\b${n} exercises`));
  assert.ok(practiceBody.includes('href="app/#practice"'));
  assert.ok(/It doesn't listen to you play/.test(practiceBody), 'says feedback is self-assessed');
});

test('one H1, a canonical address, and links one level up', () => {
  const built = pages.wrapPage(pages.PRACTICE_PAGE, practiceBody, SITE_CSS);
  assert.strictEqual((built.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(built, /<link rel="canonical" href="https:\/\/markbeachill\.github\.io\/ukemusic\/practice\/">/);
  assert.ok(!/(?:href|src)="(?!\.\.\/|https?:|#|mailto:)/.test(built.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')), 'every relative link goes up a level');
  assert.ok(built.includes('src="../img/practice.webp"'));
});

test('structured data parses and agrees with the page', () => {
  const ld = pages.PRACTICE_PAGE.jsonld;
  const app = ld['@graph'].find((x) => x['@type'] === 'WebApplication');
  assert.strictEqual(app.isAccessibleForFree, true);
  assert.strictEqual(app.offers.price, '0');
  assert.match(app.license, /\/LICENSE$/);
  assert.ok(app.featureList[0].startsWith(`${catalog.EXERCISES.length} practice exercises`));
  const code = ld['@graph'].find((x) => x['@type'] === 'SoftwareSourceCode');
  assert.strictEqual(code.codeRepository, 'https://github.com/markbeachill/ukemusic');
  // the home page's
  const home = jsonOf(read('site/index.html'));
  assert.strictEqual(home.length, 1);
  const types = home[0]['@graph'].map((x) => x['@type']);
  for (const t of ['WebSite', 'SoftwareApplication', 'WebApplication', 'SoftwareSourceCode']) assert.ok(types.includes(t), t);
  assert.match(read('site/index.html'), /Free Practice with 40 exercises/);
  assert.match(read('LICENSE'), /^MIT License/);
});

test('every page has a canonical address and a description; the sitemap lists them', () => {
  const home = read('site/index.html');
  assert.match(home, /<link rel="canonical" href="https:\/\/markbeachill\.github\.io\/ukemusic\/">/);
  assert.match(home, /<meta property="og:image" content="https:\/\//);
  const xml = pages.sitemap();
  for (const p of ['', 'practice/', 'app/', 'practise.html', 'learn.html', 'guide.html']) assert.ok(xml.includes(`<loc>${pages.SITE_URL}${p}</loc>`), p || 'home');
  assert.ok(!/practice\/index\.html/.test(xml));
});

test('the web player has a title, description, canonical address and words without JavaScript', () => {
  const build = read('web/build.js');
  assert.match(build, /<link rel="canonical" href="https:\/\/markbeachill\.github\.io\/ukemusic\/app\/">/);
  assert.match(build, /<noscript>/);
  assert.match(build, /if \(!page\.includes\(noscript\)\) throw/);
  assert.match(read('web/app.html'), /\^#practice\$\/i\.test\(location\.hash\)/);
});

test('the README and home page say what it is and link to Free Practice', () => {
  const readme = read('README.md');
  assert.match(readme, /## What is ukemusic\?/);
  assert.ok(readme.includes('https://markbeachill.github.io/ukemusic/practice/'));
  assert.ok(read('site/index.html').includes('href="practice/"'));
  assert.ok(!read('site/index.html').includes('Writing and editing songs needs the desktop app'));
});
