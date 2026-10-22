// 4.15: the Stage look, tab options and export title live in style.css
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const up = require('../src/stylesheet-upgrade');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DEFAULT = fs.readFileSync(path.join(__dirname, '..', 'src', 'default-style.css'), 'utf8');

test('the default stylesheet has the Stage, Tab and title sections and their variables', () => {
  for (const text of ['--stage-font', '--stage-size', '--stage-color', '/* ── Stage', '[data-style="stage"]', '[data-tab-box] .tab', '[data-tab-faint]', '.song-title']) assert.ok(DEFAULT.includes(text), text);
  // the variables are in the first :root block, where Settings writes them
  const firstRoot = DEFAULT.match(/:root\s*\{[\s\S]*?\}/)[0];
  assert.ok(firstRoot.includes('--stage-size'));
});
test('an older style.css gets the new sections, keeping its own settings', () => {
  const old = ':root {\n  --text-color: #123456;\n  --monospace-size: 15px;\n}\n.lyrics { color: red; }\n';
  const r = up.upgradeStylesheet(old, DEFAULT, { font: 'Menlo', size: 22 });
  assert.strictEqual(r.changed, true);
  assert.ok(r.css.includes('--text-color: #123456') && r.css.includes('.lyrics { color: red; }'));
  assert.strictEqual(up.cssVariable(r.css, '--stage-size'), '22px');
  assert.ok(up.cssVariable(r.css, '--stage-font').startsWith('"Menlo"'));
  assert.ok(r.css.includes('[data-style="stage"]'));
  assert.ok(r.css.indexOf('--stage-size') < r.css.indexOf('.lyrics { color: red; }'));
});
test('upgrading twice, or the default itself, changes nothing', () => {
  const once = up.upgradeStylesheet(':root { --a: 1; }', DEFAULT).css;
  assert.strictEqual(up.upgradeStylesheet(once, DEFAULT).changed, false);
  assert.strictEqual(up.upgradeStylesheet(DEFAULT, DEFAULT).changed, false);
});
test('no :root block: one is added; bad font names are cleaned; sizes kept in range', () => {
  const r = up.upgradeStylesheet('.x{}', DEFAULT, { font: 'Bad";}', size: 99 });
  assert.ok(/^:root \{/.test(r.css));
  assert.strictEqual(up.cssVariable(r.css, '--stage-size'), '32px');
  assert.ok(up.cssVariable(r.css, '--stage-font').startsWith('"Bad"'));
});

// Songs for the web
const web = require('../src/web-songs');
test('songs for the web: one file, ids as the web uses them, settings and notes kept', () => {
  const b = web.buildWebSongs([
    { title: 'Oh! Susanna', content: '[C]I come', settings: { song: { key: 'C', settings_format: 2 } }, notes: 'n' },
    { title: 'Amazing Grace', content: '[G]A', settings: {}, notes: '' },
    { title: 'Oh Susanna', content: 'x', settings: {} }
  ], { appVersion: '4.15.0', exported: '2026-10-18' });
  assert.strictEqual(b.format, 'ukemusic-web-songs');
  assert.deepStrictEqual(b.songs.map((s) => s.id), ['amazing-grace', 'oh-susanna-2', 'oh-susanna']);
  const s = b.songs.find((x) => x.title === 'Oh! Susanna');
  assert.strictEqual(s.settings.song.settings_format, undefined);
  assert.strictEqual(s.notes, 'n');
});
test('the web checks the file it is given', () => {
  const file = JSON.stringify(web.buildWebSongs([{ title: 'A', content: 'x' }]));
  const r = web.readWebSongs(file);
  assert.ok(r.ok && r.songs.length === 1 && r.songs[0].id === 'a');
  assert.strictEqual(web.readWebSongs('{"songs":[]}').ok, false);
  assert.strictEqual(web.readWebSongs('not json').ok, false);
});
