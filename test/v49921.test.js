// 4.99.21: a plan's Section and Chords in order steps play the song's own passage (its bars,
// strum and timing), round and round, with Again, Slower and That was clean; the time is a guide
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SP = require('../src/song-practice');
const parse = require('../src/parser');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

const TEXT = '{D-DU-UDU}\n[[Verse]]\n[C]one [F]two\n[C]three [G7]four\n[[Chorus]]\n[G]five [F]six [F]six\n[C]seven\n';
const ir = parse(TEXT);

t('the lines of a section, or of the song in order', () => {
  assert.deepStrictEqual(SP.passageLines(ir, 'Chorus'), { from: 5, to: 8 });
  assert.deepStrictEqual(SP.passageLines(ir, 'verse'), { from: 2, to: 4 });
  assert.deepStrictEqual(SP.passageLines(ir, null), { from: 3, to: 7 });
  assert.strictEqual(SP.passageLines(ir, 'Bridge'), null);
});

t('with the song\'s text, a Section step is the passage itself, until it\'s clean', () => {
  const plan = SP.songPlan({ ir, text: TEXT, shift: 2, parse: { options: { useDelimiters: true } }, planText: '3 min Section Chorus at 90 ; hold the F\n3 min Chords in order\n2 min Section Verse 2' });
  const [chorus, order] = plan.steps;
  assert.strictEqual(chorus.label, 'Play the Chorus');
  assert.strictEqual(chorus.untilClean, true);
  assert.deepStrictEqual(chorus.passage, { text: TEXT, shift: 2, from: 5, to: 8, parse: { options: { useDelimiters: true } } });
  assert.strictEqual(chorus.settings.prTempo, 90);
  assert.strictEqual(chorus.note, 'hold the F');
  assert.strictEqual(order.label, 'Play the chords in order');
  assert.deepStrictEqual([order.passage.from, order.passage.to], [3, 7]);
  assert.strictEqual(plan.steps.length, 2, 'no section called Verse 2');
  // the passage plays as the song does: the F held for two
  const S = require('../src/playback-schedule');
  const lib = require('../src/chord-library').getBuiltInLibrary('soprano');
  const sched = S.buildSchedule(ir, { library: lib, instrument: 'soprano', tempo: 90, countIn: false, startLine: 5, endLine: 8 });
  assert.deepStrictEqual(sched.bars.map((b) => b.chord), ['G', 'F', 'F', 'C']);
  // without the text (a plan kept from before): the chord list, as before
  assert.ok(SP.songPlan({ ir, planText: '3 min Section Chorus' }).steps[0].settings.prChords);
  assert.strictEqual(SP.songPlan({ ir, planText: '3 min Section Verse 1' }).steps.length, 0);
});

t('Free Practice plays the passage, shows its words, goes round, and waits for That was clean', () => {
  const js = read('web/pr_js.js');
  assert.match(js, /function prPassageSchedule\(P, \{ countIn = false \} = \{\}\)/);
  assert.match(js, /startLine: P\.from, endLine: P\.to/);
  assert.match(js, /if \(pr\.passage && pr\.mode === 'strum'\) return prPassageExercise\(\);/);
  assert.match(js, /schedule = prPassageSchedule\(ex\.passage, \{ countIn \}\)\.schedule;/);
  assert.match(js, /pr\.passage = step\.passage \|\| null;/);
  assert.match(js, /pr\.passage = null;   \/\/ 4\.99\.21: a song's passage is only for its plan step/);
  assert.match(js, /'↺ Again'/);
  assert.match(js, /'✓ That was clean'/);
  assert.match(js, /if \(step\.untilClean && left <= 0\) \{/);
  for (const f of ['index.html', 'web/app.html']) assert.match(read(f), /\/\/ 4\.99\.21: the song itself, for steps that play a passage of it as it plays/, f);
});

console.log(`v4.99.21: ${n} tests passed`);
