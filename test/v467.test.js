// 4.67: six beginner songs in the Public Domain Songs library; a ChordPro file's comments go into the
// song's notes; "A course in six songs" on the Teach page
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const { chordProToUkemusic } = require('../src/chordpro');
const songFiles = require('../src/song-files');
const lib = require('../src/song-library');
const { importFolder } = require('../src/chordpro-import');
const { parse } = require('../src/parser');
const pr = require('../src/progressions');
const PD = path.join(ROOT, 'public domain songs', 'Public Domain Songs');
const BEGINNER = path.join(ROOT, 'public domain songs', 'Beginner ChordPro');
const SIX = ['Buffalo Gals', 'Drunken Sailor', 'Oh! Susanna', 'Down by the Riverside', 'When the Saints Go Marching In', 'Auld Lang Syne'];

const FILE = '{title: Test}\n{subtitle: An easy version}\n{artist: Someone}\n# Words from a 1900 songbook.\n# ukemusic: this is ours\n#\n[C]la la\n';

test('ChordPro: the # comments and the subtitle come back as notes', () => {
  const r = chordProToUkemusic(FILE);
  assert.strictEqual(r.notes, 'An easy version\nWords from a 1900 songbook.');
  assert.match(r.kept, /# Words from a 1900 songbook\./, 'and still kept on the ChordPro tab');
  // a subtitle standing in for the artist isn't repeated in the notes
  assert.strictEqual(chordProToUkemusic('{title: T}\n{st: Paul Simon}\n[C]la\n').notes, '');
  assert.strictEqual(songFiles.songFromText('t.cho', FILE).notes, r.notes, 'the web player\'s import too');
});

test('the notes go under the title, above the history', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke467-'));
  const song = lib.createSong(dir, 'Test', '--START MUSIC--\n[C]la\n--END MUSIC--\n', { song: {} });
  const notes = lib.addImportNotes(song.folder, 'Words from a 1900 songbook.');
  assert.match(notes, /^Test\n\nWords from a 1900 songbook\.\n\n\nHistory\n\d{4}-\d\d-\d\d {2}Song created\n$/);
  assert.strictEqual(lib.addImportNotes(song.folder, 'Words from a 1900 songbook.'), notes, 'not twice');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('Import ChordPro files: each song gets its file\'s notes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke467-'));
  const report = importFolder(BEGINNER, dir);
  assert.strictEqual(report.added.length, 6);
  const notes = lib.readNotes(path.join(dir, 'Oh! Susanna'));
  assert.match(notes, /Foster died in 1864/);
  assert.ok(notes.indexOf('Foster died') < notes.indexOf('History'));
  fs.rmSync(dir, { recursive: true, force: true });
});

test('desktop and web player pass the notes on', () => {
  const html = read('index.html');
  assert.match(html, /async function applyImportedMeta\(meta, kept = '', notes = ''\)/);
  assert.strictEqual((html.match(/applyImportedMeta\((converted|result)\.meta, \1\.kept, \1\.notes\)/g) || []).length, 3);
  assert.match(html, /if \(pending\?\.notes\) await addImportNotes\(pending\.notes\);/);
  assert.match(read('src/preload.js'), /addImportNotes: \(payload\) => ipcRenderer\.invoke\('song:addImportNotes', payload\)/);
  assert.match(read('web/app.html'), /instrument: myInstrument\(\) \} \}, read\.notes \|\| ''\);/);
});

test('the library has the six beginner songs: public domain, following your instrument, with notes', () => {
  const songs = lib.listSongs(PD);
  for (const title of SIX) {
    const s = songs.find((x) => x.title === title);
    assert.ok(s, title);
    const r = lib.readSong(s.folder);
    r.notes = r.notes.replace(/\r\n/g, '\n');
    const song = r.settings.song;
    assert.strictEqual(song.licence, 'public-domain', title);
    assert.ok(!song.instrument, `${title} follows your instrument`);
    assert.match(song.tags, /beginner/, title);
    assert.match(r.notes, /^.+\n\nRights: .+Public domain/m, title);
    assert.ok(!/\[\[[^\]]*[.!?]\]\]/.test(r.content), `${title}: tips are in the notes, not headings`);
    assert.strictEqual(pr.songKeyGuess(parse(r.content)).name, song.key, title);
  }
});

test('the chords match the course, and the fixes are in', () => {
  const { BEGINNER_COURSE } = require('../web/pages');
  assert.deepStrictEqual(BEGINNER_COURSE.map((c) => c.song), SIX);
  for (const c of BEGINNER_COURSE) {
    const r = lib.readSong(path.join(PD, c.song));
    const chords = new Set(parse(r.content).filter((n) => n.type === 'chord').map((n) => n.content));
    assert.deepStrictEqual([...chords].sort(), c.chords.split(', ').sort(), c.song);
  }
  const susanna = lib.readSong(path.join(PD, 'Oh! Susanna')).content;
  assert.ok(susanna.includes('my [G7]true love for to [C]see'));
  assert.ok(read('public domain songs/Beginner ChordPro/05 When the Saints Go Marching In.cho').includes('Lord, I [C]want to be [F]in that number,'));
});

test('the ChordPro folder is in the repo; the zip copy isn\'t', () => {
  assert.strictEqual(fs.readdirSync(BEGINNER).filter((f) => f.endsWith('.cho')).length, 6);
  assert.ok(!fs.existsSync(path.join(ROOT, 'public domain songs', 'Beginner ChordPro.zip')));
  assert.match(read('public domain songs/Beginner ChordPro/README.md'), /also in the Public Domain Songs library/);
});

test('Teach page: a course in six songs', () => {
  const src = read('web/pages.js');
  assert.match(src, /<section id="beginner-songs">/);
  assert.match(src, /course: true, \/\/ 4\.67/);
  assert.match(read('README.md'), /16 public-domain songs/);
});

console.log('v4.67 tests passed');
