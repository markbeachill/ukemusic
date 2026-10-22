// 4.17: section names Show / Small / Hide (Export → Section names), to print fewer pages
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const { renderHtml } = require('../src/renderer-html');
const { renderLyricsHtml } = require('../src/renderer-lyrics');
const up = require('../src/stylesheet-upgrade');
const sets = require('../src/style-sets');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const DEFAULT = fs.readFileSync(path.join(__dirname, '..', 'src', 'default-style.css'), 'utf8');

test('a section with lines is ordinary; a heading on its own, or with x2, is a cue', () => {
  const html = renderHtml(parse('[[Verse 1]]\n[C]Hello there\n\n[[Chorus]]\n\n[[Verse 2]]\n[G]Again\n[[Chorus]] x2\n'));
  const sections = html.match(/<section class="[^"]*">/g);
  assert.deepStrictEqual(sections, ['<section class="song-section">', '<section class="song-section section-cue">', '<section class="song-section">']);
  // "[[Chorus]] x2" after a line is a label on its own line (not a heading), so it always shows
  assert.ok(/class="inline-label"[^>]*>Chorus</.test(html));
});
test('lyrics pages mark cues the same way', () => {
  const html = renderLyricsHtml(parse('[[Verse 1]]\nHello there\n\n[[Chorus]]\n\n[[Verse 2]]\nAgain\n'));
  const sections = html.match(/<section class="[^"]*">/g);
  assert.deepStrictEqual(sections, ['<section class="song-section lyrics-section">', '<section class="song-section lyrics-section section-cue">', '<section class="song-section lyrics-section">']);
});
test('the style sets hide or shrink section names, keeping cues', () => {
  for (const s of sets.builtInStyleSets(DEFAULT)) {
    assert.ok(s.css.includes('[data-sections="hide"] .song-section:not(.section-cue) > .section { display: none; }'), s.id);
    assert.ok(s.css.includes('[data-sections="small"] .song-section .section'), s.id);
  }
});
test('older style sets get the section names part once', () => {
  const old = ':root { --a: 1; }\n.x { color: red; }\n';
  const r = up.upgradeSectionNames(old, DEFAULT);
  assert.ok(r.changed && r.css.startsWith(old.trim()) && r.css.includes('[data-sections="hide"]'));
  assert.strictEqual(up.upgradeSectionNames(r.css, DEFAULT).changed, false);
  assert.strictEqual(up.upgradeSectionNames(DEFAULT, DEFAULT).changed, false);
});
