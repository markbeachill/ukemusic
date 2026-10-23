// 4.36: fuller C and G (the weak G4 and B4 recordings are not used), waltzes with a strong
// beat 1, House of the Rising Sun in 6/8, and Time, Strum and Feel in the web player.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const lib = require('../src/song-library');
const { buildSchedule, defaultPattern } = require('../src/playback-schedule');
const lc = require('../src/chord-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const PD = path.join(ROOT, 'public domain songs', 'Public Domain Songs');
const schedule = (title) => {
  const r = lib.readSong(path.join(PD, title));
  return buildSchedule(parse(r.content), { library: lc.getBuiltInLibrary('soprano'), tempo: Number(r.settings.song.tempo), beatsPerBar: Number(r.settings.song.beats_per_bar), defaultStrum: 'island' });
};

test('the sampled sound borrows A4 for G4 and C#5 for B4 (they die away too soon)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'playback-audio.js'), 'utf8');
  assert.ok(/const BORROW = \{ 67: 69, 71: 73 \}/.test(src));
  // the same choice as sampleFor, on the real list of recordings
  const notes = [60, 62, 64, 66, 67, 69, 71, 73, 75, 77, 79, 81, 84];
  const pick = (midi) => {
    let best = notes[0];
    for (const n of notes) if (Math.abs(n - midi) < Math.abs(best - midi)) best = n;
    return { 67: 69, 71: 73 }[best] || best;
  };
  assert.deepStrictEqual([67, 71, 69, 66, 60].map(pick), [69, 73, 69, 66, 60]);
});

test('Amazing Grace: a waltz, one strong down then two lighter', () => {
  const strums = schedule('Amazing Grace').events.filter((e) => e.kind === 'strum').slice(0, 6);
  assert.deepStrictEqual(strums.map((e) => e.velocity), [1, 0.51, 0.51, 1, 0.51, 0.51]);
});

test('House of the Rising Sun: 6/8, strong on 1 and 4, a bar every two pulses', () => {
  const r = lib.readSong(path.join(PD, 'House of the Rising Sun'));
  assert.strictEqual(Number(r.settings.song.beats_per_bar), 6);
  assert.ok(/^\{D>DDD>DD\}$/m.test(r.content));
  const strums = schedule('House of the Rising Sun').events.filter((e) => e.kind === 'strum').slice(0, 7);
  assert.deepStrictEqual(strums.slice(0, 6).map((e) => e.velocity >= 0.99), [true, false, false, true, false, false]);
  assert.ok(Math.abs(strums[6].time - strums[0].time - 2) < 1e-6, 'a bar of 6/8 at 60 takes 2 seconds');
});

test('The Wild Rover and Scarborough Fair lean on beat 1', () => {
  for (const t of ['The Wild Rover', 'Scarborough Fair']) assert.ok(/^\{D>-DUDU\}$/m.test(lib.readSong(path.join(PD, t)).content), t);
});

test('the web player: Time, Strum and Feel, and the strum it plays', () => {
  const html = fs.readFileSync(path.join(ROOT, 'web', 'app.html'), 'utf8');
  for (const id of ['timeSel', 'strumSel', 'feelSel']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes('function played(text)') && html.includes('swing: p.feel'));
  const preload = fs.readFileSync(path.join(ROOT, 'src', 'preload.js'), 'utf8');
  assert.ok(preload.includes('defaultStrumPattern'));
  assert.strictEqual(defaultPattern(4, 'island'), 'D-DU-UDU');
});

test('ChordPro: feel lines go out and come back', () => {
  const { ukemusicToChordPro, chordProToUkemusic } = require('../src/chordpro');
  const out = ukemusicToChordPro(parse('--START MUSIC--\n[C]a\n{swing}\n[F]b\n{light swing}\n[G]c\n--END MUSIC--\n'), {});
  assert.ok(out.includes('{comment: Feel: swing}') && out.includes('{comment: Feel: light swing}') && !/Strum \}/.test(out), out);
  const back = chordProToUkemusic(out).text;
  assert.ok(/\n\{swing\}\n/.test(back) && /\n\{light swing\}\n/.test(back) && !/\[\[/.test(back), back);
});

test('this version has release notes, and the docs become website pages', () => {
  const { notesFor, releaseNotes } = require('../tools/release-notes');
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const version = require('../package.json').version;
  const notes = notesFor(changelog, `v${version}`);
  assert.ok(notes && notes.length > 40, `CHANGELOG.md has no section for v${version}`);
  assert.ok(!/^## v/m.test(notes), 'only its own section');
  assert.ok(/What's new/.test(releaseNotes(changelog, 'v0.0.1')));
  const { markdownToHtml } = require('../src/guide');
  const h = markdownToHtml('- a\n  - b\n- [c](CHORDPRO.md)', { nested: true, href: require('../web/docs').href }).html;
  assert.strictEqual(h, '<ul><li>a<ul><li>b</li></ul></li><li><a href="chordpro.html">c</a></li></ul>');
  assert.strictEqual(markdownToHtml('- [c](CHORDPRO.md)').html, '<ul><li>c</li></ul>', 'the app shows links as text, as before');
  for (const f of ['CHORDPRO.md', 'WRITING.md', 'CHANGELOG.md']) assert.ok(fs.existsSync(path.join(ROOT, f)), f);
});
