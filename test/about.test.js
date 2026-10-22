// 4.14: Help → About and its acknowledgements
const assert = require('assert');
const about = require('../src/about');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
test('the sounds, chord shapes and editor are credited, with licences', () => {
  const html = about.aboutHtml({ version: '9.9.9' });
  for (const text of ['version 9.9.9', 'FreePats', 'Mateusz Dąbrowski', 'CC0', 'chords-db', 'David Rubert', 'MIT', 'CodeMirror', 'ini', 'ISC', 'Electron']) assert.ok(html.includes(text), text);
});
test('desktop and web editions list what each one uses', () => {
  const desk = about.aboutHtml({ edition: 'desktop' });
  const web = about.aboutHtml({ edition: 'web' });
  assert.ok(desk.includes('electron-builder') && !desk.includes('esbuild') && !desk.includes('Figtree'));
  assert.ok(web.includes('esbuild') && web.includes('Figtree') && web.includes('Courier Prime') && !web.includes('electron-builder'));
});
test('every credited item has a licence; links are web links', () => {
  for (const g of about.ACKNOWLEDGEMENTS) {
    for (const i of g.items) {
      assert.ok(i.licence && i.name && i.what, i.name);
      if (i.url) assert.ok(/^https:\/\//.test(i.url), i.url);
    }
  }
});
test('text is escaped', () => {
  assert.ok(!/<script/i.test(about.aboutHtml({ version: '<script>' })));
});
