# ukemusic web

ukemusic for iPhone, iPad and any browser, for playing and practising: your songs (from the desktop app's "Songs for the web…" file, loaded with Update songs), the chord sheet, transpose, capo, instrument, chord shapes, Standard or Stage look, play along, karaoke, Learn (from memory, Next chord?, the learn sheet, Chord patterns and the circle of fifths), downloads, the writing guide and the whole Practice section.

It is the desktop app's own code. `entry.js` bundles `src/preload.js` for the browser, with small stand-ins in `stubs/` for Electron, `fs` (an in-memory file system holding the chord libraries, WRITING.md and practice.json) and `path`. The practice window's markup, styles and script are taken from the desktop `index.html` (`pr_markup.html`, `pr_css.css`, `pr_js.js`).

On claude.ai the songs live in the page's private store (collection `songs`, one document per song: title, text, settings as in song.ini, notes; and `practice/progress`). Without it (signed out), songs stay in that browser.

Rebuild after changing the desktop app (from the app's folder):

    npm install --no-save --prefix web esbuild@0.24.0
    npm run build:web

`web/make.js` bundles the code, puts the page together (`out/index.html` for any web server, `out/ukemusic-web.html` for a claude.ai artifact), converts the samples to WAV in `out/sounds` (needs ffmpeg) and writes the public-domain library as `out/public-domain-songs.json`. On GitHub, `.github/workflows/web.yml` does the same on every push to `main` and publishes `web/out` with GitHub Pages. Library packs (.ukelib) aren't available on the web (`stubs/zlib.js`).

(Re-extract `pr_*` from index.html if the practice window changes.)
