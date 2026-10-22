const assert = require('assert');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');
const { wrapLines, lineWidth } = require('../src/line-wrap');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

// Printed rows (chord line / lyric line) as plain text
function rows(ir) {
  const html = renderHtml(ir, { diagrams: { enable: false } });
  return [...html.matchAll(/<div class="(chords|lyrics)">(.*?)<\/div>/g)]
    .map((m) => m[2].replace(/<span class="(chord|bar)">|<\/span>/g, '').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'"));
}

const p = (text) => parse(text, { useDelimiters: false });

test('short lines are left alone', () => {
  const ir = p('[C]Hello [G]world');
  assert.deepStrictEqual(wrapLines(ir, 40).filter((n) => n.type !== 'linebreak').map((n) => n.content), ir.filter((n) => n.type !== 'linebreak').map((n) => n.content));
});

test('splits at the comma nearest the middle, chords travel with their words', () => {
  const out = rows(wrapLines(p("Oh, [G]I come from Alabama, [G7]banjo on my knee, I'm [Em]going to Louisiana, [G7]true love for [Am]to see,"), 62));
  assert.deepStrictEqual(out, [
    '    G                    G7',
    'Oh, I come from Alabama, banjo on my knee,',
    '      Em                  G7            Am',
    "  I'm going to Louisiana, true love for to see,"
  ]);
});

test('a chord on the break goes to the start of the next part', () => {
  const out = rows(wrapLines(p('the sun so hot I [G]froze to death, [C]Susanna don\'t you [G]cry for me, [C]'), 40));
  assert.deepStrictEqual(out, [
    '                 G',
    'the sun so hot I froze to death,',
    '  C                 G           C',
    "  Susanna don't you cry for me,"
  ]);
});

test('very long lines are split more than once; nothing is lost', () => {
  const text = 'one two, three four, five six, seven eight, nine ten, eleven twelve, thirteen fourteen, fifteen';
  const ir = wrapLines(p(`[C]${text.replace('five', '[G]five').replace('nine', '[Am]nine')}`), 30);
  assert.ok(rows(ir).every((r) => r.length <= 30), JSON.stringify(rows(ir)));
  assert.strictEqual(ir.filter((n) => n.type === 'lyric').map((n) => n.content.trim()).join(' '), text);
  assert.deepStrictEqual(ir.filter((n) => n.type === 'chord').map((n) => n.content), ['C', 'G', 'Am']);
});

test('chords-only lines are split into chunks', () => {
  const out = rows(wrapLines(p('[G] [C] [G] [C] [G] [C] [Em] [Am] [D] [G] [C] [G7]'), 12));
  assert.ok(out.length >= 3 && out.every((r) => r.trimEnd().length <= 12), JSON.stringify(out));
  assert.deepStrictEqual(out.join(' ').split(/\s+/).filter(Boolean), ['G', 'C', 'G', 'C', 'G', 'C', 'Em', 'Am', 'D', 'G', 'C', 'G7']);
});

test('headings, strum patterns and tabs are not touched; line numbers kept', () => {
  const ir = p('[[A very long heading that is longer than the limit]]\n{D-DU-UDU}\n[C]x');
  const out = wrapLines(ir, 12);
  assert.ok(out.some((n) => n.type === 'structure' && n.content.length > 12));
  assert.ok(out.some((n) => n.type === 'rhythm'));
  assert.ok(out.filter((n) => n.type === 'lyric').every((n) => typeof n.line === 'number'));
});

test('lineWidth counts the chord line when it is longer than the words', () => {
  assert.strictEqual(lineWidth(p('[Cmaj7]a [Dm7]b').filter((n) => n.type !== 'linebreak')), 9); // "Cmaj7 Dm7"
});

test('renderHtml option maxLineChars splits lines', () => {
  const html = renderHtml(p('[C]one two three four, [G]five six seven eight'), { diagrams: { enable: false }, maxLineChars: 25 });
  assert.strictEqual((html.match(/class="line-group"/g) || []).length, 2);
});

console.log('All line wrap tests passed.');
