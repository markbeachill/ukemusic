# ukemusic web

ukemusic for iPhone, iPad and any browser, for playing, practising and writing songs: your songs (kept on the device in IndexedDB; added from files with Add songs from files…, including the desktop app's "Phone and tablet… → Save songs for the web player" file; written and changed with New song and Edit; backed up with Back up all songs), the chord sheet, transpose, capo, instrument, chord shapes, Standard or Stage look, play along, karaoke, Learn (from memory, Next chord?, the learn sheet, Chord patterns and the circle of fifths), downloads, the writing guide and the whole Practice section.

It is the desktop app's own code. `entry.js` bundles `src/preload.js` for the browser, with small stand-ins in `stubs/` for Electron, `fs` (an in-memory file system holding the chord libraries, WRITING.md and practice.json) and `path`. The practice window's markup, styles and script are taken from the desktop `index.html` (`pr_markup.html`, `pr_css.css`, `pr_js.js`).

On claude.ai the songs live in the page's private store (collection `songs`, one document per song: title, text, settings as in song.ini, notes; and `practice/progress`). Without it (signed out), songs stay in that browser.

Rebuild after changing the desktop app (from the app's folder):

    npm install --no-save --prefix web esbuild@0.24.0
    npm run build:web

`web/make.js` bundles the code, puts the page together (`out/index.html` for any web server, `out/ukemusic-web.html` for a claude.ai artifact), converts the samples to WAV in `out/sounds` (needs ffmpeg) and writes the public-domain library as `out/public-domain-songs.json`. On GitHub, `.github/workflows/web.yml` does the same on every push to `main` and publishes `web/out` with GitHub Pages. Library packs (.ukelib) aren't available on the web (`stubs/zlib.js`).

On the website it can also keep its songs in Dropbox, in the desktop app's own songs folder (the Dropbox… button; planning in src/cloud-sync.js, the Dropbox calls in app.html; set `DROPBOX_APP_KEY` in app.html to your Dropbox app's key).

It's an installable web app on the website: `out/index.html` links `manifest.webmanifest` and the icons in `icons/` (made from build/icon.png), and registers `sw.js`, the offline copy, written by make.js from `sw-template.js` with every file the player needs and a version that changes when any of them does. The claude.ai copy (`ukemusic-web.html`) has none of this.

Practice changes must remain identical in desktop and web. Run `node tools/sync-practice.js` to check. After editing the web practice fragments, run `node tools/sync-practice.js --from-web` to update the desktop copy while retaining its Learn shortcuts. Every web build and the 4.50 regression tests check parity.

Free Practice keeps its own progress, last three started exercises, personal settings and routines. On GitHub Pages these are saved in browser storage (`ukeweb.practice`), separately from the IndexedDB song library and Dropbox sync. Practice home has a separate practice backup/restore; the song backup remains for songs. In a connected artifact the existing private `practice/progress` store is still used, with a local browser copy as well.

Help is optional and specific to the exercise (`src/practice-help.js`). On phones the controls are behind Edit settings, with playback and tempo in a bottom bar. One-minute changes waits for a manually entered score after a full minute; cancellation is shared across all exit paths.
