// 4.13: bold, italic and underline in the words; tab styles
const assert = require('assert');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');
const { renderLyricsHtml, renderLyricsText } = require('../src/renderer-lyrics');
const { wrapLines } = require('../src/line-wrap');
const rich = require('../src/rich-text');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}
const ir = (text) => parse(text, { useDelimiters: false });
const lyricNodes = (nodes) => nodes.filter((n) => n.type === 'lyric');

test('markers come out of the words; each letter gets its style', () => {
  const nodes = ir('**Gone[C]ahead** lost and *dark[G]ens* __now__ go');
  const lyrics = lyricNodes(nodes);
  assert.deepStrictEqual(lyrics.map((n) => n.content), ['Gone', 'ahead lost and dark', 'ens now go']);
  assert.deepStrictEqual(lyrics[0].styles, [1, 1, 1, 1]);
  assert.strictEqual(lyrics[1].styles.slice(0, 6).join(''), '111110');
  assert.strictEqual(lyrics[2].styles.join(''), '2220444000');
});
test('chord positions ignore the markers', () => {
  const plain = ir('Clementine, [C]lost and gone [G]forever').filter((n) => n.type === 'chord').map((n) => n.offset);
  const styled = ir('**Clementine**, [C]lost *and* gone [G]forever').filter((n) => n.type === 'chord').map((n) => n.offset);
  assert.deepStrictEqual(styled, plain);
});
test('a lone marker, and \\* \\_, stay as characters', () => {
  assert.strictEqual(lyricNodes(ir('2 * 3 = 6'))[0].content, '2 * 3 = 6');
  assert.strictEqual(lyricNodes(ir('2 * 3 = 6'))[0].styles, undefined);
  assert.strictEqual(lyricNodes(ir('a \\*star\\* and snake\\_case'))[0].content, 'a *star* and snake_case');
  assert.strictEqual(lyricNodes(ir('my_file_name'))[0].content, 'my_file_name');
});
test('markers inside [chords] and {strums} are left alone', () => {
  const nodes = ir('{D-DU-UDU} [C]one **two**');
  assert.ok(nodes.some((n) => n.type === 'rhythm' && n.content === 'D-DU-UDU'));
  assert.strictEqual(lyricNodes(nodes).map((n) => n.content).join('').trim(), 'one two');
});
test('HTML: chords above the words, columns, and in the words', () => {
  const nodes = ir('**Clemen[C]tine** lost and gone *for[G]ever*');
  const lines = renderHtml(nodes, { layout: 'lines' });
  assert.ok(/<strong>Clemen(&nbsp;)*tine<\/strong>/.test(lines), lines);
  assert.ok(/<em>for(&nbsp;)*ever<\/em>/.test(lines), lines);
  const table = renderHtml(nodes, { layout: 'table' });
  assert.ok(table.includes('<strong>Clemen</strong>') && table.includes('<em>ever</em>'), table);
  const inline = renderHtml(nodes, { layout: 'inline' });
  assert.ok(inline.includes('<strong>Clemen</strong>') && inline.includes('<em>for</em>'), inline);
});
test('padding for a wide chord keeps underline only when both sides have it', () => {
  assert.deepStrictEqual(rich.insertCodes([4, 4, 0], 1, 2), [4, 4, 4, 4, 0]);
  assert.deepStrictEqual(rich.insertCodes([4, 0], 1, 2), [4, 0, 0, 0]);
  assert.strictEqual(rich.styledHtml('ab c', [1, 1, 0, 6], (t) => t), '<strong>ab</strong> <em><u>c</u></em>');
});
test('lyrics: formatting in the HTML, plain in the text file', () => {
  const nodes = ir('[C]**Clemen**  tine *lost*   and');
  assert.ok(renderLyricsHtml(nodes).includes('<strong>Clemen</strong> tine <em>lost</em> and'));
  assert.ok(renderLyricsText(nodes).includes('Clemen tine lost and'));
});
test('long lines split for print keep their formatting', () => {
  const nodes = ir('[C]**Oh my darling, oh my darling** Clementine, [G]you are *lost and gone forever* dreadful sorry');
  const wrapped = wrapLines(nodes, 40);
  const html = renderHtml(wrapped, { layout: 'lines' });
  assert.ok(html.split('<strong>').length >= 2 && html.includes('<em>'), html);
});
test('tab: dashes, frets and string names are marked for styling', () => {
  const html = renderHtml(ir('```tab\nA|--3--|\n```'));
  assert.ok(html.includes('<span class="tab-string">A|</span><span class="tab-dash">--</span><span class="tab-fret">3</span>'), html);
});
