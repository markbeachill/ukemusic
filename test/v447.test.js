// 4.47: songs in a cloud drive: the desktop's song folders, read and written by the web player.
const assert = require('assert');
const cs = require('../src/cloud-sync');
const { settingsFromIni } = require('../src/song-files');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const SONG = '--START MUSIC--\n[C]Hello [G]there\n--END MUSIC--\n';
const ROOT = '/Ukulele/Songs';
const listing = (extra = []) => [
  { tag: 'folder', path: '/Ukulele/Songs/Amazing Grace' },
  { tag: 'file', path: '/Ukulele/Songs/Amazing Grace/Amazing Grace-song.txt', rev: 'a1' },
  { tag: 'file', path: '/Ukulele/Songs/Amazing Grace/song.ini', rev: 'a2' },
  { tag: 'file', path: '/Ukulele/Songs/Amazing Grace/notes.txt', rev: 'a3' },
  { tag: 'file', path: '/Ukulele/Songs/Amazing Grace/exports/Song/x.pdf', rev: 'zz' },
  { tag: 'file', path: '/Ukulele/Songs/Amazing Grace/.history/old-song.txt', rev: 'zz' },
  { tag: 'file', path: '/Ukulele/Songs/Danny Boy/Danny Boy-song.txt', rev: 'd1' },
  { tag: 'file', path: '/Ukulele/Songs/Archived songs/Old/Old-song.txt', rev: 'o1' },
  { tag: 'file', path: '/Ukulele/Songs/Setlists/Club night.txt', rev: 's1' },
  { tag: 'file', path: '/Ukulele/Songs/Not a song/readme.txt', rev: 'r1' },
  { tag: 'file', path: '/Ukulele/Other/Elsewhere/Elsewhere-song.txt', rev: 'e1' },
  ...extra
];

test('the songs in the drive: song folders only, as the desktop keeps them', () => {
  const f = cs.songFolders(listing(), ROOT);
  assert.deepStrictEqual([...f.values()].map((x) => x.title), ['Amazing Grace', 'Danny Boy']);
  const ag = f.get('/ukulele/songs/amazing grace');
  assert.deepStrictEqual(ag.revs, { song: 'a1', ini: 'a2', notes: 'a3' });
  assert.deepStrictEqual(f.get('/ukulele/songs/danny boy').revs, { song: 'd1', ini: '', notes: '' });
});

test('a song to its files and back: song.ini as the desktop writes it, the same fingerprint', () => {
  const song = { title: 'Hi There', text: SONG, settings: { song: { tempo: 90, key: 'G', artist: 'Me, Myself', beats_per_bar: 3 }, playback: { pick: 'up8' } }, notes: 'Notes\n' };
  const { folder, files } = cs.songToFiles(song, ROOT);
  assert.strictEqual(folder, '/Ukulele/Songs/Hi There');
  assert.strictEqual(files.song.path, '/Ukulele/Songs/Hi There/Hi There-song.txt');
  assert.ok(/settings_format = 2/.test(files.ini.text) && /tempo = 90/.test(files.ini.text));
  const back = cs.filesToSong({ title: 'Hi There' }, { song: files.song.text, ini: files.ini.text, notes: files.notes.text });
  assert.deepStrictEqual(back.settings.song, { tempo: 90, key: 'G', artist: 'Me, Myself', beats_per_bar: 3 });
  assert.strictEqual(cs.songHash(back), cs.songHash(song));
  assert.notStrictEqual(cs.songHash({ ...song, text: SONG + 'x' }), cs.songHash(song));
  assert.strictEqual(cs.songToFiles({ ...song, notes: '' }, ROOT).files.notes, undefined);
  assert.strictEqual(settingsFromIni(files.ini.text).song.settings_format, undefined);
});

test('the plan: changed in one place, in both, new on either side, deleted on either side', () => {
  const remote = cs.songFolders(listing([
    { tag: 'file', path: '/Ukulele/Songs/Brand New/Brand New-song.txt', rev: 'b1' },
    { tag: 'file', path: '/Ukulele/Songs/Deleted Here/Deleted Here-song.txt', rev: 'x1' },
    { tag: 'file', path: '/Ukulele/Songs/Deleted Here Changed There/Deleted Here Changed There-song.txt', rev: 'y2' },
    { tag: 'file', path: '/Ukulele/Songs/Same Title/Same Title-song.txt', rev: 't1' }
  ]), ROOT);
  const synced = (title, revs, extra = {}) => {
    const s = { id: title, title, text: SONG, settings: {}, notes: '', ...extra };
    s.cloud = { folder: `${ROOT}/${title}`, revs, hash: cs.songHash(s) };
    return s;
  };
  const ag = synced('Amazing Grace', { song: 'a1', ini: 'a2', notes: 'a3' });                  // the same
  const db = synced('Danny Boy', { song: 'd0', ini: '', notes: '' });                          // changed there
  const editedHere = synced('Edited Here', { song: 'e1', ini: '', notes: '' });               // gone there…
  editedHere.text += 'more';                                                                   // …and changed here
  const goneThere = synced('Gone There', { song: 'g1', ini: '', notes: '' });                  // gone there, same here
  const both = synced('Danny Boy', { song: 'd0', ini: '', notes: '' });
  both.id = 'both'; both.text += 'x';
  const plan = cs.planSync({
    local: [ag, db, editedHere, goneThere,
      { id: 'n', title: 'Only Here', text: SONG, settings: {}, notes: '' },
      { id: 's', title: 'Same Title', text: SONG, settings: {}, notes: '' },
      { id: 'k', title: 'Skipped', text: SONG, settings: {}, notes: '', cloudSkip: true }],
    remote,
    deleted: [{ folder: `${ROOT}/Deleted Here`, revs: { song: 'x1', ini: '', notes: '' } }, { folder: `${ROOT}/Deleted Here Changed There`, revs: { song: 'y1', ini: '', notes: '' } }]
  });
  assert.strictEqual(plan.same, 1);
  assert.deepStrictEqual(plan.pull.map((p) => p.info.title).sort(), ['Brand New', 'Danny Boy', 'Deleted Here Changed There']);
  assert.deepStrictEqual(plan.recreate.map((s) => s.title), ['Edited Here']);
  assert.deepStrictEqual(plan.removeLocal.map((s) => s.title), ['Gone There']);
  assert.deepStrictEqual(plan.match.map((m) => m.song.title), ['Same Title']);
  assert.deepStrictEqual(plan.newLocal.map((s) => s.title), ['Only Here']);
  assert.deepStrictEqual(plan.archive.map((t) => t.folder), [`${ROOT}/Deleted Here`]);
  const p2 = cs.planSync({ local: [both], remote });
  assert.deepStrictEqual(p2.conflict.map((c) => c.song.id), ['both']);
  const renamed = synced('Amazing Grace', { song: 'a1', ini: 'a2', notes: 'a3' });
  renamed.title = 'Amazing Grace (slow)';
  assert.deepStrictEqual(cs.planSync({ local: [renamed], remote }).push.map((p) => p.song.title), ['Amazing Grace (slow)']);
  assert.strictEqual(cs.archivePath(ROOT, `${ROOT}/Deleted Here`), '/Ukulele/Songs/Archived songs/Deleted Here');
});
