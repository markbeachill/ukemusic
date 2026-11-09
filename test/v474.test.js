// 4.74: karaoke is one code in the desktop app and the web player (checked); the Session screen
// (desktop's TV window, the web player's Group screen) lights the line playing, shows the chord now
// and next and how far through, blanks (B), goes to a verse or chorus (1–9), has colour schemes
// for a hall (D) and keeps the screen awake
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
const SCREEN = read('src/session-screen.js');

test('karaoke: the web player\'s copies are the desktop\'s own code', () => {
  require('../tools/sync-karaoke').sync(); // throws if they differ
  const { parts } = require('../tools/sync-karaoke');
  const p = parts(DESKTOP);
  assert.ok(p.js.includes("const karaokeTroubleSpots = typeof learnAddTrouble === 'function';"));
  assert.ok(p.js.includes("document.getElementById('karaokeTrouble').hidden = !learn || !karaokeTroubleSpots;"), 'trouble spots: desktop only');
  assert.ok(p.js.includes('analyse(ir, { key: learn.key || learnKey(shift) })'), 'the web passes the key');
  assert.ok(p.css.includes('.k-line.current .k-piece.done .k-text { color: var(--accent); }'), 'sung words coloured on the web too');
  assert.ok(p.css.includes('.k-line.k-trouble::before'));
  assert.ok(p.markup.includes('id="karaokeTrouble"'));
  assert.match(WEB, /function showToast\(message, \{ detail = '' \} = \{\}\)/);
  assert.match(WEB, /\/\*KARAOKE_JS\*\/\nwindow\.__k = /);
  assert.match(read('web/make.js'), /require\('\.\.\/tools\/sync-karaoke'\)\.sync\(\);/);
  assert.match(read('AGENTS.md'), /node tools\/sync-karaoke\.js --write/);
});

test('Session screen lines carry the song sheet\'s line numbers', () => {
  const { parse } = require('../src/parser');
  const { sessionHtml } = require('../src/session-view');
  const html = sessionHtml(parse('--START MUSIC--\n[[Verse]]\n{melody: C D E}\n[C]Hello [G]there\nline two\n--END MUSIC--\n'));
  // the {melody} line goes with the words after it, as on the sheet (renderer-html)
  assert.match(html, /<div class="ln ch" data-line="4">/);
  assert.match(html, /data-line="5"/);
});

test('nowFrom: the line, the chord now and the next different one, how far through', () => {
  const { nowFrom, THEMES } = require('../src/session-screen');
  const schedule = { countInDuration: 2, duration: 12, bars: [{ time: 2, chord: 'C', line: 3 }, { time: 4, chord: 'C', line: 3 }, { time: 6, chord: 'G7', line: 4 }, { time: 8, rest: true, line: 5 }, { time: 10, chord: 'F', line: 5 }] };
  assert.deepStrictEqual(nowFrom(schedule, 1, { folder: 'f', title: 'T' }), { folder: 'f', title: 'T', line: 3, chord: 'C', next: 'G7', progress: 0.2 });
  assert.strictEqual(nowFrom(schedule, 3).chord, '', 'a rest has no chord');
  assert.strictEqual(nowFrom(schedule, 3).next, 'F');
  assert.strictEqual(nowFrom(schedule, 9), null);
  assert.deepStrictEqual(THEMES, ['light', 'blue', 'dark', 'contrast']);
});

test('Session screen: playing(), blank, go to a section, colours, awake', () => {
  assert.match(SCREEN, /function playing\(info\)/);
  assert.match(SCREEN, /\.ln\.ss-now \{ background: var\(--ss-now, #fff3a6\)/, 'the line playing: pale yellow');
  assert.match(SCREEN, /\.ss-t-blue \{ --ss-chord: #1d3f9e;/, 'dark blue chords');
  assert.match(SCREEN, /\.ss-t-contrast \{ --ss-bg: #000000;/);
  assert.match(SCREEN, /k === 'b' \|\| k === 'B' \|\| k === '\.'\) \{ setBlank\(!s\.blank\)/);
  assert.match(SCREEN, /\/\^\[1-9\]\$\/\.test\(k\)\) toSection\(Number\(k\) - 1\)/);
  assert.match(SCREEN, /navigator\.wakeLock\.request\('screen'\)/);
  assert.match(SCREEN, /return \{ show, key, playing, layout/);
});

test('desktop: the laptop plays, the TV follows; the bar has Go to, Colours, Blank; kept awake', () => {
  assert.match(DESKTOP, /<script src="src\/session-screen\.js"><\/script>/);
  assert.match(DESKTOP, /if \(sessionOpen\) window\.ukemusic\.session\.playing\(UkeSessionScreen\.nowFrom\(schedule, index,/);
  assert.match(DESKTOP, /if \(sessionOpen\) window\.ukemusic\.session\.playing\(null\);/);
  for (const id of ['sessionGoto', 'sessionTheme', 'sessionBlank']) assert.match(DESKTOP, new RegExp(`id="${id}"`), id);
  assert.ok(DESKTOP.includes("theme: state.config?.export?.session_theme || 'light'"));
  assert.ok(DESKTOP.includes("'s', 'S', 'b', 'B', '.', '1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(e.key)"));
  assert.match(read('src/preload.js'), /playing: \(info\) => ipcRenderer\.send\('session:playing', info\)/);
  assert.match(read('session.html'), /U\.session\.onPlaying\(\(info\) => screen\.playing\(info\)\)/);
  const main = read('main.js');
  assert.match(main, /powerSaveBlocker\.start\('prevent-display-sleep'\)/);
  assert.match(main, /ipcMain\.on\('session:playing'/);
  assert.match(main, /session_theme: 'light',/);
});

test('web player: Play on the Group screen, its colours kept, nothing lit for a shortened song', () => {
  assert.match(WEB, /onPlay: \(\{ index, playing \}\) => \{/);
  assert.match(WEB, /if \(session\) session\.playing\(UkeSessionScreen\.nowFrom\(schedule, index, \{ folder: view\.song\.id/);
  assert.match(WEB, /look\.sessionTheme = st\.theme;/);
  assert.match(WEB, /theme: look\.sessionTheme \|\| \(isDark\(\) \? 'dark' : 'light'\)/);
  assert.match(WEB, /#sessionView \{ position: fixed; inset: 0; z-index: 200; \}/, 'the screen paints its own background (dark showed white before)');
  for (const src of [WEB, DESKTOP]) assert.ok(src.includes('.replace(/ data-line="\\d+"/g, \'\')'), 'stage choruses once: no line numbers');
});

console.log('v4.74 tests passed');
