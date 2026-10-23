const assert = require('assert');
const parse = require('../src/parser');
const { looksLikeChordPro, chordProToUkemusic, ukemusicToChordPro } = require('../src/chordpro');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const CHORDPRO = `# A comment line
{title: Clementine}
{artist: Percy Montrose}
{key: C}
{capo: 0}
{tempo: 88}
{time: 4/4}
{comment: Strum D-DU-UDU}

{start_of_verse}
[C]Clementine, [Em]lost and gone forever
[F]Dreadful [C]sorry [|]
{end_of_verse}

{start_of_verse}
[C]Second verse [*riff] here [N.C.]
{end_of_verse}

{soc}
[F]Lost and gone for[G]ever
{eoc}

{c: Repeat chorus}
{chorus}

{start_of_tab}
A|--3--|
{end_of_tab}

{define: C base-fret 1 frets 0 0 0 3}
`;

test('recognises ChordPro', () => {
  assert.ok(looksLikeChordPro(CHORDPRO));
  assert.ok(looksLikeChordPro('{t: Hi}\n[C]x'));
  assert.ok(!looksLikeChordPro('--START MUSIC--\n{D-DU-UDU}\n[C]Hello\n--END MUSIC--'));
  assert.ok(!looksLikeChordPro('C  G\nHello'));
});

test('imports ChordPro into ukemusic format', () => {
  const { text, meta, report } = chordProToUkemusic(CHORDPRO);
  assert.strictEqual(text, [
    '--START MUSIC--',
    '{D-DU-UDU}',
    '',
    '[[Verse 1]]',
    '[C]Clementine, [Em]lost and gone forever',
    '[F]Dreadful [C]sorry []',
    '',
    '[[Verse 2]]',
    '[C]Second verse here [N.C.]', // 4.34: [N.C.] is kept (it used to be dropped)
    '',
    '[[Chorus]]',
    '[F]Lost and gone for[G]ever',
    '',
    '[[Repeat chorus]]',
    '',
    '[[Chorus]]',
    '',
    '```tab',
    'A|--3--|',
    '```',
    '--END MUSIC--',
    ''
  ].join('\n'));
  assert.deepStrictEqual(meta, {
    title: 'Clementine', artist: 'Percy Montrose', key: 'C', capo: '0', tempo: '88', time: '4/4',
    defines: [{ name: 'C', frets: [0, 0, 0, 3] }]
  });
  assert.strictEqual(report.strums, 1);
  assert.deepStrictEqual(report.ignored, []);
});

test('imported text parses cleanly', () => {
  const nodes = parse(chordProToUkemusic(CHORDPRO).text);
  assert.deepStrictEqual(nodes.flatMap((n) => n.warnings), []);
  assert.deepStrictEqual(nodes.filter((n) => n.type === 'chord').map((n) => n.content), ['C', 'Em', 'F', 'C', 'C', 'N.C.', 'F', 'G']);
  assert.strictEqual(nodes.filter((n) => n.type === 'bar').length, 1);
});

test('labelled sections and label="" attributes', () => {
  const { text } = chordProToUkemusic('{start_of_verse: Intro}\n[C]a\n{end_of_verse}\n{start_of_chorus label="Big finish"}\n[G]b\n{end_of_chorus}');
  assert.ok(text.includes('[[Intro]]') && text.includes('[[Big finish]]'), text);
});

test('grids become chords-only lines', () => {
  const { text } = chordProToUkemusic('{start_of_grid}\n| C . . . | G . . . | Am . F . |\n{end_of_grid}');
  assert.ok(text.includes('[[Instrumental]]\n[C] [G] [Am] [F]'), text);
});

test('exports ukemusic to ChordPro', () => {
  const song = '--START MUSIC--\n[[Verse 1]]\n{D-DU-UDU}\n[C]Some[G]where []over\n\n[[Chorus]]\n[F]Dreams\n[[Outro]]\n```tab\nA|--3--|\n```\n--END MUSIC--';
  const cho = ukemusicToChordPro(parse(song), { title: 'Rainbow', key: 'C', tempo: 100, time: '4/4' });
  assert.strictEqual(cho, [
    '{title: Rainbow}',
    '{key: C}',
    '{tempo: 100}',
    '{time: 4/4}',
    '',
    '{start_of_verse: Verse 1}',
    '{comment: Strum D-DU-UDU}',
    '[C]Some[G]where [|]over',
    '{end_of_verse}',
    '',
    '{start_of_chorus: Chorus}',
    '[F]Dreams',
    '{end_of_chorus}',
    '',
    '{comment: Outro}',
    '{start_of_tab}',
    'A|--3--|',
    '{end_of_tab}',
    ''
  ].join('\n'));
});

test('round trip: ukemusic -> ChordPro -> ukemusic keeps chords, lyrics, bars, strums and sections', () => {
  const song = '--START MUSIC--\n[[Verse 1]]\n{D-DU-UDX}\n[C]Clemen[G]tine, []lost and gone for[Am]ever\n[F]Dreadful [C]sorry\n\n[[Chorus]]\n[F]Lost and gone for[G7]ever\n--END MUSIC--\n';
  const back = chordProToUkemusic(ukemusicToChordPro(parse(song), { title: 'X' }));
  const summary = (text) => parse(text).filter((n) => n.type !== 'linebreak').map((n) => `${n.type}:${n.content}`).join('|');
  assert.strictEqual(summary(back.text), summary(song));
  assert.strictEqual(back.meta.title, 'X');
});

test('inline labels travel as [*Label] annotations and come back', () => {
  const song = '--START MUSIC--\n[[Intro:]] [Am] [F] [D]\n[[Chorus]] [C]Dreams [G]of\n--END MUSIC--';
  const cho = ukemusicToChordPro(parse(song), {});
  assert.ok(cho.includes('[*Intro:] [Am] [F] [D]') && cho.includes('[*Chorus] [C]Dreams [G]of'), cho);
  assert.ok(chordProToUkemusic(cho).text.includes('[[Intro:]] [Am] [F] [D]\n[[Chorus]] [C]Dreams [G]of'));
});

test('unlabelled ChordPro verses are numbered on import; labelled ones keep their label', () => {
  const { text } = chordProToUkemusic('{sov}\n[C]a\n{eov}\n{sov: Last verse}\n[F]c\n{eov}\n{sov}\n[G]b\n{eov}');
  assert.ok(text.includes('[[Verse 1]]\n[C]a'));
  assert.ok(text.includes('[[Last verse]]\n[F]c'));
  assert.ok(text.includes('[[Verse 3]]\n[G]b')); // counts verse position, labelled or not
});

console.log('All ChordPro tests passed.');
