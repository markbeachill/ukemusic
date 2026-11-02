const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = { module: { exports: {} }, document: { createElement: () => ({ className: '', textContent: '' }) } };
vm.runInNewContext(fs.readFileSync(require.resolve('../src/song-ui'), 'utf8'), context);
const { memoryPlayLabel, setControlLabel } = context.module.exports;
assert.strictEqual(memoryPlayLabel('repeats'), 'Play with fewer chords');
assert.strictEqual(memoryPlayLabel('numbers'), 'Play with chord numbers');
assert.strictEqual(memoryPlayLabel('none'), 'Play without chords');
console.log('✓ learning actions describe each selected amount of chord help');

const icon = { nodeType: 1, tagName: 'svg' };
const text = { nodeType: 3, textContent: 'Play', remove() { button.childNodes.splice(button.childNodes.indexOf(this), 1); } };
const classes = new Set(['rib-button']);
const button = {
  childNodes: [icon, text],
  classList: { contains: name => classes.has(name), toggle: (name, value) => value ? classes.add(name) : classes.delete(name) },
  querySelector: () => button.childNodes.find(node => node.className === 'rib-button-label'),
  append: node => button.childNodes.push(node)
};
for (const label of ['Pause', 'Resume', 'Play with chord numbers', 'Play']) {
  setControlLabel(button, label);
  assert.strictEqual(button.childNodes[0], icon, 'the icon must survive label changes');
  assert.strictEqual(button.childNodes.length, 2, 'there must be exactly one label');
  assert.strictEqual(button.childNodes[1].textContent, label);
  assert.strictEqual(classes.has('rib-button-wide'), label.length > 21);
}
const plain = { classList: { contains: () => false } };
setControlLabel(plain, 'Play without chords');
assert.strictEqual(plain.textContent, 'Play without chords');
console.log('✓ changing labels retains ribbon icons and uses ordinary text on web buttons');

// A targeted visual review must keep its first app argument and pass the chosen sections.
const runner = fs.readFileSync(require.resolve('../tools/ui-review/run'), 'utf8');
const parse = new Function('process', 'path', 'REPO', runner.slice(runner.indexOf('const args ='), runner.indexOf('function need(')) + '; return { apps, sections, pageOnly };');
const parseArgs = args => parse({ argv: ['node', 'run.js', ...args] }, require('path'), process.cwd());
assert.deepStrictEqual(parseArgs(['desktop', 'R', 'A']).apps, ['desktop']);
assert.deepStrictEqual(parseArgs(['ipad', 'iphone', 'R']).apps, ['ipad', 'iphone']);
assert.deepStrictEqual(parseArgs(['ipad', 'iphone', 'R']).sections, ['R']);
assert.deepStrictEqual(parseArgs(['--out', 'review-output', 'desktop', 'E']).sections, ['E']);
assert.strictEqual(parseArgs(['--page']).pageOnly, true);
console.log('✓ targeted visual reviews retain the selected apps and sections');
