// 4.39: Learn: the song's chord changes with what each finger does, the chord map, playing from
// memory (chords fading), numbers, another key, and the learn sheet in the song's learn folder.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const parse = require('../src/parser');
const learn = require('../src/learn');
const pr = require('../src/progressions');
const lc = require('../src/chord-library');
const keys = require('../src/keys');
const { buildSchedule } = require('../src/playback-schedule');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const lib = lc.getBuiltInLibrary('soprano');
const SONG = '--START MUSIC--\n{D-DU-UDU}\n[[Verse 1]]\n[C]One two [F]three four\n[C]five six [G7]seven [C]eight\n\n[[Chorus]]\n[G7]Nine ten [C]eleven\n[F]twelve [G7]thirteen [C]end\n\n[[Verse 2]]\n[C]One two [F]three four\n[C]five six [G7]seven [C]eight\n--END MUSIC--\n';
const ir = parse(SONG);

test('what each finger does in a change', () => {
  const m = learn.fingerMoves(lc.getChordDefinition(lib, 'C'), lc.getChordDefinition(lib, 'G7'));
  // C: ring finger A string 3rd fret. G7: index E1, middle C2, ring A2
  assert.deepStrictEqual(m.slide.map((x) => x.finger), [3]);
  assert.deepStrictEqual(m.add.map((x) => x.finger).sort(), [1, 2]);
  assert.strictEqual(m.stay.length + m.move.length + m.lift.length, 0);
  const tip = learn.changeTip(learn.fingerMoves(lc.getChordDefinition(lib, 'F'), lc.getChordDefinition(lib, 'G7')), 'GCEA'.split(''));
  assert.ok(/^Keep your index finger where it is \(E string, 1st fret\)/.test(tip), tip);
});

test("the song's changes: each direction counted, the hardest first", () => {
  const ch = learn.songChanges(ir, lib, { tuningName: 'GCEA' });
  const names = ch.map((c) => `${c.from}>${c.to}`);
  assert.ok(names.includes('C>F') && names.includes('F>C') && names.includes('G7>C') && names.includes('C>G7'));
  assert.strictEqual(ch.find((c) => c.from === 'C' && c.to === 'F').count, 3); // twice in the verses, once in the chorus
  for (let i = 1; i < ch.length; i += 1) assert.ok(ch[i - 1].score >= ch[i].score, 'sorted, hardest first');
  assert.ok(ch.every((c) => c.tip), 'every change has a tip');
  const unknown = learn.songChanges(parse('--START MUSIC--\n[C]a [Xyz7#]b\n--END MUSIC--\n'), lib);
  assert.ok(unknown.every((c) => c.missing || c.tip));
});

test('the chord map: each part once, bar by bar, a row per line, with numbers', () => {
  const a = pr.analyse(ir);
  const s = buildSchedule(ir, { library: lib, tempo: 100, beatsPerBar: 4 });
  const map = learn.chordMap(ir, s, a);
  assert.deepStrictEqual(map.parts.map((p) => [p.letter, p.times]), [['A', 2], ['B', 1]]);
  const verse = map.parts[0];
  assert.deepStrictEqual(verse.rows.flat().map((b) => b.chords.join(' ')), ['C', 'F', 'C', 'G7', 'C']);
  assert.deepStrictEqual(verse.rows.flat().map((b) => b.numerals.join(' ')), ['I', 'IV', 'I', 'V7', 'I']);
  assert.deepStrictEqual(verse.rows.map((r) => r.length), [2, 3], 'a row per line of the song');
  assert.deepStrictEqual(map.route.map((r) => r.letter), ['A', 'B', 'A']);
});

test('a bar with two chords is one bar in the map', () => {
  const two = parse('--START MUSIC--\n[[Riff]]\n| Dm:2 F G | C |\n--END MUSIC--\n');
  const s = buildSchedule(two, { library: lib, tempo: 100, beatsPerBar: 4 });
  assert.deepStrictEqual(learn.barsOf(s).map((b) => b.chords.join(' ')), ['Dm F G', 'C']);
});

test('playing from memory: chords after the first time, as numbers, or none', () => {
  const a = pr.analyse(ir);
  const rep = learn.fadePlan(ir, a, 'repeats');
  assert.strictEqual(rep.lines[4], 'show', 'verse 1 shows its chords');
  assert.strictEqual(rep.lines[8], 'show', 'the chorus, first time');
  assert.strictEqual(rep.lines[12], 'hide', 'verse 2: from memory');
  assert.strictEqual(learn.fadePlan(ir, a, 'numbers').lines[4], 'number');
  assert.strictEqual(learn.fadePlan(ir, a, 'none').lines[4], 'hide');
  assert.strictEqual(JSON.parse(JSON.stringify(rep)).lines[12], 'hide', 'a plain object: it crosses to the page');
});

test('numbers on the sheet, and the chords for another key', () => {
  const k = keys.parseKey('C');
  const n = learn.numberedIR(ir, k).filter((x) => x.type === 'chord').map((x) => x.content);
  assert.deepStrictEqual(n.slice(0, 4), ['I', 'IV', 'I', 'V7']);
  const legend = learn.keyLegend(['C', 'F', 'G7', 'Am'], k, keys.parseKey('G'));
  assert.deepStrictEqual(legend.map((l) => `${l.numeral}=${l.chord}`), ['I=G', 'IV=C', 'V7=D7', 'vi=Em']);
  const minor = learn.keyLegend(['Dm', 'G'], keys.parseKey('Dm'), keys.parseKey('Am'));
  assert.deepStrictEqual(minor.map((l) => l.chord), ['Am', 'D']);
});

test('the learn sheet: facts, the route, the chord map, shapes, changes and steps', () => {
  const a = pr.analyse(ir);
  const s = buildSchedule(ir, { library: lib, tempo: 100, beatsPerBar: 4 });
  const html = learn.learnSheetHtml({
    title: 'Test <Song>', facts: [['Key', 'C major'], ['Strum', 'D-DU-UDU'], ['Empty', '']],
    map: learn.chordMap(ir, s, a), shapes: [{ name: 'C', numeral: 'I', svg: '<svg></svg>' }],
    changes: learn.songChanges(ir, lib), patterns: [{ name: 'Three-chord trick', hint: 'one, four, five' }]
  });
  assert.ok(html.startsWith('<!doctype html>') && html.includes('<meta charset="utf-8">'));
  assert.ok(html.includes('Test &lt;Song&gt;'), 'escaped');
  assert.ok(html.includes('Key: <b>C major</b>') && !html.includes('Empty:'));
  assert.ok(/class="letter">A<\/span>Verse/.test(html) && html.includes('×2'));
  assert.ok(html.includes('Changes to practise') && html.includes('Trouble spots') && html.includes('Learn <b>A verse</b> first'));
});

test("the learn folder: beside exports, never a song's name, not copied with the song", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke439-'));
  const target = songs.writeLearn(tmp, 'Song (learn).html', '<p>x</p>');
  assert.strictEqual(target, path.join(tmp, 'learn', 'Song (learn).html'));
  assert.ok(fs.existsSync(target));
  assert.throws(() => songs.writeLearn(tmp, 'bad?.html', 'x'));
  assert.ok(!songs.validateSongTitle('Learn', tmp).ok, 'learn is not a song title');
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'src', 'libraries.js'), 'utf8').includes("['exports', 'learn', '.history']"));
  fs.rmSync(tmp, { recursive: true, force: true });
});
