// 4.99.9: a song's practice plan starts with your trouble spots, ends at the song (Play it from
// memory), and can go back a step
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const SP = require('../src/song-practice');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const SONG = '[C]one [F]two [G7]three [C]four\n[Am]five [F]six [G7]seven [C]eight';

test('your trouble spots\' changes come first', () => {
  const ir = parse(SONG);
  assert.deepStrictEqual(SP.troubleChanges(ir, [{ chord: 'Am', line: 2, count: 1 }, { chord: 'G7', line: 1, count: 3 }, { chord: 'X', line: 1 }, { chord: 'F', gone: true }]),
    [{ from: 'F', to: 'G7', line: 1 }, { from: 'C', to: 'Am', line: 2 }]);
  const plan = SP.songPlan({ title: 'T', ir, trouble: [{ chord: 'G7', line: 1, count: 2 }], changes: [{ from: 'F', to: 'G7' }, { from: 'Am', to: 'F' }], song: { folder: 'T', transpose: 2 } });
  assert.deepStrictEqual(plan.steps.map((s) => s.label).slice(0, 3), ['The shapes', 'Your trouble spot (line 1): F to G7', 'Hard change: Am to F']);
  assert.deepStrictEqual(plan.song, { folder: 'T', transpose: 2 });
  assert.strictEqual(SP.songPlan({ title: 'T', ir, changes: [{ from: 'F', to: 'G7' }, { from: 'Am', to: 'F' }] }).steps.filter((s) => s.id === 'chord-change').length, 2, 'no trouble spots: the two hardest');
});

test('Free Practice: Back a step; the end offers the song from memory, and a step again', () => {
  assert.match(read('web/pr_markup.html'), /<button id="prRoutineBack" type="button"/);
  const pr = read('web/pr_js.js');
  assert.ok(pr.includes('function prRoutineBack()'));
  assert.ok(pr.includes("if (r.routine.song && window.ukemusicPlayFromMemory) {"));
  assert.ok(pr.includes("new Option('Go through a step again…', '')"));
  assert.ok(read('index.html').includes('function prRoutineBack()'), 'synced to the desktop');
});

test('both apps go back to the song and play it from memory', () => {
  const desk = read('index.html');
  assert.ok(desk.includes('window.ukemusicPlayFromMemory = async (song) => {'));
  assert.ok(desk.includes("song: state.song ? { folder: state.song.folder, transpose: state.transpose } : null,"));
  assert.ok(desk.includes('trouble = window.ukemusic.learn.placeTrouble(await learnLoadTrouble(), getEditorValue());'));
  const web = read('web/app.html');
  assert.ok(web.includes('window.ukemusicPlayFromMemory = (song) => {'));
  assert.ok(web.includes("song: view.song ? { id: view.song.id } : null"));
});
