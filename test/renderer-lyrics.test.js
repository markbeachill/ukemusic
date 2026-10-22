const assert = require('assert');
const parse = require('../src/parser');
const { renderLyricsText, renderLyricsHtml } = require('../src/renderer-lyrics');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const SONG = [
  '--START MUSIC--',
  '[[Intro]]',
  '```tab',
  'A|--3--|',
  '```',
  '[C] [G]',
  '',
  '[[Verse 1]]',
  '{D-DU-UDU}',
  '[C]Clemen[G]tine, []lost and gone for[Am]ever',
  '[F]Dreadful [C]sorry',
  '',
  '',
  '[[Chorus]]',
  '[F]Lost and gone [] for[G]ever',
  '--END MUSIC--'
].join('\n');

test('lyrics text drops chords, strums, tabs and chord-only lines', () => {
  const text = renderLyricsText(parse(SONG), { title: 'Rainbow' });
  assert.strictEqual(text, [
    'Rainbow',
    '',
    '[Intro]',
    '',
    '[Verse 1]',
    'Clementine, lost and gone forever',
    'Dreadful sorry',
    '',
    '[Chorus]',
    'Lost and gone forever',
    ''
  ].join('\n'));
});

test('words split by chords are joined; double spaces collapsed', () => {
  const text = renderLyricsText(parse('[C]Clemen[G]tine, dreadful [] [G]sorry'));
  assert.strictEqual(text, 'Clementine, dreadful sorry\n');
});

test('lyrics html keeps sections together and escapes text', () => {
  const html = renderLyricsHtml(parse('[[Verse]]\n[C]Rock & <roll>'), { title: 'A & B' });
  assert.ok(html.includes('<h1 class="lyrics-title">A &amp; B</h1>'));
  assert.ok(html.includes('<section class="song-section lyrics-section">'));
  assert.ok(html.includes('<p class="lyric-line">Rock &amp; &lt;roll&gt;</p>'));
  assert.ok(!html.includes('chord'));
});

test('unconverted chord lines are left out of the lyrics', () => {
  const text = renderLyricsText(parse('C  F  C  G7\nAmazing grace\n. C C7 F\nHow sweet', { useDelimiters: false }));
  assert.strictEqual(text, 'Amazing grace\nHow sweet\n');
});

test('inline labels stay with their lyric line; labelled chord lines are left out', () => {
  const nodes = parse('[[Intro:]] [Am] [F] [D]\n[[Chorus]] [C]Lost and gone for[G]ever', { useDelimiters: false });
  assert.strictEqual(renderLyricsText(nodes), 'Chorus Lost and gone forever\n');
  assert.ok(renderLyricsHtml(nodes).includes('<strong>Chorus</strong> Lost and gone forever'));
});

console.log('All lyrics renderer tests passed.');
