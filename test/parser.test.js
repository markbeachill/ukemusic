const assert = require('assert');
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

function types(nodes) {
  return nodes.map((node) => node.type);
}

test('basic chord parsing', () => {
  const nodes = parse('[C]Hello [G]world');
  assert.strictEqual(nodes[0].type, 'chord');
  assert.strictEqual(nodes[0].content, 'C');
  assert.strictEqual(nodes[1].type, 'lyric');
  assert.strictEqual(nodes[1].content, 'Hello ');
  assert.strictEqual(nodes[2].type, 'chord');
  assert.strictEqual(nodes[2].content, 'G');
  assert.strictEqual(nodes[3].type, 'lyric');
  assert.strictEqual(nodes[3].content, 'world');
});

test('structural labels', () => {
  const nodes = parse('[[Verse 1]]');
  assert.strictEqual(nodes[0].type, 'structure');
  assert.strictEqual(nodes[0].content, 'Verse 1');
});

test('bar markers', () => {
  const nodes = parse('[]');
  assert.strictEqual(nodes[0].type, 'bar');
  assert.strictEqual(nodes[0].offset, 0);
});

test('rhythm annotations', () => {
  const nodes = parse('{D-DU-UDU}');
  assert.strictEqual(nodes[0].type, 'rhythm');
  assert.strictEqual(nodes[0].content, 'D-DU-UDU');
  assert.strictEqual(nodes[0].offset, null);
});

test('tab blocks parsed as a single node', () => {
  const input = ['```tab', 'A|--3---3---3---', 'E|--0---0---0---', 'C|--0---0---0---', 'G|--0---0---0---', '```'].join('\n');
  const nodes = parse(input);
  const tabNodes = nodes.filter((node) => node.type === 'tab');
  assert.strictEqual(tabNodes.length, 1);
  assert.strictEqual(
    tabNodes[0].content,
    ['A|--3---3---3---', 'E|--0---0---0---', 'C|--0---0---0---', 'G|--0---0---0---'].join('\n')
  );
});

test('delimiter filtering ignores content outside markers', () => {
  const input = ['ignore me', '--START MUSIC--', '[C]Inside only', '--END MUSIC--', '[G]Ignore me too'].join('\n');
  const nodes = parse(input);
  const chordNodes = nodes.filter((node) => node.type === 'chord');
  const lyricNodes = nodes.filter((node) => node.type === 'lyric');
  assert.strictEqual(chordNodes.length, 1);
  assert.strictEqual(chordNodes[0].content, 'C');
  assert.strictEqual(lyricNodes.length, 1);
  assert.strictEqual(lyricNodes[0].content, 'Inside only');
});

test('warning on bad chord', () => {
  const nodes = parse('[Banana]');
  const warned = nodes.find((node) => node.warnings.length > 0);
  assert.ok(warned, 'expected a warning node');
  assert.strictEqual(warned.type, 'lyric');
  assert.strictEqual(warned.content, '[Banana]');
  assert.ok(warned.warnings[0].includes('Line 1'));
});

test('blank lines are preserved', () => {
  const nodes = parse('[C]Line 1\n\n[G]Line 2');
  const linebreaks = nodes.filter((node) => node.type === 'linebreak');
  assert.ok(linebreaks.length >= 2);
  assert.strictEqual(linebreaks[1].line, 2);
});

test('complete song example with all annotation types', () => {
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

  const nodes = parse(input);
  const present = new Set(types(nodes));

  assert.ok(present.has('structure'));
  assert.ok(present.has('tab'));
  assert.ok(present.has('rhythm'));
  assert.ok(present.has('chord'));
  assert.ok(present.has('bar'));
  assert.ok(present.has('lyric'));
  assert.ok(present.has('linebreak'));

  const structures = nodes.filter((node) => node.type === 'structure').map((node) => node.content);
  assert.deepStrictEqual(structures, ['Intro', 'Verse 1', 'Chorus']);
});

test('punctuation right after a line-start [[label]] belongs to the label', () => {
  const ir = parse('--START MUSIC--\n[[Intro]]: [Am] [F] [D]\n--END MUSIC--');
  assert.strictEqual(ir[0].type, 'structure');
  assert.strictEqual(ir[0].content, 'Intro:');
  assert.ok(!ir.some((n) => n.type === 'lyric' && n.content.includes(':')));
});

console.log('All parser tests passed.');
