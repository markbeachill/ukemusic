// 4.29: Stage formats, repeated parts printed once, 4.28's Stage style change put back
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const parse = require('../src/parser');
const progressions = require('../src/progressions');
const sf = require('../src/stage-formats');
const styleSets = require('../src/style-sets');
const { undoStage428, STAGE_427, STAGE_428 } = require('../src/stylesheet-upgrade');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const once = (text) => sf.collapseRepeats(text, progressions.analyse(parse(text)).sections);

test('four formats; Clear by default; each with its layout', () => {
  assert.deepStrictEqual(sf.FORMATS.map((f) => [f.id, f.layout]), [['clear', 'table'], ['brackets', 'table'], ['compact', 'inline'], ['heavy', null]]);
  assert.strictEqual(sf.formatOf('nonsense').id, 'clear');
  const css = sf.formatsCss();
  for (const id of ['clear', 'brackets', 'compact']) assert.ok(css.includes(`html[data-stage-format="${id}"]`), id);
  assert.ok(!css.includes('data-stage-format="heavy"'), 'Heavy is the Stage style as it is');
  assert.ok(/data-stage-format="clear"\] \.chord-table td\.lyric[^{]*\{\s*font-family[^}]*font-weight: 400/.test(css), 'plain words');
  assert.ok(/data-stage-format="compact"\] \.inline-line \.ichord \{ background: none !important/.test(css), 'no black blocks in Compact');
  assert.ok(/data-stage-format="brackets"\] \.chord-table td\.chord::before \{ content: "\["/.test(css));
});

test('a part that comes back exactly the same: printed once, then "Chorus — as before"', () => {
  const ch = '[[Chorus]]\n[C]Oh Susanna, oh don\'t you [G]cry for me\nFor I [Am]come from Ala[F]bama\n';
  const song = `[[Verse 1]]\n[C]I come from Alabama [Am]with my banjo\n[G]on my [F]knee\n\n${ch}\n[[Verse 2]]\n[C]It rained all night the [Am]day I left\n[G]the weather [F]dry\n\n${ch}\n${ch}\n[[Ending]]\n[C]Cry for [G]me\n`;
  const r = once(song);
  assert.strictEqual(r.text.split('\n').filter((l) => /Oh Susanna/.test(l)).length, 1);
  assert.ok(/\[\[Chorus\]\] — as before, twice/.test(r.text), r.text);
  assert.strictEqual(r.shortened, 2);
  // the cue is one line, so it can't run on into the next part
  const html = String(require('../src/renderer-html')(parse(r.text), { layout: 'table' }));
  assert.ok(/inline-label[^>]*>Chorus<\/strong>[\s\S]{0,80}as(&nbsp;| )before/.test(html), 'a one-line cue');
  assert.strictEqual((html.match(/<h2 class="section">Chorus<\/h2>/g) || []).length, 1, 'only the first chorus has its heading');
});

test('4.30: a part the song doesn\'t name with a heading is never shortened (no guessing)', () => {
  const ch = '[C]Oh my darling, [F]oh my darling, Clementine\nYou are [C]lost and gone\n';
  const song = `[C]In a cavern, in a canyon\n[C]Excavating for a mine\n\n${ch}\n[C]Light she was and like a fairy\n[C]Her shoes were number nine\n\n${ch}`;
  assert.strictEqual(once(song).shortened, 0);
});

test('a chorus that comes back changed is printed in full', () => {
  const song = '[[Chorus]]\n[C]Oh Susanna, oh [G]don\'t you\n[F]cry for [C]me\n\n[[Verse]]\n[C]I come from Ala[G]bama\n[Am]banjo on my knee\n\n[[Chorus]]\n[C]Oh Susanna, oh [G]don\'t you\n[F]weep for [C]me\n';
  assert.strictEqual(once(song).shortened, 0);
  const same = '[[Chorus]]\n[C]Oh Susanna, oh [G]don\'t you\n[F]cry for [C]me\n\n[[Verse]]\n[C]I come from Ala[G]bama\n[Am]banjo on my knee\n\n[[Chorus]]\n[C]Oh Susanna, oh [G]don\'t you\n[F]cry for [C]me\n';
  const r = once(same);
  assert.strictEqual(r.shortened, 1);
  assert.ok(r.text.trimEnd().endsWith('[[Chorus]] — as before'), r.text);
  assert.strictEqual(once('[C]one line only\n\n[C]one line only\n').shortened, 0, 'one-line parts stay');
});

test('line length across the page: proportional for Clear, as before for Heavy', () => {
  assert.strictEqual(sf.charsAcross('heavy', { pageWidthPx: 680, sizePx: 18, monospaceChars: 61 }), 61);
  assert.strictEqual(sf.charsAcross('clear', { pageWidthPx: 680, sizePx: 18, monospaceChars: 61 }), 75);
});

test('4.28\'s Stage style change is put back (only lines ukemusic wrote)', () => {
  const defaultCss = fs.readFileSync(path.join(__dirname, '..', 'src', 'default-style.css'), 'utf8');
  const now = styleSets.stageCss(defaultCss);
  assert.ok(STAGE_427.every((l) => now.includes(l)), 'the Stage style is as in 4.27');
  const from428 = STAGE_427.reduce((css, line, i) => css.replace(line, STAGE_428[i]), now);
  assert.notStrictEqual(from428, now);
  const r = undoStage428(from428);
  assert.ok(r.changed);
  assert.strictEqual(r.css, now);
  assert.strictEqual(undoStage428(now).changed, false);
});

test('a song keeps its own Stage format and chorus choice', () => {
  const picked = songs.pickSongSettings({ export: { stage_format: 'compact', stage_chorus: 'once', stage_once: true } });
  assert.strictEqual(picked.export.stage_format, 'compact');
  assert.strictEqual(picked.export.stage_chorus, 'once');
  assert.strictEqual(picked.export.stage_once, undefined, '4.29\'s setting is dropped');
  assert.strictEqual(songs.pickSongSettings({ export: { stage_chorus: 'sometimes' } }).export, undefined);
  assert.strictEqual(songs.pickSongSettings({ export: { stage_format: 'huge' } }).export, undefined);
});

test('karaoke: words before a line\'s first chord know which chord is still playing', () => {
  const { buildSchedule } = require('../src/playback-schedule');
  const { buildKaraoke } = require('../src/karaoke');
  const ir = parse('[F]banjo on my [C]knee.\nI\'m going to Lou[Am]isiana\n\n[[Chorus]]\nOh Susanna, [G]cry\n');
  const k = buildKaraoke(ir, buildSchedule(ir, { tempo: 120, beatsPerBar: 4 }));
  const words = k.lines.filter((l) => l.kind === 'words');
  assert.strictEqual(words[1].pieces[0].carried, 'C');
  assert.strictEqual(words[2].pieces[0].carried, 'Am', 'across a heading too');
  assert.strictEqual(words[0].pieces[0].carried, undefined, 'a piece with its own chord');
  const first = buildKaraoke(parse('Hello there [C]friend\n'), buildSchedule(parse('Hello there [C]friend\n'), { tempo: 120 }));
  assert.strictEqual(first.lines[0].pieces[0].carried, undefined, 'nothing playing yet at the very start');
});
