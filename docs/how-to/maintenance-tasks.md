# Maintenance tasks

How to run every job that keeps ukemusic working and its website up to date: the tests, the builds, the website's pictures and check, the UI review, the chord library, and making a release. Each section says **what it's for, when to run it, the command, how long it takes, and where the result goes**.

All commands are run in the project folder (`C:\Users\markb\Desktop\cowork\ukemusic` on Mark's computer). In PowerShell, type **one command per line**: PowerShell doesn't understand `&&`.

## Commands at a glance

| Command | What it does | Time | Result |
|---|---|---|---|
| `npm start` | Runs the desktop app from the code, with your own songs and settings | seconds | the app opens |
| `npm test` | Runs every test | ~20 s | `✓` per test; a `✗` names any that fail |
| `npm run build:web` | Builds the web player and the website's generated pages | 1–2 min | `web/out/`, pages and sitemap in `site/` |
| `npx serve web/out` | Serves the built web player so you can try it in a browser | until Ctrl+C | http://localhost:3000 |
| `npm run site-check` | Checks every website page as search engines do (titles, descriptions, addresses, headings, alt text, links, sitemap) | seconds | `all 19 pages pass`, or a list of problems |
| `npm run site-pictures` | Retakes every website picture and the gallery from the app as it is now | ~10 min | `site/img/`, `site/gallery/` |
| `npm run site-pictures -- img editor` | Retakes just those pictures (names without `.webp`) | 1–2 min | those files in `site/img/` |
| `npm run ui-review` | Pictures of every screen (desktop, iPad, iPhone) in one review page | 20–30 min | `UI review/index.html` |
| `npm run ui-review -- desktop R` | Just one app and section of the UI review | a few min | the same page, those screens retaken |
| `node tools/sync-practice.js` | Checks Free Practice is the same in the desktop app and the web player | a second | `Desktop/web practice parity checked.` |
| `node tools/sync-practice.js --from-web` | Copies Free Practice changes made in the web files into `index.html` | a second | `index.html` updated |
| `npm run build:chords` | Rebuilds the chord libraries from chords-db and the hand-checked shapes | seconds | `src/chords*.json` |
| `npm run build` | Makes the desktop app, unpacked, to try | a few min | `dist/` |
| `npm run package:win` | Makes a Windows installer here (`package:mac`, `package:linux` likewise) | a few min | `dist/*.exe` |
| `node tools/release-notes.js v4.63.0` | Prints that version's CHANGELOG section (GitHub uses it for release notes) | a second | the notes, on screen |
| `git push` | Sends your commits to GitHub: the tests run, and the website is rebuilt and published | ~5 min on GitHub | Actions → Tests, Website |
| GitHub: Releases → Draft a new release | Builds the installers and adds them and the notes to the release | ~15 min on GitHub | the release page |

## Which task, when

| You've… | Run | Section |
|---|---|---|
| changed any code | `npm test` | [Tests](#tests) |
| changed the web player, Free Practice or anything in `src/` the web uses | `npm run build:web`, then try it | [Build the web player](#build-the-web-player) |
| changed the website (`site/`, `web/pages.js`, `web/docs.js`) | `npm run build:web`, then `npm run site-check` | [Website check](#website-check) |
| changed what a screen looks like | `npm run ui-review` (or just that part) | [UI review](#ui-review) |
| changed a screen that the website shows | `npm run site-pictures` (or just that picture) | [Website pictures](#website-pictures) |
| changed Free Practice's screens | `node tools/sync-practice.js` | [Free Practice: desktop and web the same](#free-practice-desktop-and-web-the-same) |
| changed the hand-checked chord shapes | `npm run build:chords` | [Chord library](#chord-library) |
| finished a version | the release steps | [Making a release](#making-a-release) |
| pushed to GitHub | nothing: the tests and the website run by themselves | [What GitHub does by itself](#what-github-does-by-itself) |

## Before the first time

Once, on a new computer:

```
npm install
```

For the UI review and the website pictures (they drive the app and a browser by themselves):

```
npm install --no-save playwright pdfjs-dist@4.10.38
npx playwright install chromium
```

For building the web player:

```
npm install --no-save --prefix web esbuild@0.24.0
```

The web player's sounds are converted with **ffmpeg**. Without it the build still works and says `ffmpeg not found: skipped` for each sound; GitHub has ffmpeg, so the published web player always has its sounds.

`--no-save` means these extras aren't added to `package.json`. **`npm install` can remove them again**, so if a task later says it can't find Playwright, pdf.js or esbuild, run its install line again. After Playwright is installed or updated, `npx playwright install chromium` is needed once more (the UI review checks for this before it starts).

## Run the app

```
npm start
```

The desktop app from the code as it is, with your own settings and songs.

## Tests

```
npm test
```

**When:** after any change, and always before committing. About a minute.

It runs every file in `test/` (the list is the `test` script in `package.json`). Each newer feature has `test/vNNN.test.js`, named after the version it arrived in; a new feature gets its own file, added to that list. Most tests call the code in `src/` directly; tests of `index.html` and `web/app.html` read the file and check what's in it.

If one fails, the line starting `✗` names the test, and the lines after it say what was expected and what came out.

## Build the web player

```
npm run build:web
```

**When:** after changing the web player (`web/app.html`), Free Practice, the website's pages, or anything in `src/` that the web player uses. A minute or two.

It writes:
- `web/out/`: the web player (`index.html`, its offline copy, the sounds, the public-domain songs);
- the website's generated pages in `site/` (the guide, ChordPro, What's new, How Learn works, Learn, Practise, Perform, Teach, Chord sheets, Bring your songs, Phone and tablet, Dropbox, Gallery, `practice/`) and `site/sitemap.xml`.

These are all made again on every build, so they're kept out of git (`.gitignore`). GitHub builds them itself when it publishes the website.

**To try the web player on your computer:** it needs a small web server, because the offline copy and the songs don't load from a file. One way:

```
npx serve web/out
```

then open the address it prints (usually http://localhost:3000). Ctrl+C stops it.

## Website check

```
npm run build:web
npm run site-check
```

**When:** after changing the website. A few seconds (after the build).

It checks every page of the finished website the way search engines do (Bing's Site Scan, Google Search Console):
- a title of 25 to 70 characters, and a description of 50 to 160, with no two pages the same;
- a canonical address (the page's own) and a language;
- one main heading;
- alt text on every picture;
- every link and file on the site that a page points to is there;
- the sitemap lists every page, and nothing that isn't a page.

`Site check: all 19 pages pass` means it's fine. Otherwise each problem is listed with its page, for example `perform.html: title too short (18 characters, at least 25)`.

GitHub runs the same check before it publishes the website, and **a failing page stops the update** (the live site stays as it was). The problem is listed in the run on GitHub (Actions → Website).

Titles and descriptions of the generated pages are in `web/pages.js` (`seoTitle` and `blurb`) and `web/docs.js`; the home page's are in `site/index.html`; the web player's in `web/build.js`. The check itself is `tools/site-check.js`.

## Website pictures

```
npm run site-pictures
```

**When:** after changing a screen that the website or README shows. About 10 minutes; windows open and close by themselves, so leave the computer alone until it says `done`.

It takes every picture in `site/img/` again from the app as it is now, and makes the gallery's files (`site/gallery/`: the PDFs, web page, ChordPro, Markdown and lyrics files of three public-domain songs, and their thumbnails). It runs the desktop app with its own settings and a copy of the public-domain songs, so your own songs and settings are left alone. The phone pictures are the web player as an iPhone.

Only part of it:

```
npm run site-pictures -- img
npm run site-pictures -- gallery
npm run site-pictures -- img editor playing
```

(the last one retakes only `editor.webp` and `playing.webp`: picture names without `.webp`).

**Never changed:** `site/img/session.webp` (a real photo), so it's left out on purpose.

Afterwards, look at the pictures (git shows which changed), then build the website (`npm run build:web`) and run the website check. Each picture is described in `tools/site-pictures.js`; the pages that use them are `site/index.html`, `web/pages.js` and `README.md`.

## UI review

```
npm run ui-review
```

**When:** after changing what screens look like, and before a bigger release, to look over the whole interface. 20 to 30 minutes; windows open and close by themselves.

It takes a picture of every screen of the desktop app, and of the web player on an iPad and an iPhone, and puts them in one page: open `UI review/index.html` in a browser. There you can go through each app, compare the three side by side, and type review notes. Each screen has an id (like `R3`) so it can be talked about.

Only part of it:

```
npm run ui-review -- desktop
npm run ui-review -- desktop R A
npm run ui-review -- ipad iphone F
npm run ui-review -- --page
```

(section letters: L Library, S Song sheet, P Playing, R Learn, A Accompaniment, E Writing and editing, X Export and download, G Settings, F Free Practice, D Devices and sync; `--page` only remakes the page from the pictures already taken).

If screens are missing, `UI review/run-log.txt` has a line starting `!!` for each step that failed, and the page marks them with an orange ring. The `UI review` folder is made again each time and isn't committed.

Everything else (adding a screen, how it works) is in `tools/ui-review/README.md`.

## Free Practice: desktop and web the same

```
node tools/sync-practice.js
```

**When:** after changing Free Practice. A second.

Free Practice's screens are written once, in `index.html`, and the web player uses a copy: `web/pr_markup.html`, `web/pr_css.css` and `web/pr_js.js`. This checks the copy is the same as the desktop's; the web build and the tests run it too. `Desktop/web practice parity checked.` means they match. If they differ:
- after changing the web copies: `node tools/sync-practice.js --from-web` brings the change into `index.html`;
- after changing `index.html`: make the same change in the web copy (it's the Free Practice part of `index.html` without the Learn shortcuts).

## Chord library

```
npm run build:chords
```

**When:** only after changing the hand-checked chord shapes (`tools/hand-checked/`) or updating the chords-db package. Seconds.

It makes `src/chords.json` (ukulele), `src/chords-baritone.json` and `src/chords-guitar.json` from the chords-db data, with the hand-checked shapes first, checking every shape note by note. Then run `npm test`.

## Installers on your computer

```
npm run build
npm run package:win
```

`npm run build` makes an unpacked app in `dist/` to try; `npm run package:win` (or `package:mac`, `package:linux`) makes an installer in `dist/`. The installers people download aren't made this way: GitHub makes them for each release (below). `dist/` isn't committed.

## Committing and pushing

Run `npm test` first. Then commit only the files you changed, by name:

```
git status
git add index.html src/learn.js test/v463.test.js
git commit -m "What changed"
git push
```

Don't use `git add -A` or `git add .`: the folder holds things that must stay out of the repository (your own songs in folders like `mysongs (2)/`, which are under copyright). `.gitignore` keeps the usual ones out, but not every copy.

## Making a release

1. **The version and its notes** (as in AGENTS.md):
   - raise `"version"` in `package.json`, and in both places at the top of `package-lock.json`;
   - add a section to the top of `CHANGELOG.md`: `## v4.63.0`, then what changed in plain words (a test fails without it);
   - add a row to the table in `HANDOVER.md`;
   - add `test/vNNN.test.js` for what changed, and list it in the `test` script.
2. `npm test`, then commit and push.
3. On GitHub: **Releases → Draft a new release**. Tag and title: `v` and the version (`v4.63.0`), created from `main`. The notes can be left empty: that version's CHANGELOG section is added by itself. **Publish release**.
4. About 15 minutes later the release has the Windows installer, the Mac disk images and the Linux AppImage, and the website's download buttons point at them. Its progress is under Actions → Installers.

If the release is wrong (for example made from a commit that still had the old version number): delete it on GitHub, delete its tag (`git push origin --delete v4.63.0`), fix and push, then make it again.

## What GitHub does by itself

| When | What | Where to see it |
|---|---|---|
| every push | the tests (`npm test`) | Actions → Tests |
| every push to `main` | builds the website and the web player, runs the tests and the website check, and publishes the site at https://markbeachill.github.io/ukemusic/ (a failing test or check stops it) | Actions → Website |
| a release is published | builds the installers on Windows, Mac and Linux and adds them and the CHANGELOG notes to the release | Actions → Installers |

A red cross on a run means it stopped: open the run, then the step with the cross, to see why. The live website stays as it was until a run succeeds.

## Search engines

After a release that changes the website, or now and then:
- **Google Search Console** and **Bing Webmaster Tools**: the sitemap is `https://markbeachill.github.io/ukemusic/sitemap.xml`. Both show pages they couldn't read and what they found.
- **Bing Site Scan**: run a new scan every month or two. Anything it lists that `npm run site-check` doesn't catch can be added to `tools/site-check.js`.

`docs/discoverability-checklist.md` has the step-by-step checks and the GitHub About text.

## Where things are

| | |
|---|---|
| The tasks themselves | `package.json` (`scripts`) and `tools/` |
| GitHub's automatic runs | `.github/workflows/` (`test.yml`, `web.yml`, `release.yml`) |
| Which file to change for what | `AGENTS.md` |
| Every version's changes, for people | `CHANGELOG.md` (also the website's What's new page) |
| Every version's changes, for developers | `HANDOVER.md` |
