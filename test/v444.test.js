// 4.44: picking a strummed song: picking patterns in playback, the Picking dialog and the pick sheet.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const picking = require('../src/picking');
const learn = require('../src/learn');
const { buildSchedule } = require('../src/playback-schedule');
const { pickSheetHtml, lineTab, lineBars, songLines } = require('../src/pick-sheet');
const { parse } = require('../src/parser');
const lc = require('../src/chord-library');
const sl = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const uke = lc.getBuiltInLibrary('soprano');
const gtr = lc.getBuiltInLibrary('guitar');
const SONG = '--START MUSIC--\n{D-DU-UDU}\n[[Verse]]\n[C]Joyful, joyful, [G7]we adore thee\n[C]Hearts unfold like [G7]flowers be[C]fore thee\n--END MUSIC--\n';
const C = [0, 0, 0, 3];

test('five standard patterns, easiest first', () => {
  assert.deepStrictEqual(picking.PATTERNS.map((p) => p.id), ['up', 'up8', 'upback', 'pinch', 'travis', 'melody']);
  assert.deepStrictEqual(picking.patternFor('up8', 4), ['p', 'i', 'm', 'a', 'p', 'i', 'm', 'a']);
  assert.strictEqual(picking.patternFor('upback', 3).length, 6);
  assert.strictEqual(picking.patternFor('travis', 6, true).length, 6);
  assert.strictEqual(picking.patternFor('up', 2).length, 4);
});

test('a ukulele: a finger to a string, thumb on g (and C for the alternating thumb)', () => {
  assert.deepStrictEqual(picking.stringNames('soprano'), ['g', 'C', 'E', 'A']);
  assert.deepStrictEqual(picking.roleStrings(C, 'C', 'soprano'), { p: 0, P: 1, i: 1, m: 2, a: 3 });
  assert.strictEqual(picking.pickText('up', { frets: C, chord: 'C' }), 'g C E A');
  assert.strictEqual(picking.pickText('upback', { frets: C, chord: 'C', beats: 3 }), 'g C E A E C');
  assert.strictEqual(picking.pickText('pinch', { frets: C, chord: 'C' }), 'g+A C E C g+A C E C');
  assert.strictEqual(picking.pickText('travis', { frets: C, chord: 'C' }), 'g+A E C A g E C A');
  assert.strictEqual(picking.fingerText('travis'), 'p+a m p a p m p a');
});

test('guitar: the thumb takes the root, the fingers the top three strings', () => {
  assert.deepStrictEqual(picking.stringNames('guitar'), ['E', 'A', 'D', 'G', 'B', 'e']);
  assert.deepStrictEqual(picking.roleStrings([-1, 3, 2, 0, 1, 0], 'C', 'guitar'), { p: 1, P: 2, i: 3, m: 4, a: 5 });   // A string, fret 3: C
  assert.strictEqual(picking.roleStrings([3, 2, 0, 0, 0, 3], 'G', 'guitar').p, 0);    // low E, fret 3: G
  assert.strictEqual(picking.roleStrings([-1, -1, 0, 2, 3, 2], 'D', 'guitar').P, 3);   // bass on D: the other thumb string is G
  assert.strictEqual(picking.roleStrings([0, 0, 0, 3], 'C', 'lowg').p, 0);
});

test('playback: picked notes, one string (or a pinch) at a time; strum unchanged without pick', () => {
  const ir = parse(SONG);
  const plain = buildSchedule(ir, { library: uke, countIn: false, defaultStrum: 'island' });
  assert.ok(plain.events.every((e) => !e.picked) && plain.bars.every((b) => !b.pick));
  const s = buildSchedule(ir, { library: uke, countIn: false, pick: 'up8' });
  const bar0 = s.events.filter((e) => e.barIndex === 0);
  assert.strictEqual(bar0.length, 8);
  assert.ok(bar0.every((e) => e.picked && e.notes.filter((n) => n !== undefined).length === 1));
  assert.deepStrictEqual(bar0.slice(0, 4).map((e) => e.strings[0]), [0, 1, 2, 3]);
  assert.strictEqual(bar0[0].notes[0], 67);   // g string open
  assert.deepStrictEqual(s.bars[0].pickSteps, ['g', 'C', 'E', 'A', 'g', 'C', 'E', 'A']);
  assert.strictEqual(buildSchedule(ir, { library: uke, countIn: false, pick: 'up' }).events.filter((e) => e.barIndex === 0).length, 4);
  assert.strictEqual(s.bars[0].pickNotes.length, 8);
  const pinch = buildSchedule(ir, { library: uke, countIn: false, pick: 'pinch' }).events.filter((e) => e.barIndex === 0);
  assert.strictEqual(pinch[0].notes.filter((n) => n !== undefined).length, 2);
  assert.strictEqual(buildSchedule(ir, { library: uke, pick: 'nonsense', countIn: false }).events.some((e) => e.picked), false);
});

test('a marked strum and a shorter chord', () => {
  const ir = parse('--START MUSIC--\n[C↓]Hey [G7:2]now [C:2]then\n--END MUSIC--\n');
  const s = buildSchedule(ir, { library: uke, countIn: false, pick: 'up8' });
  assert.ok(s.events.filter((e) => e.barIndex === 0).every((e) => !e.picked), 'a marked strum stays a strum');
  assert.strictEqual(s.events.filter((e) => e.barIndex === 1).length, 4, 'two beats: the first four steps');
});

test('the song keeps its pick (song.ini) and drops a wrong one', () => {
  assert.strictEqual(sl.pickSongSettings({ playback: { pick: 'travis' } }).playback.pick, 'travis');
  assert.ok(!sl.pickSongSettings({ playback: { pick: 'nope' } }).playback);
});

test('the pick sheet: the pattern, chord boxes, the song as tab with chords over it and words under it', () => {
  const ir = parse(SONG);
  const schedule = buildSchedule(ir, { library: uke, countIn: false, pick: 'up8' });
  const chordDef = (n) => lc.getChordDefinition(uke, n);
  const html = pickSheetHtml({ title: 'Ode', patternId: 'up8', ir, schedule, chordDef });
  assert.ok(/<h2>The pattern<\/h2>/.test(html) && /Up, twice a bar/.test(html) && /<span class="strings">g C E A<\/span>/.test(html));
  assert.ok(/<h2>The chords<\/h2>/.test(html) && /data-chord="C"/.test(html) && /data-chord="G7"/.test(html));
  // each bar: its chord over it, the tab, the words under it
  assert.ok(html.includes('<div class="bar"><div class="ch">C</div><pre>'), 'C over its bar');
  assert.ok(/<div class="ch">G7<\/div><pre>[^<]*<\/pre><div class="w">we adore thee<\/div>/.test(html), 'G7 over its words');
  assert.ok(/<div class="w">Joyful, joyful,<\/div>/.test(html));
  // a bar stretches to fit its words, and the tab keeps its notes
  const b = lineBars(songLines(ir).find((l) => l.kind === 'line'), schedule.bars.slice(0, 2), ir, 'soprano');
  assert.strictEqual(b.length, 2);
  assert.ok(b[0].rows[3].startsWith('0') && b[0].rows.every((r) => r.length === b[0].rows[0].length) && b[0].end);
  assert.ok(b[0].rows[0].length >= 'Joyful, joyful,'.length);
  const g = buildSchedule(ir, { library: gtr, instrument: 'guitar', countIn: false, pick: 'travis' });
  const gl = lineBars(songLines(ir).find((l) => l.kind === 'line'), g.bars.slice(0, 1), ir, 'guitar');
  assert.strictEqual(lineTab(gl, 'guitar').split('\n').length, 6);
  assert.ok(lineTab(gl, 'guitar').startsWith('e|'));
});

test('the bars find their words after a round trip (as across the app\'s bridge)', () => {
  const ir = parse(SONG);
  const copy = JSON.parse(JSON.stringify(ir));
  const schedule = JSON.parse(JSON.stringify(buildSchedule(copy, { library: uke, countIn: false, pick: 'up' })));
  const html = pickSheetHtml({ title: 'Ode', patternId: 'up', ir, schedule, chordDef: (n) => lc.getChordDefinition(uke, n) });
  assert.strictEqual((html.match(/<div class="sys">/g) || []).length, 2);
});

test('a repeated line: the sheet shows it once', () => {
  const ir = parse('--START MUSIC--\n[C]Round and [G7]round (x2)\n--END MUSIC--\n');
  const schedule = buildSchedule(ir, { library: uke, countIn: false, pick: 'up' });
  assert.strictEqual(schedule.bars.length, 4);
  const html = pickSheetHtml({ title: 'R', patternId: 'up', ir, schedule, chordDef: (n) => lc.getChordDefinition(uke, n) });
  assert.strictEqual((html.match(/<div class="bar"><div class="ch">C<\/div>/g) || []).length, 1);
});

test('a song with its own tab: played as written, shown as written', () => {
  const ir = parse('--START MUSIC--\n[[Intro]]\n```tab\nA|--3--|\nE|-0---|\nC|0----|\nG|-----|\n```\n\n[C]Hello [G7]there\n--END MUSIC--\n');
  const s = buildSchedule(ir, { library: uke, countIn: false, pick: 'up' });
  assert.ok(s.events.some((e) => e.tabNote) && s.events.some((e) => e.picked));
  const html = pickSheetHtml({ title: 'T', patternId: 'up', ir, schedule: s, chordDef: (n) => lc.getChordDefinition(uke, n) });
  assert.ok(/The song's own tab, as written/.test(html) && html.includes('A|--3--|'));
});

test('the first note to sing: tidied, moved with the key, sounded with the first click', () => {
  assert.strictEqual(picking.normalizeNote('f#'), 'F#');
  assert.strictEqual(picking.normalizeNote('H'), '');
  assert.strictEqual(picking.noteMidi('E'), 64);
  assert.strictEqual(picking.noteMidi('E', 2), 66);
  assert.strictEqual(picking.noteName('E', 2), 'F#');
  assert.strictEqual(picking.noteMidi('Bb3'), 58);
  assert.strictEqual(sl.pickSongSettings({ song: { first_note: 'e' } }).song.first_note, 'E');
  assert.ok(!('first_note' in sl.pickSongSettings({ song: { first_note: 'x9' } }).song));
  const ir = parse(SONG);
  const cue = buildSchedule(ir, { library: uke, firstNote: 64 }).events.filter((e) => e.cue);
  assert.strictEqual(cue.length, 1);
  assert.strictEqual(cue[0].time, 0);
  assert.strictEqual(cue[0].notes[0], 64);
  assert.strictEqual(buildSchedule(ir, { library: uke, firstNote: 64, countIn: false }).events.filter((e) => e.cue).length, 0, 'no count-in, no cue');
  const html = pickSheetHtml({ title: 'Ode', patternId: 'up', ir, schedule: buildSchedule(ir, { library: uke, countIn: false, pick: 'up' }), chordDef: (n) => lc.getChordDefinition(uke, n), facts: [['First note', 'E']] });
  assert.ok(/Picking to sing along to/.test(html) && /Your first note is <b>E<\/b>/.test(html));
});

test('the public-domain songs say where to start singing', () => {
  const root = path.join(ROOT, 'public domain songs', 'Public Domain Songs');
  const notes = Object.fromEntries(sl.listSongs(root).map((x) => [x.title, sl.readSong(x.folder).settings.song.first_note]));
  assert.deepStrictEqual([notes['Amazing Grace'], notes['Ode to Joy'], notes["Brahms' Lullaby"], notes['Scarborough Fair']], ['G', 'E', 'E', 'A']);
});

test('the tune: note names and ABC read the same', () => {
  const melody = require('../src/melody');
  const a = melody.parseMelody('{melody: E E F G | G F E D | C C D E | E. D/2 D2}', { beats: 4 });
  const b = melody.parseMelody('{melody abc: E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | E3 D D4}', { beats: 4 });
  assert.deepStrictEqual(a.notes, b.notes);
  assert.deepStrictEqual(a.notes.slice(0, 4).map((n) => n.midi), [64, 64, 65, 67]);
  assert.deepStrictEqual(a.notes.slice(-3).map((n) => [n.at, n.len]), [[12, 1.5], [13.5, 0.5], [14, 2]]);
  assert.deepStrictEqual(a.warnings, []);
  // a pickup, the nearest note, octave marks, a rest, a wrong bar
  const g = melody.parseMelody('{melody: G | C2 E/2 C/2 | E2 D | G,3 | r3 | C2}', { beats: 3 });
  assert.strictEqual(g.pickup, 1);
  assert.deepStrictEqual(g.notes.slice(0, 2).map((n) => [n.at, n.midi]), [[-1, 67], [0, 72]]);
  assert.strictEqual(g.notes.find((n) => n.len === 3).midi, 67, 'G, : the octave below the nearest G');
  assert.strictEqual(g.notes.filter((n) => n.midi === null).length, 1);
  assert.ok(melody.parseMelody('{melody: E E F G | G G G | C}', { beats: 4 }).warnings.some((w) => /bar 2 .*3 counts/.test(w)));
  assert.ok(melody.parseMelody('{melody: E X}', { beats: 4 }).warnings.some((w) => /"X" isn't a note/.test(w)));
});

test('the tune in a song: its own line, no room on the sheet, shared by lines with the same chords', () => {
  const melody = require('../src/melody');
  const ir = parse('--START MUSIC--\n{melody: E E F G | G F E D}\n[C]Joyful [G7]joyful\n[F]other [C]line\n\n[C]All Thy [G7]works\n--END MUSIC--\n');
  assert.ok(ir.some((n) => n.type === 'melody' && n.format === 'notes'));
  assert.ok(!ir.some((n) => n.type === 'rhythm'), 'not read as a strum');
  assert.ok(!/E E F G/.test(require('../src/renderer-html')(ir, {})));
  const tunes = melody.songMelody(ir);
  assert.deepStrictEqual([...tunes.keys()], [3, 6]);
  assert.ok(tunes.get(6).borrowed && !tunes.has(4));
  assert.ok(melody.hasMelody(ir) && !melody.hasMelody(parse('[C]Hi')));
});

test('re-keying a song moves its tune and its first note', () => {
  const rekey = require('../src/rekey');
  assert.strictEqual(rekey.rewriteText('{melody: G | C2 E/2 C/2 | E2 D | C2 A}\n[C]Hi', 2), '{melody: A | D2 F#/2 D/2 | F#2 E | D2 B}\n[D]Hi');
  assert.strictEqual(rekey.rewriteText('{melody abc: E2 c B,}', 2), '{melody abc: ^F2 d ^C}');
  assert.strictEqual(rekey.rekeySettings({ song: { first_note: 'E', key: 'C' } }, 2, { chords: ['C'] }).song.first_note, 'F#');
});

test('playback: the tune quietly over the chords, moved with the key', () => {
  const ir = parse('--START MUSIC--\n{melody: E E F G | G F E D}\n[C]Joyful [G7]joyful\n--END MUSIC--\n');
  const plain = buildSchedule(ir, { library: uke, countIn: false });
  assert.ok(!plain.events.some((e) => e.tune), 'only when asked');
  const s = buildSchedule(ir, { library: uke, countIn: false, tune: true, tuneShift: 2, tempo: 100 });
  const tune = s.events.filter((e) => e.tune);
  assert.strictEqual(tune.length, 8);
  assert.deepStrictEqual(tune.slice(0, 3).map((e) => [+e.time.toFixed(2), e.notes[8]]), [[0, 66], [0.6, 66], [1.2, 67]]);
  assert.ok(tune.every((e) => e.velocity < 0.7));
  assert.ok(s.events.every((e, i, all) => i === 0 || all[i - 1].time <= e.time), 'in time order');
});

test('chord melody: the tune on top from the shape, a chord note under beat 1, the pickup', () => {
  const ir = parse('--START MUSIC--\n{melody: E E F G | G F E D}\n[C]Joyful [G7]joyful\n[F]no tune here\n--END MUSIC--\n');
  const s = buildSchedule(ir, { library: uke, countIn: false, pick: 'melody' });
  assert.deepStrictEqual(s.bars[0].pickNotes.filter((x) => x.length).map((st) => st.map((n) => `${n.string}:${n.fret}`).join('+')), ['2:0+1:0', '2:0', '2:1', '0:0']);
  assert.deepStrictEqual(s.bars[1].pickSteps.filter((x) => x !== '·'), ['g', 'E', 'E', 'C']);
  assert.deepStrictEqual(s.bars[2].pickSteps, ['g', '·', 'C', '·', 'E', '·', 'A', '·'], 'no tune: One string a beat');
  const ag = parse('--START MUSIC--\n{melody: G | C2 E/2 C/2 | E2 D}\nA[C]mazing [C]grace\n--END MUSIC--\n');
  const a = buildSchedule(ag, { library: uke, pick: 'melody', beatsPerBar: 3 });
  assert.deepStrictEqual(a.bars[0].pickupNotes, [[{ string: 0, fret: 0 }], []]);
  const first = a.events.filter((e) => e.picked)[0];
  assert.ok(Math.abs(first.time - (a.countInDuration - 0.6)) < 1e-6, 'the pickup comes a beat before bar 1');
  const html = pickSheetHtml({ title: 'AG', patternId: 'melody', beats: 3, ir: ag, schedule: buildSchedule(ag, { library: uke, pick: 'melody', beatsPerBar: 3, countIn: false }), chordDef: (n) => lc.getChordDefinition(uke, n) });
  assert.ok(/<div class="ch"><\/div><pre>[^<]*<\/pre><div class="w">A<\/div>/.test(html), 'the pickup bar, with "A" under it');
  assert.ok(/A picked solo/.test(html) && !/<table class="count">/.test(html));
});

test('the pick sheet: a long line of bars starts a new row, with the string names again', () => {
  const ir = parse('--START MUSIC--\n[C]one [G7]two [C]three [G7]four [C]five [G7]six [C]seven [G7]eight [C]nine [G7]ten\n--END MUSIC--\n');
  const html = pickSheetHtml({ title: 'Long', patternId: 'up8', ir, schedule: buildSchedule(ir, { library: uke, countIn: false, pick: 'up8' }), chordDef: (n) => lc.getChordDefinition(uke, n) });
  assert.ok((html.match(/<div class="sys">/g) || []).length >= 2);
});

test('Ode to Joy and Amazing Grace carry their tunes', () => {
  const melody = require('../src/melody');
  const root = path.join(ROOT, 'public domain songs', 'Public Domain Songs');
  for (const [title, lines] of [['Ode to Joy', 8], ['Amazing Grace', 10]]) {
    const song = sl.listSongs(root).find((x) => x.title === title);
    const r = sl.readSong(song.folder);
    const tunes = melody.songMelody(parse(r.content), { beats: Number(r.settings.song.beats_per_bar) });
    assert.strictEqual(tunes.size, lines, title);
    assert.deepStrictEqual([...tunes.values()].flatMap((t) => t.warnings), [], title);
  }
});

test('{pick} lines: by name, by string, by finger, named, back to strumming', () => {
  assert.deepStrictEqual(picking.resolvePick('Up and back'), { id: 'upback', label: 'Up and back' });
  assert.strictEqual(picking.resolvePick('travis').id, 'travis');
  assert.deepStrictEqual(picking.resolvePick('g+A C E C').custom, ['s0+s3', 's1', 's2', 's1']);
  assert.strictEqual(picking.resolvePick('p i m a').kind, 'fingers');
  assert.ok(picking.resolvePick('strum').off);
  assert.ok(/isn't a string/.test(picking.resolvePick('x y').error));
  assert.deepStrictEqual(picking.resolvePick('E A D G B e', 'guitar').custom, ['s0', 's1', 's2', 's3', 's4', 's5']);
  assert.strictEqual(picking.pickTokens(picking.resolvePick('g C E A E C'), 4).length, 8);
  const ir = parse('--START MUSIC--\n[C]Strummed\n{pick: up and back}\n[C]Picked\n{pick V: g+A C E C}\n[F]Mine\n{pick: strum}\n[G7]Strum\n{pick V}\n[C]Again\n{pick: zz}\n--END MUSIC--\n');
  assert.ok(ir.some((n) => n.type === 'pick' && n.pickName === 'V' && n.content === 'g+A C E C'));
  const s = buildSchedule(ir, { library: uke, countIn: false });
  assert.deepStrictEqual(s.bars.map((b) => b.pickLabel || 'strum'), ['strum', 'Up and back', 'g+A C E C', 'strum', 'g+A C E C']);
  assert.deepStrictEqual(s.bars[2].pickSteps.slice(0, 4), ['g+A', 'C', 'E', 'C']);
  assert.ok(s.warnings.some((w) => /Line 11: \{pick\}: "zz"/.test(w)));
  // the song's own pattern is where it starts
  assert.strictEqual(buildSchedule(ir, { library: uke, countIn: false, pick: 'up8' }).bars[0].pickLabel, 'Up, twice a bar');
  // the sheet marks the changes
  const html = pickSheetHtml({ title: 'H', patternId: 'up8', ir, schedule: s, chordDef: (n) => lc.getChordDefinition(uke, n) });
  assert.ok(/Picked from here: <b>Up and back<\/b>/.test(html) && /Strummed from here/.test(html) && /changes pattern as it goes/.test(html));
});

test('Write out line: one line becomes tab in place; its tune moves to the next line sung to it', () => {
  const { writePickedSong } = require('../src/pick-song');
  const text = '--START MUSIC--\n{pick: up and back}\n[[Verse 1]]\n{melody: E E F G | G F E D}\n[C]Joyful [G7]joyful\n[F]other [C]line\n\n[[Verse 2]]\n[C]All Thy [G7]works\n--END MUSIC--\n';
  const ir = parse(text);
  const out = writePickedSong(text, ir, buildSchedule(ir, { library: uke, countIn: false }), { only: new Set([5]) });
  assert.strictEqual(out.picked, 1);
  const lines = out.text.split('\n');
  assert.strictEqual(lines[3], '```tab 4/4');
  assert.ok(out.text.includes('{pick: up and back}') && out.text.includes('[F]other [C]line') && out.text.includes('[C]All Thy [G7]works'));
  assert.strictEqual(lines[lines.indexOf('[C]All Thy [G7]works') - 1], '{melody: E E F G | G F E D}', 'the tune moved to verse 2');
  assert.strictEqual(out.text.match(/\{melody/g).length, 1);
  // it plays the same as before
  const again = parse(out.text);
  const a = buildSchedule(ir, { library: uke, countIn: false }).events.filter((e) => e.picked && e.barIndex < 2).map((e) => e.time.toFixed(3));
  const b = buildSchedule(again, { library: uke, countIn: false }).events.filter((e) => e.tabNote).map((e) => e.time.toFixed(3));
  assert.deepStrictEqual(b, a);
});

test('ChordPro: {pick} and {melody} go out as x_ukemusic directives and come back', () => {
  const cp = require('../src/chordpro');
  const src = '--START MUSIC--\n{pick: up and back}\n{melody: E E F G | G F E D}\n[C]Joyful [G7]joyful\n{pick V: g+A C E C}\n{melody abc: c2 B2}\n[F]Melt [C]clouds\n{pick V}\n[G7]Drive\n--END MUSIC--\n';
  const out = cp.ukemusicToChordPro(parse(src), { title: 'T' });
  assert.ok(out.includes('{x_ukemusic_pick: up and back}') && out.includes('{x_ukemusic_melody: E E F G | G F E D}') && out.includes('{x_ukemusic_pick: V: g+A C E C}') && out.includes('{x_ukemusic_melody_abc: c2 B2}') && out.includes('{x_ukemusic_pick: V:}'));
  assert.ok(!/up and back\[|E E F G\[/.test(out), 'not in the words');
  assert.ok(out.includes('\n[C]Joyful [G7]joyful\n'));
  assert.strictEqual(cp.chordProToUkemusic(out).text, src);
});

test('ChordPro: a # note explains ukemusic\'s own directives; tab time kept; exact round trip', () => {
  const cp = require('../src/chordpro');
  const src = '--START MUSIC--\n{pick: up and back}\n{melody: E E F G | G F E D}\n[C]Joyful [G7]joyful\n\n```tab 4/4\n  C\nA|--3--|\nE|-0---|\nC|0----|\nG|-----|\n```\n--END MUSIC--\n';
  const out = cp.ukemusicToChordPro(parse(src), { title: 'T' });
  const note = out.split('\n').filter((l) => l.startsWith('# ukemusic:'));
  assert.ok(note.length >= 6 && note.some((l) => /x_ukemusic_pick/.test(l)) && note.some((l) => /x_ukemusic_melody/.test(l)) && note.some((l) => /x_ukemusic_tab_time/.test(l)));
  assert.ok(!note.some((l) => /x_voice/.test(l)), 'only what the song uses');
  assert.ok(out.includes('{x_ukemusic_tab_time: 4/4}\n{start_of_tab}'));
  const back = cp.chordProToUkemusic(out);
  assert.strictEqual(back.text, src);
  assert.ok(!/# ukemusic/.test(back.kept), 'the note isn\'t kept (it\'s written fresh each time)');
  const again = cp.ukemusicToChordPro(parse(back.text), { title: 'T', kept: back.kept });
  assert.strictEqual((again.match(/# ukemusic: this song/g) || []).length, 1);
  assert.ok(!/# ukemusic/.test(cp.ukemusicToChordPro(parse('--START MUSIC--\n[C]Hi\n--END MUSIC--\n'), { title: 'P' })), 'nothing to explain, no note');
});

test('ABC: key signatures, a tune read in, and written out', () => {
  const melody = require('../src/melody');
  assert.deepStrictEqual([...melody.keySignature('G').sig], [['F', 1]]);
  assert.deepStrictEqual([...melody.keySignature('Bb').sig], [['B', -1], ['E', -1]]);
  assert.strictEqual(melody.keySignature('Am').sig.size, 0);
  assert.strictEqual(melody.keySignature('Ddor').sig.size, 0);
  assert.deepStrictEqual([...melody.keySignature('Em').sig], [['F', 1]]);
  const t = melody.parseAbcTune('X:1\nM:3/4\nL:1/8\nK:G\nD2 | G4 BG | B4 A2 | (3ABc d2 | F2 =F2 F2 | A>B c2 |]');
  assert.strictEqual(t.perBar, 3);
  assert.strictEqual(t.pickup, 1);
  assert.deepStrictEqual(t.bars[1].map((n) => [n.midi, n.len]), [[67, 2], [71, 0.5], [67, 0.5]]);
  assert.deepStrictEqual(t.bars[4].map((n) => n.midi), [66, 65, 65], 'F is F# in G; =F lasts to the bar line');
  assert.ok(Math.abs(t.bars[3][0].len - 1 / 3) < 1e-9, 'a triplet');
  assert.deepStrictEqual(t.bars[5].map((n) => n.len), [0.75, 0.25, 1], 'A>B');
  // and written out: key signature, lengths, bar lines, a pickup
  const tune = melody.parseMelody('{melody: G | C2 E/2 C/2 | E2 D}', { beats: 3 });
  const abc = melody.tuneToAbc([tune], { key: 'C', beats: 3, title: 'AG' });
  assert.ok(abc.includes('M:3/4') && abc.includes('K:C') && abc.includes('G2 | c4 e c | e4 d2 |]'));
  assert.ok(melody.tuneToAbc([melody.parseMelody('{melody: F# G}', { beats: 4 })], { key: 'G', beats: 4 }).split('\n').pop().startsWith('F2 G2'), 'no sharp written where the key has it');
  // back to note names, each the nearest to the one before
  assert.strictEqual(melody.notesToMelodyText(t.bars[1].concat(t.bars[2]), { perBar: 3, prev: 62 }).text, 'G2 B/2 G/2 | B2 A');
});

test('ChordPro: the tune as ABC on export (if asked), and ABC tunes matched to lines on import', () => {
  const cp = require('../src/chordpro');
  const src = '--START MUSIC--\n[[Verse 1]]\n{melody: E E F G | G F E D | C C D E | E. D/2 D2}\n[C]Joyful, joyful, [G7]we adore Thee, [C]God of glory, [G7]Lord of love;\n\n[[Verse 2]]\n[C]All Thy works with [G7]joy surround Thee, [C]earth and heaven re[G7]flect Thy rays,\n--END MUSIC--\n';
  const plain = cp.ukemusicToChordPro(parse(src), { title: 'Ode', key: 'C', time: '4/4' });
  assert.ok(!/start_of_abc/.test(plain), 'off unless asked');
  const out = cp.ukemusicToChordPro(parse(src), { title: 'Ode', key: 'C', time: '4/4', abc: true });
  assert.strictEqual(out.split('\n').filter((l) => l === '{start_of_abc}').length, 1, 'verse 2 shares verse 1\'s tune: one block');
  assert.ok(out.split('\n').some((l) => l.startsWith('# ukemusic:') && /start_of_abc/.test(l)), 'the note explains the ABC blocks');
  assert.ok(out.includes('{start_of_verse: Verse 1}\n{start_of_abc}\nX:1\nT:Verse 1') && out.includes('E2 E2 F2 G2 | G2 F2 E2 D2 | C2 C2 D2 E2 | E3 D D4 |]'));
  assert.strictEqual(cp.chordProToUkemusic(out).text, src, 'ukemusic reads its own lines back, not the ABC');
  // in another key, the tune moves with the chords
  assert.ok(cp.ukemusicToChordPro(parse(src), { title: 'Ode', key: 'D', time: '4/4', tuneShift: 2 }).includes('{x_ukemusic_melody: F# F# G A | A G F# E | D D E F# | F#. E/2 E2}'));
  // someone else's file with an ABC tune
  const file = '{title: Amazing Grace}\n{key: G}\n{time: 3/4}\n{start_of_verse}\n{start_of_abc}\nX:1\nM:3/4\nL:1/8\nK:G\nD2 | G4 BG | B4 A2 | G4 E2 | D4 D2 | G4 BG | B4 A2 | d6- | d4 D2 | G4 BG | B4 A2 | G4 E2 | D4 D2 | G4 BG | B4 A2 | G6- | G4 |]\n{end_of_abc}\nA[Gx2]mazing grace, how [C]sweet the [Gx3]sound that saved a wretch like [Dx2]me.\nI [G]once was [G7]lost but [C]now am [G]found, was [Em]blind but [D]now I [Gx2]see.\n{end_of_verse}\n';
  const r = cp.chordProToUkemusic(file);
  assert.strictEqual(r.report.tunes.matched, 1);
  assert.ok(r.text.includes('{melody: D | G2 B/2 G/2 | B2 A | G2 E | D2 D | G2 B/2 G/2 | B2 A | D3 | D2 D,}\nA[Gx2]mazing'));
  assert.ok(r.text.includes('{melody: G2 B/2 G/2 | B2 A | G2 E | D2 D | G2 B/2 G/2 | B2 A | G3 | G2}\nI [G]once'));
  const tunes = require('../src/melody').songMelody(parse(r.text), { beats: 3 });
  assert.deepStrictEqual([...tunes.values()].flatMap((x) => x.warnings), []);
  // with a capo, the tune is moved down to the shapes the file's chords are
  assert.ok(cp.chordProToUkemusic(file.replace('{time: 3/4}', '{time: 3/4}\n{capo: 2}')).text.includes('{melody: C | F2 A/2 F/2'));
  // bars that don't match: kept on the ChordPro tab, and said
  const bad = cp.chordProToUkemusic('{title: X}\n{start_of_abc}\nX:1\nM:4/4\nL:1/8\nK:C\nC2D2E2F2|G8|]\n{end_of_abc}\n[C]One [G]two [C]three\n');
  assert.strictEqual(bad.report.tunes.kept, 1);
  assert.ok(!/melody/.test(bad.text) && bad.kept.includes('{start_of_abc}') && /didn't match/.test(bad.report.tunes.notes[0]));
});

test('the apps: the Pick tab with its help, the pick sheet in Export, the web player', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const t of ['data-config-path="export.chordpro_abc"', 'tuneSound: semitones', 'id="pickChangeMenu"', 'id="pickWriteLineButton"', 'only: new Set([lineNo])', 'id="pickStopButton"', 'id="pickTune"', 'tune: config?.playback?.tune', 'id="detailsFirstNote"', 'id="pickFirstNoteButton"', 'firstNote: window.ukemusic.picking.noteMidi(', 'id="ribbonTabPick"', 'data-ribbon-panel="pick"', 'id="pickPattern"', 'id="pickPlayButton"', 'id="pickKaraokeButton"', 'id="pickSheetButton"', 'id="pickHelpButton"', 'id="pickHelpDialog"', 'value="pick_sheet"', "formats.includes('pick_sheet')", "'playback.pick'", 'pickSheet.pickSheetHtml(', 'bar.pickSteps']) assert.ok(html.includes(t), t);
  assert.ok(!html.includes('Pick instead of strumming'), 'picking is in the Pick tab, not the strum menu');
  const app = fs.readFileSync(path.join(ROOT, 'web', 'app.html'), 'utf8');
  for (const t of ['firstNote: U.picking.noteMidi(', 'id="pickSong"', 'id="pickSheetBtn"', 'id="pickHelpDialog"', 'U.pickSheet.pickSheetHtml(', 'pick: p.pick', 'bar.pickSteps']) assert.ok(app.includes(t), t);
  assert.ok(fs.readFileSync(path.join(ROOT, 'web', 'k_js.js'), 'utf8').includes('bar.pickSteps'));
  const preload = fs.readFileSync(path.join(ROOT, 'src', 'preload.js'), 'utf8');
  assert.ok(preload.includes("picking: require('./picking')") && preload.includes("pickSheet: require('./pick-sheet')"));
});

test('write it out as a song: plain tab that plays just like the picking', () => {
  const { writePickedSong } = require('../src/pick-song');
  const text = '--START MUSIC--\n{D-DU-UDU}\n[[Verse]]\n{melody: E E F G | G F E D}\n[C]Joyful, joyful, [G7]we adore Thee\n[N.C.]Stop here\n--END MUSIC--\n';
  const ir = parse(text);
  const schedule = buildSchedule(ir, { library: uke, countIn: false, pick: 'up8' });
  const out = writePickedSong(text, ir, schedule, { beats: 4 });
  assert.strictEqual(out.picked, 1);
  assert.strictEqual(out.kept, 1, 'the N.C. line is kept as it was');
  assert.ok(out.text.includes('```tab 4/4') && out.text.includes('[[Verse]]') && out.text.includes('[N.C.]Stop here'));
  assert.ok(!/\{melody|\{D-DU/.test(out.text), 'no tune or strum lines');
  assert.ok(/\n  C {2,}G7\n/.test(out.text), 'chord names over the bars');
  assert.ok(/\n  Joyful, joyful, +we adore Thee\n/.test(out.text), 'words under the bars');
  const again = parse(out.text);
  assert.ok(!again.some((n) => n.warnings && n.warnings.length));
  const tab = again.find((n) => n.type === 'tab');
  assert.strictEqual(tab.barBeats, 4);
  const replay = buildSchedule(again, { library: uke, countIn: false });
  const sig = (events, pick) => events.filter(pick).map((e) => `${e.time.toFixed(3)}:${e.notes.filter(Number.isFinite).sort().join('+')}`);
  assert.deepStrictEqual(sig(replay.events, (e) => e.tabNote), sig(schedule.events, (e) => e.picked));
  const bare = writePickedSong(text, ir, schedule, { beats: 4, words: false, chordNames: false });
  assert.ok(!/Joyful|  C  /.test(bare.text.replace('[N.C.]Stop here', '')));
});

test('write it out: a pickup goes at the end of the bar before, or in a bar of its own', () => {
  const { writePickedSong } = require('../src/pick-song');
  const text = '--START MUSIC--\n{melody: G | C2 E/2 C/2 | E2 D}\nA[C]mazing [C]grace\n{melody: G, | C3 | C3}\nI [C]once [C]lost\n--END MUSIC--\n';
  const ir = parse(text);
  const schedule = buildSchedule(ir, { library: uke, countIn: false, pick: 'melody', beatsPerBar: 3 });
  const out = writePickedSong(text, ir, schedule, { beats: 3 });
  const blocks = out.text.split('```tab 3/4').slice(1);
  assert.ok(/G\|--------0---\|/.test(blocks[0]), 'a lead-in bar with the pickup at its end');
  assert.ok(/\n {10}A +mazing/.test(blocks[0]));
  assert.ok(/G\|[^\n]*0---\|\n[^\n]*I\n/.test(blocks[0]), 'the next line\'s pickup at the end of this line, "I" under it');
  const replay = buildSchedule(parse(out.text), { library: uke, countIn: false, beatsPerBar: 3 });
  assert.strictEqual(replay.events.filter((e) => e.tabNote).length, schedule.events.filter((e) => e.picked).length);
});

test('```tab 4/4: timed by its bars, and recognised everywhere ```tab is', () => {
  const tab = require('../src/tab');
  const m = tab.parseTab('A|--------|--------|\nE|----0---|--------|\nC|0-------|--------|\nG|--------|0-------|');
  assert.deepStrictEqual(tab.barTiming(m, 4).steps.map((x) => x.beat), [0, 2, 4]);
  assert.strictEqual(tab.tabBarBeats('```tab 3/4'), 3);
  assert.strictEqual(tab.tabBarBeats('```tab'), 0);
  const ir = parse('--START MUSIC--\n```tab 3/4\nA|------|------|\nE|------|------|\nC|0-----|------|\nG|------|0-----|\n```\n--END MUSIC--\n');
  assert.strictEqual(ir.find((n) => n.type === 'tab').barBeats, 3);
  const s = buildSchedule(ir, { library: uke, countIn: false, beatsPerBar: 3, tempo: 60 });
  assert.deepStrictEqual(s.events.filter((e) => e.tabNote).map((e) => e.time), [0, 3]);
  assert.strictEqual(learn.tabStepText('```tab 4/4\nA|--3--|\nE|-----|\nC|-----|\nG|-----|\n```', 'open', uke).includes('A|--0--|'), true);
});

test('the tune as notation: note values, spelling, a strip (each tune once) and a staff over every line', () => {
  const nt = require('../src/notation-svg');
  const renderHtml = require('../src/renderer-html');
  // lengths in quarter notes -> note values (tied where one won't do)
  assert.deepStrictEqual(nt.values(1).map((v) => [v.head, v.flags, v.dots]), [['quarter', 0, 0]]);
  assert.deepStrictEqual(nt.values(1.5).map((v) => [v.head, v.dots]), [['quarter', 1]]);
  assert.deepStrictEqual(nt.values(2.5).map((v) => v.q), [2, 0.5]);
  assert.deepStrictEqual(nt.values(1 / 3).map((v) => [v.flags, v.triplet]), [[1, true]]);
  // E4 is the bottom line; F# or Gb as the key spells it
  assert.strictEqual(nt.spell(64, false).pos, 0);
  assert.deepStrictEqual([nt.spell(66, false).letter, nt.spell(66, true).letter], ['F', 'G']);
  assert.strictEqual(nt.guessKey([61, 62, 66, 69]), 'D');
  // a note across the bar line is split and tied
  const bars = nt.barsOf({ notes: [{ at: 0, len: 3, midi: 60 }, { at: 3, len: 2, midi: 62 }] }, 4, false, 0);
  assert.strictEqual(bars.length, 2);
  assert.strictEqual(bars[0].items[1].tie, true);
  assert.strictEqual(bars[1].items[0].count, null);   // the tied part isn't a new note to light up
  const song = '--START MUSIC--\n[[Verse]]\n{melody: E E F G | G F E D}\n[C]Joyful, joyful, [G7]we adore thee\n[C]Hearts unfold like [G7]flowers\n--END MUSIC--\n';
  const ir = parse(song);
  // the strip (the usual): the tune once, its chords above, the borrowing line named for playback
  const strip = renderHtml(ir, { beatsPerBar: 4, tune: { key: 'C' } });
  assert.strictEqual((strip.match(/class="tune-row"/g) || []).length, 1);
  assert.ok(/data-line="4" data-also="5"/.test(strip));
  assert.ok(strip.includes('class="tune-chord">C<') && strip.includes('class="tune-chord">G7<'));
  assert.strictEqual((strip.match(/data-at="/g) || []).length, 8);
  // over every line: a staff in each line that's sung to it, no strip
  const lines = renderHtml(ir, { beatsPerBar: 4, tune: { notation: 'lines', key: 'C' } });
  assert.ok(!lines.includes('tune-strip'));
  assert.strictEqual((lines.match(/class="tune-staff"/g) || []).length, 2);
  assert.ok(/<div class="line-group" data-line="5"><div class="tune-staff"/.test(lines));
  // hidden, and songs with no tune: nothing
  assert.ok(!renderHtml(ir, { tune: { notation: 'off' } }).includes('tune-'));
  assert.ok(!renderHtml(parse(SONG), {}).includes('tune-staff'));
  // moved up a tone into D: two sharps and the notes a step higher (F# on the bottom space)
  const d = renderHtml(ir, { beatsPerBar: 4, tune: { shift: 2, key: 'D' } });
  assert.strictEqual((d.match(/<path d="M[^"]*" transform="translate\([^)]*\) scale\(7\)"\/>/g) || []).length > 0, true);
  const svgKey = nt.systemSvg(nt.barsOf({ notes: [{ at: 0, len: 1, midi: 66 }] }, 4, false, 0), { ks: require('../src/melody').keySignature('D'), beats: 4 });
  assert.strictEqual((svgKey.match(new RegExp(require('../src/music-glyphs').accidentalSharp.d.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 2);   // the key's two sharps, none on the F#
});

test('the tune as notation: a key only guessed from the chords gives way to the tune\'s own', () => {
  const renderHtml = require('../src/renderer-html');
  const ir = parse('--START MUSIC--\n{melody: E E F G | G F E D}\n[C]Joyful, joyful, [G7]we adore thee\n--END MUSIC--\n');
  const naturals = (html) => (html.match(new RegExp(require('../src/music-glyphs').accidentalNatural.d.slice(0, 16).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  assert.strictEqual(naturals(renderHtml(ir, { tune: { key: 'G', keyGuessed: true } })), 0);   // C major: no F naturals
  assert.ok(naturals(renderHtml(ir, { tune: { key: 'G' } })) > 0);                             // a key you chose stays
});
