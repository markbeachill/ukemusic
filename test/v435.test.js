// 4.35: the Session screen: a song cut into blocks for one screen, chords over words built to
// wrap, the chord shapes it needs, and the fitting (checked here with a fake layout).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const view = require('../src/session-view');
const lc = require('../src/chord-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ir = (text) => parse(text);
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');

test('blocks: a blank line or a heading on its own starts a block, never splitting one', () => {
  const b = view.blocks(ir('Verse 1:\n[C]One\n[G]Two\n\nChorus:\n[F]Three\n\n[C]Four\n'));
  assert.deepStrictEqual(b.map((x) => [x.label, x.lines.length]), [['Verse 1:', 2], ['Chorus:', 1], ['', 1]]);
});

test('sessionHtml: one <section class="blk"> per block, with its label', () => {
  const html = view.sessionHtml(ir('Verse 1:\n[C]One\n\nChorus:\n[F]Three\n'));
  assert.strictEqual((html.match(/<section class="blk">/g) || []).length, 2);
  assert.ok(html.includes('<div class="lab">Verse 1:</div>'));
  assert.ok(html.includes('<div class="lab">Chorus:</div>'));
});

test('chords over words: each chord sits on the letters after it, in a word that never breaks', () => {
  const html = view.sessionHtml(ir('Oh [G7]Danny [C]boy, the pipes\n'), { mode: 'over' });
  assert.ok(html.includes('<span class="wd"><span class="u"><b class="c">G7</b><span class="w">Danny</span></span></span>'));
  assert.ok(html.includes('<span class="u"><b class="c">C</b><span class="w">boy,</span></span>'));
  assert.ok(html.includes(' the pipes'), 'words without chords stay plain text, so the line can wrap at any space');
  assert.strictEqual(strip(html).replace(/G7|C/g, '').trim(), 'Oh Danny boy, the pipes');
});

test('chords over words: a chord in the middle of a word keeps the word together', () => {
  const html = view.sessionHtml(ir('Sum[F]mertime\n'));
  assert.ok(html.includes('<span class="wd">Sum<span class="u"><b class="c">F</b><span class="w">mertime</span></span></span>'));
});

test('chords over words: a chord between spaces stands alone over a space', () => {
  const html = view.sessionHtml(ir('Go [C] [G] now\n'));
  assert.ok(html.includes('<b class="c">C</b><span class="w">&nbsp;</span>'));
});

test('chords in the words (inline mode)', () => {
  const html = view.sessionHtml(ir('Oh [G7]Danny [C]boy\n'), { mode: 'inline' });
  assert.ok(html.includes('Oh <b class="ci">G7</b>Danny <b class="ci">C</b>boy'));
});

test('songbook marks show as written; N.C. is faint', () => {
  const html = view.sessionHtml(ir('[C↓]Stop [x]here [N.C.]now\n'));
  assert.ok(html.includes('<b class="c">C↓</b>'), html);
  assert.ok(/<b class="c nc">N\.?C\.?<\/b>/.test(html), html);
});

test('a strum on its own line is labelled; line repeats show ×n', () => {
  const html = view.sessionHtml(ir('{D-DU-UDU}\n[C]La la [x2]\n'));
  assert.ok(html.includes('<div class="ss-strum"><span class="sl">Strum</span> D-DU-UDU</div>'), html);
  assert.ok(html.includes('<span class="rep">×2</span>'), html);
});

test('harmony lines are marked', () => {
  const html = view.sessionHtml(ir('{harmony}\n[C]Ooh\n{lead}\n[G]Words\n'));
  assert.ok(/<div class="ln ch harmony">/.test(html), html);
});

test('sessionChords: the chords in order, once each, no N.C.', () => {
  assert.deepStrictEqual(view.sessionChords(ir('[C]a [G]b [N.C.]c [C]d [Am]e\n')), ['C', 'G', 'Am']);
});

test('sessionSong: html both ways and a diagram per chord, common ones marked', () => {
  const s = view.sessionSong(ir('[C]a [Ebmaj7]b\n'), { title: 'T', sub: 'S', library: lc.getBuiltInLibrary('soprano') });
  assert.strictEqual(s.title, 'T');
  assert.ok(s.html.over.includes('class="u"') && s.html.inline.includes('class="ci"'));
  assert.deepStrictEqual(s.diagrams.map((d) => [d.name, d.common]), [['C', true], ['Ebmaj7', false]]);
  assert.ok(s.diagrams.every((d) => d.svg.includes('viewBox="0 0 100 145"')), 'the screen crops this viewBox: keep it in step');
  const own = view.sessionSong(ir('[C]a [Ebmaj7]b\n'), { library: lc.getBuiltInLibrary('soprano'), common: 'Ebmaj7' });
  assert.deepStrictEqual(own.diagrams.map((d) => d.common), [false, true], "the song's own common-chords list");
});

test('the CSS sizes everything in em (one font size to fit) and never splits a block', () => {
  assert.ok(view.SESSION_CSS.includes('break-inside: avoid'));
  assert.ok(!/\d+px/.test(view.SESSION_CSS));
});

// ── The fit, with a fake layout: blocks fill columns; a block is `lines` lines of `chars` letters ──
function fakeFit({ W, H, blocks }) {
  const Fit = require('../src/session-fit');
  const box = { getBoundingClientRect: () => ({ width: W, height: H }), parentElement: null };
  const lyrics = {
    style: {}, className: '', innerHTML: '', _stride: 0,
    get scrollWidth() { return this.measure().width; },
    get scrollHeight() { return this.measure().height; },
    measure() {
      const px = parseFloat(this.style.fontSize);
      const cols = Number(this.style.columnCount);
      const colW = parseFloat(this.style.columnWidth);
      const perLine = Math.max(1, Math.floor(colW / (px * 0.55)));
      let col = 0; let y = 0; let tallest = 0;
      for (const b of blocks) {
        const h = b.reduce((n, chars) => n + Math.ceil(chars / perLine), 0) * px * 2.3;
        if (y + h > H && y > 0) { col += 1; y = 0; }
        y += h; tallest = Math.max(tallest, y);
      }
      const used = col + 1;
      return { width: used <= cols ? W : Math.ceil(used / cols) * (W + px * 1.6) - px * 1.6, height: used <= cols ? tallest : H };
    }
  };
  return Fit.fit({ box, lyrics, html: () => '', minPx: 18, maxPx: 47, modes: ['over'] });
}

test('fit: a short song gets big text in one column', () => {
  const r = fakeFit({ W: 1600, H: 1000, blocks: [[30, 30, 30, 30]] });
  assert.strictEqual(r.cols, 1);
  assert.ok(r.px >= 40, JSON.stringify(r));
  assert.strictEqual(r.pages, 1);
});

test('fit: a long song goes to columns rather than tiny text', () => {
  const blocks = Array.from({ length: 8 }, () => [40, 40, 40, 40]);
  const r = fakeFit({ W: 1600, H: 1000, blocks });
  assert.ok(r.cols >= 2, JSON.stringify(r));
  assert.ok(r.fits && r.px >= 18, JSON.stringify(r));
});

test('fit: too long for one screen even at the smallest text gives pages', () => {
  const blocks = Array.from({ length: 60 }, () => [40, 40, 40, 40]);
  const r = fakeFit({ W: 1600, H: 1000, blocks });
  assert.strictEqual(r.px, 18);
  assert.ok(r.pages >= 2 && !r.fits, JSON.stringify(r));
});

test('the session window and the web player share one screen', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'session.html'), 'utf8');
  assert.ok(html.includes('src/session-screen.js') && html.includes('src/session-fit.js'));
  const pkg = require('../package.json');
  assert.ok(pkg.build.files.some((f) => f === 'session.html' || /session\.html/.test(f)), 'session.html is packaged');
  const build = fs.readFileSync(path.join(__dirname, '..', 'web', 'build.js'), 'utf8');
  assert.ok(build.includes('session-screen.js') && build.includes('session-fit.js'));
  const screen = require('../src/session-screen');
  assert.ok(typeof screen.create === 'function' && screen.CSS.includes('.ss-screen'));
});
