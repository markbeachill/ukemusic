// 4.82: one name for each thing, and directions that point at real buttons
// (docs/ui-improvements.md C1, C4, C6, W3, T2)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');

test('C1: names that have been retired don\'t come back', () => {
  // [retired, the name we use, files]
  const everywhere = ['index.html', 'web/app.html', 'main.js', 'WRITING.md', 'web/pages.js', 'web/features.js', 'src/feature-levels.js'];
  const retired = [
    ['Group screen', 'Session screen'], ['group screen', 'Session screen'],
    ['Save new', 'Save as new'], ['Save as New Song', 'Save as New…'],
    ['Paste from web<', 'Paste from a website'], ['Paste from website', 'Paste from a website'], ['Paste from Website', 'Paste from a Website…'],
    ['Paste a chord sheet</h2>', 'Paste from a website'],
    ['Stage chord sheet', 'Stage copy'], ['Time signature', 'Time'],
    ['From the start</button>', 'Restart'], ['>Versions</button>', 'Earlier versions'],
    ['Tidy Chords Above Words', 'Tidy chords'], ['Tidy chords above words', 'Tidy chords'],
    ['>Shapes</label>', 'Chord diagrams'], ['>Sheet</label>', 'Layout']
  ];
  for (const f of everywhere) {
    const text = read(f);
    for (const [old, now] of retired) assert.ok(!text.includes(old), `${f}: "${old}" is now "${now}"`);
  }
  assert.match(DESKTOP, /id="sessionButton"[^>]*>Session screen<\/button>/);
  assert.match(WEB, /id="sessionBtn"[^>]*>Session screen<\/button>/);
  assert.match(WEB, /<label for="diagrams">Chord diagrams<\/label>/);
  assert.match(WEB, /<label for="layout">Layout<\/label>/);
  assert.match(read('AGENTS.md'), /## The names we use/);
});

test('C6, W3: no "…" on the ribbon\'s buttons; group names that say what they hold', () => {
  const ribbon = DESKTOP.slice(DESKTOP.indexOf('<div class="ribbon-panel"'), DESKTOP.indexOf('<div id="ribbonHint"'));
  const dotted = [...ribbon.matchAll(/<button[^>]*class="rib-(?:button|small)[^"]*"[^>]*>([^<]*…)<\/button>/g)].map((m) => m[1]);
  assert.deepStrictEqual(dotted, []);
  for (const label of ['Put in', 'Key and patterns', 'Chord changes', 'Chords as numbers', 'How the song works', 'Setlists']) assert.ok(ribbon.includes(`<span class="rib-label">${label}</span>`), label);
  for (const old of ['Fingers', 'Understand it', 'Organise', 'Check']) assert.ok(!ribbon.includes(`<span class="rib-label">${old}</span>`), old);
  assert.match(ribbon, /<label for="learnStage">Show<\/label>/);
});

test('C4: every "Tab → Button" in the app and the guide is a real button', () => {
  const tabs = {};
  for (const m of DESKTOP.matchAll(/<button id="ribbonTab\w+"[^>]*data-ribbon="(\w+)"[^>]*>([^<]+)</g)) tabs[m[2]] = m[1];
  const chunks = {};
  for (const [name, key] of Object.entries(tabs)) {
    const panel = DESKTOP.match(new RegExp(`<div class="ribbon-panel" data-ribbon-panel="${key}"[\\s\\S]*?(?=\\n {10}<div class="ribbon-panel"|\\n {10}<div id="ribbonHint")`))[0];
    chunks[name] = panel.replace(/ title="[^"]*"/g, '').split(/<[^>]+>/).map((t) => t.replace(/[…▾]/g, '').replace(/&amp;/g, '&').trim().toLowerCase()).filter(Boolean);
  }
  // tab names from before the ribbon was renamed: never right
  const OLD_TABS = ['Pick', 'View'];
  const wrong = [];
  for (const f of ['index.html', 'WRITING.md', 'web/pages.js', 'src/learn.js', 'src/pick-sheet.js']) {
    read(f).split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line) || /Safari|Settings → /.test(line)) return; // comments; other apps; Settings has its own pages
      const plain = line.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
      for (const m of plain.matchAll(/(?<![\w→] )\b(File|Write|Song|Display|Export|Play|Learn|Picking|Pick|View) → ([A-Z][\w'’/-]*(?: [a-z/][\w'’-]*){0,3})/g)) {
        const [, tab, thing] = m;
        if (OLD_TABS.includes(tab)) { wrong.push(`${f}:${i + 1}: "${tab}" is not a tab (${m[0]})`); continue; }
        const want = thing.toLowerCase();
        const first = want.split(' ')[0];
        const ok = chunks[tab].some((c) => want === c || want.startsWith(`${c} `) || c === first || c.startsWith(`${first} `));
        if (!ok) wrong.push(`${f}:${i + 1}: ${tab} → ${thing}`);
      }
    });
  }
  assert.deepStrictEqual(wrong, []);
});

console.log('v4.82 tests passed');
