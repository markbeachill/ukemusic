// 4.40: Learn: the circle of fifths, What comes next?, and trouble spots (kept in the song's learn folder).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const parse = require('../src/parser');
const learn = require('../src/learn');
const keys = require('../src/keys');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const SONG = '--START MUSIC--\n[[Verse]]\n[C]One two [F]three four\n[C]five six [G7]seven [C]eight\n\n[[Verse]]\n[C]One two [F]three four\n[C]five six [G7]seven [C]eight\n--END MUSIC--\n';
const ir = parse(SONG);
const C = keys.parseKey('C');

test('the circle: majors outside a fifth apart, minors inside by their relative major', () => {
  assert.deepStrictEqual(learn.circlePlace('G7'), { ring: 'outer', pos: 1 });
  assert.deepStrictEqual(learn.circlePlace('Am'), { ring: 'inner', pos: 0 });
  assert.deepStrictEqual(learn.circlePlace('Em'), { ring: 'inner', pos: 1 });
  assert.deepStrictEqual(learn.circlePlace('F'), { ring: 'outer', pos: 11 });
  assert.strictEqual(learn.circlePlace('Bdim'), null);
  assert.deepStrictEqual(learn.keyFamily(C), [11, 0, 1]);
  assert.deepStrictEqual(learn.keyFamily(keys.parseKey('Am')), [11, 0, 1], 'A minor: the family of C');
});

test('the circle notes: in the family, and the moves with numbers', () => {
  const notes = learn.circleNotes(ir, C);
  assert.ok(/^Home is C, ringed at the top/.test(notes[0]), notes[0]);
  assert.ok(/All 3 of its chords sit in the key's family/.test(notes[1]), notes[1]);
  assert.ok(notes.some((n) => /^G7 → C \(V7 → I\), 2 times: .*home/.test(n)), notes.join('\n'));
  assert.ok(!notes.some((n) => /^C → F.*strongest/.test(n)), 'the strong pull is only into home');
  const out = learn.circleNotes(parse('--START MUSIC--\n[C]a [E7]b [Am]c\n--END MUSIC--\n'), C);
  assert.ok(/From outside it:$/.test(out[1]) && /^E7: the five of Am \(III7\): it leads to Am\.$/.test(out[2]), out.join(' | '));
  const svg = learn.circleSvg(ir, C, { size: 300 });
  assert.ok(svg.startsWith('<svg') && svg.includes('viewBox="0 0 300 300"'));
});

test('What comes next? each change once, with the words either side', () => {
  const qs = learn.quizQuestions(ir);
  assert.deepStrictEqual(qs.map((q) => `${q.from}>${q.to}`), ['C>F', 'F>C', 'C>G7', 'G7>C'], 'the second verse is not asked again');
  assert.strictEqual(qs[0].line, 3);
  assert.strictEqual(qs[0].before, 'One two ');
  assert.strictEqual(qs[0].after, 'three four');
});

test('the choices: the answer and three more, no two on one root, not the chord before', () => {
  const q = learn.quizQuestions(ir)[0];
  const opts = learn.quizOptions(q, ['C', 'F', 'G7'], C, 1);
  assert.strictEqual(opts.length, 4);
  assert.ok(opts.includes('F') && !opts.includes('C'));
  const roots = opts.map((o) => require('../src/chord-names').parseChordName(o).rootIndex);
  assert.strictEqual(new Set(roots).size, 4);
  assert.deepStrictEqual(learn.quizOptions(q, ['C', 'F', 'G7'], C, 1), opts, 'the same each time');
  const g = learn.quizOptions({ from: 'C', to: 'G' }, ['C', 'G', 'G7', 'F'], C, 2);
  assert.ok(g.includes('G') && !g.includes('G7'), g.join(' '));
});

test('trouble spots: counted again, found again after an edit, ticked off', () => {
  let store = { spots: [] };
  store = learn.addTrouble(store, { line: 3, chord: 'F', words: '[C]One two [F]three four', from: 'quiz' });
  store = learn.addTrouble(store, { line: 3, chord: 'F', words: '[C]One two [F]three four', from: 'memory' });
  assert.deepStrictEqual(store.spots.map((s) => [s.words, s.count, s.from]), [['One two three four', 2, 'quiz,memory']]);
  store = learn.addTrouble(store, { line: 4, chord: 'G7', words: '[C]five six [G7]seven [C]eight', from: 'tap' });
  const moved = learn.placeTrouble(store, `\n\n${SONG}`);
  assert.deepStrictEqual(moved.map((s) => s.line), [5, 6], 'two lines added above: found again');
  const gone = learn.placeTrouble(store, SONG.replaceAll('five six', 'nine ten'));
  assert.ok(gone[1].gone && !gone[0].gone);
  assert.strictEqual(learn.removeTrouble(store, store.spots[0]).spots.length, 1);
});

test('the learn sheet: the circle and the trouble spots', () => {
  const html = learn.learnSheetHtml({ title: 'T', circle: learn.circleSvg(ir, C), circleNotes: ['a < b'], trouble: [{ line: 3, chord: 'F', words: 'One two', count: 2 }, { line: 9, words: 'x', gone: true }] });
  assert.ok(html.includes('On the circle of fifths') && html.includes('a &lt; b'));
  assert.ok(html.includes('Line 3, <b>F</b>: “One two” (×2)') && !html.includes('Line 9'));
});

test('the learn folder: trouble-spots.json read and written', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke440-'));
  assert.strictEqual(songs.readLearn(tmp, 'trouble-spots.json'), '');
  songs.writeLearn(tmp, 'trouble-spots.json', '{"spots":[]}');
  assert.strictEqual(songs.readLearn(tmp, 'trouble-spots.json'), '{"spots":[]}');
  fs.rmSync(tmp, { recursive: true, force: true });
  const preload = fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8');
  assert.ok(preload.includes('learnRead') && preload.includes('learnWrite'));
});

test('the app: the buttons, the dialogs, and a line that loops on request', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const id of ['learnCircleButton', 'learnQuizButton', 'learnTroubleButton', 'learnCircleDialog', 'learnQuizDialog', 'learnTroubleDialog', 'karaokeTrouble']) assert.ok(html.includes(`id="${id}"`), id);
  assert.ok(html.includes("options.loop || document.getElementById('loopSection').checked"));
});

test("4.40.1: Learn goes by the app's key, moved with the chords (Baby Love in G was called C major)", () => {
  const pr = require('../src/progressions');
  const bl = parse('--START MUSIC--\n[[Intro]]\n[Am] [F] [D]\n[[Verse]]\n[G]Baby love, my [G7]baby love, I [Em]need you, oh [G7]how I [Am]need you,\nbut all you do is [G]treat me bad, [C]break my heart and [G]leave me sad, [C]\n--END MUSIC--\n');
  const r = pr.analyse(bl, { key: { ...keys.parseKey('G'), guessed: false } });
  assert.strictEqual(r.key.name, 'G', 'the key given is the key used');
  assert.strictEqual(r.chords.find((c) => c.chord === 'C').numeral, 'IV');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.strictEqual((html.match(/analyse\([^)]*\{ key: learnKey\(/g) || []).length, 4, 'the sheet, numbers in the preview, karaoke and Chord patterns');
});

test('4.40.1: the circle turns so the key is at the top, ringed, with its numbers', () => {
  const g = learn.circleSvg(parse('--START MUSIC--\n[G]a [C]b [D7]c [G]d\n--END MUSIC--\n'), keys.parseKey('G'), { size: 400 });
  assert.ok(/<circle cx="200\.0" cy="[\d.]+" r="[\d.]+" fill="none" stroke="#0e6b64"/.test(g), 'home ringed, top centre');
  assert.ok(/>Key of<\/text>.*>G<\/text>/.test(g));
  for (const n of ['>I<', '>IV<', '>V<', '>vi<', '>ii<', '>iii<']) assert.ok(g.includes(n), n);
  const am = learn.circleSvg(parse('--START MUSIC--\n[Am]a [Dm]b\n--END MUSIC--\n'), keys.parseKey('Am'), { size: 400 });
  assert.ok(/>Am<\/text><text[^>]*>home at the top/.test(am) && am.includes('>i<'));
});

test('4.40.2: the chord map has the words as cues, the named patterns where they are, and parts that are bits of others', () => {
  const pr = require('../src/progressions');
  const lc = require('../src/chord-library');
  const { buildSchedule } = require('../src/playback-schedule');
  const text = '--START MUSIC--\n[[Verse 1]]\n[G]Sun is out [C]today, [G]all the [C]way\n[Em]time to [Am]go a[D]way\n\n[[Refrain]]\n[G]Sun is out [C]again\n\n[[Verse 2]]\n[G]Rain is in [C]the air, [G]every[C]where\n[Em]time to [Am]stay right [D]there\n\n[[Verse 3]]\n[G]Snow is on [C]the hill, [G]cold and [C]still\n[Em]time to [Am]sit right [D]still\n[G]Snow is on [C]the hill, [G]cold and [C]still\n--END MUSIC--\n';
  const song = parse(text);
  const an = pr.analyse(song, { key: { ...keys.parseKey('G'), guessed: false } });
  const map = learn.chordMap(song, buildSchedule(song, { library: lc.getBuiltInLibrary('soprano'), tempo: 100, beatsPerBar: 4 }), an);
  const verse = map.parts.find((p) => p.times === 2);
  assert.strictEqual(verse.words[0], 'Sun is out today, all the…');
  const crossed = JSON.parse(JSON.stringify(map));
  assert.strictEqual(crossed.parts.find((p) => p.times === 2).words[0], 'Sun is out today, all the…', 'the words survive the trip to the page');
  assert.strictEqual(verse.wordsEach, 'new');
  const circle = verse.marks.find((m) => m.name === 'Circle');
  assert.ok(circle && circle.round && circle.chords.join(' ') === 'Em Am D G' && circle.start.row === 1, JSON.stringify(verse.marks));
  assert.deepStrictEqual(map.parts.find((p) => /Refrain/.test(p.name)).like, { letter: verse.letter, how: 'start', text: `the start of ${verse.letter}` });
  assert.strictEqual(map.parts.find((p) => /Verse 3/.test(p.name)).like.how, 'again', 'a last verse that repeats its opening');
  const html = learn.learnSheetHtml({ title: 'T', map });
  assert.ok(html.includes('class="w">Sun is out today, all the…') && html.includes('new words each time'));
  assert.ok(html.includes('<b>Circle</b>: Em Am D G (back to the start)') && html.includes('= the start of'));
  assert.ok(html.includes('(as before).') || (html.match(/<b>Circle<\/b>/g) || []).length === 1, 'a pattern told once');
});

test('4.40.2: Chord patterns shows the same marks as the learn sheet', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('window.ukemusic.learn.chordMap(ir, schedule, r)') && html.includes("'pt-like'") && html.includes('Not as much to learn as it looks'));
});

test('4.40.3: the sheet starts with the chords and how they feel, home first, and the route with its words', () => {
  const html = learn.learnSheetHtml({ title: 'T', map: { key: keys.parseKey('G'), route: [{ letter: 'A', name: 'Verse', times: 2, words: 'Sun is out…' }], parts: [] },
    shapes: [{ name: 'Em', numeral: 'vi', role: 'the sad home', svg: '' }, { name: 'G', numeral: 'I', role: 'home', svg: '' }, { name: 'D7', numeral: 'V7', role: 'tension', svg: '' }],
    summary: ['The verse comes twice: learn that first.'] });
  assert.ok(html.indexOf('The chords in G, and how they feel') < html.indexOf('<h2>The song'));
  assert.ok(html.indexOf('>G<') < html.indexOf('>D7<') && html.indexOf('>D7<') < html.indexOf('>Em<'), 'home, five, then the sad six');
  assert.ok(html.includes('<div class="ro">the sad home</div>') && html.includes('<small>Sun is out…</small>') && html.includes('<li>The verse comes twice: learn that first.</li>'));
});

test('4.40.4: Export can make learn sheets (and so can Export every song)', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.ok(html.includes('value="learn_sheet"') && html.includes("formats.includes('learn_sheet')") && html.includes('async function writeLearnSheet(transpose)'));
});

test('4.40.5: the Exports tab lists the learn sheets (not the trouble spots), old if the song changed since', () => {
  const em = require('../src/exports-map');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke4405-'));
  fs.mkdirSync(path.join(tmp, 'learn'));
  for (const f of ['Song (learn).pdf', 'Song (learn in C).html', 'trouble-spots.json']) fs.writeFileSync(path.join(tmp, 'learn', f), 'x');
  const past = new Date(Date.now() - 60000);
  fs.utimesSync(path.join(tmp, 'learn', 'Song (learn).pdf'), past, past);
  fs.writeFileSync(path.join(tmp, 'Song-song.txt'), 'x');
  const list = em.listExports(tmp);
  const g = list.groups.find((x) => x.name === 'Learn sheets');
  assert.deepStrictEqual(g.files.map((f) => f.name), ['Song (learn in C).html', 'Song (learn).pdf']);
  assert.ok(g.files.every((f) => f.learn) && g.files[1].reason === 'song' && !g.files[0].reason, JSON.stringify(g.files.map((f) => f.reason)));
  assert.ok(em.namedFor('Song (learn).pdf', 'Song'));
  fs.rmSync(tmp, { recursive: true, force: true });
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8').includes('files.filter((x) => x.learn)'));
});
