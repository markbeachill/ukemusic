# Guide for AI assistants: where changes go

This file is for AI coding assistants (Claude, Codex, Copilot and others) working on ukemusic. It says which file to change for which kind of change, the rules the project keeps, and what to check before finishing. `HANDOVER.md` has the long history, version by version; this file is the map.

ukemusic is one program in two forms:

- **The desktop app** (Electron): `main.js` (the main process: files, settings, menus, PDFs) and `index.html` (the whole window: markup, CSS and script in one large file).
- **The web player** (phones, tablets, any browser): `web/app.html`, built with the shared code in `src/` into `web/out/` by `node web/make.js`.

Most of the music logic lives in `src/` as plain functions, used by both. Change it there once, not separately in each app.

## The rules

1. **No copyrighted songs or lyrics.** Don't write or paste the words of songs under copyright into the code, the tests, the docs or the website. Use the public-domain songs (`public domain songs/Public Domain Songs/`) or words made up for the purpose. `mysongs/` is the owner's own songs: never commit it or quote from it.
2. **Don't overwrite the owner's own files**: `src/sounds/` (recorded samples), `public domain songs/Public Domain Songs/Amazing Grace/notes.txt` and `site/img/session.webp`.
3. **Change the desktop app and the web player together** when a feature is in both. If you change one only, say why.
4. **Free Practice is shared, word for word.** The practice markup, CSS and script are in `index.html` and in `web/pr_markup.html`, `web/pr_css.css` and `web/pr_js.js`. Edit the web fragments, then run `node tools/sync-practice.js --from-web` to copy them into `index.html`. That replaces everything between the practice markers in `index.html`, so **don't put anything else inside the practice block**: desktop-only CSS put there was lost in 4.50. Run `node tools/sync-practice.js` to check the two agree (the tests do too).
5. **Every release:** raise `"version"` in `package.json` (and both places in `package-lock.json`), add a section to `CHANGELOG.md` (a test fails without one), add a row to the table in `HANDOVER.md`, add `test/vNNN.test.js` for what changed and list it in the `test` script in `package.json`.
6. **Run `npm test` before finishing.** All tests must pass.
7. **Plain words for users.** Labels, help and changelog entries are written for ukulele players, not programmers: say what it does and where to find it.

## Where each kind of change goes

| To change… | Change this | And also |
|---|---|---|
| How songs are written (the song format, shorthand) | `src/parser.js` (text → IR nodes), `src/song-syntax.js` (shorthand), `src/chord-names.js` | `WRITING.md` (the guide, shown in the app and on the website); `src/ai-prompt.js` if the AI prompt should know it |
| How the chord sheet looks | `src/renderer-html.js`, `src/default-style.css`, style sets in `src/style-sets.js` | Stage formats: `src/stage-formats.js`; lyrics only: `src/renderer-lyrics.js`; Markdown: `src/renderer-markdown.js` |
| Chord diagrams and chord shapes | `src/diagram-svg.js`, `src/chord-library.js`, `src/chords.json`, `src/shapes.js` | Instruments: `src/instruments.js` (see `INSTRUMENTS.md`) |
| Strum patterns and strum boxes | `src/strums.js` (the library), `src/strum-box.js` (how they look) | |
| Tab | `src/tab.js` | `TABLATURE.md` |
| The tune (melody) and notation | `src/melody.js`, `src/notation-svg.js`, `src/music-glyphs.js` | |
| Key, transposing, capo | `src/keys.js`, `src/transpose.js`, `src/rekey.js`, `src/capo.js`, `src/versions.js` | |
| Playback and sound | `src/playback-schedule.js` (what plays when), `src/playback-audio.js` (the sound) | Samples in `src/sounds/` belong to the owner |
| Karaoke | `src/karaoke.js` (timing) | Desktop karaoke is in `index.html`; the web's is in `web/k_markup.html` and `web/k_js.js` |
| Learn (from memory, quiz, changes, learn sheet) | `src/learn.js`, `src/progressions.js` (chord patterns, keys, key changes) | Desktop Learn tab and dialogs in `index.html`; the web's Learn dialog in `web/app.html`; how it works: `docs/explanation/` |
| Picking and the pick sheet | `src/picking.js`, `src/pick-sheet.js`, `src/pick-song.js` | |
| Free Practice | `src/practice-catalog.js` (exercises), `src/training.js`, `src/finger-exercises.js`, `src/note-exercises.js`, `src/practice-progress.js`, `src/practice-help.js` | The screens: `web/pr_*` then `tools/sync-practice.js --from-web` (rule 4) |
| ChordPro import and export | `src/chordpro.js`, `src/chordpro-import.js`, `src/chordpro-fields.js` | `CHORDPRO.md` |
| Pasting chord sheets from websites | `src/chord-sheet.js` | |
| The songs folder, libraries, setlists | `src/song-library.js`, `src/libraries.js`, `src/setlists.js`, `src/zip.js` | File access is in `main.js` |
| Settings: their defaults and how they're kept | `main.js` (`DEFAULT_CONFIG`, reading and writing `config.ini`), the default config in `index.html`, song settings in `src/song-library.js` | The Settings panel is in `index.html` |
| Exports and PDFs | `main.js` (printing to PDF), `index.html` (the Export dialog), `src/exports-map.js` | |
| The Session (group) screen | `src/session-view.js`, `src/session-fit.js`, `src/session-screen.js` | Desktop: `session.html`; web: `web/app.html` |
| The web player's own screens | `web/app.html` | Shared helpers in `src/song-ui.js`; songs from files: `src/song-files.js`; Dropbox: `src/cloud-sync.js`; offline copy: `web/sw-template.js` |
| Anything only in the desktop window | `index.html` (find the feature's ids: buttons are `id="…Button"`, dialogs `<dialog id="…Dialog">`) | Exposing `src/` code to the window: `src/preload.js` |
| The website | Home page: `site/index.html`; other pages: `web/pages.js`; pages made from the docs: `web/docs.js`; gallery files: `site/gallery/` | Pictures in `site/img/` (not `session.webp`); built and published by `.github/workflows/web.yml` |
| Installers and releases | `package.json` (`build`), `.github/workflows/release.yml` | |

## Tests

- `npm test` runs every file in `test/`. Newer features each have `test/vNNN.test.js` (the version they arrived in): add yours the same way.
- Most of `src/` is pure functions: test them directly.
- For `index.html` and `web/app.html`, tests read the file and check the markup or settings are there (see `test/v452.test.js`).

## When you change what a screen looks like

The **UI review** (`tools/ui-review/`) takes a picture of every screen of the desktop app and of the web player on an iPad and an iPhone, so the interface can be reviewed and compared. After changing a screen:

- if the change is to a screen already in the review, run it again: `npm run ui-review` (or just that app and section: `npm run ui-review -- desktop L`);
- for a new screen, add a step that opens it to `tools/ui-review/desktop.js` and/or `tools/ui-review/web.js`, give it an id and a name in `tools/ui-review/catalog.json`, and use the same id in each app that has it.

`tools/ui-review/README.md` says how.

## Finishing

Say what changed in plain words, what you tested, and anything the owner has to do (commit, tag a release). The owner commits and tags releases himself, unless he asks you to.
