// 4.34: ChordPro import of songbook marks, a folder of ChordPro files at once, ChordPro export
// that keeps ukemusic's shorthand, harmony lines, power chords, and leaving out common chords.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');
const { chordProToUkemusic, ukemusicToChordPro } = require('../src/chordpro');
const imp = require('../src/chordpro-import');
const lc = require('../src/chord-library');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const body = (cho) => chordProToUkemusic(cho).text.replace(/^--START MUSIC--\n|--END MUSIC--\n$/g, '').trim();

// ── Songbook marks: part of the song format (4.34) ──
const { chordLabel } = require('../src/song-syntax');
const { buildSchedule } = require('../src/playback-schedule');
const { rewriteText } = require('../src/rekey');
const chords = (text) => parse(text, { useDelimiters: false }).filter((n) => n.type === 'chord');
test('[C↓] [C↓↓] [Cv]: those strums, left to ring, shown as written', () => {
  const c = chords('[C↓]a [A↓↑]b [Cv]c [F!]d');
  assert.deepStrictEqual(c.map(chordLabel), ['C↓', 'A↓↑', 'C↓', 'F!']);
  assert.deepStrictEqual(c.map((n) => n.strokes), ['D', 'DU', 'D', 'D']);
  assert.ok(c.every((n) => n.stopped));
});
test('[x] [mute↓↓]: muted strums, a beat each; [.] and [G…]: keep going; [|] [/]: bars', () => {
  const ir = parse('[x] [mute↓↓] [.] [G…]la [|] [/]', { useDelimiters: false });
  const c = ir.filter((n) => n.type === 'chord');
  assert.deepStrictEqual(c.map(chordLabel), ['x', 'mute↓↓', 'G']);
  assert.deepStrictEqual(c.slice(0, 2).map((n) => [n.noChord, n.muted, n.beats]), [[true, 1, 1], [true, 2, 2]]);
  assert.strictEqual(ir.filter((n) => n.type === 'bar').length, 2);
  assert.deepStrictEqual(ir.flatMap((n) => n.warnings), []);
});
test('[Bm7.Am7]: two chords sharing the bar; Gs4, A7s4, Gs2, Dma7: short names', () => {
  const c = chords('[Bm7.Am7]a [Gs4]b [A7s4]c [Gs2]d [Dma7]e');
  assert.deepStrictEqual(c.map((n) => n.content), ['Bm7', 'Am7', 'Gsus4', 'A7sus4', 'Gsus2', 'Dmaj7']);
  assert.deepStrictEqual(c.slice(0, 2).map((n) => n.share), [0.5, 0.5]);
});
test('[x2] at the end of a line repeats it, like (x2)', () => {
  assert.strictEqual(parse('[C]la la [G]la [x2]', { useDelimiters: false }).find((n) => n.type === 'repeat').count, 2);
});
test('playing them: strokes spread over the bar and ringing; muted strums are chucks', () => {
  const s = buildSchedule(parse('[C↓↓]la [G↓]la\n[x] [mute↓↓] [F]la', { useDelimiters: false }), { library: lc.getBuiltInLibrary('soprano'), tempo: 60, beatsPerBar: 4, countIn: false });
  const ev = s.events.filter((e) => e.kind !== 'mute').map((e) => `${e.time}:${e.kind}${e.ring ? ':ring' : ''}`);
  assert.deepStrictEqual(ev, ['0:strum:ring', '2:strum:ring', '4:strum:ring', '8:chuck', '9:chuck', '10:chuck', '11:strum']);
});
test('changing key keeps the marks', () => {
  assert.strictEqual(rewriteText('[C↓] [A↓↓]la [Gs4]a [Dma7:2]b [Bm7.Am7]c [x] [G…]', 2), '[D↓] [B↓↓]la [Asus4]a [Emaj7:2]b [C#m7.Bm7]c [x] [A…]');
});
test('ChordPro: the marks come in as written and go out as written', () => {
  assert.strictEqual(body('{title: T}\n[C↓] la [A↓↓] la [x] [mute↓] [.] [G…]la [Gs4]a [Bm7.Am7]c [x2]'), '[C↓] la [A↓↓] la [x] [mute↓] [.] [G…]la [Gs4]a [Bm7.Am7]c [x2]');
  const cho = ukemusicToChordPro(parse('[C↓]la [x] [Bm7.Am7]c', { useDelimiters: false }), { title: 'T' });
  assert.ok(cho.includes('[C↓]la [x] [Bm7.Am7]c'), cho);
});
test('a word in brackets is a label; brackets as text', () => {
  assert.strictEqual(body('{title: T}\n[Riff 1] [C] [G]'), '[[Riff 1]] [C] [G]');
  assert.strictEqual(body('{title: T}\n[(][C] [G][)]'), '([C] [G])');
});
test('nothing left as unread [text] in a song full of marks', () => {
  const text = chordProToUkemusic('{title: T}\n[C↓] [G↓↓] [mute↓] [.] [Gs4] [Dma7] [Bm7.Am7] [Riff 2]\nla [Am]la [x3]').text;
  const left = parse(text).filter((n) => n.type === 'lyric' && /\[/.test(n.content));
  assert.deepStrictEqual(left, []);
});

// ── Directives ──
test('{start_of_x_intro} and friends are headings', () => {
  const t = body('{title: T}\n{start_of_x_intro: Intro}\n[C] [G]\n{end_of_x_intro}\n{start_of_x_solo}\n[F]\n{end_of_x_solo}');
  assert.ok(/^\[\[Intro\]\]\n\[C\] \[G\]\n\n\[\[Solo\]\]\n\[F\]$/.test(t), t);
});
test('a strum box becomes a strum; a named one is used again after its heading', () => {
  const cho = '{title: T}\n{start_of_strum: Verse}\n↓   × ↑   ↑ × ↑\n1 & 2 & 3 & 4 &\n{end_of_strum}\n{comment: Verse 1}\n[C]la\n{comment: Chorus}\n[F]la\n{comment: Verse 2}\n[C]la';
  const t = body(cho);
  assert.ok(t.startsWith('{Verse: D-XU-UXU}'), t);
  assert.strictEqual((t.match(/\[\[Verse \d\]\]\n\{Verse\}/g) || []).length, 2, t);
  assert.ok(!/\[\[Chorus\]\]\n\{/.test(t));
  // two bars that differ take turns; a box over two bars that are the same is one bar
  assert.strictEqual(body('{title: T}\n{start_of_strum}\n↓ ↑ ↓ ↑   ↓   ↓\n1 & 2 & 3 & 4 &\n{end_of_strum}'), '{DUDU-D-D}');
  assert.strictEqual(body('{title: T}\n{start_of_strum}\n↓   ↓     ↓ ↑ ↓\n1 2 3 4 | 1 2 3 4\n{end_of_strum}'), '{D-D- | DUD-}');
  assert.strictEqual(body('{title: T}\n{start_of_strum}\n↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑ ↓ ↑\n1 & 2 & 3 & 4 & 5 & 6 & 7 & 8 &\n{end_of_strum}'), '{DUDUDUDU}');
});
test('{x_voice: harmony} … {x_voice: lead} become {harmony} … {lead}', () => {
  assert.strictEqual(body('{title: T}\n[C]main\n{x_voice: harmony}\n[F]over\n{x_voice: lead}\n[G]main'), '[C]main\n{harmony}\n[F]over\n{lead}\n[G]main');
});
test('tags, Spotify and YouTube links, and baritone shapes come across', () => {
  const r = chordProToUkemusic('{title: T}\n{tag: 1970s}\n{tag: folk}\n{meta: spotify https://open.spotify.com/track/x}\n{meta: youtube https://www.youtube.com/watch?v=abc}\n{define: Am/C frets 2 0 0 3}\n{define-baritone: Am/C frets 2 2 1 0}\n[C]la');
  assert.deepStrictEqual(r.meta.tags, ['1970s', 'folk']);
  assert.deepStrictEqual(r.meta.links.map((l) => l.title), ['Spotify', 'YouTube']);
  const s = imp.importSettings(r.meta, 'soprano');
  assert.strictEqual(s.song.tags, '1970s, folk');
  assert.strictEqual(s.shapes.soprano, 'Am/C 2003');
  assert.strictEqual(s.shapes.baritone, 'Am/C 2210');
});
test('[N.C.] is kept (it used to be dropped)', () => {
  assert.strictEqual(body('{title: T}\n[C]la [N.C.] la'), '[C]la [N.C.] la');
});

// ── Export: ukemusic's shorthand as ChordPro notes, and back again ──
const SONG = '--START MUSIC--\n{Verse: D-DU-UDU}\n[[Verse 1]]\n[C x3]Oh Su[F]sanna, [Em:2]gone for[Am:2]ever (x2)\n| C | F | % | G7 C |\n[N.C.:2] [G]stop {stop}[C]here\n{stop}\n[G]line\n{harmony}\n[F]sung on top\n{lead}\n[[Chorus]]\n{D-DUDU | D-UU}\n[C]back\n[[Verse 2]]\n{Verse}\n[G]again\n--END MUSIC--\n';
test('export: annotations other apps print, not chords they can\'t read', () => {
  const cho = ukemusicToChordPro(parse(SONG), { title: 'T' });
  assert.ok(cho.includes('[C][*×3]Oh Su[F]sanna, [Em][*2 beats]gone'), cho);
  assert.ok(cho.includes('[N.C.][*2 beats]'));
  assert.ok(cho.includes('[*stop][C]here'));
  assert.ok(cho.includes('{x_voice: harmony}') && cho.includes('{x_voice: lead}'));
  assert.ok(!cho.includes('[|]'));
});
test('export and import again: nothing lost', () => {
  const back = chordProToUkemusic(ukemusicToChordPro(parse(SONG), { title: 'T' })).text;
  const norm = (x) => parse(x).filter((n) => n.type !== 'linebreak').map((n) => [n.type, n.content, n.bars || '', n.beats || '', n.stopped || '', n.harmony || '', n.stop || '', n.noChord || ''].join('/')).join(' ');
  assert.strictEqual(norm(back), norm(SONG));
});
test('a {stop} line comes back as {stop}, not a heading', () => {
  assert.strictEqual(body('{title: T}\n{comment: Stop: one strum, let it ring}\n[C]la'), '{stop}\n[C]la');
});

// ── Harmony lines ──
test('harmony lines are italic and marked; {harmony} and {lead} take no room', () => {
  const ir = parse('[C]main\n{harmony}\n[F]over the top\n{lead}\n[G]main', { useDelimiters: false });
  const lyrics = ir.filter((n) => n.type === 'lyric');
  assert.deepStrictEqual(lyrics.map((n) => Boolean(n.harmony)), [false, true, false]);
  assert.ok(lyrics[1].styles.every((s) => s & 2));
  assert.strictEqual(ir.filter((n) => n.type === 'linebreak').length, 3);
  assert.deepStrictEqual(ir.flatMap((n) => n.warnings), []);
  assert.ok(/<em>over(&nbsp;| )the(&nbsp;| )top<\/em>/.test(String(renderHtml(ir, {}))));
});

// ── Power chords ──
test('power chords: root and fifth only, low on the neck, every tuning', () => {
  const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const OPEN = { soprano: [7, 0, 4, 9], baritone: [2, 7, 11, 4], guitar: [4, 9, 2, 7, 11, 4] };
  for (const [inst, open] of Object.entries(OPEN)) {
    const lib = lc.getBuiltInLibrary(inst);
    for (const root of NOTES) {
      const d = lc.getChordDefinition(lib, `${root}5`);
      assert.ok(d, `${inst} ${root}5`);
      const heard = new Set(d.frets.map((f, i) => (f < 0 ? null : NOTES[(open[i] + f) % 12])).filter(Boolean));
      assert.deepStrictEqual([...heard].sort(), [root, NOTES[(NOTES.indexOf(root) + 7) % 12]].sort(), `${inst} ${root}5: ${d.frets}`);
      assert.ok(Math.max(...d.frets) <= 10, `${inst} ${root}5 high: ${d.frets}`);
    }
  }
  assert.deepStrictEqual(lc.getChordDefinition(lc.getBuiltInLibrary('soprano'), 'C5').frets, [0, 0, 3, 3]);
});

// ── Not the common chords ──
test('common chords can be left out of the diagrams; A# is Bb', () => {
  const ir = parse('[C]a [G]b [Am]c [F]d [Bbmaj7]e [A#]f [E7sus4]g', { useDelimiters: false });
  const count = (d) => (String(renderHtml(ir, { diagrams: { placement: 'song_start', ...d } })).match(/class="chord-diagram"/g) || []).length;
  assert.strictEqual(count({}), 7);
  assert.strictEqual(count({ skip_common: true }), 2);
  assert.strictEqual(count({ skip_common: 'true', common_chords: 'C, G' }), 5);
  assert.strictEqual(count({ skip_common: false }), 7);
});

// ── A folder of ChordPro files ──
test('a folder of ChordPro files: one song each, subfolders become setlists, nothing doubled', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke434-'));
  const src = path.join(tmp, 'club', 'songs');
  const lib = path.join(tmp, 'Library');
  fs.mkdirSync(path.join(src, 'Main book'), { recursive: true });
  fs.mkdirSync(path.join(src, '2026-05'), { recursive: true });
  fs.mkdirSync(lib);
  fs.writeFileSync(path.join(src, 'Main book', 'Clementine - Percy Montrose.cho'), '{title: Clementine}\n{artist: Percy Montrose}\n{key: C}\n{tag: folk}\n{meta: youtube https://www.youtube.com/watch?v=abc}\n[C↓]Oh my [G7]darling');
  fs.writeFileSync(path.join(src, 'Main book', 'Oh Susanna - Stephen Foster.cho'), '{artist: Stephen Foster}\n[C]I come from Ala[G7]bama');
  fs.writeFileSync(path.join(src, '2026-05', 'What Now - Someone.cho'), '{title: What Now?}\n[C]la');
  fs.writeFileSync(path.join(src, '2026-05', 'notes.txt'), 'not a song');
  const r = imp.importFolder(path.join(tmp, 'club', 'songs'), lib, { source: 'club' });
  assert.strictEqual(r.files, 3);
  assert.deepStrictEqual(r.added.sort(), ['Clementine', 'Oh Susanna', 'What Now']);
  assert.deepStrictEqual(r.setlists.map((s) => `${s.name}:${s.songs}`).sort(), ['2026-05:1', 'Main book:2']);
  const song = songs.readSong(path.join(lib, 'Clementine'));
  assert.ok(song.content.includes('[C↓]Oh my [G7]darling'));
  assert.strictEqual(song.settings.song.licence, 'personal');
  assert.strictEqual(song.settings.song.tags, 'folk');
  assert.strictEqual(song.settings.song.source, 'club');
  assert.strictEqual(song.links[0].title, 'YouTube');
  assert.ok(/title: Clementine/.test(song.chordPro));
  // again: nothing doubled
  const again = imp.importFolder(path.join(tmp, 'club', 'songs'), lib);
  assert.strictEqual(again.added.length, 0);
  assert.strictEqual(again.skipped.filter((s) => /already/.test(s.reason)).length, 3);
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log('All 4.34 tests passed.');
