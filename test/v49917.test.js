// 4.99.17: a song's own practice plan (learn/practice-plan.txt): the text, read and checked, and
// made into Free Practice steps that follow the song where the plan says so
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SP = require('../src/song-practice');
const parse = require('../src/parser');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

const SONG = '{D>DD}\n[[Verse]]\n[C]one [F]two [C]three [G7]four [C]five\n[[Chorus]]\n[Am]six [F]seven [G7]eight [C]nine\n';
const ir = parse(SONG);
const changes = [{ from: 'G7', to: 'C' }, { from: 'C', to: 'F' }, { from: 'Am', to: 'F' }];

t('every kind of step, its minutes, tempo and note', () => {
  const p = SP.parsePlan(`Practise it a section at a time.
And count three.
# a comment
2 min  Shapes                ; the song's own
       Trouble spots
2 min Hard changes 3
2 minutes Change G7 to C at 60 ; the one we rush
3 min  Strum at 70%
3 min  Strum D-DU-UDU
4 min  Chords in order at 85%
3 min  Section Chorus at 90
3 min  Exercise: Spider walk at 80
Then: the song from memory`);
  assert.strictEqual(p.intro, 'Practise it a section at a time. And count three.');
  assert.deepStrictEqual(p.problems, []);
  assert.deepStrictEqual(p.steps.map((s) => s.kind), ['shapes', 'trouble', 'hard', 'change', 'strum', 'strum', 'order', 'section', 'exercise']);
  assert.strictEqual(p.steps[0].note, 'the song\'s own');
  assert.strictEqual(p.steps[1].minutes, 2, 'no minutes: the usual for that step');
  assert.strictEqual(p.steps[2].count, 3);
  assert.deepStrictEqual([p.steps[3].from, p.steps[3].to, p.steps[3].tempo, p.steps[3].note], ['G7', 'C', { abs: 60 }, 'the one we rush']);
  assert.deepStrictEqual(p.steps[4].tempo, { pct: 70 });
  assert.strictEqual(p.steps[5].pattern, 'D-DU-UDU');
  assert.strictEqual(p.steps[8].id, 'spider-1234');
  assert.strictEqual(p.after, 'the song from memory');
});

t('lines it can\'t read are named, with their line', () => {
  const p = SP.parsePlan('2 min Shapes\n2 min Juggle\n2 min Change X to C\n3 min Exercise: Kazoo\n2 min Strum DUQ');
  assert.deepStrictEqual(p.problems.map((x) => x.line), [2, 3, 4, 5]);
  assert.match(p.problems[0].message, /Not a step ukemusic knows: "Juggle"/);
  assert.match(p.problems[1].message, /"X" isn't a chord/);
  assert.match(p.problems[2].message, /No Free Practice exercise called "Kazoo"/);
  assert.strictEqual(p.steps.length, 1);
});

t('the plan ukemusic makes is its own text, and follows the song', () => {
  const plan = SP.songPlan({ title: 'Test', ir, changes, tempo: 100 });
  assert.strictEqual(plan.own, false);
  assert.deepStrictEqual(plan.steps.map((s) => s.label), ['Practise the chord shapes', 'Hard change: G7 → C', 'Hard change: C → F', 'Learn the strum', 'Play the chords in order']);
  assert.deepStrictEqual(plan.steps.map((s) => s.settings.prTempo), [60, 60, 60, 70, 85]);
  assert.strictEqual(plan.steps[3].strum, 'D>DD');
  // a chord changed in the song: the following words follow it
  const ir2 = parse(SONG.replace(/G7/g, 'G'));
  assert.match(SP.songPlan({ ir: ir2, changes }).steps[0].settings.prDrillSet, /\bG\b/);
});

t('your own plan: chords as written (moved with the key), warnings for chords gone, notes and the ending', () => {
  const text = 'Go slowly.\n2 min Change G7 to C ; the one we rush\n2 min Shapes C F E7\n3 min Section Chorus\n3 min Section Bridge\nThen: the song at its own speed';
  const plan = SP.songPlan({ title: 'Test', ir, changes, tempo: 100, planText: text });
  assert.strictEqual(plan.own, true);
  assert.strictEqual(plan.intro, 'Go slowly.');
  assert.strictEqual(plan.steps[0].note, 'the one we rush');
  assert.strictEqual(plan.steps[1].warning, 'E7 not in the song any more');
  assert.strictEqual(plan.steps[2].settings.prChords, 'Am F G7 C');
  assert.strictEqual(plan.steps.length, 3, 'a section the song hasn\'t got is left out');
  assert.deepStrictEqual(plan.warnings.map((w) => w.line), [3, 5]);
  assert.strictEqual(plan.after, 'The song at its own speed (100 bpm).');
  // played two semitones up: the plan's chords move with it
  const up = SP.songPlan({ ir: require('../src/transpose').transposeIR(ir, 2), changes: [], planText: '2 min Change G7 to C', shift: 2 });
  assert.deepStrictEqual([up.steps[0].from, up.steps[0].to], ['A7', 'D']);
  assert.strictEqual(up.steps[0].warning, undefined);
});

t('checkPlan: problems and warnings together, in line order', () => {
  const list = SP.checkPlan('2 min Shapes C X\n2 min Shapes E7', { ir, changes });
  assert.deepStrictEqual(list.map((x) => x.line), [1, 2]);
});

t('every exercise can be named by its title', () => {
  for (const e of require('../src/practice-catalog').EXERCISES) assert.strictEqual(SP.findExercise(e.title).id, e.id, e.title);
});

t('both apps: a Practice tab (all features), Practise this song runs the song\'s plan, Free Practice shows its words', () => {
  const desk = read('index.html');
  assert.match(desk, /<button id="tabPractice" data-feature="songPracticePlan"/);
  assert.match(desk, /const PLAN_FILE = 'practice-plan\.txt';/);
  assert.match(desk, /planText: planText === undefined \? await loadPlanText\(\) : planText,/);
  assert.match(desk, /askConfirm\('Start again from the song\?/);
  const web = read('web/app.html');
  assert.match(web, /<button id="editTabPlan" data-feature="songPracticePlan"/);
  assert.match(web, /planText: planText === undefined \? \(view\.song\?\.practicePlan \|\| ''\) : planText,/);
  assert.match(web, /\.\.\.\(song\.practicePlan \? \{ practicePlan: song\.practicePlan \} : \{\}\)/, 'kept with the song on the device');
  assert.match(read('web/pr_markup.html'), /<div id="prPlanNote" class="pr-plan-note" role="note" hidden><\/div>/);
  assert.match(read('web/pr_js.js'), /function prShowPlanNote\(r, step\)/);
  assert.match(read('src/preload.js'), /songPlanAutoText: songPractice\.AUTO_TEXT/);
  const row = require('../src/feature-levels').FEATURES.find((f) => f.id === 'songPracticePlan');
  assert.deepStrictEqual([row.app, row.level], ['both', 'all']);
});

t('4.99.18: + Add step offers the song\'s own chords, changes, strum and sections', () => {
  const list = SP.stepChoices({ ir, changes });
  const lines = list.map((c) => c.line);
  assert.ok(lines.includes('2 min  Shapes C F G7'));
  assert.ok(lines.includes('2 min  Change G7 to C at 60'));
  assert.ok(lines.includes('3 min  Strum D>DD at 70%'));
  assert.ok(lines.includes('3 min  Section Chorus at 85%'));
  assert.ok(lines.includes('3 min  Exercise: Spider walk'));
  for (const c of list.filter((x) => x.group !== 'Words')) assert.deepStrictEqual(SP.parsePlan(c.line).problems, [], c.line);
  assert.ok(SP.stepChoices({}).length > 40, 'with no song: the exercises still');
});

t('4.99.18: the learn sheet prints the song\'s own plan in place of the usual steps', () => {
  const L = require('../src/learn');
  const own = SP.songPlan({ title: 'T', ir, changes, planText: 'Sing as you play.\n2 min Change G7 to C ; the one we rush\nThen: the song from memory' });
  const html = L.learnSheetHtml({ title: 'T', plan: own });
  assert.match(html, /<h2>Practising it <span class="ptime">\(about 2 minutes/);
  assert.match(html, /<p class="pintro">Sing as you play\.<\/p>/);
  assert.match(html, /<b>Change: G7 → C<\/b> <span class="pmin">2 min at 60 bpm<\/span><br><span class="pnote">the one we rush<\/span>/);
  assert.match(html, /Then: The song from memory\./);
  assert.doesNotMatch(html, /<h2>Learning it<\/h2>/);
  // ukemusic's own plan: the usual steps
  assert.match(L.learnSheetHtml({ title: 'T', plan: SP.songPlan({ ir, changes }) }), /<h2>Learning it<\/h2>/);
});

console.log(`v4.99.17: ${n} tests passed`);
