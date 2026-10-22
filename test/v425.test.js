// 4.25: libraries (folders of songs with a library.ini), copying and moving songs, library packs
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zip = require('../src/zip');
const libs = require('../src/libraries');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke425-'));
const song = (lib, title, licence = '') => {
  const folder = songs.createSong(lib, title, `[C]${title} [G7]la`, licence ? { song: { licence } } : {}).folder;
  songs.writeNotes(folder, `Notes for ${title}`);
  fs.mkdirSync(path.join(folder, 'exports', 'Song'), { recursive: true });
  fs.writeFileSync(path.join(folder, 'exports', 'Song', `${title}.pdf`), 'pdf');
  return folder;
};

test('zip: what goes in comes out (stored and deflated, UTF-8 names)', () => {
  const big = 'la '.repeat(500);
  const buf = zip.writeZip([{ name: 'a.txt', data: 'hi' }, { name: 'songs/Café/x.txt', data: big }]);
  const out = zip.readZip(buf);
  assert.deepStrictEqual(out.map((e) => [e.name, e.data.toString()]), [['a.txt', 'hi'], ['songs/Café/x.txt', big]]);
  assert.strictEqual(zip.crc32(Buffer.from('123456789')), 0xcbf43926);
  assert.throws(() => zip.readZip(Buffer.from('not a zip at all, sorry')), /isn't a zip/);
});

test('a library: a folder with library.ini; an old songs folder is a library named after it', () => {
  const plain = path.join(tmp, 'My songs');
  fs.mkdirSync(plain);
  assert.strictEqual(libs.readInfo(plain).name, 'My songs');
  const lib = libs.createLibrary(tmp, 'Starter songs', { description: 'Old songs\nfree to share', licence: 'Public domain' });
  const info = libs.readInfo(lib);
  assert.deepStrictEqual([info.name, info.description, info.licence], ['Starter songs', 'Old songs\nfree to share', 'Public domain']);
  assert.ok(/^\d{4}-\d\d-\d\d$/.test(info.created));
  assert.strictEqual(path.basename(libs.createLibrary(tmp, 'Starter songs')), 'Starter songs (2)');
  assert.throws(() => libs.createLibrary(tmp, ''), /name/);
  libs.writeInfo(plain, { author: 'Mark' });
  assert.strictEqual(libs.readInfo(plain).name, 'My songs');
  assert.strictEqual(libs.readInfo(plain).author, 'Mark');
});

test('the list of libraries (kept in config as a|b)', () => {
  assert.deepStrictEqual(libs.parseList(' a | b |A|| c'), ['a', 'b', 'c']);
  assert.strictEqual(libs.formatList(['x', 'y', 'x']), 'x|y');
  const plain = path.join(tmp, 'My songs');
  song(plain, 'Rainbow');
  const list = libs.listLibraries([plain, path.join(tmp, 'gone')]);
  assert.deepStrictEqual(list.map((l) => [l.name, l.exists, l.count]), [['My songs', true, 1], ['gone', false, 0]]);
});

test('copy a song to another library: without its exports; a clash asks first', () => {
  const plain = path.join(tmp, 'My songs');
  const starter = path.join(tmp, 'Starter songs');
  const r = libs.copySong(path.join(plain, 'Rainbow'), starter);
  assert.ok(fs.existsSync(path.join(starter, 'Rainbow', 'Rainbow-song.txt')));
  assert.ok(fs.existsSync(path.join(starter, 'Rainbow', 'notes.txt')));
  assert.ok(!fs.existsSync(path.join(starter, 'Rainbow', 'exports')));
  assert.ok(fs.existsSync(path.join(plain, 'Rainbow')), 'the original stays');
  assert.strictEqual(r.folder, path.join(starter, 'Rainbow'));
  assert.deepStrictEqual(libs.copySong(path.join(plain, 'Rainbow'), starter), { clash: 'Rainbow' });
  const both = libs.copySong(path.join(plain, 'Rainbow'), starter, { keepBoth: true });
  assert.strictEqual(path.basename(both.folder), 'Rainbow (2)');
  assert.ok(fs.existsSync(path.join(both.folder, 'Rainbow (2)-song.txt')), 'the song file matches its folder');
  assert.throws(() => libs.copySong(path.join(plain, 'Rainbow'), plain), /already in that library/);
});

test('move a song: it leaves, with its exports', () => {
  const plain = path.join(tmp, 'My songs');
  const starter = path.join(tmp, 'Starter songs');
  song(plain, 'Shenandoah', 'public-domain');
  libs.copySong(path.join(plain, 'Shenandoah'), starter, { move: true });
  assert.ok(!fs.existsSync(path.join(plain, 'Shenandoah')));
  assert.ok(fs.existsSync(path.join(starter, 'Shenandoah', 'exports', 'Song', 'Shenandoah.pdf')));
});

test('licences: songs not marked shareable are listed before a pack is made', () => {
  const starter = path.join(tmp, 'Starter songs');
  songs.writeSongSettings(path.join(starter, 'Rainbow (2)'), { song: { licence: 'own' } });
  const check = libs.licenceCheck(starter);
  assert.deepStrictEqual(check.map((c) => c.title), ['Rainbow']);
  assert.deepStrictEqual(Object.keys(libs.LICENCES), ['public-domain', 'own', 'permission', 'personal']);
  // and the field is kept in song.ini
  const picked = songs.pickSongSettings({ song: { licence: 'Public-Domain' } });
  assert.strictEqual(picked.song.licence, 'public-domain');
  assert.strictEqual(songs.pickSongSettings({ song: { licence: 'whatever' } }).song.licence, undefined);
});

test('a library pack: library.ini, the songs (no exports, notes only if asked) and setlists', () => {
  const starter = path.join(tmp, 'Starter songs');
  fs.mkdirSync(path.join(starter, 'Setlists'), { recursive: true });
  fs.writeFileSync(path.join(starter, 'Setlists', 'Club night.txt'), 'Shenandoah\nRainbow\n');
  const out = libs.exportPack(starter, path.join(tmp, 'Starter'));
  assert.strictEqual(out.file, path.join(tmp, 'Starter.ukelib'));
  assert.strictEqual(out.songs, 3);
  const names = zip.readZip(fs.readFileSync(out.file)).map((e) => e.name);
  assert.ok(names.includes('library.ini'));
  assert.ok(names.includes('songs/Shenandoah/Shenandoah-song.txt'));
  assert.ok(names.includes('songs/Shenandoah/song.ini'));
  assert.ok(names.includes('Setlists/Club night.txt'));
  assert.ok(!names.some((n) => /exports|notes\.txt/.test(n)), names.join(', '));
  const withNotes = libs.exportPack(starter, path.join(tmp, 'With notes.zip'), { notes: true, names: ['Rainbow'] });
  assert.deepStrictEqual(zip.readZip(fs.readFileSync(withNotes.file)).map((e) => e.name).filter((n) => n.startsWith('songs')).sort(), ['songs/Rainbow/Rainbow-song.txt', 'songs/Rainbow/notes.txt', 'songs/Rainbow/song.ini']);
  const peek = libs.readPack(out.file);
  assert.deepStrictEqual([peek.name, peek.licence, peek.titles], ['Starter songs', 'Public domain', ['Rainbow', 'Rainbow (2)', 'Shenandoah']]);
});

test('open a pack as a new library, or add its songs to one (skipping songs it has)', () => {
  const file = path.join(tmp, 'Starter.ukelib');
  const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'uke425b-'));
  const r = libs.importPack(file, { parent: elsewhere });
  assert.strictEqual(path.basename(r.folder), 'Starter songs');
  assert.strictEqual(r.added.length, 3);
  assert.strictEqual(libs.readInfo(r.folder).description, 'Old songs\nfree to share');
  assert.strictEqual(songs.listSongs(r.folder).length, 3);
  assert.ok(fs.existsSync(path.join(r.folder, 'Setlists', 'Club night.txt')));
  const into = libs.importPack(file, { into: path.join(tmp, 'My songs') });
  assert.deepStrictEqual(into.skipped, ['Rainbow']);
  assert.deepStrictEqual(into.added.sort(), ['Rainbow (2)', 'Shenandoah']);
  assert.strictEqual(libs.readInfo(path.join(tmp, 'My songs')).name, 'My songs', 'adding songs keeps the library as it was');
});

test('a pack can\'t write outside the library', () => {
  const bad = path.join(tmp, 'bad.ukelib');
  fs.writeFileSync(bad, zip.writeZip([
    { name: 'library.ini', data: '[library]\nname=Bad\n' },
    { name: 'songs/../../evil/x-song.txt', data: 'x' },
    { name: '../evil.txt', data: 'x' },
    { name: 'songs/Good/Good-song.txt', data: '[C]ok' }
  ]));
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'uke425c-'));
  const r = libs.importPack(bad, { parent: target });
  assert.deepStrictEqual(r.added, ['Good']);
  assert.ok(!fs.existsSync(path.join(target, 'evil')) && !fs.existsSync(path.join(target, '..', 'evil.txt')));
  assert.throws(() => libs.readPack(path.join(tmp, 'Starter songs', 'Shenandoah', 'Shenandoah-song.txt')), /zip/);
});

test('starter songs are marked public domain', () => {
  const starters = require('../src/starters');
  assert.ok(starters.STARTERS.every((s) => s.settings.song.licence === 'public-domain'));
});

test('a song keeps its own section names and swing feel when saved (they used to be lost)', () => {
  const picked = songs.pickSongSettings({ export: { section_names: 'hide' }, playback: { swing: 'shuffle' } });
  assert.strictEqual(picked.export.section_names, 'hide');
  assert.strictEqual(picked.playback.swing, 'shuffle');
  const bad = songs.pickSongSettings({ export: { section_names: 'huge' }, playback: { swing: 'jive' } });
  assert.strictEqual(bad.export, undefined);
  assert.strictEqual(bad.playback, undefined);
});
