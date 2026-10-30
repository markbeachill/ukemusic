# Changelog

## v4.52.0

### Compact Stage copies by default
- **Compact** (the chords in the words, the fewest pages) is now the Stage format for every song, unless you choose another. Settings from before this version move to Compact once; choose Clear, Brackets or Heavy again in Settings → Export, or for one song in Export → Stage, and it's kept. Compact is first in the lists.

### Fixed
- The **Changes**, **Next chord?**, **Circle**, **Picking**, **Trouble spots** and **About** windows in the desktop app had lost their look in 4.50 (a huge chord shape filled the Changes window). Their styles are back.
- The pick pattern "Up, twice a bar" no longer says "a bar of 4/4" on a song in 3/4.

### The website and README
- A **Gallery**: real files made by the app from three public-domain songs (chord sheets, Stage copies, learn sheets, pick sheets, words only, a songbook, and the song as a web page, ChordPro and Markdown), to open and look through.
- New pictures throughout, showing this version. The README has them too, with a quick tour.
- The home page heading has no stray "C" over "songs".

## v4.51.0

### A clearer song workspace
- The web song sheet opens with the words visible. Introductory chord shapes, tune notation and rhythm sit in an optional Song overview; the stopped player is compact on a phone.
- Playing choices are labelled as personal to this song on this device. Reset playing choices returns to the song's saved settings. Original key, sounding key and capo chord shapes are shown together.
- Settings separates playing controls from Display preferences. Labels now use Instrument, Accompaniment, Time signature, Details, Song sheet, Stage copy and Group screen.
- Jump to section and a selected line's Play from here make passages easier to reach. Play now pauses and resumes without losing position; Restart and Stop remain explicit. Desktop has a compact transport above the ribbon and an original-key/full-speed reset.
- Accompaniment is directly accessible. Choosing a picking pattern keeps the chooser open; Hear example and Play in Karaoke are separate actions. The desktop distinguishes written patterns from the fallback for unmarked passages.

### Safer editing and accessible playback
- Failed web saves keep the editor open and retain unsaved changes. Retry save and Save a local copy provide recovery. Saves are serialized so typing during a write cannot lose the latest changes.
- Shared Dropbox songs clearly say that archiving affects other devices and folder members, and explain recovery through Archived songs.
- Karaoke and the web Group screen isolate background controls, move focus into the screen and restore it on close. Karaoke lines can be played from the keyboard; editor tabs support arrow-key navigation.
- The Group screen previews its song queue. Download includes Print / Save PDF, and editing provides optional insertion-button help while preserving the editing position when returning from Preview.

## v4.50.0

### Free Practice: easier to start and return to
- Exercises open straight away. Optional **Help** contains instructions and a goal for that exercise only, with a **Close help** button that stays visible on a phone.
- **Recent exercises** shows the last three distinct exercises you started. It survives closing and reopening; browsing or watching a demonstration does not move an exercise into the list.
- A short **Start here** route offers three beginner exercises. Each exercise shows what a successful round should feel like.
- The phone playing view keeps the exercise and Start/Stop in view. **Edit settings** opens the controls; **Back to playing** returns to the exercise. Tempo can be changed without opening settings.

### Keep your practice
- Progress, recent history, personal exercise settings, scores and routines are saved in the public web player between visits. They stay on that browser/device, separately from Dropbox songs. Desktop practice continues to use `practice.json` in the songs folder.
- **Keep your practice safe** provides a separate practice backup and restore. Song backups continue to hold songs; practice backups include routines, settings and history.
- Each exercise starts with its own defaults and remembers your changes. **Reset exercise** restores its starting setup. Opening Soft and loud no longer changes the next rhythm exercise.
- **That was clean** is available after playing a full round. Clean results keep the setup they were played with, so the best tempo for one chord pair is separate from another. Increasing the tempo by 5 bpm is optional.

### Timed changes and routines
- In **One-minute changes**, play for a full minute, then enter your total and press **Save score**. A partner can still use the live counter. Each transition counts once; a return trip counts twice.
- Back, Escape, Close and changing exercises stop abandoned attempts, including their separate timers. Scores keep the identity of the exercise that was timed.
- Routines can capture an exercise's saved personal setup: chord pair, key, pattern, instrument and tempo. Steps can move up or down. One-minute changes always occupies one minute and waits for its score before advancing.

### Other practice improvements
- Instrument/tuning and handedness are visible in practice. Left-handed diagrams and the animated fretboard follow the selected handedness; background controls cannot receive keyboard focus while practice is open.
- Progressions, scales and blues offer all twelve keys. Three-note noodling now uses exactly three pitch classes.
- Ear training offers 2–6-note phrases, **Repeat this phrase** and **New phrase**. **Make a melody** clearly creates a song template with empty tab; it does not record your playing.
- Shared desktop/web practice checks and regression tests cover storage, old-data migration, recent history, saved settings, contextual results and timer cleanup.

## v4.49.1

### Learn sheets for songs that change key
- A `{key: G}` above the song's first chord is the key the song is in, not a key change (a song with `{key: G}` before verse 1 and `{key: A}` before verse 3 was said to be in D).
- The chords are listed in each key: "The chords in G", then "After the key change: the chords in A". A chord that comes in both (E7) is listed in both, with what it does in each: in G it leads into A, the new key.
- Chord map: a part that comes again in the new key says so under it: "Verse 3 and Verse 4: the same in A, the same numbers. Play A for G, A7 for G7, D for C, E7 for D7."
- The chord map leaves out the tab's bars (the Picking section has them).
- The circle of fifths is drawn for the key the song starts in, with a note on where the key change moves home.

## v4.49.0

### Key changes
- **`{key: A}`** on a line of its own: the song changes key there ("Folsom Prison Blues" moves from G up to A). The sheet shows a small **Key change: A** mark; karaoke says it as it comes; changing the key you play in, or rewriting the song in another key, moves it too; ChordPro saves it as `{key: A}` mid-song, and a second `{key}` in a ChordPro file comes in as a key change.
- **Learn counts the chords after a key change in the new key**, so a verse a tone up is still the same verse (one pattern to learn, and the learn sheet says so: "Verse 3 is Verse 1's chords, up a tone"). The chords on the learn sheet are numbered in the key they come in, and its key reads "G major, then A major (Verse 3)". The song's key is guessed from the part before the change (a song half in G and half in A was being called D).
- **Learn spots a key change you haven't written**: one that comes and stays to the end. The learn sheet and Chord patterns say "It seems to move up a tone to A at Verse 3: write {key: A} on a line above it".
- **The chord that leads into it**: when the chord just before is the new key's five (E7 into A), Learn says so: the pivot, or turnaround.
- Fixed: a `{melody}` or `{pick}` line inside a verse no longer splits it into separate parts in Learn.

## v4.48.0

### Learn: more of the chord patterns players know
- **Eight standard progressions added**, so Learn, the learn sheet and Chord patterns name them: **Eight Days a Week** (I – II7 – IV – I), the **garage-rock riff** (I – IV – V – IV: "Wild Thing", "Twist and Shout"), **Pachelbel's Canon** (I – V – vi – iii – IV – I – IV – V: "Streets of London"), **Salty Dog** (VI7 – II7 – V7 – I: "Sweet Georgia Brown"), the **minor four** (I – IV – iv – I), **Creep** (I – III – IV – iv), **minor rock** (i – VI – VII – i) and **Watchtower** (i – VII – VI – VII).
- **A part that's one loop says so.** When a pattern is the whole part, its note adds "Here it's the whole part, round 8 times". When the loop has no famous name, it's still marked as **One loop**: these four chords, round and round, learn them and you have the part.
- **Round the circle** anywhere: four or more chords each a fourth up from the last (Em → Am → Dm → G) are marked even when they don't end at home (the named Circle only counted vi – ii – V – I).


### Your songs in Dropbox, from the web player
The web player can keep its songs in the desktop app's own songs folder, in Dropbox: one set of songs, changed anywhere. Change a song on the iPad and it's in the folder on your computer a moment later (Dropbox syncs it); change it on the computer and the iPad has it the next time it syncs.
- **Dropbox…** (in the web player's song list, on the website): sign in to Dropbox, then choose the songs folder (the one the desktop app uses, with a folder for each song). The songs there replace the public-domain ones; songs you already had on the device can go into the folder too (it asks once).
- It reads and writes the song folders exactly as the desktop keeps them: `Title/Title-song.txt`, `song.ini` (key, tempo, artist…) and `notes.txt`. Exports, history, learn sheets, setlists and Archived songs are left alone. A new song becomes a new folder; renaming a song renames its folder and file; deleting one moves it to **Archived songs** in the folder (so the desktop can bring it back).
- It syncs when it opens, a few seconds after you change a song, when the connection comes back, and with **Sync now**. Only the files that changed are sent.
- **Changed in both places** between syncs: nothing is lost. The computer's version stays as the song, and this device's is kept beside it as "… (changed on this device)", in both places.
- The songs are still kept on the device, so it all works without a connection; changes wait and go when it's back.
- Signing in uses Dropbox's own page (PKCE: no password or secret is kept, only the sign-in on that device). On a Home Screen app on iPhone or iPad, Dropbox shows a code to copy back. **Disconnect** stops syncing and keeps the songs on the device.
- It needs a free Dropbox app key, made once at dropbox.com/developers: the steps are on the website's Phone and tablet page.

## v4.46.0

### Playing beside the editor
- **The words being sung colour in word by word**, in the desktop preview and now in the web player too. Before, a coloured band swept across the line's whole box, so a line that wraps onto two rows (a long line, or Chords in the words) filled both rows at once. Now each word is coloured as it's begun, along the first row and on into the second, as you read it.

### Practice
- **Chord shapes drill: Order.** **In turn, as typed** (now the usual) goes through the chords as you typed them, round and round, so a song's changes (`Dm Dm F G`) can be drilled in its order; **Mixed up** is the old way (any order, never the same chord twice running). Learn's "practise the shapes" still mixes them up.


## v4.45.0

### The web player: write and keep your songs on a phone or tablet
The web player (ukemusic in the browser: iPad, iPhone, Android, or any computer) now keeps your songs on the device and lets you write and change them, not just play them.
- **New song** and **Edit**: the words and chords in the same editor as the desktop app, with the chord sheet beside it (on a narrow screen, behind **Preview**). Buttons type the brackets that touch keyboards hide: `[ ]` chord, `[[ ]]` heading, `{ }` strum, `|` bar, ♪ tune. **Details** (title, artist, year, written by, key, capo, tempo, time, tags) and **Notes**; **Make a copy** and **Delete**. Changes are saved as you type.
- **Add songs from files…**: pick song files from the Files app, Google Drive or Downloads: ukemusic's own (`…-song.txt`), ChordPro (`.cho`, `.chopro`, `.pro`, or ChordPro in a `.txt`), chord sheets with the chords above the words, a **zipped songs folder** (each song with its key, tempo and notes), or a backup. You see what's new, what's changed and what's the same before anything comes in; songs you've changed on the device are kept unless you say so.
- **Back up all songs**: every song in one file, through the share sheet (Save to Files, Drive, Mail…) or as a download. It's the same format as the desktop's file for the web player.
- Songs are kept in the browser's own database (IndexedDB) and the browser is asked to keep them; songs kept by earlier versions move across by themselves. A song changed on the device is marked **changed here** in the list until the desktop app has it.
- The public-domain songs shown at the start become yours as soon as you write or change a song.
- **A proper web app.** It has a web app manifest and icons, so **Add to Home Screen** (iPhone, iPad) and **Install app** (Android, Chrome and Edge on a computer) give it its own icon and window. And it **works offline**: once opened with a connection, the page, the songs, the sounds and the fonts are kept on the device, so it opens and plays with no signal; a new version arrives the next time it opens online.
- **Website: Phone and tablet**, a new page: putting it on your Home Screen (iPad and iPhone, Android, a computer), bringing songs in, writing and changing them, keeping them safe, and taking them back to the computer, with a warning that on iPad and iPhone the Home Screen app keeps its own songs, separate from Safari's. Linked from the home page, Bring your songs, the footer and the web player. The Teach page uses the new names (Add songs from files…, Phone and tablet…).

### Desktop: Phone and tablet…
- **Phone and tablet…** in the library (beside Export every song…): **Save songs for the web player…** (every song in one file, as before, when the button had gone missing) and **Bring in songs from the web player…**: choose the web player's backup and see the songs written or changed there, each with a tick box. New songs are added; changed songs are updated, keeping the earlier version in the song's history and a line in its notes. A song that's only different because it changed on the computer since is left alone.

## v4.44.0

### Pick: fingerpick a song instead of strumming
A new **Pick** tab. The chords stay; your right hand picks a pattern instead of strumming.
- **Pattern** (saved with the song): five standard ukulele patterns, easiest first, played a finger to a string (thumb g, index C, middle E, ring A):
  1. **One string a beat:** g C E A.
  2. **Up, twice a bar:** g C E A g C E A.
  3. **Up and back:** g C E A E C (made for 3/4 and 6/8).
  4. **Pinch and roll:** g+A, C, E, C.
  5. **Alternating thumb (Travis):** the thumb on every beat, swapping g and C, the fingers on E and A in between.
  Each has a 3/4 and a 6/8 version. On a guitar the thumb takes the chord's bass note and the fingers the top three strings. Marked strums ([C↓], {stop}) stay strummed, and a chord that changes mid-bar starts the pattern again.
- **Play** and **Karaoke** play the song picked; the strip shows each string as it's picked.
- **Pick sheet:** the song laid out like a fingerstyle songbook: the pattern counted out (count, finger, string), the chord boxes, then each line as tab with the chord over the bar where it starts and the words under it. A PDF and a web page in the song's learn folder, and in **Export** (under *To learn from*, also for every song).
- **Tab in steps…** (moved here from Learn): for a song with its own tab. Tab written in the song is always played and shown as written; the pattern is only for the chords.
- **How it works:** a short explainer: picking to sing along to (the pattern is the accompaniment; a picked solo, with the tune on top, needs the song's tune written in: then the Chord melody pattern makes one), singing over it, the fingers, the patterns, how tab and chord boxes go together, and songs with their own tab.
- **The tune.** A song can carry its melody, a line at a time: `{melody: E E F G | G F E D | C C D E | E. D/2 D2}` above the words, by note name in the written key (E2 two beats, E/2 half, E. dotted, r a rest; each note the nearest to the one before, ' and , for octaves; a short first bar is a pickup). Or in ABC: `{melody abc: …}`. Verses share the tune: a line without one borrows it from an earlier line with the same chords. Tunes move with the key, and when a song is rewritten in another key.
  - **Pick → Play the tune** plays it quietly over the chords while you learn.
  - **The tune as notes.** A song with its tune written in shows it as music on a staff: by default **a strip at the top**, each tune once (verse 2 isn't drawn again) with its chords above the staff; or **over every line**, like a printed songbook; or hidden (**View → The tune**, saved with the song; the default in Settings → All songs). Treble clef, at the pitch sung, with the key signature of the key you're playing in (or, when the key is only guessed from the chords, the one that fits the tune), ties across bar lines, beamed eighths, triplets and pickups. In PDFs, web pages and the web version too; not on Stage copies. The note being sung lights up as the song plays. The music symbols are the Bravura font's (SIL Open Font License).
  - **Chord melody**, a sixth pattern: a picked solo, the tune on the top strings from the chord you're holding with a chord note under it on beat 1. The pick sheet shows it as tab, pickup and all.
  - Ode to Joy, Amazing Grace, Brahms' Lullaby and Scarborough Fair have their tunes written in. (Scarborough Fair's held chords are now as long as the tune holds them: `[Amx2]`, `[Gx2]`, so it plays at the pace it's sung.)
- **Write out ▾ → The whole song** (Pick): makes a new song in your library with the picking written out as tab you can edit note by note: each picked line in a `` ```tab 4/4 `` block, chords over the bars, words under them, pickups at the end of the bar before. The dialog sets the name, pattern, key, chord names and words, says how many lines it will write, and opens the new song. Lines that aren't picked (N.C., a marked strum), headings and the song's own tab are kept as they are. The original isn't changed. The new song keeps the pattern it was written out with (shown on its Pick tab).
- **Stop** on the Pick tab, beside Play.
- **ChordPro:** `{pick}` and `{melody}` lines are exported as ChordPro custom directives (`{x_ukemusic_pick: …}`, `{x_ukemusic_melody: …}`), which other ChordPro apps ignore and ukemusic reads back. (Before, their contents leaked into the words of the export.) Tab written out by its bars keeps its time (`{x_ukemusic_tab_time: 4/4}`), and a song using any of ukemusic's own directives starts with `# ukemusic:` comment lines (which ChordPro never shows) explaining each one; ukemusic leaves them out on import. See CHORDPRO.md.
- **ChordPro and ABC tunes.** Export → ChordPro has a new option, **with the tune as notation (ABC)**: a song with its tune written in also gets it as an ABC block in each section with a tune of its own, which ChordPro apps that draw ABC show as a stave (off by default, as other apps may show it as text). Bringing ChordPro in, an ABC tune in the file is shared out over the lines after it, bar for bar, and becomes `{melody}` lines when the bars match; when they don't, it's kept on the song's ChordPro tab and the import says so. Exports in another key now move the `{melody}` lines with the chords.
- **Change the pattern as the song goes:** a `{pick}` line changes it from there on, like a strum line: by name (`{pick: up and back}`, `{pick: travis}`), your own by string (`{pick: g C E A E C}`, `g+A` together, `-` a rest) or by finger (`{pick: p i m a m i}`), named to use again (`{pick V: …}`, then `{pick V}`), or `{pick: strum}`. The chords stay chords. **Pick → Change here** adds the line at the cursor; the pick sheet marks where the pattern changes.
- **Pick → Write out ▾ → This line:** just the line at the cursor becomes tab, there in the song, to change single notes; the rest stays chords and patterns (a tune it had moves to the next line that was sung to it). Edit → Undo takes it back.
- **`` ```tab 4/4 ``**: tab with a time after the word tab is timed by its bars (each |…| a whole bar) instead of by the spacing, so held notes and slow patterns play exactly. Plain `` ```tab `` blocks play as before.
- **First note** (Info → The music): the first note you sing. It's sounded with the first click of the count-in, in the key you're playing in, shown in karaoke and on the pick and learn sheets, and there's a **First note** button on the Pick tab. Set for Amazing Grace, Ode to Joy, Brahms' Lullaby and Scarborough Fair.
- **Two classical songs** in Public Domain Songs: **Ode to Joy** (Beethoven, with Henry van Dyke's words) and **Brahms' Lullaby**, set to be picked. Four songs now link to published picking arrangements.
- **Web player:** Learn → **Pick** has the patterns, the pick sheet and the same explainer; the Strum menu can pick too.

## v4.43.0

### Fingerstyle: learning tab
- **Learn → Picking…** (and **Learn → Picking in steps** in the web player) learns a song's tab in layers, each step played in karaoke:
  1. **The chords, strummed:** each bar of tab played as the chord shape it sits in, so your fretting hand learns the changes first.
  2. **The picking on open strings:** the same picking with every string open, so your picking hand learns the pattern on its own.
  3. **Both, slowly:** the tab as written at two-thirds speed.
  4. **Both, in time.**
  Tap a line to start from there; the step is kept.
- When a passage of tab sits on chord shapes, ukemusic says so, bar by bar: "Hold C, pick g-C-E-A" (strings by name; g+A means picked together). A passage that doesn't (a tune, picked note by note) is left as a tune: no shapes are named, and step 1 plays its notes slowly instead of strumming chords that aren't there.
- **From memory** fades the tab too: "first time only" shows a passage the first time and hides it after (tap to see the shapes and picking); "as numbers" shows the shapes and patterns instead of the tab.
- The **learn sheet** has a **Picking** section: each passage once (with ×2 when it comes twice), bar by bar.

### Changed
- **Learn → The changes…** is now **Changes…**, so the Learn tab still fits on one row.

## v4.42.0

### Learn in the web player
The web player has a **Learn** button beside Karaoke, with the same analysis as the desktop app:
- **From memory:** karaoke with the chords fading: each part's chords the first time it comes and a `?` after that, then numbers only, then none. Tap a `?` to see the chord; when you close, it says which ones you looked at. The chord shapes are hidden so they don't give it away.
- **Next chord?:** the quiz on the song's changes, with each answer to hear first.
- **Learn sheet:** shown in the player, in the key and capo you're using, to print (or Save as PDF) or download as a web page.
- **Chord patterns** and the **circle of fifths**, to read.
- On a phone, the play bar puts its buttons on one row and the chord now and the tempo below (with Learn added, they no longer fitted).

Trouble spots, exporting learn sheets and the Exports tab stay in the desktop app: the web player plays songs rather than keeping files.

### Copy AI prompt
- **File → Paste from website** has a **Copy AI prompt** button: it copies a prompt that tells an AI chat (Claude, ChatGPT, Gemini…) ukemusic's song format. Paste it into the chat with a difficult chord sheet (a PDF, a scan, the timing written in words), then paste the answer back here. It's the same prompt as on the website's *Bring your songs* page.

### Fixed
- A setlist with long song names or artists ran its rows under "Adding songs" beside it. Long names are now cut short with "…".

### A new website
- **The front page** now starts from what you want to do, not just chord sheets: *Bring your songs. Learn them, practise them, play them together.* Six doors (Learn, Practise, Perform, Teach, Chord sheets and Bring your songs) and a plain choice between the web player and the desktop app.
- **A page for each purpose:** Learn, Practise, Perform, Teach and Chord sheets, each with what it does on your own and in a group, pictures, and which version suits it best.
- **Bring your songs:** every way to get songs in (websites, club songbooks, ChordPro, typing) and **how to tidy a difficult chord sheet with an AI chat**, with a prompt to copy that describes ukemusic's format.
- New pictures from the app: a setlist, the Session screen going through it, the changes with finger tips, the chords as numbers, and a real Stage copy.
- How Learn works moved to `how-learn-works.html`; the song guide, ChordPro, How Learn works and What's new are linked from every page's footer. On a phone, the menu is a row under the name.

## v4.41.0

### Learn sheets, checked against eight songs
We made learn sheets for eight songs (four traditional, four from a songbook) and checked every part against the song. These are the fixes.

**The key**
- **A riff song's key:** the guess also goes by where the song's parts start. A song that starts most of its parts on one chord, starts on it and plays it as much as any is at home there, even when its chords fit another scale better (a funk riff on Dm, F and G is in D minor, not C major). Used everywhere the app guesses a key: the status bar, Info, the library, Guess the key (which now says why), the web player, Learn and Chord patterns.
- The status bar says 6/8 for a song in 6/8 (it said 6/4), and **This song → Time** has 6/8 and 2/4 (a 6/8 song showed a blank time there, and 6/8 couldn't be chosen).

**Major and minor keys**
- **What each chord does** depends on the kind of key: in C, A major "leads to two (ii)" and E7 "leads to the sad six"; in A minor, F is "away, warm" and D major is "a brighter four, borrowed (Dorian)". Fm in C is "the sad four, borrowed from the minor key".
- **A minor key's own five** (E or E7 in A minor) is family, the strongest way home, not "from outside it". The chords are listed in the right order for the kind of key.
- **Circle notes go by the numbers first:** "five to one", "four to one, the Amen sound" (only for IV to I; F → Am in A minor used to get it), "from home out to five". "Down a fifth" only for moves round the same ring.
- **Chords from outside the key say what they are:** "Fm: the sad four (iv), borrowed from C minor", "D7: the five of G (II7): it leads to G" (or "here used as a colour on the way somewhere else" when the song doesn't go there).

**Parts and words**
- The chord map names a part as the route does: "Chorus and Verse" when they share the chords (it said "Verse ×5, new words each time" for a song whose chorus repeats). The words say **the same**, **mostly the same**, **new, with some coming back**, or **new each time**; a part with no words (an intro) doesn't count.
- The first verse sung again at the end isn't called a chorus; the summary says "The first verse comes back at the end."
- A part made of two others says so: "= the start of B, then A".
- When the whole song is one chord pattern: "One chord pattern for the whole song: learn it once, then it's the words."

**Patterns**
- New: **Five of five (II7–V7–I)**, D7 G7 C, the old-time and music-hall favourite.
- Patterns are numbered in the order they come in the song; the same loop isn't marked twice (Four-chord pop and Sad four-chord); a short pattern isn't found round the end of a part ("C G7 | C").

**Documentation**
- A short paper on how Learn works out a song, where each idea comes from and how far to trust it: `docs/explanation/learning-a-song.md`. A shorter version is on the website as **How Learn works**, and the website's front page now has a Learn section.

**Wording and layout**
- Finger tips: "put your index finger across the G C E strings" (it said "on the across the").
- Chord diagrams that reach the 4th fret line up with the rest.

## v4.40.5
- **The Exports tab lists the learn sheets**, under *Learn sheets*: look at them there, open them, and see "old" on one made before the song last changed. **Delete all** and **Delete old ones** include them; your trouble spots are never deleted.

## v4.40.4
- **Learn sheets from Export:** Export → More formats has **Learn sheet (PDF and web page)**. Tick it and Export makes the song's learn sheet too, in its learn folder; with *every saved key* ticked, one for each key. **Library → Export every song…** does it for the whole library in one go.

## v4.40.3

### The learn sheet takes the best of Chord patterns
- It starts with **the chords and how they feel**: each shape with its number and what it does ("home", "tension (wants to go home)", "the sad home", "rock / Celtic colour"), home first, then IV and V, then the minors, then the ones from outside the key.
- **The song's route** shows the first words of each part, as Chord patterns does, and under it how much there is to learn: how many parts, which to learn first, and which parts are only bits of others.
- The separate "Patterns in it" list is gone when the chord map marks the patterns where they happen.
- Fixed: the words at the start of each chord-map row didn't appear on sheets made in the app.
- A home chord with a seventh (I7, like C7 in C) is "home, leaning on to four", not just "home".

## v4.40.2

### The learn sheet's chord map: words, patterns where they are, and what's really new
- **The words as cues:** each row of the chord map starts with the first words of its line ("Baby love, my baby love…"), so you can find your place and tie the chords to the singing. A part that comes more than once says whether it has **the same words each time** (learn them once) or **new words each time**.
- **Named patterns where they happen:** the bars of a familiar progression are shaded and numbered ①②, with a line under the part: "① Circle: Em Am D G (back to the start), vi ii V I, in the line “tell me, what did I do…”. Each chord a fourth up from the last, round to home." Each pattern is explained the first time and just named after that, so you learn the names as you go.
- **What's really new:** a part that's only the start of another says so ("Refrain = the start of C"), a last verse that repeats its opening says "C, then the start of C again", and a one-chord bit says "one chord". "Learn first" only picks a part that's really its own.
- A part heard once uses its name from the song (Baby Love's last verse showed as "Verse 3").
- **Chord patterns** shows the same: each named pattern with its chords and the line it's in (explained once), "the same words / new words each time", "= the start of C" on a part that's only a bit of another, and a line at the top saying which parts aren't really new.

## v4.40.1
- Fixed: Learn made its own guess at the key instead of using the one the app shows, and could get it wrong: Baby Love (in G) was called C major, and moved to C it came out as a learn sheet "in F" with the wrong numbers. The learn sheet, the numbers, playing from memory, the circle, the quiz and **Chord patterns** now all use the song's key (Info → Written in, or the app's guess shown in the status bar), moved with the chords. Chord patterns also follows the key you've moved the song to with − and + (it used to show the written chords).
- **Circle:** turned so the song's home chord is at the top, ringed, with "Key of G" in the middle and the key's chords numbered round it (IV to the left, V to the right, ii vi iii inside). It used to have C at the top whatever the key, a circle with no start.
- Fixed: the status bar's key ignored the key set in Info → Written in and always showed the guess from the chords.

## v4.40.0

### Learn: understand it, test yourself, fix the hard bits
- **Circle:** the circle of fifths with the song's chords lit, the key's family shaded and arrows for how the song moves, with plain notes: which chords are outside the family, and each change with its numbers ("G7 → C (V7 → I), 4 times: one step anticlockwise and home").
- **Next chord?:** a quiz on the song's changes. The words either side and the chord you're on; pick the next from four (each one can be heard first). You hear the real change after you answer, and get a score at the end.
- **Trouble spots:** the chords you looked at playing from memory, the quiz answers you missed and the lines you mark with **⚑ Trouble here** (or T) in karaoke, kept in the song's learn folder. **Loop it** plays the line round and round, slower and then faster; **Got it ✓** ticks it off. Flagged lines show ⚑ in karaoke.
- The learn sheet has the circle and your trouble spots.
- The Learn tab's labels are shorter so it all fits: From memory, Next chord?, Trouble, Shapes, Numbers, Play it, Circle, Patterns.

## v4.39.0

### Learn: get a song into your head and your fingers
A new **Learn** tab, from the research on how musicians memorise: recalling a song beats reading it again, and fingers, ears and understanding all help.
- **Play from memory:** karaoke with the chords fading, in three steps: the chords the first time each part comes and then `?`, the chords as numbers only, or none. Click a `?` to see a chord; when you close, it lists the ones you needed. The chord shapes and the strip don't give the chords away.
- **The changes…:** every change in the song, the hardest first (moving a finger to another string is harder than sliding it; a finger that stays put helps), with what each finger does, both shapes, and **Practise** or **One minute** to drill that change in Free Practice. **Drill the shapes** runs the shapes drill with the song's chords.
- **Numbers on the sheet:** the preview shows the chords as numbers in the key (I IV V7…).
- **Play in that key:** from memory in another key of the same kind (major or minor), chords as numbers, with "I = G · IV = C · V7 = D7" at the top.
- **Learn sheet:** a PDF and a web page in the song's new **learn** folder (beside exports): key, time, tempo, strum and first chord; the song's parts in order; a chord map with each part once, bar by bar, a row per line, chords and numbers; the chord shapes; the five changes to practise with finger tips; the patterns in it; how to learn it; and a box for trouble spots.
- The learn folder isn't copied with a song to another library (it's made again from the song), and "Learn" can't be a song's title.

## v4.38.0

### Chords in the words, with their timing
- **Words templates:** a line where every letter is a dot and the chords sit in brackets at their letter (`[Dm:2]······· [F:1][G:1]····`). Paste the words on the line underneath and Tidy fills them in, every chord on its syllable however long it's written.
- **Tidy chords above words** understands chords written with strum marks and lengths (`Dm↓:2`), and several run together (`F:1G:1`) go in at the same place, in order. Chords landing on the same spot used to come out in reverse order.
- Fixed: `[Dm↓↓:2]` (two strums over two beats) played only one; the strums were spread over the whole bar and the second was cut. Marked strums now spread over the chord's own length. Strum marks in bar lines (`| Dm↓↓:2 F↓ G↓ |`) are played too; they used to be ignored. `v` works as a down-strum everywhere `↓` does (`[Dmvv:2]`, `| Dmvv:2 Fv Gv |`), easier to type.

### Importing
- Fixed: importing a song with bar lines (`| E7 | E7 G A | E7 | G7 |`) offered to "tidy chords above words", and doing so merged the bars into the next line. Bar lines are left as they are.
- **Importing a song you already have:** saving it under a name that's taken now offers **Replace the words in "…"**, which puts the words into that song (its old words go to its history) instead of leaving you stuck on "There's already a song folder called…".

## v4.37.0

### Web player
- **No more hidden settings in the web player.** The row above the song used to scroll sideways, which a mouse can't do. Now the row holds the everyday ones (Key, Capo, Plays, Strum and Text) and **More** opens the rest: Time, Feel, Sheet, Shapes, Common, Look and the Stage options. On a phone the row is just Key and Capo, with More beside the song's title. More stays open or closed as you left it.

## v4.36.0

From feedback on Reddit.

### Fuller C and G
- **C, G, G7 and Em ring like Am, D and F now.** Two of the ukulele recordings (the open G string and B) die away about 12 dB sooner than the others, so every chord using them sounded thin and short. Those notes now use the A and C♯ recordings, retuned by two semitones. In the desktop app and the web player.

### Strum, time and feel in the web player
- **Strum:** shows the strum the song plays (its own, or the usual one when it has none) and lets you pick another from the strum library for its time. The chosen strum shows on the sheet in place of the song's own.
- **Time:** 2/4, 3/4, 4/4 or 6/8. Changing it picks a strum that fits; back to the song's own time, back to its own strum.
- **Feel:** straight, light swing, swing or shuffle (Auto follows the song).
- All three are kept per song on the device, like key and capo.

### Public Domain Songs
- **Amazing Grace** is a waltz: `{D>DD}`, a strong down on 1 and two lighter downs.
- **The Wild Rover** and **Scarborough Fair** lean on beat 1 (`{D>-DUDU}`).
- **House of the Rising Sun** is in 6/8 at 60, strong on 1 and 4 (`{D>DDD>DD}`), instead of the island strum.

### Documentation
- **ukemusic and ChordPro** (CHORDPRO.md): what comes in from a ChordPro file, what goes out, and ukemusic's additions to the format.
- **The website has pages** for the song guide, ChordPro and What's new, made from the .md files every time the site is built.
- **Release notes:** each release on GitHub gets its version's section of this changelog.
- ChordPro: `{swing}` and the other feel lines go out as `{comment: Feel: swing}` and come back; before, they came back as a heading called "Strum".

## v4.35.0

### The Session screen, for playing together
- **Play → Session** (the Session screen) puts the song on one screen for a group to play from (a club night on the TV or projector): the whole song, as big as it will go, laid out for you so nobody scrolls.
  - Verses, choruses and the rest are arranged in one, two or three columns and never split across them; ukemusic picks the largest text that fits (at least 18px).
  - Chords sit above their words, and a long line wraps with its chords still over the right words. If a song still won't fit, the chords go into the words; if even that won't fit, it turns over in as few pages as it can.
  - The chord shapes run down the side (across the top on a tall screen), with the strum pattern at the top of the song. "Chorus once, then as before" (This song → Stage copies) is used here too.
- **A setlist as a Session:** the Session button on a setlist goes through it song by song. → Space, PageDown or a presentation clicker for the next page or song, ← to go back, or tap the right or left of the screen.
- **With a TV or projector plugged in,** the Session screen goes full screen on it, and the laptop keeps a small bar showing the song now and the next one, with ‹ › to turn and its arrow keys still working.
- On the Session screen: + and − change the smallest text size, M puts the chords above or in the words, D is dark, C hides the common chord shapes, Esc ends it.
- **Check songs fit one screen…** (the library button) lays out every song as the Session screen would on a 1920×1080 TV, and lists any that need a page turn or would only fit with the smallest text.
- **The web player has it too:** Session beside Karaoke, full screen, going through the songs as listed (so search first for tonight's songs). Works on a laptop plugged into a TV, or a tablet.

## v4.34.0

### Club songbooks
- **Songbook marks are part of the song format,** as the North Shore Ukulele Circle writes them, and show on the sheet as written:
  - `[C↓]` one strum, left to ring (`[Cv]` is the same); `[C↓↓]`, `[C↓↑]` those strums, spread over the bar;
  - `[x]`, `[mute↓]`, `[x↓↓]` muted strums: a "chk" on each beat;
  - `[.]`, `[…]`, `[G…]` keep the chord going; `[Bm7.Am7]` two chords sharing the bar;
  - `[|]`, `[/]` bar lines; `[x2]` at the end of a line plays it twice;
  - short names `Gs4`, `A7s4`, `Gs2`, `Dma7`.
  They play, change key and go through ChordPro unchanged. Write → How to write has a table.
- **Import ChordPro files…** (File → Library, and the library button): a whole folder of `.cho` files comes in at once, one song each, with tags, Spotify and YouTube links, and the file's other details on the ChordPro tab. Each subfolder becomes a setlist. Songs already in the library are left alone. Imported songs are marked "Copyrighted: for my own use", so they stay out of shared library packs.
- ChordPro import also reads: custom sections (`{start_of_x_intro: Intro}` and the like) as headings; strum boxes (arrows over counts) as strum patterns, a named one used again after headings of that name; `{tag}` as tags; `{define-baritone}` shapes for the baritone; `[Riff 1]` as a label.

### Harmony lines
- `{harmony}` … `{lead}`: the lines in between are a harmony part, in italics. ChordPro's `{x_voice: harmony}` comes in and goes out as this.

### ChordPro export loses nothing
- ukemusic's shorthand goes out as ChordPro notes other apps print above the words, and comes back exactly: `[C][*×3]`, `[Em][*2 beats]`, `[N.C.][*2 beats]`, `[*stop][C]`.
- Fixed: a `{stop}` line came back from ChordPro as a section heading; `[N.C.]` was dropped on import.

### Chord diagrams
- **Power chords** (C5, G5 …) have diagrams on every instrument, the shape lowest on the neck.
- **View → Hide common** leaves out the diagrams of the chords everyone knows (C, G, Am, F, D7 …), so the ones to look at stand out. The list is in Settings → All songs → Chord diagrams. Also in the web player (Common: shown / hidden).

## v4.33.1

### Ready for a public repository
- **No copyrighted words anywhere in the app, the guide or the tests.** Examples now use Oh! Susanna, Clementine and other public-domain songs, or words written for the test.
- **The Public Domain Songs library** (`public domain songs/`) is part of the project.
- **The web version builds itself:** `npm run build:web` (or GitHub Actions on every push) makes the page, the WAV samples and the public-domain songs file. It works on any web server as well as on claude.ai.
- Web: a panel that should have been hidden (Replace the songs) showed on the library page; the empty library no longer mentions a New song button the web version doesn't have.
- **The web version catches up with the desktop app (4.24–4.33):** Stage formats (Clear, Brackets, Compact, Heavy) and "Chorus: once, then as before" on the Stage look and the Stage download, set per song as on the desktop; karaoke shows the chord still playing as a faint "(C)", a line can be tapped to play from there, and there's a From the start button; the shorthand key at the foot of downloaded sheets; informal labels and headings with a stray space read as on the desktop. Downloads work in any browser, not just on claude.ai.
- **A website for the project** (`site/`): what ukemusic does, with screenshots, downloads for Windows, Mac and Linux, and the web version at `/app/`.
- **Free Practice** (was Practice) is an orange button, first on the songs screen before the heading, in the desktop app and the web player, so it isn't missed beside Settings.
- **Web player on iPhone and iPad: playing no longer sticks on the count-in "1".** Safari only lets sound start in the tap itself, and the player waited for the screen-awake request first; now every tap wakes the sound and playing doesn't wait. If the sound still can't start, a message says so instead of freezing (check the silent switch too).
- **The web player comes with songs:** on the public site it opens with the public-domain songs (the eight with words) ready to play, sing and practise, and says how to bring your own from the desktop app. Your own songs, once loaded with Update songs, take their place; "Bring back the public-domain songs" swaps back. On claude.ai nothing changes. The site calls it a player, since it plays songs rather than writing them.
- **Installers on every release:** GitHub Actions builds the Windows installer, Mac disk images and Linux AppImage and attaches them to the release.
- Public Domain Songs: the strums of Amazing Grace, Scarborough Fair and The Wild Rover now fit a bar of 3/4 (`{D-DUDU}`), and It's a Long Way to Tipperary's fits 4/4 (`{D-DUD-DU}`).
- `.gitignore` keeps your songs, exports, history and working files out of the repository; MIT `LICENSE` added.

## v4.33.0

### Clearer for a beginner (from the review: U1–U9)
- **One name per action**, the same in the menus, the ribbon and the hints:
  - Guess the key
  - Tidy chords above words (was Process Import / Convert Chord Lines)
  - Paste from website
  - Strum patterns
  - Edit style
  - Close song
- **Archive has a box icon**, not a bin.
- **The menu bar matches the ribbon:** File, Edit, View, **Write**, **Play**, Help.
- **The ribbon changes this song.** View → Layout, Diagrams, Strum patterns and Play → Feel now change only the song you're on; they used to change every song unless the song already had its own setting. A setting the song has its own value for is marked "· this song". The defaults for all songs are in Settings → All songs. (Left-handed is marked "all songs".)
- **Export ticks just the chord sheet PDF** (and its Stage copy). Web page, Markdown, ChordPro and the words-only files are under **More formats**, in plain words. "Make these my usual" still remembers your choice.
- **One "Exported" line a day** in a song's notes, instead of one per export.
- **Library rows have one ⋯ button**, with the actions in words: Add to a setlist, Copy or move to another library, Archive.
- **The Play tab fits on one row:** count in, follow the words, start at the cursor and the voice are under **Options ▾**.
- **Plainer labels:**
  - The editor tab is **Words & chords**.
  - Look is **Song sheet / Stage copy**.
  - Layout "Columns" is **Chords above, in columns**.
  - Feel "Auto" is **As written**.

## v4.32.0

### Printed output (from the review: B8, P1–P5)
- **Exports know when they're out of date.** "Old" on the Exports tab now also means made by an earlier version of ukemusic, made before the look changed (style, Stage format, layout, section names, diagrams), or named after the song's old name, not just made before the song changed. Point at "old" to see why. After an update, Export every song brings everything up to date, including the Stage PDFs made by 4.28.
- **Renaming a song offers to tidy the old exports** still named after its old name.
- **Section names are landmarks on Stage copies:** full size and bold, in a light band with a bar at the left, so you can find "Chorus" at a glance.
- **A key to the shorthand at the foot of every sheet:** only what the song uses, e.g. "F:1 = 1 beat of F · C×2 = 2 bars of C · | = one more bar of the chord before".
- **Part names written as words** ("Bridge (x2): [F] [Em] …", "Solo (x2): | C | G |", "Ending last time:") are labels now, so their chords line up instead of floating over the words.
- **Settings → Stage copies → Chord diagrams:** as on the song's sheet, or none (more room for the words).
- **Fewer half-empty pages on Stage copies:** only short parts are kept whole on a page.

## v4.31.0

### Protecting your songs and settings (from the review, REVIEW.md B1–B9)
- **Undo works after a pause.** The editor rebuilt itself 0.3 seconds after every edit to reapply its colours, which threw the undo history away (Ctrl+Z after a pause did nothing). The colours now change without a rebuild. Opening another song starts a fresh undo history, so Undo can never bring back the song you had open before.
- **Earlier versions** (File → Earlier versions…): every save keeps the version before, the last 20, in the song's .history folder. Look at one and put it back (then Save, or Undo).
- **No empty saves by accident:** saving a song with no words or chords over one that has them asks first.
- **A failed save says so** (it used to fail silently): which file, why (in use by another program, folder moved, disk full), and Save as new when the song's folder has moved.
- **Safe writing:** songs, settings, notes, links, setlists, config.ini and style sets are written to a temporary file and then swapped in, so a crash or a full disk never leaves one cut short. config.ini's previous version is kept as config.ini.bak.
- **Settings that can't be read are never overwritten:** if config.ini can't be read at start-up, ukemusic runs on its defaults without saving over it, and tells you. A song whose song.ini can't be read (locked by OneDrive or antivirus) isn't opened, rather than being given blank settings.
- **Settings ukemusic doesn't know about are kept** in song.ini instead of being dropped on every save; words such as a source "0123" stay words.
- **Renaming, archiving and moving** retry when Windows briefly locks the folder, let go of the Exports-tab preview first, and say plainly what to close if it still fails.
- "Archived songs" can't be used as a song title. The log no longer fills up with the PDF preview's harmless messages.

## v4.30.0

### Stage copies: choruses
- **Every chorus is printed in full** unless you choose otherwise. 4.29 shortened repeats by default.
- **Settings → Stage copies → Repeated choruses** is the explicit choice: "Print every chorus in full" (the default) or "Don't repeat: print it once, then 'Chorus — as before'". A song can have its own (This song).
- **No guessing:** only parts the song itself marks with a heading ([[Chorus]], [[Refrain]]…) are ever shortened, and only when the words and chords are exactly the same. A song with no headings (Let Your Love Flow, Country Roads) is always printed in full. Write → Chord patterns → "Write the part names into the song" adds headings if you want them.
- **Stage copies have their own Settings section:** format, repeated choruses, shrink to fit, font and size, gig folder.

## v4.29.0

### Stage formats (Stage copies for a gig or practice at home)
- 4.28's squeezed Stage look is gone: printed, it was readable but not scannable. Your Stage style is put back as it was.
- **Settings → Stage: format** chooses how Stage copies look, and **Export → Stage** gives a song its own (Default follows Settings):
  - **Clear** (the default): chords above the words. Words in plain type, chords in bold above them, a clear gap between parts. The easiest to scan.
  - **Brackets**: as Clear, each chord in light brackets: [C].
  - **Compact**: chords in the words, in bold with light brackets, with no black blocks. The shortest.
  - **Heavy**: the 4.19 Stage look (all bold, white-on-black chords), in the song's own layout.
- **A part that comes back exactly the same is printed once**, then as a one-line cue: "Chorus — as before" (or "as before, twice"). A chorus that changes (a different line, or the chords in different places) is printed in full. On by default; Settings → Stage, or per song.
- **Shrink to fit** stays, but never below 16px, and only the size changes, never the spacing.
- View → Stage shows the Stage copy in its format.

### Karaoke
- Words that start before a line's first chord now show the chord still playing from the line before, faintly in brackets: (C). They were always timed with it; now you can see it.

## v4.28.0 (Stage changes put back in 4.29)

### Stage copies on fewer pages
- **Chords in the words** on Stage copies use an ordinary bold font (Segoe UI or Arial) instead of the fixed-width one. Nothing has to line up in that layout, and the fixed-width font made almost every line wrap. Lines are closer (1.45 instead of 1.7) and the white-on-black chords are slimmer. Baby Love's Stage copy goes from two pages to one at full size. Chords above the words keep the fixed-width font, which they need.
- **Shrink to fit** (Settings → Stage: shrink to fit fewer pages, on by default): a Stage PDF that runs onto another page is printed again a little smaller, no smaller than 14px, and kept smaller only if that saves a page (Let It Be: 3 pages to 2).
- Your Stage style (styles/stage.css) is updated for this; if you edited those lines yourself, they're left alone.

## v4.27.0

### ChordPro tab: nothing from a ChordPro file is lost
- A new **ChordPro** tab beside Notes lists every ChordPro field the song has: {title}, {subtitle}, {artist}, {composer}, {lyricist}, {arranger}, {album}, {year}, {copyright}, {key}, {capo}, {tempo}, {time}, {duration}, {sorttitle}, plus any {meta: …} or {x_…} fields, and the file's other lines (# comments, {textfont}, {columns}, {new_page}…).
- Fields ukemusic also has are **linked** (↔ Info → Artist, This song → Tempo…; the song's capo is still exported as {capo}). The song's own values win, and changing one on this tab changes it there. When an imported value differed, the tab says what the file had.
- **Importing** a ChordPro file keeps everything in the song's chordpro.txt. {subtitle} becomes the artist when there's no {artist}; {tempo} now sets the song's tempo. {capo} is kept on the ChordPro tab rather than set as the song's capo (ChordPro files write capo shapes; ukemusic writes the sounding chords).
- **Exporting** to ChordPro writes the song's own values, then every kept field and line, so a song can go out and come back without losing anything. A saved key's export puts the key change in the subtitle only when the song has no subtitle of its own.
- **+ Add a field** for anything of your own (written as {meta: name value}).
- The ChordPro fields go with the song in library packs and when copying to another library.

## v4.26.0

- **Section names: Default.** Export → Section names now has **Default**, which follows Settings (it shows which: "Default (Show)"), plus Show, Small and Hide for this song only. The general setting is back in Settings → Section names, as the default for every song. Choosing Default takes the song's own choice away.
- Fixed: a heading line with a stray space after it ("[[Chorus]] ") wasn't treated as the start of a section, so Small and Hide missed it (the first Chorus in Mull of Kintyre).

## v4.25.0

### Libraries (as in Calibre)
- A **library** is a folder of songs with its own setlists and archive. Your songs folder is your first library. The **library button** at the top left of Your songs (and **File → Library**) lists your libraries with their song counts: click one to switch.
- **New library…**: a name, what it's about, who made it and its licence (kept in the folder's library.ini). It's made beside your current library (or choose where).
- **Add a library folder…**: use any folder of songs as a library (an old songs folder, a copy on a USB stick). **×** takes a library off the list; its folder isn't touched.
- **⇄** on each song: **Copy** or **Move** it to another library. A copy leaves its exports behind (export it again there); a song of the same name there asks first and can keep both ("Rainbow (2)"). Greyed out until you have a second library.
- **Share as a library pack…**: the library as one **.ukelib** file (a plain zip): the songs, their settings and links, the setlists and the library's details, with the notes only if you tick it. Songs not marked free to share are listed first, and you can leave them out.
- **Open a library pack…**: see what's in it, then open it as a **new library** or **add its songs** to the one you have open (songs it already has are left alone).
- **Info → Licence** on each song: Public domain, My own song, Shared with permission, or Copyrighted: for my own use. The starter songs are marked Public domain.
- Library options that can't be used are greyed out (Share with no songs in the library, Copy/Move with one library).

### Section names belong to the song
- **Export → Section names** (Show / Small / Hide) is now saved with the song. (4.26 adds Default, which follows Settings.)
- Fixed: a song's own section names and swing feel were lost when it was saved.

## v4.24.0

### Chord patterns: with the words, and better part names
- Each part shows **how it goes**: the chords over the words, the first time it's sung, with the numbers beside each chord. A chord in brackets, like (G), is still sounding from the line before.
- **The song, part by part**: each step of the route shows its first words ("B Verse — I come from Alabama…"), and each part says where it **comes** — click one to go there in the song.
- **Write the part names into the song**: puts the guessed names in as [[Verse]], [[Chorus]]… headings before each part that has none. Your own headings are never changed; correct any guess and the analysis goes by your heading from then on. (Export → Section names still hides them on paper.)
- Better guesses:
  - a chorus is a part whose **words come back**, not just one with the same first words (Let Your Love Flow's two-half chorus);
  - when the verse and chorus share chords (Stand by Me), the blocks whose words come back are the chorus;
  - two different verses heard once between choruses are verses, not bridges (Mr Tambourine Man);
  - short bits before the first verse are the intro; a single line between parts is a "Link";
  - "Bridge (x2):", "Solo:", "Ending last time:" written as plain words count as headings;
  - a heading followed by a blank line names the part after it.
- **Add to notes** includes each part's words.

## v4.23.0

### Chord patterns that make sense of real songs
- The song is split into its parts at **blank lines** as well as [[headings]], so songs without headings (most pasted ones) come out as verses and choruses, not one long block.
- Parts with the same chords share a letter, even when one goes round once and another twice. Unlabelled parts are named from how they behave: the same opening words every time is the **chorus**, new words with the same chords is a **verse**, a part heard once is the **intro**, **ending** or **bridge**. Songs without words still split, by their chords.
- **The song** shows the route: A Intro → B Verse → C Chorus → B Verse → C Chorus → D Bridge → C Chorus ×2 → E Ending; and which part comes most ("learn that first").
- Each part shows its chords line by line as numbers and as chord names, a part played twice through shown once ("twice"), and "In short" when a progression goes round (I – vi – V – IV ×2 – I).
- A heading on a line of chords ("Intro:") no longer renames the verses that share them; it says "the Intro uses these chords too".
- A guessed key now prefers the chord the song starts and ends on (I Can See Clearly Now is in D, not G).

## v4.22.0

### Exports tab (Song, Info, Links, Exports, Notes)
- Every file exported for the song, by folder (Song, saved keys, Stage, Lyrics), with when it was made and **how**: the style set or Stage style, the key, paper size, section names.
- **Old** marks files made before the song last changed; a note at the top says how many.
- Click a file to **preview** it in the tab (PDFs and web pages as they look; ChordPro, Markdown and text as text); **Open** and **Show in folder**; double-click opens it.
- **Delete out-of-date** or **Delete all** (to the Recycle Bin, after asking); **Export now…** and **Folder**.
- The record is kept in exports/export-log.json; each export also adds one dated line to the song's notes ("Exported 5 files (Classic + Stage, A4)").

### Where exports go
- **Gig folder** (Settings → Export): one folder for gig sheets, say in OneDrive or iCloud Drive; every Stage PDF is also copied there when you export (can be turned off).
- **Setlist folder…** (Setlists, beside Songbook PDF…): one PDF per song, numbered in setlist order (01 …, 02 …), in the gig folder (or Setlists in your songs folder). Stage by default; making it again replaces the numbered PDFs.
- **Usual formats**: in the Export box, tick what you want and "Make these my usual"; next time those are ticked. Settings → Export shows them, with "Back to all".

### Playing
- **From the start** (Play tab, and ⏮ in Karaoke): from the top, whatever the cursor, and while playing it jumps back.
- **Click a line** in Karaoke to play from there; while playing, clicking a line in the preview jumps there too.

## v4.21.0

### Chord patterns (Write → Chord patterns, or Song → Chord Patterns…)
- The song's chords as numbers in its key (**I IV V**, **vi** for the minor six…), with what each one does (home, away, tension, the sad home).
- Each section's progression, line by line (a line played twice straight off shows as ×2), with the chord names under it.
- Familiar progressions named, with a way to remember each: four-chord pop (I–V–vi–IV), 50s/doo-wop (I–vi–IV–V), the three-chord trick, ii–V–I, home and away, Andalusian, 12-bar blues and more.
- Sections with the same progression share a letter (Verse 1 A · Chorus B · Verse 2 A), so you learn each letter once, then the order. **Add to notes** puts it all in the song's notes.

### Archive instead of delete
- The bin on a song's row (or File → **Archive**) puts the song away in **Archived songs** (a folder in your songs folder). It leaves the list (setlists show it as missing) and the toast has **Undo**.
- **Archived songs** below the list: **Bring back**, or **Delete for good…** (to the Recycle Bin, after asking).

### Export every song
- **Export every song…** (beside Open songs folder) exports every song again with the usual Export choices, each into its own exports folder: handy after changing a style.

### Strum boxes
- The strum box no longer says "light swing", "shuffle" and so on: the feel is for playback only.

## v4.20.0

### Your songs (the home page)
- Just **New song** beside the heading. Paste from a website and Import a file are on the song page (File tab); with no song open, **Paste from website** starts a new song. Songs for the web… has gone from here.
- **Practice** and **Settings** are at the top right. **Settings now opens from Your songs** (it was opening behind it).
- **Delete a song**: the bin at the end of its row (or File → Delete…). It asks first, and the song's folder (song, notes, links and exports) goes to the Recycle Bin, so you can get it back.

### Menu bar
- Menu items for a song (Save, Export, Print, Undo, Guess the Key, Play…) are greyed out when you're not on a song page; Open Exports Folder also needs the song saved. View → Settings works everywhere.

### Voice (Play and Karaoke)
- **Play → Voice ▾** (and Settings → Playback), each on or off: **Count in out loud** ("one, two, three, four"; in 6/8 "one, two"), **Say what's next** ("Chorus", "Verse 2", about a bar ahead), **Say the next chord** ("G seven", "F sharp minor", just before it changes; with a capo, the shapes you play). Uses your computer's own voice. Nothing talks over the count-in, and a chord that would come late is left out.

## v4.19.0

### Stage is a style of its own
- Every **Stage** copy (exports, stage songbooks, View → Look: Stage) now uses the **Stage style** (styles/stage.css), whatever style set your song copies use. So you can make Songbook copies and still get the usual Stage copies, without switching back and forth.
- **View → Look: Song / Stage** shows either copy. **Edit style…** edits the one you're looking at: the style set, or the Stage style. The Stage font and size (Settings → Export) are kept in the Stage style.
- Fixes: chords in the words (the "Chords in the words" layout) are now white on black on Stage, so they never disappear into **bold** words; every layout is bold on Stage (the words in that layout weren't); a song's own font no longer changes its Stage copy; **bold** words show as a grey band on Stage (everything else is bold already).

### Export folders
- **exports/Original** is now **exports/Song**, and every Stage copy (all keys, and the Stage lyrics) goes in **exports/Stage**. A song's older folders are tidied the next time you export it.

### More varied style sets
- **Big and clear**: bigger again, bold chords, headings in black bars. **Ink saver**: black only and compact, to fit more on a page. New **Modern** (teal chord chips, indigo headings with a side bar, tinted diagrams) and **Night** (light on dark, for a screen or tablet). Each set with its own colours keeps them in the app's dark mode.
- Built-in sets you haven't edited now stay up to date with the app; ones you have edited are left alone. (Sets from before 4.19 are refreshed once; the old copy is kept as .before-4.19.)

### Links
- A **Links** tab (Song, Info, Links, Notes): add web pages for the song: the original on YouTube, a uke play-along, a lesson, the Wikipedia page. YouTube links show the video's picture; click to open in your browser. Kept in links.txt in the song's folder.

### Setlists
- The setlist's "Add songs" list has gone. Add from **Songs**: the **+** at the end of each song's row (and each saved key's row). The setlist you added to last is at the top, so adding several songs is one click each. File → Add to setlist… also puts it first.

### Play tab
- **Play along** is now **Karaoke**. **Practice** has left the Play tab: it's on the songs screen.
- ChordPro exports of 6/8 songs say 6/8 (they said 6/4).

## v4.18.0

### Swing
- **Play → Feel**: Auto, Straight, Light swing, Swing, Shuffle (for this song, or all songs in Settings → Playback). Swung, the beats stay where they are and each in-between strum (the "&") comes a little late (58%, 62% or 67% of the way), so the strum goes long-short; the tempo and bar lengths don't change, and the strokes on the beat lean a little harder.
- **Auto** (the default) gives the Island strum a light swing and plays everything else straight.
- In the song: `{swing D-DU-UDU}`, `{light swing …}`, `{shuffle …}` or `{straight …}` set the feel from there on; `{swing}` on its own changes just the feel.
- Patterns in pairs of eighths or sixteenths swing; quarter-note, triplet and 6/8 patterns are left as they are. The strum box says "light swing", "swing" or "shuffle" when a pattern is played that way. Hear it in Write → Strums… and in Practice too.

### 6/8 tempo
- In 6/8 (and 9/8, 12/8) the tempo now counts **dotted quarters**, two a bar, as tempo lists give it. 6/8 at 60 used to play each eighth at 60 (three times too slow); now it's one "1… 4…" a second. The count-in clicks loud on 1 and 4, soft between, and the strum box shows the tempo as "♩. = 60". 4/4, 3/4 and 2/4 are unchanged.

### Screen
- Play: Sound and Feel sit one above the other, so the Play tools fit on one row.

## v4.17.0

### Section names: Show, Small or Hide (fewer pages)
- **Export → Section names** (also in Settings, and per song under This song's settings): **Show** as before, **Small**, or **Hide**. Hidden, "Verse 1", "Chorus" and so on are left out and the sections are just a line apart, so a song prints on fewer pages; a long test song went from 4 pages to 3.
- A heading with nothing under it, such as a lone "Chorus" telling you to play it again, is a cue: it **always stays** (smaller), so you still know what to play. "[[Chorus]] x2" on a line of its own shows as before.
- It applies to the preview, PDFs and web pages (Standard and Stage), songbooks and the lyrics pages. The rules are in the style sets (the "Section names" part), and your style sets get them the first time 4.17 starts.

## v4.16.2

- **Strum boxes are back to their 4.16.0 size.**
- **Plain strum patterns** (View → Strum patterns: Plain) are now bold, in the words' colour, and bigger than the words: 1.2 × by default. **View → Plain strums** (As the words, Bigger, Large, Extra large) changes this; it's kept in the style set as `--plain-strum-scale`. Your style sets are updated the first time 4.16.2 starts.

## v4.16.1

- **×** at the right of the tabs now **closes the song** (as File → Close). The **⌄** beside it hides the tools; press it again (it turns to ⌃), or click any tab, to show them.
- Strum boxes were made bigger here (View → Strum size); 4.16.2 puts them back and makes the plain strum patterns bigger instead.
- No more flash of the song screen at start: when ukemusic starts on **Your songs**, that's the first thing you see.
- View: the Tab look menu sits with the Sheet tools, so View fits on one row again.

## v4.16.0

### Style sets
- **View → Style set** picks the look of every song: **Classic** (as before), **Big and clear** (large, dark text, big diagrams), **Songbook** (warm paper, serif headings, boxed chord diagrams) and **Ink saver** (black only, for black-and-white printing). The preview, exports and PDFs all follow it.
- Your own style.css becomes the set **My style**, and stays in use. (The old file is kept as style.css.moved-to-styles.)
- **Edit style…** (on View now, beside Style set and Look) edits the set in use. In the editor: **Save as new set** makes a copy of your own, **Put back as it came** restores a built-in set, **Delete this set** removes one of yours, **Open styles folder**.
- Every set is a file in the *styles* folder beside config.ini.

### Easier to read
- Strum pattern boxes are bigger: the letters (D, U) and the count (1 & 2 &) are now the size of the words or larger. Their size is `--strum-size` in the style set.
- Plain strum patterns are 14px, not 12px (and an older style.css still at 12px is lifted to 14px).
- Chord names under the diagrams are bigger and closer to the diagram.
- Every part of a chord diagram (lines, dots, open and muted strings, fingers, barre, fret number, name) can now be coloured from the style set: `--diagram-line`, `--diagram-dot`, `--diagram-finger`, `--diagram-name`.

### Screen
- The Preview header has its own colour.
- **×** at the right of the tabs (File, Write…) hides the tools for more room; click any tab to show them again.
- View: the tab options are under **Tab look ▾**, so the View tools fit on one row.

## v4.15.1

### Tempo, time and key: one place each
- **Tempo and time** are set on **This song** only. **Info** shows them as a fact ("80 bpm · 3/4") with a **Change on This song** button that takes you there.
- Info's **Key** is now **Written in** (the key the song is written in, used for the key name and capo hints). It is no longer repeated in the song settings box.

## v4.15.0

### More of the look lives in style.css
- **Stage** is now a section of **style.css**, used for the "(stage)" PDFs and web pages, stage songbooks and the lyrics' stage versions. Its font, size and colour are `--stage-font`, `--stage-size` and `--stage-color` at the top of style.css; Settings → Export changes the font and size there.
- **View → Look: Standard / Stage** shows the song in the preview as it will look on stage.
- The **tab** options (View → Tab) and the **title** at the top of exports are rules in style.css too: the options switch them on.
- Your style.css is brought up to date the first time 4.15 starts: the new sections are added at the end and your own settings are kept (the old file is kept as style.css.before-4.15).

### Songs for the web
- **Songs for the web…** (in the library, beside Open songs folder) saves every song in one file. Put it where your iPhone or iPad can reach it (iCloud Drive, OneDrive, or email it to yourself), then press **Update songs** in ukemusic on the phone. The desktop is the master copy.

### The web version is for playing and practising
- No editing on the web: no new song, paste, Edit, Info or Notes. Songs come from the desktop with Update songs.
- Key, capo, instrument and tempo changes are kept on each device. A Look: Standard / Stage choice is on the toolbar.

## v4.14.0

### Help → About
- **About** (Settings tab → Help, or the menu Help → About ukemusic) shows the version and thanks everything ukemusic uses, with its licence and a link: the FreePats ukulele recordings (CC0), the chord shapes from chords-db (MIT), the editor (CodeMirror, MIT), ini (ISC), Electron, and the public-domain starter songs and practice tunes. The web version has the same page, listing what it uses.
- THIRD_PARTY_NOTICES.md now has the licence texts for the editor and ini as well.
- Links open in your web browser.

## v4.13.0

### Exporting
- **Export now** opens one more step, the export list, with **everything ticked**: the chord sheet as a PDF, a web page, Markdown and ChordPro, and the lyrics as a PDF, text and a web page. Untick what you don't need this time, then Export. (Choose… and the Print style list are gone.)
- PDFs and web pages are always made **twice**: Standard (your colours) and **Stage** (bold black, easy to read at a gig), as "… (stage).pdf" / "… (stage).html" alongside.

### Bold, italic and underline in the words
- Write `**bold**`, `*italic*` or `__underline__`, or select words and press **B**, **I** or **U** on the Write tab (Ctrl+B, Ctrl+I, Ctrl+U; press again to take it off). The editor shows the words that way, with the markers faint.
- It shows in the preview, PDFs, web pages and the lyrics, in every layout, and chords still line up (the markers take no room). It can run across chords. Text exports, ChordPro and karaoke show the plain words.
- A lone `*` with no partner on the line stays a `*`; `\*` and `\_` are always a real * and _.

### Tab styles
- **View → Tab**: the fret numbers (coloured and bold, bold, or plain), the size of tab compared with the words, a shaded **box** behind each tab block, and **faint lines** (fainter dashes and string names so the frets stand out). For all songs.
- **Export → Tab in PDFs**: untick to leave tab out of printed sheets.
- The Stage style makes tab frets extra bold.

### Library, new songs and the stylesheet
- The library's start cards are **one row of four**: New song, Paste a song from a website, Import a file, Practice. **Open songs folder** is a small button beside "All songs".
- A **new song** starts in **4/4 with the Island strum**, whatever the defaults are.
- **Stylesheet** (Write tab, or Ctrl+Alt+E) opens a simple text editor in the app: edit and **Save** (or Ctrl+S), and the preview changes straight away. **Open in another editor** still opens style.css in your computer's editor.

### Process Import
- **Chords into words** has moved to the File tab, beside Import text file and Paste from website, and is now called **Process Import**. The tooltip explains it: it moves chords that sit on their own line above the words into the words.

## v4.12.0

### Practice is now its own section
- **Practice opens on a menu**: categories on the left (Warm-ups & finger work, Chords & changes, Strumming & rhythm, Fingerpicking, Scales & melody, Noodling & creativity, My routine), and a card for each exercise with a **difficulty badge** (Beginner, Improver, Intermediate), its aim, and when you last did it, at what tempo. A card opens the trainer, already set up; **← All exercises** (or Esc) goes back.
- **39 exercises**. Everything that was there before, plus:
  - **Warm-ups**: string hopping, finger stretching (start high, come down a fret a round), fretboard walking.
  - **Chords**: a **chord shapes drill** (form it in a silent bar, strum it on the next), **one-minute changes** (tap Space on every clean change; your scores are kept and graphed), **progressions** (I–V–vi–IV, 50s, three chords, ii–V–I and more, in any key), a barre-chord preset, arpeggios.
  - **Rhythm**: downstrokes, down-up, island, chucking, a **rhythm ladder** (quarters → eighths → triplets → sixteenths → syncopation), **soft/loud** dynamics, and a **metronome** with tap tempo, sub-clicks and an accent.
  - **Fingerpicking**: single string (i m), alternating fingers, four-string picking, picking patterns, flowing arpeggios. The fretboard shows the held chord, and the arrow says which right-hand finger: p i m a.
  - **Scales & melody**: C major in open position, the minor pentatonic, scales in other keys, sequences (1-2-3, 2-3-4…), simple tunes (Twinkle Twinkle, Ode to Joy, Frère Jacques, When the Saints, Mary Had a Little Lamb, Scarborough Fair), and **call and response** ear training (listen, play it back, then see the answer). Open strings show as hollow dots by the nut.
  - **Noodling**: the app plays a backing (a progression, the blues, or a drone) and the fretboard shows the notes that fit, with the chord's own notes in orange and the key note ringed. Start with three or four notes, then the pentatonic; **question and answer**; **rhythm ideas**; and **Save as a new song** for a tune you want to keep.
- **Progress**: a timer on each exercise; today's practice and your streak (days in a row) at the top; **✓ That was clean** logs a clean round and goes 5 bpm faster next time. Kept in **practice.json** in your songs folder.
- **My routine**: a 10-minute daily routine and a 5-minute "before playing" one, ready made. Each exercise runs for its minutes and moves on by itself (Next ▶ to skip). Edit them, or make your own.
- The help (? How this works) has a section for each kind of exercise.

## v4.11.0

### Tidier tabs and clearer names
- The song's tabs are **Song · Info · Notes** (Details is now Info). A song always opens on the **Song** tab; the "show notes when opening" setting is gone.
- **Info and This song are now separate jobs:**
  - **Info** is what the song *is*: who it's by, where it's from, tags, difficulty, and its original key, time and tempo.
  - **This song** is how *you* play it: the key you play in and saved keys, capo, instrument, tempo, time and strum.
  - Capo and instrument are only on This song now. Tempo and time are on both, because they're one setting.
- **This song is one row high** like the other tabs:
  - Save key, Remove version and Make this the song's key are in a small **Keys ▾** menu beside the key.
  - The Details button is gone (Info is beside the song).
  - "More for this song…" moved to the Settings tab as **This song's settings…**.
- **Export** has one main button, **Export now**, which makes the files listed beside it ("Makes: web page + PDF"). **Choose…** changes that list (PDF, web page, lyrics, ChordPro…), and the choice is remembered for Export now.
- **Write**:
  - **Convert chord lines** is now **Chords into words**, with a tooltip explaining it (for songs copied from websites with the chords on their own line).
  - **Guess the key** is now **Suggest key**. The key list says "Auto: from the chords"; Info's button is "Suggest key…".

## v4.10.0

### Play in the editor, closer to karaoke
- **Play** (in the editor) shows a band above the preview while it plays:
  - the chord now, big;
  - the strum strip, with the strokes lit as they're played (the count-in first);
  - the shapes: the chord now, and the next two different chords.
  
  Stop hides the band.
- The line being sung **fills in as it goes**, letter by letter, in the preview (using the same timing as karaoke), as well as being highlighted.
- The Play tab buttons are now **Play** (here, beside the editor: for checking a song while you write it) and **Play along** (the full-screen karaoke view, for playing along).

## v4.9.0

### Karaoke: chord shapes
- A column on the right of the karaoke view shows the chord diagrams: **now** (big), **next** and **then**. "Next" and "then" are the next two *different* chords, so a chord repeated over several bars doesn't fill the list. Before playing, the first chord is shown.
- Tab and N.C. bars are named rather than drawn. Left-handed diagrams follow the setting.
- **Shapes** in the karaoke bar hides or shows the column (remembered).
- The karaoke bar is a little more compact and wraps rather than running off a narrow window.

## v4.8.1

### Finger exercises: clearer picture
- **The next note is blue** (dashed), so it stands apart from the red note to play now. A key under the fretboard explains the colours: red = play now, blue = next, faint red = finger still down, arrow = the string to pluck.
- **A drawn fretting hand** above the neck, with knuckles numbered 1–4. The finger in use reaches down to its string, fingers still down stay down, and the others hover. The hand slides when the position moves up the neck.
- **The plucking hand**: an arrow on the right points at the string to pluck ("pluck G"), and moves string to string. The line under the picture says it too: "Index finger (1) · G string · fret 1 · pluck the G string".
- **? How this works** (and "How does this work?" under the picture): a pop-up explaining the picture, the colours, both hands, the tab, how to practise and the sound options, with short sections for the other trainers. It opens by itself the first time you open the finger exercises.

## v4.8.0

### Practice → Finger exercises (the spider walk)
- A fourth Practice mode for the fretting hand: one finger per fret, string by string. It's also called the spider crawl, finger walking, the chromatic walk, the 1-2-3-4 exercise or the moonwalker.
  - **1-2-3-4**: the basic walk.
  - **1-3-2-4**: finger independence.
  - **1-4-2-3**: coordination.
  - **4-3-2-1**: the reverse walk.
  - **Warm-up**: all four, one after another.
- Options: up the strings and back down (fingers reversed on the way back); start fret (1–5); move up a fret each time round (then back down the neck); one or two notes a beat; times round, or keep going.
- **Animated fretboard**: a box shows where the hand sits, with the fingers numbered 1–4 over their frets. It slides when the position moves up the neck.
  - The current note pulses, with its finger number; the next note is a dashed circle.
  - Fingers still down from earlier notes on the string show faintly.
  - The string flashes when its note sounds.
- Under the fretboard: "Index finger (1) · G string · fret 1", and the round's tab with the current note lit.
- **Show me**: one slow round (70 bpm at most) with the notes, to watch and hear first.
- **Sound**:
  - Hear it, then you: the first round with the notes, the next with just the click, and so on.
  - Notes on.
  - Click only: you play the notes.
  - No sound: just watch.
- Tips for each pattern (hand position, keeping fingers down, the thumb).

## v4.7.0

### Practice
A **Practice** window, opened from the library or **Play → Practice…**. It works without a song open. Three trainers share one set of controls and one display.

- **Controls**: tempo (−/+ or type it; changes carry on from the current bar), volume, number of bars (or Keep going), metronome click, count-in, Start/Stop (Space), Esc to close.
- **Display**: the chord to play now, big, with its diagram; the next chord; the strum's strokes lit one by one with the count (1 & 2 &…); beat dots; where you are ("Bar 3 of 8").
- **Strum**: any strum from the library, or type your own, over easy chords (C Am F G by default; type others, or pick a set such as G C D or A D E7).
- **12-bar blues**: in C, G, A, D, F or E; 7th chords or plain; quick change (IV in bar 2); turnaround (V in bar 12). The 12 bars show as a grid that lights as you go.
  - **Shuffle**: on beats 2 and 4, one more finger goes down two frets above the chord's 5th, so the 5th becomes a 6th (C7 0001 → 2001). The second diagram shows the shape, with a note saying which string and fret; playback plays it.
- **Chord change**: the chord you're learning and the one you come from (with suggestions such as "from C"), changing every bar or every 2 beats. Tips say which finger can stay down, which strings ring open, and when there's a barre. Your changes are counted.

## v4.6.0

### Chords shorter than a bar, and pauses
- **`[Em:2]`**: Em for 2 beats, shown **Em:2**. Any number of beats works (`[C:1]`, `[C:3]`, `[C:6]`).
- **A plain chord after a short one fills the rest of the bar**: `[Em:2]gone for[Am]ever` is Em then Am, 2 beats each.
- **Every chord starts the strum pattern afresh**, so a 2-beat chord plays the first half of the pattern. With Island (`D-DU-UDU`) that's **D-DU**, starting with a down-strum on the change. This also applies to two chords sharing a bar in a bar line.
- **`[N.C.]`** (or `[NC]`): no chord. The strings are stopped and nothing plays for a bar; `[N.C.:2]` is 2 beats, `[N.C. x2]` two bars. It's left out of chord diagrams, key guessing and key changes.
- Bar lines take beats and N.C. too: `| C:3 G | N.C. |`.
- Karaoke and the strum strip follow short chords and pauses. Playback and karaoke now share one bar plan (`songSlots`), so they always agree.
- The How to write guide has new sections: Chords shorter than a bar, and Pauses: no chord.

## v4.5.0

### Writing shorthand
- **`[C x3]`**: C for three bars, shown **C×3**. The same as `[C][][]`.
- **Lines of bars**: `| C | F | % | G7 C |` for intros, solos and instrumentals.
  - One chord a bar; two (or more) chords in a bar share it; `%` repeats the bar before.
  - A label can go first: `[[Intro]] | C | G |`.
  - Drawn as evenly spaced bars, played bar by bar, and lit bar by bar in karaoke.
- **`(x2)`** at the end of a line plays it twice, shown **×2**. Karaoke shows the line again.
- Key changes (the view and Make this the song's key) move all of these. The editor colours them.

### Strums
- **Named strums**: `{A: D-DU-UDU}` sets a strum and names it; `{A}` uses it again later.
  - The first one gets its full strum box, named; later ones a small tag with the arrows.
  - With two or more named strums, a key to them is printed at the top of the sheet.
  - A name used before it's defined, or never defined, is a warning.
- **Bars that take turns**: `{D-DU-UDU | D-DUDU}` plays the first pattern, then the second, and so on. The box shows both, "bar 1" and "bar 2".
- **`{stop}`**: the next chord is one strum, left to ring; then the strum carries on. On a line of its own it's a STOP box; in the words before a chord, the chord is shown "C stop".
- Chucks (`X`) now vary a little in level, pitch and timing, so a run of them doesn't sound mechanical.

### Layouts
- **View → Layout** (and Settings → How the chord sheet looks) has two more:
  - **Chords in the words**: I **[C]**come from Alabama. The most compact, good on a phone.
  - **Chords only**: each line's chords without the words, for whoever is accompanying.
- They work in the preview, PDFs, web pages and songbooks.

### How to write
- **Write → How to write** (or F1) opens a guide to everything you can type, with examples. The same guide is `WRITING.md` in the app folder.

## v4.4.0

### Tabs: View and Export
- Tabs are now **File · Write · This song · View · Export · Play · Settings**.
- **File** keeps the song-file jobs: Close, Save, Save as new, **Rename…**, Import text file, Paste from website, Add to setlist.
- **View** (new) holds the common look settings:
  - chord diagrams: at the top, where first used, or none;
  - left-handed;
  - text size (A− / A+ / Usual);
  - strum pattern style;
  - layout.
  A change goes to the song's own setting if it has one, otherwise to every song.
- **Export** (new) makes the usual files in one click: **PDF**, **Web page**, **Lyrics PDF**, **ChordPro**, or **Choose…** for several at once.
  - Its options sit beside the buttons: Print style (Standard / Stage), Page size, and Every saved key.
  - **Exports folder** is here too.

### Keys
- **Make this the song's key…** (This song → Key): rewrites the chords (and tab) in the song itself into the key you're looking at.
  - Saved versions move so they still sound the same.
  - The old key becomes a saved version.
  - It asks first, and notes the change in the song's history.
- The Key list names the keys: "Original (in C)", "In F · C to F (+5)".
- **Library:** each saved key has its own row under the song, e.g. **"Rainbow (in F)"**; click it to open the song in that key. The song row says "Also in F, G".
- **Setlists** can hold a song in any of its keys, or in two keys (e.g. for two singers).
  - The Add songs list offers each key.
  - File → Add to setlist adds the key on screen.
  - The songbook prints each in its chosen key.
  - Setlist files mark the key as `Rainbow | +5`.
  - A song without a key in the setlist is printed in its original key.

### Rename
- **File → Rename…** renames the song's folder and song file, updates every setlist, and notes "Renamed from …" in the history. Exports already made keep their old names.

### Artist in listings
- The library has an **Artist** column (with the year), sortable.
- Setlists show the artist beside each song, and so do the Add songs list, the Open… list and songbook contents.

## v4.3.0

### Song details: fields, not notes
- A **Details** tab beside Song and Notes holds the song's facts as proper fields, kept in song.ini:
  - **About the song**: Artist, Year, Written by, Album, Source (website, book, teacher…), Tags, Difficulty (beginner / intermediate / advanced).
  - **Music**: Key (with **Guess the key…**), Capo, Tempo, Time, Instrument: the same settings as the This song tab.
- **This song → Details** opens it.
- New songs' notes no longer start with empty "Key: / Capo: / Source:" lines; the notes are for notes (and the history).
- The **library** shows "Artist, year" under the title and a difficulty chip. **Find** searches every field (title, artist, year, written by, album, source, tags, difficulty, key, instrument).
- **Exports and songbooks** show "Artist, year" under the title.
- **ChordPro**: `{artist}`, `{year}`, `{composer}`/`{lyricist}` (→ Written by) and `{album}` are read on import and written on export.
- **Starter songs** now come with artist, year and tags. Starters added by 4.0 get them filled in once.

## v4.2.0

### Strum info boxes
Strumming carries a ukulele song (it makes up for the small range of notes and gives the rhythm its bounce), so a `{strum pattern}` now gets an info box on the sheet instead of a small grey line:
- **The time signature**, large, on the left (with the tempo in the song's first box).
- **The pattern's name** when it's one from the strum library ("Island (calypso)", "Waltz").
- **Arrows, the letters and the count** (1 & 2 & … or 1 e & a), lined up so you can see where each stroke falls. Accented strokes (`>`) are bold and underlined; rests are faint dots; chucks are ✕.

**Style sets** (Settings → All songs → Look, or per song):
- **Info box: bold**: a black "comic caption" box (the default);
- **Info box: light**: a thin rounded box;
- **One line**: time, arrows, letters and name on one line (good for long songs on paper);
- **Plain**: the pattern as typed, as before (letters, or arrows).

More styles can be added in one place (`src/strum-box.js`).

**Readable and printable:**
- Every size follows the sheet's own font, and no text in a box is smaller than about 0.9 of it (12px at least), so the Stage print style makes the boxes bigger too.
- Nothing relies on colour: accents are underlined, and a change of time is written ("new time") and hatched, so black-and-white printing works.

### Time changes within a song
- Write the time in a pattern: `{3/4 D-DUDU}`. From there on the song is in 3/4 (playback, karaoke and the boxes) until another pattern changes it, e.g. `{4/4 D-DU-UDU}`. Without a time, the song's own time applies, as before.
- The strum library's **Add to song** writes the time for you when the strum is in a different time from the song.
- ChordPro keeps it: `{comment: Strum 3/4 D-DUDU}` reads back in.

### Strum library
- Each card shows the pattern in the chosen box style, so you see it as it'll look on the sheet.

### Tests
- 238 unit tests (new: strum boxes, counts, names, time changes in playback and karaoke); end-to-end checks for the styles and time changes.

## v4.1.0

### Low-G ukulele
- New instrument **Ukulele (low G)** (This song → Instrument, or Settings for new songs): concert or tenor ukulele with the G string an octave lower.
- Same chord shapes, diagrams and tab as a high-G ukulele, so exports keep the `_uke` name. Playback and tab use the low G.
- Tab written for a high-G ukulele keeps its fingering when you switch: it's played on the low G.

### Setlists and songbooks
- The library has a **Setlists** tab. A setlist is the songs for a gig, a jam or a club night, in order.
  - **New setlist**, then click its name to rename it.
  - **+ Add** songs from the list on the right (find them by title, artist or tag); ↑ ↓ to reorder, ✕ to take one out, **Open** to open it.
  - **Songbook PDF…**: one PDF with a contents page (with clickable links), then every song, each on a new page, numbered. Each song is in its own key, capo, instrument and chord shapes. Standard or Stage print style, A4 or Letter.
- **File → Add to setlist…** ticks the current song into setlists, or starts a new one.
- Setlists are plain text files in the songs folder's `Setlists` folder (one title per line), and the PDFs go next to them.

### Practice: loop a section, slower
- On the **Play** tab:
  - **Loop the section I'm in**: plays only the `[[Verse]]`, `[[Chorus]]`… the cursor is in, over and over until Stop.
  - **Practice speed**: 50%–100% without changing the song's tempo.
  - **Speed up each time round**: 5% faster each loop, up to full speed.
- Works in karaoke too: the karaoke view shows just that section.

### Choose chord shapes
- **Click any chord diagram** in the preview (or Write → **Chord shapes…**) to pick another fingering. The picker shows the standard shape and the other correct shapes, easiest first, as diagrams; clicking one plays it so you can hear it.
- Or **type your own** (e.g. `2003`, `x32010`). It's checked against the chord: you get a warning if a note doesn't belong, but you can still use it.
- Chosen shapes are kept with the song and used for the diagrams, exports, songbooks and playback. Your own shapes are marked with a coloured box in the preview.
- They apply to the chords as shown, so a version in another key can have its own.
- **ChordPro**: `{define}` lines are read on import and written on export.

### Library: artist and tags
- Settings → This song → About this song: **Artist** and **Tags** (e.g. *folk, singalong*). ChordPro imports fill in the artist.
- The library shows the artist under the title and the tags as chips. Click a tag to show all songs with it.
- **Find** searches title, artist, tags, key and instrument.
- Click a column heading to sort (again to reverse): song, key, instrument, tags, last changed.
- Exports show the artist under the title.

### Fixes
- Tab playback: strings a tab note doesn't use could produce broken audio. They're now skipped, so tab plays cleanly with every sound.

### Tests
- 231 unit tests (new: low G, chord shapes, setlists, section playback, artist/tags); new end-to-end phase `v41`.

## v4.0.0

A new layout, made for someone opening ukemusic for the first time.

### Library first
- ukemusic now opens on **Your songs**: every song in your songs folder with its key, instrument and when it last changed, and a Find box.
- Four big buttons: **New song**, **Paste a song from a website**, **Import a file**, **Open songs folder**.
- Click a song to open it. **File → Close** (or Ctrl+W) comes back here, as does File menu → Your Songs (Ctrl+L); **Back to song** or Esc returns to the song you were on.
- Prefer the old way? Settings → All songs → Songs folder → *When ukemusic starts* → *Go straight back to the last song*.

### Starter songs
- Three old songs, long out of copyright, are added to the songs folder once:
  - **Oh! Susanna** (Stephen Foster, 1848): 4/4, island strum.
  - **Amazing Grace** (John Newton, 1779): a 3/4 waltz.
  - **Clementine** (1884): 3/4, starting with the tune as tab.
- Their notes explain how they're written. Delete their folders whenever you like; they won't come back.
- A **new song** now starts from a short example you can type over, instead of an empty verse.

### Tabs of tools, like Office
- The two crowded toolbars are replaced by an **app bar** and four **tabs**:
  - Top bar: just the song's title, Saved / Unsaved, and the chord playing. Every button is on a tab.
  - **File**: Close (back to the library), Save (the only Save button; Ctrl+S still works), Save as new, Import text file, Paste from website, Export…, Exports folder. New and Open are on the library.
  - **Write**: Insert tab, Strums…, Guess the key, Convert chord lines, Undo, Redo, Stylesheet.
  - **This song**: Key (with versions), Capo and Suggest…, Instrument, Tempo, Time, **Strum** (new: this song's own default strum) and *More for this song…*.
  - **Play**: Play, Stop, Karaoke (the only place for Play and Stop, besides F5 / Shift+F5); **Tempo** with − / + (5 bpm steps) and **Tap tempo** (new: tap along to set it); Sound, Count in, Follow the words, Start at the cursor.
- **Change the tempo while playing** (Play tab, or − / + in the karaoke bar): playback carries on from the current line at the new speed, with no count-in. The tempo is saved with the song.
- **Settings** tab with one Settings button.
- Colours: the tab strip is **blue**; the tops of the song and preview panes are **dark green**.
- A **hint line** under the tabs says what the button under the mouse does.
- The tab you were on is remembered.

### The two sides match
- The preview **follows the editor** as you scroll: the line at the top of the song is at the top of the preview.
- The line the cursor is on is **lit up in the preview**.
- **Click a line in the preview** to put the cursor on it in the song.

### Real ukulele sound
- New playback sound **Real ukulele**: recordings of a real tenor ukulele (FreePats "Ukulele", public domain / CC0) instead of the sound the app makes itself. One recording every two semitones from C4 to C6; notes in between are played slightly faster or slower, and the recorded muted strum is used for chucks (X).
- It's now the default ukulele sound. Choose it, or go back to Plucked string or Hollow body, on the Play tab (Sound) or in Settings → All songs → Playback and karaoke. Guitar keeps its Steel / Nylon sounds.
- Baritone songs use it too, pitched down from the nearest recordings.
- The recordings are 2.4 MB, in `src/sounds/ukulele`.

### Karaoke
- **Instrumental lines** (chords with no words, such as `[[Instrumental]]: [G] [C] [D]`) now read along the line after the label, at the size of the words, each chord with its own progress line, instead of chords floating over an empty line.
- **`[]` shows as a bar line `|`**, as on the chord sheet. Words after a `[]` light up during that extra bar.

### Smaller things
- The status bar shows the key, instrument, tempo, time and capo.
- File menu: *Your Songs (Library)* (Ctrl+L) and *Close Song* (Ctrl+W). "Toggle Settings Panel" is now just *Settings*.
- New look: a calmer teal accent and icons on every button.

### Tests
- 217 unit tests (new: starter songs, the song list's key and instrument).
- New end-to-end phase for the library, starters, ribbon, hint line, tap tempo, song strum and matched panes. All earlier end-to-end checks pass on the new layout.

## v3.2.0

### Strum library: country, rock, blues and funk
- Five new patterns:
  - **Rock push (3-3-2)**
  - **Country boom-chick** (bass-strum on guitar)
  - **Country train beat**
  - **Slow blues (12/8 feel)**
  - **Funk sixteenths**
  That's 18 strums in all.
- Every strum has a **style**:
  - Everyday
  - Rock
  - Country
  - Blues / jazz
  - Reggae / ska
  - Funk
  - Waltz
  - Folk
  - March / polka
- Style buttons in the library narrow the list. The everyday ukulele strums still come first, and the defaults (Simple, Island) are unchanged.

### Tests
- 209 unit tests; end-to-end checks for the style filter and the new strums.

## v3.1.0

### Guess the key
- New **Song** menu → **Guess the Key…** (Ctrl+K). A pop-up names the song's most likely key and says how sure it is (very likely / fairly likely / a guess). It explains why:
  - which chords belong to the key, and which come from outside it;
  - whether the song starts and ends on the home chord;
  - that the relative major or minor uses the same chords.
  It also lists other possible keys, and shows the key you're viewing (after a key change) and the key of the shapes you play with a capo.
- **Use as the song's key** saves the guess as the song's key (used to spell chords correctly in other keys).
- How it works: `rankKeys` in `src/keys.js` scores all 12 keys:
  - +2 for each chord that belongs to the key (V7 included), +0.5 for the right root with an unusual chord type, −1 for a chord from outside;
  - extra weight for the first chord and more for the last chord being the home chord;
  - major or minor decided by the chord the song comes home to.
  `keyConfidence` judges certainty from the lead over the next key and how many chords fit. `detectKey` (used for "Auto" in Settings) now uses the same ranking, with the same results as before.

### Song menu
- The new Song menu also has **Suggest a Capo…**, **Strum Library…** and **Insert Tab Block**.

### Tests
- 208 unit tests. End-to-end: new key phase (pop-up opened from the real menu command); 194 checks in all.

## v3.0.0

ukemusic is still a ukulele app first, but the same songs now work for the **baritone ukulele** and the **guitar**. Full description: **INSTRUMENTS.md**.

### Instruments
- One song file for every instrument. The song's **Instrument** (toolbar; Ukulele / Baritone uke / Guitar, in that order) decides the chord diagrams, how tab is shown, the playback sound, and the code in export names.
- New `src/instruments.js`: one profile per instrument (tuning, strings, tab names, chord library, file code). Every place that assumed a ukulele now asks the profile.
- **Guitar chord library**: 466 chords from chords-db, checked note by note like the ukulele ones, with the root in the bass preferred. Muted strings show as X. The ukulele libraries are unchanged.
- **6-string diagrams**: same width as ukulele diagrams; muted strings and barres drawn.

### File names
- Export names now end with the instrument's code: `Song_uke.pdf`, `Song (+5)_bar.html`, `Song (capo 3)_gtr.pdf`. The old style (`Song (baritone, +2).html`) is gone. Lyrics exports have no code (they're the same on every instrument).

### Capo
- **Capo** on the toolbar (none to 7), saved with the song. Chords and diagrams show the **shapes to play**; playback raises them so the song still sounds in its key. Exports say "Capo 3" under the title and include it in the name; ChordPro exports carry `{capo}`.
- **Suggest…** rates every capo position for the song's chords on your instrument and offers the three easiest, plus no capo, with the shapes for each.

### Tab across instruments
- Guitar, baritone and ukulele tab are all recognised (from the string names). Tab written for another instrument is **converted** when shown or played, keeping every note's pitch: each note goes on the string with the lowest fret, and notes out of range move by an octave (reported). Guitar tab is no longer just a warning.
- Insert tab gives the song's instrument's strings (6 lines for guitar).
- Paste chord sheet says which instrument pasted tab is for, and that it's shown converted.

### Left-handed
- Settings → Instrument and chord diagrams → **Left-handed** mirrors every chord diagram (screen, exports, PDFs).

### Sounds
- **Guitar sound**: Steel strings or Nylon strings. Playback sounds are now one table of settings (`SOUNDS` in `playback-audio.js`).

### Strum library
- **Strums…** (toolbar): 13 patterns, ukulele first, each with how it's played and what it's good for, for 4/4, 3/4, 6/8 and 2/4. **Hear** a strum on the song's instrument and tempo, **add it** to the song, or **make it the default** for songs with no pattern. New `src/strums.js`.
- The defaults are unchanged: Simple (first-beat emphasis) and Island. Every library strum is also offered in Settings → Playback.

### Fixes
- The chord library loader cut every shape to 4 strings.

### Tests
- 204 unit tests (new: `capo`, `strums`; guitar library, 6-string and left-handed diagrams, tab conversion, capo playback). End-to-end: new instruments phase; 183 checks in all.

## v2.18.0

### Karaoke: tab notes light up as they're played
- In the karaoke view, each note in a tab block lights up as it's picked, and notes already played turn blue. The strip at the top names the note (e.g. C5), or several notes if they're played together.
- Timing matches playback exactly: both use the same bar count and note times from `src/tab.js`.

### Documentation
- New **TABLATURE.md**: how tab works, covering writing, Insert tab and overtype, pasting from websites, the checks, display, key changes, playback and karaoke timing, the internal model and where it's used in the code, and current limits. Linked from the README.

### Tests
- 186 unit tests. End-to-end: tab notes light in order and the strip names them; 157 checks in all.

## v2.17.0

### Tablature
Tab stays as readable text in the song (```tab blocks). The app now also reads it into a model of strings, frets and pitches, and uses that to check, display, transpose and play it. New `src/tab.js`.

- **Paste from a website:** Paste chord sheet now recognises tab lines (`E|--0--3--|`) and wraps them in a ```tab block, tidied:
  - string names in capitals;
  - all four strings, with the ones left out added as empty lines;
  - every line the same length, with its closing bar line.
  Chord names written just above the tab stay with it; symbol keys ("h = hammer on…") are removed. The report says what was done, and warns about guitar tab (6 strings). "Tuning: GCEA" is no longer mistaken for chords.
- **Checks:** a warning if string lines are different lengths, a string name isn't a ukulele string, there are too many strings, or there are symbols the app doesn't know. Tab that only writes out the strings it uses is fine. Baritone tab (E B G D) is recognised from its string names.
- **Display:** fret numbers bold in the chord colour, string names lighter; in Stage style all black. Long tab is split at bar lines to fit the page in PDFs.
- **Key changes and versions:** tab moves with the key. Each note keeps its string where it can; otherwise it moves to the string that plays the same note lowest; if no string can, it moves an octave (reported). Applies to the preview, exports, PDFs, Markdown and ChordPro.
- **Insert tab** (toolbar): adds an empty tab block for your instrument's strings below the cursor.
- **Overtype in tab blocks:** typing a fret number writes over the dash under the cursor instead of pushing the line along, and Backspace puts a dash back.
- **Playback and karaoke:** tab notes are picked in turn and take as many whole bars as they need. Tab has no rhythm, so timing comes from the spacing: the usual gap counts as half a beat, wider gaps longer. Karaoke shows the tab as written, with its progress line.

### Tests
- 185 unit tests (new `test/tab.test.js`). End-to-end: new tab phase; 155 checks in all.

## v2.16.0

### Settings: full window, easier to follow
- Settings now fill the window. The **This song / All songs** tabs and Close stay at the top however far you scroll; a list of sections on the left jumps to each one (and shows where you are); **↑ Top** appears once you scroll down; **Esc** closes.
- Reorganised by what each setting affects: Songs folder · Instrument and chord diagrams · How the chord sheet looks · Fonts, colours and printing · Playback and karaoke · App appearance.
- Plain-English labels and options instead of internal names (e.g. "All together at the top of the song" instead of `song_start`), and a one-line explanation under the settings that need one.
- New: **Standard print colours** — words and chords colour pickers, and an **All black** button for black-and-white printers (no stylesheet editing needed).
- Removed four settings that did nothing: strum-pattern placement, align strum to chords, diagrams per row, default export format.

### Karaoke: strum strip
- The top bar is bigger and shows a **strum strip** for the whole song: the chord being played (large) and that bar's strokes (↓ ↑ ✕, · for a rest) with beat numbers (1 & 2 & …), the one being played lit. Accented strokes are bolder. During the count-in it shows 1 2 3 4. No extra sound — you hear the strum.

### Notes are never lost on closing
- Notes save themselves a moment after you stop typing. If you closed the app (or opened another song from the keyboard) within that moment, the last few words could be lost. Closing and switching songs now save pending notes first. Unsaved song text still asks Save / Discard / Cancel as before; Discard never throws away notes.

### Tests
- 164 unit tests. End-to-end: strum strip, settings layout/navigation/All black, notes saved on close; 143 checks in all.

## v2.15.0

### Karaoke view
- New **🎤 Karaoke** button next to Play. It plays the song with the words filling the window: several lines at once, so you can see what came before and what's next; the current line is lit and kept about a third of the way down.
- Chords sit above the words they go with. A line under each chord's words lengthens as that chord's bar plays; finished words turn blue.
- Timing is approximate by design: each chord lasts one bar (plus one for each []), and its bar is shared out over its words by length. Words before a line's first chord carry on from the chord already playing.
- Headings show as small labels and inline labels (`[[Intro:]] …`) in bold. The count-in shows as 1 2 3 4.
- A− / A+ change the text size (remembered). Space plays/stops, Esc closes. Uses the current key, tempo, sound and strum settings.
- New `src/karaoke.js` (pure, unit tested).

### ChordPro import: tempo is noted, not applied
- A `{tempo}` in a ChordPro file is now written into the song's notes ("Tempo: 136") and no longer sets the song's tempo. You set the tempo yourself with the toolbar. Key and time are still applied.

### Tests
- 163 unit tests (new `test/karaoke.test.js`). End-to-end: new karaoke phase; 131 checks in all.

## v2.14.0

### Strum when the song has none
- New setting, Settings → All songs → Playback: **Strum when the song has no {pattern}**:
  - **Simple** (the new default): one heavy down-strum, then lighter down-strums on the other beats.
  - **Island strum**: D-DU-UDU (the previous fixed default).
  - **Custom**: a pattern you type.
- It can also be set for one song on the This song tab. A `{pattern}` in the song always wins.
- **Accents**: put `>` after a stroke to play it harder; the other strokes are then played clearly lighter, e.g. `{D>-DU-UDU}`. Without any `>`, the first strum of each bar leads a little, as before. `>` doesn't count as a step, so the "doesn't fit the bar" check is unaffected.

### Hollow-body sound
- Settings → Playback → **Sound**: **Standard** (as before) or **Hollow body**. Hollow body is warmer and closer to a ukulele: the strings go through a small wooden body (resonances at about 220 Hz, 480 Hz and 1.1 kHz, plus a very short body echo), the pluck is softer and loses its brightness sooner, like nylon, and strums are spread slightly more.

### Fixes
- The splitter between the song text and the preview could only be dragged one way: once the mouse went over the preview, the drag was lost. It now drags both ways and keeps its proportions when the window is resized. Double-click it to go back to half and half.
- Long lines in the song text now wrap to the width of the pane instead of running off the edge out of sight.

### Tests
- 157 unit tests (new: simple/island/custom default strum, accents). End-to-end: hollow-body render, default strum saved and offered per song.

## v2.13.0

### Labels at the start of a line
- `[[Label]]` followed by anything on the same line prints the label **in bold** at the start of that line, e.g. `[[Intro:]] [Am] [F] [D]` or `[[Chorus]] [C]Lost and gone…`. Nothing is moved or guessed: a `[[Label]]` on a line of its own is still a section heading, and you make the line breaks yourself.
- Works in the preview, HTML, PDF, Markdown, lyrics export (label kept, chords-only lines dropped) and ChordPro (as `[*Label]`, read back the same way).
- A colon (or `.` `;` `,` `-`) written straight after the brackets is part of the label, so `[[Intro]]: [Am] [F] [D]` works the same as `[[Intro:]] [Am] [F] [D]`. Previously the colon counted as a lyric, which pushed the label down onto a line of its own beneath the chords.
- The chord-sheet converter turns lines like `Intro: Am F D` into `[[Intro:]] [Am] [F] [D]`.

### Settings: defaults for all songs, custom for one song
- Settings now has two tabs. **All songs** holds the defaults (stored in config.ini). **This song** shows each setting a song can change, with a **Use default (…)** tick box showing the current default. Untick it to set a custom value for this song only.
- song.ini now stores the song's own facts (key, tempo, time, versions, transpose) plus only the settings you have made custom. Change a default and every song still using it follows.
- **Fonts per song**: font, size and bold. The default shown is the stylesheet font for Standard and the stage font for Stage. A custom song font is used in both print styles (Stage still prints in black).
- Existing songs are upgraded the first time they are opened: values equal to the defaults are removed, anything different stays as custom for that song, and the song's history notes which.
- New songs no longer copy every setting at creation; they start on the defaults.

### Changes
- ChordPro import still numbers unlabelled verses (Verse 1, Verse 2…). Nothing else is numbered automatically.

### Fixes
- Table layout dropped strum-pattern lines that stood on their own (since v2.6).
- Settings showed both panes at once on some systems.

### Tests
- 154 unit tests. End-to-end: new settings phase (24 checks); 125 checks in all.

## v2.12.0

### Print styles
- **Print style** in the Export dialog: **Standard** (your stylesheet) or **Stage** — for reading off a music stand at a gig, printed on a black-and-white printer. The choice is remembered as the default.
- Stage: everything black (lyrics, chords, strum patterns, headings, diagram lines, page header/footer), bold, in a sturdy monospace font — Consolas by default, 18px. Font and size are in Settings → Export. Applies to chord-sheet and lyrics PDFs and HTML.

### Long lines are split for printing
- New `src/line-wrap.js`. Lines too wide for the page (measured in the font actually used) are split at a space — preferably after a comma — nearest the middle, so the halves are balanced. Chords travel with their words; the continuation is indented slightly; chords-only lines are split into chunks.
- Applies to every PDF (both styles) and to stage-style HTML. Previously a long line made the PDF shrink the whole page to fit, so a bigger font made little difference.

### Export complete message
- A message pops up when an export finishes ("Export complete — 3 files saved") with an **Open folder** button; it disappears after a few seconds. Failures show in red with the reason.

### Tests
- New `test/line-wrap.test.js` (8). 139 unit tests; end-to-end 96 checks.

## v2.11.1

### Fixes
- Chords separated by single spaces ran together: `[C] [F] [C]` printed as `CFC` (in the preview, HTML, PDF and Markdown). The minimum gap between chords was only applied when a chord had been pushed right by a longer name; it now always applies. Present since v2.6; it affected every chords-only/instrumental line, including those made by the chord-sheet converter.
- PDFs no longer leave pages half empty: only short sections (up to 60% of a page) are kept on one page; longer sections can break between lines (a chord line always stays with its lyric line, and a heading stays with what follows). Baby Love: 3 pages → 2.

## v2.11.0

### ChordPro import and export
- **Import**: Paste chord sheet… and Import Text File recognise ChordPro automatically (and `.cho .chordpro .chopro .crd .pro` files). `{title}` becomes the suggested song name; `{key}`, `{tempo}` and `{time}` become the song's settings; artist, capo etc. are added to the notes; verse/chorus/bridge sections become `[[headings]]` (unlabelled verses are numbered); `{chorus}` repeats, tabs, grids, `[|]` bar lines and `{comment: Strum …}` patterns are converted; `[*annotations]`, `[N.C.]` and `{define}` are dropped (and listed).
- **Export**: new "ChordPro (.cho)" option in the Export dialog, for the current key or every version. Writes title, key (spelled for that version), tempo and time; sections as `{start_of_verse}` / `{start_of_chorus}` / `{start_of_bridge}` or `{comment}`; strum patterns as `{comment: Strum D-DU-UDU}` (ChordPro has no strum directive — other apps show it as a note, ukemusic reads it back); bar markers as `[|]`.
- Round trip ukemusic → ChordPro → ukemusic keeps chords, lyrics, bars, strums and sections.

### Key-aware chord spelling
- Transposed chords are spelled for the new key: E major up 2 gives F# C# D#m (not Gb Db Ebm); C up 8 gives Ab Eb Fm Db; A minor up 4 gives C#m F#m G#7. Borrowed chords come out sensibly (G with Bb, up 2 → A with C). Awkward spellings (E#, Cb, double accidentals) fall back to the usual names.
- The key is guessed from the chords; Settings → Song key lets you set it (♪, saved in song.ini) — the Auto option shows the current guess.
- The version dialog says "The song looks like it's in E major, so this version is in F# major"; exported sheets show the key under the title.
- Built in-house rather than by adding the Tonal library: chord-name recognition was already covered in 2.10, and this avoids a new dependency (no `npm install` needed).

### Tests
- New `test/keys.test.js` (11) and `test/chordpro.test.js` (7). 128 unit tests. End-to-end: 96 checks across all features.

## v2.10.0

### Chord library: 28 → 540 chords per instrument
- Soprano/concert/tenor and baritone libraries now cover 12 roots × 45 chord types: 6ths, 7ths, maj7, m7, m7b5, dim7, aug, sus2/4, add9, 9ths, 11ths, 13ths and altered chords (7b9, 7#9, alt…).
- Built by `tools/build-chord-library.js` (`npm run build:chords`) from chords-db (MIT; see THIRD_PARTY_NOTICES.md). The 28 hand-checked shapes stay as the main fingering for those chords.
- Baritone fingerings are ukulele shapes a 4th lower (the soprano C shape is the baritone G), so every baritone chord gets a proper 4-string fingering.
- Every fingering is checked note-by-note before it's used: only notes of the chord, and the notes that define it (root for simple chords, 3rd or sus note, 7th/6th, b5/#5/b9/#9/add9). Fingerings that fail are dropped rather than shown wrong.
- The easiest correct shape is chosen (closest to the nut, fewest fingers); the build also searches the first four frets itself and uses a much easier shape when the database's is awkward (e.g. Dsus2 2-2-0-0).

### Chord names
- New shared `src/chord-names.js`: one definition of a chord name for the song reader, editor highlighting and chord-sheet converter, plus the notes in each chord type.
- Recognised now: altered tones (Bm7b5, G7#9, C7b9b13), maj9/maj13, mmaj7, 6/9, alt, and the symbols ° ø + Δ.
- Other spellings find the same diagram: CM7/CΔ = Cmaj7, B° = Bdim, Bø = Bm7b5, C+ = Caug, Csus = Csus4, A#m7 = Bbm7.
- Playback voices any recognised chord type correctly even without a diagram.

### Tests
- Every fingering in both libraries (1,080) is verified in `test/chord-library.test.js`; new `test/chord-names.test.js`. 110 unit tests. End-to-end: a 21-chord song renders real diagrams for every chord on both instruments.

## v2.9.0

### Chord sheets (chords above the words)
- **Paste chord sheet…** (toolbar, Edit menu, Ctrl+Shift+V): paste a song laid out with chords on the line above the lyrics and see it converted to `[C]hord` format as you type. Insert at the cursor or replace the song (wrapped in START/END MUSIC).
- **Edit → Convert Chord Lines** converts chord lines already in the song. The status bar warns "Lines … look like chords above lyrics" and clicking the warning opens the converter.
- **Import Text File** offers the conversion when the file contains chord lines.
- Chords go in at their column when the spacing survived (websites). When it was lost (scans, some PDFs) they're spread from the first word to the last and the line is highlighted, and the status bar lists the lines to check.
- Copes with scan debris: lower-case chords ("c"), chords run together ("FC" → F C), stray punctuation in chord lines and at the start of lyric lines. Bar lines, repeat marks (x2) and N.C. are allowed in chord lines.
- Section labels ("Verse 1:", "[Chorus]", "CHORUS") become `[[Headings]]`; chord lines with no words under them become instrumental lines (`[G] [C] [G] [D]`).

### Warnings
- Lyrics exports leave out unconverted chord lines.
- Playback warns when a strum pattern doesn't divide evenly into the bar (e.g. `{D-DU-UD-U}` = 9 steps in 4/4).

### Fixes
- Importing a text file now records "Imported from <file>" in the song's notes (the line was never written in 2.8.0).
- Status messages after converting are no longer immediately replaced by "No parser warnings."

### Tests
- New `test/chord-sheet.test.js` (11), plus lyrics and playback additions: 100 unit tests. End-to-end: 71 checks.

## v2.8.0

### Transposed versions
- **Save key as version…**: pick any chord in the song and what it should become ("C becomes F"); the app works out the shift (+5) and shows every chord change before saving. No need to know the song's key.
- The key picker lists Original and saved versions; − / + try other keys ("Trying +2 (not saved)").
- Versions are rules in `song.ini` (`[versions] list = 5:C:F`), not copies — editing the song updates every version.
- Hints when choosing a key: harder chords (per instrument) are highlighted, and chords with no built-in diagram are marked.
- Chord names use the usual spelling whatever the direction: Bb not A#, C#m not Dbm, F# not Gb.
- Diagram lookup understands alternative names (A# = Bb) and uses the main shape for slash chords (Am/G → Am).
- Exports go into a subfolder per key: `exports/Original/`, `exports/C to F (+5)/`. Exporting a key that hasn't been saved saves it as a version first.

### Notes
- `notes.txt` in each song folder, shown in a **Notes** tab beside the song (and first when opening a song — can be turned off in Settings). Saved automatically.
- The app adds dated history lines: song created, versions created/removed, copied from, imported from.

### Lyrics-only export
- Section headings and lyric lines only — no chords, strums, tabs or diagrams. Text, HTML and PDF, in `exports/Lyrics/`.

### PDF export
- Chord sheets and lyrics as PDF, A4 (default) or US Letter, light theme, with the song title, key and instrument at the top, the title in the page header and "Page X of Y" in the footer. Sections are never split across pages.

### Export dialog
- One **Export…** button (Ctrl+E) with checkboxes for chord sheet (PDF, HTML, Markdown) and lyrics (PDF, text, HTML), the current key or the original plus every saved version, and paper size. Choices are remembered.

### Strum playback
- **▶ Play / ■ Stop** (F5 / Shift+F5) play a simple ukulele strum of the song in the current key, with the chord fingerings shown in the diagrams (soprano re-entrant GCEA or baritone DGBE).
- Plucked-string synthesis (Karplus–Strong, tuned to within 0.1 cent); follows the song's strum patterns (D, U, X chuck, - rest; arrows accepted).
- Timing: each chord is one bar; `[]` adds a bar; tempo (bpm) and 4/4 or 3/4 saved per song; optional count-in.
- The line being played is highlighted in the preview and scrolled into view; the current chord shows in the toolbar. Option to start from the cursor's line.

### Fixes
- Editor syntax highlighting crashed on lines with a chord before a `[]` bar marker (e.g. `[C]Lost and gone [] for[G]ever`) — present since v2.5. Highlights are now added in position order.

### Tests
- New: versions (12), lyrics renderer (3), playback schedule (10); song library +4; HTML renderer +1. 87 unit tests.
- End-to-end run of the real app (54 checks) covering versions, notes, all export formats incl. PDF page layout, and playback.

## v2.7.0

### Song Library

- **Songs folder**: chosen once (asked on first run; Settings → Songs folder → Change…). Stored in config.ini as `library.songs_folder`.
- **One folder per song**: `<Songs>/<Title>/<Title>-song.txt`, plus `song.ini` (song settings) and `exports/`. The song file is found by its `-song.txt` suffix, so renaming the folder in Explorer is safe.
- **Titles required**: New Song / Save ask for a title, checked live. "Untitled…", characters Windows can't use, reserved names and titles whose folder already exists (case-insensitive) are refused.
- **Per-song settings** (`song.ini`): instrument, transpose, layout, strum notation, Markdown rhythm style, diagrams on/off and placement. Marked ♪ in Settings. A new song starts from the general defaults; general settings stay in config.ini.
- **Open Song** dialog lists songs in the songs folder with a filter. **Import Text File…** turns any .txt into a new song on save. **Save as New Song** copies the song and its settings under a new title.
- **Exports** go straight into the song's `exports/` folder (no Save dialog), named `Title.html`, `Title (baritone).html`, `Title (+2).md`, `Title (baritone, -3).html`. **Exports** button / File → Open Exports Folder.
- The last song is reopened on startup.

### Baritone Ukulele

- Instrument selector in the toolbar: Soprano (GCEA — soprano, concert, tenor) or Baritone (DGBE). Saved per song.
- New built-in `src/chords-baritone.json` (28 chords). User overrides: `chords-baritone.json` in the config folder.

### Export Theme

- New `export.theme` setting, default **light** (best for printing). The editor/preview keep the app theme.
- HTML exports now include a `<title>`.

### Fixes

- Soprano **B7** fingering was wrong (2-3-2-3 played a C instead of B); now 2-3-2-2.
- Chord diagrams now grow to 4–5 frets when needed; previously dots above fret 3 (E, Em, B, Bm, Db, C#m, G#m) were drawn below the grid. Soprano Ab now shown from fret 3.
- Toolbar wraps instead of overflowing at the minimum window width.

### Tests

- New `test/song-library.test.js` (12) and `test/chord-library.test.js` (3, checks every fingering in both libraries plays the right notes). 57 tests total.


### Error Logging

- New `src/logger.js` writes errors to `logs/ukemusic.log` in the project folder when run with `npm start` (packaged builds use the platform log folder). Rolls over to `ukemusic.old.log` above 1 MB.
- Logs: main-process uncaught exceptions and promise rejections; failed IPC handlers (with stack traces); window/preview console errors and warnings; uncaught window errors and rejections (with stack traces); preload failures; window crashes, load failures and freezes; render and startup errors previously shown only in the status bar.
- Help → Open Log File menu item.

### Fixes

- Closing the window threw `TypeError: Object has been destroyed` (the `closed` handler read `webContents.id` after the window was destroyed). The id is now captured when the window is created.
- Markdown export ignored the transpose setting and the arrows strum notation; it now matches the HTML export.

## v2.6.0

### New Features

- **Transpose**: toolbar +/- buttons shift all chords up or down by semitones (range -11 to +11). Handles sharps, flats, slash chords, and complex suffixes. Transpose applies to preview and HTML export. Does not modify source text.
- **Strum notation conversion**: new `rhythm.notation` setting (`raw` or `arrows`). When set to `arrows`, the renderer converts D→↓, U→↑, X→✕ in rhythm patterns at render time. Dropdown added to Settings under Rhythm.
- **Table layout**: `export.layout` setting (`lines` or `table`). Table mode renders each chord+lyric pair in cells — no monospace alignment needed. Dropdown moved to General settings, labelled clearly as "Monospace" vs "Table".
- **Export Markdown button**: added to the toolbar alongside Export HTML.

### Font Architecture

- Split CSS into `--monospace-font` (chords, lyrics, tab, rhythm — alignment-critical) and `--font-family` (section headings, body text, table layout).
- Settings "Monospace font" input now writes to `--monospace-font`, affecting chords AND lyrics together.
- Font size slider updates both `--font-size` and `--chord-size` simultaneously.
- Table layout uses `--font-family` (proportional) since alignment is by cells, not character counting.

### Bug Fixes

- **Close error**: fixed crash when closing with unsaved changes. The Save/Discard/Cancel handler now wraps IPC in try/catch, uses `mainWindow.destroy()` for Discard, and adds safety checks to `saveWindowState`.
- **Splitter sticking**: fixed the draggable splitter getting stuck when dragging rightwards. Changed from `minmax()` to `1fr` for the right column. Added `preventDefault` on mousedown and `userSelect: none` during drag to prevent text selection interference.
- **Bar marker alignment**: bar markers (`[]`) now insert a matching space in the lyric line, keeping everything after a bar aligned in both HTML and Markdown output.
- **Chord/lyric font mismatch**: chords and lyrics now use the same `--monospace-font` and `--chord-size` matches `--font-size`. Previously `--chord-size` was 13px vs 14px, causing progressive drift.
- **Bar marker padding**: removed the `padding: 0 0.1em` on `.bar` elements that added sub-pixel misalignment.
- **Line height consistency**: added `line-height: var(--line-spacing)` to `.chords` and `.rhythm` (were missing it). Added `--verse-spacing` variable for blank line height.

### Dependency Updates

- Electron: ^35.1.5 → ^41.0.2 (v35 reached end-of-life; v41 is current stable)
- ini: ^5.0.0 → ^6.0.0

### Notes

- Markdown export is plain text — chords cannot carry colour. This is a format limitation, not a bug. Use HTML export for coloured chords.
- Delete your existing `style.css` from the config directory after upgrading so the app recreates it with the new CSS variables (`--monospace-font` etc.). Otherwise the old stylesheet will persist.

---

## v2.5.5

- Version bump, layout dropdown moved to General settings, font labels clarified.

## v2.5.0

- Initial release with parser, HTML/Markdown renderers, Electron UI, CodeMirror editor, live preview, fingering diagrams, tablature, INI config, editable stylesheet.
