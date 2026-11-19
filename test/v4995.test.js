// 4.99.5: Learn a strum (in steps), and Strum switch, in Free Practice
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const PL = require('../src/practice-catalog');
const help = require('../src/practice-help');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');

test('two new exercises in Strumming & rhythm', () => {
  const learn = PL.exercise('learn-strum');
  assert.ok(learn && learn.cat === 'rhythm' && learn.mode === 'strum' && learn.set.prStrumSteps === true);
  const sw = PL.exercise('strum-switch');
  assert.ok(sw && sw.set.prStrumB === 'D>UDUDUDU');
  assert.match(help.forExercise('learn-strum').steps.join(' '), /Listen.*Muted.*On one chord.*With the changes/);
});

test('in steps: listen, muted (chucks), one chord, the changes', () => {
  assert.strictEqual(PL.mutedPattern('B-D-b-D>U'), 'X-X-X-X>X');
  const bars = PL.strumStepBars('D-DU-UDU', ['C', 'Am', 'F', 'G']);
  assert.strictEqual(bars.length, 18);
  assert.deepStrictEqual([...new Set(bars.map((b) => b.step))], ['listen', 'muted', 'one', 'changes']);
  assert.ok(bars.filter((b) => b.step === 'muted').every((b) => b.pattern === 'X-XX-XXX'));
  assert.ok(bars.filter((b) => b.step !== 'changes').every((b) => b.chords[0] === 'C'));
  assert.deepStrictEqual(bars.filter((b) => b.step === 'changes').slice(0, 4).map((b) => b.chords[0]), ['C', 'Am', 'F', 'G']);
  assert.strictEqual(bars[0].level, 'loud');
  const text = PL.planText(bars);
  assert.match(text, /\{X-XX-XXX\}/);
});

test('switch: two bars of each', () => {
  const bars = PL.switchBars('A1', 'B2', ['C', 'G'], 8);
  assert.deepStrictEqual(bars.map((b) => b.pattern), ['A1', 'A1', 'B2', 'B2', 'A1', 'A1', 'B2', 'B2']);
});

test('Free Practice: the controls, both apps', () => {
  const markup = read('web/pr_markup.html');
  assert.match(markup, /<input id="prStrumSteps" type="checkbox" \/> Learn it in steps/);
  assert.match(markup, /<select id="prStrumB"/);
  const js = read('web/pr_js.js');
  assert.ok(js.includes("barList.push(...PL.strumStepBars(pattern, chords));"));
  assert.ok(js.includes("barList.push(...PL.switchBars(pattern, patternB, chords, n));"));
  const desk = read('index.html');
  assert.ok(desk.includes('id="prStrumSteps"') && desk.includes("PL.strumStepBars(pattern, chords)"), 'synced to the desktop');
  assert.strictEqual(PL.EXERCISES.length, 42);
});
