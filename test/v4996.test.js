// 4.99.6: Practise a song: a plan of Free Practice exercises from the song itself
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const SP = require('../src/song-practice');
const PL = require('../src/practice-catalog');
const PP = require('../src/practice-progress');
const learn = require('../src/learn');
const { loadChordLibrary } = require('../src/chord-library');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const SONG = '{swing D-DU-UDU}\n[C]one [C]more [F]two [G7]three [C]four\n[Am]five [F]six [G7]seven [C]eight';

test('the song\'s chords, in order and once each, and its strum', () => {
  const ir = parse(SONG);
  assert.deepStrictEqual(SP.chordSequence(ir), ['C', 'F', 'G7', 'C', 'Am', 'F', 'G7', 'C']);
  assert.deepStrictEqual(SP.chordSet(ir), ['C', 'F', 'G7', 'Am']);
  assert.strictEqual(SP.songStrum(ir), 'D-DU-UDU');
  assert.strictEqual(SP.songStrum(parse('{3/4 D-DUDU}\n[C]x')), 'D-DUDU');
  assert.strictEqual(SP.songStrum(parse('[C]x')), '');
});

test('the plan: shapes, two hard changes, the strum in steps, the chords in order', () => {
  const ir = parse(SONG);
  const changes = learn.songChanges(ir, loadChordLibrary(null, 'soprano'), { tuningName: 'GCEA' });
  const plan = SP.songPlan({ title: 'Test song', ir, changes, tempo: 100 });
  assert.strictEqual(plan.name, 'Practise: Test song');
  assert.deepStrictEqual(plan.steps.map((s) => s.id), ['shape-drill', 'chord-change', 'chord-change', 'learn-strum', 'metronome-strum']);
  for (const s of plan.steps) assert.ok(PL.exercise(s.id), s.id);
  assert.strictEqual(plan.steps[0].settings.prDrillSet, 'C F G7 Am');
  assert.ok(plan.steps[1].from && plan.steps[1].to);
  assert.strictEqual(plan.steps[3].strum, 'D-DU-UDU');
  assert.strictEqual(plan.steps[3].settings.prStrumSteps, true);
  assert.strictEqual(plan.steps[3].settings.prTempo, 70, '70% of the song\'s tempo');
  assert.strictEqual(plan.steps[4].settings.prChords, 'C F G7 C Am F G7 C');
  assert.strictEqual(plan.steps[4].settings.prTempo, 85);
  assert.match(plan.after, /from memory/); // 4.99.9: and a button for it
  assert.deepStrictEqual(SP.songPlan({ title: 'x', ir: parse('no chords') }).steps, []);
  assert.strictEqual(SP.songPlan({ title: 'x', ir: parse('[C]x'), strum: 'D>DDD' }).steps.find((s) => s.strum).strum, 'D>DDD', 'no strum in the song: the default');
});

test('the last six songs\' plans are kept with your practice', () => {
  const base = PP.emptyProgress ? PP.emptyProgress() : { version: 2, exercises: {}, days: {}, routines: [] };
  const plans = Array.from({ length: 8 }, (_, i) => ({ title: `S${i}`, routine: { name: 'n', steps: [] } }));
  const kept = PP.normalise ? PP.normalise({ ...base, songPlans: [...plans, { title: 5 }] }) : null;
  if (kept) assert.strictEqual(kept.songPlans.length, 6);
  assert.ok(read('src/practice-progress.js').includes('songPlans: (Array.isArray(data.songPlans)'));
});

test('both apps: Learn → Practise this song; Free Practice runs it and lists it', () => {
  const desk = read('index.html');
  assert.ok(desk.includes('<button id="songPracticeButton" class="rib-button rib-button-wide" type="button" data-icon="metronome"'));
  assert.ok(desk.includes('window.ukemusicPractiseSong(plan);'));
  const web = read('web/app.html');
  assert.ok(web.includes('<button type="button" id="learnPracticeBtn" data-feature="songPractice">'));
  assert.ok(web.includes('window.ukemusicPractiseSong(plan);'));
  const pr = read('web/pr_js.js');
  assert.ok(pr.includes('window.ukemusicPractiseSong = prSongPractice;'));
  assert.ok(pr.includes("if (step.from && step.to) {"));
  assert.ok(desk.includes('window.ukemusicPractiseSong = prSongPractice;'), 'synced to the desktop');
  assert.match(read('web/pr_markup.html'), /<section id="prSongPlans"/);
  assert.ok(read('src/preload.js').includes('songPracticePlan: (options) => songPractice.songPlan(options),'));
});
