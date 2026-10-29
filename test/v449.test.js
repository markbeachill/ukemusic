// 4.49: key changes: {key: A} in the song, Learn counting in the new key, a change it can see
// that isn't written, and the chord that leads into it.
const assert = require('assert');
const { parse } = require('../src/parser');
const p = require('../src/progressions');
const learn = require('../src/learn');
const renderHtml = require('../src/renderer-html');
const { transposeIR } = require('../src/transpose');
const { rewriteText } = require('../src/rekey');
const { buildSchedule } = require('../src/playback-schedule');
const { ukemusicToChordPro, chordProToUkemusic } = require('../src/chordpro');
const { buildKaraoke } = require('../src/karaoke');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const VERSES = (kc) => `--START MUSIC--
[[Verse 1]]
[Gx3]a b
c [G7]d
[Cx2]e [Gx2]f
[D7x2]g [Gx2]h
[[Verse 2]]
[Gx3]a b
c [G7]d
[Cx2]e [Gx2]f
[D7x2]g [G]h
[E7]
${kc ? '{key: A}\n' : ''}[[Verse 3]]
[Ax3]a b
c [A7]d
[Dx2]e [Ax2]f
[E7x2]g [Ax2]h
[[Verse 4]]
[Ax3]a b
c [A7]d
[Dx2]e [Ax2]f
[E7x2]g [Ax2]h
--END MUSIC--
`;

test('{key: A} is a key change: a node of its own, a mark on the sheet, no strum', () => {
  const ir = parse(VERSES(true));
  const kc = ir.filter((n) => n.type === 'keychange');
  assert.deepStrictEqual(kc.map((n) => n.content), ['A']);
  assert.ok(!ir.some((n) => n.type === 'rhythm'));
  assert.deepStrictEqual(parse('--START MUSIC--\n{key: bb minor}\n[Bbm]a\n--END MUSIC--\n').filter((n) => n.type === 'keychange').map((n) => n.content), ['Bbm']);
  const html = renderHtml(ir, {});
  assert.ok(html.includes('class="key-change">Key change: <b>A</b>'));
  assert.ok(html.indexOf('Key change') < html.indexOf('Verse 3') && html.indexOf('Key change') > html.indexOf('Verse 2'));
  assert.strictEqual((html.match(/<section/g) || []).length, (html.match(/<\/section>/g) || []).length);
  // playing it: the same bars as without
  assert.strictEqual(buildSchedule(ir, { countIn: false }).bars.length, buildSchedule(parse(VERSES(false)), { countIn: false }).bars.length);
});

test('it moves with the key: transposing, rewriting in another key, ChordPro out and in, karaoke', () => {
  const ir = transposeIR(parse(VERSES(true)), 2, { spelling: 'key' });
  assert.deepStrictEqual(ir.filter((n) => n.type === 'keychange').map((n) => n.content), ['B']);
  assert.ok(rewriteText(VERSES(true), -2).includes('{key: G}'));
  const cho = ukemusicToChordPro(parse(VERSES(true)), { title: 'T', key: 'G' });
  assert.ok(/\{key: A\}/.test(cho), cho.slice(0, 300));
  const back = chordProToUkemusic(cho);
  assert.ok(back.text.includes('{key: A}') && back.meta.key === 'G', back.text.slice(0, 200));
  const k = buildKaraoke(parse(VERSES(true)), buildSchedule(parse(VERSES(true)), { countIn: false }), {});
  assert.ok(k.lines.some((l) => l.kind === 'heading' && l.label === 'Key change: A'));
});

test('Learn counts after the change in the new key: verse 3 is verse 1, a tone up', () => {
  const a = p.analyse(parse(VERSES(true)), {});
  assert.strictEqual(a.key.name, 'G');
  assert.deepStrictEqual(a.keyChanges.map((c) => [c.key.name, c.name, c.move, Boolean(c.detected)]), [['A', 'Verse 3', 'up a tone', false]]);
  const v1 = a.sections.find((s) => s.name === 'Verse 1');
  const v3 = a.sections.find((s) => s.name === 'Verse 3');
  assert.strictEqual(v3.letter, v1.letter);
  assert.ok(a.summary.some((s) => /changes key: up a tone to A at Verse 3\. Verse 3 is Verse 1's chords/.test(s)), a.summary.join(' / '));
  assert.ok(a.summary.some((s) => /^E7, just before it, is the five of A/.test(s)));
  assert.strictEqual(a.chords.find((c) => c.chord === 'E7' && c.inKey === undefined) ? 'G' : 'A', 'G');   // E7 first comes in G (VI7)
  assert.strictEqual(a.chords.find((c) => c.chord === 'A').numeral, 'I');
  const map = learn.chordMap(parse(VERSES(true)), buildSchedule(parse(VERSES(true)), { countIn: false }), a);
  assert.ok(map.parts.every((x) => x.rows.flat().every((b) => !b.numerals.includes('II'))), 'no A counted as II');
});

test('not written: Learn sees it and says where to write it', () => {
  const a = p.analyse(parse(VERSES(false)), {});
  assert.deepStrictEqual(a.keyChanges.map((c) => [c.key.name, c.name, c.detected]), [['A', 'Verse 3', true]]);
  assert.ok(a.summary.some((s) => /seems to move up a tone to A at Verse 3\. Write \{key: A\}/.test(s)), a.summary.join(' / '));
  // a bridge in another key that comes back is no key change
  const away = p.analyse(parse('--START MUSIC--\n[[Verse]]\n[C]a [F]b [G]c [C]d\n[[Bridge]]\n[E]a [A]b [B7]c [E]d\n[[Verse]]\n[C]a [F]b [G]c [C]d\n--END MUSIC--\n'), {});
  assert.deepStrictEqual(away.keyChanges, []);
  // songs in one key: nothing
  assert.deepStrictEqual(p.analyse(parse('--START MUSIC--\n[[Verse]]\n[C]a [F]b [G]c [C]d\n[[Chorus]]\n[F]a [C]b [G]c [C]d\n--END MUSIC--\n'), {}).keyChanges, []);
});

test('lines that take no room ({melody}) don\'t split a part', () => {
  const a = p.analyse(parse('--START MUSIC--\n[[Verse]]\n{melody: E E F G}\n[C]a [G]b\n{melody: G F E D}\n[C]c [G]d\n--END MUSIC--\n'), {});
  assert.strictEqual(a.sections.length, 1);
});
