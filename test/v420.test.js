// 4.20: a speaking voice for Play and Karaoke (count-in, what's next, next chord)
const assert = require('assert');
const parse = require('../src/parser');
const { buildSchedule } = require('../src/playback-schedule');
const v = require('../src/voice-cues');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const near = (a, b) => Math.abs(a - b) < 1e-6;

test('chord names said the way players say them', () => {
  assert.deepStrictEqual(['F#m7', 'Bb/D', 'G7', 'Cmaj7', 'Asus4', 'N.C.', 'Dm', 'E', 'Gdim', 'Bm7b5', 'Eb6'].map(v.spokenChord),
    ['F sharp minor seven', 'B flat over D', 'G seven', 'C major seven', 'A sus four', 'stop', 'D minor', 'E', 'G diminished', 'B half diminished', 'E flat six']);
});
const ir = parse('[[Verse 1]]\n[C]one [G7]two\n[[Chorus]]\n[F]three [C]four\n');
const s = buildSchedule(ir, { tempo: 100, beatsPerBar: 4, countIn: true });
test('the count-in, on the clicks; nothing talks over it', () => {
  const cues = v.voiceCues(s, { count: true, sections: true, chords: true, irNodes: ir });
  const count = cues.filter((c) => c.kind === 'count');
  assert.deepStrictEqual(count.map((c) => c.text), ['one', 'two', 'three', 'four']);
  assert.ok(near(count[1].at, 0.48));
  assert.ok(cues.every((c) => c.kind === 'count' || c.at >= s.countInDuration - 0.05));
});
test('what\'s next comes about a bar ahead; chords just before they change', () => {
  const cues = v.voiceCues(s, { sections: true, chords: true, irNodes: ir });
  assert.deepStrictEqual(cues.map((c) => `${c.kind}:${c.text}`), ['section:Verse 1', 'chord:C', 'chord:G seven', 'section:Chorus', 'chord:F', 'chord:C']);
  const chorus = cues.find((c) => c.text === 'Chorus');
  const fBar = s.bars.find((b) => b.chord === 'F');
  assert.ok(near(chorus.at, fBar.time - 2) && near(cues.find((c) => c.text === 'F').at, fBar.time - 0.7));
});
test('6/8: the count is said on the beats (1 and 4), not every eighth', () => {
  const six = buildSchedule(parse('{6/8 D-DU-U}\n[C]x'), { tempo: 60, beatsPerBar: 4, countIn: true });
  assert.deepStrictEqual(v.voiceCues(six, { count: true }).map((c) => c.text), ['one', 'two']);
});
test('nothing chosen: nothing said', () => {
  assert.deepStrictEqual(v.voiceCues(s, { irNodes: ir }), []);
});
