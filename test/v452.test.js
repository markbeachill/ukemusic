// 4.52: Compact is the Stage format's default; the Learn dialogs keep their look; the website's gallery
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const sf = require('../src/stage-formats');
const picking = require('../src/picking');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

test('Compact is the default Stage format, in the app, Settings and the web player', () => {
  assert.strictEqual(sf.formatOf(undefined).id, 'compact');
  assert.match(read('main.js'), /stage_format: 'compact'/);
  assert.match(read('main.js'), /stage_compact: true/);
  assert.match(read('index.html'), /stage_format: 'compact'/);
  assert.match(read('web/app.html'), /stage_format \|\| 'compact'\)/);
  // Compact first in the choosers
  assert.match(read('index.html'), /<select id="export-stage_format"[^>]*>\s*<option value="compact">/);
  assert.match(read('web/app.html'), /<select id="stageFormat"><option value="compact">/);
});

test('settings from before 4.52 move to Compact once; a format chosen since is kept', () => {
  const src = read('main.js');
  const body = src.slice(src.indexOf('// 4.52: Compact became'), src.indexOf('return { raw, config: mergeConfig(cloneDefaultConfig(), parsed) };'));
  // eslint-disable-next-line no-new-func
  const move = new Function('parsed', `${body.replace(/^\s*\/\/.*$/gm, '')}; return parsed;`);
  assert.deepStrictEqual(move({ export: { stage_format: 'clear' } }).export, { stage_format: 'compact', stage_compact: true });
  assert.deepStrictEqual(move({ export: { stage_format: 'heavy' } }).export, { stage_format: 'heavy', stage_compact: true });
  assert.deepStrictEqual(move({ export: { stage_format: 'clear', stage_compact: true } }).export, { stage_format: 'clear', stage_compact: true });
});

test('the Learn, quiz and About dialogs keep their CSS (outside the shared practice block)', () => {
  const html = read('index.html');
  const practiceStart = html.indexOf('      /* ── Practice window');
  for (const rule of ['.learn-changes-dialog {', '.learn-change .lc-shapes .chord-diagram svg', '.lq-options {', '.about-body {', '.learn-circle {', '.pick-help-dialog {', '.css-sets {']) {
    const at = html.indexOf(rule);
    assert.ok(at > 0, rule);
    assert.ok(at < practiceStart, `${rule} is outside the practice block`);
  }
});

test('the pick pattern "Up, twice a bar" doesn\'t call a 3/4 bar 4/4', () => {
  const up8 = picking.PATTERNS.find((p) => p.id === 'up8');
  assert.match(up8.tip, /in 3\/4 and 6\/8/);
});

test('the website: the gallery files are there, and the heading has no chord over it', () => {
  const list = JSON.parse(read('site/gallery/gallery.json'));
  assert.ok(list.length >= 4);
  for (const g of list) for (const f of Object.keys(g.pages)) {
    assert.ok(fs.existsSync(path.join(ROOT, 'site', 'gallery', g.slug, f)), `${g.slug}/${f}`);
    assert.ok(fs.existsSync(path.join(ROOT, 'site', 'gallery', g.slug, f.replace(/\.pdf$/, '.webp'))), `${g.slug}/${f} picture`);
  }
  const pages = require('../web/pages');
  const body = pages.GALLERY_PAGE.body();
  assert.ok(body.includes('href="gallery/wild-rover/stage.pdf"'));
  assert.ok(body.includes('gallery/songbook/club-night.pdf'));
  assert.ok(!read('site/index.html').includes('data-c="C"'));
  assert.ok(read('site/index.html').includes('href="gallery.html"'));
});

test('the UI review tool and the guide for AI assistants are there', () => {
  for (const f of ['run.js', 'desktop.js', 'web.js', 'practice.js', 'build.js', 'page.html', 'catalog.json', 'README.md']) assert.ok(fs.existsSync(path.join(ROOT, 'tools', 'ui-review', f)), f);
  const catalog = JSON.parse(read('tools/ui-review/catalog.json'));
  const letters = catalog.sections.map((s) => s.key);
  for (const id of Object.keys(catalog.items)) assert.ok(letters.includes(id.replace(/\d+$/, '')), `${id} is in a section`);
  assert.match(read('package.json'), /"ui-review": "node tools\/ui-review\/run.js"/);
  assert.match(read('main.js'), /UKEMUSIC_USER_DATA\) app\.setPath\('userData'/);
  assert.ok(read('AGENTS.md').includes('tools/sync-practice.js --from-web'));
  assert.match(read('.gitignore'), /^UI review\/$/m);
});
