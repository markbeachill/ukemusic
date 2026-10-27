// 4.41: the learn-sheet audit fixes: the key guess, major/minor-aware numbers, feelings and
// circle notes, the chord map agreeing with the route, patterns, wording and layout.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const learn = require('../src/learn');
const pr = require('../src/progressions');
const keys = require('../src/keys');
const lc = require('../src/chord-library');
const { buildSchedule } = require('../src/playback-schedule');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const PD = path.join(ROOT, 'public domain songs', 'Public Domain Songs');
const pd = (t) => parse(fs.readFileSync(path.join(PD, t, `${t}-song.txt`), 'utf8'));
const lib = lc.getBuiltInLibrary('soprano');
const mapOf = (ir, key) => { const a = pr.analyse(ir, { key: { ...keys.parseKey(key), guessed: false } }); return { a, map: learn.chordMap(ir, buildSchedule(ir, { library: lib, tempo: 100, beatsPerBar: 4 }), a) }; };
// a riff song: its parts start on Dm, it ends on G, its chords fit C major best
const RIFF = '--START MUSIC--\n[[Intro]]\n| Dm F G | Dm F G |\n\n[[Verse]]\n[Dm]one [F]two [G]three [Dm]four [F]five [G]six\n[E7]seven [A]nine\n[Dm]one [F]two [G]three\n\n[[Chorus]]\n[G7]la la [D7]la [Dm]la [F]la [G]la\n\n[[Verse]]\n[Dm]one [F]two [G]three [Dm]four [F]five [G]six\n[E7]seven [A]nine\n[Dm]one [F]two [G]three\n\n[[Outro]]\n| Dm F G | Dm F G |\n--END MUSIC--\n';

test('#13 the key guess: a riff song is at home on the chord its parts start on', () => {
  assert.strictEqual(pr.songKeyGuess(parse(RIFF)).name, 'Dm');
  const chords = parse(RIFF).filter((n) => n.type === 'chord' && !n.noChord).map((n) => n.content);
  assert.strictEqual(keys.detectKey(chords).name, 'C', 'from the chords alone it still looks like C');
  assert.strictEqual(keys.rankKeys(chords, { starts: pr.partStarts(parse(RIFF)) })[0].homeBy, 'parts');
  // the public domain songs keep their keys
  for (const [t, k] of [['Amazing Grace', 'C'], ['Danny Boy', 'C'], ['House of the Rising Sun', 'Am'], ["It's a Long Way to Tipperary", 'C'], ["Nobody's Fault but Mine", 'Am'], ['Scarborough Fair', 'Am'], ['The Wild Rover', 'C']]) assert.strictEqual(pr.songKeyGuess(pd(t)).name, k, t);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.strictEqual((html.match(/progressions\.songKeyGuess\(/g) || []).length, 4, 'the app guesses one way everywhere');
  assert.ok(fs.readFileSync(path.join(ROOT, 'src', 'song-library.js'), 'utf8').includes("songKeyGuess(require('./parser')"), 'and the library list');
  assert.ok(fs.readFileSync(path.join(ROOT, 'web', 'app.html'), 'utf8').includes('U.progressions.songKeyGuess('), 'and the web player');
});

test('#1 the status bar says 6/8, not 6/4', () => {
  assert.ok(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes('timeLabel(Number(config?.song?.beats_per_bar) || 4)]'));
});

test('#10 #14 what a chord does depends on the kind of key', () => {
  const C = keys.parseKey('C');
  const Am = keys.parseKey('Am');
  assert.strictEqual(pr.roleOf('VI', C), 'leads to two (ii)');
  assert.strictEqual(pr.roleOf('III7', C), 'leads to the sad six (vi)');
  assert.strictEqual(pr.roleOf('VI', Am), 'away, warm');
  assert.strictEqual(pr.roleOf('iv', C), 'the sad four, borrowed from the minor key');
  assert.strictEqual(pr.roleOf('IV', Am), 'a brighter four, borrowed (Dorian)');
  assert.strictEqual(pr.roleOf('I7', C), 'home, leaning on to four');
});

test('#2 #3 #17 circle notes go by the numbers: five to one, four to one, the minor key\'s own five', () => {
  const rising = learn.circleNotes(pd('House of the Rising Sun'), keys.parseKey('Am'));
  assert.ok(rising.some((n) => /^F → Am \(VI → i\), 14 times: one step clockwise, in to the minors, and home\.$/.test(n)), 'not "four to one"');
  assert.ok(rising.some((n) => /^Am, C, F, E7 are in the key's family/.test(n)), 'E7 is A minor\'s own five');
  assert.ok(rising.some((n) => /^D: a brighter four \(IV\), borrowed from A major \(the Dorian sound\)\.$/.test(n)));
  const nobody = learn.circleNotes(pd("Nobody's Fault but Mine"), keys.parseKey('Am'));
  assert.ok(nobody.some((n) => /^E7 → Am \(V7 → i\), 10 times: five to one/.test(n)) && nobody.some((n) => /^Am → E7 .*from home out to five/.test(n)));
  const stand = learn.circleNotes(parse('--START MUSIC--\n[C]a [Am]b [F]c [G]d [C]e [Am]b [F]c [G]d [C]e\n--END MUSIC--\n'), keys.parseKey('C'));
  assert.ok(stand.some((n) => /^Am → F \(vi → IV\).*one step anticlockwise, out to the majors\.$/.test(n)), 'no "(down a fifth)" across the rings');
});

test('#9 chords from outside the key: what each one is', () => {
  const danny = learn.circleNotes(pd('Danny Boy'), keys.parseKey('C'));
  assert.ok(danny.includes('Fm: the sad four (iv), borrowed from C minor.'));
  assert.ok(danny.includes('D7: the five of G (II7): it leads to G.'));
  assert.strictEqual(learn.outsideWhy('E7', keys.parseKey('Dm'), ['E7', 'A']), 'the five of A (II7): it leads to A');
  assert.strictEqual(learn.outsideWhy('A', keys.parseKey('C'), ['A', 'G']), 'the five of Dm (VI), here used as a colour on the way somewhere else');
});

test('#4 #7 #18 #19 #21 the chord map agrees with the route', () => {
  const nobody = mapOf(pd("Nobody's Fault but Mine"), 'Am').map.parts[0];
  assert.strictEqual(nobody.name, 'Chorus and Verse');
  assert.strictEqual(nobody.wordsEach, 'some', 'the chorus words come back');
  const rising = mapOf(pd('House of the Rising Sun'), 'Am');
  assert.ok(rising.a.route.every((r) => r.name === 'Verse'), 'the first verse again at the end is not a chorus');
  assert.ok(rising.a.summary.includes('The first verse comes back at the end.'));
  const riff = mapOf(parse(RIFF), 'Dm').map.parts.find((p) => /Intro/.test(p.name));
  assert.strictEqual(riff.name, 'Intro and Outro');
  assert.strictEqual(riff.wordsEach, '', 'an intro with no words doesn\'t make "new words each time"');
  const chorus = '--START MUSIC--\n[[Chorus]]\n[C]Let it go, let it [G]go, let it go\n[F]sing the whole day [C]long\n\n[[Chorus]]\n[C]Let it go, let it [G]go, let it go\n[F]dance the whole night [C]long\n\n[[Chorus]]\n[C]Let it go, let it [G]go, let it go\n[F]sing the whole night [C]long\n--END MUSIC--\n';
  assert.strictEqual(mapOf(parse(chorus), 'C').map.parts[0].wordsEach, 'mostly');
  assert.strictEqual(learn.wordsText('mostly'), ', mostly the same words');
});

test('#12 one chord pattern for the whole song', () => {
  assert.ok(pr.analyse(pd("Nobody's Fault but Mine")).summary.includes("One chord pattern for the whole song: learn it once, then it's the words."));
});

test('#20 a part made of two others', () => {
  const t = '--START MUSIC--\n[[Verse]]\n[C]a [G]b [Am]c [F]d\n[C]e [G]f [F]g [C]h\n\n[[Chorus]]\n[Am]i [G]j [F]k [C]l\n[C]m [G]n [F]o [C]p\n\n[[Verse]]\n[C]a [G]b [Am]c [F]d\n[C]e [G]f [F]g [C]h\n\n[[Chorus]]\n[Am]i [G]j [F]k [C]l\n[C]m [G]n [F]o [C]p\n\n[[Last chorus]]\n[Am]i [G]j [F]k [C]l\n[C]a [G]b [Am]c [F]d\n[C]e [G]f [F]g [C]h\n--END MUSIC--\n';
  const map = mapOf(parse(t), 'C').map;
  const last = map.parts.find((p) => p.times === 1);
  assert.ok(last.like && last.like.how === 'join' && /^the start of [A-Z], then [A-Z]$/.test(last.like.text), JSON.stringify(last.like));
});

test('#5 #8 #11 #15 patterns: in song order, five of five found, no wrap-round noise, a loop once', () => {
  const danny = mapOf(pd('Danny Boy'), 'C').map.parts[0].marks;
  assert.deepStrictEqual(danny.map((m) => m.name), ['Five of five (II7–V7–I)', 'Amen (plagal)', 'Three-chord trick', '50s / doo-wop']);
  for (let i = 1; i < danny.length; i += 1) assert.ok(danny[i].start.row >= danny[i - 1].start.row, 'numbered as they come');
  assert.ok(!danny.some((m) => m.name === 'Home and away'), 'C G7 | C round the end isn\'t a pattern');
  const pop = mapOf(parse('--START MUSIC--\n[[Verse]]\n[C]a [G]b [Am]c [F]d\n[C]a [G]b [Am]c [F]d\n\n[[Verse]]\n[C]a [G]b [Am]c [F]d\n[C]a [G]b [Am]c [F]d\n--END MUSIC--\n'), 'C').map.parts[0].marks;
  assert.deepStrictEqual(pop.map((m) => m.name), ['Four-chord pop'], 'not Sad four-chord as well: the same loop');
});

test('#6 a barre: "across the G C E strings", not "on the across the"', () => {
  const tip = learn.changeTip(learn.fingerMoves(lc.getChordDefinition(lib, 'C'), lc.getChordDefinition(lib, 'D7')), 'GCEA'.split(''));
  assert.ok(tip.includes('put your index finger across the G C E strings') && !/the across/.test(tip), tip);
});

test('#16 #22 the sheet: chords in order for the kind of key, every diagram the same height', () => {
  const html = learn.learnSheetHtml({ title: 'T', map: { key: keys.parseKey('C'), route: [], parts: [] }, shapes: [{ name: 'A', numeral: 'VI', svg: '<svg viewBox="0 0 100 145"></svg>' }, { name: 'Dm', numeral: 'ii', svg: '<svg viewBox="0 0 100 169"></svg>' }, { name: 'C', numeral: 'I', svg: '' }] });
  assert.ok(html.indexOf('>C<') < html.indexOf('>Dm<') && html.indexOf('>Dm<') < html.indexOf('>A<'), 'VI is an outsider in a major key');
  assert.ok(html.includes('viewBox="0 4 100 132"') && html.includes('viewBox="0 4 100 108"') && html.includes('.shape .dg{height:96px'));
});

test('the Time menu has 6/8 (and 2/4): a 6/8 song showed a blank time', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.includes('<option value="6">6/8</option>') && html.includes('<option value="2">2/4</option>'));
});

test('the explanation docs, and the website page made from the short one', () => {
  for (const f of ['learning-a-song.md', 'how-learn-works.md']) assert.ok(fs.existsSync(path.join(ROOT, 'docs', 'explanation', f)), f);
  const docs = require('../web/docs');
  assert.ok(docs.PAGES.some((p) => p.md === 'docs/explanation/how-learn-works.md' && p.html === 'learn.html'));
  assert.strictEqual(docs.href('learning-a-song.md', 'docs/explanation'), 'https://github.com/markbeachill/ukemusic/blob/main/docs/explanation/learning-a-song.md');
  assert.strictEqual(docs.href('how-learn-works.md', 'docs/explanation'), 'learn.html', 'the paper links to the page on the site');
  assert.strictEqual(docs.href('CHORDPRO.md'), 'chordpro.html', 'links from the root documents as before');
  const site = fs.readFileSync(path.join(ROOT, 'site', 'index.html'), 'utf8');
  assert.ok(site.includes('id="learn"') && site.includes('href="learn.html"') && fs.existsSync(path.join(ROOT, 'site', 'img', 'learn.webp')));
});
