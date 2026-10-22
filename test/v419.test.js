// 4.19: the Stage style, export folders (Song, Stage), more style sets, links
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sets = require('../src/style-sets');
const links = require('../src/links');
const songs = require('../src/song-library');
const { versionFolder } = require('../src/versions');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DEFAULT = fs.readFileSync(path.join(__dirname, '..', 'src', 'default-style.css'), 'utf8');

test('the Stage style: bold black, its own font and size, chords that never blend into bold words', () => {
  const css = sets.stageCss(DEFAULT, { font: '"Courier New", monospace', size: '22px' });
  assert.strictEqual(sets.styleSetInfo(css).name, 'Stage');
  assert.ok(/--stage-size:\s*22px;/.test(css) && /--stage-font:\s*"Courier New", monospace;/.test(css));
  assert.ok(/--chord-color:\s*var\(--stage-color\);/.test(css) && /--monospace-size:\s*var\(--stage-size\);/.test(css));
  assert.ok(css.includes('.inline-line .ichord { background: var(--stage-color); color: #ffffff;'));
  assert.ok(css.includes('.chords, .lyrics, .tab, .rhythm, .chord-table td, .inline-line, .lyric-line { font-weight: 700;'));
  assert.ok(css.includes('.lyrics strong:not(.inline-label)'));
  assert.ok(/--stage-size:\s*18px;/.test(sets.stageCss(DEFAULT)), 'defaults kept when nothing is given');
});
test('six style sets, each with its own look; colour sets keep their colours in dark mode', () => {
  const all = sets.builtInStyleSets(DEFAULT);
  assert.deepStrictEqual(all.map((s) => s.id), ['classic', 'big', 'songbook', 'ink', 'modern', 'night']);
  const night = all.find((s) => s.id === 'night').css;
  assert.ok(night.includes(':root[data-theme] { --bg-color: #111827;'));
  assert.ok(!all.find((s) => s.id === 'classic').css.includes(':root[data-theme] {'));
  assert.ok(all.find((s) => s.id === 'big').css.includes('.section { display: inline-block; background: #111111; color: #ffffff;'));
  assert.ok(/--monospace-size:\s*13px;/.test(all.find((s) => s.id === 'ink').css));
  assert.ok(!all.some((s) => s.id === 'stage'));
});
test('exports: the song as written goes in "Song"; older folders are tidied once', () => {
  assert.strictEqual(versionFolder(0, []), 'Song');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke-'));
  const ex = path.join(dir, 'exports');
  fs.mkdirSync(path.join(ex, 'Original'), { recursive: true });
  fs.mkdirSync(path.join(ex, 'C to D (+2)'), { recursive: true });
  fs.mkdirSync(path.join(ex, 'Lyrics'), { recursive: true });
  fs.writeFileSync(path.join(ex, 'Original', 'A_uke.pdf'), 'x');
  fs.writeFileSync(path.join(ex, 'Original', 'A_uke (stage).pdf'), 'x');
  fs.writeFileSync(path.join(ex, 'C to D (+2)', 'A (+2)_uke (stage).html'), 'x');
  fs.writeFileSync(path.join(ex, 'Lyrics', 'A (lyrics) (stage).pdf'), 'x');
  fs.writeFileSync(path.join(ex, 'Lyrics', 'A (lyrics).pdf'), 'x');
  assert.strictEqual(songs.migrateExportFolders(dir), 4);
  assert.ok(fs.existsSync(path.join(ex, 'Song', 'A_uke.pdf')) && !fs.existsSync(path.join(ex, 'Original')));
  assert.deepStrictEqual(fs.readdirSync(path.join(ex, 'Stage')).sort(), ['A (+2)_uke (stage).html', 'A (lyrics) (stage).pdf', 'A_uke (stage).pdf']);
  assert.deepStrictEqual(fs.readdirSync(path.join(ex, 'Lyrics')), ['A (lyrics).pdf']);
  assert.strictEqual(songs.migrateExportFolders(dir), 0);
  fs.rmSync(dir, { recursive: true, force: true });
});
test('links: tidied, recognised, kept in links.txt', () => {
  assert.strictEqual(links.cleanUrl('youtube.com/watch?v=abc'), 'https://youtube.com/watch?v=abc');
  assert.strictEqual(links.cleanUrl('not a link'), '');
  assert.strictEqual(links.cleanUrl('javascript:alert(1)'), '');
  assert.strictEqual(links.youtubeId('https://youtu.be/dQw4w9WgXcQ?t=5'), 'dQw4w9WgXcQ');
  assert.strictEqual(links.youtubeId('https://www.youtube.com/shorts/abc_12'), 'abc_12');
  assert.strictEqual(links.linkKind('https://en.wikipedia.org/wiki/Clementine').kind, 'wikipedia');
  assert.strictEqual(links.defaultTitle('https://en.wikipedia.org/wiki/Oh!_Susanna'), 'Wikipedia: Oh! Susanna');
  const text = links.formatLinks([{ title: 'Original | 1976', url: 'youtu.be/x1' }, { title: '', url: 'https://ukulelehunt.com/x' }, { title: 'bad', url: 'nope' }]);
  assert.strictEqual(text, 'Original 1976 | https://youtu.be/x1\nhttps://ukulelehunt.com/x\n');
  assert.deepStrictEqual(links.parseLinks(text), [{ title: 'Original 1976', url: 'https://youtu.be/x1' }, { title: '', url: 'https://ukulelehunt.com/x' }]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke-'));
  links.writeLinks(dir, [{ title: 'Play-along', url: 'https://youtu.be/y2' }]);
  assert.deepStrictEqual(links.readLinks(dir), [{ title: 'Play-along', url: 'https://youtu.be/y2' }]);
  links.writeLinks(dir, []);
  assert.deepStrictEqual(links.readLinks(dir), []);
  fs.rmSync(dir, { recursive: true, force: true });
});
