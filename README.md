<p align="center">
  <img src="site/img/icon-192.png" width="96" height="96" alt="">
</p>

<h1 align="center">ukemusic</h1>

<p align="center">
  <b>Any chord sheet from the web, ready to play along, learn and practise.</b><br>
  Paste a chord sheet from any website: ukemusic sorts out the chords, shapes and strum,<br>
  plays it with you, helps you learn it by heart, and prints it for the gig.<br>
  Free and open source · works offline · no account, no adverts.<br>
  <b>For ukulele (high or low G), baritone ukulele and guitar, left- or right-handed</b>: <a href="https://markbeachill.github.io/ukemusic/instruments.html">how instruments work</a>.
</p>

<p align="center">
  <a href="https://markbeachill.github.io/ukemusic/"><b>Website</b></a> ·
  <a href="https://markbeachill.github.io/ukemusic/app/"><b>Try it in your browser</b></a> ·
  <a href="https://markbeachill.github.io/ukemusic/practice/"><b>Free Practice</b></a> ·
  <a href="https://github.com/markbeachill/ukemusic/releases/latest"><b>Download</b></a> ·
  <a href="https://markbeachill.github.io/ukemusic/gallery.html"><b>Gallery</b></a>
</p>

<p align="center">
  <a href="https://github.com/markbeachill/ukemusic/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/markbeachill/ukemusic?color=0e6b64&label=release"></a>
  <a href="https://github.com/markbeachill/ukemusic/actions/workflows/test.yml"><img alt="Tests" src="https://img.shields.io/github/actions/workflow/status/markbeachill/ukemusic/test.yml?label=tests"></a>
  <a href="LICENSE"><img alt="MIT licence" src="https://img.shields.io/badge/licence-MIT-0e6b64"></a>
  <img alt="Windows, Mac, Linux, phones and tablets" src="https://img.shields.io/badge/runs%20on-Windows%20·%20Mac%20·%20Linux%20·%20web-555">
</p>

<p align="center">
  <img src="site/img/editor.webp" width="900" alt="ukemusic: the song typed on the left, the finished chord sheet with chord shapes and the strum pattern on the right">
</p>

## What is ukemusic?

**Free, open-source software for learning and practising ukulele**, with baritone ukulele and guitar too, left- or right-handed ([how instruments work](https://markbeachill.github.io/ukemusic/instruments.html)). It's MIT-licensed, with no account, no adverts and no paid version.

- **Practise:** [Free Practice](https://markbeachill.github.io/ukemusic/practice/) has 40 exercises in six categories (warm-ups and finger work, chords and changes, strumming and rhythm, fingerpicking, scales and melody, improvising), shown on a moving fretboard in time with a metronome, plus timed routines and your progress (time practised, days in a row, best tempo, one-minute change scores). It follows your instrument (ukulele, low G, baritone or guitar), and prints a two-page **Chords by key** sheet for it. It's all in the free web player.
- **Learn songs:** play along on real ukulele sounds, karaoke, learn a song by heart with the chords fading out, and drills for its hardest chord changes.
- **Add songs from the web:** paste a chord sheet from any website (or import your club's ChordPro songbook) and get the chord sheet, the shapes, the strum, Stage copies for gigs, and songbooks. Writing your own is just typing the words with the chords in square brackets.
- **Free, offline, no account:** no adverts, nothing to pay, and your songs stay on your device.
- **AI prompts to copy:** two prompts for an AI chat (Claude, ChatGPT, Gemini…): one tidies a difficult chord sheet into ukemusic's format, the other gets a song ready to practise and starts with a menu, so you choose what it does. They're on the website's [Add songs from the web](https://markbeachill.github.io/ukemusic/songs.html#ai-prompts) page and in the apps, and kept in [`src/ai-prompts/`](src/ai-prompts/) so they're easy to change.
- **Music to start with:** 16 public-domain songs with their words, chords and strums (Amazing Grace, Danny Boy, Scarborough Fair, The Wild Rover and more), each with a note of where it comes from. Six are beginner songs in teaching order, from two chords to three ([a course in six songs](https://markbeachill.github.io/ukemusic/teach.html#beginner-songs)).
- **Try it now:** the [web player](https://markbeachill.github.io/ukemusic/app/) runs in any current browser on a phone, tablet or computer, and works offline once opened. The desktop app is for Windows, Mac and Linux ([download](https://github.com/markbeachill/ukemusic/releases/latest)).

## What it does

<!-- features:start (made by web/pages.js from web/features.js: change it there) -->
| Feature | Web player (phones, tablets, any browser) | Desktop app (Windows, Mac, Linux) |
|---|:---:|:---:|
| **[Get songs in](https://markbeachill.github.io/ukemusic/songs.html)** | | |
| Paste a chord sheet from any website | ✓ | ✓ |
| Import ChordPro files, or a whole songbook folder | ✓ Files, or a zipped folder | ✓ |
| AI prompts for difficult sheets and PDFs | ✓ | ✓ |
| Public-domain songs to start with, ready to play | ✓ | ✓ |
| Change a song, or write your own | ✓ | ✓ |
| Find songs by title, artist, tag or key | ✓ | ✓ Several libraries too |
| **[Play along](https://markbeachill.github.io/ukemusic/practise.html)** | | |
| It plays along with you: the chords and the strum, or picking | ✓ | ✓ |
| Karaoke: the words light up as it plays | ✓ | ✓ |
| Any key, with a capo; slower or faster | ✓ | ✓ |
| The tune, shown as notes and played | ✓ | ✓ |
| Loop a part | — | ✓ |
| Keep a song in several keys | — | ✓ |
| **[Learn a song by heart](https://markbeachill.github.io/ukemusic/learn.html)** | | |
| Play from memory, with fewer chords each time | ✓ | ✓ |
| Quizzes on the changes and the chord numbers | ✓ | ✓ |
| A learn sheet to print | ✓ Print | ✓ PDF |
| **[Free Practice](https://markbeachill.github.io/ukemusic/practice/)** | | |
| 40 exercises: warm-ups, chords, strumming, picking, scales, improvising | ✓ | ✓ |
| Routines, and your progress (days, best tempos, scores) | ✓ | ✓ |
| Progressions from memory, major and minor | ✓ | ✓ |
| Chords by key, a sheet to print | ✓ Print | ✓ PDF |
| **[Print and share](https://markbeachill.github.io/ukemusic/chord-sheets.html)** | | |
| Chord sheets with chord diagrams | ✓ Print or save a PDF | ✓ PDF |
| Stage copies: big and easy to read at a gig | ✓ | ✓ One or two pages |
| Pick sheets: tab for fingerpicking | ✓ | ✓ |
| ChordPro, web page and lyrics files | ✓ | ✓ And Markdown |
| Songbook PDFs of a setlist | — | ✓ |
| Export every song at once | — | ✓ |
| **[Play together](https://markbeachill.github.io/ukemusic/perform.html)** | | |
| Setlists | — | ✓ |
| The Session screen: big words and chords for a group | ✓ On this device | ✓ On a second screen or TV |
| Songs from the desktop to a phone or tablet, in one file | ✓ Takes it in | ✓ |
| **[Your instrument](https://markbeachill.github.io/ukemusic/instruments.html)** | | |
| Ukulele (high or low G), baritone ukulele and guitar | ✓ | ✓ |
| Left-handed chord diagrams | ✓ | ✓ |
| Your own chord shape for a song | — | ✓ |
| **[Free, offline and private](https://markbeachill.github.io/ukemusic/phone.html)** | | |
| Free and open source | ✓ | ✓ |
| Works offline | ✓ Once opened, or added to your home screen | ✓ |
| No account needed, no adverts | ✓ | ✓ |
| Your songs stay on your device | ✓ | ✓ |
| Share a songs folder between devices with Dropbox | ✓ | ✓ |
| Phones and tablets | ✓ | — |
| Windows, Mac and Linux | ✓ In any browser | ✓ |

What it isn't: a song catalogue. You bring the songs (it comes with some that are out of copyright), and they stay yours. Nothing to pay, no account, no adverts.
<!-- features:end -->

## Write it like this

```text
--START MUSIC--
[[Verse 1]]
{3/4 D-DUDU}
I've [C]been a wild rover for [F]many's the [C]year,
And I've [C]spent all me [G7]money on whiskey and [C]beer
--END MUSIC--
```

The chords go in square brackets where they're played; `{D-DU-UDU}` is the strum. Or paste a chord sheet from a website, import ChordPro, a songbook or a PDF, and ukemusic writes it this way for you. Everything you can type: [WRITING.md](WRITING.md).

## A quick tour

<table>
<tr>
<td width="50%"><img src="site/img/playing.webp" alt="The Wild Rover playing: the line lit, the chord and its strum, the next shapes"><br><b>Play along.</b> It strums the song with real ukulele sounds; the line, the chord and the strum light up as they come, with the next shapes ready.</td>
<td width="50%"><img src="site/img/karaoke.webp" alt="Karaoke: big words, the line being sung lit, chord shapes for now, next and then"><br><b>Karaoke.</b> Full screen, big words lit as they're sung, and the chord shapes for now, next and then.</td>
</tr>
<tr>
<td><img src="site/img/learn-memory.webp" alt="Playing from memory: the chords hidden after the first time"><br><b>Learn it by heart.</b> The chords fade after the first time each part comes, then show as numbers, then go.</td>
<td><img src="site/img/changes.webp" alt="The changes in a song, hardest first, with what each finger does"><br><b>The hard changes, first.</b> Every chord change in the song, with what each finger does, and practice for each.</td>
</tr>
<tr>
<td><img src="site/img/learn.webp" alt="A learn sheet: the chords and how they feel, the song's parts, the chord map"><br><b>Learn sheets.</b> The chords and what each one does, the song's parts, the chord map with its patterns, and the circle of fifths.</td>
<td><img src="site/img/tune.webp" alt="Brahms' Lullaby with its tune drawn as notes"><br><b>Fingerpick it, with the tune.</b> Picking patterns, tab, and the tune drawn as notes on a staff.</td>
</tr>
<tr>
<td><img src="site/img/practice.webp" alt="Free Practice: exercises by category"><br><b>Free Practice.</b> 40 exercises: warm-ups, chord changes, strumming, picking, scales and noodling, with routines and your progress.</td>
<td><img src="site/img/session-setlist.webp" alt="The Session screen: a song on one screen for a group"><br><b>Play together.</b> Setlists, songbook PDFs, and the Session screen: the whole song on the TV for a club night.</td>
</tr>
<tr>
<td><img src="site/img/stage.webp" alt="A Stage copy on two pages"><br><b>Print it for the gig.</b> A chord sheet in your own style and a Stage copy: big plain words, the chords in them, the fewest pages. <a href="https://markbeachill.github.io/ukemusic/gallery.html">See the gallery</a>.</td>
<td><img src="site/img/phone-song.webp" width="200" alt="The web player on a phone"> <img src="site/img/phone-library.webp" width="200" alt="The web player's song list on a phone"><br><b>On a phone or tablet.</b> The web player plays, edits and keeps songs, and can share a Dropbox songs folder with the desktop app.</td>
</tr>
</table>

## Get it

- **In your browser:** [the web player](https://markbeachill.github.io/ukemusic/app/), nothing to install. Add it to your Home Screen to use it offline.
- **On your computer:** [the latest release](https://github.com/markbeachill/ukemusic/releases/latest): a Windows installer, Mac disk images (Apple silicon and Intel) and a Linux AppImage. They aren't code-signed, so Windows and macOS ask once before opening them; [the website](https://markbeachill.github.io/ukemusic/#get) says how.
- **From the source:** `npm install`, then `npm start` (see [Development](#development)).

## The guides

| | |
|---|---|
| [WRITING.md](WRITING.md) | How to write songs: everything you can type, with examples (also in the app: Write → How to write) |
| [INSTRUMENTS.md](INSTRUMENTS.md) | Ukulele, baritone and guitar: file names, capo, left-handed, sounds, the strum library |
| [TABLATURE.md](TABLATURE.md) | Tab: writing, pasting, key changes, other instruments, playback |
| [CHORDPRO.md](CHORDPRO.md) | What ukemusic reads and writes in ChordPro, and what it adds |
| [How ukemusic helps you learn a song](docs/explanation/learning-a-song.md) | How Learn works out a song, and how far to trust it |
| [CHANGELOG.md](CHANGELOG.md) | What's changed in each version |

The guides and the changelog are pages of [the website](https://markbeachill.github.io/ukemusic/) too, made from these files.

## Getting around the desktop app

- ukemusic opens on **Your songs** (the library): open a song, start a new one, paste one from a website or import a file. Three old, copyright-free starter songs show how songs are written.
- In a song, the tabs hold everything (File → Close goes back to your songs). **View** has the look (diagrams, text size, strum style, layout) and **Export** makes PDFs and other files in one click:
  - **File**: close, save, save as new, rename, import, paste, add to setlist;
  - **Write**: tab, strums, suggest the key, chords into words (for songs copied from websites), How to write (the guide);
  - **This song**: key, capo, instrument, tempo, time, strum;
  - **Play**: play (beside the editor, with the chord, strum and next shapes above the preview), play along (full-screen karaoke with chord shapes), Session screen (the whole song on one screen, on the TV if one is plugged in, for playing as a group; a setlist song by song), stop, practice (strum, 12-bar blues, chord change), tempo (change it while playing), tap tempo, practice (loop a section, slower, speeding up), sound;
  - **Learn**: play from memory (the chords fading), a what-comes-next quiz, trouble spots to loop, the circle of fifths, the song's changes with what each finger does (and practice for each), numbers on the sheet, play it in another key, and a learn sheet (PDF and web page in the song's learn folder). How it works out a song, and how far to trust it: [How ukemusic helps you learn a song](docs/explanation/learning-a-song.md);
  - **Settings**: opens Settings.
- The hint line under the tabs explains whatever the mouse is over.
- **Free Practice**: 40 exercises for warm-ups, chords, rhythm, fingerpicking, scales and improvisation, plus timed routines. Exercises open directly with optional help just for that exercise. The last three started exercises, your settings, scores and routines are kept between visits. Phones have a compact playing view; one-minute changes lets you enter your count afterwards. Practice backups are separate from song backups.
- The library's **Setlists** tab puts songs in order for a gig or club night and makes a **songbook PDF**. Songs can have an artist and tags to search by.
- A song can be kept in several keys; each shows in the library as "Song (in F)", and **Make this the song's key** rewrites the song itself in a new key.
- Each song has an **Info** tab (artist, year, written by, album, source, tags, difficulty, original key, time, tempo) beside Song and Notes. A song always opens on the Song tab.
- Click a chord diagram to choose another **chord shape** for the song.
- Shorthand: `[Em:2]` for a 2-beat chord, `[N.C.]` for a pause, `[C x3]` for three bars, `| C | F | % | G7 C |` for a line of bars, `(x2)` to repeat a line, `{A: D-DU-UDU}` … `{A}` for named strums, `{stop}`.
- **View → Layout**: chords above the words, in columns, in the words, or chords only.
- Strum patterns show on **one line** (time signature and tempo, arrows, letters, name), or as info boxes with the count, or plain; `{3/4 D-DUDU}` changes the time from there on.
- The song is on the left and its preview on the right, kept in step: scroll the song and the preview follows; click a preview line to jump to it in the song.

## The website and releases

- **Website:** https://markbeachill.github.io/ukemusic/ (what ukemusic does, with downloads). Its page is `site/index.html`; it finds the repository and the latest release by itself.
- **Web player:** https://markbeachill.github.io/ukemusic/app/ (for phones, tablets and any browser: play, write and edit songs, and use Free Practice; see [web/README.md](web/README.md)). It opens with public-domain songs; add your own from files, a desktop export or a shared Dropbox songs folder. Practice history stays on each device and has its own backup.
- **The website's pictures:** `npm run site-pictures` takes them all again from the app as it is (and the gallery's files), with the public-domain songs; `npm run site-pictures -- img editor` retakes just one. It needs, once: `npm install --no-save playwright pdfjs-dist@4.10.38` and `npx playwright install chromium`.
- **The website's check:** `npm run site-check` (after `node web/make.js`) checks every page as search engines do: titles and descriptions the right length, canonical addresses, one main heading, alt text, links, the sitemap. GitHub runs it before publishing the site, and a problem stops the update.
- **Installers:** made by GitHub Actions for each release (`.github/workflows/release.yml`): a Windows installer, Mac disk images (Apple silicon and Intel) and a Linux AppImage. They aren't code-signed, so Windows and macOS ask once before opening them; the website says how.

Both the website and the web player are rebuilt on every push to `main` (`.github/workflows/web.yml`).

**Every task in one place** (tests, building the web player, the website check and pictures, the UI review, the chord library, releases): [docs/how-to/maintenance-tasks.md](docs/how-to/maintenance-tasks.md).

### Making a release

1. Change `"version"` in `package.json` (and add a section to CHANGELOG.md), commit and push.
2. On GitHub: **Releases → Draft a new release**, tag `v` + the version (e.g. `v4.33.1`), **Publish release** (that version's CHANGELOG section is added to the notes by itself).
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
npm run ui-review # pictures of every screen, for reviewing the interface (see tools/ui-review/README.md)
```

Working on ukemusic with an AI assistant? [AGENTS.md](AGENTS.md) says where each kind of change goes and the rules the project keeps.

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

## Project structure

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
