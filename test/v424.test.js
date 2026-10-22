// 4.24: chord patterns with the words, better part names, and writing the names into the song
const assert = require('assert');
const parse = require('../src/parser');
const pr = require('../src/progressions');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const route = (r) => r.route.map((x) => `${x.letter} ${x.name}${x.times > 1 ? ` ×${x.times}` : ''}`).join(' → ');

const ROADS = '[C]I come from Alabama, [Am]banjo on my knee\n[G]going to Lou[F]isiana, my [C]true love\nfor to see, [Am]Susanna, don\'t you cry\n\n'
  + '[C]Oh Susanna, oh don\'t you [G]cry for me\n[Am]I come from Ala[F]bama\n\n'
  + '[C]It rained all night the [Am]day I left\n[G]the weather it was [F]dry, the [C]sun\nso hot I froze to death, [Am]Susanna, don\'t you cry\n\n'
  + '[C]Oh Susanna, oh don\'t you [G]cry for me\n[Am]I come from Ala[F]bama\n';

test('each part shows its chords over the words, with numerals and a held chord', () => {
  const r = pr.analyse(parse(ROADS));
  const verse = r.parts.find((p) => p.name === 'Verse');
  const first = verse.example.lines[0];
  assert.deepStrictEqual(first.map((g) => [g.chord, g.numeral, g.text.trim()]), [['C', 'I', 'I come from Alabama,'], ['Am', 'vi', 'banjo on my knee']]);
  const held = verse.example.lines[2][0];
  assert.deepStrictEqual([held.chord, held.held, held.text.trim()], ['C', true, 'for to see,']);
  assert.deepStrictEqual(verse.occurrences.map((o) => o.words), ['I come from Alabama, banjo…', 'It rained all night the…']);
  assert.strictEqual(r.route[1].words, 'Oh Susanna, oh…');
});

test('write the names in: headings before each part, and the same reading after', () => {
  const r = pr.analyse(parse(ROADS));
  const { text, added } = pr.addLabels(ROADS, r);
  assert.strictEqual(added, 4);
  assert.ok(text.startsWith('[[Verse]]\n[C]I come from Alabama'), text);
  assert.strictEqual((text.match(/\[\[Chorus\]\]\n\[C\]Oh Susanna/g) || []).length, 2);
  const again = pr.analyse(parse(text));
  assert.strictEqual(route(again), route(r));
  assert.strictEqual(pr.addLabels(text, again).added, 0, 'nothing more to add');
});

test('your own headings are kept; a heading then a blank line names the next part', () => {
  const song = '[[Verse 1]]\n{D-DU}\n\n[C]one [F]two [C]three [G7]four\n[C]five [G7]six [C]seven\n\n[C]eight [F]nine [C]ten [G7]eleven\n[C]twelve [G7]thirteen [C]fourteen\n';
  const r = pr.analyse(parse(song));
  assert.strictEqual(r.sections[0].name, 'Verse 1');
  assert.ok(r.sections[0].labelled);
  const { text, added } = pr.addLabels(song, r);
  assert.strictEqual(added, 1);
  assert.strictEqual((text.match(/\[\[Verse 1\]\]/g) || []).length, 1);
});

test('"Bridge (x2):" and "Ending last time:" written as words are headings', () => {
  const song = '[C]la la [G]la la\n[Am]la la [F]la\n\nBridge (x2): [F] [Em] [Dm] [C]\n\n[C]la la [G]la la\n[Am]la la [F]la\n\nEnding last time (slow):\n[C] [G] [C]\n';
  const r = pr.analyse(parse(song));
  assert.deepStrictEqual(r.sections.map((x) => x.name), ['Chorus', 'Bridge (x2)', 'Chorus', 'Ending last time (slow)']); // 4.32: as written
  assert.ok(r.sections[1].labelled && r.sections[3].labelled);
});

test('verse and chorus on the same chords (both on C Am F G): the words that come back are the chorus', () => {
  const song = '[C]In a cavern, in a [Am]canyon, excavating for a mine\ndwelt a [F]miner, forty-[G]niner, and his daughter Clementine\n\n'
    + '[C]Oh my darling, oh my [Am]darling, oh my darling Clementine\nyou are [F]lost and gone for[G]ever, dreadful sorry Clementine\n\n'
    + '[C]Light she was and like a [Am]fairy, and her shoes were number nine\nherring [F]boxes without [G]topses, sandals were for Clementine\n\n'
    + '[C]Oh my darling, oh my [Am]darling, oh my darling, Clementine\nthou art [F]lost and gone for[G]ever, dreadful sorry Clementine\n';
  const r = pr.analyse(parse(song));
  assert.strictEqual(route(r), 'A Verse → A Chorus → A Verse → A Chorus');
  assert.strictEqual(r.parts.length, 1);
  assert.deepStrictEqual(r.parts[0].alsoIn, ['Chorus']);
});

test('a chorus in two halves with new opening words each half (two chorus halves on the same chords) is still the chorus', () => {
  const v1 = 'The [C]morning comes across the hill\nAnd [C]all the birds are singing still\nThe [G]river runs down to the mill\n';
  const v2 = 'The [C]evening falls upon the town\nThe [C]lamps are lit, the sun goes down\nThe [G]baker shuts his shutters brown\n';
  const c1 = 'So [F]sing along and sing it loud\nAnd [C]let it ring above the crowd\nAnd [G]sing it out and make us proud\n';
  const c2 = 'Come [F]clap your hands and stamp your feet\nAnd [C]dance along the cobbled street\nAnd [G]sing it out until we meet\n';
  const song = [v1, v2, c1, c2, v2, c1, c2].join('\n');
  const r = pr.analyse(parse(song));
  assert.strictEqual(route(r), 'A Verse ×2 → B Chorus ×2 → A Verse → B Chorus ×2');
});

test('two different verses heard once between choruses are verses, not bridges (a chorus with two different verses)', () => {
  const ch = '[G]Ring the [A]bell and [D]sing the [G]song\nAll the [D]day and all the [G]night, [Em]all night [A]long\n';
  const v1 = '[G]Walking down the [A]lane at [D]dawn I [G]go\n[D]past the mill and [G]past the [D]field of [G]corn\nby the [D]river [G]slow\n[Em]On I [A]go\n';
  const v2 = 'Over [G]hill and over [A]dale I [D]wander [G]far\n[D]underneath the [G]star\nfollow [D]where the [G]roads are [Em]running [A]to\n';
  const r = pr.analyse(parse([ch, v1, ch, v2, ch].join('\n')));
  assert.strictEqual(r.route.map((x) => x.name).join(' → '), 'Chorus → Verse → Chorus → Verse 2 → Chorus');
});

test('short bits before the first verse are all the intro', () => {
  const song = '[[Intro]]: [Am] [F] [D]\n\n[G]Ooh!\n\n[G]Oh Su[G7]sanna, oh don\'t [Em]you cry\n[Am]I come from Ala[G]bama\n\n[G]Oh Su[G7]sanna, don\'t you [Em]cry for me\n[Am]with my banjo on my [G]knee\n';
  const r = pr.analyse(parse(song));
  assert.deepStrictEqual(r.route.slice(0, 2).map((x) => `${x.letter} ${x.name}`), ['A Intro', 'B Intro']);
});

test('the notes text has each part\'s words', () => {
  const text = pr.analysisText(pr.analyse(parse(ROADS)), (k) => k.name);
  assert.ok(/words: "I come from Alabama, banjo…", "It rained all night the…"/.test(text), text);
});
