const assert = require('assert');
const parse = require('../src/parser');
const renderMarkdown = require('../src/renderer-markdown');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('simple chord and lyric line renders a fenced code block with aligned chord text', () => {
  const markdown = renderMarkdown(parse('[C]Hello [G]world'), {
    markdown_rhythm_style: 'plain'
  });

  assert.ok(markdown.includes('```\nC     G\nHello world\n```'));
});

test('structural labels render as markdown headings', () => {
  const markdown = renderMarkdown(parse('[[Verse 1]]'), {
    markdown_rhythm_style: 'plain'
  });

  assert.strictEqual(markdown.trim(), '## Verse 1');
});

test('rhythm appears above chords and respects markdown style config', () => {
  const markdown = renderMarkdown(parse('{D-DU-UDU}\n[C]Hello'), {
    markdown_rhythm_style: 'italic'
  });

  const rhythmIndex = markdown.indexOf('*D-DU-UDU*');
  const chordIndex = markdown.indexOf('```\nC\nHello\n```');

  assert.ok(rhythmIndex !== -1);
  assert.ok(chordIndex !== -1);
  assert.ok(rhythmIndex < chordIndex);
});

test('tab blocks render as fenced tab code blocks', () => {
  const input = ['```tab', 'A|--3---3---3---', 'E|--0---0---0---', 'C|--0---0---0---', 'G|--0---0---0---', '```'].join('\n');
  const markdown = renderMarkdown(parse(input), {
    markdown_rhythm_style: 'plain'
  });

  assert.ok(markdown.includes('```tab\nA|--3---3---3---\nE|--0---0---0---\nC|--0---0---0---\nG|--0---0---0---\n```'));
});

test('bar markers render as pipe characters in the chord line', () => {
  const markdown = renderMarkdown(parse('[C]Clementine, []lost'), {
    markdown_rhythm_style: 'plain'
  });

  assert.ok(markdown.includes('|'), 'should contain a bar marker');
  assert.ok(markdown.includes('C'), 'should contain the chord');
  // The bar marker inserts a matching space in the lyric line for alignment
  assert.ok(markdown.includes('Clementine'), 'should contain lyrics');
  assert.ok(markdown.includes('lost'), 'should contain remaining lyrics');
});

test('blank lines are preserved', () => {
  const markdown = renderMarkdown(parse('[C]Line 1\n\n[G]Line 2'), {
    markdown_rhythm_style: 'plain'
  });

  assert.ok(markdown.includes('```\nC\nLine 1\n```\n\n```\nG\nLine 2\n```'));
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

  const markdown = renderMarkdown(parse(input), {
    markdown_rhythm_style: 'bold'
  });

  assert.ok(markdown.includes('## Intro'));
  assert.ok(markdown.includes('```tab\nA|--3---3---3---\nE|--0---0---0---\nC|--0---0---0---\nG|--0---0---0---\n```'));
  assert.ok(markdown.includes('## Verse 1'));
  assert.ok(markdown.includes('**D-DU-UDU**'));
  // Chord line with bar marker and padded lyrics
  assert.ok(markdown.includes('|'), 'should contain bar marker');
  assert.ok(markdown.includes('Clementine'), 'should contain lyrics');
  assert.ok(markdown.includes('forever'), 'should contain remaining lyrics');
  assert.ok(markdown.includes('Am'), 'should contain Am chord');
  assert.ok(markdown.includes('Dreadful'), 'should contain Dreadful lyrics');
  assert.ok(markdown.includes('## Chorus'));
  assert.ok(markdown.includes('**↓ ↓ ↑ ↑ ↓ ↑**'));
  assert.ok(markdown.includes('Lost and gone'), 'should contain chorus lyrics');
});

test('rhythm arrows notation converts D/U/X to arrows', () => {
  const markdown = renderMarkdown(parse('{D-DU-UDX}\n[C]Hello'), {
    markdown_rhythm_style: 'plain',
    rhythmNotation: 'arrows'
  });
  assert.ok(markdown.includes('↓-↓↑-↑↓✕'), markdown);
});

test('rhythm raw notation leaves pattern as typed', () => {
  const markdown = renderMarkdown(parse('{D-DU-UDU}\n[C]Hello'), {
    markdown_rhythm_style: 'plain',
    rhythmNotation: 'raw'
  });
  assert.ok(markdown.includes('D-DU-UDU'));
  assert.ok(!markdown.includes('↓'));
});

test('instrumental chords separated by single spaces stay apart', () => {
  const markdown = renderMarkdown(parse('[C] [F] [Am] [Dm]'), { markdown_rhythm_style: 'plain' });
  assert.ok(markdown.includes('C F Am Dm'), markdown);
});

test('inline labels go at the start of the line', () => {
  const markdown = renderMarkdown(parse('[[Intro:]] [Am] [F] [D]\n[[Chorus]] [C]Dreams'), { markdown_rhythm_style: 'plain' });
  assert.ok(markdown.includes('Intro: Am F D'), markdown);
  assert.ok(markdown.includes('       C\nChorus Dreams'), markdown);
});

console.log('All Markdown renderer tests passed.');
