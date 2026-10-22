// Low-G ukulele, chord shapes, setlists, practice loops (endLine), artist and tags
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const shapes = require('../src/shapes');
const setlists = require('../src/setlists');
const lib = require('../src/song-library');
const tab = require('../src/tab');
const { instrument, sameShapes } = require('../src/instruments');
const { buildSchedule, voiceChord } = require('../src/playback-schedule');
const { buildKaraoke } = require('../src/karaoke');
const parse = require('../src/parser');
const { loadChordLibrary } = require('../src/chord-library');
const chordpro = require('../src/chordpro');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
const soprano = loadChordLibrary('soprano');

// ── Low G ──
test('low-G ukulele: G string an octave lower, same shapes and file code', () => {
  const p = instrument('lowg');
  assert.deepStrictEqual(p.strings, [55, 60, 64, 69]);
  assert.strictEqual(p.code, 'uke');
  assert.strictEqual(p.library, 'chords.json');
  assert.ok(sameShapes('lowg', 'soprano'));
  assert.ok(!sameShapes('baritone', 'soprano'));
  assert.deepStrictEqual(voiceChord('C', soprano, 'lowg'), [55, 60, 64, 72]);
});

test('low-G ukulele: tab keeps its fingering and plays the low G', () => {
  const text = 'A|--0--3--|\nE|---------|\nC|---------|\nG|--0--2--|';
  assert.strictEqual(tab.convertTab(text, 'lowg').text, text);
  assert.strictEqual(tab.convertTab(text, 'soprano').text, text);
  const pitches = tab.parseTab(text, { instrument: 'lowg' }).notes.map((n) => n.pitch);
  assert.deepStrictEqual(pitches, ['A4', 'G3', 'C5', 'A3']);
  assert.deepStrictEqual(tab.parseTab(text, { instrument: 'soprano' }).notes.map((n) => n.pitch), ['A4', 'G4', 'C5', 'A4']);
});

// ── Chord shapes ──
test('shapes: frets typed several ways', () => {
  assert.deepStrictEqual(shapes.parseFrets('2000', 4), [2, 0, 0, 0]);
  assert.deepStrictEqual(shapes.parseFrets('x32010', 6), [-1, 3, 2, 0, 1, 0]);
  assert.deepStrictEqual(shapes.parseFrets('10 12 12 11', 4), [10, 12, 12, 11]);
  assert.strictEqual(shapes.parseFrets('200', 4), null);
  assert.strictEqual(shapes.parseFrets('xxxx', 4), null);
  assert.strictEqual(shapes.fretsText([10, 12, 12, 11]), '10 12 12 11');
  assert.strictEqual(shapes.fretsText([-1, 3, 2, 0, 1, 0]), 'x32010');
});

test('shapes: alternatives are correct and start with the easy ones', () => {
  const am = shapes.findShapes('Am', 'soprano', { limit: 6 }).map((d) => shapes.fretsText(d.frets));
  assert.strictEqual(am[0], '2000');
  assert.ok(am.length >= 4);
  for (const s of am) assert.strictEqual(shapes.shapeProblem(shapes.parseFrets(s, 4), 'Am', 'soprano'), '');
  const c = shapes.findShapes('C', 'guitar', { limit: 4 }).map((d) => shapes.fretsText(d.frets));
  assert.strictEqual(c[0], 'x32010');
});

test('shapes: problems explained', () => {
  assert.strictEqual(shapes.shapeProblem([2, 0, 0, 3], 'Am', 'soprano'), '');
  assert.match(shapes.shapeProblem([2, 0, 1, 0], 'Am', 'soprano'), /isn't in the chord/);
  assert.match(shapes.shapeProblem([2, 0, 0, 0], 'Am7', 'soprano'), /missing/);
});

test('shapes: song setting and library override', () => {
  const map = shapes.parseShapeSetting('Am 2003, F#m 2120, nonsense', 4);
  assert.deepStrictEqual(map, { Am: [2, 0, 0, 3], 'F#m': [2, 1, 2, 0] });
  assert.strictEqual(shapes.formatShapeSetting(map), 'Am 2003, F#m 2120');
  const merged = shapes.withShapes(soprano, map);
  assert.deepStrictEqual(merged.chords.Am.frets, [2, 0, 0, 3]);
  assert.ok(merged.chords.Am.custom);
  assert.deepStrictEqual(soprano.chords.Am.frets, [2, 0, 0, 0], 'the built-in library is untouched');
  assert.deepStrictEqual(voiceChord('Am', merged, 'soprano'), [69, 60, 64, 72]);
});

test('shapes: ChordPro {define} in and out', () => {
  assert.deepStrictEqual(shapes.parseDefine('Bb base-fret 5 frets 1 3 3 2 1 1'), { name: 'Bb', frets: [5, 7, 7, 6, 5, 5] });
  assert.deepStrictEqual(shapes.parseDefine('C frets x 3 2 0 1 0'), { name: 'C', frets: [-1, 3, 2, 0, 1, 0] });
  assert.strictEqual(shapes.formatDefine('D', [7, 6, 5, 5]), '{define: D base-fret 5 frets 3 2 1 1}');
  assert.strictEqual(shapes.formatDefine('Am', [2, 0, 0, 3]), '{define: Am base-fret 1 frets 2 0 0 3}');
  const ir = parse('[Am]hello', { useDelimiters: false });
  const out = chordpro.ukemusicToChordPro(ir, { title: 'T', defines: { Am: [2, 0, 0, 3] } });
  assert.match(out, /\{define: Am base-fret 1 frets 2 0 0 3\}/);
  const back = chordpro.chordProToUkemusic(out);
  assert.deepStrictEqual(back.meta.defines, [{ name: 'Am', frets: [2, 0, 0, 3] }]);
});

// ── Song settings: artist, tags, shapes ──
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-v41-'));
try {
  test('artist, tags and shapes are kept in song.ini', () => {
    lib.createSong(root, 'One', '--START MUSIC--\n[G]x\n--END MUSIC--\n', {
      song: { artist: ' Joe\nBloggs ', tags: 'Folk, singalong,FOLK' },
      shapes: { soprano: 'F#m 2120', guitar: 'C x32010' }
    });
    const settings = lib.readSongSettings(path.join(root, 'One'));
    assert.strictEqual(settings.song.artist, 'Joe Bloggs');
    assert.strictEqual(settings.song.tags, 'folk, singalong');
    assert.deepStrictEqual(settings.shapes, { soprano: 'F#m 2120', guitar: 'C x32010' });
    const [song] = lib.listSongs(root);
    assert.strictEqual(song.artist, 'Joe Bloggs');
    assert.strictEqual(song.tags, 'folk, singalong');
  });

  test('"Setlists" is kept for the setlists folder', () => {
    assert.strictEqual(lib.validateSongTitle('setlists', root).ok, false);
  });

  // ── Setlists ──
  test('setlists: write, read, rename, delete', () => {
    assert.deepStrictEqual(setlists.listSetlists(root), []);
    setlists.writeSetlist(root, 'Club night', ['One', 'Two']);
    let all = setlists.listSetlists(root);
    assert.deepStrictEqual(all.map((s) => [s.name, s.songs]), [['Club night', ['One', 'Two']]]);
    assert.match(fs.readFileSync(path.join(root, 'Setlists', 'Club night.txt'), 'utf8'), /^# ukemusic setlist.*\nOne\nTwo\n$/);
    setlists.writeSetlist(root, 'Gig', ['Two', 'One'], { oldName: 'Club night' });
    all = setlists.listSetlists(root);
    assert.deepStrictEqual(all.map((s) => s.name), ['Gig']);
    assert.deepStrictEqual(all[0].songs, ['Two', 'One']);
    assert.strictEqual(setlists.validateName('gig', root).ok, false);
    assert.strictEqual(setlists.validateName('A/B', root).ok, false);
    assert.strictEqual(setlists.validateName('gig', root, { except: 'Gig' }).ok, true);
    assert.strictEqual(setlists.songbookPath(root, 'Gig'), path.join(root, 'Setlists', 'Gig.pdf'));
    setlists.deleteSetlist(root, 'Gig');
    assert.deepStrictEqual(setlists.listSetlists(root), []);
  });

  test('setlists folder is not listed as a song', () => {
    setlists.writeSetlist(root, 'Jam', ['One']);
    assert.deepStrictEqual(lib.listSongs(root).map((s) => s.title), ['One']);
  });
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

// ── Practice: play one section ──
test('schedule and karaoke can stop at an end line (one section)', () => {
  const text = '[[Verse]]\n[C]one\n[G]two\n[[Chorus]]\n[F]three\n[C]four';
  const ir = parse(text, { useDelimiters: false });
  const s = buildSchedule(ir, { library: soprano, tempo: 60, countIn: false, startLine: 4, endLine: 6 });
  assert.deepStrictEqual(s.bars.map((b) => b.chord), ['F', 'C']);
  const verse = buildSchedule(ir, { library: soprano, tempo: 60, countIn: false, startLine: 1, endLine: 3 });
  assert.deepStrictEqual(verse.bars.map((b) => b.chord), ['C', 'G']);
  const k = buildKaraoke(ir, verse, { startLine: 1, endLine: 3 });
  const timed = k.lines.filter((l) => l.kind === 'words' && l.start !== null).map((l) => l.line);
  assert.deepStrictEqual(timed, [2, 3]);
});



test('year: kept as a number, read from "c. 1848"', () => {
  assert.strictEqual(lib.normalizeYear('c. 1848'), 1848);
  assert.strictEqual(lib.normalizeYear('(1964)'), 1964);
  assert.strictEqual(lib.normalizeYear('soon'), '');
  assert.deepStrictEqual(lib.pickSongSettings({ song: { year: '1964 single' } }).song.year, 1964);
  assert.strictEqual(lib.pickSongSettings({ song: { year: 'x' } }).song.year, undefined);
});

test('starter songs come with artist, year and tags; old ones get them filled in', () => {
  const { addStarterSongs, fillStarterInfo } = require('../src/starters');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-starters-'));
  addStarterSongs(dir);
  const susanna = lib.readSongSettings(path.join(dir, 'Oh! Susanna')).song;
  assert.strictEqual(susanna.artist, 'Stephen Foster');
  assert.strictEqual(susanna.year, 1848);
  // an older starter without them
  const folder = path.join(dir, 'Clementine');
  const old = lib.readSongSettings(folder);
  delete old.song.artist; delete old.song.year; delete old.song.tags;
  lib.writeSongSettings(folder, old);
  assert.deepStrictEqual(fillStarterInfo(dir), ['Clementine']);
  assert.strictEqual(lib.readSongSettings(folder).song.year, 1884);
  assert.deepStrictEqual(fillStarterInfo(dir), []);
  fs.rmSync(dir, { recursive: true, force: true });
});


test('rewrite a song in a new key: chords and tab change, labels stay', () => {
  const rekey = require('../src/rekey');
  const keys = require('../src/keys');
  const text = '[[Verse 1]]\n{D-DU-UDU}\n[C]One [Am]two [] [*Coda] [G7/B]three\n```tab\nA|--0--|\nE|-----|\nC|-----|\nG|-----|\n```';
  const out = rekey.rewriteText(text, 5, { key: keys.parseKey('C') });
  assert.match(out, /\[\[Verse 1\]\]\n\{D-DU-UDU\}\n\[F\]One \[Dm\]two \[\] \[\*Coda\] \[C7\/E\]three/);
  assert.match(out, /A\|--5--/);
  const settings = rekey.rekeySettings({ song: { transpose: 5, key: 'C' }, versions: { list: '5:C:F,7:C:G' } }, 5, { chords: ['C', 'Am', 'G7'], key: keys.parseKey('C') });
  assert.strictEqual(settings.song.transpose, 0);
  assert.strictEqual(settings.song.key, 'F');
  assert.strictEqual(settings.versions.list, '-5:F:C,2:F:G');
});

test('setlist entries can name a key; renames follow', () => {
  assert.deepStrictEqual(setlists.parseEntry('Rainbow | +5'), { title: 'Rainbow', shift: 5 });
  assert.deepStrictEqual(setlists.parseEntry('Rainbow'), { title: 'Rainbow', shift: 0 });
  assert.strictEqual(setlists.formatEntry({ title: 'Rainbow', shift: -2 }), 'Rainbow | -2');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-rename-'));
  lib.createSong(dir, 'Rainbow', '--START MUSIC--\n[C]x\n--END MUSIC--\n', { versions: { list: '5:C:F' } });
  setlists.writeSetlist(dir, 'Gig', ['Rainbow', 'Rainbow | +5', 'Other']);
  const listed = lib.listSongs(dir)[0];
  assert.deepStrictEqual(listed.versions.map((v) => [v.semitones, v.name]), [[5, 'C to F (+5)']]);
  const song = lib.renameSong(path.join(dir, 'Rainbow'), 'Over the Rainbow');
  assert.strictEqual(song.title, 'Over the Rainbow');
  assert.ok(fs.existsSync(path.join(dir, 'Over the Rainbow', 'Over the Rainbow-song.txt')));
  assert.match(lib.readNotes(song.folder), /Renamed from "Rainbow"/);
  setlists.renameSongInSetlists(dir, 'Rainbow', 'Over the Rainbow');
  assert.deepStrictEqual(setlists.listSetlists(dir)[0].songs, ['Over the Rainbow', 'Over the Rainbow | +5', 'Other']);
  assert.throws(() => lib.renameSong(song.folder, 'A/B'));
  assert.strictEqual(lib.renameSong(song.folder, 'over the rainbow').title, 'over the rainbow');
  fs.rmSync(dir, { recursive: true, force: true });
});
console.log('All 4.1 tests passed.');
