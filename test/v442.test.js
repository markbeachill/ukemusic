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
  assert.ok(app.includes(".replace(' (Learn → Changes…)', ' (Free Practice → Chord switching)')"));
  assert.ok(require('../src/learn').learnSheetHtml({ title: 'T' }).includes(' (Learn → Changes…)'), 'the text it replaces is still there');
});

test('on a phone the play bar wraps (Learn made it too wide)', () => {
  assert.ok(/@media \(max-width: 600px\) \{\s*\.player-row \{ flex-wrap: wrap/.test(app));
});

// ── The website: a page for each purpose, Your songs, and the AI prompt ──
const ROOT = path.join(__dirname, '..');

test('the website: a page for each purpose and Your songs, built with the doc pages', () => {
  const pages = require('../web/pages');
  assert.deepStrictEqual(pages.PAGES.map((p) => p.file), ['learn.html', 'practise.html', 'perform.html', 'teach.html', 'chord-sheets.html']);
  assert.strictEqual(pages.SONGS_PAGE.file, 'songs.html');
  for (const p of pages.PAGES) {
    for (const k of ['h1', 'lede', 'solo', 'group', 'features', 'web', 'desk']) assert.ok(p[k] && p[k].length, `${p.file}: ${k}`);
    for (const f of p.features) if (f.img) assert.ok(fs.existsSync(path.join(ROOT, 'site', 'img', f.img)), f.img);
  }
  assert.ok(fs.readFileSync(path.join(ROOT, 'web', 'make.js'), 'utf8').includes("require('./pages.js').build()"));
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
  for (const f of ['learn.html', 'practise.html', 'perform.html', 'teach.html', 'chord-sheets.html', 'songs.html', 'how-learn-works.html']) assert.ok(ignore.includes(`site/${f}`), f);
  const header = pages.siteHeader('teach.html');
  assert.ok(header.includes('href="teach.html" aria-current="page"') && header.includes('href="./#get"'));
});

test('the front page: the doors, browser or computer, and every link goes somewhere', () => {
  const site = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8');
  assert.ok(site.includes('id="doors"') && site.includes('id="choose"') && site.includes('<section id="get">') && site.includes('id="download"'));
  const local = [...site.matchAll(/href="([a-z-]+\.html)(#[^"]*)?"/g)].map((m) => m[1]);
  const made = [...require('../web/pages').PAGES.map((p) => p.file), 'songs.html', ...require('../web/docs').PAGES.map((p) => p.html)];
  for (const f of new Set(local)) assert.ok(made.includes(f), `${f} is linked but not made`);
  for (const img of [...site.matchAll(/src="img\/([^"]+)"/g)].map((m) => m[1])) assert.ok(fs.existsSync(path.join(ROOT, 'site', 'img', img)), img);
});

test('the AI prompt describes the format the app reads', () => {
  const { AI_PROMPT } = require('../src/ai-prompt');
  for (const bit of ['--START MUSIC--', '[C]Oh my [G7]darling', '[[Chorus]]', '{D-DU-UDU}', '{3/4 D-DUDU}', '[Em:2]', '[C x3]', '| C | G | Am | F |', '(x2)', '[C↓]', '[N.C.]']) assert.ok(AI_PROMPT.includes(bit), bit);
  // a song written by its rules reads with no warnings
  const parse = require('../src/parser');
  const song = '--START MUSIC--\n{D-DU-UDU}\n[[Intro]] | C | G | Am | F |\n\n[[Verse 1]]\n[C]Oh my [G7]darling, [Em:2]oh my [Am]darling\n[C x3] (x2)\n\n[[Chorus]]\n[C↓]Gone for [N.C.]ever | C G |\n--END MUSIC--\n';
  const warnings = parse(song).flatMap((n) => n.warnings || []);
  assert.deepStrictEqual(warnings, []);
  assert.ok(require('../web/pages').SONGS_PAGE.body().includes('id="aiPrompt"'));
});

test('Copy AI prompt in Paste from website: the same prompt as the website', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('id="convertAiPrompt"') && html.includes('window.ukemusic.copyText(window.ukemusic.aiPrompt)'));
  const preload = fs.readFileSync(path.join(ROOT, 'src', 'preload.js'), 'utf8');
  assert.ok(preload.includes("aiPrompt: require('./ai-prompt').AI_PROMPT") && preload.includes('copyText: (text)'));
  assert.ok(fs.readFileSync(path.join(ROOT, 'WRITING.md'), 'utf8').includes('**Copy AI prompt**'));
});

test('a setlist with long names stays in its column', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('grid-template-columns: minmax(0, 1fr); gap: 4px; }') && html.includes('.setlist-songs li { min-width: 0; }'));
});
