// 4.99.26: from a real chat's answer for Amazing Grace: the prompt leaves valid notation alone ([Cx3] and
// [C x3] are the same), says a plain chord fills the bar, asks for anything taken out of the song back
// for the notes, and for changed files as a zip; Bring back takes what the chat wrote, pasted, keeps the
// lines above --START MUSIC--, and says when chord markers were only rewritten
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ai = require('../src/ai-prompt');
const R = require('../src/ai-review');
const parse = require('../src/parser');
const { songSlots } = require('../src/playback-schedule');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const flat = ai.AI_PRACTICE_PROMPT.replace(/\s+/g, ' ');
let n = 0;
const t = (name, fn) => { fn(); n += 1; };

t('the prompt: leave what works, a plain chord fills the bar, give back what you take out', () => {
  assert.ok(flat.includes("If the sheet is already in ukemusic's format, leave what's right as it is: don't rewrite notation that already works ([Cx3] and [C x3] are the same)."));
  assert.ok(flat.includes("a plain chord fills the bar: [C] on the beat is a whole bar; after a chord of a few beats it's the rest of that bar"));
  assert.ok(flat.includes("Don't take anything out of the song (a comment, a recap, a second ending) without saying so; give me what you took out, ready to paste into my notes."));
  assert.ok(flat.includes('give the files you changed as a zip in the same layout, so ukemusic can check them (Bring back)'));
  assert.ok(ai.AI_PRACTICE_PROMPT.split('\n').every((l) => l.length <= 74));
  // and it's true: the two ways of writing three bars play the same
  const bars = (s) => songSlots(parse(s), { beatsPerBar: 4 }).slots.reduce((x, sl) => x + sl.len / sl.beats, 0);
  assert.strictEqual(bars('[Cx3]a [G7x2]b'), bars('[C x3]a [G7 x2]b'));
  assert.strictEqual(bars('[Em:2]a [C]b'), 1, 'a plain chord after two beats fills the rest of the bar');
});

const CUR = 'Practice tempo: 70 BPM\n--START MUSIC--\n[[Verse 1]]\n[Cx2]Words made [G7x2]up\n--END MUSIC--\n';
const ANSWER = 'Here is the song.\n\n```\n\n--START MUSIC--\n[[Verse 1]]\n[C x2]Words made [G7 x2]up\n--END MUSIC--\n\n```\n\n| Setting | Result |\n';

t('pasted: the song is taken from the code block, an edit list from its @@ lines', () => {
  assert.deepStrictEqual(R.fromPaste(ANSWER), [{ name: 'pasted-song.txt', text: '--START MUSIC--\n[[Verse 1]]\n[C x2]Words made [G7 x2]up\n--END MUSIC--\n' }]);
  assert.deepStrictEqual(R.fromPaste('```\n@@ A song.ini set song.tempo\n+ 90\n```'), [{ name: 'EDITS.txt', text: '@@ A song.ini set song.tempo\n+ 90\n' }]);
  assert.deepStrictEqual(R.fromPaste('Nothing useful here'), []);
  assert.strictEqual(R.gather(R.fromPaste(ANSWER)).chart.split('\n')[0], '--START MUSIC--');
});

t('a returned song that is only the music keeps the lines above and below it', () => {
  assert.strictEqual(R.keepOutside(CUR, '--START MUSIC--\n[C]x\n--END MUSIC--\n'), 'Practice tempo: 70 BPM\n--START MUSIC--\n[C]x\n--END MUSIC--\n');
  assert.strictEqual(R.keepOutside('--START MUSIC--\n[C]a\n--END MUSIC--\n', '--START MUSIC--\n[G]a\n--END MUSIC--\n'), '--START MUSIC--\n[G]a\n--END MUSIC--\n');
  assert.strictEqual(R.keepOutside(CUR, 'Title\n--START MUSIC--\n[C]x\n--END MUSIC--\n'), 'Title\n--START MUSIC--\n[C]x\n--END MUSIC--\n', 'a whole file comes back as it is');
});

t('markers only rewritten: said, and nothing else changes', () => {
  const back = { chart: R.keepOutside(CUR, R.gather(R.fromPaste(ANSWER)).chart) };
  const f = R.compare({ chart: CUR, notes: '', ini: '', plan: '' }, back).files[0];
  assert.deepStrictEqual(f.checks.map((c) => c.level), ['ok', 'note', 'ok', 'ok']);
  assert.match(f.checks[1].text, /^2 chord markers are written another way that plays the same/);
  assert.ok(f.lines.every((l) => l.before && l.after && !/Practice tempo/.test(l.before[1])), 'the header line is kept');
});

t('the apps: paste in Bring back (desktop and web)', () => {
  const html = read('index.html');
  assert.ok(html.includes('<summary>Or paste what the chat wrote</summary>') && html.includes("window.ukemusic.aiReview.fromPaste(document.getElementById('aiReviewPaste').value)"));
  const web = read('web/app.html');
  assert.ok(web.includes('<button id="aiBackPaste" class="btn" type="button">Paste what the chat wrote</button>') && web.includes("U.aiReview.fromPaste($('aiReviewPaste').value)"));
});

console.log(`v4.99.26: ${n} checks passed`);
