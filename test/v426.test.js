// 4.26: a heading line with a stray space is still a heading (so Small/Hide reach it)
const assert = require('assert');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('"[[Chorus]] " with a trailing space starts a section like "[[Chorus]]"', () => {
  for (const line of ['[[Chorus]] ', '  [[Chorus]]', '[[Chorus]]\t']) {
    const ir = parse(`[[Intro:]] [D]\n\n${line}\n[D]Oh Su[G]sanna\n`);
    assert.deepStrictEqual(ir.filter((n) => n.type === 'structure').map((n) => n.content), ['Intro:', 'Chorus']);
    const html = String(renderHtml(ir, {}));
    assert.ok(/<section class="song-section">\n<h2 class="section">Chorus<\/h2>/.test(html), html.slice(0, 400));
  }
});
test('a heading followed by chords on the same line is still a label', () => {
  const ir = parse('[[Intro]] [C] [G]\n');
  assert.strictEqual(ir[0].type, 'structure');
  assert.ok(ir.some((n) => n.type === 'chord' && n.content === 'G'));
});
