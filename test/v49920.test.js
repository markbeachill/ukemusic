// 4.99.20: Practise this song, from the review: the trouble spot's own change, a preview before
// it starts, the step as the heading with the plan on its own line, no help slides mid-plan,
// one step again, Play it with the chords, no Keep this plan, + Add step song-first
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const SP = require('../src/song-practice');
const parse = require('../src/parser');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

t('a trouble spot is the change at its marked line', () => {
  const ir = parse('[[Verse]]\n[C]one [F]two\n[[Chorus]]\n[G]three [F]four\n[Am]five [Am]six\n');
  // F marked in the chorus (line 4) comes from G, not the verse's C
  assert.deepStrictEqual(SP.troubleChanges(ir, [{ chord: 'F', line: 4 }]), [{ from: 'G', to: 'F', line: 4 }]);
  // a line whose marked chord has moved: the line's first chord, from the chord before it
  assert.deepStrictEqual(SP.troubleChanges(ir, [{ chord: 'D', line: 5 }]), [{ from: 'F', to: 'Am', line: 5 }]);
  // a repeat of the same chord counts back to the chord before it
  assert.deepStrictEqual(SP.troubleChanges(ir, [{ chord: 'Am', line: 5 }]), [{ from: 'F', to: 'Am', line: 5 }]);
});

t('steps are named for what you do, the change in the heading', () => {
  const ir = parse('{D>DD}\n[C]one [F]two [G7]three [C]four');
  const plan = SP.songPlan({ ir, changes: [{ from: 'G7', to: 'C' }] });
  assert.deepStrictEqual(plan.steps.map((s) => s.label), ['Practise the chord shapes', 'Hard change: G7 → C', 'Learn the strum', 'Strum the chord sequence']);
  assert.deepStrictEqual([plan.steps[1].heading, plan.steps[1].kind], ['G7 → C', 'Hard change']);
});

t('Free Practice: a preview first, the step as the heading, the plan on its own line', () => {
  const markup = read('web/pr_markup.html');
  const js = read('web/pr_js.js');
  assert.match(markup, /<dialog id="prPlanPreview" class="pr-plan-preview"/);
  assert.match(markup, />◀ Step back<\/button>/);
  assert.match(markup, />Next step ▶<\/button>/);
  assert.match(markup, />End plan<\/button>/);
  assert.match(js, /function prSongPractice\(plan, \{ preview = true, step = 0 \} = \{\}\)/);
  assert.match(js, /if \(preview\) \{ prPlanPreview\(plan\); return; \}/);
  assert.match(js, /if \(step\.label\) \$p\('prTitle'\)\.textContent = step\.heading \|\| step\.label;/);
  assert.match(js, /`Step \$\{r\.step \+ 1\} of \$\{r\.routine\.steps\.length\}\$\{step\.kind/);
  assert.match(read('web/pr_css.css'), /\.practice-bar \.pr-routine-bar \{ order: 10; flex: 1 0 100%;/);
});

t('no help slides in the middle of a plan; one step again comes back to the end; Play it with the chords', () => {
  const js = read('web/pr_js.js');
  assert.match(js, /if \(pr\.routine \|\| pr\.songPlanOpening\) return;/);
  assert.match(js, /New to this exercise\? The \? button explains it\./);
  assert.match(js, /if \(r\.only\) \{ prRoutineEnd\(true\); return; \}/);
  assert.match(js, /step: Number\(again\.value\), only: true/);
  assert.match(js, /window\.ukemusicPlayFromMemory\(r\.routine\.song, \{ chords: true \}\)/);
  assert.match(read('index.html'), /if \(chords\) \{ playSong\(\{ karaoke: true \}\); return; \}/);
  assert.match(read('web/app.html'), /window\.__playSong\(chords \? \{ karaoke: true \} :/);
});

t('both apps: Edit plan from the preview; no Keep this plan; + Add step: the song first, More exercises…, no noodling', () => {
  for (const f of ['index.html', 'web/app.html']) {
    const s = read(f);
    assert.doesNotMatch(s, /planKeep/, f);
    assert.match(s, /window\.ukemusicEditSongPlan = /, f);
    assert.match(s, /More exercises \(\$\{exercises\.length\}\)…/, f);
    assert.match(s, /\.value, \{ preview: false \}\)/, f);
  }
  const choices = SP.stepChoices({});
  assert.ok(!choices.some((c) => /noodl/i.test(c.label + c.group)));
  assert.ok(choices.some((c) => c.group === 'Free Practice: Warm-ups & finger work'));
});

console.log(`v4.99.20: ${n} tests passed`);
