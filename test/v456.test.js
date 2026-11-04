// 4.56: AI prompts in the apps and on the website; no double gap before a part's heading
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const ai = require('../src/ai-prompt');

test('the practice prompt is the one in docs/song-prep-prompt.md, and fills in what is known', () => {
  const doc = read('docs/song-prep-prompt.md').replace(/\r\n/g, '\n');
  const a = doc.indexOf('## The prompt\n\n```\n') + '## The prompt\n\n```\n'.length;
  assert.strictEqual(ai.AI_PRACTICE_PROMPT, doc.slice(a, doc.indexOf('\n```\n', a)));
  const p = ai.practicePrompt({ title: 'Danny Boy', artist: 'Frederic Weatherly', instrument: 'guitar (EADGBE)', text: '[C]Words here' });
  assert.match(p, /- Song and artist: Danny Boy, Frederic Weatherly/);
  assert.match(p, /- Instrument: guitar \(EADGBE\)/);
  assert.match(p, /Here is the sheet:\n\[C\]Words here$/);
  assert.match(ai.practicePrompt(), /\[paste the chord sheet, or the song from ukemusic, here\]$/);
  assert.match(ai.AI_PRACTICE_PROMPT, /Don't add, change, fix or\s+complete any words/);
});

test('the desktop app: both prompts and a link in Paste from website', () => {
  const html = read('index.html');
  assert.match(html, /id="convertAiPractice"/);
  assert.match(html, /<a href="https:\/\/claude\.ai\/new" target="_blank" rel="noopener" id="convertAiOpen"/);
  assert.match(html, /window\.ukemusic\.aiPracticePrompt\(/);
  assert.match(read('src/preload.js'), /aiPracticePrompt: \(details\) => require\('\.\/ai-prompt'\)\.practicePrompt\(details\)/);
  assert.match(read('main.js'), /setWindowOpenHandler\(\(\{ url \}\) => \{\s*if \(\/\^https\?:\\\/\\\/\/\.test\(url\)\) shell\.openExternal\(url\)/);
});

test('the web player and the website: both prompts and the link', () => {
  const app = read('web/app.html');
  for (const t of ['id="aiPromptBtn"', 'id="aiPracticeBtn"', 'U.aiPracticePrompt(', 'href="https://claude.ai/new"']) assert.ok(app.includes(t), t);
  const pages = require('../web/pages');
  const body = pages.SONGS_PAGE.body();
  assert.ok(body.includes('id="aiPracticePrompt"') && body.includes('data-copy="aiPracticePrompt"'));
  assert.ok(body.includes(`href="${ai.AI_CHAT_URL}"`));
});

test('no double gap before a part\'s heading, whatever the style set', () => {
  const { renderHtml, sheetCss } = require('../src/renderer-html');
  const parse = require('../src/parser').parseSong || require('../src/parser').parse;
  // two blank lines before a heading, and three in a row inside a part
  const html = renderHtml(parse('[[Verse]]\n[C]a\n\n\n[[Chorus]]\n[F]b\n\n\n\n[C]c'), {});
  const blanks = html.split('\n').filter((l) => /<div class="lyrics"><\/div><\/div>$/.test(l));
  assert.deepStrictEqual(blanks.map((l) => (l.match(/class="line-group([^"]*)"/) || [])[1].trim()), ['blank-before-heading', 'blank-before-heading', '', 'blank-extra', 'blank-extra']);
  // the rule that hides them is in the CSS every sheet gets (not in a style set you can edit)
  const css = sheetCss();
  assert.match(css, /\.line-group\.blank-extra \{ display: none; \}/);
  assert.match(css, /\.line-group\.blank-before-heading \{ display: none; \}/);
  assert.match(css, /\[data-sections="hide"\] \.line-group\.blank-before-heading \{ display: block; \}/);
  assert.match(read('src/preload.js'), /strumCss: \(\) => strumBox\.strumCss\(\) \+ renderHtml\.sheetCss\(\)/);
  assert.match(read('web/build.js'), /renderHtml\.sheetCss\(\)/);
});
