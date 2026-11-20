// 4.87: Free Practice redesigned: today's practice, a suggested order to get started, your week,
// a colour and a picture for each kind of exercise, slides for the instructions, a guide to print
// and a guide page on the website.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const catalog = require('../src/practice-catalog');
const plan = require('../src/practice-plan');
const pictures = require('../src/practice-pictures');
const help = require('../src/practice-help');
const progress = require('../src/practice-progress');
const MARKUP = read('web/pr_markup.html');
const CSS = read('web/pr_css.css');
const JS = read('web/pr_js.js');

test('every category has a colour that white text can sit on, and every exercise a picture', () => {
  const luminance = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  for (const c of catalog.CATEGORIES) {
    assert.match(plan.COLOURS[c.id] || '', /^#[0-9a-f]{6}$/, c.id);
    assert.ok(1.05 / (luminance(plan.COLOURS[c.id]) + 0.05) >= 4.5, `${c.id}: white text on ${plan.COLOURS[c.id]}`);
    assert.ok(pictures.forCategory(c.id).startsWith('<svg'), c.id);
  }
  assert.strictEqual(new Set(Object.values(plan.COLOURS)).size, catalog.CATEGORIES.length, 'no two the same');
  for (const e of catalog.EXERCISES) {
    const svg = pictures.forExercise(e);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), e.id);
    assert.match(svg, /role="img" aria-label="[^"]{8,}"/, `${e.id}: the picture is described`);
    assert.ok(!/NaN|undefined/.test(svg), e.id);
  }
  // pictures take the colour of the text around them, so they work in the dark and in print
  assert.match(pictures.named('fretting'), /stroke="currentColor"/);
  assert.ok(!/#(?!fff)[0-9a-f]{3,6}/i.test(pictures.named('strum').replace(/var\([^)]*\)/g, '')), 'no fixed colours but white');
});

test('pictures of the hands: fretting fingers 1 to 4, picking fingers p i m a', () => {
  for (const n of ['1', '2', '3', '4']) assert.ok(pictures.named('fretting').includes(`>${n}</text>`), n);
  for (const n of ['p', 'i', 'm', 'a']) assert.ok(pictures.named('picking').includes(`>${n}</text>`), n);
  assert.match(pictures.named('fretting'), /index 1 · middle 2 · ring 3 · little 4/);
  // on another instrument a chord-change card shows the names, not ukulele shapes
  const baritone = catalog.exerciseFor(catalog.exercise('chord-change'), 'baritone');
  assert.match(pictures.forExercise(baritone, 'baritone'), /From the chord G to the chord C/);
  assert.match(pictures.forExercise(catalog.exercise('chord-change')), /The chord C, an arrow, the chord F/);
});

test('getting started: a suggested order of ten real exercises, ticked by clean rounds, scores or time', () => {
  assert.strictEqual(plan.PATH.length, 10);
  assert.strictEqual(new Set(plan.PATH.map((s) => s.id)).size, 10);
  for (const s of plan.PATH) { assert.ok(catalog.exercise(s.id), s.id); assert.ok(s.name && s.why); assert.notStrictEqual(catalog.exercise(s.id).level, 'Intermediate', s.id); }
  const data = progress.emptyProgress();
  assert.deepStrictEqual(plan.pathState(data).map((s) => s.state), ['next', ...Array(9).fill('later')]);
  progress.logSession(data, 'downs', { date: '2026-11-10', seconds: 200, tempo: 70 });
  assert.strictEqual(plan.pathState(data)[0].state, 'next', 'time alone doesn\'t tick a strumming step');
  progress.logClean(data, 'downs', { date: '2026-11-10', tempo: 70 });
  assert.deepStrictEqual(plan.pathState(data).slice(0, 3).map((s) => s.state), ['done', 'next', 'later']);
  progress.logScore(data, 'one-minute', { date: '2026-11-10', count: 12, label: 'C>F' });
  assert.ok(plan.done(data, 'one-minute'), 'a score ticks one-minute changes');
  progress.logSession(data, 'noodle-three', { date: '2026-11-10', seconds: 70 });
  assert.ok(plan.done(data, 'noodle-three'), 'a minute ticks noodling (it has no clean button)');
  assert.strictEqual(plan.cardState(data, 'downs'), 'clean');
  assert.strictEqual(plan.cardState(data, 'island'), 'new');
  assert.strictEqual(plan.tried(data), 3);
});

test('today\'s practice: the next steps for a beginner, then the exercises left longest', () => {
  const data = progress.emptyProgress();
  const first = plan.suggest(data, '2026-11-12');
  assert.deepStrictEqual(first.steps.map((s) => s.id), ['downs', 'chord-change']);
  assert.strictEqual(first.minutes, 6);
  progress.logClean(data, 'downs', { date: '2026-11-12', tempo: 70 });
  const second = plan.suggest(data, '2026-11-12');
  assert.deepStrictEqual(second.steps.map((s) => s.id), ['downs', 'chord-change', 'down-up'], 'the last one done, to keep it, then the next two');
  assert.strictEqual(second.steps[0].today, true);
  for (const s of plan.PATH) { progress.logClean(data, s.id, { date: '2026-11-01', tempo: 70 }); progress.logScore(data, s.id, { date: '2026-11-01', count: 1 }); progress.logSession(data, s.id, { date: '2026-11-01', seconds: 90 }); }
  const later = plan.suggest(data, '2026-11-12');
  assert.strictEqual(later.steps.length, 3);
  assert.deepStrictEqual(later.steps.map((s) => (s.cat === 'warmup' ? 'w' : ['chords', 'rhythm'].includes(s.cat) ? 'c' : 't')), ['w', 'c', 't']);
  for (const s of later.steps) assert.ok(!data.exercises[s.id], `${s.id}: never tried comes first`);
  assert.deepStrictEqual(plan.suggest(data, '2026-11-12'), later, 'the same all day');
  assert.ok(!later.steps.some((s) => s.id === 'metronome'));
});

test('your week: the last seven days, today last', () => {
  const data = progress.emptyProgress();
  data.days = { '2026-11-12': 300, '2026-11-10': 120, '2026-11-01': 999 };
  const week = plan.week(data, '2026-11-12');
  assert.strictEqual(week.length, 7);
  assert.deepStrictEqual(week.map((d) => d.letter).join(''), 'FSSMTWT');
  assert.deepStrictEqual(week.map((d) => (d.seconds ? 1 : 0)).join(''), '0000101');
  assert.ok(week[6].today && !week[5].today);
});

test('slides: every exercise has its own, with a picture on each; the tour for the home screen', () => {
  for (const e of catalog.EXERCISES) {
    const slides = help.slides(e.id);
    assert.ok(slides.length >= 5 && slides.length <= 6, `${e.id}: ${slides.length}`);
    assert.strictEqual(slides[0].title, e.title);
    assert.strictEqual(slides[slides.length - 1].title, 'The goal');
    assert.strictEqual(slides[slides.length - 1].text, help.forExercise(e.id).goal);
    for (const s of slides) { assert.ok(s.title && s.text.length > 10, e.id); assert.ok(s.picture.startsWith('<svg'), e.id); }
    // the words are the same instructions as before, one to a slide
    for (const step of help.forExercise(e.id).steps.slice(0, 3)) assert.ok(slides.some((s) => s.text === step), `${e.id}: ${step}`);
  }
  assert.ok(help.slides('spider-1234').some((s) => s.title === 'Which finger is which'));
  assert.ok(help.slides('four-string').some((s) => s.title === 'The picking hand'));
  assert.ok(help.slides('downs').some((s) => s.title === 'The strumming hand'));
  assert.ok(!help.slides('blues').some((s) => /hand/i.test(s.title)));
  const tour = help.slides(null);
  assert.strictEqual(tour.length, 6);
  assert.match(tour.map((s) => s.text).join(' '), /Nothing is locked/);
  assert.match(tour.map((s) => s.text).join(' '), /The app can’t hear you/);
  assert.match(help.slides('chord-change', 'guitar')[0].picture, /From the chord G to the chord C/);
});

test('the guide to print, and the guide page on the website, are made from the same words', () => {
  const html = help.guideHtml({ made: 'ukemusic test' });
  assert.match(html, /<title>Free Practice guide<\/title>/);
  for (const e of catalog.EXERCISES) assert.ok(html.includes(e.title.replace(/&/g, '&amp;')), e.title);
  for (const k of Object.values(help.SLIDES)) assert.ok(html.includes(k.name), k.name);
  assert.match(html, /Getting started: a suggested order/);
  assert.match(html, /@page \{ size: A4/);
  const pages = require('../web/pages');
  const page = pages.PRACTICE_GUIDE_PAGE;
  const body = page.body();
  assert.strictEqual(page.file, 'practice-guide.html');
  assert.ok(page.seoTitle.length >= 25 && page.seoTitle.length <= 70, page.seoTitle);
  assert.ok(page.blurb.length >= 50 && page.blurb.length <= 160, String(page.blurb.length));
  for (const t of help.TOUR) assert.ok(body.includes(t.title), t.title);
  assert.match(body, /Which finger is which/);
  assert.match(body, /The nine kinds of exercise/);
  assert.match(body, /href="app\/#practice"/);
  assert.ok(pages.sitemap().includes('practice-guide.html'));
  assert.match(read('web/pages.js'), /<a href="practice-guide\.html">The Free Practice guide<\/a>/, 'the practice page links to it');
  assert.match(read('.gitignore'), /^site\/practice-guide\.html$/m, 'made by the build, like the other pages');
});

test('the home screen: today, the week, getting started, then the catalogue; no "Start here" left', () => {
  const order = ['id="prTodayCard"', 'id="prWeek"', 'id="prRecent"', 'id="prPathSection"', 'id="prCats"', 'id="prCards"', 'id="prTourButton"', 'id="prGuidePrint"', 'id="prExport"'].map((x) => MARKUP.indexOf(x));
  assert.ok(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1])), order.join(','));
  assert.ok(!/Start here|prBeginnerCards/.test(MARKUP + JS));
  assert.match(MARKUP, /Nothing is locked: play any exercise you like\./);
  assert.match(JS, /pr\.routine = \{ routine: \{ name: plan\.name, steps: plan\.steps\.map\(\(st\) => \(\{ id: st\.id, minutes: st\.minutes \}\)\) \}, step: 0 \};\n\s*prRoutineStep\(\);/, 'Start runs today\'s three like a routine');
  assert.match(JS, /card\.innerHTML = `<span class="pr-card-pic">\$\{PIC\.forExercise\(e, prFamily\(\)\)\}<span class="pr-state \$\{state\}">/);
  assert.match(JS, /b\.style\.setProperty\('--pr-cat', prColour\(c\.id\)\);/);
  assert.match(CSS, /\.practice \.pr-cat\.active \{ background: var\(--pr-cat\);/);
  // emoji are gone from the category buttons (they looked different on every device)
  assert.ok(!/pr-cat-icon/.test(JS));
});

test('an exercise: one bar, the settings a panel that opens, Start at the bottom, its category\'s colour', () => {
  const bar = MARKUP.slice(MARKUP.indexOf('class="practice-bar"'), MARKUP.indexOf('id="prHome"'));
  for (const id of ['prBack', 'prTitle', 'prTimer', 'prHelpButton', 'prSettingsToggle', 'practiceClose']) assert.ok(bar.includes(`id="${id}"`), id);
  assert.ok(!bar.includes('id="prClean"') && !bar.includes('id="prReset"'), 'That was clean is on the stage; Reset is in the settings');
  assert.match(bar, /id="prSettingsToggle"[^>]*aria-expanded="false" aria-controls="prControls"/);
  for (const id of ['prBack', 'prHelpButton', 'prSettingsToggle', 'practiceClose']) assert.match(bar, new RegExp(`id="${id}"[^>]*(aria-label|title)="`), `${id} is named when it's only an icon`);
  assert.ok(MARKUP.indexOf('id="prWhere"') < MARKUP.indexOf('id="prClean"') && MARKUP.indexOf('id="prClean"') < MARKUP.indexOf('id="prGrid"'));
  assert.match(MARKUP, /class="pr-controls-head"><strong>Settings for this exercise<\/strong><button id="prReset"/);
  assert.match(JS, /prSettingsOpen\(Boolean\(window\.matchMedia\?\.\('\(min-width: 1100px\)'\)\.matches\)\);/);
  assert.match(JS, /practiceEl\.style\.setProperty\('--pr-cat', prColour\(e\.cat\)\);/);
  assert.match(CSS, /\.practice:not\(\.pr-settings-open\) #prControls \{ display: none; \}/);
  assert.match(CSS, /\.practice\.pr-settings-open \.pr-mobile-go \{ display: none; \}/);
  assert.match(CSS, /\.practice \{ grid-template-rows: auto minmax\(0, 1fr\) auto; grid-template-columns: minmax\(0, 1fr\); \}/, 'nothing can push the screen wider than the window');
  assert.ok(!/@media \(min-width: 761px\) \{ \.pr-mobile-go \{ display: none; \}/.test(CSS));
  assert.ok(!/flex-wrap: wrap; padding-left: max/.test(read('web/app.html')), 'the bar no longer wraps to three rows on a phone');
});

test('slides in the app: the first visit, the first time for each kind, and from "How it works"', () => {
  assert.match(MARKUP, /<dialog id="prHelpDialog" class="pr-help" aria-labelledby="prHelpTitle">/);
  for (const id of ['prHelpContent', 'prSlideBack', 'prSlideDots', 'prSlideNext']) assert.ok(MARKUP.includes(`id="${id}"`), id);
  assert.match(JS, /function prIntro\(key\) \{\n\s*if \(!pr\.progress \|\| pr\.restoring\) return;\n(?:[^\n]*pr\.routine[^\n]*\n)?\s*pr\.progress\.seen = pr\.progress\.seen \|\| \{\};\n\s*if \(pr\.progress\.seen\[key\]\) return;\n\s*pr\.progress\.seen\[key\] = true;\n\s*prSaveProgress\(\);\n\s*prHelp\(\);/);
  assert.match(JS, /prIntro\('tour'\);/);
  assert.match(JS, /prIntro\(e\.mode\);/);
  assert.match(JS, /if \(\$p\('prHelpDialog'\)\.open\) \{ \$p\('prHelpDialog'\)\.addEventListener\('close', \(\) => setTimeout\(go, 400\), \{ once: true \}\); return; \}/, 'a timed session waits while you read');
  assert.match(JS, /event\.key === 'ArrowRight'/);
  // "seen" survives a backup and a restore
  const data = progress.emptyProgress(); data.seen = { tour: true, strum: true };
  assert.deepStrictEqual(progress.normalise(JSON.parse(JSON.stringify(data))).seen, { tour: true, strum: true });
  assert.match(JS, /await window\.ukemusicAskConfirm\(question, \{ ok: 'Replace', danger: true \}\)/, 'restoring a backup asks in the app\'s own dialog');
  for (const f of ['index.html', 'web/app.html']) assert.match(read(f), /window\.ukemusicAskConfirm = \(message, options\) => askConfirm\(message, options\);/, f);
  assert.match(JS, /el\.id !== 'askDialog' && /, 'which must stay usable while Free Practice is open');
});

test('both apps have the new pieces, and the desktop copy matches the web one', () => {
  const preload = read('src/preload.js');
  assert.match(preload, /practicePlan: require\('\.\/practice-plan'\),/);
  assert.match(preload, /practicePictures: \{ forExercise:/);
  const desktop = read('index.html');
  for (const bit of ['id="prTodayCard"', 'function prRenderPath()', '.pr-slide-nav', 'id="prGuidePrint"']) assert.ok(desktop.includes(bit), bit);
  require('../tools/sync-practice').sync(); // throws if they differ
  assert.match(read('AGENTS.md'), /src\/practice-plan\.js/);
  assert.match(read('AGENTS.md'), /src\/practice-pictures\.js/);
});

console.log('v4.87 tests passed');
