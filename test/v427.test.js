// 4.27: ChordPro fields kept with the song (chordpro.txt), the song's own values win on export
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const parse = require('../src/parser');
const cp = require('../src/chordpro');
const fields = require('../src/chordpro-fields');
const songs = require('../src/song-library');
const libs = require('../src/libraries');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const FILE = '# from a website\n{t: Scarborough Fair }\n{st:Paul Simon}\n{sorttitle: Scarborough}\n{copyright: Traditional}\n{duration: 3:10}\n{tempo: 92}\n{capo: 2}\n{meta: source Folk book}\n{meta: artist Simon & Garfunkel}\n{x_mine: kept}\n{textfont: Georgia}\n{new_page}\n\n{soc}\n[Am]Are you going to [G]Scarborough [Am]Fair\n{eoc}\n';

test('import keeps every field and the other lines', () => {
  const r = cp.chordProToUkemusic(FILE);
  const kept = fields.parseFields(r.kept);
  const get = (n) => fields.valueOf(kept.fields, n);
  assert.strictEqual(get('title'), 'Scarborough Fair');
  assert.strictEqual(get('subtitle'), 'Paul Simon');
  assert.strictEqual(get('copyright'), 'Traditional');
  assert.strictEqual(get('duration'), '3:10');
  assert.strictEqual(get('source'), 'Folk book');
  assert.strictEqual(get('x_mine'), 'kept');
  assert.deepStrictEqual(kept.other, ['# from a website', '{textfont: Georgia}', '{new_page}']);
  // and the meta ukemusic uses straight away
  assert.strictEqual(r.meta.subtitle, 'Paul Simon');
  assert.strictEqual(r.meta.tempo, '92');
  assert.strictEqual(r.meta.artist, 'Simon & Garfunkel');
  assert.ok(!/textfont|new_page/.test(r.text), 'formatting lines are kept, not put in the song');
});

test('chordpro.txt: standard fields in order, {meta} for the rest, other lines last', () => {
  const text = fields.formatFields({ fields: [{ name: 'source', value: 'x' }, { name: 'artist', value: 'A' }, { name: 'title', value: 'T' }, { name: 'x_a', value: 'b' }, { name: 'empty', value: '' }], other: ['# c'] });
  assert.strictEqual(text, '{title: T}\n{artist: A}\n{meta: source x}\n{x_a: b}\n# c\n');
  assert.deepStrictEqual(fields.parseFields(text), { fields: [{ name: 'title', value: 'T' }, { name: 'artist', value: 'A' }, { name: 'source', value: 'x' }, { name: 'x_a', value: 'b' }], other: ['# c'] });
  assert.strictEqual(fields.formatFields({}), '');
  assert.strictEqual(fields.beatsFromTime('6/8'), 6);
  assert.strictEqual(fields.beatsFromTime('5/4'), null);
});

test('export: the song\'s own values win, kept fields fill in, nothing is lost', () => {
  const r = cp.chordProToUkemusic(FILE);
  const out = cp.ukemusicToChordPro(parse(r.text), { title: 'Scarborough Fair', artist: 'Simon & Garfunkel', tempo: 100, key: 'Am', kept: r.kept });
  assert.ok(out.startsWith('{title: Scarborough Fair}\n{sorttitle: Scarborough}\n{subtitle: Paul Simon}\n{artist: Simon & Garfunkel}\n{copyright: Traditional}\n{key: Am}\n{capo: 2}\n{tempo: 100}\n{duration: 3:10}\n{meta: source Folk book}\n{x_mine: kept}\n# from a website\n{textfont: Georgia}\n{new_page}\n'), out);
  assert.ok(/\{start_of_chorus: Chorus\}\n\[Am\]Are you going/.test(out));
  // and back in again: the same fields
  const again = cp.chordProToUkemusic(out);
  const back = fields.parseFields(again.kept).fields.map((f) => f.name);
  for (const f of fields.parseFields(r.kept).fields) assert.ok(back.includes(f.name), `${f.name} came back`);
  assert.deepStrictEqual(fields.parseFields(again.kept).other, fields.parseFields(r.kept).other);
});

test('a saved key\'s export says which key in the subtitle, unless the song has a subtitle', () => {
  const ir = parse('[C]la\n');
  assert.ok(/\{subtitle: C to F \(\+5\)\}/.test(cp.ukemusicToChordPro(ir, { title: 'X', keyLabel: 'C to F (+5)' })));
  assert.ok(/\{subtitle: Paul Simon\}/.test(cp.ukemusicToChordPro(ir, { title: 'X', keyLabel: 'C to F (+5)', kept: '{subtitle: Paul Simon}\n' })));
  assert.ok(!/C to F/.test(cp.ukemusicToChordPro(ir, { title: 'X', keyLabel: 'C to F (+5)', kept: '{subtitle: Paul Simon}\n' })));
});

test('kept with the song, and travels in library packs', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke427-'));
  const folder = songs.createSong(tmp, 'Scarborough Fair', '[Am]Are you going').folder;
  assert.strictEqual(songs.readSong(folder).chordPro, '');
  songs.writeChordPro(folder, '{subtitle: Paul Simon}');
  assert.strictEqual(songs.readSong(folder).chordPro, '{subtitle: Paul Simon}\n');
  const pack = libs.exportPack(tmp, path.join(tmp, 'p.ukelib'));
  const opened = libs.importPack(pack.file, { parent: fs.mkdtempSync(path.join(os.tmpdir(), 'uke427b-')) });
  assert.strictEqual(songs.readChordPro(path.join(opened.folder, 'Scarborough Fair')), '{subtitle: Paul Simon}\n');
  songs.writeChordPro(folder, '  ');
  assert.ok(!fs.existsSync(path.join(folder, 'chordpro.txt')), 'nothing kept: no file');
});
