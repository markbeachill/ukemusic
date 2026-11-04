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

test('no double gap before a part\'s heading', () => {
  const css = read('src/default-style.css');
  assert.match(css, /\.song-section > \.line-group:last-child:has\(> \.lyrics:empty:only-child\) \{ display: none; \}/);
  assert.match(css, /\[data-sections="hide"\] \.song-section:not\(\.section-cue\) > \.line-group:last-child:has\(> \.lyrics:empty:only-child\) \{ display: block; \}/);
  assert.match(css, /\.line-group:has\(> \.lyrics:empty:only-child\) \+ \.line-group:has\(> \.lyrics:empty:only-child\) \{ display: none; \}/);
  // the renderer still writes the blank line (the CSS decides), so line numbers don't move
  const html = require('../src/renderer-html').renderHtml(require('../src/parser').parseSong ? require('../src/parser').parseSong('[[Verse]]\n[C]a\n\n[[Chorus]]\n[F]b') : require('../src/parser').parse('[[Verse]]\n[C]a\n\n[[Chorus]]\n[F]b'), {});
  assert.match(html, /<div class="line-group"><div class="lyrics"><\/div><\/div>\n<\/section>/);
});
