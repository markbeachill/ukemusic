// 4.90: setlists in the web player, in the desktop app's file format (src/setlist-text.js), kept
// on the device and, with Dropbox, in the songs folder's Setlists folder; Music stand and the
// Session screen go through one.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const ST = require('../src/setlist-text');
const WEB = read('web/app.html');

test('one file format for both apps; the desktop\'s setlists.js uses it', () => {
  const desk = require('../src/setlists');
  assert.strictEqual(desk.formatSetlist(['Amazing Grace | +5', 'Oh! Susanna']), ST.formatSetlist(['Amazing Grace | +5', 'Oh! Susanna']));
  assert.deepStrictEqual(ST.parseEntry('Amazing Grace | +5'), { title: 'Amazing Grace', shift: 5 });
  assert.strictEqual(ST.formatSetlist([{ title: 'Danny Boy', shift: -2 }]), '# ukemusic setlist: one song title per line, in playing order\nDanny Boy | -2\n');
  assert.deepStrictEqual(ST.parseSetlist('# x\r\nA\r\n\r\nB | +1\r\n'), ['A', 'B | +1']);
  assert.deepStrictEqual(ST.checkName(' Club  night. ', ['Gig']), { ok: true, name: 'Club night' });
  assert.strictEqual(ST.checkName('gig', ['Gig']).ok, false);
  assert.strictEqual(ST.checkName('gig', ['Gig'], { except: 'Gig' }).ok, true);
  assert.strictEqual(ST.checkName('A/B').ok, false);
  assert.deepStrictEqual(ST.renameInLines(['Old song | +2', 'Other'], 'old song', 'New song'), ['New song | +2', 'Other']);
  assert.strictEqual(ST.renameInLines(['Other'], 'Old', 'New'), null);
  assert.match(read('src/setlists.js'), /require\('\.\/setlist-text'\)/);
  assert.match(read('src/preload.js'), /setlistText: require\('\.\/setlist-text'\),/);
});

test('the setlist files in a Dropbox listing: only .txt in the songs folder\'s Setlists folder', () => {
  const files = ST.setlistFiles([
    { tag: 'file', path: '/Songs/Setlists/Club night.txt', rev: 'a' },
    { tag: 'file', path: '/Songs/Setlists/Club night.pdf', rev: 'b' },
    { tag: 'file', path: '/Songs/Setlists/old/x.txt', rev: 'c' },
    { tag: 'file', path: '/Songs/Amazing Grace/Amazing Grace-song.txt', rev: 'd' },
    { tag: 'folder', path: '/Songs/Setlists', rev: '' }
  ], '/Songs');
  assert.deepStrictEqual(files, [{ name: 'Club night', path: '/Songs/Setlists/Club night.txt', rev: 'a' }]);
});

test('the sync plan: new, changed here, changed there, changed in both, deleted here or there', () => {
  const T = (x) => ST.formatSetlist(x);
  const h = (x) => ST.hashText(T(x));
  const plan = ST.planSetlistSync({
    local: [
      { name: 'Same', text: T(['A']), rev: 's1', synced: h(['A']) },
      { name: 'Here', text: T(['A', 'B']), rev: 'h1', synced: h(['A']) },
      { name: 'There', text: T(['A']), rev: 't1', synced: h(['A']) },
      { name: 'Both', text: T(['B']), rev: 'b1', synced: h(['A']) },
      { name: 'Gone there', text: T(['A']), rev: 'g1', synced: h(['A']) },
      { name: 'Gone there, changed here', text: T(['B']), rev: 'x1', synced: h(['A']) },
      { name: 'New here', text: T(['A']), rev: '', synced: '' }
    ],
    remote: [
      { name: 'same', path: '/S/Setlists/same.txt', rev: 's1' },
      { name: 'Here', path: '/S/Setlists/Here.txt', rev: 'h1' },
      { name: 'There', path: '/S/Setlists/There.txt', rev: 't2' },
      { name: 'Both', path: '/S/Setlists/Both.txt', rev: 'b2' },
      { name: 'New there', path: '/S/Setlists/New there.txt', rev: 'n1' },
      { name: 'Deleted here', path: '/S/Setlists/Deleted here.txt', rev: 'd1' },
      { name: 'Deleted here, changed there', path: '/S/Setlists/Deleted here, changed there.txt', rev: 'e2' }
    ],
    deleted: [{ name: 'Deleted here', rev: 'd1' }, { name: 'Deleted here, changed there', rev: 'e1' }]
  });
  const names = (list, side) => list.map((x) => (side ? x[side] && x[side].name : x.name) || (x.remote && x.remote.name)).sort();
  assert.deepStrictEqual(names(plan.push, 'local'), ['Gone there, changed here', 'Here', 'New here']);
  assert.deepStrictEqual(plan.pull.map((x) => x.remote.name).sort(), ['Deleted here, changed there', 'New there', 'There']);
  assert.deepStrictEqual(plan.conflict.map((x) => x.local.name), ['Both']);
  assert.deepStrictEqual(plan.removeLocal.map((x) => x.name), ['Gone there']);
  assert.deepStrictEqual(plan.removeRemote.map((x) => x.name), ['Deleted here']);
  assert.strictEqual(plan.push.find((x) => x.local.name === 'Here').remote.rev, 'h1', 'an update of the rev it was');
});

test('web player: setlists in the library, an editor, Music stand and Session screen from one', () => {
  assert.match(WEB, /<details id="setlistsBox" class="setlists-box" data-feature="setlists">/);
  assert.match(WEB, /<dialog id="setlistDialog" class="setlist-dialog" aria-labelledby="setlistDialogTitle">/);
  assert.match(WEB, /<button class="btn primary" type="button" data-stand="\$\{i\}"/);
  assert.match(WEB, /data-feature="session" data-session="\$\{i\}"/);
  assert.match(WEB, /if \(list\.length\) openSession\(\{ stand, list \}\);/);
  assert.match(WEB, /const get = \(\) => \(made = made \|\| sessionSong\(song, shifts\[k\]\)\);/, 'in the setlist\'s key');
  assert.match(WEB, /semitones: shift \|\| p\.transpose,/);
  assert.match(WEB, /session\.show\(\{ songs: lazy, start: list \? 0 : /, 'from its first song');
  const { FEATURES } = require('../src/feature-levels');
  assert.strictEqual(FEATURES.find((f) => f.id === 'setlists').app, 'both');
});

test('web player: setlists go with Dropbox (one listing for songs and setlists); a renamed song is renamed in them', () => {
  assert.match(WEB, /const listing = await dbxList\(cloudConf\.root\);\n\s*const remote = CS\.songFolders\(listing, cloudConf\.root\);/);
  assert.match(WEB, /await attempt\('Setlists', async \(\) => \{ done\.setlists = await syncSetlists\(listing\); \}\);/);
  assert.match(WEB, /const pathOf = \(name\) => CS\.joinPath\(root, ST\.SETLIST_DIR, `\$\{name\}\$\{ST\.EXTENSION\}`\);/);
  assert.match(WEB, /for \(const r of plan\.removeRemote\) \{ await dbxApi\('files\/delete_v2', \{ path: r\.path \}\)/);
  assert.match(WEB, /if \(view\.song && edit\.titleAtOpen && edit\.titleAtOpen !== view\.song\.title\) renameInSetlists\(edit\.titleAtOpen, view\.song\.title\);/);
  assert.match(read('web/pages.js'), /Its Dropbox sync handles song text, song settings and notes, and the setlists;/);
});

// 4.90.1
test('4.90.1: the Music stand puts the chord shapes across the top, so the words have the whole width', () => {
  assert.match(read('src/session-screen.js'), /noWrap: book\(\), stripTop: book\(\) \}\);/);
  assert.match(read('src/session-fit.js'), /const tall = top \|\| r\.height > r\.width \* 1\.05;/);
});
test('4.90.1: the website\'s pictures: Free Practice without its first-visit slides, one-minute changes, the Music stand', () => {
  const SP = read('tools/site-pictures.js');
  assert.match(SP, /const d = document\.getElementById\('prHelpDialog'\); if \(d && d\.open\) d\.close\(\);/);
  assert.match(SP, /await scene\('one-minute', async \(\) => \{/);
  assert.match(SP, /if \(doImg && \(want\('music-stand'\) \|\| want\('music-stand-guide'\)\)\) await musicStand\(base\);/); // 4.91: and its guide
  const PAGES = read('web/pages.js');
  assert.match(PAGES, /img: 'one-minute\.webp', alt: 'One-minute changes from C to F, with Count by listening on' \}/);
  assert.match(PAGES, /\{ id: 'music-stand', h3: 'Music stand: reading on your own, from a tablet', p: \[[^\]]*\], img: 'music-stand\.webp', h: 1020,/); // 4.92: its own heading
  for (const f of ['one-minute.webp', 'music-stand.webp']) assert.ok(fs.existsSync(path.join(ROOT, 'site', 'img', f)), f);
});

console.log('v4.90 tests passed');
