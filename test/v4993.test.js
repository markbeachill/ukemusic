// 4.99.3: both names on the sheet (the shape, and what it sounds as), and help on keeping your shapes by hand
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const renderHtml = require('../src/renderer-html');
const renderDiagramSvg = require('../src/diagram-svg');
const { loadChordLibrary } = require('../src/chord-library');
const { sessionSongFromText } = require('../src/session-view');
const help = require('../src/instrument-help');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');
const soprano = loadChordLibrary(null, 'soprano');

test('a diagram can say what it sounds as, under its name', () => {
  const svg = renderDiagramSvg({ name: 'C', frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], barre: null, base_fret: 1 }, { sounds: 'G' });
  assert.match(svg, /data-sounds="G"/);
  assert.match(svg, /<text class="sounds"[^>]*>sounds G<\/text>/);
  assert.match(svg, /aria-label="C chord diagram, sounds G"/);
  const plain = renderDiagramSvg({ name: 'C', frets: [0, 0, 0, 3], fingers: [0, 0, 0, 3], barre: null, base_fret: 1 }, {});
  assert.ok(!plain.includes('sounds'));
});

test('the sheet: with a soundShift each diagram has both names; without, none', () => {
  const ir = parse('[C]one [D7]two [F]three');
  const opts = { chordLibrary: soprano, diagrams: { enable: true, placement: 'song_start' } };
  const html = renderHtml(ir, { ...opts, soundShift: -5 });
  assert.match(html, /data-chord="C" data-sounds="G"/);
  assert.match(html, /data-chord="D7" data-sounds="A7"/);
  assert.match(html, /data-chord="F" data-sounds="C"/);
  assert.ok(!renderHtml(ir, opts).includes('data-sounds'));
  assert.strictEqual(renderHtml.soundsAs('G', 5), 'C');
  assert.strictEqual(renderHtml.soundsAs('G', 0), '');
});

test('the Music stand and Session screen too', () => {
  const song = sessionSongFromText('[C]one [F]two', { instrument: 'ukeonbaritone', library: soprano });
  assert.match(song.diagrams[0].svg, /data-sounds="G"/);
  const plain = sessionSongFromText('[C]one [F]two', { instrument: 'soprano', library: soprano });
  assert.ok(!plain.diagrams[0].svg.includes('data-sounds'));
});

test('desktop and web pass it, with any capo', () => {
  assert.ok(DESKTOP.includes('soundShift: songInstrument(config).soundShift ? songInstrument(config).soundShift + songCapo(config) : 0,'));
  assert.ok(WEB.includes('soundShift: soundShiftNow(),'));
  assert.ok(WEB.includes('const base = { soundShift: soundShiftNow(),'));
  assert.ok(WEB.includes('return shift ? shift + p.capo : 0;'));
});

test('help beside the Instrument menu: every conversion by hand', () => {
  const html = help.helpHtml({ app: 'desktop' });
  for (const r of help.ROWS) assert.ok(html.includes(r[0]) && html.includes(r[3]), r[0]);
  assert.match(html, /Keys ▾ → Save this key as a version/);
  assert.match(help.helpHtml({ app: 'web' }), /kept for this song on this device/);
  assert.ok(DESKTOP.includes('<button id="instrumentHelpButton" class="rib-small" type="button"'));
  assert.ok(DESKTOP.includes("window.ukemusic.instrumentHelpHtml({ app: 'desktop' })"));
  assert.ok(WEB.includes('<button id="instrumentHelpBtn" type="button"'));
  assert.ok(WEB.includes("U.instrumentHelpHtml({ app: 'web' })"));
});

test('the user guides explain it by hand', () => {
  const guide = read('docs/user-guide.md');
  assert.match(guide, /\*\*Keeping the shapes you know, by hand\.\*\*/);
  assert.match(guide, /\| Ukulele \| Guitar \| \*\*−\*\* five times \|/);
  assert.match(guide, /\*\*Your shapes\?\*\*/);
  const phone = read('docs/user-guide-phone.md');
  assert.match(phone, /## Playing it on another instrument/);
  assert.match(phone, /\*\*Key −\*\* five times/);
});
