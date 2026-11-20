// 4.99.19: a song's own practice plan goes wherever the song goes: Dropbox (the web player's sync),
// the web player's backups and Songs for the web, zipped songs folders, library packs, copies
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const CS = require('../src/cloud-sync');
const WS = require('../src/web-songs');
const SF = require('../src/song-files');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = async (name, fn) => { await fn(); n++; };

(async () => {
  const PLAN = '2 min  Change G7 to C ; the one we rush\nThen: the song from memory\n';
  const song = { title: 'Amazing Grace', text: '[C]Amazing', settings: { song: { key: 'C' } }, notes: '' };

  await t('Dropbox: the plan is learn/practice-plan.txt in the song folder, and part of its fingerprint', () => {
    assert.strictEqual(CS.songHash({ ...song, practicePlan: '' }), CS.songHash(song), 'a song with no plan keeps its fingerprint (no resync)');
    assert.notStrictEqual(CS.songHash({ ...song, practicePlan: PLAN }), CS.songHash(song));
    const { files } = CS.songToFiles({ ...song, practicePlan: PLAN }, '/Songs');
    assert.deepStrictEqual(files.plan, { path: '/Songs/Amazing Grace/learn/practice-plan.txt', text: PLAN });
    assert.strictEqual(CS.songToFiles(song, '/Songs').files.plan, undefined);
    // taken back to ukemusic's own: an empty file over the one in the drive
    assert.strictEqual(CS.songToFiles({ ...song, practicePlan: '', cloud: { revs: { plan: 'r1' } } }, '/Songs').files.plan.text, '');
    const remote = CS.songFolders([
      { tag: 'file', path: '/Songs/Amazing Grace/Amazing Grace-song.txt', rev: 'a' },
      { tag: 'file', path: '/Songs/Amazing Grace/song.ini', rev: 'b' },
      { tag: 'file', path: '/Songs/Amazing Grace/learn/practice-plan.txt', rev: 'c' },
      { tag: 'file', path: '/Songs/Amazing Grace/learn/Amazing Grace (learn).pdf', rev: 'd' },
      { tag: 'file', path: '/Songs/Danny Boy/Danny Boy-song.txt', rev: 'e' }
    ], '/Songs');
    const ag = remote.get('/songs/amazing grace');
    assert.strictEqual(ag.plan.path, '/Songs/Amazing Grace/learn/practice-plan.txt');
    assert.deepStrictEqual(ag.revs, { song: 'a', ini: 'b', notes: '', plan: 'c' });
    assert.deepStrictEqual(remote.get('/songs/danny boy').revs, { song: 'e', ini: '', notes: '' });
    assert.strictEqual(CS.filesToSong(ag, { song: 'x', plan: PLAN }).practicePlan, PLAN);
    assert.strictEqual(CS.filesToSong(ag, { song: 'x', plan: '  \n' }).practicePlan, '');
    // a plan made on the desktop: the drive changed, so it comes in
    assert.strictEqual(CS.sameRevs({ song: 'a', ini: 'b', notes: '' }, ag.revs), false);
    assert.strictEqual(CS.sameRevs({ song: 'e', ini: '', notes: '' }, remote.get('/songs/danny boy').revs), true);
  });

  await t('the web player syncs it as a fourth file', () => {
    const web = read('web/app.html');
    assert.match(web, /for \(const k of CS\.FILE_KINDS\) \{\n\s*if \(!info\[k\]\) continue;/);
    assert.match(web, /\{ ini: 'song\.ini', notes: 'notes\.txt', plan: CS\.PLAN_FILE \}\[k\]/);
    assert.match(web, /plan: CS\.hashText\(files\.plan \? files\.plan\.text : ''\)/);
  });

  await t('backups and Songs for the web carry it; a different plan is a change to bring in', () => {
    const built = WS.buildWebSongs([{ ...song, content: song.text, practicePlan: PLAN }, { title: 'B', content: 'x' }]);
    assert.strictEqual(built.songs[0].practicePlan, PLAN);
    assert.ok(!('practicePlan' in built.songs[1]));
    const back = WS.readWebSongs(JSON.stringify(built));
    assert.strictEqual(back.songs[0].practicePlan, PLAN);
    assert.deepStrictEqual(SF.differences({ ...song }, { ...song, practicePlan: PLAN }), ['practice plan']);
    assert.strictEqual(SF.sameSong({ ...song, practicePlan: '' }, { ...song }), true);
    assert.match(read('main.js'), /if \(u\.what\.includes\('practice plan'\)\) songs\.writeLearn\(folder, songs\.PLAN_FILE, u\.song\.practicePlan \|\| ''\);/);
    assert.match(read('main.js'), /practicePlan: song\.practicePlan \};   \/\/ 4\.99\.19/);
  });

  await t('a songs folder brought in (picked, or zipped) brings its plans, not its learn sheets', async () => {
    const r = await SF.songsFromFiles([
      { name: 'Songs/Amazing Grace/Amazing Grace-song.txt', text: '[C]Amazing' },
      { name: 'Songs/Amazing Grace/learn/practice-plan.txt', text: PLAN },
      { name: 'Songs/Danny Boy/Danny Boy-song.txt', text: '[C]Oh' }
    ]);
    assert.strictEqual(r.songs.find((s) => s.title === 'Amazing Grace').practicePlan, PLAN);
    assert.strictEqual(r.songs.find((s) => s.title === 'Danny Boy').practicePlan, undefined);
    assert.strictEqual(r.songs.length, 2, 'the plan isn\'t a song of its own');
    assert.match(read('src/song-files.js'), /learn\\\/practice-plan\\\.txt\$\/i\.test\(e\.name\)\) \{ flat\.push/, 'kept from a zip');
  });

  await t('library packs and copies take the plan with the song', () => {
    const L = require('../src/libraries');
    const songs = require('../src/song-library');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ukeplan-'));
    const lib = path.join(tmp, 'Club');
    fs.mkdirSync(path.join(lib, 'Amazing Grace', 'learn'), { recursive: true });
    fs.writeFileSync(path.join(lib, 'Amazing Grace', 'Amazing Grace-song.txt'), '[C]Amazing');
    fs.writeFileSync(path.join(lib, 'Amazing Grace', 'learn', 'practice-plan.txt'), PLAN);
    fs.writeFileSync(path.join(lib, 'Amazing Grace', 'learn', 'Amazing Grace (learn).pdf'), 'pdf');
    assert.strictEqual(songs.readSong(path.join(lib, 'Amazing Grace')).practicePlan, PLAN);
    const packed = L.exportPack(lib, path.join(tmp, 'club'));
    const into = path.join(tmp, 'Mine');
    fs.mkdirSync(into);
    const r = L.importPack(packed.file, { into });
    assert.deepStrictEqual(r.added, ['Amazing Grace']);
    assert.strictEqual(fs.readFileSync(path.join(into, 'Amazing Grace', 'learn', 'practice-plan.txt'), 'utf8'), PLAN);
    assert.ok(!fs.existsSync(path.join(into, 'Amazing Grace', 'learn', 'Amazing Grace (learn).pdf')));
    const other = path.join(tmp, 'Other');
    fs.mkdirSync(other);
    L.copySong(path.join(lib, 'Amazing Grace'), other);
    assert.strictEqual(fs.readFileSync(path.join(other, 'Amazing Grace', 'learn', 'practice-plan.txt'), 'utf8'), PLAN);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  console.log(`v4.99.19: ${n} tests passed`);
})().catch((e) => { console.error(e); process.exit(1); });
