const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('../src/song-library');
const { STARTERS, addStarterSongs, isStarterNotes } = require('../src/starters');
const { parse } = require('../src/parser');
const { strokeCount } = require('../src/strums');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-starters-'));

try {
  test('starter songs parse with no warnings', () => {
    for (const starter of STARTERS) {
      const ir = parse(starter.content, { useDelimiters: true, rhythmEnabled: true, tablatureEnabled: true });
      const warnings = ir.flatMap((node) => node.warnings || []);
      assert.deepStrictEqual(warnings, [], `${starter.title}: ${warnings.join(' | ')}`);
    }
  });

  test('starter strum patterns fit their time signature', () => {
    for (const starter of STARTERS) {
      const beats = starter.settings.song.beats_per_bar;
      for (const match of starter.content.matchAll(/^\{([^}]+)\}$/gm)) {
        const strokes = strokeCount(match[1]);
        assert.ok(strokes % beats === 0 || beats % strokes === 0, `${starter.title}: {${match[1]}} in ${beats}/4`);
      }
    }
  });

  test('starter songs are old enough to be out of copyright', () => {
    for (const starter of STARTERS) assert.ok(starter.year < 1929, starter.title);
  });

  test('adds the starter songs once, with settings and notes', () => {
    assert.deepStrictEqual(addStarterSongs(root), ['Oh! Susanna', 'Amazing Grace', 'Clementine']);
    assert.deepStrictEqual(addStarterSongs(root), []);
    const settings = lib.readSongSettings(path.join(root, 'Clementine'));
    assert.strictEqual(settings.song.beats_per_bar, 3);
    assert.strictEqual(settings.song.tempo, 100);
    assert.ok(isStarterNotes(lib.readNotes(path.join(root, 'Clementine'))));
  });

  test('skips a starter when the user has a song of that name', () => {
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-starters-'));
    lib.createSong(other, 'Clementine', '--START MUSIC--\n[G]mine\n--END MUSIC--\n', {});
    assert.deepStrictEqual(addStarterSongs(other), ['Oh! Susanna', 'Amazing Grace']);
    assert.ok(lib.readSong(path.join(other, 'Clementine')).content.includes('[G]mine'));
    fs.rmSync(other, { recursive: true, force: true });
  });

  test('song list has key, instrument and starter flag', () => {
    lib.createSong(root, 'My Song', '--START MUSIC--\n[[Verse 1]]\n[Am]one [Dm]two [E7]three [Am]four\n--END MUSIC--\n', { song: { instrument: 'guitar' } });
    const list = lib.listSongs(root);
    const byTitle = Object.fromEntries(list.map((s) => [s.title, s]));
    assert.strictEqual(byTitle['Amazing Grace'].key, 'G');
    assert.strictEqual(byTitle['Oh! Susanna'].key, 'C');
    assert.strictEqual(byTitle.Clementine.key, 'F');
    assert.strictEqual(byTitle['My Song'].key, 'Am');
    assert.strictEqual(byTitle['My Song'].instrument, 'guitar');
    assert.strictEqual(byTitle.Clementine.instrument, null);
    assert.strictEqual(byTitle.Clementine.starter, true);
    assert.strictEqual(byTitle['My Song'].starter, false);
    assert.ok(byTitle['My Song'].modified > 0);
  });

  test('a key set in song.ini wins over the guess', () => {
    lib.createSong(root, 'Set Key', '--START MUSIC--\n[C]a [G]b\n--END MUSIC--\n', { song: { key: 'Am' } });
    assert.strictEqual(lib.listSongs(root).find((s) => s.title === 'Set Key').key, 'Am');
  });

  test('chordsInText skips section labels', () => {
    assert.deepStrictEqual(lib.chordsInText('[[Verse 1]]\n[C]Hello [G7]there [[Chorus]] [Am]'), ['C', 'G7', 'Am']);
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
