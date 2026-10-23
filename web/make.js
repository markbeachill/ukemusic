// Build the web version into web/out (run from anywhere: node web/make.js).
// Needs esbuild (npm install --no-save --prefix web esbuild@0.24.0) and, for the sounds, ffmpeg.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const WEB = __dirname;
const APP = path.join(WEB, '..');
process.chdir(WEB);

// 1. Bundle the desktop app's own code for the browser
require('esbuild').buildSync({
  entryPoints: ['entry.js'], bundle: true, format: 'iife', globalName: 'UMW', platform: 'browser', minify: true,
  alias: { fs: './stubs/fs.js', path: './stubs/path.js', electron: './stubs/electron.js', zlib: './stubs/zlib.js' },
  loader: { '.md': 'text' }, define: { __dirname: '"/app/src"' },
  banner: { js: 'var process = { env: {}, resourcesPath: "", platform: "web", versions: {} };' },
  outfile: 'umw.js'
});

// 2. Put the page together (out/index.html and out/ukemusic-web.html)
require('./build.js');

// 2b. The documents as website pages (site/guide.html, chordpro.html, changes.html)
console.log('pages:', require('./docs.js').build().join(', '));

// 3. The samples as WAV (Safari can't decode FLAC)
const sounds = path.join(WEB, 'out', 'sounds');
fs.mkdirSync(sounds, { recursive: true });
const src = path.join(APP, 'src', 'sounds', 'ukulele');
for (const f of fs.readdirSync(src)) {
  const from = path.join(src, f);
  if (f.endsWith('.flac')) {
    const to = path.join(sounds, f.replace(/\.flac$/, '.wav'));
    if (fs.existsSync(to)) continue;
    try { execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', from, to]); } catch (_e) { console.warn('ffmpeg not found: skipped', f); }
  } else fs.copyFileSync(from, path.join(sounds, f));
}

// 4. The public-domain starter songs as a "Songs for the web" file (load it with Update songs)
const lib = require(path.join(APP, 'src', 'song-library.js'));
const web = require(path.join(APP, 'src', 'web-songs.js'));
const root = path.join(APP, 'public domain songs', 'Public Domain Songs');
if (fs.existsSync(root)) {
  // songs with words to play (not the ones still waiting for their words)
  const songs = lib.listSongs(root).filter((s) => !/needs words/i.test(String(s.tags || ''))).map((s) => {
    const r = lib.readSong(s.folder);
    return { title: s.title, content: r.content, settings: r.settings, notes: r.notes };
  });
  const version = require(path.join(APP, 'package.json')).version;
  fs.writeFileSync(path.join(WEB, 'out', 'public-domain-songs.json'), JSON.stringify(web.buildWebSongs(songs, { appVersion: version })));
  console.log('starter songs:', songs.length);
}
