// 4.32: printed output: labels written as words, a key to the shorthand, landmark section
// names on Stage, Stage without diagrams, exports that are out of date and why
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');
const notes = require('../src/print-notes');
const sf = require('../src/stage-formats');
const ex = require('../src/exports-map');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const kinds = (t) => parse(t).filter((n) => n.type !== 'linebreak').map((n) => `${n.type}:${n.content}`);

test('"Bridge (x2): [F] [Em]" is a label, so the chords line up', () => {
  assert.deepStrictEqual(kinds('Bridge (x2): [F] [Em]\n').slice(0, 2), ['structure:Bridge (x2):', 'chord:F']);
  assert.deepStrictEqual(kinds('Solo (x2): | C | G |\n'), ['structure:Solo (x2):', 'chord:C', 'chord:G']);
  assert.deepStrictEqual(kinds('Ending last time (slow):\n'), ['structure:Ending last time (slow):']);
  assert.deepStrictEqual(kinds('Chorus: I said hello\n'), ['lyric:Chorus: I said hello'], 'words after it: a lyric');
  assert.deepStrictEqual(kinds('Chorusline is [C]great\n')[0], 'lyric:Chorusline is ');
  const html = String(renderHtml(parse('Bridge (x2): [F] [Em] [Dm] [C]\n'), { layout: 'table' }));
  assert.ok(/inline-label[^>]*>Bridge \(x2\):<\/strong><\/td><td class="chord">F/.test(html), html.slice(0, 300));
});

test('a key to the shorthand the song uses, and only that', () => {
  const ir = parse('[C x2]la [F:1]la [G]la [] la {stop}[C]la\n[N.C.]\n| C | % |\nline (x2)\n');
  const used = notes.shorthandUsed(ir).map((u) => u.mark);
  assert.deepStrictEqual(used, ['C×2', 'F:1', '|', '%', '×2 at the end of a line', 'stop', 'N.C.']);
  assert.ok(/<strong>C×2<\/strong> = 2 bars of C/.test(notes.shorthandKeyHtml(ir)));
  assert.ok(/<strong>F:1<\/strong> = 1 beat of F/.test(notes.shorthandKeyHtml(ir)));
  assert.strictEqual(notes.shorthandKeyHtml(parse('[C]plain [G]song\n')), '');
});

test('Stage section names are landmarks: full size, bold, a bar at the left', () => {
  const css = sf.formatsCss();
  assert.ok(/data-stage-format="clear"\] \.section \{[^}]*font-weight: 800; font-size: var\(--stage-size\)[^}]*border-left: 0\.3em solid #000/.test(css));
  assert.ok(!/text-transform: uppercase/.test(css));
  const picked = songs.pickSongSettings({ export: { stage_diagrams: 'none' } });
  assert.strictEqual(picked.export.stage_diagrams, 'none');
  assert.strictEqual(songs.pickSongSettings({ export: { stage_diagrams: 'some' } }).export, undefined);
});

test('exports out of date: the song changed, another version made it, the look changed, the old name', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uke432-'));
  const folder = path.join(dir, 'Let It Be');
  fs.mkdirSync(folder);
  const song = path.join(folder, 'Let It Be-song.txt');
  fs.writeFileSync(song, '[C]x');
  const past = (Date.now() - 60000) / 1000;
  fs.utimesSync(song, past, past);
  const put = (rel) => { fs.mkdirSync(path.dirname(path.join(folder, 'exports', rel)), { recursive: true }); fs.writeFileSync(path.join(folder, 'exports', rel), 'x'); };
  for (const rel of ['Song/Let It Be_uke.pdf', 'Stage/Let It Be_uke (stage).pdf', 'Stage/Let It Be (Beatles)_uke (stage).pdf', 'Song/Let It Be (+2)_uke.pdf', 'Lyrics/Let It Be (lyrics).txt']) put(rel);
  ex.recordExports(folder, [
    { rel: 'Song/Let It Be_uke.pdf', details: { app: '4.32.0', kind: 'standard', look: 'aaa' } },
    { rel: 'Stage/Let It Be_uke (stage).pdf', details: { app: '4.32.0', kind: 'stage', look: 'sss' } },
    { rel: 'Song/Let It Be (+2)_uke.pdf', details: { app: '4.28.0', kind: 'standard', look: 'aaa' } }
  ]);
  const current = { app: '4.32.0', looks: { standard: 'aaa', stage: 'sss' } };
  const why = (map) => Object.fromEntries(map.groups.flatMap((g) => g.files).map((f) => [f.rel, f.reason]));
  let map = ex.listExports(folder, current);
  assert.deepStrictEqual(why(map), {
    'Song/Let It Be (+2)_uke.pdf': 'app',
    'Song/Let It Be_uke.pdf': '',
    'Stage/Let It Be (Beatles)_uke (stage).pdf': 'name',
    'Stage/Let It Be_uke (stage).pdf': '',
    'Lyrics/Let It Be (lyrics).txt': 'app'
  });
  assert.strictEqual(map.outOfDate, 3);
  map = ex.listExports(folder, { ...current, looks: { standard: 'aaa', stage: 'NEW' } });
  assert.strictEqual(why(map)['Stage/Let It Be_uke (stage).pdf'], 'look');
  assert.ok(/look changed/.test(map.groups.flatMap((g) => g.files).find((f) => f.reason === 'look').why));
  // without the current app (as before 4.32): only the song's changes and old names count
  assert.strictEqual(ex.listExports(folder).outOfDate, 1);
  fs.utimesSync(song, Date.now() / 1000 + 5, Date.now() / 1000 + 5);
  assert.strictEqual(ex.listExports(folder, current).outOfDate, 5);
  fs.rmSync(dir, { recursive: true, force: true });
});
