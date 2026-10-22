// 4.21: chord patterns (I IV V…), the archive, the sheet without the feel
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const parse = require('../src/parser');
const keys = require('../src/keys');
const pr = require('../src/progressions');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const C = keys.parseKey('C');
const Am = keys.parseKey('Am');

test('chords as numbers in the key', () => {
  assert.deepStrictEqual(['C', 'Dm', 'Em', 'F', 'G7', 'Am', 'Bdim', 'Bb', 'Cmaj7', 'D7', 'Fm', 'Bm7b5'].map((c) => pr.numeral(c, C)),
    ['I', 'ii', 'iii', 'IV', 'V7', 'vi', 'vii°', 'bVII', 'Imaj7', 'II7', 'iv', 'viiø7']);
  assert.deepStrictEqual(['Am', 'C', 'Dm', 'E7', 'F', 'G'].map((c) => pr.numeral(c, Am)), ['i', 'III', 'iv', 'V7', 'VI', 'VII']);
});
test('familiar progressions are named (rotations once)', () => {
  const named = (song) => pr.analyse(parse(`[[V]]\n${song}`)).sections[0].patterns.map((p) => p.name);
  assert.deepStrictEqual(named('[C]a [G]b [Am]c [F]d'), ['Four-chord pop']);
  assert.deepStrictEqual(named('[G]a [Em]b [C]c [D]d'), ['50s / doo-wop']);
  assert.deepStrictEqual(named('[C]a [F]b [G7]c [C]d'), ['Three-chord trick']);
  assert.deepStrictEqual(named('[Am]a [G]b [F]c [E]d'), ['Andalusian (minor)']);
  assert.deepStrictEqual(named('[C]a [Bb]b [F]c [C]d'), ['Rock (bVII)']);
});
test('sections with the same progression share a letter; lines repeated straight after are ×2', () => {
  const song = '[[Verse 1]]\n[C]a [F]b\n[C]a [F]b\n[G7]c [C]d\n[[Chorus]]\n[F]x [C]y\n[G]z [C]w\n[[Verse 2]]\n[C]a [F]b\n[C]a [F]b\n[G]c [C]d\n';
  const r = pr.analyse(parse(song));
  assert.deepStrictEqual(r.sections.map((s) => `${s.name}:${s.letter}`), ['Verse 1:A', 'Chorus:B', 'Verse 2:A']);
  assert.strictEqual(r.shape, 'Verse 1 → Chorus → Verse 2');
  assert.deepStrictEqual(r.parts.map((p) => `${p.letter} ${p.name} ×${p.times}`), ['A Verse ×2', 'B Chorus ×1']);
  assert.deepStrictEqual(r.sections[0].lines, ['I – IV ×2', 'V7 – I']);
  assert.ok(r.summary.some((l) => /only 2 different chord patterns/.test(l)));
  assert.ok(r.summary.some((l) => /three-chord trick/.test(l)));
  const text = pr.analysisText(r, keys.describeKey);
  assert.ok(text.startsWith('Chord patterns (in C major)\nThe song: Verse 1 → Chorus → Verse 2\nA Verse (×2): '), text);
});
test('4.23: no headings: blank lines split the song; same words each time is the chorus', () => {
  const song = '[C]I come from Alabama, [Am]banjo on my knee\n[G]going to Lou[F]isiana, my [C]true love\n\n[C]Oh Susanna, oh don\'t you [G]cry for me\n[Am]I come from Ala[F]bama\n\n[C]It rained all night the [Am]day I left\n[G]the weather it was [F]dry, the [C]sun\n\n[C]Oh Susanna, oh don\'t you [G]cry for me\n[Am]I come from Ala[F]bama\n';
  const r = pr.analyse(parse(song));
  assert.deepStrictEqual(r.parts.map((p) => `${p.letter} ${p.name} ×${p.times}`), ['A Verse ×2', 'B Chorus ×2']);
  assert.strictEqual(r.shape, 'Verse → Chorus → Verse → Chorus');
  assert.deepStrictEqual(r.parts[1].patterns.map((p) => p.name), ['Four-chord pop']);
});
test('4.23: without words, the parts still come out (by chords)', () => {
  const r = pr.analyse(parse('| C | Am | F | G |\n| C | Am | F | G |\n\n| F | C | G | C |\n\n| C | Am | F | G |\n'));
  assert.deepStrictEqual(r.parts.map((p) => `${p.letter} ×${p.times}`), ['A ×2', 'B ×1']);
  assert.ok(/I – vi – IV – V \(×2\)/.test(r.parts[0].chordsText), r.parts[0].chordsText);
});
test('4.23: a heading on a line of chords (Intro:) doesn\'t rename the verses that share them', () => {
  const r = pr.analyse(parse('[[Intro:]] [C] [Am] [F] [G] [C]\n\n[C]In a cavern, [Am]in a canyon\n[F]excavating [G]for a [C]mine\n\n[C]Dwelt a miner, [Am]forty-niner\n[F]and his [G]daughter Clemen[C]tine\n'));
  assert.strictEqual(r.parts[0].name, 'Verse');
  assert.deepStrictEqual(r.parts[0].alsoIn, ['Intro']);
});
test('4.23: a guessed key prefers the chord the song starts and ends on', () => {
  const r = pr.analyse(parse('[D]a [G]b [D]c [A]d\n\n[C]e [G]f [D]g\n\n[F]h [C]i [F]j [A]k [A7]l\n\n[D]a [G]b [D]c\n'));
  assert.strictEqual(r.key.name, 'D');
});
test('the archive: put away, listed, brought back', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke-'));
  const song = path.join(dir, 'Rainbow');
  fs.mkdirSync(song);
  fs.writeFileSync(path.join(song, 'Rainbow-song.txt'), '[C]x');
  const { folder } = songs.archiveSong(song);
  assert.strictEqual(folder, path.join(dir, 'Archived songs', 'Rainbow'));
  assert.deepStrictEqual(songs.listSongs(dir).map((s) => s.title), []);
  assert.deepStrictEqual(songs.listArchived(dir).map((s) => s.title), ['Rainbow']);
  fs.mkdirSync(song);
  fs.writeFileSync(path.join(song, 'Rainbow-song.txt'), '[G]y');
  assert.throws(() => songs.restoreSong(folder), /already a song called "Rainbow"/);
  assert.strictEqual(songs.archiveSong(song).folder, path.join(dir, 'Archived songs', 'Rainbow (2)'));
  songs.restoreSong(folder);
  assert.deepStrictEqual(songs.listSongs(dir).map((s) => s.title), ['Rainbow']);
  fs.rmSync(dir, { recursive: true, force: true });
});
