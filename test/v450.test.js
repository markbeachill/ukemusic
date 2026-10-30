// 4.50: durable practice, focused help, predictable settings and timer cleanup.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const progress = require('../src/practice-progress');
const catalog = require('../src/practice-catalog');
const help = require('../src/practice-help');
const training = require('../src/training');
const root = path.join(__dirname, '..');
function test(name, fn) { fn(); console.log('✓ ' + name); }

test('recent history is distinct, capped at three, and survives a storage round trip', () => {
  const data = progress.emptyProgress();
  for (const id of ['A', 'B', 'C', 'A']) progress.markStarted(data, id);
  assert.deepStrictEqual(data.recent, ['A', 'C', 'B']);
  progress.markStarted(data, 'D');
  assert.deepStrictEqual(progress.normalise(JSON.parse(JSON.stringify(data))).recent, ['D', 'A', 'C']);
});

test('old progress migrates without losing scores, time or routines; invalid backups are rejected', () => {
  const old = { version: 1, exercises: { 'one-minute': { scores: [{ count: 20, label: 'C>F' }] } }, days: { '2026-10-30': 120 }, routines: [{ name: 'Mine', steps: [{ id: 'one-minute', minutes: 5 }] }] };
  const data = progress.normalise(old);
  assert.strictEqual(data.version, 2);
  assert.strictEqual(data.days['2026-10-30'], 120);
  assert.strictEqual(data.exercises['one-minute'].scores[0].count, 20);
  assert.strictEqual(data.routines[0].steps[0].minutes, 1);
  assert.deepStrictEqual(data.recent, []);
  assert.throws(() => progress.normalise({ songs: [] }), /Invalid/);
});

test('best clean tempos are separate for different exercise setups', () => {
  const data = progress.emptyProgress();
  progress.logClean(data, 'chord-change', { date: '2026-10-30', tempo: 110, context: 'C>F', settings: { from: 'C', to: 'F' } });
  progress.logClean(data, 'chord-change', { date: '2026-10-30', tempo: 60, context: 'G>Bb', settings: { from: 'G', to: 'Bb' } });
  const entry = data.exercises['chord-change'];
  assert.strictEqual(entry.contexts['C>F'].best_tempo, 110);
  assert.strictEqual(entry.contexts['G>Bb'].best_tempo, 60);
  assert.strictEqual(entry.last_context, 'G>Bb');
});

test('every exercise has its own named help and a concrete practice goal', () => {
  assert.strictEqual(catalog.EXERCISES.length, 39);
  for (const exercise of catalog.EXERCISES) {
    const instructions = help.forExercise(exercise.id);
    assert.strictEqual(instructions.title, exercise.title);
    assert.ok(instructions.steps.length >= 3);
    assert.ok(instructions.goal.length > 15);
  }
  assert.ok(help.forExercise('one-minute').steps.join(' ').includes('Each transition counts once'));
  assert.ok(help.forExercise('noodle-create').steps.join(' ').includes('does not record'));
});

test('all twelve keys work for progressions and blues; three-note practice has three pitch classes', () => {
  assert.strictEqual(Object.keys(catalog.KEY_NOTES).length, 12);
  for (const key of Object.keys(catalog.KEY_NOTES)) {
    assert.strictEqual(catalog.progressionChords('pop', key)[0], key);
    assert.strictEqual(training.bluesChart({ key })[0], key + '7');
  }
  const dots = catalog.safeNotes({ key: 'C', set: 'three', tuning: [67,60,64,69] });
  assert.deepStrictEqual([...new Set(dots.map((d) => d.pc))].sort((a,b) => a-b), [0,2,4]);
});

function browserFs(storage) {
  const context = { module: { exports: {} }, localStorage: storage };
  vm.runInNewContext(fs.readFileSync(path.join(root,'web/stubs/fs.js'),'utf8'),context);
  return context.module.exports;
}
test('public-browser practice persists over module reloads and reports storage failures', () => {
  const saved = new Map();
  const storage = { getItem: (k) => saved.get(k), setItem: (k,v) => saved.set(k,v) };
  const first = browserFs(storage);
  const data = progress.emptyProgress();
  progress.markStarted(data,'chord-change');
  data.preferences['chord-change'] = { prFromRoot: 'G', prToRoot: 'D' };
  data.routines.push({ name: 'My changes', steps: [{ id:'chord-change', minutes:2, settings: data.preferences['chord-change'] }] });
  first.writeFileSync('/songs/practice.json',JSON.stringify(data));
  const restored = JSON.parse(browserFs(storage).readFileSync('/songs/practice.json'));
  assert.strictEqual(restored.preferences['chord-change'].prToRoot,'D');
  assert.strictEqual(restored.routines[2].steps[0].settings.prFromRoot,'G');
  assert.deepStrictEqual(restored.recent,['chord-change']);
  assert.throws(() => browserFs({ getItem:()=>null, setItem:()=>{throw Error('quota');} }).writeFileSync('practice.json','{}'),/quota/);
});

// Run the actual UI functions with a minimal DOM. This catches navigation state errors
// without needing Electron or an audio device in CI.
function practiceUI() {
  const elements = new Map();
  const controlIds = ['prTempo','prDynamics','prChords','prStrum','prProgression','prProgKey','prVolume'];
  function element(id) {
    if (!elements.has(id)) elements.set(id, { id, value:'', type:'text', tagName:'INPUT', hidden:false, disabled:false, checked:false,
      options:[], dataset:{}, className:'', classList:{add(){},remove(){},toggle(){}},
      addEventListener(){}, setAttribute(){}, focus(){}, querySelector(selector){return selector === '.practice-body' ? element('practice-body') : null;},
      querySelectorAll(selector){return selector.includes('.practice-controls') ? controlIds.map(element) : [];},
      closest(selector){return selector === '.practice-controls' ? element('prControls') : null;} });
    return elements.get(id);
  }
  const pp = { ...progress, read:()=>progress.emptyProgress(), write:()=>true, logSession:progress.logSession,
    logClean:(d,id,o)=>({data:d,next:progress.logClean(d,id,o)}), defaults:()=>progress.emptyProgress().routines };
  const context = { console, document:{ getElementById:element, querySelector:()=>null, body:{children:[]} },
    window:{ukemusic:{ training:{}, fingers:{}, notesLib:{}, practiceLib:catalog, practiceProgress:pp,practiceHelp:help }, addEventListener(){}},
    player:null, songsFolder:()=>'/songs', setInterval(){}, setTimeout(){}, clearTimeout(){}, cancelAnimationFrame(){}, performance:{now:()=>1000} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'web/pr_js.js'),'utf8') + '\nthis.api={pr,prOpen,prShowHome,prMarkClean,prSaveEnteredScore};', context);
  vm.runInContext("prSetup=()=>{}; prShowMode=(mode)=>{pr.mode=mode;}; prPreview=()=>{}; prKindRows=()=>{}; prRenderHome=()=>{}; prUpdateMobile=()=>{}; pr.progress=PP.read();",context);
  element('prTempo').value='80';
  element('prDynamics').type='checkbox';
  context.api.pr.defaults = { prTempo:'80',prDynamics:false,prChords:'C Am F G',prStrum:'D-DU-UDU',prProgression:'',prProgKey:'C' };
  return { ...context.api, element };
}
test('opening exercises resets other presets and restores personal settings', () => {
  const ui=practiceUI();
  ui.prOpen('dynamics'); assert.strictEqual(ui.element('prDynamics').checked,true);
  ui.prShowHome(); ui.prOpen('downs'); assert.strictEqual(ui.element('prDynamics').checked,false);
  ui.element('prTempo').value='95'; ui.prShowHome(); ui.prOpen('downs');
  assert.strictEqual(ui.element('prTempo').value,'95');
  assert.strictEqual(ui.element('prClean').disabled,true);
  const before=JSON.stringify(ui.pr.progress.exercises); ui.prMarkClean();
  assert.strictEqual(JSON.stringify(ui.pr.progress.exercises),before);
});
test('Back cancels an active one-minute timer and cannot save a score to a cleared exercise', () => {
  const ui=practiceUI(); ui.pr.exId='one-minute'; ui.pr.mode='oneminute'; ui.pr.view='player';
  ui.pr.oneMinute={running:true,raf:1}; ui.pr.pendingScore={exId:'one-minute'};
  ui.prShowHome();
  assert.strictEqual(ui.pr.oneMinute.running,false);
  assert.strictEqual(ui.pr.pendingScore,null);
  assert.strictEqual(ui.pr.exId,null);
  ui.prSaveEnteredScore();
  assert.deepStrictEqual(Object.keys(ui.pr.progress.exercises),[]);
});

test('desktop and browser share the same practice behaviour, help markup and styles', () => {
  require('../tools/sync-practice').sync();
});
