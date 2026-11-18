// 4.88: Free Practice for hands on the instrument: one-minute changes need nothing pressed during
// the minute (beeps before, at ten seconds and at the end; the microphone can count the strums),
// a page-turner pedal works like Space, the screen stays on, and a routine finishes the round
// before moving on, with a few seconds to get ready for the next exercise.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const JS = read('web/pr_js.js');
const MARKUP = read('web/pr_markup.html');
const help = require('../src/practice-help');

test('one-minute changes: three beeps and a higher go, a beep at ten seconds, three at the end', () => {
  assert.match(JS, /const lead = pr\.leadMs \?\? 3000;/);
  assert.match(JS, /if \(lead > 0\) prCue\(\[\[0, false\], \[lead \/ 3000, false\], \[2 \* lead \/ 3000, false\], \[lead \/ 1000, true, 2\.4\]\]\);/);
  assert.match(JS, /if \(!om\.warned && left <= 10000 && \(pr\.minuteMs \|\| 60000\) > 20000\) \{ om\.warned = true; prCue\(\[\[0, true, 1\.4\]\]\); \}/);
  assert.match(JS, /prCue\(\[\[0, true, 2\.4\], \[0\.25, true, 2\.4\], \[0\.5, true, 2\.4\]\]\);/);
  assert.match(JS, /\$p\('prBigSub'\)\.textContent = `Get your hand on \$\{om\.from\}…`;/);
  // nothing counts before go
  assert.match(JS, /if \(!om \|\| !om\.running \|\| performance\.now\(\) < om\.starts\) return;\n\s*om\.count \+= 1;/);
});

test('one-minute changes: Count by listening counts strums (one a chord), never its own beeps, and lets go of the microphone', () => {
  assert.match(MARKUP, /<input id="prListen" type="checkbox"> Count my changes by listening/);
  assert.match(MARKUP, /<button id="prListenToggle" type="button" class="pr-listen" hidden aria-pressed="false"/);
  assert.match(JS, /getUserMedia\(\{ audio: \{ echoCancellation: false, noiseSuppression: false, autoGainControl: false \} \}\)/);
  assert.match(JS, /level > Math\.max\(0\.02, ear\.floor \* 5\) && level > ear\.prev \* 1\.8 && now - ear\.last > 280/);
  assert.match(JS, /if \(ear\) ear\.quietUntil = performance\.now\(\) \+ Math\.max\(\.\.\.beeps\.map\(\(b\) => b\[0\]\)\) \* 1000 \+ 350;/);
  assert.match(JS, /for \(const track of ear\.stream\.getTracks\(\)\) track\.stop\(\);/);
  assert.match(JS, /const heard = om\.ear \? Math\.max\(0, om\.ear\.strums - 1\) : null;\n\s*prEarStop\(\);/, 'the first strum is the first chord, not a change');
  assert.match(JS, /The microphone isn’t available \(/, 'without a microphone, count in your head');
  // the score is still yours to check
  assert.match(JS, /Take off any that weren’t clean, then save\./);
  const steps = help.forExercise('one-minute').steps.join(' ');
  assert.match(steps, /Your hands are busy, so don’t press anything/);
  assert.match(steps, /strumming once on each chord/);
  assert.match(read('package.json'), /"NSMicrophoneUsageDescription": "Free Practice can count your chord changes by listening to your strums\. Nothing is recorded or sent anywhere\."/);
});

test('a page-turner pedal works like Space; the screen stays on in an exercise', () => {
  assert.match(JS, /const PEDAL_KEYS = \['PageDown', 'PageUp', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'\];/);
  assert.match(JS, /PEDAL_KEYS\.includes\(event\.key\) && !event\.target\.closest\?\.\('#prControls'\)/, 'not while you\'re in the settings');
  assert.match(MARKUP, /\+1 change <small>\(friend, Space or pedal\)<\/small>/);
  assert.match(JS, /const wake = await navigator\.wakeLock\.request\('screen'\);/);
  assert.match(JS, /pr\.exDef = e;\n\s*prKeepAwake\(true\);/);
  assert.match(JS, /function prShowHome\(\) \{\n\s*prKeepAwake\(false\);/);
  assert.match(JS, /function closePractice\(\) \{\n\s*prKeepAwake\(false\);/);
});

test('a routine finishes the round in play (up to half a minute), then gives three seconds to get ready', () => {
  assert.match(JS, /if \(player\?\.playing && pr\.schedule && over > -30 && !r\.finishRound\) r\.finishRound = true;\n\s*else if \(!player\?\.playing \|\| over <= -30\) prRoutineNext\(\);/);
  assert.match(JS, /if \(pr\.routine\?\.finishRound && !pr\.userStopped && !demo\) \{ prRoutineNext\(\); return; \}/);
  assert.match(JS, /Next: \$\{prExerciseFor\(PL\.EXERCISES\.find\(\(x\) => x\.id === step\.id\)\)\.title\}\. It starts in a moment\./);
  assert.match(JS, /setTimeout\(go, r\.step > 0 \? 3000 : 600\);/);
  assert.match(JS, /r\.finishRound \? 'last round' :/);
});

test('the desktop copy of Free Practice matches the web one', () => {
  require('../tools/sync-practice').sync();
  assert.ok(read('index.html').includes('function prEarStart()'));
});

// 4.88.1
test('4.88.1: the web player counts in wherever Play starts (a tapped line too), but not on a restart mid-song', () => {
  const WEB = read('web/app.html');
  assert.match(WEB, /async function start\(fromLine = 0, \{ countIn = true \} = \{\}\) \{\n[^\n]*\n\s*const schedule = U\.buildSchedule\(currentIr\(\), \{ \.\.\.scheduleOptions\(countIn\), startLine: fromLine \}\);/);
  assert.match(WEB, /setTimeout\(\(\) => start\(line, \{ countIn: false \}\), 80\);/);
  assert.ok(!/scheduleOptions\(fromLine === 0\)/.test(WEB));
  // the desktop counts in from any line already
  assert.match(read('index.html'), /countIn: config\?\.playback\?\.count_in !== false && !options\.resume,/);
});
test('4.88.1: the player plays events in time order (the sung first note is on the first click of the count-in)', () => {
  const AUDIO = read('src/playback-audio.js');
  assert.match(AUDIO, /if \(events\.some\(\(e, i\) => i && e\.time < events\[i - 1\]\.time\)\) \{\n\s*schedule = \{ \.\.\.schedule, events: events\.map\(\(e, i\) => \[e, i\]\)\.sort\(\(a, b\) => a\[0\]\.time - b\[0\]\.time \|\| a\[1\] - b\[1\]\)\.map\(\(\[e\]\) => e\) \};/);
  // the schedule still puts it after the clicks: the player is what sorts it
  const { buildSchedule } = require('../src/playback-schedule');
  const parseSong = require('../src/parser');
  const s = buildSchedule(parseSong('[C]Amazing [G]grace', { useDelimiters: false }), { tempo: 90, beatsPerBar: 3, firstNote: 60 });
  const cue = s.events.findIndex((e) => e.cue);
  assert.ok(cue > 0 && s.events[cue].time === 0 && s.events[cue - 1].time > 0, 'out of order in the schedule');
});

console.log('v4.88 tests passed');
