// 4.94.2: Free Practice opened while it's already open (an exercise straight from its home) leaves
// the page behind as it is, so after Close nothing stays inert (site-pictures' exports failed on
// this). The picture and review scripts close Free Practice before going to the library.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');

test('openPractice takes the page behind only the first time', () => {
  for (const f of ['web/pr_js.js', 'index.html']) {
    const s = read(f);
    assert.ok(s.includes('const already = !practiceEl.hidden;'), f);
    assert.ok(s.includes('if (!already) pr.inertElements = [...document.body.children]'), f);
    assert.ok(s.includes('if (!already) for (const item of pr.inertElements) item.el.inert = true;'), f);
  }
});

test('the scripts: Free Practice closed before the library; New song\'s choices', () => {
  for (const f of ['tools/site-pictures.js', 'tools/ui-review/desktop.js']) assert.ok(read(f).includes("const b = document.getElementById('practiceClose'); if (b && !document.getElementById('practice').hidden) b.click();"), f);
  assert.ok(read('tools/ui-review/desktop.js').includes("await page.click('#libNew'); await page.click('#libPaste');"));
  assert.ok(read('tools/ui-review/catalog.json').includes('"L12": "New song: write your own"'));
});
