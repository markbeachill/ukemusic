// 4.99.24: the song for an AI chat (src/ai-bundle.js): the ready-to-practise prompt with the song and
// its song.ini, notes and practice plan, as one text to paste or as a zip of the song's folder
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const B = require('../src/ai-bundle');
const SF = require('../src/song-files');
const F = require('../src/feature-levels');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = async (name, fn) => { await fn(); n += 1; };

const SONG = {
  title: 'Evening Walk', folder: 'Evening Walk', fileName: 'Evening Walk-song.txt',
  text: '--START MUSIC--\r\n[[Verse 1]]\r\n[C]On we go, to[G]gether\r\n--END MUSIC--\r\n',
  settings: { song: { tempo: 96, key: 'C', artist: 'Made Up' }, playback: { default_strum: 'island' } },
  notes: 'Hold the G.\n', plan: '2 min  Shapes\n3 min  Section Verse 1 at 85%\n', artist: 'Made Up'
};

(async () => {
  await t('the files are the song folder, only the ones the song has', () => {
    assert.deepStrictEqual(B.files(SONG).map((f) => f.name), ['Evening Walk/Evening Walk-song.txt', 'Evening Walk/song.ini', 'Evening Walk/notes.txt', 'Evening Walk/learn/practice-plan.txt']);
    assert.ok(!B.files(SONG)[0].text.includes('\r'), 'line endings made plain');
    assert.deepStrictEqual(B.files({ title: 'Bare', text: 'x' }).map((f) => f.name), ['Bare/Bare-song.txt']);
    assert.strictEqual(B.files({ title: 'A/B: C?', text: 'x' })[0].name, 'A B C/A B C-song.txt', 'no folder signs in names');
  });

  await t('the text: the prompt with the sheet, then each other file under its heading', () => {
    const text = B.text(SONG);
    assert.ok(text.startsWith(require('../src/ai-prompt').AI_PRACTICE_PROMPT.split('[paste')[0].split('- Song and artist:')[0]));
    assert.ok(text.includes('- Song and artist: Evening Walk, Made Up'));
    assert.ok(text.includes('Here is the sheet:\n--START MUSIC--\n[[Verse 1]]'));
    assert.ok(text.includes("THE SONG'S OTHER FILES (from ukemusic)"));
    for (const h of ['=== song.ini ===\n[song]\ntempo = 96', '=== notes.txt ===\nHold the G.', '=== learn/practice-plan.txt ===\n2 min  Shapes']) assert.ok(text.includes(h), h);
    assert.ok(!B.text({ title: 'Bare', text: '[C]x' }).includes('OTHER FILES'), 'no other files: no heading for them');
  });

  await t('the zip opens in the web player as the song, with its settings, notes and plan; the prompt is left out', async () => {
    const zip = B.zip(SONG, new Date(2026, 10, 22, 10, 30));
    assert.ok(zip instanceof Uint8Array);
    const entries = await SF.readZip(zip);
    assert.deepStrictEqual(entries.map((e) => e.name), [...B.files(SONG).map((f) => f.name), 'ai-prompt.txt']);
    const prompt = new TextDecoder().decode(entries.find((e) => e.name === 'ai-prompt.txt').data);
    assert.ok(prompt.includes('The song is in the zip file attached') && prompt.includes('Evening Walk/song.ini'));
    const r = await SF.songsFromFiles([{ name: 'Evening Walk for an AI chat.zip', bytes: zip }]);
    assert.strictEqual(r.songs.length, 1, 'ai-prompt.txt is not a song');
    const s = r.songs[0];
    assert.strictEqual(s.title, 'Evening Walk');
    assert.strictEqual(s.settings.song.tempo, 96);
    assert.strictEqual(s.notes, 'Hold the G.\n');
    assert.strictEqual(s.practicePlan, SONG.plan);
    assert.strictEqual(B.zipName(SONG), 'Evening Walk for an AI chat.zip');
    assert.strictEqual(B.crc32(new TextEncoder().encode('123456789')), 0xcbf43926, 'the zip checksum');
  });

  await t('the desktop app (Export → AI chat) and the web player (Edit → Help from an AI chat) have it', () => {
    const html = read('index.html');
    assert.match(html, /<div class="rib-group" data-feature="aiChat">[\s\S]*?id="aiCopyButton"[\s\S]*?>Copy for AI chat<\/button>[\s\S]*?id="aiZipButton"[\s\S]*?>AI chat zip<\/button>/);
    assert.ok(html.includes('window.ukemusic.aiBundle.text(await aiBundleSong())') && html.includes('window.ukemusic.saveAiZip({'));
    assert.match(read('main.js'), /handle\('song:aiZip'/);
    assert.match(read('src/preload.js'), /aiBundle: require\('\.\/ai-bundle'\)/);
    const web = read('web/app.html');
    assert.ok(web.includes('<div class="add-row" data-feature="aiChat"><button id="aiCopyBtn"') && web.includes('U.aiBundle.zip(song)'));
    const row = F.FEATURES ? F.FEATURES.find((f) => f.id === 'aiChat') : null;
    assert.ok(read('src/feature-levels.js').includes("id: 'aiChat', app: 'both'"), 'a feature-levels row');
    if (row) assert.strictEqual(row.level, 'all');
    assert.ok(!/AI chat zip…|Copy for AI chat…/.test(html), 'no … on ribbon buttons');
  });

  console.log(`v4.99.24: ${n} checks passed`);
})().catch((e) => { console.error(e); process.exit(1); });
