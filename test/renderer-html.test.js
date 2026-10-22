const assert = require('assert');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('simple chord and lyric line renders chords and lyrics divs', () => {
  const html = renderHtml(parse('[C]Hello [G]world'));

  assert.ok(html.includes('<div class="chords">'));
  assert.ok(html.includes('<span class="chord">C</span>'));
  assert.ok(html.includes('<span class="chord">G</span>'));
  assert.ok(html.includes('<div class="lyrics">'));
  assert.ok(html.includes('Hello'));
  assert.ok(html.includes('world'));
});

test('structural labels render as h2.section', () => {
  const html = renderHtml(parse('[[Verse 1]]'));
  assert.strictEqual(html.trim(), '<section class="song-section section-cue">\n<h2 class="section">Verse 1</h2>\n</section>'); // 4.17: a heading on its own is a cue
});

test('sections wrap their lines; lines carry their source line number', () => {
  const html = renderHtml(parse('[[Verse 1]]\n[C]Hello\n[[Chorus]]\n[G]World'));
  const sections = html.match(/<section class="song-section">[\s\S]*?<\/section>/g);
  assert.strictEqual(sections.length, 2);
  assert.ok(sections[0].includes('Verse 1') && sections[0].includes('Hello') && !sections[0].includes('World'));
  assert.ok(html.includes('<div class="line-group" data-line="2">'));
  assert.ok(html.includes('<div class="line-group" data-line="4">'));
});

test('rhythm appears above chords', () => {
  const html = renderHtml(parse('{D-DU-UDU}\n[C]Hello'));
  const rhythmIndex = html.indexOf('<div class="rhythm">D-DU-UDU</div>');
  const chordIndex = html.indexOf('<div class="chords">');
  assert.ok(rhythmIndex !== -1);
  assert.ok(chordIndex !== -1);
  assert.ok(rhythmIndex < chordIndex);
});

test('tab blocks render as pre.tab', () => {
  const input = ['```tab', 'A|--3---3---3---', 'E|--0---0---0---', 'C|--0---0---0---', 'G|--0---0---0---', '```'].join('\n');
  const html = renderHtml(parse(input));
  assert.ok(html.includes('<pre class="tab">'));
  // string names and frets are marked so frets can be bold; the text itself is unchanged
  assert.ok(html.includes('<span class="tab-string">A|</span><span class="tab-dash">--</span><span class="tab-fret">3</span><span class="tab-dash">---</span>'), html);
  assert.strictEqual(html.replace(/<[^>]+>/g, '').includes('G|--0---0---0---'), true);
});

test('tab is split at bar lines when printing (maxLineChars)', () => {
  const row = (s) => `${s}|${'--0--|'.repeat(8)}`;
  const input = ['```tab', row('A'), row('E'), row('C'), row('G'), '```'].join('\n');
  const html = renderHtml(parse(input), { maxLineChars: 20 });
  const text = html.replace(/<[^>]+>/g, '');
  assert.ok(text.split('\n').every((l) => l.length <= 20), text);
});

test('tab follows the key when transposed', () => {
  const { transposeIR } = require('../src/transpose');
  const input = ['```tab', 'A|-----|', 'E|--0--|', 'C|-----|', 'G|-----|', '```'].join('\n');
  const ir = transposeIR(parse(input), 2);
  assert.ok(ir[0].content.includes('E|--2--|'), ir[0].content);
});

test('bar markers render span.bar in the chord line', () => {
  const html = renderHtml(parse('[C]Clementine, []lost'));
  assert.ok(html.includes('<span class="bar">|</span>'));
  const chordLine = html.match(/<div class="chords">([\s\S]*?)<\/div>/);
  assert.ok(chordLine);
  assert.ok(chordLine[1].includes('<span class="chord">C</span>'));
  assert.ok(chordLine[1].includes('<span class="bar">|</span>'));
});

test('complete multi-section song renders correctly', () => {
  const input = [
    '--START MUSIC--',
    '[[Intro]]',
    '```tab',
    'A|--3---3---3---',
    'E|--0---0---0---',
    'C|--0---0---0---',
    'G|--0---0---0---',
    '```',
    '',
    '[[Verse 1]]',
    '{D-DU-UDU}',
    '[C]Clementine, []lost and gone [G]forever',
    '[Am]Dreadful [F]sorry',
    '',
    '[[Chorus]]',
    '{↓ ↓ ↑ ↑ ↓ ↑}',
    '[F]Lost and gone for[G]ever',
    '--END MUSIC--'
  ].join('\n');

  const html = renderHtml(parse(input));

  assert.ok(html.includes('<h2 class="section">Intro</h2>'));
  const tabText = (html.match(/<pre class="tab">[\s\S]*?<\/pre>/) || [''])[0].replace(/<[^>]+>/g, '');
  assert.strictEqual(tabText, 'A|--3---3---3---\nE|--0---0---0---\nC|--0---0---0---\nG|--0---0---0---');
  assert.ok(html.includes('<h2 class="section">Verse 1</h2>'));
  assert.ok(html.includes('<div class="rhythm">D-DU-UDU</div>'));
  assert.ok(html.includes('<span class="chord">C</span>'));
  assert.ok(html.includes('<span class="bar">|</span>'));
  assert.ok(html.includes('<span class="chord">G</span>'));
  assert.ok(html.includes('<h2 class="section">Chorus</h2>'));
  assert.ok(html.includes('<div class="rhythm">↓&nbsp;↓&nbsp;↑&nbsp;↑&nbsp;↓&nbsp;↑</div>'));
  assert.ok(html.includes('<span class="chord">F</span>'));
});

test('long chord names pad lyrics to maintain alignment', () => {
  // Am7 is 3 chars but lyric "I " is 2 chars — lyrics must be padded
  const html = renderHtml(parse('[Am7]I [G]play'), { diagrams: { enable: false } });
  const toText = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const parts = html.split('</div>').filter(l => l.includes('div'));
  const chords = toText(parts.find(p => p.includes('chords')) || '');
  const lyrics = toText(parts.find(p => p.includes('lyrics')) || '');

  // G must start at the same position in both lines
  const gPosChord = chords.indexOf('G');
  const playPosLyric = lyrics.indexOf('play');
  assert.strictEqual(gPosChord, playPosLyric, `G at ${gPosChord} should align with "play" at ${playPosLyric}`);
});

test('multiple long chords all align correctly', () => {
  const html = renderHtml(parse('[Dm7]A [G7sus4]B [C]C'), { diagrams: { enable: false } });
  const toText = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const parts = html.split('</div>').filter(l => l.includes('div'));
  const chords = toText(parts.find(p => p.includes('chords')) || '');
  const lyrics = toText(parts.find(p => p.includes('lyrics')) || '');

  const g7Pos = chords.indexOf('G7sus4');
  const bPos = lyrics.indexOf('B');
  assert.strictEqual(g7Pos, bPos, `G7sus4 at ${g7Pos} should align with "B" at ${bPos}`);

  const cChordPos = chords.lastIndexOf('C');
  const cLyricPos = lyrics.lastIndexOf('C');
  assert.strictEqual(cChordPos, cLyricPos, `C chord at ${cChordPos} should align with "C" lyric at ${cLyricPos}`);
});

test('normal-length chords do not add unnecessary padding', () => {
  const html = renderHtml(parse('[C]Hello [G]world'), { diagrams: { enable: false } });
  const toText = s => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const parts = html.split('</div>').filter(l => l.includes('div'));
  const lyrics = toText(parts.find(p => p.includes('lyrics')) || '');
  // C is 1 char, "Hello " is 6 chars — no padding needed
  assert.strictEqual(lyrics, 'Hello world');
});

test('chords separated by single spaces stay apart (instrumental lines)', () => {
  const html = renderHtml(parse('[C] [F] [C] [F] [Am] [Dm] [G]'), { diagrams: { enable: false } });
  const chordLine = html.match(/<div class="chords">([\s\S]*?)<\/div>/)[1]
    .replace(/<span class="chord">|<\/span>/g, '').replace(/&nbsp;/g, ' ');
  assert.strictEqual(chordLine, 'C F C F Am Dm G');
});

test('one-letter lyric between chords still separates the chords', () => {
  const html = renderHtml(parse('[G]x[C]y'), { diagrams: { enable: false } });
  const chordLine = html.match(/<div class="chords">([\s\S]*?)<\/div>/)[1]
    .replace(/<span class="chord">|<\/span>/g, '').replace(/&nbsp;/g, ' ');
  assert.strictEqual(chordLine, 'G C');
});

function rowsOf(html) {
  return [...html.matchAll(/<div class="(chords|lyrics)">(.*?)<\/div>/g)].map((m) => m[2]
    .replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**').replace(/<span class="(chord|bar)">|<\/span>/g, '').replace(/&nbsp;/g, ' '));
}

test('[[Label]] followed by chords: bold label at the start of the chord line', () => {
  const html = renderHtml(parse('[[Intro:]] [Am] [F] [D]'), { diagrams: { enable: false } });
  assert.strictEqual(rowsOf(html)[0], '**Intro:** Am F D');
  assert.ok(!html.includes('<h2'), 'an inline label is not a heading');
  assert.ok(!html.includes('song-section'), 'an inline label does not start a section');
});

test('[[Label]] followed by lyrics: bold label at the start of the lyric line, chords still aligned', () => {
  const rows = rowsOf(renderHtml(parse('[[Chorus]] [C]Lost and gone for[G]ever'), { diagrams: { enable: false } }));
  assert.deepStrictEqual(rows, ['       C                G', '**Chorus** Lost and gone forever']);
});

test('[[Label]] alone on a line is still a section heading', () => {
  const html = renderHtml(parse('[[Verse]]\n[C]Hi'), { diagrams: { enable: false } });
  assert.ok(html.includes('<h2 class="section">Verse</h2>') && html.includes('song-section'));
});

test('inline labels in table layout', () => {
  const html = renderHtml(parse('[[Intro:]] [Am] [F]'), { diagrams: { enable: false }, layout: 'table' });
  assert.ok(/<tr class="chord-row"><td><strong[^>]*>Intro:<\/strong><\/td>/.test(html), html);
});

test('table layout keeps strum-pattern lines', () => {
  const html = renderHtml(parse('{D-DU-UDU}\n[C]Hello'), { diagrams: { enable: false }, layout: 'table', rhythmNotation: 'arrows' });
  assert.ok(html.includes('<div class="rhythm">↓-↓↑-↑↓↑</div>'), html);
});

console.log('All HTML renderer tests passed.');


test('song_start diagrams render once at the top for unique chords', () => {
  const html = renderHtml(parse('[C]Hello [G]world\n[C]Again'), {
    diagrams: { enable: true, placement: 'song_start', show_fingers: true, fallback: 'placeholder' }
  });

  assert.ok(html.includes('<div class="chord-diagrams">'));
  const cCount = (html.match(/data-chord="C"/g) || []).length;
  const gCount = (html.match(/data-chord="G"/g) || []).length;
  assert.strictEqual(cCount, 1);
  assert.strictEqual(gCount, 1);
  assert.ok(html.indexOf('<div class="chord-diagrams">') < html.indexOf('<div class="chords">'));
});

test('first_use diagrams render before the first matching line group', () => {
  const html = renderHtml(parse('[C]Hello\n[G]world\n[C]again'), {
    diagrams: { enable: true, placement: 'first_use', show_fingers: true, fallback: 'placeholder' }
  });

  const firstC = html.indexOf('data-chord="C"');
  const firstG = html.indexOf('data-chord="G"');
  const helloLine = html.indexOf('Hello');
  const worldLine = html.indexOf('world');
  assert.ok(firstC !== -1 && firstC < helloLine);
  assert.ok(firstG !== -1 && firstG < worldLine);
  assert.strictEqual((html.match(/data-chord="C"/g) || []).length, 1);
});
