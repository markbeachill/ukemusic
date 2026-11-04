# Discoverability audit: search engines and AI assistants

Audited 4 November 2026 against `main` at `3fc47aa` (ukemusic 4.54.0), for the brief *UKEmusic AI Search Discoverability*. The goal is to make it easy for a search engine or an AI research assistant to find accurate, public evidence of what ukemusic does, what's free, and how to try it. This isn't about gaming rankings.

## Summary

- **The problem is discoverability, not features.** ukemusic has a substantial free practice section, but the public evidence for it is thin.
- **ukemusic doesn't appear in search yet.** None of the four test queries returned it, not even a search for its own name (see Baseline). The likeliest reason is that the site hasn't been indexed: there's no sitemap, no Search Console or Bing property, and few links from elsewhere.
- **What a crawler can read is thin on practice.**
  - The home page's title and description are about chord sheets.
  - The Practise page mentions "39 exercises" in one sentence and lists none of them.
  - The web app's HTML is the app itself, titled "ukemusic web", with no description.
- **There are no canonical URLs, no structured data and no sitemap anywhere.** The `og:image` on the home page is relative, which share previews can't use.
- **One out-of-date claim:** the home page says "Writing and editing songs needs the desktop app". The web player has edited songs since 4.47.

## How the site is built and published

| Item | Finding |
|---|---|
| Hosting | GitHub Pages, project site at `https://markbeachill.github.io/ukemusic/`, published by `.github/workflows/web.yml` on every push to `main` |
| Build | `node web/make.js`: builds the web player into `web/out` (served at `/app/`), then writes the generated pages into `site/` (`web/docs.js`: guide, ChordPro, What's new, How Learn works; `web/pages.js`: Learn, Practise, Perform, Teach, Chord sheets, Your songs, Phone and tablet, Dropbox, Gallery) |
| Hand-written | `site/index.html` (home page); the generated pages take its CSS |
| Generated pages in git | No: they're in `.gitignore` and made on each build |
| Rendering | Every site page is static HTML; the text is there without JavaScript. The web player at `/app/` is rendered by JavaScript (its markup has button labels, little prose) |
| robots.txt | None in the project. For a GitHub Pages project site only the host root counts (`https://markbeachill.github.io/robots.txt`), which is served by a user-site repository `markbeachill/markbeachill.github.io`. That repository doesn't exist (checked with `git ls-remote`), so the host root has no robots.txt, and crawlers treat that as "everything allowed" |
| noindex | None found in any page or the app |
| Sitemap | None |
| Canonical | None |
| Structured data | None |
| Tracking | No analytics or tracking scripts on the site or in the app. Fonts load from Google Fonts |
| Accounts | None: nothing to sign up for. The only sign-in is the optional Dropbox connection in the web player |

**Couldn't check from here:** this session's network allowlist blocks `markbeachill.github.io` and GitHub's web pages and API. So the live pages, the live robots.txt, the repository's About text and topics, and the release downloads were checked from the source, `git ls-remote` and search results instead. The verification checklist below repeats these checks for you to run on the live site.

## Baseline: searches (4 November 2026)

Run with this session's web search tool, which isn't Google or Bing, so treat this as a snapshot of one engine:

| Query | ukemusic in results? | What came up instead |
|---|---|---|
| `open source ukulele learning software` | No | Small GitHub projects (ukulele chord trainers, "ukulele companion"), AlternativeTo |
| `free ukulele chord change practice app` | No | App Store apps (Ukulele Chord Changer, ChordChanges), a JustinGuitar thread on one-minute changes |
| `ukulele fingerpicking practice open source` | No | Lesson sites (ukutabs, Ukulele Tricks), PDFs |
| `UKEmusic ukulele practice` | No | Unrelated ukulele practice pages |
| `markbeachill ukemusic` | No | Unrelated |

So the first job is getting indexed at all (sitemap, Search Console, Bing, links from the repository and from elsewhere), then making what's indexed say clearly what the practice offers.

## Verified product facts

Each was checked in the source at `3fc47aa`. Only these go into the new copy.

| Claim | Verified | Where |
|---|---|---|
| Free Practice has **39 exercises** | Yes | `src/practice-catalog.js` `EXERCISES` (39) |
| In **six exercise categories**, plus **My routine** (seven in the app's list) | Yes | `CATEGORIES`: Warm-ups & finger work 7, Chords & changes 7, Strumming & rhythm 8, Fingerpicking 5, Scales & melody 6, Noodling & creativity 6; My routine holds routines, not exercises |
| Levels: **14 beginner, 15 improver, 10 intermediate** | Yes | `level` on each exercise |
| **Two ready-made routines** (10-minute daily; 5 minutes before playing), and your own | Yes | `DEFAULT_ROUTINES`; routines editor in the practice code |
| **Seven common progressions** in any key (I–V–vi–IV, the 50s, three-chord trick, vi–IV–I–V, ii–V–I, vi–ii–V–I, I–IV–I–V) | Yes | `PROGRESSIONS` |
| **Six short tunes** for melody practice (Twinkle Twinkle, Ode to Joy, Frère Jacques, When the Saints, Mary Had a Little Lamb, Scarborough Fair opening) | Yes | `src/note-exercises.js` `MELODIES` |
| **Metronome** with tap tempo; tempo set per exercise, slower/faster | Yes | `metronome` exercise, `tapTempo`; tempo controls |
| **Progress:** time today, days in a row, last and best tempo per exercise, one-minute scores, clean rounds | Yes | `web/pr_js.js` (`prToday`, card meta, `PP.bestScore`, "✓ That was clean") |
| **Feedback is self-assessed:** it doesn't listen to you play | Yes | No microphone or pitch detection anywhere (`getUserMedia` absent); you press "That was clean" and count one-minute changes yourself |
| **All of Free Practice is in the free web player** | Yes | One shared practice section: `tools/sync-practice.js` keeps `web/pr_*` identical to the desktop's, checked on every build |
| Progress is kept **on the device** (browser storage on the web, `practice.json` in the songs folder on the desktop), with its own backup | Yes | `web/README.md`, `pr_js.js` |
| **Works offline** once opened (installed on a Home Screen or in the browser) | Yes | `sw.js` service worker, `web/build.js` (4.45) |
| **No account** needed | Yes | No sign-up anywhere |
| **Public-domain songs:** 10 with words and chords, in the web player and the desktop app; the desktop's starter library also has 6 templates without words (later songs whose rights vary by country) | Yes | `public domain songs/Public Domain Songs`, `web/make.js` (skips "needs words") |
| The 10: Amazing Grace, Brahms' Lullaby, Danny Boy, House of the Rising Sun, It's a Long Way to Tipperary, Nobody's Fault but Mine, Ode to Joy, Scarborough Fair, Shenandoah, The Wild Rover, each with a rights note in its `notes.txt` | Yes | Each song's `notes.txt` "Rights:" line |
| Platforms: desktop app for **Windows, macOS, Linux** (Electron; release builds for all three); web player in any modern browser (Safari, Chrome, Edge, Firefox) | Yes | `.github/workflows/release.yml`, `package.json` |
| **Licence: MIT**, © 2026 Mark Beachill | Yes | `LICENSE` |
| Sounds: FreePats ukulele samples, **CC0** | Yes | `THIRD_PARTY_NOTICES.md` |

Correction to the brief: "seven categories" is right only if My routine is counted. It holds routines, not exercises, so the copy says "39 exercises in six categories, plus routines".

## Gaps found

| # | Gap | Fix in this change |
|---|---|---|
| 1 | No page describes Free Practice in full, as text | New `/practice/` page, generated from the practice catalogue itself, so it can't drift from the app |
| 2 | Home page title and description don't mention practice, free or open source | New title and description |
| 3 | No canonical URLs; relative `og:image` | Canonical, `og:url` and absolute `og:image` on every page |
| 4 | No structured data | JSON-LD on the home page and `/practice/`, matching what each page says |
| 5 | No sitemap | `sitemap.xml`, generated with the pages |
| 6 | Web app has no description, title "ukemusic web", no text without JavaScript | Title, description, canonical and a `<noscript>` summary with links; `app/#practice` opens Free Practice directly |
| 7 | README's first screen doesn't mention Free Practice or the free web app's practice | A short "What is ukemusic?" answer and a Free Practice link at the top |
| 8 | Home page says the web player can't write or edit songs | Corrected |
| 9 | Not submitted to Search Console or Bing | Owner action: checklist in `docs/discoverability-checklist.md` |
| 10 | Repository About text and topics unknown (couldn't check) | Owner action: suggested text in the checklist |

## What changed, and how it was checked

| File | Change | Why |
|---|---|---|
| `web/pages.js` | New `PRACTICE_PAGE` (`practice/index.html`), made from `src/practice-catalog.js`, `src/note-exercises.js` and the starter songs; canonical, Open Graph and JSON-LD in every generated page; `sitemap.xml`; a footer link and a link from the Practise page | Gaps 1, 3, 4, 5 |
| `site/index.html` | Title, description, canonical, Open Graph (absolute image), JSON-LD (`WebSite`, `SoftwareApplication`, `WebApplication`, `SoftwareSourceCode`); links to `practice/`; real `href`s for GitHub and releases (the script still fills them in); outdated "needs the desktop app" sentence fixed | Gaps 2, 3, 4, 8 |
| `web/build.js` | The web player's title, description, canonical and a `<noscript>` summary with links | Gap 6 |
| `web/app.html` | `app/#practice` opens Free Practice | "Start free practice" lands in the right place |
| `README.md` | "What is ukemusic?" at the top; Free Practice link | Gap 7 |
| `.gitignore` | `site/practice/`, `site/sitemap.xml` (made on each build, like the other generated pages) | Project convention |
| `test/discoverability.test.js`, `package.json` | Tests that the page matches the catalogue, links work from its folder, structured data parses and matches, the sitemap is complete, and the app and README say what they should | Keeps it from drifting |
| `AGENTS.md` | Where these things live | For the next person or AI |
| `docs/discoverability-checklist.md` | Owner steps, live checks, outreach, 30-day follow-up | Gaps 9, 10 |

Checked on a local copy of the built site (`node web/make.js`, then `site/` and `web/out/` arranged as `web.yml` arranges them, served at `/ukemusic/`):

- **Without JavaScript:**
  - `/practice/` returns 200 with about 1,500 words of text: one H1, seven H2s, all 39 exercises with their levels and aims, the routines, the 10 songs and the FAQ.
  - The home page and `/app/` return their new titles, descriptions and canonical addresses.
  - `/app/` has the `<noscript>` summary.
- **Structured data:** every JSON-LD block parses (`JSON.parse`), and every claim in it is on the page it's on.
- **Links:** every relative link and picture on `/practice/` goes one level up and resolves (200); `sitemap.xml` has 16 addresses, all pages that exist.
- **In a browser (Playwright, Chromium):**
  - `/practice/` lays out at 1280 px and at 390 px (phone) with no sideways scrolling.
  - `app/#practice` opens Free Practice, and `app/` without it doesn't.
  - No script errors.
- **Accessibility:** axe-core 4.10 finds no WCAG 2 A or AA problems on `/practice/` at 1280 px or 390 px.
- **Tests:** `npm test` passes, including the new `test/discoverability.test.js`.
- **Not checked:** the live site (blocked from this session; see the checklist, step 1), and external validators (validator.schema.org, Google's Rich Results Test), which need the live address.
