// 4.71: Easy to read text: song sheets, Stage copies and the Session screen in Atkinson
// Hyperlegible (Mono where chords line up over the words, Next elsewhere), fonts inside the CSS
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const er = require('../src/easy-read');
const faces = require('../src/easy-read-fonts');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings: read them as \n
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');

test('the fonts: Next and Mono, regular and bold, Latin and Latin Extended, as woff2 inside the CSS', () => {
  assert.strictEqual(faces.length, 8);
  for (const family of er.FAMILIES) for (const weight of [400, 700]) assert.strictEqual(faces.filter((f) => f.family === family && f.weight === weight).length, 2, `${family} ${weight}`);
  for (const f of faces) assert.ok(Buffer.from(f.data, 'base64').subarray(0, 4).toString('latin1') === 'wOF2', `${f.family} ${f.weight} is woff2`);
  const css = er.css();
  assert.strictEqual((css.match(/@font-face/g) || []).length, 8);
  assert.ok(css.length < 140 * 1024, `${Math.round(css.length / 1024)} KB`);
  // the licence goes with them
  for (const f of ['Atkinson-Hyperlegible-Next-OFL.txt', 'Atkinson-Hyperlegible-Mono-OFL.txt']) assert.match(read(`src/fonts/${f}`), /SIL Open Font License, Version 1\.1/);
});

test('Mono where chords line up with spaces; Next for words elsewhere; only on <html data-easy-read>', () => {
  assert.match(er.RULES, /:root\[data-easy-read\], :root\[data-easy-read\] \[data-theme\], :root\[data-easy-read\] \.sheet \{/);
  assert.match(er.RULES, /--monospace-font: "Atkinson Hyperlegible Mono"[^;]*!important;/);
  assert.match(er.RULES, /--font-family: "Atkinson Hyperlegible Next"[^;]*!important;/);
  assert.match(er.RULES, /--stage-words-font: "Atkinson Hyperlegible Next"/);
  assert.match(er.RULES, /:root\[data-easy-read\] \.ss-screen/, 'the Session screen too');
  assert.ok(!/(^|\n)\s*:root\s*\{/.test(er.RULES), 'nothing changes without the setting');
});

test('desktop: Display → Text → Easy to read, for the preview, PDFs, exports and the Session screen', () => {
  const html = read('index.html');
  assert.match(html, /<label class="rib-check"[^>]*><input id="viewEasyRead" type="checkbox" data-config-path="general\.easy_read" \/> Easy to read<\/label>/);
  assert.match(html, /if \(easyRead\(\)\) attrs \+= ' data-easy-read';/);
  assert.match(html, /const easy = easyRead\(\) \? `\\n\$\{window\.ukemusic\.easyReadCss\(\)\}` : '';/);
  assert.match(html, /easyRead\(\) \? 'easy-read' : ''/, 'an export is "old" once it changes');
  assert.match(html, /session_min_px\) \|\| 18, easyRead: easyRead\(\) \}\);/);
  assert.match(read('session.html'), /document\.documentElement\.toggleAttribute\('data-easy-read', data\.easyRead === true\);/);
  assert.match(read('main.js'), /easy_read: false \}/);
  assert.match(read('src/preload.js'), /easyReadCss: \(\) => require\('\.\/easy-read'\)\.css\(\)/);
});

test('web player: Display → Easy to read, remembered on this device, in downloads too', () => {
  const app = read('web/app.html');
  assert.match(app, /<button id="easyBtn" type="button" aria-pressed="false"[^>]*>Easy to read: off<\/button>/);
  assert.match(app, /document\.documentElement\.toggleAttribute\('data-easy-read', on\);/);
  assert.match(app, /\$\{look\.easyRead \? ' data-easy-read' : ''\}><head>/);
  assert.match(app, /\$\{look\.easyRead \? U\.easyReadCss\(\) : ''\}<\/style>/);
});

test('it\'s in the features table', () => {
  const rows = require('../web/features').SECTIONS.flatMap((s) => s.rows);
  assert.ok(rows.some((r) => /Atkinson Hyperlegible/.test(r.f) && r.web && r.desktop));
});

console.log('v4.71 tests passed');
