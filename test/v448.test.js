// 4.48: more of the standard chord patterns, a part that is one loop, and runs round the circle.
const assert = require('assert');
const p = require('../src/progressions');
const { parse } = require('../src/parser');
const learn = require('../src/learn');
const { buildSchedule } = require('../src/playback-schedule');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const song = (body) => parse(`--START MUSIC--\n${body}\n--END MUSIC--\n`);
const names = (ir) => p.analyse(ir, {}).parts.map((x) => x.patterns.map((q) => q.name));

test('the new standard patterns are found', () => {
  assert.deepStrictEqual(names(song('[[Verse]]\nla [C]la [D7]la\n[F]la [C]la'))[0], ['Eight Days a Week']);
  assert.ok(names(song('[[Verse]]\n[A]la [D]la [E]la [D]la\n[A]la [D]la [E]la [D]la'))[0].includes('Garage-rock riff'));
  assert.ok(names(song('[[Verse]]\n[C]a [G]b [Am]c [Em]d\n[F]e [C]f [F]g [G]h'))[0].includes('Pachelbel\'s Canon'));
  assert.ok(names(song('[[Verse]]\n[C]a [A7]b [D7]c [G7]d [C]e'))[0].includes('Salty Dog'));
  assert.ok(names(song('[[Verse]]\n[G]a [B]b [C]c [Cm]d\n[G]a [B]b [C]c [Cm]d'))[0].includes('Creep'));
  assert.ok(names(song('[[Verse]]\n[C]a [F]b [Fm]c [C]d'))[0].includes('Minor four'));
  assert.ok(names(song('[[Verse]]\n[Am]a [F]b [G]c [Am]d\n[Am]a [F]b [G]c [Am]d'))[0].includes('Minor rock (i–VI–VII)'));
});

test('a part that is one loop says so: named ("round 4 times") or not ("One loop")', () => {
  const four = p.analyse(song('[[Chorus]]\n[C]a [D7]b\n[F]c [C]d\n[C]a [D7]b\n[F]c [C]d\n[C]a [D7]b\n[F]c [C]d\n[C]a [D7]b\n[F]c [C]d'), {}).parts[0].patterns;
  assert.ok(/whole part, round 4 times/.test(four[0].hint), four[0].hint);
  const odd = p.analyse(song('[[Verse]]\n[C]a [E7]b [Am]c [F]d\n[C]a [E7]b [Am]c [F]d'), {}).parts[0].patterns;
  assert.ok(odd.some((x) => x.name === 'One loop' && /4 chords, round and round \(2 times\)/.test(x.hint)), JSON.stringify(odd));
  // a part played once is no loop
  assert.ok(!p.analyse(song('[[Verse]]\n[C]a [E7]b [Am]c [F]d'), {}).parts[0].patterns.some((x) => x.name === 'One loop'));
});

test('a run round the circle of fifths, wherever it starts (and not twice over a named one)', () => {
  const bridge = p.analyse(song('[[Verse]]\n[C]a [F]b [C]c\n\n[[Bridge]]\n| Em | Am | Dm | G |'), {}).parts.find((x) => x.name === 'Bridge').patterns;
  assert.deepStrictEqual(bridge.map((x) => [x.name, x.steps.join(' ')]), [['Round the circle', 'iii vi ii V']]);
  // the named Circle (vi ii V I) is enough
  assert.ok(!names(song('[[Verse]]\n[C]a [Am]b [Dm]c [G]d [C]e'))[0].includes('Round the circle'));
  assert.strictEqual(p.corePc('bVII'), 10);
  assert.strictEqual(p.corePc('VII', true), 10);
});

test('the learn sheet marks them on the chord map', () => {
  const ir = song('[[Chorus]]\n[C]a [D7]b\n[F]c [C]d\n[C]a [D7]b\n[F]c [C]d\n\n[[Bridge]]\n| Em | Am | Dm | G |');
  const a = p.analyse(ir, {});
  const map = learn.chordMap(ir, buildSchedule(ir, { beatsPerBar: 4, countIn: false }), a);
  const marks = map.parts.map((x) => (x.marks || []).map((m) => `${m.name}: ${m.chords.join(' ')}`));
  assert.deepStrictEqual(marks, [['Eight Days a Week: C D7 F C'], ['Round the circle: Em Am Dm G']]);
});
