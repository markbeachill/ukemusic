// 4.75: what the desktop app and the web player each did in their own copy is now one copy in src/:
// sung words, the "Next chord?" quiz screen, Stage copies' render options, the Session screen's song.
// And the web player's Group screen draws left-handed shapes when asked (it didn't).
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
const lc = require('../src/chord-library');

test('one copy each: the apps no longer have their own', () => {
  for (const src of [DESKTOP, WEB]) {
    assert.ok(!/function sungWordsOf\(/.test(src), 'sung words');
    assert.ok(!/function quizShow\(/.test(src) && !/function quizAnswer\(/.test(src), 'quiz screen');
    assert.match(src, /UkeSungWords\.create\(\)/);
    assert.match(src, /UkeLearnQuiz\.create\(\{/);
    assert.match(src, /\.sessionSongFromText\(/);
    assert.match(src, /stageFormats\.renderOptions\(options, \{ format:/);
  }
  assert.match(DESKTOP, /<script src="src\/sung-words\.js"><\/script>\n\s*<script src="src\/learn-quiz\.js"><\/script>/);
  assert.match(read('web/build.js'), /put\('\/\*SHARED_UI_JS\*\/', safe\(\['sung-words\.js', 'learn-quiz\.js'\]/);
  assert.match(WEB, /<script>\/\*SHARED_UI_JS\*\/<\/script>/);
  assert.match(read('src/preload.js'), /renderOptions: f\.stageRenderOptions/);
});

test('the quiz: the desktop shows the line and keeps a miss as a trouble spot; the web, a phone\'s width', () => {
  assert.match(DESKTOP, /onMiss: \(q\) => learnAddTrouble\(\[\{ line: q\.line, chord: q\.to, from: 'quiz' \}\]\),/);
  assert.match(DESKTOP, /showLine: true,\n\s*context: 40,/);
  assert.match(WEB, /context: 34 \/\/ a phone's width/);
  const { create } = require('../src/learn-quiz');
  assert.strictEqual(typeof create, 'function');
});

test('Stage copy options: the format, the diagrams, letters to a line, no tune', () => {
  const { stageRenderOptions } = require('../src/stage-formats');
  const base = { layout: 'chords', tune: { shift: 2 }, diagrams: { enable: true } };
  const above = stageRenderOptions(base, { format: 'clear', monospaceChars: 44, pageWidthPx: 700, sizePx: 20 });
  assert.strictEqual(above.layout, 'table');
  assert.strictEqual(above.maxLineChars, 70, 'proportional words: half an em a letter');
  assert.deepStrictEqual(above.tune, { shift: 2, notation: 'off' });
  const heavy = stageRenderOptions({ ...base, layout: 'lines' }, { format: 'heavy', monospaceChars: 44 });
  assert.strictEqual(heavy.maxLineChars, 44, 'chords above with spaces: the Stage font\'s letters');
  const inWords = stageRenderOptions(base, { format: 'compact', diagrams: 'none' });
  assert.strictEqual(inWords.layout, 'inline');
  assert.ok(!('maxLineChars' in inWords));
  assert.strictEqual(inWords.diagrams.enable, false);
  assert.strictEqual(stageRenderOptions(base, { format: '', screen: true }).layout, 'table', 'on screen the default is chords above');
  assert.strictEqual(stageRenderOptions(base, { format: '' }).layout, 'inline', 'printed, in the words');
  assert.strictEqual(base.layout, 'chords', 'the options given are left as they were');
});

const SONG = '--START MUSIC--\n[[Chorus]]\n[C]la la [G]la\n[F]la [C]la\n\n[[Verse]]\n[Am]hi\n\n[[Chorus]]\n[C]la la [G]la\n[F]la [C]la\n--END MUSIC--\n';
test('the Session screen\'s song: key, capo, instrument and credit; choruses once', () => {
  const { sessionSongFromText } = require('../src/session-view');
  const a = sessionSongFromText(SONG, { title: 'T', credit: 'Me, 1900', semitones: 2, capo: 0, instrument: 'baritone', library: lc.getBuiltInLibrary('baritone') });
  assert.strictEqual(a.sub, 'Me, 1900 · D major · Baritone uke');
  assert.ok(a.html.over.includes('data-line="3"'), 'its lines numbered as the song');
  assert.ok(a.diagrams.some((d) => d.name === 'D'), 'transposed');
  const capo = sessionSongFromText(SONG, { capo: 2, library: lc.getBuiltInLibrary('soprano') });
  assert.match(capo.sub, /C major · Capo 2/);
  assert.ok(capo.diagrams.some((d) => d.name === 'A#' || d.name === 'Bb'), 'the shapes played with the capo');
  const once = sessionSongFromText(SONG, { chorusOnce: true, library: lc.getBuiltInLibrary('soprano') });
  assert.ok(!/data-line/.test(once.html.over), 'shortened: its lines aren\'t the song\'s, nothing to light');
  const nothingRepeats = sessionSongFromText('--START MUSIC--\n[C]la\n--END MUSIC--\n', { chorusOnce: true, library: lc.getBuiltInLibrary('soprano') });
  assert.match(nothingRepeats.html.over, /data-line="2"/, 'nothing shortened: lines still lit');
});

test('left-handed shapes on the Session screen, desktop and web', () => {
  const { sessionSongFromText } = require('../src/session-view');
  const lib = lc.getBuiltInLibrary('soprano');
  const right = sessionSongFromText(SONG, { library: lib }).diagrams.find((d) => d.name === 'G').svg;
  const left = sessionSongFromText(SONG, { library: lib, leftHanded: true }).diagrams.find((d) => d.name === 'G').svg;
  assert.notStrictEqual(left, right);
  assert.match(DESKTOP, /leftHanded: Boolean\(state\.config\?\.diagrams\?\.left_handed\)/);
  assert.match(WEB, /library: library\(\), common: song\.settings\?\.diagrams\?\.common_chords, leftHanded: look\.leftHanded === true/);
});

console.log('v4.75 tests passed');
