const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('../src/song-library');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-songs-'));
const SETTINGS = { song: { instrument: 'soprano', transpose: 0 }, export: { layout: 'lines' }, general: { theme: 'dark' } };

try {
  test('rejects empty, untitled, illegal and reserved titles', () => {
    assert.strictEqual(lib.validateSongTitle('   ', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('Untitled', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('untitled 2', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('AC/DC', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('What?', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('CON', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('exports', root).ok, false);
  });

  test('accepts and tidies a normal title', () => {
    const result = lib.validateSongTitle('  Somewhere   Over the Rainbow. ', root);
    assert.deepStrictEqual(result, { ok: true, title: 'Somewhere Over the Rainbow' });
    assert.strictEqual(lib.validateSongTitle('Untitled Love Song Reprise', root).ok, false);
    assert.strictEqual(lib.validateSongTitle('My Untitled Song', root).ok, true);
  });

  test('createSong makes folder, -song.txt, song.ini and exports folder', () => {
    const song = lib.createSong(root, 'Somewhere Over the Rainbow', '[C]Some[G]where', SETTINGS);
    assert.strictEqual(song.title, 'Somewhere Over the Rainbow');
    assert.ok(song.songFile.endsWith('Somewhere Over the Rainbow-song.txt'));
    assert.strictEqual(fs.readFileSync(song.songFile, 'utf8'), '[C]Some[G]where');
    assert.ok(fs.statSync(path.join(song.folder, 'exports')).isDirectory());
    assert.ok(fs.existsSync(path.join(song.folder, 'song.ini')));
  });

  test('song.ini holds only song-level settings', () => {
    const ini = fs.readFileSync(path.join(root, 'Somewhere Over the Rainbow', 'song.ini'), 'utf8');
    assert.ok(ini.includes('instrument = soprano'));
    assert.ok(ini.includes('layout = lines'));
    assert.ok(!ini.includes('theme'), 'general settings must not be copied into song.ini');
  });

  test('duplicate titles are rejected, ignoring case', () => {
    const check = lib.validateSongTitle('somewhere over THE rainbow', root);
    assert.strictEqual(check.ok, false);
    assert.ok(/already/.test(check.error));
    assert.throws(() => lib.createSong(root, 'SOMEWHERE OVER THE RAINBOW', '', SETTINGS), /already/);
  });

  test('song settings round-trip with numbers and booleans', () => {
    const folder = path.join(root, 'Somewhere Over the Rainbow');
    lib.writeSongSettings(folder, { song: { instrument: 'baritone', transpose: -3 }, diagrams: { enable: false } });
    const settings = lib.readSongSettings(folder);
    assert.strictEqual(settings.song.instrument, 'baritone');
    assert.strictEqual(settings.song.transpose, -3);
    assert.strictEqual(settings.diagrams.enable, false);
  });

  test('listSongs finds songs by -song.txt and ignores other folders', () => {
    lib.createSong(root, 'Abba Medley', 'x', SETTINGS);
    fs.mkdirSync(path.join(root, 'Not a song'));
    fs.writeFileSync(path.join(root, 'Not a song', 'notes.txt'), 'hi');
    const titles = lib.listSongs(root).map((s) => s.title);
    assert.deepStrictEqual(titles, ['Abba Medley', 'Somewhere Over the Rainbow']);
  });

  test('song file is still found after the folder is renamed', () => {
    fs.renameSync(path.join(root, 'Abba Medley'), path.join(root, 'ABBA Medley'));
    const song = lib.readSong(path.join(root, 'ABBA Medley'));
    assert.strictEqual(song.title, 'ABBA Medley');
    assert.ok(song.songFile.endsWith('Abba Medley-song.txt'));
    assert.strictEqual(song.content, 'x');
  });

  test('saveSong refuses files that are not -song.txt', () => {
    assert.throws(() => lib.saveSong(path.join(root, 'x.txt'), 'y'), /Not a song file/);
  });

  test('export file names reflect instrument and transpose', () => {
    assert.strictEqual(lib.exportFileName('Song', {}, 'html'), 'Song_uke.html');
    assert.strictEqual(lib.exportFileName('Song', { instrument: 'baritone' }, 'html'), 'Song_bar.html');
    assert.strictEqual(lib.exportFileName('Song', { transpose: 2 }, 'md'), 'Song (+2)_uke.md');
    assert.strictEqual(lib.exportFileName('Song', { instrument: 'baritone', transpose: -3 }, 'md'), 'Song (-3)_bar.md');
    assert.strictEqual(lib.exportFileName('Song', { instrument: 'guitar', transpose: 2, capo: 3 }, 'pdf'), 'Song (+2, capo 3)_gtr.pdf');
    assert.strictEqual(lib.exportFileName('Song', { instrument: null }, 'txt'), 'Song.txt');
  });

  test('writeExport writes into the song exports folder', () => {
    const folder = path.join(root, 'Somewhere Over the Rainbow');
    const target = lib.writeExport(folder, 'Somewhere Over the Rainbow (baritone).html', '<p>hi</p>');
    assert.strictEqual(target, path.join(folder, 'exports', 'Somewhere Over the Rainbow (baritone).html'));
    assert.strictEqual(fs.readFileSync(target, 'utf8'), '<p>hi</p>');
  });

  test('new songs get notes.txt with a history line', () => {
    const notes = lib.readNotes(path.join(root, 'Somewhere Over the Rainbow'));
    assert.ok(notes.startsWith('Somewhere Over the Rainbow'));
    assert.ok(/\d{4}-\d{2}-\d{2}  Song created/.test(notes));
  });

  test('appendNoteLine adds a dated line', () => {
    const folder = path.join(root, 'Somewhere Over the Rainbow');
    const notes = lib.appendNoteLine(folder, 'Created version C to F (+5)');
    assert.ok(notes.trimEnd().endsWith('Created version C to F (+5)'));
    assert.strictEqual(lib.readSong(folder).notes, notes);
  });

  test('exports go into version subfolders; binary content supported', () => {
    const folder = path.join(root, 'Somewhere Over the Rainbow');
    const target = lib.writeExport(folder, 'x.pdf', new Uint8Array([37, 80, 68, 70]), 'C to F (+5)');
    assert.strictEqual(target, path.join(folder, 'exports', 'C to F (+5)', 'x.pdf'));
    assert.strictEqual(fs.readFileSync(target, 'latin1'), '%PDF');
    assert.throws(() => lib.writeExport(folder, 'x.txt', 'y', '..'), /Invalid/);
  });

  test('tempo and versions survive song.ini', () => {
    const folder = path.join(root, 'Somewhere Over the Rainbow');
    lib.writeSongSettings(folder, { song: { tempo: 96 }, versions: { list: '5:C:F,-2:G:F' } });
    const settings = lib.readSongSettings(folder);
    assert.strictEqual(settings.song.tempo, 96);
    assert.strictEqual(settings.versions.list, '5:C:F,-2:G:F');
  });

  test('a new song stores only its facts — defaults are not copied in', () => {
    const song = lib.createSong(root, 'Plain Song', 'x', {});
    const ini = fs.readFileSync(path.join(song.folder, 'song.ini'), 'utf8');
    assert.ok(/transpose = 0/.test(ini) && /tempo = 100/.test(ini) && /settings_format = 2/.test(ini), ini);
    assert.ok(!/instrument|layout|notation|placement|font/.test(ini), ini);
  });

  test('overrides are kept only when present; fonts are cleaned up', () => {
    const picked = lib.pickSongSettings({
      song: { instrument: 'baritone' },
      export: { layout: '' },
      font: { family: '"Consolas";', size: '20', bold: 'true' }
    });
    assert.strictEqual(picked.song.instrument, 'baritone');
    assert.strictEqual(picked.export, undefined);
    assert.deepStrictEqual(picked.font, { family: 'Consolas', size: 20, bold: true });
    assert.strictEqual(lib.pickSongSettings({ song: { instrument: 'banjo' } }).song.instrument, undefined);
  });

  test('old song.ini files (a copy of every default) are recognised as format 1', () => {
    const folder = path.join(root, 'Plain Song');
    fs.writeFileSync(path.join(folder, 'song.ini'), '[song]\ninstrument = soprano\ntranspose = 2\n[export]\nlayout = lines\n');
    const settings = lib.readSongSettings(folder);
    assert.strictEqual(settings.song.settings_format, 1);
    assert.strictEqual(settings.export.layout, 'lines');
    lib.writeSongSettings(folder, settings);
    assert.strictEqual(lib.readSongSettings(folder).song.settings_format, 2);
  });

  test('deletePath removes a setting and tidies empty sections', () => {
    const obj = { export: { layout: 'table' }, song: { tempo: 90 } };
    lib.deletePath(obj, 'export.layout');
    assert.deepStrictEqual(obj, { song: { tempo: 90 } });
  });

  test('suggests a title from an imported file name', () => {
    assert.strictEqual(lib.suggestTitleFromFile('C:\\x\\rainbow-song.txt'.replace(/\\/g, path.sep)), 'rainbow');
    assert.strictEqual(lib.suggestTitleFromFile('/x/My Tune.txt'), 'My Tune');
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log('All song library tests passed.');
