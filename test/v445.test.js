// 4.45: the web player keeps and edits songs: songs from files (song files, ChordPro, a zipped
// songs folder, a backup), what an import would change, and backups in the web songs format.
const assert = require('assert');
const sf = require('../src/song-files');
const { writeZip } = require('../src/zip');
const { buildWebSongs, readWebSongs } = require('../src/web-songs');

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

const SONG = '--START MUSIC--\n[[Verse]]\n[C]Hello [G]there\n--END MUSIC--\n';

test('a song file of any kind becomes a song', async () => {
  assert.strictEqual(sf.titleFromFile('Songs/Amazing Grace/Amazing Grace-song.txt'), 'Amazing Grace');
  assert.strictEqual(sf.titleFromFile('my_song.cho'), 'my song');
  const own = sf.songFromText('Hello-song.txt', SONG);
  assert.deepStrictEqual([own.title, own.from, own.text], ['Hello', 'ukemusic', SONG]);
  const cho = sf.songFromText('x.txt', '{title: Hi}\n{artist: Me}\n{key: G}\n[G]Hello [D]there');
  assert.strictEqual(cho.from, 'chordpro');
  assert.strictEqual(cho.title, 'Hi');
  assert.strictEqual(cho.settings.song.artist, 'Me');
  assert.ok(cho.text.includes('[G]Hello [D]there') && cho.text.startsWith('--START MUSIC--'));
  const sheet = sf.songFromText('Sheet.txt', 'C        G\nHello my friend\n');
  assert.strictEqual(sheet.from, 'chord sheet');
  assert.ok(sheet.text.includes('[C]Hello my [G]friend') && sheet.text.trim().endsWith('--END MUSIC--'));
  const words = sf.songFromText('Words.txt', 'Just some words\n');
  assert.strictEqual(words.from, 'text');
});

test('a zipped songs folder: each song folder with its song.ini and notes', async () => {
  const zip = writeZip([
    { name: 'Songs/Amazing Grace/Amazing Grace-song.txt', data: SONG },
    { name: 'Songs/Amazing Grace/song.ini', data: '[song]\ntempo = 80\nbeats_per_bar = 3\nkey = G\nartist = John Newton\nsettings_format = 2\n' },
    { name: 'Songs/Amazing Grace/notes.txt', data: 'Amazing Grace\n\nHistory\n' },
    { name: 'Songs/Amazing Grace/exports/Song/x.html', data: '<p>' },
    { name: 'Songs/Amazing Grace/.history/old-song.txt', data: 'old' },
    { name: 'Songs/Loose.cho', data: '{title: Loose Song}\n[C]La' },
    { name: '__MACOSX/Songs/._Loose.cho', data: 'junk' },
    { name: 'Songs/picture.png', data: Buffer.from([137, 80, 78, 71]) }
  ]);
  const r = await sf.songsFromFiles([{ name: 'Songs.zip', bytes: new Uint8Array(zip) }]);
  assert.deepStrictEqual(r.songs.map((s) => s.title).sort(), ['Amazing Grace', 'Loose Song']);
  const ag = r.songs.find((s) => s.title === 'Amazing Grace');
  assert.strictEqual(ag.text, SONG);
  assert.deepStrictEqual([ag.settings.song.tempo, ag.settings.song.beats_per_bar, ag.settings.song.key, ag.settings.song.artist, ag.settings.song.settings_format], [80, 3, 'G', 'John Newton', undefined]);
  assert.ok(ag.notes.startsWith('Amazing Grace'));
  assert.deepStrictEqual(r.skipped, ['Songs/picture.png']);
});

test('a backup file gives all its songs; the edited marks go there and back', async () => {
  const backup = buildWebSongs([{ title: 'B', text: SONG, settings: {}, notes: '', edited: true, updated: '2026-10-28T10:00:00Z' }, { title: 'A', content: SONG }]);
  assert.deepStrictEqual(backup.songs.map((s) => [s.title, s.edited || false]), [['A', false], ['B', true]]);
  const back = readWebSongs(JSON.stringify(backup));
  assert.strictEqual(back.songs.find((s) => s.title === 'B').updated, '2026-10-28T10:00:00Z');
  const r = await sf.songsFromFiles([{ name: 'ukemusic-songs.json', text: JSON.stringify(backup) }]);
  assert.strictEqual(r.backups, 1);
  assert.strictEqual(r.songs.length, 2);
  const bad = await sf.songsFromFiles([{ name: 'other.json', text: '{"x":1}' }]);
  assert.deepStrictEqual(bad.skipped, ['other.json']);
});

test('an import plan: new, changed (and what), the same, and songs not in the file', () => {
  const here = [
    { id: 'a', title: 'A', text: SONG, settings: { song: { tempo: 90 } }, notes: '' },
    { id: 'b', title: 'B', text: SONG, settings: {}, notes: '', edited: true },
    { id: 'c', title: 'C', text: SONG, settings: {}, notes: '' }
  ];
  const plan = sf.planImport(here, [
    { title: 'A', text: SONG, settings: { song: { tempo: '90' } }, notes: '' },   // same (90 = "90")
    { title: 'B', text: SONG.replace('there', 'you'), settings: { song: { tempo: 100 } }, notes: 'x' },
    { title: 'D', text: SONG, settings: {}, notes: '' },
    { title: 'd', text: 'twice', settings: {}, notes: '' }
  ]);
  assert.deepStrictEqual(plan.same.map((s) => s.title), ['A']);
  assert.deepStrictEqual(plan.update.map((u) => [u.song.title, u.what.join(', '), u.editedHere]), [['B', 'words and chords, notes, details', true]]);
  assert.deepStrictEqual(plan.add.map((s) => s.title), ['D']);
  assert.deepStrictEqual(plan.missing.map((s) => s.title), ['C']);
});

(async () => {
  for (const [name, fn] of tests) {
    try { await fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); console.error(error); process.exitCode = 1; throw error; }
  }
})();
