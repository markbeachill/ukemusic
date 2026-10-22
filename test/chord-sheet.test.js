const assert = require('assert');
const { analyseLine, isChordLine, convertChordSheet, findChordLines } = require('../src/chord-sheet');
const parse = require('../src/parser');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('recognises chord lines, including bar lines, repeats and scan debris', () => {
  assert.ok(isChordLine('C   F   C   G7'));
  assert.ok(isChordLine('| Am | F | C | G |'));
  assert.ok(isChordLine('G  D/F#  Em  C  (x2)'));
  assert.ok(isChordLine('~ c F C G7'));
  assert.ok(isChordLine('. C C7 F C Am G7 C F C'));
  assert.deepStrictEqual(analyseLine('~ c F C G7').chords.map((c) => c.name), ['C', 'F', 'C', 'G7']);
});

test('lyric lines are not chord lines', () => {
  assert.ok(!isChordLine('Amazing grace, how sweet the sound'));
  assert.ok(!isChordLine('Am I the only one'));
  assert.ok(!isChordLine('a b c'));            // lower-case only: needs a proper chord
  assert.ok(!isChordLine('[C]Hello [G]world')); // already ukemusic format
  assert.ok(!isChordLine('{D-DU-UDU}'));
  assert.ok(!isChordLine(''));
});

test('chords joined by a bad scan are split', () => {
  assert.deepStrictEqual(analyseLine('C C7 F C Am G7 C FC').chords.map((c) => c.name), ['C', 'C7', 'F', 'C', 'Am', 'G7', 'C', 'F', 'C']);
  assert.ok(!isChordLine('Bed'));
});

test('spaced chord sheet: chords go in at their columns', () => {
  const sheet = [
    'C              F         C',
    'Amazing grace, how sweet the sound',
    '                    G7',
    'That saved a wretch like me'
  ].join('\n');
  const { text, report } = convertChordSheet(sheet);
  assert.strictEqual(text, '[C]Amazing grace, [F]how sweet [C]the sound\nThat saved a wretch [G7]like me');
  assert.strictEqual(report.merged, 2);
  assert.deepStrictEqual(report.estimated, []);
});

test('chords past the end of the lyric are added at the end', () => {
  const { text } = convertChordSheet('C           G\nHello');
  assert.strictEqual(text, '[C]Hello [G]');
});

test('collapsed spacing: chords spread first-to-last word and the line is flagged', () => {
  const { text, report } = convertChordSheet('C F C G7\nThru many dangers, toils and snares I have already come.');
  assert.strictEqual(text, '[C]Thru many dangers, [F]toils and snares [C]I have already [G7]come.');
  assert.deepStrictEqual(report.estimated, [1]);
});

test('section labels become headings; chord-only lines become instrumentals', () => {
  const { text, report } = convertChordSheet('[Intro]\nG  C  G  D\n\nVerse 1:\nG     C\nHello there\nCHORUS\nD\nYes');
  assert.strictEqual(text, '[[Intro]]\n[G] [C] [G] [D]\n\n[[Verse 1]]\n[G]Hello [C]there\n[[Chorus]]\n[D]Yes');
  assert.strictEqual(report.headings, 3);
  assert.strictEqual(report.instrumental, 1);
});

test('stray punctuation at the start of a lyric line is cleaned', () => {
  const { text, report } = convertChordSheet('C      G\n, ___) When we\'ve been here');
  assert.ok(text.startsWith('[C]When'), text);
  assert.strictEqual(report.cleaned, 1);
});

test('existing ukemusic lines, patterns, delimiters and tabs are untouched', () => {
  const song = '--START MUSIC--\n[[Verse]]\n{D-DU-UDU}\n[C]Hi [G]there\n```tab\nA|--3--|\n```\n--END MUSIC--';
  assert.strictEqual(convertChordSheet(song).text, song);
});

test('the result parses into chords and lyrics', () => {
  const { text } = convertChordSheet('G        C\nClementine, lost');
  const nodes = parse(text, { useDelimiters: false });
  assert.deepStrictEqual(nodes.filter((n) => n.type === 'chord').map((n) => n.content), ['G', 'C']);
});

test('findChordLines reports chord-only lines inside the music section', () => {
  const song = 'C G\n--START MUSIC--\n[C]Hi\nC F C G7\nwords\n```tab\nA|--3--|\n```\n--END MUSIC--';
  assert.deepStrictEqual(findChordLines(song), [4]);
  assert.deepStrictEqual(findChordLines(song, { useDelimiters: false }), [1, 4]);
});

test('"Intro: Am F D" and "(Intro:) Am F D" become a bold label with chords', () => {
  const { text, report } = convertChordSheet('(Intro:) Am F D\nInstrumental: G C G C Em\nNote: play it softly');
  assert.strictEqual(text, '[[Intro:]] [Am] [F] [D]\n[[Instrumental:]] [G] [C] [G] [C] [Em]\nNote: play it softly');
  assert.strictEqual(report.labelled, 2);
});

test('tab pasted from a website is fenced and tidied', () => {
  const messy = [
    'Ode To Joy - easy uke tab',
    'Tuning: GCEA',
    '',
    '   C           G',
    'a|-----------------|',
    'E|--0--0--1--------|',
    'C|-------------2--   ',
    'g|-----------0-----|',
    '',
    'E|--------------0--|',
    'C|--0--0--2--------|',
    '',
    'h = hammer on   p = pull off   / = slide up'
  ].join('\n');
  const { text, report } = convertChordSheet(messy);
  const lines = text.split('\n');
  assert.ok(lines.includes('Tuning: GCEA'), 'tuning line is information, not chords');
  const open = lines.indexOf('```tab');
  assert.strictEqual(lines[open + 1], '   C           G', 'chord names above the tab stay with it');
  assert.deepStrictEqual(lines.slice(open + 2, open + 6).map((l) => l.slice(0, 2)), ['A|', 'E|', 'C|', 'G|']);
  assert.strictEqual(lines[open + 4], 'C|-------------2---|', 'short line evened up with its bar line');
  assert.deepStrictEqual(lines.slice(open + 7, open + 11).map((l) => l.slice(0, 2)), ['A|', 'E|', 'C|', 'G|'], 'missing strings added');
  assert.ok(!text.includes('hammer on'));
  assert.strictEqual(report.tabs, 1);
  assert.strictEqual(report.tabLegends, 1);
  assert.deepStrictEqual(report.tabWarnings, []);
});

test('tab already fenced is left alone; the tab\'s instrument is reported', () => {
  const fenced = '```tab\nA|--0--|\n```';
  assert.strictEqual(convertChordSheet(fenced).text, fenced);
  const guitar = ['e|--0--|', 'B|-----|', 'G|-----|', 'D|-----|', 'A|-----|', 'E|-----|'].join('\n');
  assert.deepStrictEqual(convertChordSheet(guitar).report.tabInstruments, ['guitar']);
});


console.log('All chord sheet tests passed.');
