// 4.73: karaoke full screen, karaoke words sized to the screen; the Session screen (desktop's second
// screen, the web player's Group screen) can show every song at the same text size
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
const WEB_JS = read('web/k_js.js');
const KARAOKE = [['desktop', DESKTOP, DESKTOP, DESKTOP], ['web', WEB_JS, read('web/k_css.css'), read('web/k_markup.html')]];

test('karaoke words: sized to the screen, A−/A+ a scale, an old pixel size migrated (both copies)', () => {
  for (const [where, js] of KARAOKE) {
    assert.ok(js.includes('Number(pb.karaoke_scale) || (Number(pb.karaoke_size) ? Number(pb.karaoke_size) / 26 : 1)'), where);
    assert.ok(js.includes('Math.min(W / 30, H / 10) * karaokeScale()'), where);
    assert.ok(js.includes('state.config.playback.karaoke_scale = Math.round(Math.max(0.5, Math.min(2.5, karaokeScale() * (step > 0 ? 1.1 : 1 / 1.1))) * 100) / 100;'), where);
    assert.match(js, /new ResizeObserver\(/, `${where}: re-sized when the screen changes`);
  }
  // the formula, worked: 26px (the old usual) is a scale of 1; 1920×1080 → 1920/30 = 64 vs 1080/10 = 108
  const size = (W, H, scale) => Math.round(Math.max(16, Math.min(160, Math.min(W / 30, H / 10) * scale)));
  assert.strictEqual(size(1920, 1000, 1), 64);
  assert.strictEqual(size(390, 700, 1), 16, 'a phone stays readable');
  assert.strictEqual(size(3840, 2000, 2.5), 160, 'and no bigger than 160px');
});

test('karaoke full screen: the button, F, Esc leaves full screen first, the bar slides away (both copies)', () => {
  for (const [where, js, css, markup] of KARAOKE) {
    assert.match(markup, /<button id="karaokeFull" type="button"[^>]*aria-label="Full screen">/, where);
    assert.match(js, /function toggleKaraokeFull\(\)/, where);
    assert.match(js, /requestFullscreen/, where);
    assert.match(js, /classList\.add\('k-idle'\)/, where);
    assert.match(css, /\.karaoke\.k-full\.k-idle \.karaoke-bar \{[^}]*opacity: 0/, where);
  }
});

test('Session screen: fit each song, or every song the same size', () => {
  const { SAME } = require('../src/session-screen');
  assert.deepStrictEqual(SAME, { min: 2.5, max: 9, step: 0.25, usual: 4.5 });
  const src = read('src/session-screen.js');
  assert.ok(src.includes("const [minPx, maxPx] = s.size === 'same' ? [samePx, samePx] : [s.minPx, Math.round(s.minPx * 2.6)];"));
  assert.match(src, /S fit each song \/ same size/, 'in the key help');
  assert.match(src, /k === 's' \|\| k === 'S'|\['s', 'S'\]\.includes\(k\)/, 'S switches');
  // 4.5% of a 1080p screen's height: about 49px, every song
  assert.strictEqual(Math.max(12, Math.round(1080 * SAME.usual / 100)), 49);
});

test('desktop: the TV bar has the size buttons; the choice is saved', () => {
  for (const id of ['sessionSize', 'sessionSmaller', 'sessionBigger']) assert.match(DESKTOP, new RegExp(`<button id="${id}" type="button"`), id);
  assert.ok(DESKTOP.includes("size: state.config?.export?.session_size === 'same' ? 'same' : 'fit', same: Number(state.config?.export?.session_same) || 4.5"));
  assert.ok(DESKTOP.includes('ex.session_size = s.size;'));
  assert.match(DESKTOP, /'c', 'C', 's', 'S'\]\.includes\(e\.key\)/, 'the laptop passes S on to the TV');
  assert.match(read('main.js'), /session_size: 'fit',[^\n]*\n\s*session_same: 4\.5/);
});

test('web player: the karaoke scale and the Group screen size are kept on this device', () => {
  const app = read('web/app.html');
  assert.match(app, /localStorage\.getItem\('ukeweb\.karaokeScale'\)/);
  assert.match(app, /localStorage\.setItem\('ukeweb\.karaokeScale'/);
  assert.match(app, /look\.sessionSize = st\.size; look\.sessionSame = st\.same;/);
  assert.match(app, /size: look\.sessionSize \|\| 'fit', same: look\.sessionSame \|\| 4\.5/);
});

console.log('v4.73 tests passed');
