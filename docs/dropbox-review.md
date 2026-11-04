# Review: Dropbox, the iPad and the songs folder

Reviewed 4 November 2026 against ukemusic 4.54.0: the web player (`web/app.html`, Cloud), the sync planning (`src/cloud-sync.js`), file import (`src/song-files.js`), the desktop's saving (`src/song-library.js`), and the help pages (`site/phone.html`, `site/dropbox.html`). It also looks at your own setup: the `mysongs` folder on your PC.

**For the steps themselves, see [Your songs on the iPad, step by step](ipad-step-by-step.md).** This document is the review behind them.

## In short

- **Nothing here costs money.** The money you may be thinking of is Apple's developer programme ($99 a year, about £79 in the UK), which you'd need for a native iOS app. The web player avoids that: it runs in Safari or as a Home Screen icon. A **Dropbox app key** is free: you make one at dropbox.com/developers in about five minutes, and it isn't a secret.
- **There are three ways to get songs onto the iPad.** Only the first needs the key:
  1. **Dropbox sync:** live and both ways, but needs the key.
  2. **The Files app:** Dropbox's iOS app shows your Dropbox in Files, so **Add songs from files…** can read songs from it. One way in, by hand, and no key needed.
  3. **A file through iCloud Drive or email:** Phone and tablet… → Save songs for the web player…, and back again.
- **Your songs aren't in Dropbox yet.** Your songs folder is `mysongs` in `Desktop\cowork\ukemusic`, and this PC has no Dropbox folder, so there is nothing to sync from today.
- **A song is a folder, not just a text file.** The text file alone works, but `song.ini` holds the key, tempo, time, capo and strum that make playback right. Higher Ground, for example, plays at 136 because of its `song.ini`. Keep the folder together.
- **There's one real risk.** If a song is open on the computer while you change it on the iPad, saving on the computer replaces the iPad's change without telling you. The iPad's version is kept in the song's history, so nothing is lost, but it's easy to miss. Recommendation 1 fixes it.

## How it works

```
 PC                                   Dropbox (the cloud)                iPad
 ukemusic desktop                                                        ukemusic web player
   reads and writes   <-- Dropbox's own  -->  your songs folder  <-- Dropbox API, signed in -->  keeps its own copy
   Dropbox\Songs\...       PC app syncs       (every file)             as you, with the app key     of each song, works
                           every file                                  (song text, song.ini,        offline, syncs when
                                                                        notes.txt only)              it opens / after edits
```

- **On the PC**, ukemusic doesn't know about Dropbox at all. It reads and writes an ordinary folder, and Dropbox's PC app copies every file in it to the cloud and back. Song files, `song.ini`, notes, links, exports, history, learn files, setlists and `practice.json` all go.
- **On the iPad**, the web player signs in to Dropbox as you (Dropbox's sign-in page, with PKCE, so no password or secret is stored in ukemusic). It then reads and writes **three files per song**: `<Title>-song.txt`, `song.ini` and `notes.txt`. It keeps its own copy of each song on the iPad, so songs work with no connection.
- **When it syncs:** when the web player opens or you come back to it, about 8 seconds after you change a song, when the connection comes back, and when you press **Sync now**.
- **How it decides what to do:** each song remembers the Dropbox file versions it last matched (`src/cloud-sync.js`, `planSync`). So it knows whether:
  - only Dropbox changed (it brings that in);
  - only the iPad changed (it sends that);
  - both changed (it brings Dropbox's in, and keeps the iPad's as "… (changed on this device)").
- **Deleting and renaming:** a song deleted on the iPad is moved to `Archived songs` in Dropbox, not deleted. A rename on the iPad renames the folder and the song file, as the desktop's Rename does.

## The three ways compared

| | 1. Dropbox sync | 2. Files app (Dropbox iOS app) | 3. File via iCloud / email |
|---|---|---|---|
| Needs | Dropbox account (free), songs folder in Dropbox, a free app key | Dropbox account and its iOS app | Nothing extra |
| Direction | Both ways, automatic | Into the iPad only; back via **Back up all songs** → Save to Files → Dropbox, then **Phone and tablet… → Bring in songs** on the PC | Both ways, by hand |
| Changes on the iPad reach the PC | Within seconds of a sync | When you send a backup back and bring it in | Same as 2 |
| Best for | You, every day | Trying it out, or a club member who only reads | Occasional top-ups |

To bring a song in with its `song.ini` and notes by routes 2 and 3, choose a **zip** of its folder (or of the whole songs folder), not just the text file. On an iPad, press and hold a folder in Files and choose **Compress** to make the zip. The desktop's Save songs for the web player… file already carries everything.

## Setting up Dropbox sync for you

1. **Back up first.** Copy `mysongs` somewhere outside Dropbox.
2. **Install Dropbox on the PC** (a free Basic account is fine) and move your songs folder into it, e.g. `Dropbox\ukemusic songs`. 13 MB and 385 files is tiny against Basic's 2 GB. Moving it out of the code folder also keeps your songs apart from the code.
3. **Point the desktop app at it:** Settings → Songs folder. Check the songs open, then quit the app before the next step so nothing is mid-save.
4. **Make the app key** at dropbox.com/developers/apps (the full steps are in the step-by-step guide):
   - **Create app** → Scoped access → App folder (or Full Dropbox) → a name such as `ukemusic-mark`;
   - **Permissions:** tick `files.metadata.read`, `files.metadata.write`, `files.content.read` and `files.content.write`;
   - **OAuth 2:** add `https://markbeachill.github.io/ukemusic/app/` as a Redirect URI, and set **Allow public clients (PKCE)** to Allow.
5. **Optional:** put the key into `DROPBOX_APP_KEY` in `web/app.html` and publish. Then nobody, including you on a new device, has to type it. It's safe in a public repo; it identifies the app, it isn't a password.
6. **On the iPad**, open ukemusic **from its Home Screen icon**, not Safari. The icon keeps its own songs, separate from Safari's. Then:
   - Dropbox… → **Connect with a code**: the Home Screen app can't come back from Dropbox's page by itself, so Dropbox shows a code to paste back;
   - choose the songs folder (the one with a folder per song) → **Use this folder** → **Sync now**.

**The free limits don't get in the way:**
- Dropbox Basic's three-device limit counts Dropbox's own apps (your PC, plus the iPad if you install Dropbox there), not apps like ukemusic that use the API ([Dropbox forum, staff answer](https://community.dropbox.com/en/discussion/comment/334662)).
- A new app key is in "development". Up to 500 people can link it, and production approval is needed only after 50 have ([as quoted from Dropbox's developer guide](https://github.com/edgm74/chorustr-community/issues/562)). For you and a few friends, that's never.

## Which files, and who uses them

Per song folder:

| File | What it holds | Desktop | Web player (Dropbox sync) | Needed? |
|---|---|---|---|---|
| `<Title>-song.txt` | Words, chords, strums, sections, tab | ✓ | ✓ | **Yes**: the song itself |
| `song.ini` | Key, tempo, time, capo, instrument, strum, saved keys, the song's own settings | ✓ | ✓ | **Strongly**: without it playback uses the defaults (tempo, time, strum) |
| `notes.txt` | Notes and history lines | ✓ | ✓ | Nice to have |
| `links.txt` | Links (YouTube…) | ✓ | ✗ ignored | Nice to have; see recommendation 2 |
| `learn/` | Trouble spots, learn and pick sheets | ✓ | ✗ (the iPad keeps its own) | Per device |
| `.history/` | Earlier versions | ✓ (writes them) | ✗ | Safety net on the PC |
| `exports/` | PDFs, web pages, Stage copies | ✓ | ✗ | Copies only, made again any time |

At the top of the songs folder:

| Item | Desktop | Web player |
|---|---|---|
| `Setlists/` | ✓ | ✗ (the web player has no setlists) |
| `Archived songs/` | ✓ | Deleted songs go here; never read |
| `practice.json` | ✓ (practice progress) | ✗ (kept in the browser, with its own backup) |

**So, does a song need more than the text file?** To be a song, no. A loose `…-song.txt`, or a ChordPro or chord-sheet file, comes in fine. To *play* properly, yes: keep `song.ini` with it, and keep each song as its own folder. The web player only syncs folders laid out as `Songs folder/<Title>/<Title>-song.txt`. A song file sitting loose in the songs folder, or two levels down, isn't seen.

**What to share:** share only the songs folder, never the whole of Dropbox. For a club, use a separate shared folder (site/dropbox.html covers permissions), and keep your own arrangements outside it.

## Risks and gaps found, with recommendations

1. **High: the desktop doesn't notice a song changed in Dropbox while it's open.**
   - What happens: `saveSong` writes over whatever is on disk. The previous file goes to `.history` first, so the iPad's edit isn't lost, but no one is told. The help page asks you to reopen the song, which is easy to forget.
   - Fix: remember the file's modified time when a song opens. When the window regains focus, or before saving, check it again. If the file has changed, offer **Load the new version** or **Keep mine (theirs goes to history)**.
2. **Medium: links aren't synced or shown on the iPad.**
   - Your songs' YouTube links are exactly what you want when practising on the iPad.
   - Fix: sync `links.txt` as a fourth file (the same pattern as `notes.txt` in `cloud-sync.js`) and show the links on the song screen.
3. **Medium: edits on the iPad leave no history.**
   - The PC keeps `.history`; the web player doesn't.
   - The safety net is Dropbox's own version history, 30 days on Basic ([Dropbox help](https://help.dropbox.com/delete-restore/recover-older-versions)): dropbox.com → the file → Version history.
   - Fix: the web player could upload the previous text to `.history/<Title> <date>.txt` before overwriting a song, so the desktop's Changes… window shows iPad edits too.
4. **Medium: trouble spots don't travel.**
   - What Learn marks on the PC (`learn/trouble-spots.json`) and on the iPad stay apart.
   - Fix: syncing that one file would make Learn follow you between devices. It's a small file, but it changes often, so merge rather than overwrite.
5. **Low: every sync lists the whole songs folder.**
   - `list_folder` is recursive, so each sync lists every export, history and learn file. That's about 400 entries for your songs today, most of them exports.
   - Fine for now, but it'll slow down as the library grows.
   - Fix: keep Dropbox's cursor and call `list_folder/continue` to get only what changed since last time.
6. **Low: no setlists on the iPad.**
   - For a gig from the iPad, a setlist (read from `Setlists/`) would be the natural next step after sync.
7. **Note: the help pages only describe Full Dropbox access.**
   - "App folder" access confines ukemusic to `Dropbox/Apps/<app name>/`, which answers "can it see my whole Dropbox?" with a plain no. The songs folder then lives there, and the desktop points at it like any other folder.
   - The step-by-step guide now recommends App folder, with Full Dropbox as the fallback; `site/phone.html` should say the same.
8. **Note: iPad storage.**
   - The Home Screen app's songs are kept on the iPad, and Safari's 7-day clean-up doesn't apply to Home Screen apps ([WebKit's clarification](https://www.osnews.com/?p=131566)).
   - Deleting the icon deletes its songs. With Dropbox sync that's only an inconvenience; without it, use **Back up all songs** now and then.
9. **Medium: the first sync can make duplicates.**
   - Songs already on the iPad are matched to Dropbox songs by title. A song brought in as a single `…-song.txt` has no settings, so it doesn't match its Dropbox copy exactly, and the first sync keeps both ("… (changed on this device)").
   - Fix: on the first match, treat a song whose words and chords are the same as the same song, and take Dropbox's settings, rather than calling it a conflict. Until then, the guide says to delete such songs from the iPad before connecting.
10. **Medium: route 2 (Files app) is hard to use.**
   - Picking one song's file from Dropbox in the Files app means finding `…-song.txt` among each song's exports, and it comes without `song.ini`.
   - Fix: point people at the one file the desktop makes (`ukemusic-web-songs.json`), as the guide now does. The web player's file picker could also say "choose ukemusic-web-songs.json, a zipped songs folder, or song files".
11. **Note: "asked for money".**
   - Making a Dropbox app at dropbox.com/developers/apps is free.
   - Pages that do ask for money and are easy to land on: Dropbox's Plus/Essentials trial offers, the Dropbox Sign API (a different product), and Apple's developer programme. The guide names them.

## A routine that works

- **Before editing on the iPad:** open ukemusic with a connection and let it say "Dropbox: synced". Close that song on the PC (or don't edit it there at the same time).
- **After editing on the iPad:** wait for "synced" (about 8 seconds) before closing it.
- **On the PC:** reopen a song if you changed it on the iPad while it was open (until recommendation 1 is done).
- **If you see "… (changed on this device)":** compare the two, keep one, and delete the other.
- **Once a month:** **Back up all songs** on the iPad, to Files.
