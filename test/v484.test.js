// 4.84: the desktop: one of each (docs/ui-improvements.md L1, L3, L4, C3, D2)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const DESKTOP = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');

test('L1: the top bar\'s button says Play (then Pause), never "Play / Pause"', () => {
  assert.match(DESKTOP, /<button id="quickPlay" type="button"[^>]*>Play<\/button>/);
  assert.ok(!DESKTOP.includes('>Play / Pause<'));
});

test('L4: back to your songs is top left, with a word on it', () => {
  const bar = DESKTOP.match(/<div class="appbar">[\s\S]*?<\/div>\n\s*<nav class="ribbon"/)[0];
  assert.ok(bar.indexOf('id="backToSongs"') < bar.indexOf('id="songTitle"'));
  assert.match(bar, /<button id="backToSongs" class="appbar-back" type="button"[^>]*>‹ Songs<\/button>/);
  assert.ok(!DESKTOP.includes('id="ribbonClose"'), 'the × beside "hide the tools" has gone');
  assert.match(DESKTOP, /getElementById\('backToSongs'\)\.addEventListener\('click', \(\) => document\.getElementById\('closeSongButton'\)\.click\(\)\);/);
});

test('L3: Settings is a button at the end of the tab row, not a tab', () => {
  assert.ok(!DESKTOP.includes('id="ribbonTabSettings"') && !DESKTOP.includes('data-ribbon-panel="settings"'));
  assert.match(DESKTOP, /<span class="ribbon-end">\n\s*<button id="settingsToggleButton" class="ribbon-settings" type="button"/);
  assert.match(DESKTOP, /<button id="aboutButton" type="button"[^>]*>About<\/button>\n\s*<button id="closeSettingsButton"/, 'About is in Settings');
  assert.match(DESKTOP, /showSettingsTab\(!document\.documentElement\.hasAttribute\('data-simple'\) && libraryEl\.hidden && state\.song \? 'song' : 'all'\);/);
});

test('C3: Write → Put in: Chord, Heading, Strum, Bar line, Tune (as the web player has)', () => {
  const write = DESKTOP.match(/data-ribbon-panel="write"[\s\S]*?(?=\n {10}<div class="ribbon-panel")/)[0];
  const web = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.html'), 'utf8');
  for (const [ins, back, name] of [['[]', '1', 'Chord'], ['[[]]', '2', 'Heading'], ['{}', '1', 'Strum'], ['|', '0', 'Bar line'], ['{melody: }', '1', 'Tune']]) {
    assert.ok(new RegExp(`<button class="rib-button rib-ins"[^>]*data-ins="${ins.replace(/[[\]{}|]/g, '\\$&')}" data-back="${back}"[^>]*>${name}</button>`).test(write), name);
    assert.ok(web.includes(`data-ins="${ins}" data-back="${back}"`), `the web player writes the same for ${name}`);
  }
  assert.match(write, /<button class="rib-button rib-ins" data-feature="tune"/, 'Tune with the tune feature');
  assert.match(DESKTOP, /if \(state\.usingCodeMirror\) window\.ukemusic\.editorInsert\(text, back\);/);
});

test('D2: the preview\'s header has the Edit chords switch, and says what you can do', () => {
  assert.match(DESKTOP, /<label class="preview-edit" data-feature="chordEdit"[^>]*><input id="previewChordEdit" type="checkbox" \/> Edit chords<\/label>/);
  assert.match(DESKTOP, /box\.checked = chordEditWanted\(\);/);
  assert.match(DESKTOP, /chordEditWanted\(\) \? 'drag a chord to its word · click a chord to change it' : 'follows the song as you scroll · click a line to go to it'/);
  assert.match(DESKTOP, /getElementById\('previewChordEdit'\)\?\.addEventListener\('change', \(event\) => setChordEdit\(event\.target\.checked\)\);/);
});

console.log('v4.84 tests passed');
