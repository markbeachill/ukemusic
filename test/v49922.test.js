// 4.99.22: a song's plan as rows (src/plan-rows.js): minutes, tempo and note to change, up, down,
// remove; each change rewrites the step's own line, so the plan stays text
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../src/plan-rows');
const SP = require('../src/song-practice');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

const TEXT = '# my plan\nGo slowly.\n2 min  Shapes\n3 min  Section Chorus at 85%  ; hold the F\n2 min  Change G7 to C\nThen: the song from memory';

t('a row is its step\'s line: minutes, what, tempo, note', () => {
  const p = SP.parsePlan(TEXT);
  assert.deepStrictEqual(p.steps.map((s) => [s.line, s.what, R.tempoText(s.tempo)]), [[3, 'Shapes', ''], [4, 'Section Chorus', '85%'], [5, 'Change G7 to C', '']]);
  assert.strictEqual(R.rowLine({ minutes: 4, what: 'Section Chorus', tempo: '90', note: 'hold the F' }), '4 min  Section Chorus at 90  ; hold the F');
  assert.strictEqual(R.rowLine({ minutes: 0, what: 'Shapes', tempo: 'fast', note: '' }), '1 min  Shapes', 'minutes at least 1; a tempo that isn\'t one is left out');
  assert.strictEqual(R.rowLine({ minutes: 2, what: 'Shapes', tempo: '70 %' }), '2 min  Shapes at 70%');
});

t('changing, moving and removing rewrite only the lines concerned', () => {
  const edited = R.editLine(TEXT, 4, { minutes: 5, what: 'Section Chorus', tempo: '70%', note: 'count 3' });
  assert.strictEqual(edited.split('\n')[3], '5 min  Section Chorus at 70%  ; count 3');
  assert.strictEqual(edited.split('\n').filter((l, i) => i !== 3).join('\n'), TEXT.split('\n').filter((l, i) => i !== 3).join('\n'));
  const lines = SP.parsePlan(TEXT).steps.map((s) => s.line);
  const down = R.moveLine(TEXT, 3, 1, lines).split('\n');
  assert.deepStrictEqual([down[2], down[3]], ['3 min  Section Chorus at 85%  ; hold the F', '2 min  Shapes']);
  assert.strictEqual(R.moveLine(TEXT, 3, -1, lines), TEXT, 'the first step can\'t go up past the words before it');
  const gone = R.removeLine(TEXT, 5);
  assert.ok(!gone.includes('Change G7 to C'));
  assert.deepStrictEqual(SP.parsePlan(gone).problems, []);
  assert.strictEqual(SP.parsePlan(gone).after, 'the song from memory');
  // round trip: a row written back reads the same
  const back = SP.parsePlan(R.rowLine({ minutes: 3, what: 'Section Chorus', tempo: '85%', note: 'hold the F' })).steps[0];
  assert.deepStrictEqual([back.minutes, back.kind, back.name, back.tempo, back.note], [3, 'section', 'Chorus', { pct: 85 }, 'hold the F']);
});

t('each step made from a line knows its line (for the row\'s label)', () => {
  const ir = require('../src/parser')('[C]a [F]b [G7]c [C]d');
  const plan = SP.songPlan({ ir, changes: [{ from: 'G7', to: 'C' }, { from: 'C', to: 'F' }], planText: '2 min Shapes\n2 min Hard changes 2' });
  assert.deepStrictEqual(plan.steps.map((s) => s.line), [1, 2, 2]);
});

t('both apps: rows in the Practice tab, the text behind Edit as text', () => {
  for (const f of ['index.html', 'web/app.html']) {
    const s = read(f);
    assert.match(s, /<div id="planRows" class="plan-rows-holder"><\/div>/, f);
    assert.match(s, /<details id="planTextBox" class="plan-text-box">\s*<summary>Edit as text<\/summary>/, f);
    assert.match(s, /window\.UkePlanRows\.render\(/, f);
  }
  assert.match(read('index.html'), /<script src="src\/plan-rows\.js"><\/script>/);
  assert.match(read('web/build.js'), /'strum-builder\.js', 'plan-rows\.js'\]/);
  assert.match(read('src/preload.js'), /songPlanParse: \(text\) => songPractice\.parsePlan\(text\)/);
});

console.log(`v4.99.22: ${n} tests passed`);
