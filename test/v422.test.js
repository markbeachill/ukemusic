// 4.22: the Exports tab's map of a song's exports, and the export record
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ex = require('../src/exports-map');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('exports listed by folder (Song, keys, Stage, Lyrics), with how they were made and what is out of date', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke-'));
  const song = path.join(dir, 'Rainbow-song.txt');
  fs.writeFileSync(song, '[C]x');
  const old = (Date.now() - 60000) / 1000;
  fs.utimesSync(song, old, old);
  const put = (rel, text = 'x') => { fs.mkdirSync(path.dirname(path.join(dir, 'exports', rel)), { recursive: true }); fs.writeFileSync(path.join(dir, 'exports', rel), text); };
  for (const rel of ['Lyrics/Rainbow (lyrics).txt', 'Stage/Rainbow_uke (stage).pdf', 'C to D (+2)/Rainbow (+2)_uke.pdf', 'Song/Rainbow_uke.html', 'Song/Rainbow_uke.cho']) put(rel);
  ex.recordExports(dir, [{ rel: 'Stage/Rainbow_uke (stage).pdf', details: { style: 'Stage style', key: 'Original key (C)', page: 'A4', sections: 'hide' } }]);
  let map = ex.listExports(dir);
  assert.deepStrictEqual(map.groups.map((g) => g.name), ['Song', 'C to D (+2)', 'Stage', 'Lyrics']);
  assert.strictEqual(map.count, 5);
  assert.strictEqual(map.outOfDate, 0);
  const stage = map.groups[2].files[0];
  assert.strictEqual(stage.kind, 'pdf');
  assert.strictEqual(ex.madeText(stage.made), 'Stage style · Original key (C) · A4 · section names hidden');
  assert.deepStrictEqual(map.groups[0].files.map((f) => f.kind), ['text', 'html']);
  fs.utimesSync(song, Date.now() / 1000 + 5, Date.now() / 1000 + 5); // the song changed after
  map = ex.listExports(dir);
  assert.strictEqual(map.outOfDate, 5);
  assert.ok(!map.groups.some((g) => g.files.some((f) => f.name === 'export-log.json')));
  fs.rmSync(dir, { recursive: true, force: true });
});
test('no exports: an empty map', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke-'));
  assert.deepStrictEqual(ex.listExports(dir).groups, []);
  fs.rmSync(dir, { recursive: true, force: true });
});
