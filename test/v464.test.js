// 4.64: ukulele, baritone or guitar, left- or right-handed (headline and page); the AI prompts in
// their own files, the practice one starting with a menu; left-handed in the web player
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pages = require('../web/pages');

test('the home page and README say what it\'s for, and link to the instruments page', () => {
  assert.match(read('site/index.html'), /<p class="for-who"><a href="instruments\.html">For ukulele, baritone ukulele and guitar, left- or right-handed<\/a><\/p>/);
  const readme = read('README.md');
  assert.match(readme, /<b>For ukulele \(high or low G\), baritone ukulele and guitar, left- or right-handed<\/b>: <a href="https:\/\/markbeachill\.github\.io\/ukemusic\/instruments\.html">/);
});

test('the instruments page: the four instruments, your instrument, song sheets, Free Practice, left-handed', () => {
  const p = pages.INSTRUMENTS_PAGE;
  assert.strictEqual(p.file, 'instruments.html');
  assert.ok(p.seoTitle.length <= 70 && p.blurb.length <= 160);
  const body = p.body();
  for (const h of ['<h2>The instruments</h2>', '<h2>Your instrument: chosen once</h2>', '<h2>Song sheets, playback and exports</h2>', '<h2>Free Practice</h2>', '<h2>Left-handed</h2>']) assert.ok(body.includes(h), h);
  assert.ok(pages.sitemap().includes('instruments.html'));
  assert.ok(pages.siteFooter().includes('<a href="instruments.html">'));
});

test('the web player: Left-handed in Display, for the sheets and Free Practice', () => {
  const app = read('web/app.html');
  assert.match(app, /<button id="leftBtn" type="button" aria-pressed="false"[^>]*>Left-handed: off<\/button>/);
  assert.strictEqual((app.match(/left_handed: look\.leftHanded === true/g) || []).length, 3);
});

test('the AI prompts are plain text files, read by the apps and the website', () => {
  const ai = require('../src/ai-prompt');
  const file = (f) => read(`src/ai-prompts/${f}`).replace(/\r\n/g, '\n').replace(/\n+$/, '');
  assert.strictEqual(ai.AI_PROMPT, file('ai-convert.txt'));
  assert.strictEqual(ai.AI_PRACTICE_PROMPT, file('ai-practice.txt'));
  assert.match(read('web/entry.js'), /fs\.__files\.set\('ai-practice\.txt', require\('\.\.\/src\/ai-prompts\/ai-practice\.txt'\)\)/);
  assert.match(read('web/make.js'), /'\.txt': 'text'/);
  assert.ok(require('../package.json').build.files.includes('src/**/*'), 'packaged with the desktop app');
  assert.ok(fs.existsSync(path.join(ROOT, 'src/ai-prompts/README.md')));
});

test('the practice prompt starts with a menu of what to do, with All', () => {
  const ai = require('../src/ai-prompt');
  const top = ai.AI_PRACTICE_PROMPT.split('About me and the song')[0];
  assert.match(top, /FIRST, ASK ME WHAT TO DO\nBefore you do anything else, show me this menu and wait for my answer\./);
  for (const item of ['1. Format', '2. Timing', '3. Parts', '4. Chords', '5. Strums', '6. Check by ear', '7. Practice notes', 'A. All of them']) assert.ok(top.includes(item), item);
  // what the apps fill in is still there
  const filled = ai.practicePrompt({ title: 'Danny Boy', instrument: 'baritone ukulele (DGBE)', text: '[C]x' });
  assert.ok(filled.includes('- Song and artist: Danny Boy') && filled.includes('- Instrument: baritone ukulele (DGBE)') && filled.endsWith('[C]x'));
});

test('the website shows both prompts to copy, with what they do and the menu', () => {
  const songs = pages.SONGS_PAGE.body();
  assert.ok(songs.includes('<h3 id="ai-prompts"'));
  assert.ok(songs.includes('data-copy="aiPrompt"') && songs.includes('data-copy="aiPracticePrompt"'));
  assert.ok(songs.includes('<b>The AI then shows a menu and waits</b>'));
});
