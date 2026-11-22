// 4.99.25: bring back what an AI chat returned (src/ai-review.js): a zip, the song's files or an edit
// list, checked against the song before anything changes, then the ticked files used
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../src/ai-review');
const B = require('../src/ai-bundle');
const SF = require('../src/song-files');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = async (name, fn) => { await fn(); n += 1; };

const CUR = {
  chart: '--START MUSIC--\n[[Verse 1]]\n[C]On we go, to[G]gether\n[[Chorus]]\n[F]Home [C]now\n--END MUSIC--\n',
  notes: 'Hold the G.\nKeep it slow.\n',
  ini: '[song]\ntempo = 90\nkey = C\n\n[playback]\ndefault_strum = island\n',
  plan: ''
};
const look = (f) => f.checks.filter((c) => c.level === 'look').map((c) => c.text).join(' | ');

(async () => {
  await t('what came back is sorted out by file; the prompt and lessons are left out', () => {
    const g = R.gather([{ name: 'Walk/Walk-song.txt', text: 'x\r\n' }, { name: 'Walk/notes.txt', text: 'n' }, { name: 'Walk/song.ini', text: '[song]' }, { name: 'Walk/learn/practice-plan.txt', text: 'p' }, { name: 'REVIEW.md', text: 'r' }, { name: 'EDITS.txt', text: 'e' }, { name: 'ai-prompt.txt', text: 'x' }, { name: 'lessons/LESSONS.md', text: 'l' }, { name: 'Other/Other-song.txt', text: 'y' }]);
    assert.deepStrictEqual([g.chart, g.notes, g.ini, g.plan, g.review, g.edits], ['x\n', 'n', '[song]', 'p', 'r', 'e']);
    assert.deepStrictEqual(g.ignored, ['ai-prompt.txt', 'lessons/LESSONS.md', 'Other/Other-song.txt (a second song)']);
  });

  await t('an edit list: only the ticked rows, inserts after one line in the list\'s order', () => {
    const { edits, problems } = R.parseEdits('@@ A song.ini set song.tempo\n+ 100\n@@ B chart line 3\n- to[G]gether\n+ tog[G]ether\n@@ C notes.txt append\n+ Practise the chorus first.\n@@ D chart after line 2\n+ {stop}\n@@ E chart after line 2\n+ {swing}\n');
    assert.deepStrictEqual(problems, []);
    const a = R.applyEdits(CUR, edits, ['B', 'D', 'E']);
    assert.deepStrictEqual(a.problems, []);
    assert.deepStrictEqual(a.files.chart.split('\n').slice(1, 5), ['[[Verse 1]]', '{stop}', '{swing}', '[C]On we go, tog[G]ether']);
    assert.strictEqual(a.files.ini, CUR.ini, 'row A not ticked: tempo as it was');
    assert.strictEqual(a.files.notes, CUR.notes);
    const all = R.applyEdits(CUR, edits, ['A', 'C']);
    assert.match(all.files.ini, /tempo = 100/);
    assert.ok(all.files.notes.endsWith('Keep it slow.\nPractise the chorus first.\n'));
    assert.match(R.applyEdits(CUR, R.parseEdits('@@ B chart line 3\n- nowhere\n+ x\n').edits, ['B']).problems[0], /isn't on line 3/);
  });

  await t('a cue moved: words, chords and bars the same, the file ticked', () => {
    const r = R.compare(CUR, { chart: CUR.chart.replace('to[G]gether', 'tog[G]ether') });
    const f = r.files[0];
    assert.ok(f.changed && f.ok, look(f));
    assert.deepStrictEqual(f.checks.map((c) => c.level), ['ok', 'ok', 'ok']);
    assert.deepStrictEqual(r.bars, { before: 4, after: 4, parts: [{ name: 'Verse 1', after: 2, before: 2 }, { name: 'Chorus', after: 2, before: 2 }] });
    assert.ok(R.reportHtml(r).includes('class="air-use" value="chart" checked'));
  });

  await t('words changed, or the key moved: said, and the song not ticked', () => {
    const w = R.compare(CUR, { chart: CUR.chart.replace('On we go', 'Off we go') }).files[0];
    assert.match(look(w), /The words change in 1 place/);
    assert.ok(!w.ok);
    const k = R.compare(CUR, { chart: CUR.chart.replace(/\[C\]/g, '[D]').replace(/\[G\]/g, '[A]').replace(/\[F\]/g, '[G]') }).files[0];
    assert.match(look(k), /4 chords move up 2 semitones: that's a change of key/);
    const longer = R.compare(CUR, { chart: CUR.chart.replace('[F]Home', '[F x2]Home') });
    assert.ok(longer.files[0].checks.some((c) => c.level === 'note' && /plays 5 bars instead of 4/.test(c.text)));
    assert.ok(R.reportHtml(longer).includes('<tr class="air-diff"><td>Chorus</td><td>2</td><td>3</td></tr>'));
  });

  await t('settings: a changed tempo is shown, a setting left out is kept; notes lines the AI dropped come back', () => {
    const back = { ini: '[song]\ntempo = 100\nkey = C\n', notes: 'Keep it slow.\nNew tip\n' };
    const r = R.compare(CUR, back);
    const ini = r.files.find((f) => f.id === 'ini');
    assert.deepStrictEqual(ini.lines, [{ before: ['song.tempo', '90'], after: ['song.tempo', '100'] }]);
    assert.ok(ini.ok && ini.checks.some((c) => /playback\.default_strum stays island/.test(c.text)));
    const res = R.result(CUR, back, r, ['ini', 'notes']);
    assert.deepStrictEqual(res.settings, { song: { tempo: 100, key: 'C' }, playback: { default_strum: 'island' } });
    assert.strictEqual(res.notes, 'Keep it slow.\nNew tip\nHold the G.\n');
    const keyed = R.compare(CUR, { ini: '[song]\ntempo = 90\nkey = D\n' }).files[0];
    assert.match(look(keyed), /key or transpose setting changes/);
  });

  await t('a practice plan ukemusic can\'t run is said, and not ticked', () => {
    const r = R.compare(CUR, { plan: '2 min  Shapes\n3 min  Section Bridge\n' });
    assert.match(look(r.files[0]), /Plan line 2: The song has no section called "Bridge"/);
    assert.ok(R.compare(CUR, { plan: '2 min  Shapes\n3 min  Section Chorus\n' }).files[0].ok);
  });

  await t('the AI chat zip comes straight back: nothing changes', async () => {
    const zip = B.zip({ title: 'Walk', text: CUR.chart, settings: { song: { tempo: 90, key: 'C' }, playback: { default_strum: 'island' } }, notes: CUR.notes });
    const got = R.gather((await SF.readZip(zip)).map((e) => ({ name: e.name, text: new TextDecoder().decode(e.data) })));
    const r = R.compare(CUR, got);
    assert.ok(r.files.every((f) => !f.changed), JSON.stringify(r.files.map((f) => [f.id, f.changed])));
  });

  await t('the desktop app (Export → AI chat → Bring back) and the web player (Edit → Help from an AI chat) have it', () => {
    const html = read('index.html');
    assert.match(html, /id="aiBackButton"[^>]*>Bring back<\/button>/);
    assert.ok(html.includes('<dialog id="aiReviewDialog"') && html.includes('window.ukemusic.aiReview'));
    assert.match(read('src/preload.js'), /aiReview: require\('\.\/ai-review'\)/);
    const web = read('web/app.html');
    assert.ok(web.includes('<label class="btn" for="aiBackFiles">Bring back from an AI chat</label>') && web.includes('<dialog id="aiReviewDialog"') && web.includes('U.aiReview'));
    assert.ok(read('docs/user-guide.md').includes('**Bring back**'));
  });

  console.log(`v4.99.25: ${n} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
