// 4.63: ChordPro export: bar lines as grids, songbook marks as annotations, markup if asked
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const { parse } = require('../src/parser');
const { ukemusicToChordPro, chordProToUkemusic } = require('../src/chordpro');
const body = (text) => chordProToUkemusic(text).text.replace(/^--START MUSIC--\n|\n--END MUSIC--\n?$/g, '');
const SONG = '--START MUSIC--\n[[Intro]]\n[[Riff]] | G C | % | D:3 A:1 |\n| C | G | Am F | (x2)\n\n[[Verse 1]]\n[C↓]Oh my [x]dar[Bm7.Am7]ling [] **oh** *my* __dar__ling [C x3]gone [G:2]ah [mute↓↓]\n--END MUSIC--\n';

test('bar lines go out as a grid, a cell a beat, with labels and repeats', () => {
  const cho = ukemusicToChordPro(parse(SONG), { title: 'T', time: '4/4' });
  assert.ok(cho.includes('# ukemusic: bars\n{start_of_grid shape="1+3x4+1"}\nRiff | G . C . | % | D . . A |\n| C . . . | G . . . | Am . F . | (x2)\n{end_of_grid}'), cho);
  const waltz = ukemusicToChordPro(parse('--START MUSIC--\n| C | G:2 D:1 |\n--END MUSIC--\n'), { time: '3/4' });
  assert.ok(waltz.includes('| C . . | G . D |'), waltz);
});

test('songbook marks and bar markers go out as annotations', () => {
  const cho = ukemusicToChordPro(parse(SONG), { title: 'T' });
  assert.ok(cho.includes('[C][*↓]Oh my [*x]dar[Bm7][*+][Am7]ling [*|] oh my darling [C][*×3]gone [G][*2 beats]ah [*mute↓↓]'), cho);
  assert.ok(!/\[C↓\]|\[x\]|\[Bm7\.Am7\]|\[\|\]/.test(cho), 'no marks as chord names');
});

test('bold, italic and underline as ChordPro markup only when asked; harmony in italics', () => {
  const plain = ukemusicToChordPro(parse(SONG), { title: 'T' });
  assert.ok(!/<[biu]>/.test(plain));
  const marked = ukemusicToChordPro(parse(SONG), { title: 'T', markup: true });
  assert.ok(marked.includes('<b>oh</b> <i>my</i> <u>dar</u>ling'), marked);
  const harmony = ukemusicToChordPro(parse('--START MUSIC--\n{harmony}\n[C]sing a & b\n{lead}\n[G]lead\n--END MUSIC--\n'), { markup: true });
  assert.ok(harmony.includes('[C]<i>sing a &amp; b</i>'), harmony);
});

test('everything comes back as it was written', () => {
  for (const markup of [false, true]) {
    const back = chordProToUkemusic(ukemusicToChordPro(parse(SONG), { title: 'T', time: '4/4', markup })).text;
    assert.ok(back.includes('[[Intro]]\n[[Riff]] | G C | % | D:3 A:1 |\n| C | G | Am F | (x2)'), back);
    assert.ok(!back.includes('Instrumental'), 'no extra heading for our own grid');
    const words = markup ? '**oh** *my* __dar__ling' : 'oh my darling';
    assert.ok(back.includes(`[C↓]Oh my [x]dar[Bm7.Am7]ling [] ${words} [C x3]gone [G:2]ah [mute↓↓]`), back);
  }
});

test('grids from other apps: cells, holds, repeats, labels, and an Instrumental heading', () => {
  assert.strictEqual(body('{start_of_grid}\n| C . . . | G . D . | % |\n{end_of_grid}'), '[[Instrumental]]\n| C | G D | % |');
  assert.strictEqual(body('{start_of_grid label="Intro"}\nA |: D / / A | G . . . | %% | . . . . :| x2\n{end_of_grid}'), '[[Intro]]\n[[A]] | D:3 A:1 | G | D:3 A:1 | G | (x2)');
  assert.strictEqual(body('{sog: Outro}\n| Am . . . | . . . . | F~G . . . |\n{eog}'), '[[Outro]]\n| Am | Am | F G |');
});

test('ChordPro markup from other apps becomes ukemusic\'s', () => {
  assert.strictEqual(body('[C]A <b>bold</b> <em>soft</em> <u>low</u> <span color="red">red</span> &amp; done'), '[C]A **bold** *soft* __low__ red & done');
  assert.strictEqual(body('{x_voice: harmony}\n[C]<i>sing</i>\n{x_voice: lead}'), '{harmony}\n[C]sing\n{lead}');
  assert.strictEqual(body('[C]Fish &amp; chips'), '[C]Fish &amp; chips', 'no tags: left alone');
});

test('the export option, in the desktop app and the web player', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /data-config-path="export\.chordpro_markup" \/> with bold, italic and underline \(ChordPro markup\)/);
  assert.match(html, /markup: \[true, 'true'\]\.includes\(config\?\.export\?\.chordpro_markup/);
  assert.match(fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8'), /chordpro_markup: false/);
  const app = fs.readFileSync(path.join(ROOT, 'web/app.html'), 'utf8');
  assert.match(app, /<input id="dlMarkup" type="checkbox"> ChordPro with bold, italic and underline/);
  assert.match(app, /markup: \$\('dlMarkup'\)\.checked/);
});

test('CHORDPRO.md ends with what converts and what can\'t; its tables keep | inside a cell', () => {
  const md = fs.readFileSync(path.join(ROOT, 'CHORDPRO.md'), 'utf8');
  const last = md.slice(md.lastIndexOf('\n## '));
  assert.match(last, /^\n## ukemusic's own notation in a ChordPro file: what converts, and what can't/);
  for (const h of ['### Converted exactly', '### Converted as text other apps show', "### Can't be converted", '### Not written at all']) assert.ok(last.includes(h), h);
  const { markdownToHtml } = require('../src/guide');
  const { html } = markdownToHtml(md, {});
  for (const row of html.match(/<tr>[\s\S]*?<\/tr>/g)) assert.ok((row.match(/<t[dh]>/g) || []).length <= 3, row);
});
