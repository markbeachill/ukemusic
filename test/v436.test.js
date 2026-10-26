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

test('Tidy chords above words leaves bar lines alone (they were merged into the next line)', () => {
  const cs = require('../src/chord-sheet');
  const song = '--START MUSIC--\n[[Verse]]\n| Dm↓ Dm↓ F↓ G↓ | Dm↓ Dm↓ F↓ G↓ |\n| E7 | E7 G A | E7 | G7 |\n| C7 | C7 | Dm↓ Dm↓ F↓ G↓ |\n| G7 | G7 | D7 | D7 | (x2)\n--END MUSIC--\n';
  assert.strictEqual(cs.findChordLines(song).length, 0);
  assert.strictEqual(cs.convertChordSheet(song).text, song);
  assert.ok(cs.isBarLine('| C | G | (x2)') && cs.isBarLine('[[Intro]] | C | G |') && !cs.isBarLine('C   G'));
  assert.strictEqual(cs.convertChordSheet('C        G\nHello my friend\n').text, '[C]Hello my [G]friend\n', 'chord sheets still convert');
});

test('Tidy: chords with strum marks and lengths, and several at one place', () => {
  const cs = require('../src/chord-sheet');
  assert.deepStrictEqual(cs.analyseLine('Dm↓:2   F↓:1G↓:1Dm↓:2').chords.map((c) => `${c.name}@${c.column}`), ['Dm↓:2@0', 'F↓:1@8', 'G↓:1@8', 'Dm↓:2@8']);
  assert.strictEqual(cs.convertChordSheet('Dm↓:2   F↓:1G↓:1   E7\nOne two three four five\n').text, '[Dm↓:2]One two [F↓:1][G↓:1]three four [E7]five\n');
  assert.deepStrictEqual(cs.analyseLine('FC').chords.map((c) => c.column), [0, 1], 'run-together plain chords still read as a scan');
});

test('Tidy: a words template takes the words pasted under it', () => {
  const cs = require('../src/chord-sheet');
  const t = '[Dm:2]······· [F:1][G:1]···· [G:1]·· ····[F:1]···· [Dm:2][F:1]';
  assert.strictEqual(cs.fillTemplate(t, 'Abcdef, ghij kl mnopqrst'), '[Dm:2]Abcdef, [F:1][G:1]ghij [G:1]kl mnop[F:1]qrst [Dm:2][F:1]');
  assert.strictEqual(cs.fillTemplate(t, 'Abcdef,   ghij kl mnopq'), '[Dm:2]Abcdef, [F:1][G:1]ghij [G:1]kl mno[F:1]pq [Dm:2][F:1]', 'a shorter word: the chord moves in proportion');
  const song = `--START MUSIC--\n{DDDD}\n${t}\nAbcdef, ghij kl mnopqrst\n${t}\n| C | G |\n--END MUSIC--\n`;
  assert.deepStrictEqual(cs.findChordLines(song), [3], 'only a template with words under it is waiting to be tidied');
  const out = cs.convertChordSheet(song).text;
  assert.ok(out.includes('[Dm:2]Abcdef, [F:1][G:1]ghij') && out.includes(`${t}\n| C | G |`), out);
  assert.strictEqual(parse(out).flatMap((n) => n.warnings || []).length, 0);
});

test('Save: a title that is taken can take the words instead (the same file imported again)', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('id="titleReplace"') && html.includes("allowReplace: !state.song") && html.includes("typeof title === 'object'"));
});

test('marked strums with a length: spread over the chord, in the words and in bar lines', () => {
  const lib = lc.getBuiltInLibrary('soprano');
  const N = { '69.62.65.69': 'Dm', '69.60.65.69': 'F', '67.62.67.71': 'G' };
  const play = (t) => buildSchedule(parse(`--START MUSIC--\n{D-DU-UDU}\n${t}\n--END MUSIC--\n`), { library: lib, tempo: 120, beatsPerBar: 4 })
    .events.filter((e) => e.kind === 'strum').map((e) => `${e.time.toFixed(1)}:${N[e.notes.join('.')]}`).join(' ');
  // [Dm↓↓:2] used to play one strum: the second was placed on beat 3 and cut
  assert.strictEqual(play('[Dm↓↓:2][F↓:1][G↓:1]'), '0.0:Dm 0.5:Dm 1.0:F 1.5:G'.replace(/(\d)\.(\d):/g, (m, a, b) => `${(Number(`${a}.${b}`) + 2).toFixed(1)}:`));
  assert.strictEqual(play('| Dm↓↓:2 F↓ G↓ |'), play('[Dm↓↓:2][F↓:1][G↓:1]'), 'bar lines keep the marks too');
  assert.ok(/^2\.0:Dm 3\.0:Dm 4\.0:F/.test(play('[Dm↓↓][F]')), 'a whole-bar [Dm↓↓] still strums on 1 and 3');
});

test('v is a down-strum, as songbooks write it: in the words, bar lines and Tidy', () => {
  const lib = lc.getBuiltInLibrary('soprano');
  const play = (t) => buildSchedule(parse(`--START MUSIC--\n{D-DU-UDU}\n${t}\n--END MUSIC--\n`), { library: lib, tempo: 120, beatsPerBar: 4 }).events.filter((e) => e.kind === 'strum').map((e) => e.time.toFixed(1)).join(' ');
  assert.strictEqual(play('[Dmvv:2][Fv:1][Gv:1]'), play('[Dm↓↓:2][F↓:1][G↓:1]'));
  assert.strictEqual(play('| Dmvv:2 Fv Gv |'), play('[Dm↓↓:2][F↓:1][G↓:1]'));
  const cs = require('../src/chord-sheet');
  assert.strictEqual(cs.convertChordSheet('Dmvv:2  Fv:1Gv:1\nOne two three\n').text, '[Dmvv:2]One two [Fv:1][Gv:1]three\n');
  assert.ok(!cs.isChordLine('Over the river'));
});
