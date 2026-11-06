# Discoverability: owner steps, checks and follow-up

Goes with [discoverability-audit.md](discoverability-audit.md). The code changes are done. Everything below needs your accounts or your approval, so none of it has been done for you: nothing has been submitted, posted or changed outside the repository.

## 1. After you push: check the live site (10 minutes)

The website rebuilds on push (`web.yml`). When the Actions run is green, check these from any computer.

PowerShell, one line at a time. `curl.exe` is the real curl; plain `curl` in PowerShell is something else:

```
curl.exe -s -o NUL -w "%{http_code}\n" https://markbeachill.github.io/ukemusic/practice/
curl.exe -s https://markbeachill.github.io/ukemusic/practice/ | Select-String "All 40 exercises"
curl.exe -s https://markbeachill.github.io/ukemusic/sitemap.xml
curl.exe -s -o NUL -w "%{http_code}\n" https://markbeachill.github.io/robots.txt
curl.exe -s https://markbeachill.github.io/ukemusic/app/ | Select-String "noscript"
```

What you should see:

- **The practice page:** `200`, then a line containing "All 40 exercises".
- **The sitemap:** the sitemap XML, with 16 addresses.
- **robots.txt:** `404`, which is fine. There's no robots.txt at the host root, so everything may be crawled (see 4).
- **The app:** a line containing `noscript`.

Then in a browser:

- `https://markbeachill.github.io/ukemusic/practice/` looks right on a phone, and **Start free practice** opens Free Practice in the web player.
- The home page's Free Practice section and footer link to it.
- Paste the practice page's address into https://validator.schema.org/ and https://search.google.com/test/rich-results. Both should read the structured data with no errors. A rich result isn't expected for this kind of page, and that's fine.

## 2. Google Search Console (15 minutes)

1. Go to https://search.google.com/search-console and **Add property → URL prefix**: `https://markbeachill.github.io/ukemusic/`. A "Domain" property isn't possible on github.io.
2. Verify it with **HTML tag**: Google shows a `<meta name="google-site-verification" content="…">` line.
   - Paste it into `site/index.html` just after the `<link rel="canonical" …>` line, commit, push, wait for the website to rebuild, then press **Verify**.
   - Keep the line there afterwards: removing it un-verifies the site.
3. **Sitemaps** → in "Add a new sitemap" type the **full address** `https://markbeachill.github.io/ukemusic/sitemap.xml` → Submit. It should show as `/ukemusic/sitemap.xml`; if it shows as `/sitemap.xml`, Google is looking at the top of github.io, where there's nothing: remove it and add the full address. "Couldn't fetch" straight after submitting a sitemap that does open in a browser usually clears within a day.
4. **URL inspection** → `https://markbeachill.github.io/ukemusic/practice/` → **Request indexing**. Do the same for the home page and `app/`.
5. Note the date. Indexing a new site can take days to a few weeks.

## 3. Bing Webmaster Tools (10 minutes)

1. Go to https://www.bing.com/webmasters and sign in. **Import from Google Search Console** is quickest once step 2 is done; otherwise add the site and verify with Bing's meta tag, the same way.
2. **Sitemaps** → submit `https://markbeachill.github.io/ukemusic/sitemap.xml`.
3. **URL Submission** → submit the practice page.

Bing's index also feeds several other search engines and AI assistants, so it's worth doing.

## 4. robots.txt and AI crawlers

- For a project site on GitHub Pages, only `https://markbeachill.github.io/robots.txt` counts. It would come from a repository named `markbeachill/markbeachill.github.io`, which you don't have. With no robots.txt, every crawler is allowed. That includes **OAI-SearchBot**, which OpenAI says decides whether a site can appear in ChatGPT search answers ([OpenAI's crawler page](https://developers.openai.com/api/docs/bots)). So nothing needs doing.
- A `robots.txt` inside the ukemusic project would sit at `/ukemusic/robots.txt`, which crawlers never read, so none has been added.
- **Only if you want a robots.txt** (for example to say no to training with GPTBot while staying in ChatGPT search with OAI-SearchBot): create a public repository `markbeachill.github.io` with this `robots.txt`, and turn on Pages for it (Settings → Pages → Deploy from a branch → main):

  ```
  User-agent: OAI-SearchBot
  Allow: /

  User-agent: GPTBot
  Disallow: /

  User-agent: *
  Allow: /

  Sitemap: https://markbeachill.github.io/ukemusic/sitemap.xml
  ```

  That's your choice; the brief says to respect your preferences. Leaving it as it is (everything allowed) is the simplest.

## 5. The GitHub repository page (5 minutes)

On https://github.com/markbeachill/ukemusic, press the ⚙ beside **About**:

- **Description:** `Free, open-source ukulele app: chord sheets, play-along and karaoke, learn songs by heart, and Free Practice with 40 exercises. Web player and Windows/Mac/Linux.`
- **Website:** `https://markbeachill.github.io/ukemusic/`
- **Topics:** `ukulele`, `music-education`, `music-practice`, `chord-sheets`, `chordpro`, `guitar`, `baritone-ukulele`, `electron`, `pwa`, `open-source`
- Tick **Releases** so the latest release shows.

The search engines and AI assistants that read GitHub use these more than anything else on the page.

## 6. Places to tell people about it (approve each one first)

Each of these has its own rules about promotion: read them before posting, say plainly that you made it, and post once. Don't use fake reviews, posts from other accounts, or copy-pasted posts across many places.

| Where | Why | What to post |
|---|---|---|
| **AlternativeTo** (alternativeto.net) | It came up in the baseline search for "open source ukulele learning software"; developers can add their own software | A listing as an alternative to Yousician, Ukulele Tuner & Learn Uke, Chordify. Licence: MIT; platforms: web, Windows, Mac, Linux |
| **r/ukulele** (Reddit) | The biggest ukulele community; check its rules on self-promotion first | A short "I made a free, open-source practice app" post with a picture of Free Practice and the link to `/practice/` |
| **Ukulele Underground forum** | Long-running ukulele forum with a software/apps area | The same, adapted |
| **Your own ukulele club or teacher** | Real users, who might write about it | The Teach page and the Session screen |
| **Hacker News "Show HN"** | Open-source projects get read and linked | "Show HN: ukemusic, an open-source ukulele practice and chord-sheet app" |
| **Awesome lists on GitHub** (search GitHub for awesome-music and awesome-music-education) | Curated lists that crawlers trust | A one-line pull request in each list's format |
| **A short video or blog walkthrough** | Shows the free practice as it really is | Five minutes: Start here → one-minute changes → a routine → a song with karaoke |

A factual description to adapt:

> ukemusic is free, open-source (MIT) software for learning and practising ukulele. Free Practice has 40 exercises in six categories (warm-ups, chord changes, strumming, fingerpicking, scales and melody, improvising), shown on a moving fretboard in time with a metronome, with routines and progress kept on your device. It comes with 10 public-domain songs to play along with, sing with karaoke and learn by heart. It runs in any current browser with nothing to install and no account, and as a desktop app for Windows, Mac and Linux. https://markbeachill.github.io/ukemusic/practice/

## 7. Checks to repeat after each release

Repeat after any release that changes Free Practice or the songs. Steps 1 and 2 are covered by `npm test` (`test/discoverability.test.js`); the rest are by hand:

1. The practice page still lists every exercise. It's made from `src/practice-catalog.js`, so this is automatic, but the "39" in the home page, `README.md`, `web/build.js` and the practise page is typed by hand: update it if the number changes (the test checks the home page).
2. The structured data parses and says what the page says.
3. The live URLs return 200 and readable HTML without JavaScript (step 1 above).
4. Search Console → Pages: the practice page is **Indexed**; any "Excluded" reason is understood.
5. Search for the five queries below and note the date and what came up.

## 8. 30-day follow-up

| When | What |
|---|---|
| Day 0 | Push; check the live site (1); Search Console (2); Bing (3); GitHub About (5) |
| Day 2–3 | Search Console → URL inspection on `/practice/`: crawled? If "Discovered – currently not indexed", wait; don't resubmit daily |
| Day 7 | Search `site:markbeachill.github.io/ukemusic` on Google and Bing. Post in one or two places from 6, if you approve |
| Day 14 | Search Console → Performance: any impressions? Which queries? |
| Day 30 | Repeat the baseline searches and add a dated row to the table below: `open source ukulele learning software`, `free ukulele chord change practice app`, `ukulele fingerpicking practice open source`, `ukemusic ukulele practice`, `free ukulele practice exercises browser`. Ask an AI assistant with web search "What free, open-source software is there for learning and practising ukulele?" and note whether ukemusic is mentioned and what it says |

None of this guarantees a ranking or an AI recommendation. It makes sure the evidence is there, accurate and readable when they look.

### Search log

| Date | Engine / assistant | Query | ukemusic found? | Notes |
|---|---|---|---|---|
| 2026-11-04 | Claude's web search tool | the four baseline queries | No | Before these changes; see the audit |
