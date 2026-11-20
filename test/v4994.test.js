// 4.99.4: the strum builder, My strums, the bass-note strokes (B b) and palm-muting (M), and more strums
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const { buildSchedule, parsePattern, bassString } = require('../src/playback-schedule');
const { loadChordLibrary } = require('../src/chord-library');
const { strumSteps, renderStrum } = require('../src/strum-box');
const S = require('../src/strums');
const M = require('../src/my-strums');
const B = require('../src/strum-builder');
const levels = require('../src/feature-levels.js');
function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');

test('the notation: B and b (bass notes, by case), M (palm-muted)', () => {
  assert.strictEqual(parsePattern('B-D-b-D-'), 'B-D-b-D-');
  assert.strictEqual(parsePattern('m>mmm'), 'M>MMM');
  assert.strictEqual(parsePattern('⇣↓↑'), 'MDU');
  assert.deepStrictEqual(strumSteps('B-D-b-D-').map((s) => s.stroke).join(''), 'B-D-b-D-');
  assert.match(renderStrum('B-D-b-D-', { style: 'clean', beats: 4 }), /Alternating bass/);
  const node = parse('{BDbD}\n[C]x').find((n) => n.type === 'rhythm');
  assert.ok(node && !node.recall && !(node.warnings || []).length, 'strokes only: a strum, not a name');
  const named = parse('{B: D-D-D-D}\n{B}\n[C]x').filter((n) => n.type === 'rhythm');
  assert.ok(named[1].recall, 'a single letter is still a name ({B})');
});

test('playback: a bass note on its own, the root then the fifth; muted strums are short', () => {
  const guitar = loadChordLibrary(null, 'guitar');
  const s = buildSchedule(parse('{B-D-b-D-}\n[C]x'), { library: guitar, instrument: 'guitar', tempo: 60, countIn: false });
  const [b1, d1, b2] = s.events;
  assert.ok(b1.bass && b1.notes.filter((n) => n != null).length === 1);
  assert.strictEqual(b1.notes.find((n) => n != null) % 12, 0, 'C');
  assert.strictEqual(b2.notes.find((n) => n != null) % 12, 7, 'G, the fifth');
  assert.ok(d1.notes.filter((n) => n != null).length > 1, 'then a strum');
  assert.strictEqual(bassString([67, 60, 64, 72], 'C'), 1, 'high-G ukulele: its C string');
  const m = buildSchedule(parse('{M>MMM}\n[C]x'), { library: loadChordLibrary(null, 'soprano'), instrument: 'soprano', tempo: 60, countIn: false });
  assert.ok(m.events.every((e) => e.muted));
  assert.ok(read('src/playback-audio.js').includes('if (event.muted) gain.gain.setTargetAtTime(0, time + 0.025, 0.035);'));
});

test('the library: 27 strums, the guitar and baritone ones marked', () => {
  assert.strictEqual(S.STRUMS.length, 27);
  for (const id of ['down-ups', 'alt-bass', 'alt-bass-ups', 'bass-island', 'bossa', 'palm-muted', 'waltz-bass', 'six-eight-bass', 'polka-bass']) assert.ok(S.strum(id), id);
  assert.strictEqual(S.strum('alt-bass').suits, 'guitar and baritone');
  assert.match(S.strum('island').aka, /campfire/);
  for (const s of S.STRUMS) {
    const n = parsePattern(s.pattern).replace(/>/g, '').length;
    assert.ok(n % s.beats === 0 || s.beats % n === 0, `${s.id} fills its bar`);
  }
});

test('My strums: one line in the settings', () => {
  const list = M.saveStrum([], { name: 'Skiffle', beats: 4, pattern: 'D-DUXUDU' });
  const two = M.saveStrum(list, { name: 'Slow; waltz', beats: 3, pattern: 'B-D-D-' });
  assert.strictEqual(M.formatMyStrums(two), 'Skiffle = 4/4 D-DUXUDU; Slow waltz = 3/4 B-D-D-');
  assert.deepStrictEqual(M.parseMyStrums(M.formatMyStrums(two)), two);
  assert.strictEqual(M.saveStrum(two, { name: 'skiffle', beats: 4, pattern: 'DUDU' }).length, 2, 'the same name replaces');
  assert.strictEqual(M.removeStrum(two, 'SKIFFLE').length, 1);
  assert.deepStrictEqual(M.parseMyStrums('nonsense; = D; x = 4/4 ---'), []);
  const ini = require('ini');
  assert.strictEqual(ini.parse(ini.stringify({ playback: { my_strums: M.formatMyStrums(two) } })).playback.my_strums, M.formatMyStrums(two), 'survives config.ini');
});

test('the builder: slots, counts, regridding and advice', () => {
  assert.strictEqual(B.patternOf(B.stepsFrom('D>-DU-UDU')), 'D>-DU-UDU');
  assert.strictEqual(B.perBeatFor(8, 4), 2);
  assert.strictEqual(B.perBeatFor(7, 4), 0);
  assert.deepStrictEqual(B.countsFor(2, 2).map((c) => c.text), ['1', '&', '2', '&']);
  assert.strictEqual(B.patternOf(B.regrid(B.stepsFrom('D-DU'), 8)), 'D---D-U-', 'eighths to sixteenths keep their place');
  const adv = B.advice(B.stepsFrom('DUUD'), 2, 2);
  assert.ok(adv.some((t) => /up where the hand is going down/.test(t)) && adv.some((t) => /down where the hand is coming up/.test(t)));
  assert.ok(B.advice(B.stepsFrom('B-D-b-D-'), 4, 2).some((t) => /bass notes/.test(t)));
  assert.strictEqual(B.STROKES.map((x) => x.s).join(''), 'DUXMBb-');
});

test('both apps: the builder, My strums in the strum menus, Free Practice', () => {
  assert.ok(DESKTOP.includes('<script src="src/my-strums.js"></script>\n    <script src="src/strum-builder.js"></script>'));
  assert.ok(DESKTOP.includes('<button id="strumBuildButton" class="rib-small" type="button" data-feature="strumBuilder"'));
  assert.ok(DESKTOP.includes("case 'strum-builder':"));
  assert.ok(DESKTOP.includes("setAt(state.songSettings, 'playback.custom_strum', strum.pattern);"), 'a song keeps the pattern itself');
  assert.ok(DESKTOP.includes('group.label = \'My strums\';'));
  assert.ok(read('main.js').includes("label: 'Strum Builder…', click: () => sendMenuAction('strum-builder')"));
  assert.ok(read('main.js').includes("custom_strum: 'D>-DU-UDU', my_strums: '',"));
  assert.ok(read('web/build.js').includes("'my-strums.js', 'strum-builder.js'"));
  assert.ok(WEB.includes("if (v === 'build') { openStrumBuilder(); return; }"));
  assert.ok(WEB.includes("look.myStrums = UkeMyStrums.formatMyStrums(list); local.set('look', look);"));
  assert.ok(read('web/pr_js.js').includes("label: 'My strums'"));
  assert.ok(DESKTOP.includes("label: 'My strums'"), 'Free Practice synced to the desktop');
  const row = levels.FEATURES.find((f) => f.id === 'strumBuilder');
  assert.ok(row && row.app === 'both');
  assert.match(read('WRITING.md'), /\| `B` \| the chord's bass note/);
  assert.match(read('docs/user-guide.md'), /### Strums: the library and the builder/);
  assert.match(read('docs/user-guide-phone.md'), /## Strums/);
});
