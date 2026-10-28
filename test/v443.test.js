// 4.43: fingerstyle: tab read as chord shapes and picking patterns, Picking in steps, tab fading from memory.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const learn = require('../src/learn');
const { parse } = require('../src/parser');
const lc = require('../src/chord-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const lib = lc.getBuiltInLibrary('soprano');

const TAB = 'A|------3-----3-|------2-----2-|\nE|----0-----0---|----1-----1---|\nC|--0-----0-----|--2-----2-----|\nG|0-----0-------|0-----0-------|';
const SONG = `--START MUSIC--\n[[Intro]]\n\`\`\`tab\n${TAB}\n\`\`\`\n\n[[Verse]]\n[C]Joyful, joyful, [G7]we adore thee\n[C]Hearts unfold like [G7]flowers be[C]fore thee\n\n[[Intro]]\n\`\`\`tab\n${TAB}\n\`\`\`\n--END MUSIC--\n`;

test('tab bars read as chord shapes and picking patterns', () => {
  const bars = learn.tabBarShapes(TAB, lib, ['C', 'G7']);
  assert.strictEqual(bars.length, 2);
  assert.deepStrictEqual(bars.map((b) => [b.shape, b.pattern]), [['C', '4-3-2-4+1-3-2-1'], ['G7', '4-3-2-4+1-3-2-1']]);
  assert.strictEqual(learn.barText(bars[0]), 'Hold C, pick g-C-E-g+A-C-E-A');
  assert.strictEqual(bars[0].pick, 'g-C-E-g+A-C-E-A');
});

test('a bar in no chord shape is melody', () => {
  const bars = learn.tabBarShapes('A|--5--7--8--|\nE|-----------|\nC|-----------|\nG|-----------|', lib, ['C', 'G7']);
  assert.ok(bars[0].melody && !bars[0].shape);
  assert.strictEqual(learn.barText(bars[0]), 'pick A-A-A');
});

test('the picking summary: each tab passage with its heading', () => {
  const p = learn.pickingSummary(parse(SONG), lib);
  assert.strictEqual(p.length, 2);
  assert.ok(/Intro/.test(p[0].heading) && p[0].bars.length === 2 && p[0].chordal);
  assert.strictEqual(learn.passageText(p[0]), 'Hold C, pick g-C-E-g+A-C-E-A · Hold G7, pick g-C-E-g+A-C-E-A');
});

test('step texts: open strings and chords keep the song\'s line count and parse cleanly', () => {
  const lines = SONG.split('\n').length;
  for (const mode of ['open', 'chords']) {
    const t = learn.tabStepText(SONG, mode, lib);
    assert.strictEqual(t.split('\n').length, lines, mode);
    const ir = parse(t);
    assert.ok(!ir.some((n) => n.type === 'warning'), mode);
  }
  const open = learn.tabStepText(SONG, 'open', lib);
  assert.ok(open.includes('A|------0-----0-|------0-----0-|') && open.includes('E|----0-----0---|----0-----0---|'));
  const chords = learn.tabStepText(SONG, 'chords', lib);
  assert.ok(chords.includes('| C | G7 |') && !chords.includes('```tab'));
});

test('from memory fades the tab: first time only hides a passage heard before', () => {
  const ir = parse(SONG);
  const tabs = ir.filter((n) => n.type === 'tab').map((n) => n.line);
  const plan = (stage) => learn.fadePlan(ir, null, stage).lines;
  assert.deepStrictEqual(tabs.map((l) => plan('repeats')[l]), ['show', 'hide']);
  assert.deepStrictEqual(tabs.map((l) => plan('numbers')[l]), ['number', 'number']);
  assert.deepStrictEqual(tabs.map((l) => plan('none')[l]), ['hide', 'hide']);
});

test('a tune (not every bar on a chord shape): no shapes named, kept as written in step 1', () => {
  const M = 'A|--5--7--8--|--3--1--0--|\nE|-----------|-----------|\nC|-----------|-----------|\nG|-----------|-----------|';
  const song = `--START MUSIC--\n[[Intro]]\n\`\`\`tab\n${M}\n\`\`\`\n[C]Hello [G7]there\n--END MUSIC--\n`;
  const p = learn.pickingSummary(parse(song), lib)[0];
  assert.ok(!p.chordal && p.bars.every((b) => !b.shape));
  assert.strictEqual(learn.passageText(p), 'A tune, picked note by note');
  assert.ok(learn.tabStepText(song, 'chords', lib).includes('A|--5--7--8--|'));
  const h = learn.learnSheetHtml({ title: 'T', picking: [p] });
  assert.ok(/A tune, picked note by note/.test(h) && !/Hold/.test(h));
});

test('the learn sheet: Picking, each passage once', () => {
  const h = learn.learnSheetHtml({ title: 'T', picking: learn.pickingSummary(parse(SONG), lib) });
  assert.ok(/<h2>Picking<\/h2>/.test(h) && /<b>Hold C<\/b>, pick g-C-E-g\+A-C-E-A/.test(h));
  assert.strictEqual((h.match(/<h3>Intro/g) || []).length, 1);
  assert.ok(/×2/.test(h));
  assert.ok(!/<h2>Picking/.test(learn.learnSheetHtml({ title: 'T' })), 'no tab, no section');
});

test('the app: Picking… and Changes… in the Learn tab', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const s of ['id="learnPickButton"', 'id="learnPickDialog"', 'id="learnPickSteps"', 'textTransform', 'learn.pickingSummary(', 'Changes…']) assert.ok(html.includes(s), s);
  assert.ok(!html.includes('The changes…'));
});

test('the web player: Picking in steps, tab fading and the sheet\'s picking', () => {
  const app = fs.readFileSync(path.join(ROOT, 'web', 'app.html'), 'utf8');
  const k = fs.readFileSync(path.join(ROOT, 'web', 'k_js.js'), 'utf8');
  for (const s of ['id="learnPickBtn"', 'id="pickDialog"', "LA.tabStepText(t, 'chords'", "LA.tabStepText(t, 'open'", 'picking: U.learn.pickingSummary(', 'karaoke.step = step']) assert.ok(app.includes(s), s);
  assert.ok(k.includes('karaokeView.learn.picking = ') && k.includes("'? Picking, from memory'"));
});
