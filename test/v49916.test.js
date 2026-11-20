// 4.99.16: every place a strum is drawn shows it the same way: one list of symbols
// (src/strum-symbols.js), accents marked. The test pattern has every kind of stroke:
// B (bass, accented), - (rest), b (alternate bass), D, M (palm-muted, accented), U, X (chuck).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const S = require('../src/strum-symbols');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

const PATTERN = 'B>-bDM>UX';
const WANT = ['B>', '·', 'b', '↓', '⇣>', '↑', '✕'];   // symbol, and > when accented
const cells = (steps) => steps.map((s) => s.symbol + (s.accent ? '>' : ''));

t('the strip reading: every stroke, its symbol and its accent', () => {
  assert.deepStrictEqual(cells(S.steps(PATTERN, 4)), WANT);
  assert.deepStrictEqual(cells(S.steps('D>DD', 3)), ['↓>', '↓', '↓']);   // Amazing Grace
  assert.deepStrictEqual(S.steps('D-DU', 2).map((s) => s.num), ['1', '&', '2', '&']);
  assert.strictEqual(S.steps('->D', 4)[0].accent, false, 'no accent on a rest (as playback)');
});

t('the sheet\'s strum box draws the same symbols and accents', () => {
  const html = require('../src/strum-box').renderStrum(PATTERN, { style: 'compact' });
  const got = [...html.matchAll(/<span class="sb-a( acc)?( rest)?">([^<]*)<\/span>/g)].map((m) => m[3] + (m[1] ? '>' : ''));
  assert.deepStrictEqual(got, WANT);
});

t('the strum menus\' arrows, and arrows in the HTML and Markdown sheets', () => {
  assert.strictEqual(require('../src/strums').arrows(PATTERN), 'B>·b↓⇣>↑✕');
  // the sheets written as text keep one character per stroke (a rest stays -), so they still line up
  const ir = require('../src/parser')(`{${PATTERN}}\n[C]la`);
  assert.strictEqual(require('../src/renderer-markdown')(ir, { rhythmNotation: 'arrows' }).split('\n')[0], 'B>-b↓⇣>↑✕');
  assert.match(require('../src/renderer-html')(ir, { rhythmNotation: 'arrows', strumStyle: 'plain' }), /B&gt;-b↓⇣&gt;↑✕/);
});

t('every strip uses the one list: desktop play band and karaoke, web strip and karaoke, Free Practice', () => {
  const desktop = read('index.html');
  assert.match(desktop, /<script src="src\/strum-symbols\.js"><\/script>/);
  assert.match(desktop, /const STROKE_SYMBOLS = window\.UkeStrumSymbols\.SYMBOLS;/);
  assert.match(desktop, /return window\.UkeStrumSymbols\.steps\(pattern, beatsPerBar\);/);
  const web = read('web/app.html');
  assert.match(web, /const ARROWS = window\.UkeStrumSymbols\.SYMBOLS;/);
  assert.match(web, /function stripSteps\(pattern, beatsPerBar\) \{ return window\.UkeStrumSymbols\.steps\(pattern, beatsPerBar\); \}/);
  assert.match(web, /s\.accent \? 'accent' : ''/, 'the web strip marks accents');
  assert.match(read('web/build.js'), /'strum-symbols\.js', 'my-strums\.js'/);
  assert.match(read('web/pr_js.js'), /window\.UkeStrumSymbols\.symbol\(s\.stroke\)/);
  // no page keeps a list of its own
  for (const f of ['index.html', 'web/app.html', 'web/pr_js.js', 'web/k_js.js', 'src/renderer-html.js', 'src/renderer-markdown.js']) {
    assert.doesNotMatch(read(f), /\{ D: '(↓|\\u2193)'/, f);
  }
});

t('accents look the same everywhere: the strum box\'s colour, underlined', () => {
  for (const f of ['index.html', 'web/pr_css.css']) assert.match(read(f), /\.k-step\.accent \.sym \{[^}]*color: var\(--chord, #b22222\); text-decoration: underline;/, f);
  assert.match(read('web/app.html'), /\.strip span\.accent \{ color: var\(--chord\); text-decoration: underline;/);
  assert.match(read('src/strum-box.js'), /\.strum-box \.sb-a\.acc \{[^}]*text-decoration: underline;/);
});

console.log(`v4.99.16: ${n} tests passed`);
