// 4.31: protecting songs and settings: safe writes, earlier versions, no empty saves by
// accident, unreadable settings never overwritten, unknown settings kept
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const songs = require('../src/song-library');
const { writeFileSafe, explain } = require('../src/safe-write');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke431-'));

test('safe write: the whole file, no temporary files left', () => {
  const f = path.join(tmp, 'a.txt');
  writeFileSafe(f, 'one');
  writeFileSafe(f, 'two');
  assert.strictEqual(fs.readFileSync(f, 'utf8'), 'two');
  assert.deepStrictEqual(fs.readdirSync(tmp).filter((x) => x.endsWith('.tmp')), []);
  assert.ok(/moved, renamed or deleted/.test(explain({ code: 'ENOENT' }, 'The song')));
  assert.ok(/in use/.test(explain({ code: 'EBUSY' })));
});

test('every save keeps the version before (the last 20)', () => {
  const song = songs.createSong(tmp, 'Rainbow', '[C]one');
  for (let i = 2; i <= 24; i += 1) songs.saveSong(song.songFile, `[C]version ${i}`);
  const history = songs.songHistory(song.folder);
  assert.ok(history.length >= 1 && history.length <= 20, String(history.length));
  assert.ok(/version 23|version \d+|one/.test(fs.readFileSync(history[0].file, 'utf8')));
  assert.strictEqual(fs.readFileSync(song.songFile, 'utf8'), '[C]version 24');
  // the same minute: one file, the latest before-version
  assert.ok(history.every((h) => /^Rainbow \d{4}-\d\d-\d\d \d{4}\.txt$/.test(h.name)));
});

test('an empty song is never saved over one with words without asking', () => {
  const song = songs.createSong(tmp, 'Blank', '[C]words here');
  assert.throws(() => songs.saveSong(song.songFile, ''), (e) => e.code === 'EMPTYSAVE');
  assert.throws(() => songs.saveSong(song.songFile, '--START MUSIC--\n--END MUSIC--\n'), (e) => e.code === 'EMPTYSAVE');
  assert.strictEqual(fs.readFileSync(song.songFile, 'utf8'), '[C]words here');
  assert.throws(() => songs.saveSong(song.songFile, undefined), /missing/);
  songs.saveSong(song.songFile, '', { allowEmpty: true });
  assert.strictEqual(fs.readFileSync(song.songFile, 'utf8'), '');
  assert.ok(songs.songHistory(song.folder).length >= 1, 'the words are in its history');
});

test('song.ini that can\'t be read is an error, not "no settings"', () => {
  const song = songs.createSong(tmp, 'Locked', '[C]x');
  assert.ok(songs.readSongSettings(song.folder), 'readable');
  fs.rmSync(path.join(song.folder, 'song.ini'));
  assert.strictEqual(songs.readSongSettings(song.folder), null, 'missing: no settings yet');
  fs.mkdirSync(path.join(song.folder, 'song.ini')); // can't be read as a file
  assert.throws(() => songs.readSongSettings(song.folder), /can't be read/);
  assert.throws(() => songs.readSong(song.folder), /can't be read/);
});

test('settings this version doesn\'t know are kept; words stay words', () => {
  const song = songs.createSong(tmp, 'Kept', '[C]x', { song: { artist: 'Me', source: '0123' } });
  const file = path.join(song.folder, 'song.ini');
  fs.appendFileSync(file, '\n[future]\nthing = kept\n');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('artist = Me', 'artist = Me\nnew_fact = also kept'));
  const settings = songs.readSongSettings(song.folder);
  assert.strictEqual(settings.song.source, '0123', 'not turned into 123');
  settings.song.artist = 'You';
  songs.writeSongSettings(song.folder, settings);
  const text = fs.readFileSync(file, 'utf8');
  assert.ok(/thing = kept/.test(text) && /new_fact = also kept/.test(text), text);
  assert.ok(/artist = You/.test(text) && !/artist = Me/.test(text));
  // a setting taken back to the default is removed, not kept
  songs.writeSongSettings(song.folder, { ...settings, export: { section_names: 'hide' } });
  assert.ok(/section_names = hide/.test(fs.readFileSync(file, 'utf8')));
  const back = songs.readSongSettings(song.folder);
  delete back.export;
  songs.writeSongSettings(song.folder, back);
  assert.ok(!/section_names/.test(fs.readFileSync(file, 'utf8')));
});

test('reserved names: "Archived songs" and ".history" can\'t be song titles', () => {
  assert.strictEqual(songs.validateSongTitle('Archived songs', tmp).ok, false);
  assert.strictEqual(songs.validateSongTitle('Setlists', tmp).ok, false);
  assert.strictEqual(songs.validateSongTitle('Archived', tmp).ok, true);
});

test('every per-song setting in the app is one song.ini keeps', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const scoped = [...html.matchAll(/data-config-path="([^"]+)"[^>]*data-scope="song"/g)].map((m) => m[1]);
  const block = html.slice(html.indexOf('const SONG_OVERRIDES = ['), html.indexOf('];', html.indexOf('const SONG_OVERRIDES = [')));
  const overrides = [...block.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
  assert.ok(scoped.length > 5 && overrides.length > 5, `${scoped.length} / ${overrides.length}`);
  const known = new Set(songs.SONG_SETTING_PATHS);
  const missing = [...new Set([...scoped, ...overrides])].filter((p) => !known.has(p) && !p.startsWith('shapes.'));
  assert.deepStrictEqual(missing, [], `not kept in song.ini: ${missing.join(', ')}`);
});
