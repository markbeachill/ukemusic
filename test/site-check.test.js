// tools/site-check.js: the finished website is checked before it is published (4.58)
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { checkSite, SITE_URL } = require('../tools/site-check');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}

const good = (url, title, desc, extra = '') => `<!doctype html><html lang="en"><head><title>${title}</title>
<meta name="description" content="${desc}"><link rel="canonical" href="${url}"></head>
<body><h1>Heading</h1><img src="img/a.png" alt="A picture">${extra}</body></html>`;

function site(pages, sitemapPaths) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'site-check-test-'));
  fs.mkdirSync(path.join(root, 'img')); fs.writeFileSync(path.join(root, 'img', 'a.png'), '');
  for (const [file, html] of Object.entries(pages)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), html);
  }
  const paths = sitemapPaths || Object.keys(pages).map((f) => f.replace(/(^|\/)index\.html$/, '$1'));
  fs.writeFileSync(path.join(root, 'sitemap.xml'), `<urlset>${paths.map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`).join('')}</urlset>`);
  return root;
}
const DESC = 'A description of this page that is long enough for the search engines to use.';

test('a good site passes', () => {
  const root = site({
    'index.html': good(SITE_URL, 'ukemusic: a free ukulele app for songs', DESC, '<a href="learn.html">Learn</a> <a href="practice/">Practice</a> <a href="https://example.com/x">elsewhere</a>'),
    'learn.html': good(`${SITE_URL}learn.html`, 'Learn a song by heart · ukemusic', DESC + ' Learn.', '<script>const s = "<h1>not a heading</h1><a href=\\"nowhere.html\\">";</script>'),
    'practice/index.html': good(`${SITE_URL}practice/`, 'Free ukulele practice · ukemusic', DESC + ' Practice.', '<a href="../index.html">Home</a>').replace('src="img/', 'src="../img/')
  });
  assert.deepStrictEqual(checkSite(root), []);
});

test('it finds what Bing\'s Site Scan finds, and broken links and sitemap gaps', () => {
  const root = site({
    'index.html': good(SITE_URL, 'ukemusic: free, open-source ukulele app for chord sheets, practice and learning songs', 'Too short', '<h1>Again</h1><img src="img/a.png"><a href="gone.html">x</a>'),
    'perform.html': good(`${SITE_URL}other.html`, 'Perform · ukemusic', 'Too short').replace(' lang="en"', ''),
    'teach.html': '<!doctype html><html lang="en"><head><title>Teach ukulele: handouts and learn sheets</title></head><body><p>No heading</p></body></html>'
  }, ['', 'perform.html', 'nothere.html']);
  const problems = checkSite(root).join('\n');
  for (const want of [
    /index\.html: title too long \(85 characters/, /index\.html: description too short/, /index\.html: 2 main headings/,
    /index\.html: a picture with no alt text/, /index\.html: a link to something that isn't there: gone\.html/,
    /perform\.html: title too short/, /perform\.html: the same description as index\.html/, /perform\.html: the canonical address is .*other\.html/,
    /perform\.html: no language/, /teach\.html: no description/, /teach\.html: no canonical address/, /teach\.html: 0 main headings/,
    /sitemap\.xml: lists .*nothere\.html, which isn't a page/, /sitemap\.xml: doesn't list .*teach\.html/
  ]) assert.match(problems, want);
});

test('GitHub checks the site before publishing it, and npm run site-check checks it here', () => {
  const flow = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'web.yml'), 'utf8');
  const check = flow.indexOf('node tools/site-check.js _site');
  assert.ok(check > flow.indexOf('cp -r web/out/. _site/app/') && check < flow.indexOf('upload-pages-artifact'), 'between putting the site together and uploading it');
  assert.match(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).scripts['site-check'], /^node web\/make\.js && node tools\/site-check\.js$/, '4.78.1: it builds first');
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'tools', 'site-check.js'), 'utf8'), /is' : 'are'\} made by the build, which hasn't been run here/, 'and says so when run without a build');
});
