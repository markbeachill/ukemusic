// 4.5: song shorthand ([C x3], bar lines, (x2), named / alternating strums, {stop}),
// the Inline and Chords-only layouts, and the writing guide
const assert = require('assert');
const parse = require('../src/parser');
const syntax = require('../src/song-syntax');
const { buildSchedule } = require('../src/playback-schedule');
const { buildKaraoke } = require('../src/karaoke');
const renderHtml = require('../src/renderer-html');
const renderMarkdown = require('../src/renderer-markdown');
const { lyricsBlocks } = require('../src/renderer-lyrics');
const chordpro = require('../src/chordpro');
const { rewriteText } = require('../src/rekey');
const { transposeIR } = require('../src/transpose');
const { wrapLines } = require('../src/line-wrap');
const { renderStrum } = require('../src/strum-box');
const guide = require('../src/guide');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
const plan = (text, opts = {}) => buildSchedule(parse(text), { tempo: 60, countIn: false, ...opts });
const chords = (s) => s.bars.map((b) => b.chord + (b.share ? '½' : '')).join(' ');

// ── [C x3] ──
test('[C x3] is C for three bars', () => {
  const ir = parse('[C x3]la [G]la');
  const c = ir.find((n) => n.type === 'chord');
  assert.strictEqual(c.content, 'C');
  assert.strictEqual(c.bars, 3);
  assert.strictEqual(chords(plan('[C x3]la [G]la')), 'C C C G');
  assert.strictEqual(chords(plan('[C×2]')), 'C C');
  assert.ok(!ir.some((n) => n.warnings.length), 'no warnings');
});
test('[C x3] is shown C×3 and keeps the words lined up', () => {
  const html = renderHtml(parse('[C x3]come [G]home'));
  assert.ok(html.includes('<span class="chord">C×3</span>'));
  assert.ok(renderMarkdown(parse('[C x3]come [G]home')).includes('C×3'));
});
test('[C x3] changes key with the song', () => {
  const ir = transposeIR(parse('[C x3]la'), 2);
  assert.strictEqual(ir.find((n) => n.type === 'chord').content, 'D');
  assert.strictEqual(rewriteText('[C x3]la [Am x2]', 2), '[D x3]la [Bm x2]');
});
test('[Cx] and [C x99] are not chords', () => {
  assert.strictEqual(syntax.parseChordToken('Cx'), null);
  assert.strictEqual(syntax.parseChordToken('C x99'), null);
  assert.deepStrictEqual(syntax.parseChordToken('Am7 x4'), { name: 'Am7', bars: 4 });
});

// ── Bar lines ──
test('a bar line is read as bars', () => {
  assert.deepStrictEqual(syntax.parseGridLine('| C | F | % | G7 C |'), [['C'], ['F'], ['%'], ['G7', 'C']]);
  assert.deepStrictEqual(syntax.parseGridLine('||: Am | G :||'), [['Am'], ['G']]);
  assert.strictEqual(syntax.parseGridLine('| hello | there |'), null);
  assert.strictEqual(syntax.parseGridLine('A|---0---|'), null, 'tab is not a bar line');
  assert.strictEqual(syntax.parseGridLine('| % | C |'), null, 'nothing to repeat');
  assert.strictEqual(syntax.parseGridLine('| C | | F |'), null, 'empty bar');
});
test('bar line playback: one bar each, shared bars split, % repeats the bar', () => {
  const s = plan('{D-DU-UDU}\n| C | G7 C | % | F |');
  assert.strictEqual(chords(s), 'C G7½ C½ G7½ C½ F');
  assert.deepStrictEqual(s.bars.map((b) => b.duration), [4, 2, 2, 2, 2, 4]);
  // each chord starts the pattern afresh: the second half of the bar plays D-DU too
  const half = s.events.filter((e) => e.time >= 6 && e.time < 8).map((e) => e.direction[0]).join('');
  assert.strictEqual(half, 'ddu');
});
test('a split bar with a pattern that doesn\'t halve: one strum a beat', () => {
  const s = plan('{DDD}\n| C G |', { beatsPerBar: 4 });
  assert.strictEqual(s.events.length, 4);
});
test('bar line with a label: label kept, bars drawn evenly', () => {
  const ir = parse('[[Intro]] | C | Am F |');
  assert.strictEqual(ir[0].type, 'structure');
  const html = renderHtml(ir);
  assert.ok(html.includes('<strong class="inline-label"'));
  assert.ok(html.includes('class="chord-grid"'));
  assert.strictEqual(renderMarkdown(ir).split('\n')[1], 'Intro | C | Am F |');
});
test('bar lines change key (view and rewrite)', () => {
  assert.deepStrictEqual(transposeIR(parse('| C | G7 C |'), 2).filter((n) => n.type === 'chord').map((n) => n.content), ['D', 'A7', 'D']);
  assert.strictEqual(rewriteText('[[Intro]] | C | % | G7 C | (x2)', 2), '[[Intro]] | D | % | A7 D | (x2)');
});
test('karaoke: a bar line has a piece per bar', () => {
  const ir = parse('| C | G C | % | F |');
  const k = buildKaraoke(ir, buildSchedule(ir, { tempo: 60, countIn: false }));
  const line = k.lines[0];
  assert.ok(line.grid);
  assert.deepStrictEqual(line.pieces.map((p) => `${p.chord}:${p.start}-${p.end}`), ['C:0-4', 'G:4-6', 'C:6-8', '%:8-12', 'F:12-16']);
});
test('bar lines are not split for printing', () => {
  const ir = parse('| C | F | G | Am | F | C | G | C | Dm | G7 |');
  assert.strictEqual(wrapLines(ir, 12).filter((n) => n.type === 'linebreak').length, 1);
});

// ── (x2) ──
test('(x2) plays a line twice and is shown ×2', () => {
  assert.deepStrictEqual(syntax.splitRepeat('la la (x2)'), { text: 'la la', count: 2 });
  assert.deepStrictEqual(syntax.splitRepeat('la la (3x)'), { text: 'la la', count: 3 });
  assert.strictEqual(syntax.splitRepeat('(x2)').count, 1, 'nothing to repeat');
  assert.strictEqual(chords(plan('[C]la [G]la (x2)\n[F]end')), 'C G C G F');
  assert.ok(renderHtml(parse('[C]la [G]la (x2)')).includes('class="repeat-mark">×2'));
  assert.strictEqual(lyricsBlocks(parse('[C]la [G]la (x2)'))[0].text, 'la la (x2)');
});
test('karaoke shows a repeated line again', () => {
  const ir = parse('[C]la [G]la (x2)\n[F]end');
  const k = buildKaraoke(ir, buildSchedule(ir, { tempo: 60, countIn: false }));
  const words = k.lines.filter((l) => l.kind === 'words');
  assert.strictEqual(words.length, 3);
  assert.strictEqual(words[1].pass, 2);
  assert.strictEqual(words[1].start, 8);
});
test('[[Chorus]] (x2) is still a label, not a repeat', () => {
  assert.ok(!parse('[[Chorus]] (x2)').some((n) => n.type === 'repeat'));
});
test('ChordPro export keeps the shorthand readable', () => {
  const out = chordpro.ukemusicToChordPro(parse('[[Intro]] | C | G7 C | % |\nI [C x2]come (x2)'));
  assert.ok(out.includes('[*Intro] | [C] | [G7] [C] | % |'));
  assert.ok(out.includes('I [C][|]come (x2)'));
});

// ── Named strums ──
test('a named strum is used again by its name', () => {
  const ir = parse('{A: D-DU-UDU}\n[C]x\n{B: DUDU}\n[F]y\n{a}\n[G]z');
  const r = ir.filter((n) => n.type === 'rhythm');
  assert.deepStrictEqual(r.map((n) => [n.strumName, n.content, Boolean(n.recall)]), [['A', 'D-DU-UDU', false], ['B', 'DUDU', false], ['A', 'D-DU-UDU', true]]);
  assert.deepStrictEqual(plan('{A: D-DU-UDU}\n[C]x\n{B: DUDU}\n[F]y\n{a}\n[G]z').bars.map((b) => b.pattern), ['D-DU-UDU', 'DUDU', 'D-DU-UDU']);
});
test('a name can be defined after it is used, and carry a time', () => {
  const s = plan('{W}\n[C]x\n{W: 3/4 D-DUDU}');
  assert.strictEqual(s.bars[0].beats, 3);
});
test('an unknown strum name is a warning and plays nothing odd', () => {
  const ir = parse('{Chorus}\n[C]x');
  assert.ok(ir[0].warnings[0].includes('no strum called "Chorus"'));
  assert.strictEqual(plan('{Chorus}\n[C]x').bars[0].pattern, 'D>DDD');
});
test('D, U, X and stop can\'t be names; "3/4 D" isn\'t a name', () => {
  assert.strictEqual(syntax.strumDefinition('D: DU'), null);
  assert.strictEqual(syntax.strumDefinition('stop: D'), null);
  assert.strictEqual(syntax.strumDefinition('3/4 D-DUDU'), null);
  assert.deepStrictEqual(syntax.strumDefinition('Verse: D-DU'), { name: 'Verse', pattern: 'D-DU' });
});
test('sheet: named box, small tag for a reuse, a key for two or more', () => {
  const html = renderHtml(parse('{A: D-DU-UDU}\n{B: DUDU}\n{A}'), { strumStyle: 'comic' });
  assert.ok(html.includes('STRUM A') || html.includes('Strum A'));
  assert.ok(html.includes('strum-recall'));
  assert.ok(html.includes('class="strum-legend'));
  assert.ok(!renderHtml(parse('{A: D-DU-UDU}\n{A}'), { strumStyle: 'comic' }).includes('class="strum-legend'), 'one name: no key');
  assert.ok(renderHtml(parse('{A: DU}\n{A}'), { strumStyle: 'plain' }).includes('Strum A'));
});

// ── Bars that take turns ──
test('{P | Q} alternates bar by bar, restarting at each new pattern', () => {
  const s = plan('{DD | DUDU}\n[C x3]\n[G]\n{D}\n[F]');
  assert.deepStrictEqual(s.bars.map((b) => b.pattern), ['DD', 'DUDU', 'DD', 'DUDU', 'D']);
  const box = renderStrum('D-DU-UDU | D-DUDU', { style: 'comic', beats: 4 });
  assert.ok(box.includes('bar 1') && box.includes('bar 2'));
});

// ── {stop} ──
test('{stop}: one strum on the next chord, then the strum carries on', () => {
  const s = plan('{DUDU}\n[C]a\n{stop}\n[G x2]b\n[F]c');
  assert.deepStrictEqual(s.bars.map((b) => b.pattern), ['DUDU', 'D', '-', 'DUDU']);
  assert.strictEqual(s.events.filter((e) => e.time >= 4 && e.time < 12).length, 1);
});
test('{stop} in the words is shown on its chord', () => {
  const ir = parse('my banjo on my {stop}[C]knee');
  assert.ok(ir.find((n) => n.type === 'chord').stopped);
  const html = renderHtml(ir, { strumStyle: 'comic' });
  assert.ok(html.includes('C stop'));
  assert.ok(!html.includes('strum-stop'), 'no box as well');
  assert.ok(renderHtml(parse('{stop}\n[C]knee'), { strumStyle: 'comic' }).includes('strum-stop'));
});

// ── Layouts ──
test('Inline layout: chords in the words', () => {
  const html = renderHtml(parse('[[Verse]]\nI [C]come from [G7]Alabama'), { layout: 'inline' });
  assert.ok(html.includes('<div class="inline-line">I <span class="ichord"><span class="ib">[</span>C<span class="ib">]</span></span>come from'));
  assert.ok(html.includes('<h2 class="section">Verse</h2>'));
  assert.ok(renderHtml(parse('[[Intro:]] [C] [G]'), { layout: 'inline' }).includes('Intro:</strong>'));
});
test('Chords only layout: no words', () => {
  const html = renderHtml(parse('[[Verse]]\nI [C]come from [G7]Alabama\nno chords here'), { layout: 'chords' });
  assert.ok(html.includes('<div class="chords chords-only"><span class="chord">C</span>'));
  assert.ok(!html.includes('Alabama') && !html.includes('no chords here'));
});
test('layout CSS is provided', () => {
  assert.ok(renderHtml.sheetCss().includes('.inline-line'));
});

// ── The guide ──
test('the writing guide reads WRITING.md', () => {
  const g = guide.writingGuide();
  assert.ok(g.sections.length >= 10);
  assert.ok(g.html.includes('<table class="guide-table">'));
  assert.ok(g.html.includes('<code>[C x3]</code>'));
  // every example in the quick reference parses without warnings
  const md = require('fs').readFileSync(require('path').join(__dirname, '..', 'WRITING.md'), 'utf8');
  const ref = md.split('## The quick reference')[1].split('\n---')[0];
  const examples = [...ref.matchAll(/^\| `([^`]+)` \|/gm)].map((m) => m[1].replace(/\\\|/g, '|')).filter((e) => !e.startsWith('…') && e !== '{A}'); // {A} needs {A: …} first
  assert.ok(examples.length >= 10);
  for (const e of examples) {
    const warnings = parse(e).flatMap((n) => n.warnings);
    assert.deepStrictEqual(warnings, [], `${e}: ${warnings}`);
  }
});
test('markdown reader: fences, lists, tables, inline code', () => {
  const { html } = guide.markdownToHtml('## A\n\n- one `x`\n- **two**\n\n| a | b |\n|---|---|\n| `\\|` | 2 |\n\n````\n```tab\nA|--\n```\n````');
  assert.ok(html.includes('<h2 id="guide-a">A</h2>'));
  assert.ok(html.includes('<li>one <code>x</code></li>'));
  assert.ok(html.includes('<td><code>|</code></td>'));
  assert.ok(html.includes('<pre class="guide-code">```tab\nA|--\n```</pre>'));
});

console.log('All 4.5 tests passed.');
