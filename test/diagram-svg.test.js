const assert = require('assert');
const renderDiagramSvg = require('../src/diagram-svg');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

test('renders one dot for each fretted string', () => {
  const svg = renderDiagramSvg({
    name: 'F',
    frets: [2, 0, 1, 0],
    fingers: [2, 0, 1, 0],
    barre: null,
    base_fret: 1
  });

  const dotCount = (svg.match(/data-dot="true"/g) || []).length;
  assert.strictEqual(dotCount, 2);
});

test('renders open and muted indicators', () => {
  const svg = renderDiagramSvg({
    name: 'Test',
    frets: [0, -1, 2, null],
    fingers: [0, 0, 3, 0],
    barre: null,
    base_fret: 1
  });

  const openCount = (svg.match(/data-open="true"/g) || []).length;
  const mutedCount = (svg.match(/data-muted="true"/g) || []).length;
  assert.strictEqual(openCount, 1);
  assert.strictEqual(mutedCount, 2);
});

test('renders barre indicator when defined', () => {
  const svg = renderDiagramSvg({
    name: 'Bb',
    frets: [3, 2, 1, 1],
    fingers: [3, 2, 1, 1],
    barre: { fret: 1, strings: [2, 3] },
    base_fret: 1
  });

  assert.ok(svg.includes('data-barre="true"'));
});

test('renders base fret label when base_fret is above 1', () => {
  const svg = renderDiagramSvg({
    name: 'High',
    frets: [5, 7, 7, 7],
    fingers: [1, 2, 3, 4],
    barre: null,
    base_fret: 5
  });

  assert.ok(svg.includes('>5</text>'));
});

test('six-string diagrams (guitar) with muted strings', () => {
  const svg = renderDiagramSvg({ name: 'C', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], barre: null, base_fret: 1 });
  assert.strictEqual((svg.match(/<line class="line" x1="(\d+(\.\d+)?)" y1="34"/g) || []).length >= 6, true);
  assert.strictEqual((svg.match(/data-muted="true"/g) || []).length, 1);
  assert.strictEqual((svg.match(/data-open="true"/g) || []).length, 2);
  assert.strictEqual((svg.match(/data-dot="true"/g) || []).length, 3);
});

test('left-handed diagrams are mirrored', () => {
  const def = { name: 'C', frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], barre: null, base_fret: 1 };
  const right = renderDiagramSvg(def);
  const left = renderDiagramSvg(def, { left_handed: true });
  const dotX = (svg) => Number((svg.match(/<circle class="dot" cx="([\d.]+)"/) || [])[1]);
  assert.ok(dotX(left) < dotX(right), `dot moves to the other side (${dotX(left)} vs ${dotX(right)})`);
});


console.log('All diagram SVG tests passed.');
