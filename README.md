# ukemusic

Ukulele chord sheet editor (also baritone ukulele and guitar) with live preview, fingering diagrams, and tablature.

Ukulele first, with baritone ukulele and guitar too: see [INSTRUMENTS.md](INSTRUMENTS.md) (instruments, file names, capo, left-handed, sounds, strum library).
How tab works (writing, pasting, key changes, other instruments, playback, and the code behind it): see [TABLATURE.md](TABLATURE.md).
How to write songs (everything you can type, with examples): see [WRITING.md](WRITING.md), also in the app under Write → How to write.

## Getting around (v4)

- ukemusic opens on **Your songs** (the library): open a song, start a new one, paste one from a website or import a file. Three old, copyright-free starter songs show how songs are written.
- In a song, the tabs hold everything (File → Close goes back to your songs). **View** has the look (diagrams, text size, strum style, layout) and **Export** makes PDFs and other files in one click:
  - **File**: close, save, save as new, rename, import, paste, add to setlist;
  - **Write**: tab, strums, suggest the key, chords into words (for songs copied from websites), How to write (the guide);
  - **This song**: key, capo, instrument, tempo, time, strum;
  - **Play**: play (beside the editor, with the chord, strum and next shapes above the preview), play along (full-screen karaoke with chord shapes), Session screen (the whole song on one screen, on the TV if one is plugged in, for playing as a group; a setlist song by song), stop, practice (strum, 12-bar blues, chord change), tempo (change it while playing), tap tempo, practice (loop a section, slower, speeding up), sound;
  - **Settings**: opens Settings.
- The hint line under the tabs explains whatever the mouse is over.
- **Practice** (from the library or the Play tab): a menu of 39 exercises in seven categories (warm-ups, chords, strumming, fingerpicking, scales and melody, noodling, routines), with difficulty badges, an animated fretboard, a visual metronome, one-minute-change scores, your progress and streak, and timed routines.
- The library's **Setlists** tab puts songs in order for a gig or club night and makes a **songbook PDF**. Songs can have an artist and tags to search by.
- A song can be kept in several keys; each shows in the library as "Song (in F)", and **Make this the song's key** rewrites the song itself in a new key.
- Each song has an **Info** tab (artist, year, written by, album, source, tags, difficulty, original key, time, tempo) beside Song and Notes. A song always opens on the Song tab.
- Click a chord diagram to choose another **chord shape** for the song.
- Shorthand: `[Em:2]` for a 2-beat chord, `[N.C.]` for a pause, `[C x3]` for three bars, `| C | F | % | G7 C |` for a line of bars, `(x2)` to repeat a line, `{A: D-DU-UDU}` … `{A}` for named strums, `{stop}`.
- **View → Layout**: chords above the words, in columns, in the words, or chords only.
- Strum patterns show as **info boxes** (time signature, name, arrows, letters, count), in a choice of styles including plain; `{3/4 D-DUDU}` changes the time from there on.
- The song is on the left and its preview on the right, kept in step: scroll the song and the preview follows; click a preview line to jump to it in the song.

## Website, downloads and web player

- **Website:** https://markbeachill.github.io/ukemusic/ (what ukemusic does, with downloads). Its page is `site/index.html`; it finds the repository and the latest release by itself.
- **Web player:** https://markbeachill.github.io/ukemusic/app/ (for phones, tablets and any browser: plays songs and has Practice, but doesn't write or edit them; see [web/README.md](web/README.md)). On the public site it opens with the public-domain songs; your own come from the desktop app's **Songs for the web…** file.
- **Installers:** made by GitHub Actions for each release (`.github/workflows/release.yml`): a Windows installer, Mac disk images (Apple silicon and Intel) and a Linux AppImage. They aren't code-signed, so Windows and macOS ask once before opening them; the website says how.

Both the website and the web player are rebuilt on every push to `main` (`.github/workflows/web.yml`).

### Making a release

1. Change `"version"` in `package.json` (and add a section to CHANGELOG.md), commit and push.
2. On GitHub: **Releases → Draft a new release**, tag `v` + the version (e.g. `v4.33.1`), paste the changelog section, **Publish release**.
3. The installers appear on the release after about 15 minutes, and the website's download buttons point at them. Songs come from the desktop app's **Songs for the web…** file, loaded with **Update songs**. 

## Songs and copyright

This repository holds **no copyrighted songs**. Your own songs folder (`mysongs/`), exports and the working files are kept out by `.gitignore`. The examples in the guide and the tests use public-domain words (Oh! Susanna, Clementine, Amazing Grace, Scarborough Fair) or words written for the tests.

`public domain songs/Public Domain Songs/` is a ukemusic library of songs that are free of copyright in the UK. Each song's `notes.txt` says why, and songs tagged **needs words** have their details but no words yet. Add it in the app with the library button → **Add a library folder…**. Before adding a song to it, check that the words and the music are both out of copyright (in the UK, 70 years after the death of the last writer), and set Info → Licence.

## Development

```bash
npm install
npm test          # run all tests
npm start         # launch in dev mode
npm run build:web # the web player, into web/out (see web/README.md)
```

## Building

```bash
# Unpacked build (for testing production paths)
npm run build

# Platform installers
npm run package:linux   # → dist/*.AppImage
npm run package:mac     # → dist/*.dmg
npm run package:win     # → dist/*.exe (NSIS installer)

# All platforms (from a CI environment)
npm run package
```

Output goes to `dist/`.

## Project Structure

```
main.js              Electron main process
preload.js           → delegates to src/preload.js
index.html           Single-page app shell (editor + preview + settings)
src/
  parser.js          Input → IR nodes (pure function)
  renderer-html.js   IR → HTML string (pure function)
  renderer-markdown.js IR → Markdown string (pure function)
  diagram-svg.js     Chord definition → SVG string
  chord-library.js   Loads/merges built-in + user chord libraries
  chords.json        Built-in chord definitions (GCEA tuning)
  default-style.css  Default stylesheet with CSS custom properties
  resource-paths.js  Resolves bundled resource paths (dev + production)
  ini-utils.js       INI read/write helpers
  codemirror-ukemusic.js  CodeMirror 6 syntax highlighting
  preload.js         contextBridge API for renderer process
build/
  icon.svg/png/ico/icns  App icons
test/
  parser.test.js
  renderer-html.test.js
  renderer-markdown.test.js
  diagram-svg.test.js
```

## Configuration

On first launch, creates config files at:

| Platform | Location |
|----------|----------|
| Linux | `~/.config/ukemusic/` |
| macOS | `~/Library/Application Support/ukemusic/` |
| Windows | `%APPDATA%\ukemusic\` |

Files: `config.ini` (behaviour), `style.css` (appearance), optionally `chords.json` (chord library overrides).

## Spec Version

Built to ukemusic specification v2.5.
