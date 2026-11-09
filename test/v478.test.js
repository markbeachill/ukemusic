// 4.78: the simple view (one table, src/feature-levels.js, says what a beginner sees; changeable in
// the app), and chord diagrams on the right-hand side
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
const F = require('../src/feature-levels');
const used = (html) => new Set([...html.matchAll(/data-feature="([\w ]+)"/g)].flatMap((m) => m[1].split(' ')));

test('the table: unique ids, a level each, every feature on a control of its app', () => {
  const ids = F.FEATURES.map((f) => f.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const f of F.FEATURES) {
    assert.ok(['simple', 'all'].includes(f.level), f.id);
    assert.ok(['desktop', 'web', 'both'].includes(f.app), f.id);
    if (f.app !== 'web') assert.ok(used(DESKTOP).has(f.id), `desktop: ${f.id}`);
    if (f.app !== 'desktop') assert.ok(used(WEB).has(f.id), `web: ${f.id}`);
  }
  for (const id of used(DESKTOP)) assert.ok(F.FEATURES.some((f) => f.id === id), `index.html names ${id}`);
  for (const id of used(WEB)) assert.ok(F.FEATURES.some((f) => f.id === id), `app.html names ${id}`);
});

test('every ribbon group belongs to a feature (so a new one isn\'t forgotten)', () => {
  // a group is tagged, or its parts are, or its whole tab is (Picking); the Settings tab is always shown
  for (const m of DESKTOP.matchAll(/<div class="ribbon-panel" data-ribbon-panel="(\w+)"([^>]*)>([\s\S]*?)(?=\n {10}<div class="ribbon-panel"|\n {10}<div id="ribbonHint")/g)) {
    const [, panel, attrs, body] = m;
    if (panel === 'settings' || /data-feature=/.test(attrs)) continue;
    for (const g of body.split(/(?=<div class="rib-group")/).slice(1)) {
      const name = (g.match(/<span class="rib-label">([^<]+)</) || [])[1];
      assert.ok(/^<div class="rib-group" data-feature="\w+">/.test(g) || /data-feature="/.test(g), `${panel} / ${name}`);
    }
  }
});

test('levels, changes kept as text, the CSS', () => {
  assert.strictEqual(F.levels().session, 'all');
  assert.strictEqual(F.levels({ session: 'simple' }).session, 'simple');
  assert.deepStrictEqual(F.parseChanges('session:simple, nonsense:all, karaoke:maybe,stage:all'), { session: 'simple', stage: 'all' });
  assert.strictEqual(F.changesText({ session: 'simple', stage: 'all', karaoke: 'simple' }), 'session:simple', 'only what differs from the table');
  const css = F.css();
  assert.match(css, /html\[data-simple\] \[data-feature~="session"\]:not\(\[data-feature-grey\]\) \{ display: none !important; \}/);
  assert.match(css, /html\[data-simple\]:not\(\[data-song-uses~="picking"\]\) \[data-feature~="picking"\]/, 'the song brings it back');
  assert.match(css, /\[data-feature~="setStage"\]\[data-feature-grey\] \{ opacity: 0\.45; pointer-events: none; \}/, 'settings greyed');
  assert.ok(!/"karaoke"/.test(css), 'simple features aren\'t touched');
  assert.ok(!/"session"/.test(F.css({ session: 'simple' })));
});

test('what a song uses', () => {
  const parse = require('../src/parser');
  assert.strictEqual(F.songUses(parse('--START MUSIC--\n{melody: C D E}\n[C]la\n--END MUSIC--\n')), 'tune');
  assert.strictEqual(F.songUses(parse('--START MUSIC--\n[C]la\n--END MUSIC--\n')), '');
});

test('the in-app table: desktop Settings, web Features dialog', () => {
  const html = F.tableHtml('web', { session: 'simple' });
  assert.match(html, /<tr class="feature-changed"><td>Session screen \(web: Group screen\)<\/td><td>the player<\/td><td><label class="feature-check"><input type="checkbox" data-feature-level="session" checked>/);
  assert.ok(!/Two-page Stage/.test(html), 'only this app\'s features');
  assert.match(F.tableHtml('desktop'), /<td>Display<\/td>/);
  assert.match(DESKTOP, /<section class="settings-group" id="set-features">/);
  assert.match(DESKTOP, /<input id="general-all_features" type="checkbox" data-config-path="general\.all_features" \/> Show all features/);
  assert.match(DESKTOP, /<button id="moreFeaturesButton" class="ribbon-tab ribbon-more" type="button" data-simple-only/);
  assert.match(DESKTOP, /<input id="firstAllFeatures" type="checkbox" \/> Show all features/);
  assert.match(DESKTOP, /id="set-stage" data-feature="setStage" data-feature-grey>/);
  assert.match(WEB, /<dialog id="featuresDialog"/);
  assert.match(WEB, /<input id="askAllFeatures" type="checkbox"> Show all features/);
  assert.match(read('web/build.js'), /'feature-levels\.js'\]/);
});

test('someone new starts simple; settings from before keep everything', () => {
  const main = read('main.js');
  assert.match(main, /all_features: false, feature_levels: ''/);
  assert.match(main, /if \(!parsed\.general \|\| parsed\.general\.all_features === undefined\) \{\n\s*parsed\.general = \{ \.\.\.\(parsed\.general \|\| \{\}\), all_features: true \};/);
  assert.match(WEB, /if \(look\.allFeatures === undefined\) \{ look\.allFeatures = local\.get\('instrument', null\) !== null;/);
});

test('chord diagrams on the right-hand side', () => {
  const { renderHtml } = require('../src/renderer-html');
  const parse = require('../src/parser');
  const lib = require('../src/chord-library').getBuiltInLibrary('soprano');
  const html = renderHtml(parse('--START MUSIC--\nI [C]come [G7]from\n--END MUSIC--\n'), { diagrams: { enable: true, placement: 'side' }, chordLibrary: lib });
  assert.match(html, /^<div class="chord-diagrams side"><div class="chord-diagram" data-chord="C">/);
  assert.match(html, /<div class="side-end"><\/div>$/);
  assert.match(read('src/renderer-html.js'), /\.chord-diagrams\.side \{ float: right; display: flex; flex-direction: column;/);
  assert.match(DESKTOP, /<option value="side">Right-hand side<\/option>/);
  assert.match(DESKTOP, /<option value="side">Right-hand side: a column beside the words/);
  assert.match(WEB, /<option value="side">Right-hand side<\/option>/);
});

console.log('v4.78 tests passed');
