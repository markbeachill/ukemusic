// 4.55: the one-line strum box is the default for every song, and shows the tempo
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const box = require('../src/strum-box');
const lib = require('../src/song-library');

test('the one-line box shows the time, and the tempo on the song\'s first pattern', () => {
  const first = box.renderStrum('D-DU-UDU', { style: 'compact', beats: 4, tempo: 120, first: true });
  assert.match(first, /<span class="sb-time">4\/4 <span class="sb-bpm">120 bpm<\/span><\/span>/);
  const later = box.renderStrum('D-DUDU', { style: 'compact', beats: 4, tempo: 120, first: false });
  assert.ok(!later.includes('sb-bpm'));
  const waltz = box.renderStrum('3/4 D-DUDU', { style: 'compact', beats: 3, timeLabel: '3/4', tempo: 100, first: true });
  assert.match(waltz, />3\/4 <span class="sb-bpm">100 bpm/);
  const jig = box.renderStrum('D-UD-U', { style: 'compact', beats: 6, timeLabel: '6/8', tempo: 60, first: true, compound: true });
  assert.match(jig, /♩\. = 60/);
});

test('one line is the default, everywhere', () => {
  assert.match(read('main.js'), /style: 'compact', strum_compact: true/);
  const html = read('index.html');
  assert.match(html, /style: 'compact', strum_compact: true/);
  assert.ok(!/rhythm\?\.style \|\| 'comic'/.test(html));
  assert.match(html, /<select id="viewStrumStyle"[^>]*>\s*<option value="compact">One line<\/option>/);
  assert.ok(!/strumStyle: 'clean'/.test(read('web/app.html')), 'the web player too');
});

test('settings from before move to one line once', () => {
  assert.match(read('main.js'), /parsed\.rhythm\.strum_compact !== true\) \{\s*parsed\.rhythm = \{ \.\.\.\(parsed\.rhythm \|\| \{\}\), style: 'compact', strum_compact: true \};/);
});

test('a song\'s own strum style from before is let go; one chosen after is kept', () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'uke455-'));
  fs.writeFileSync(path.join(d, 'song.ini'), '[song]\ntempo = 136\nsettings_format = 2\n[rhythm]\nstyle = comic\n');
  const old = lib.readSongSettings(d);
  assert.strictEqual(old.rhythm, undefined);
  assert.strictEqual(old.song.tempo, 136);
  lib.writeSongSettings(d, { song: { tempo: 136 }, rhythm: { style: 'clean' } });
  assert.match(fs.readFileSync(path.join(d, 'song.ini'), 'utf8'), /strum_compact = true/);
  assert.strictEqual(lib.readSongSettings(d).rhythm.style, 'clean');
  fs.rmSync(d, { recursive: true, force: true });
});
