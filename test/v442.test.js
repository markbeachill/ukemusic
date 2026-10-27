// 4.42: Learn in the web player: from memory, Next chord?, the learn sheet, Chord patterns and the circle.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const WEB = path.join(__dirname, '..', 'web');
const app = fs.readFileSync(path.join(WEB, 'app.html'), 'utf8');
const k = fs.readFileSync(path.join(WEB, 'k_js.js'), 'utf8');

test('the Learn button and its dialogs', () => {
  for (const id of ['learnBtn', 'learnDialog', 'learnStage', 'learnPlay', 'learnQuizBtn', 'learnSheetBtn', 'learnPatternsBtn', 'learnCircleBtn', 'quizDialog', 'learnSheetDialog', 'learnSheetFrame', 'learnInfoDialog']) assert.ok(app.includes(`id="${id}"`), id);
});

test('from memory in the web karaoke: fading chords, no shapes, kept on a line tap', () => {
  assert.ok(k.includes('function karaokeStart(ir, schedule, startLine, endLine = 0, learn = null)'));
  assert.ok(k.includes("window.ukemusic.learn.fadePlan(ir, analysis, learn.stage)") && k.includes('learnChordEl(chord, piece.chord, line.line)'));
  assert.ok(k.includes('holder.hidden = !karaokeShapesOn() || Boolean(karaokeView.learn)'));
  assert.ok(app.includes('window.__k.start(ir, schedule, fromLine, 0, learnOpts)') && app.includes('window.__k.learnOpts()'));
  assert.ok(fs.readFileSync(path.join(WEB, 'k_css.css'), 'utf8').includes('.k-chord.k-hidden'));
});

test('the analysis is the desktop app\'s own (src/learn.js through the bundle)', () => {
  for (const f of ['U.learn.quizQuestions', 'U.learn.quizOptions', 'U.learn.learnSheetHtml', 'U.learn.chordMap', 'U.learn.circleSvg', 'U.learn.circleNotes', 'U.progressions.analyse(ir, { key })']) assert.ok(app.includes(f), f);
  const preload = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');
  assert.ok(preload.includes("learn: require('./learn')"));
});

test('the web player\'s learn sheet names the web player\'s menus', () => {
  assert.ok(app.includes(".replace(' (Learn → The changes…)', ' (Free Practice → Chord switching)')"));
  assert.ok(require('../src/learn').learnSheetHtml({ title: 'T' }).includes(' (Learn → The changes…)'), 'the text it replaces is still there');
});

test('on a phone the play bar wraps (Learn made it too wide)', () => {
  assert.ok(/@media \(max-width: 600px\) \{\s*\.player-row \{ flex-wrap: wrap/.test(app));
});
