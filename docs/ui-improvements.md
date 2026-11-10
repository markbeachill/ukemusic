# UI review: changes to consider, desktop app and web player

Reviewed 10 November 2026 against ukemusic 4.79.0.

This paper is written to be handed to an AI coding assistant (or read by the owner) as a list of possible interface changes. Each finding stands alone: it says what was seen, where it is in the code, what to change, and how to tell it's done. Nothing here has been changed in the code.

It goes with the earlier reviews, and doesn't repeat what they fixed: `docs/ribbon-review.md` (4.52), `docs/song-interface-review.md` (4.50). Where one of their findings is still open, this paper says so.

## How to use this paper (for an AI assistant)

1. Read `AGENTS.md` first. Its rules apply to every change here, above all: change the desktop app and the web player together (rule 3), Free Practice and karaoke are shared code with their own sync tools (rules 4 and 5), every new control belongs to a row of `src/feature-levels.js` (rule 6), plain words for users (rule 10).
2. Take one finding, or one batch from "Suggested order" below, per release. Don't combine batches: several findings move the same controls.
3. Before changing a screen, look at it: `npm run ui-review -- desktop` (or `ipad`, `iphone`). After, look again.
4. A finding marked **Owner decides** needs the owner's choice before any code: ask, don't guess.
5. Each finding has an id (`S1`, `L3`…). Use it in the changelog entry and the test name, so the paper can be ticked off.

Each finding gives:

- **Seen:** what the review found, and how (a picture, a measurement, or the code).
- **Where:** files and element ids.
- **Change:** the proposal.
- **Done when:** a check a test or a picture can make.
- **Size:** S (an hour or two), M (a release), L (several releases, or risky).

## What was reviewed, and how

| | |
|---|---|
| Desktop app | Run under Electron at 1280×770, 1440×810 and 1024×670, in the simple view and with all features: the library, every ribbon tab, Settings, the Export dialog, karaoke, Free Practice's menu, the first-run welcome. |
| Web player | Run in Chromium as an iPhone 15 (393×659 of page) in the simple view, and at 1280×800 with all features: first run, library, song page, Settings, Features, Learn, Download, playing, Edit. |
| Code | `index.html`, `web/app.html`, `main.js` (the menu bar), `src/feature-levels.js`, `src/context-menu.js`, `WRITING.md`. |
| Measured | Controls per ribbon tab; tap target sizes and text sizes on the phone; where things fall on the screen. |

**Not reviewed:** a real phone or tablet (Safari, the on-screen keyboard, the share sheet); the iPad layout; Free Practice's exercise screens (only its menu); the Session screen on a TV; screen readers (only the markup was read); sound. Findings about those areas are marked "from the code".

## Summary

The interface is capable and mostly plainly worded. The simple view (4.78) was the right move, and the web player's song page is clear on a phone. What's left falls into five groups:

1. **The simple view leaks.** Hidden features still show in the menu bar, the Export dialog, the library's menus and the hint line, and one layout bug leaves a group folded when there's room.
2. **The same thing in several places.** Three sets of Play/Stop on the desktop; the key in four places; a menu bar, a top bar, a ribbon and song tabs all at once.
3. **One thing, several names.** "Session screen" and "Group screen"; "Chord diagrams" and "Shapes"; "Restart" and "From the start"; help text that points at tabs since renamed.
4. **Desktop and web differ where they needn't.** The web has buttons to put in a chord or a heading and the desktop doesn't; the web's add-a-song buttons are under the song list; checkboxes on one are toggle buttons on the other.
5. **Small things that add up.** Tap targets under 44 px on the phone, 11 px labels, programmer's words in the status bar, information only in tooltips.

### The ten to do first

| Id | Finding | Size |
|---|---|---|
| S1 | Ribbon groups stay folded in the simple view when there's room (a bug) | S |
| S3 | The simple view leaks: menu bar, Export dialog, library menus | M |
| S2 | The hint line names features the simple view has hidden | S |
| C4 | Help text points at tabs and buttons that have been renamed | S |
| C1 | One name for each thing, in both apps | M |
| L1 | One set of Play, Pause and Stop on the desktop | M |
| C3 | Chord, Heading and Strum buttons on the desktop's Write tab | S |
| C7 | Web library: the add-a-song buttons above the list, not under it | S |
| E1 | Phone: tap targets of at least 44 px, text of at least 13 px | S |
| A1 | Greyed settings can still be changed from the keyboard | S |

### The size of the interface

Counted with Amazing Grace open at 1280 wide:

| Desktop ribbon | Tabs | Groups | Controls |
|---|---|---|---|
| Simple view | 8 | 24 | 53 |
| All features | 9 | 47 | 102 |

The simple view halves the ribbon. On top of the ribbon, in both views, there are: the menu bar (6 menus, about 35 items, none hidden by the simple view), the top bar (3 controls), the song's own tabs (3 in the simple view, 6 with all features), Settings (12 sections, 77 settings) and 29 dialogs.

---

## S. The simple view

### S1. High: ribbon groups stay folded when there's room (bug)

**Seen:** In the simple view at 1280 wide, Display shows four groups, half the ribbon is empty, and yet the last group is folded into a "Layout and tab ▾" button. After the window is resized (to 1024, narrower) the same group is shown in full.

**Why:** `foldRibbon()` runs at start-up and on resize. At start-up every group is still there, so the last ones fold. Then `applyFeatures()` hides the 'all' groups but doesn't fold again.

**Where:** `index.html`: `applyFeatures()` (about line 5376), `foldRibbon()` (about line 11689, also `window.ukemusicFoldRibbon`), and where `data-song-uses` is set (about line 4649).

**Change:** Call `window.ukemusicFoldRibbon?.()` at the end of `applyFeatures()`, and after `data-song-uses` changes (opening a song with a tune or picking brings groups back).

**Done when:** In the simple view at 1280 wide no group on any tab has the class `folded`. Turning "Show all features" on and off at one window size folds and unfolds correctly without a resize.

**Size:** S.

### S2. High: the hint line names hidden features

**Seen:** In the simple view the line under the ribbon says, on Play, "Loop repeats the current section. Practice speed leaves the saved tempo unchanged." (Practice is hidden); on Learn, "Choose chord help, practise changes or play in a new key." (changes and new key are hidden); on Write, "Strum patterns are in Help → Strums." (a menu, not the Help group beside it).

**Where:** `index.html`, `RIBBON_HINTS` (about line 11741).

**Change:** Give each tab a second, shorter hint for the simple view (`RIBBON_HINTS_SIMPLE`), used when `<html>` has `data-simple`. Suggested: Play: "Play the song, or sing along in Karaoke."; Learn: "Play with fewer chords showing, or test yourself on what comes next."; Write: "Type the words, with each chord in [brackets] before its word. Writing explains the rest."; Display: "How the chord sheet looks." Better still, drop the claim "Point at a control for its scope and details" (see D1).

**Done when:** No simple-view hint contains the name of a control that is hidden in the simple view. A test can check each hint's words against the visible labels.

**Size:** S.

### S3. High: the simple view leaks

Features hidden on the ribbon still show elsewhere. None of these carry `data-feature`.

| Where it leaks | What shows in the simple view | Where in the code |
|---|---|---|
| Menu bar | Edit Style…, Guess the Key…, Suggest a Capo…, Chord Patterns…, Insert Tab Block, the Library menu (packs, new library, ChordPro import), Strums… | `main.js`, the menu template (about lines 375–460) |
| Export dialog | Stage PDF (ticked by default), Two-page Stage PDF, More formats, Learn sheet, Pick sheet, the key choices | `index.html`, `<dialog id="exportDialog">` |
| Library row's ⋯ menu | "Add to a setlist…" (Setlists is an 'all' feature and its tab is hidden) | `index.html`, about line 12538 |
| Library heading | Open library folder, Export every song…, Phone and tablet…, the libraries switcher ▾ | `index.html`, `#libOpenFolder`, `#libExportAll`, `#libPhone`, `#libSwitch` |
| Song's Details tab | Album, Source, Difficulty, Licence | `index.html`, the Details form |
| Song tab, Key group | Keys ▾ with "Save this key as a version…", "Remove this version", "Make this the song's key…" | `#saveVersionButton`, `#removeVersionButton`, `#rekeyButton` |

**Change:**

1. Add rows to `src/feature-levels.js` where none fits: `libraries` (switcher, packs; all), `libraryTools` (Open library folder, Export every song; all), `phone` (Phone and tablet; **Owner decides** simple or all), `keyVersions` (the three version buttons; all), `detailsMore` (Album, Source, Difficulty, Licence; all), `exportMore` (More formats in the dialog; all). Reuse `setlists`, `stage`, `twoPage`, `style`, `writeCheck`, `capo`.
2. Put `data-feature` on the dialog parts and library buttons. In the simple view the Export dialog should offer **Chord sheet PDF** only, ticked, with a line "More kinds of file: Show all features".
3. Give the ⋯ menu item the `setlists` feature (it's built in script: skip it when `data-simple` is set and `setlists` is 'all').
4. Menu bar: `main.js` already reads the settings. Send the list of hidden feature ids from the window to the main process when `applyFeatures()` runs, and set `visible: false` on the matching menu items (give each item a `feature` id).
5. Extend `test/v478.test.js`: every `<dialog>` section, library button and menu item that belongs to an 'all' feature carries its id.

**Done when:** With a new settings folder (the simple view), none of the names in the table above appears anywhere on screen or in a menu, and `npm run ui-review` in the simple view (see T1) shows none.

**Size:** M.

### S4. Medium: group names that no longer fit what's shown

**Seen:** In the simple view the Display group "Layout and tab" holds only the layout choice (tab look is hidden), and the Play group "Full screen" holds only Karaoke. In the library the tab strip shows a single tab, "Songs", underlined, with nothing to switch to.

**Where:** `index.html`: the group with `data-feature` on its parts (`layout`, `tabLook`); `karaoke`, `session`; `.library-tabs`.

**Change:** A group whose parts belong to different features takes its name from the parts that show: add `data-label-simple="Layout"` (and "Karaoke") and let `applyFeatures()` swap the `.rib-label` text. Hide `.library-tabs` when only one tab is visible.

**Done when:** No visible group label names a hidden feature; the library shows no tab strip in the simple view.

**Size:** S.

### S5. Medium: Settings in the simple view opens on a page that is mostly greyed

**Seen:** From a song, Settings opens on "This song". Two of its three sections ("Custom for this song", "Font for this song") are greyed and marked "· all features", and the first is a long list of greyed dropdowns that fills the page. The one live section, "About this song", only says where else to look.

**Where:** `index.html`, the Settings panel: `#set-song-custom`, `#set-song-fonts` (`data-feature-grey`), and the code that picks the tab to open.

**Change:**

1. In the simple view, open Settings on "All songs (defaults)".
2. Collapse each greyed section to its heading and one line: "Shown with all features." with a **Show all features** button. Greyed but full-length sections make the page long for no gain.
3. Fix the text in "About this song" (see C4).

**Done when:** In the simple view the first screen of Settings shows only settings that can be changed.

**Size:** S.

### S6. Medium: "More features…" acts at once, and looks like a tab

**Seen:** "More features…" sits in the tab row in italics. One click turns every feature on and shows a toast (in this review's run it also left the ribbon on the File tab, having been on Write): "All features shown. To go back to the simple view, or choose what it shows: Settings → Features." There's no way back from the toast itself. The "…" promises a question first, and there isn't one.

**Where:** `index.html`, `#moreFeaturesButton` and its click handler.

**Change:** Keep the one click, and make it safe to try: stay on the tab the user was on; give the toast two buttons, **Back to simple** and **Choose features…** (opens Settings → Features); drop the "…" from the label or make it a small popover with those choices. Style it as a button at the end of the row, not as a tab.

**Done when:** After pressing it, the active tab is unchanged and one more click restores the simple view.

**Size:** S.

### S7. Medium: on the web, "Show all features" can only be reached from inside a song

**Seen:** The web library has a "?" and a light/dark button, and no settings. After the first-run card has gone, "Show all features" and "Features…" are found only by opening a song and pressing Settings. That same Settings sheet mixes three scopes: the app ("Show all features"), "this song on this device" (playing choices) and "all songs on this device" (display).

**Where:** `web/app.html`: `#libraryView` header, `#moreTools`.

**Change:** Add a **Settings** button to the library header. Move the app-wide things there: Show all features and Features…, Your instrument, light or dark, the display choices for all songs, Back up all songs, Dropbox, About. Leave on the song page only what is about this song. Keep a "Display for all songs…" link from the song's Settings so it's findable in both places.

**Done when:** Every setting marked "all songs" can be reached without opening a song, and the song's Settings sheet shows only this song's choices.

**Size:** M.

### S8. Lower: the Features table

**Seen:** Each row repeats "in the simple view" beside its tick box (ten times on one phone screen). Rows are in table order with no headings.

**Where:** `src/feature-levels.js`, `tableHtml()` and `TABLE_CSS`.

**Change:** Put "Simple view" in the column heading only, with a bare tick box per row (and an `aria-label` naming the feature). Group rows under headings from `where` (File, Write, Song…; on the web: the song page, the player, Settings, the Edit page). Mark changed rows as now.

**Size:** S.

### S9. Owner decides: which features are simple

The table is the owner's call; these are the ones that looked doubtful while using the simple view.

| Feature | Now | Suggest | Why |
|---|---|---|---|
| Versions (in File → Save) | simple (part of `save`) | its own row, all | A beginner needs Save. "Save new" and "Versions" beside it are two more decisions. Undo covers most slips. |
| Tidy chords (in File → Bring in) | simple | all | "Paste from web" already tidies. The button alone means little to a beginner. |
| Time (in Song → Tempo and time) | simple | keep, but see L5 | Fine; noted because the web keeps it in Details. |
| Capo → Suggest… | simple | all (the Capo choice stays) | A second control in a one-choice group. |
| Phone and tablet… | not in the table | simple | It's how a beginner gets songs onto a phone: worth keeping visible. |
| Edit chords on the sheet | simple | keep | It's the beginner's way to place chords. |

---

## L. Logic and structure

### L1. High: three sets of Play and Stop on the desktop (still open from the ribbon review, finding 2)

**Seen:** With a song open: the top bar has "Play / Pause", "Stop" and "Play from section"; the Play tab has Play, Stop and Restart; the Picking tab has Play, Stop and Karaoke; the menu bar has Play → Play and Stop. The top bar's button reads "Play / Pause" on some screens and "Play" on others, and changes width.

**Where:** `index.html`: `#quickPlay`, `#quickStop`, `#songSections`; `#playButton`, `#stopButton`, `#playFromStartButton`; `#pickPlayButton`, `#pickStopButton`, `#pickKaraokeButton`. `main.js`: the Play menu.

**Change:** One transport, in the top bar, always there: **▶ Play** (which becomes **⏸ Pause** while playing, same width), **■ Stop**, **⏮ Restart**, and the section choice. Take Play, Stop and Restart off the Play tab and Play and Stop off the Picking tab. Those tabs keep what changes *how* it plays (Karaoke, Group screen, tempo, loop, sound, the picking pattern). Keep F5, Shift+F5 and Space.

**Done when:** With a song open there is exactly one Play and one Stop on screen, on every tab, and their labels never change except Play ↔ Pause.

**Size:** M. Tests that look for the removed ids need updating; the UI review steps too.

### L2. Medium: four layers of navigation on the desktop

**Seen:** A menu bar (File, with Library inside it, Edit, View, Write, Play, Help), a top bar, a ribbon of nine tabs, and the song's own tabs (Words & chords, Details, Links, Exports, Notes, ChordPro), plus Settings with two tabs of its own. The menu bar repeats part of the ribbon under other names (see C1), has a "Write" menu of four items and a "Play" menu of two, and has no Display, Learn or Picking. "Print" is only in the menu; "Strums…" is only in Help.

**Where:** `main.js`, the menu template.

**Change (Owner decides between two):**

- **A, smaller:** cut the menu bar to what a menu bar is for: File (New, Open, Save, Save as new, Print, Close, Quit), Edit (Undo, Redo, Cut, Copy, Paste, Paste from a website), View (Zoom, Settings), Help (How to write songs F1, Strum patterns, Keyboard shortcuts, About, Open log file). Everything else lives on the ribbon only. Move Library's items into the library screen's ▾ menu, where they already are.
- **B, larger:** make the menus mirror the ribbon tabs one for one, built from the same labels so they can't drift.

A is recommended: fewer places to look, and it removes most of the S3 menu leak for free.

**Done when:** No action has two different names (menu against ribbon), and each menu has at least four items or is gone.

**Size:** M.

### L3. Medium: Settings is a tab that holds one button (still open from the ribbon review, finding 3)

**Seen:** The Settings tab's panel has "Settings", "This song's settings…" and "About". Every other tab is a set of tools.

**Where:** `index.html`: `#ribbonTabSettings` and its panel; the right end of `.ribbon-tabs` (`.ribbon-end`).

**Change:** Replace the tab with a **⚙ Settings** button at the right end of the tab row (the library already has one in that corner, so the two screens match). It opens Settings on "All songs" from the library and gives "This song" and "All songs" from a song. "About" goes to the Help menu and to the foot of Settings.

**Done when:** The ribbon's tabs are all tool tabs, and Settings is in the same corner on the library and the song screens.

**Size:** S–M.

### L4. Medium: the × at the end of the ribbon closes the song

**Seen:** The tab row ends with "˅" (hide the tools) and "×". The × closes the song and goes to the library. Sitting beside "hide the tools", it reads as "close the tools". File → Close does the same job.

**Where:** `index.html`: `#ribbonClose`, `#closeSongButton`.

**Change:** Replace the × with a labelled **‹ Songs** button at the left of the top bar, before the title, which is where the web player has its back button. Keep File → Close and Ctrl+W.

**Done when:** The way back to the library is in the same place (top left) in both apps and has a word on it on the desktop.

**Size:** S.

### L5. Medium: the key is in four places, and the song's facts are split differently in each app

**Seen (desktop):** Song tab → Key (a list, − and +, Keys ▾); Details → "Written in" with "Guess the key…"; Write → Guess key; Learn → Another key → "Play in new key". Tempo and time are on the Song tab and not in Details; the title is changed by File → Rename and not in Details.

**Seen (web):** Details has Title, Key, Capo, Tempo and Time signature (the song as written). The song page's toolbar has Key and Capo (playing choices, kept on this device). Settings has Time signature again, as a playing choice.

**Change:** Use the web's split, which is the clearer one, in both apps, and name it the same:

- **The song as written** (Details): title, artist, written key, tempo, time. Add Title, Tempo and Time to the desktop's Details (Title renames the song, as File → Rename does).
- **How you're playing it** (the Song tab; the web's toolbar): "Play in" key, capo, instrument. Label the desktop's Key group "Play in", so it isn't confused with "Written in".
- One "Guess the key": keep it beside "Written in", drop it from Write → Check.
- On the web, take Time signature out of the playing choices or say why it's there twice ("Count it in: 3/4").

**Done when:** A user can answer "where do I change the key the song is written in?" and "where do I try it higher?" with one place each, the same in both apps.

**Size:** M.

### L6. Medium: what a setting applies to (this song, all songs, this device)

**Seen:** On the desktop's Display tab one group is labelled "Chord diagrams · this song" and the others have no scope; "Left-handed" and "Hide common" in that same group are for all songs (their tooltips say so). The hint line says "Point at a control for its scope and details." The web labels scope in its headings ("Playing choices · this song on this device", "Display · all songs on this device"), which is clearer. This was finding 2 of the song interface review; the web got the fix and the desktop mostly didn't.

**Where:** `index.html`, the Display, Export and Song panels' `.rib-label`s.

**Change:** Every ribbon group that changes a setting says its scope in its label, the web's way: "· this song" or "· all songs". Don't mix scopes inside a group: move Left-handed and Hide common to a group of their own ("Diagrams · all songs") or to Settings only. Remove the hint's sentence about pointing.

**Done when:** Each settings group on Song, Display and Export shows one scope in its label, and no group holds controls of two scopes.

**Size:** S–M.

### L7. Medium: exporting

**Seen:** "Export now" opens a dialog of choices, so nothing is exported "now". The Export tab's own options (paper, tab in PDFs, every saved key, section names, Stage format) are separate from the dialog's tick boxes, with nothing in the dialog to say they apply. At 1440×810 the dialog scrolls, and Cancel and Export are below the fold. The web calls the same job "Download", behind an icon with no word.

**Where:** `index.html`: `#exportNowButton`, `#exportDialog`. `web/app.html`: `#downloadBtn`, `#downloadDialog`.

**Change:** Rename the button "Export…". Keep the dialog's buttons in a footer that doesn't scroll. At the top of the dialog, one line with the tab's choices: "A4 · tab shown · this key" with "Change" going back to the tab. On the web, show the word "Download" beside the icon when there's room (640 px and wider). Keep "Export" (desktop: files into the song's folder) and "Download" (web: a file to the device) as two words, since they do behave differently, but describe them the same way in the guide.

**Done when:** Export and Cancel are visible without scrolling at 1280×720.

**Size:** S.

### L8. Medium: on the web, the strum or picking it plays has three names and three places

**Seen:** The toolbar has an "Accompaniment" list. The player has an "Accompaniment" button, which opens a dialog titled "Pick", which has a list labelled "Strumming". Learn → Pick opens the same dialog.

**Where:** `web/app.html`: `#strumSel`, `#accompanimentBtn`, `#pickDialog`, `#pickStrumming`, `#learnPickBtn`.

**Change:** One name, "Strum or pick". One list (the toolbar's), and one button that opens the dialog, titled the same. Take the second list out of the dialog or make it the same control. The desktop's Song tab group "Strum where none is written" is the same setting: use the same name there.

**Done when:** The words "Accompaniment" and "Strumming" no longer label this choice; one name is used in both apps.

**Size:** S.

### L9. Lower: Pause, Restart and Stop on the web player

**Seen:** While playing, the phone shows Pause, Restart, Stop, Karaoke and Learn in a row, then the chord now and next, the tempo, the strum arrows and "Bar 1 of 80 · tap a line to jump there". That's about a third of the screen (the player starts at 66% of the way down), leaving three lines of the song.

**Where:** `web/app.html`, `#player`.

**Change:** While playing on a narrow screen: show Pause and Stop only (Restart is "Stop, then Play"; keep it when paused), move Karaoke and Learn out of the playing state, and put tempo on the same row as the chord. Aim for the player to take no more than a quarter of the screen.

**Done when:** On a 393×659 page, at least six lines of the song show while it plays.

**Size:** S–M.

---

## C. Consistency

### C1. High: one name for each thing

**Seen:** The same thing under different names, from the two apps' labels, the menu bar and the help text.

| The thing | Names in use now | Suggested one name |
|---|---|---|
| The song on one screen for a group | "Group screen" (desktop Play tab, web) / "Session screen" (setlists, tooltips, Features table, docs) | **Owner decides**; "Group screen" says what it's for |
| Chord pictures | "Chord diagrams" (desktop) / "Shapes" (web Settings, karaoke) / "Chords" (Write button, which opens chord shapes) | "Chord shapes" for the pictures everywhere; the Write button "Chord shapes" |
| How chords sit with the words | "Layout" (desktop) / "Sheet" (web) | "Layout" |
| Hide the everyday chords' pictures | "Hide common" (desktop tick box) / "Common: shown" (web button) | "Hide common shapes" |
| Back to the beginning | "Restart" (desktop Play, web player) / "From the start" (karaoke) / "Play from section" (top bar list) | "Restart" |
| Big copy for a gig | "Stage copy" / "Stage chord sheet" (web Download) / "Look: Stage copy" / "Stage PDF" | "Stage copy" (and "Stage copy PDF") |
| Beats in a bar | "Time" (desktop) / "Time signature" (web) | "Time" with the value saying the rest (3/4) |
| Save under another name | "Save new" (ribbon) / "Save as New Song…" (menu) / "Save as new song" (an error message) | "Save as new" |
| Older saves | "Versions" (ribbon) / "Earlier Versions…" (menu) / "Earlier versions" (dialog). "Version" also means a saved key | "Earlier versions" for saves; "Saved keys" for keys |
| Bring a sheet in | "Paste from web" (ribbon) / "Paste from a website" (library, web) / "Paste from Website…" (menu) / "Paste a chord sheet" (dialog title) | "Paste from a website" |
| Move chords above words into them | "Tidy chords" (ribbon) / "Tidy Chords Above Words" (menu) | "Tidy chords" |
| The tune's place | "A strip at the top" (desktop) / "At the top" (web) | "A strip at the top" |
| Get files out | "Export" (desktop) / "Download" (web) | Keep both (see L7) |

**Change:** Agree the names, then change labels, tooltips, dialog titles, menu items, `WRITING.md`, the website pages and the Features table together. Add the table to `AGENTS.md` as "the names we use", and add a test that fails if a retired name appears in `index.html`, `web/app.html`, `main.js` or `WRITING.md`.

**Done when:** The test passes with every retired name listed.

**Size:** M (many small edits; site pictures need retaking).

### C2. Medium: tick boxes on the desktop are state-in-the-label buttons on the web

**Seen:** Web Settings has buttons reading "Common: shown", "Left-handed: off", "Easy to read: off". The desktop has tick boxes "Hide common", "Left-handed", "Easy to read". A button whose label is its state is ambiguous: does "Left-handed: off" tell or do? At 1280 wide "Easy to read: off" is also drawn in larger type than its neighbours.

**Where:** `web/app.html`: `#commonBtn`, `#leftBtn`, `#easyBtn`.

**Change:** Use tick boxes (or switches) with fixed labels, as the web already does for "Show all features" and "Edit chords on the sheet". Same labels as the desktop.

**Done when:** No web control's label changes when it's pressed, apart from Play ↔ Pause.

**Size:** S.

### C3. High: the web has buttons to put in a chord, heading or strum; the desktop has none

**Seen:** The web's Edit page has "[ ] Chord", "[[ ]] Heading", "{ } Strum", "|" and "♪ Tune", with "Help with insertion buttons". The desktop's Write tab has "Insert tab" and "Chords" (which opens the chord shape picker). A beginner on the desktop faces `--START MUSIC--` and brackets with no button that writes one.

**Where:** `index.html`, the Write panel's `writeAdd` group; the web's handlers for `data-ins`.

**Change:** Add **Chord**, **Heading**, **Strum** and **Bar line** to the desktop's Write → Add group, doing what the web's do (put the brackets at the cursor, cursor inside), level 'simple'. "♪ Tune" with the `tune` feature. Rename the existing "Chords" button "Chord shapes" (C1).

**Done when:** Each of the web's five insert buttons has a desktop button with the same name that writes the same text.

**Size:** S.

### C4. High: help text points at tabs and buttons since renamed

**Seen (from the code):** Directions that no longer match the labels.

| Says | Where | Now called |
|---|---|---|
| "on the **This song** tab above the editor" | Settings → About this song; a help line near line 3138; Settings near line 2816 | the **Song** tab |
| "on the song's **Details** tab, beside Song and Notes" | Settings → About this song | beside Words & chords and Notes |
| "View → The tune", "The View tab and Settings…" | Settings help (about lines 2929, 3324) | Display |
| "Pick → Pattern", "Pick → Choose picking" | status messages (about lines 10736, 11367), Export dialog (3410), web `#pickHelpDialog` | Picking → Picking pattern |
| "Pick → Write out", "Pick → Play the tune" | `WRITING.md` (292, 322) | Picking → … |
| "Learn → Trouble" | karaoke message (about line 8294) | Learn → Practise trouble spots |
| "File → Tidy chords above words", "File → Import text file" | `WRITING.md` (387, 388, 392) | File → Tidy chords, File → Import file |
| "File → Save as new song" | an error message (about line 5194) | File → Save new (or the C1 name) |
| "Write → Chord patterns" | Settings help (about line 3043) | Write → Patterns |
| "File → Add to setlist…" | the Setlists page | File → Setlist |
| "Help → Strums" | the Write hint | a menu; there's also a Help group on that tab (see D4) |

**Change:** Fix each. Then add a test: find every "X → Y" in `index.html`, `web/app.html` and `WRITING.md`; X must be a ribbon tab, menu or Settings; Y must match a visible label, group name or menu item under X. That stops it happening again when a button is renamed.

**Done when:** The test passes.

**Size:** S (do it after C1, or it's done twice).

### C5. Medium: dialogs don't follow one pattern

**Seen:** Across 29 desktop and 13 web dialogs the way out is "Close" (25), "Cancel" (16), "Done" (4) or "Stop" (6), not always by rule. On the web, the Features dialog has "Done" floating at the top right and the Download dialog starts with "Print / Save PDF" above its heading. Three confirmations in each app use the browser's own `confirm()` box (remove a version, rewrite the song in a key, restore practice from a backup; on the web: delete a song, disconnect Dropbox, send songs to Dropbox), which looks nothing like the rest and offers "OK".

**Change:** Three rules, written into `AGENTS.md`:

1. A dialog that only shows something ends with **Close**. One that changes something ends with **Cancel** and a button named for what it does ("Export", "Delete this song"), in that order, at the bottom right, in a footer that doesn't scroll.
2. Heading first; no buttons above it.
3. No `confirm()`. Use the app's own dialog, with the consequence in a sentence and the button named for the action. Deleting is styled as dangerous.

**Done when:** `confirm(` doesn't appear in `index.html` or `web/app.html`, and every dialog's last buttons follow rule 1.

**Size:** M.

### C6. Lower: the "…" on buttons

**Seen:** "…" should mean "this will ask you something first". On the ribbon "Changes…", "Tab in steps…", "Suggest…" and "Edit style…" have it; "Versions", "Rename", "Import file", "Paste from web", "Setlist", "Guess key", "Patterns", "Learn sheet" and "Export now" open dialogs without it. (Ribbon review, finding 6, still open.)

**Change:** The simple rule: no "…" on the ribbon's large buttons at all (they're short, and most don't have it); keep it in menus and on ordinary buttons in dialogs and the library.

**Size:** S.

### C7. High: the web library's add-a-song buttons are under the list

**Seen:** On the phone the first run shows the brand, Free Practice, a "What do you play?" card, a backup notice, the search box, then 16 built-in songs. "Paste from a website", "+ New song", "Add songs from files…", "Dropbox…" and "Back up all songs" come after the list, about three screens down. The empty-state text names them, but they aren't in view. The desktop has Paste and New song at the top.

Also: the backup message appears twice (a banner above the list, a paragraph under it), and at first run the instrument is asked twice at once (the "Your instrument" list and the "What do you play?" buttons just below it).

**Where:** `web/app.html`, `#libraryView`.

**Change:** Put **Paste from a website** and **+ New song** at the top beside Free Practice, as on the desktop. The rest (files, Dropbox, back up) go behind a **More ▾** beside them, or to the library Settings of S7. One backup notice. Hide the "Your instrument" list while the first-run card is showing.

**Done when:** On a 393×659 page, Paste from a website and New song are visible without scrolling, with any number of songs.

**Size:** S.

### C8. Lower: desktop and web details that differ for no reason

- The library on the desktop sorts by column and shows tags; the web's shows title, artist and key, with search only. Tags are searchable on the web but not shown. **Change:** show tags under the artist on wider screens.
- The desktop's first-run text says "…Stage copies and songbooks, picking and more"; the web's says "…Stage copies, the group screen and more". **Change:** one sentence.
- "Default (Uke)" is the instrument shown for every song in the desktop library and on the web toolbar. **Change:** show the instrument's name ("Ukulele"), and in the library only for songs that differ from the default.

---

## W. Wording

### W1. Medium: programmer's words

**Seen:** The desktop's status bar reads "Ln 1, Col 1 · Key C · Ukulele · 84 bpm · 3/4 · PDF: 2 pages" and, at the right, "No parser warnings." Settings has "Chords on a line above the words (fixed-width font)".

**Change:** "Line 1" (drop the column, or keep it only with all features). "No parser warnings." → nothing when all's well; when there's a problem, "1 thing to check in the song" which opens the list. "PDF: 2 pages" → "Prints on 2 pages".

**Size:** S.

### W2. Medium: status bar messages stay, and get cut off

**Seen:** After visiting Picking, the message "This song has no tab of its own. To pick its chords, choose a pattern (Pick → Pattern); Tab in steps is for songs with a ```tab block." was still showing on the Write tab, and ran off the window's edge at 1440 wide. "Changed for this song. (The default for all songs is in Settings → All songs; "use default" in Settings → This song.)" likewise.

**Where:** `index.html`, wherever the status text is set.

**Change:** A message longer than about 60 characters, or one that needs acting on, is a toast (which the app already has, with an action button). Status bar messages clear after a few seconds and when the tab changes.

**Done when:** No status message is wider than its space at 1280 wide.

**Size:** S.

### W3. Lower: group and button names that don't say what they do

| Now | Where | Suggest |
|---|---|---|
| "Help" beside the list "Chords first time" | Learn → Play from memory | "Show" ("Help" is also the name of the help groups) |
| "Fingers" | Learn | "Chord changes" |
| "Understand it" | Learn | "How the song works" |
| "Check" | Write | "Key and patterns" |
| "Numbers" with a tick box "On the sheet" | Learn | "Chords as numbers" with the tick box "Show" ("On the sheet" is now also Write's Edit chords button) |
| "Usual" | Display → Text | "Reset size" |
| "Add" | Write | "Put in" (matches the guide's wording) |
| "Organise" with one button "Setlist" | File | "Add to setlist" as the button; no group name needed |
| "Play / Pause" | top bar | see L1 |

### W4. Lower: the library's "Last changed"

**Seen:** "Today, 01:15 AM" wraps onto two lines in every row at 1280 and 1440 wide.

**Change:** "Today 01:15" (24-hour or the system's short time), `white-space: nowrap`.

**Size:** S.

---

## D. Finding things

### D1. Medium: too much is only in tooltips

**Seen:** `index.html` has 258 `title` tooltips; they carry scope ("all songs"), consequences and where-else-to-look. The Display hint tells the user to point at controls. Tooltips are slow, invisible until found, and don't exist on touch screens (the web player has 39).

**Change:** Tooltips say what a control does in a few words, with its shortcut. Anything a user needs in order to choose (scope, "kept on this device", "changes the song itself") is on screen: in the group label (L6), a line under the control, or the dialog. Where there's more to say, a small "?" that opens a short note, as Free Practice does with "Exercise help".

**Done when:** No tooltip in the ribbon is longer than about 80 characters, and none is the only place a scope is stated.

**Size:** M.

### D2. Medium: what the preview can do

**Seen:** The preview's header says "follows the song as you scroll · click a line to go to it". Since 4.79 a right-click turns "Edit chords on the sheet" on and off, and with it on, chords drag. Neither is hinted at where it happens.

**Where:** `index.html`, the preview header.

**Change:** Put a small **Edit chords** switch in the preview's header, showing the same state as Write → On the sheet (and the right-click menu). When it's on, the header's hint changes to "drag a chord to its word · click a chord to change it". On the web, the same switch on the sheet's header in Edit.

**Done when:** The setting can be seen and changed from the place it acts on, in both apps.

**Size:** S.

### D3. Medium: keyboard shortcuts aren't shown

**Seen (from the code):** Space plays and pauses (when not typing), F5 plays, Shift+F5 stops, F1 opens the guide, Ctrl+K guesses the key, Ctrl+L goes to the library; the Session screen has B, D and 1–9; karaoke has keys of its own. The menu bar shows some. The ribbon's tooltips mostly don't, and there's no list.

**Change:** Add the shortcut to each ribbon tooltip that has one. Add **Help → Keyboard shortcuts** (one short dialog, made from one list in the code that the tooltips also use). On the web, the same list under "?" on screens with a keyboard.

**Size:** S.

### D4. Lower: help is in several places

**Seen:** Write → Help → "Writing" (the guide; also F1). Picking → Help → "How it works". Help menu → "Strums…". Settings → Help → "About". The web has "?" (the guide), "Help with insertion buttons", "Help from an AI chat", "How picking works" and "About ukemusic and thanks".

**Change:** One **Help** entry point per app that lists them all: the guide, strum patterns, how picking works, how Learn works, keyboard shortcuts, About. The tab-level buttons stay as shortcuts into it. Add a "Strums" button beside "Writing" on the Write tab so the hint needn't point at a menu.

**Size:** S.

### D5. Lower: nothing says what to do first

**Seen:** After the welcome, the desktop shows the library; the web shows the library with a card. Both are clear lists, but neither says "open a song and press Play", which is the quickest way to see what the app does.

**Change:** A one-line strip above the list the first few times: "New here? Open **Amazing Grace** and press **Play**." with a ✕. Gone for good after a song has been played.

**Size:** S.

---

## E. Ease of use

### E1. High: small tap targets and small text on the phone

**Measured** on an iPhone-size page (CSS pixels):

| Control | Size | |
|---|---|---|
| Key − and +, Capo − and + | 32 × 34 | used constantly |
| Tempo − and + | 34 × 34 | |
| Settings | 78 × 34 | |
| Edit's tabs (Words & chords, Details, Notes) | 33 high | |
| Insert buttons ([ ] Chord…) | 36 high | |
| "Your instrument" list | 29 high | |
| Tick boxes | 13 × 13 (the label is tappable too, 20 high) | |
| "?", light/dark | 38 × 40 | |

Text: "Key", "Capo" and the line under the header ("3/4 · 84 bpm · Original C…") are 11 px; the player's button labels are 12 px.

**Where:** `web/app.html` CSS (`.btn`, `.tool`, `#tools`, `.edit-tabs`).

**Change:** Under `@media (pointer: coarse)`: every button, list and tab at least 44 × 44; tick-box rows at least 44 high; no text under 13 px. The header grows a little; S7 and L9 give the room back.

**Done when:** The measuring script used for this review (see T2) reports no target under 44 px and no text under 13 px on the phone's library, song, playing and edit screens.

**Size:** S.

### E2. Medium: the phone's Edit page spends half the screen before the song

**Seen:** Above the editor: the header, three tabs, "Changes save automatically on this device. Dropbox-linked songs also sync to the shared folder.", four insert buttons and Preview on two rows, the Edit chords tick box, and two "Help…" lines. The song's text starts 45% of the way down, before the keyboard takes its half.

**Where:** `web/app.html`, `#editWordsPanel`.

**Change:** The autosave sentence shows the first time only; after that the header's "Saved" says it. The two help lines move under "?" in the header. The insert buttons become one row that scrolls sideways and sticks above the keyboard. Preview and Edit chords become one control (E3).

**Done when:** On a 393×659 page the editor starts in the top third.

**Size:** S–M.

### E3. Medium: "Edit chords on the sheet" on a phone needs the preview, which is a separate button

**Seen:** On a narrow screen the sheet shows only after pressing Preview. Ticking "Edit chords on the sheet" with the preview closed does nothing visible.

**Where:** `web/app.html`: `#chordEditToggle`, `#editPreviewBtn`, `setChordEdit()`.

**Change:** On a narrow screen, turning it on opens the preview; make the pair one two-way switch: **Type** | **Move chords**.

**Done when:** Turning it on always leaves a sheet with movable chords on screen.

**Size:** S.

### E4. Lower: layout slips

- **Web, 1280 wide, Edit:** the preview beside the editor is a short box (it ends at about 715 px while the editor carries on) and a line of the song wraps inside it. Make it fill the height and scroll by itself.
- **Desktop, 1024 wide, all features:** the window gets a sideways scrollbar along the bottom, and the song's first tab wraps to two lines ("Words & / chords"). Let the song tabs scroll sideways or shorten to "Words"; find what's wider than the window (likely the status bar's text, see W2).
- **Web, song page:** "Jump to section" is a plain browser list, unlike every other control on the page, sitting between the info line and the sheet. Style it like the toolbar's lists and put it in the toolbar (it's an 'all' feature already).
- **Desktop, simple view, library:** see S4 for the single tab.

### E5. Lower: the karaoke bar

**Seen:** Nine controls of equal weight: − tempo +, Shapes, A−, A+, a full-screen icon with no word, Pause, "⏮ From the start", "■ Stop", Close. Stop and Close both end it.

**Where:** `index.html` karaoke markup (then `node tools/sync-karaoke.js --write`, rule 5).

**Change:** Group them: playing (Pause, Restart) on the left by the chord; looks (Shapes, A−, A+, full screen) behind one "Display ▾" or at least set apart; one way out, **Close**, which stops. Give the full-screen button a tooltip and `aria-label` (check it has one).

**Size:** S–M.

---

## A. Accessibility and other common problems

### A1. Medium: greyed settings can still be reached and changed from the keyboard

**Seen (from the code):** In the simple view, a greyed settings section gets `opacity: 0.45; pointer-events: none`. That stops the mouse, but Tab still moves into its controls and the keyboard changes them; a screen reader isn't told they're unavailable.

**Where:** `src/feature-levels.js`, `css()`; `applyFeatures()` in both apps.

**Change:** In `applyFeatures()`, set the `inert` attribute on each greyed `[data-feature-grey]` section while it's greyed (the ribbon panels already use `inert` when hidden). With S5 the section is collapsed anyway.

**Done when:** In the simple view, tabbing through Settings never lands inside a greyed section.

**Size:** S.

### A2. Medium: keyboard focus and the ribbon

**Seen (from the code):** `index.html` has three `:focus-visible` rules and four `outline: none`. The ribbon's tabs have `role="tab"`; whether arrow keys move between them wasn't tested here (ribbon review, finding 8).

**Change:** One visible focus ring for every button, list, tab and tick box in both apps (2 px, the accent colour, offset). Arrow keys move along the ribbon tabs and the song tabs; Tab goes from the tabs into the panel. Check each of the four `outline: none` has a replacement.

**Done when:** Every control on the library, a song, Settings and one dialog shows a ring when reached by Tab.

**Size:** S–M.

### A3. Lower: small text on the desktop

**Seen (from the code):** 10 and 11 px text is used in `index.html` (group labels under the ribbon among them). Fine on a large monitor, hard on a 13-inch laptop.

**Change:** 12 px as the smallest for anything meant to be read; group labels 12 px.

### A4. Lower: disabled buttons don't say why (still open from the ribbon review, finding 5)

**Seen:** "Remove this version" and "Make this the song's key…" are greyed until a saved key is chosen; "Stop" until something plays; "Tab in steps…" for a song with no tab (the reason turns up later in the status bar).

**Change:** A disabled button's tooltip starts with why ("Choose a saved key first"). Better: hide the version buttons until a saved key is chosen.

---

## T. Tools for checking the interface

### T1. The UI review doesn't cover the simple view

**Seen:** `npm run ui-review` runs with all features. Nothing takes pictures of what a beginner sees, which is how S1 to S5 went unnoticed.

**Where:** `tools/ui-review/desktop.js`, `web.js`, `catalog.json`.

**Change:** Add a section "B Simple view" with a picture of: the library, each ribbon tab, Settings, the Export dialog (desktop); the first run, library, song page, Settings, playing and Edit (web). The desktop run needs a settings file with `all_features = false`.

Also seen in this review's run, on Linux; check on the owner's computer: R10 and A4 failed ("no such file or directory… /learn": the learn and pick sheet weren't written before the step looked for them) and A5 timed out. `catalog.json` says the iPad and iPhone don't have L6 (Paste from a website); the web player has had it since 4.66.

### T2. Checks that can be automated

Three small tests would hold most of this paper's gains:

1. **Names** (C1): retired names don't appear.
2. **Directions** (C4): every "Tab → Button" in the app and the guide matches a real label.
3. **Sizes** (E1): a Playwright check on the built web player at a phone's size: no tap target under 44 px, no text under 13 px, no sideways scroll, on four screens. It needs Playwright, so make it part of `npm run ui-review`, not `npm test`.

---

## Suggested order

Each batch is one release. Earlier batches don't depend on later ones.

| Batch | Findings | Why this order |
|---|---|---|
| 1. Simple view, fixed | S1, S2, S4, A1, T1 | Small, safe, and T1 makes the rest checkable |
| 2. Simple view, sealed | S3, S5, S6, S8 | Needs new rows in the Features table; owner's choices in S9 can go in here |
| 3. Names | C1, then C4, C6, W3, T2 (tests 1 and 2) | Do the names once, before moving things; site pictures retaken once |
| 4. Web library and phone | C7, S7, E1, E2, E3, C2, T2 (test 3) | All in `web/app.html`; no desktop risk |
| 5. Desktop: one of each | L1, L3, L4, C3, D2 | Moves ribbon controls; update the UI review steps and tests with it |
| 6. Where settings live | L5, L6, L7, L8 | The biggest rethink; wants the owner's say first |
| 7. Polish | C5, D1, D3, D4, D5, W1, W2, W4, E4, E5, A2, A3, A4, L2, L9, C8 | Any order |

## What to leave alone

- The song page on the web at phone size: the song starts high on the screen and the controls are few. Don't add to its header.
- The two-pane desktop layout (words on the left, the sheet on the right) and the preview that follows the cursor.
- The Features table as the one place that decides the simple view. Extend it; don't add a second mechanism.
- Free Practice's menu: clear categories, levels on every card, "Start here" at the top.
- The wording style: short, for players. Keep it when renaming (rule 10).
- The owner's files (rule 2) and the shared-code tools (rules 4 and 5).

## Questions for the owner

1. "Group screen" or "Session screen"? (C1)
2. The menu bar: cut it down (L2, A) or mirror the ribbon (B)?
3. Which of the S9 suggestions to take, and should "Phone and tablet…" be in the simple view?
4. Is it acceptable to remove Play and Stop from the Play and Picking tabs (L1), given the top bar always has them?
5. Should the desktop's Details take over Title, Tempo and Time from File → Rename and the Song tab (L5), or show them in both places?
