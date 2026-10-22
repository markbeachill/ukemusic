# Instruments, capo and strums in ukemusic

ukemusic is a ukulele app first. From version 3.0 the same songs also work for the **baritone ukulele** and the **guitar**. This page explains how instruments work, the capo, left-handed diagrams, the playback sounds and the strum library, and how they're built. Tab has its own page: [TABLATURE.md](TABLATURE.md).

---

## 1. The idea: one song, any instrument

A song is **one file**, whatever you play it on. Chord names mean the same on every instrument (a G is a G on a ukulele and a guitar), so the words and chords are written once.

The song's **instrument** then decides everything that differs:

| | Ukulele | Ukulele (low G) | Baritone uke | Guitar |
|---|---|---|---|---|
| Tuning | G C E A (high G) | G C E A (low G) | D G B E | E A D G B E |
| Strings | 4 | 4 | 4 | 6 |
| Chord diagrams | ukulele shapes | the same ukulele shapes | baritone shapes | guitar shapes (muted strings shown as X) |
| Tab lines (top → bottom) | `A E C G` | `A E C G` | `E B G D` | `e B G D A E` |
| Playback sound | Real ukulele, Plucked string or Hollow body | the same, with the low G | the same | Steel or Nylon |
| Export name code | `_uke` | `_uke` (same shapes) | `_bar` | `_gtr` |

The order (ukulele, low-G ukulele, baritone, guitar) is the order of every menu.

**Low G**: many concert and tenor players tune the G string an octave lower. Chord shapes and tab are written exactly as for a high-G ukulele, so only playback changes: chords and tab notes on the G string sound an octave lower. Tab written for a high-G ukulele keeps its fingering.

### Choosing the instrument

- **For one song**: the **Instrument** menu on the **This song** tab. It's saved with the song.
- **For new songs**: Settings → All songs → Instrument and chord diagrams.
- A song can also follow the default: Settings → This song → Instrument → *Use default*.

Existing songs carry on as ukulele songs.

---

## 2. File names

Exports carry the instrument's code at the end of the name, so files for different instruments never get mixed up:

```
Baby Love_uke.pdf               ukulele, original key
Baby Love (+5)_uke.html         ukulele, 5 semitones up
Baby Love (+5)_bar.pdf          baritone uke
Baby Love (capo 3)_gtr.pdf      guitar with a capo on fret 3
Baby Love (-2, capo 2)_gtr.cho  guitar, 2 down, capo 2 (ChordPro)
Baby Love (lyrics).pdf          lyrics: the same on every instrument, so no code
```

They still go in the song's `exports` folder, in a subfolder for each key (`Original`, `G to C (+5)`, `Lyrics`).

---

## 3. Chord diagrams

- **Ukulele and baritone**: the libraries as before (540 chords each, every shape checked note by note).
- **Guitar**: a new library of **466 chords** from the same open-source collection (chords-db), checked the same way. Every note must belong to the chord, the important notes (root, 3rd, 7th…) must be there, and at least three strings must sound. Shapes with the root as the lowest note are preferred. Muted strings show as **X** above the diagram, and barre chords as a bar.
- Chord names you type are looked up the same way on every instrument (`Bbmaj7`, `B♭M7` and `A#maj7` all find the same shape).

### Left-handed

Settings → All songs → Instrument and chord diagrams → **Left-handed (mirror the diagrams)**. The strings run the other way across every diagram, matching a left-handed instrument: on screen, in exports and PDFs. One setting covers all songs and instruments.

---

### Choosing your own chord shapes

Click a chord diagram in the preview, or Write → **Chord shapes…**:
- The standard shape and the other correct shapes for the chord on your instrument, easiest first (found by `findShapes` in `src/shapes.js`: every shape within a four-fret hand position up to the 12th fret that has the chord's notes; guitar shapes may leave out the lowest strings).
- Click one to use it in this song (it plays so you can hear it), or type your own: one fret per string, left to right as in the diagrams (`2003`, `x32010`, or with spaces for frets 10+: `9 12 12 12`).
- **Use the standard shape** goes back.
- Saved in song.ini as `[shapes]` → `soprano = Am 2003, F 2010` (per instrument; high- and low-G ukulele share `soprano`). The names are the chords as shown, so a version in another key can have its own.
- Used everywhere: diagrams, exports, songbooks and playback. ChordPro `{define: Am base-fret 1 frets 2 0 0 3}` is read on import and written on export.

## 4. Capo

A capo lets you play easy shapes higher up the neck while the song still sounds in its key. Guitarists use one all the time; ukulele capos exist too, so it works on every instrument.

**Capo** on the **This song** tab (None, 1–7). With a capo on fret 3:

- **Chords and diagrams show the shapes you play**. A song in E♭ (E♭ A♭ B♭ Cm) shows **C F G Am**.
- **Playback still sounds in E♭**: the shapes are raised by 3, as a real capo does. Karaoke shows the shapes too.
- **Exports** say *"Capo 3 (chords shown are the shapes to play)"* under the title, and the file name includes it: `Song (capo 3)_gtr.pdf`. ChordPro exports include `{capo: 3}`.
- The capo is saved with the song (`capo = 3` in song.ini; nothing is written when there's no capo).

**Suggest…** works out the easiest capo position for the song's chords on your instrument. It rates every position from no capo to 7, counting:

- barre chords as hardest;
- then shapes high up the neck;
- then the number of fingers;
- then a small extra for each fret the capo goes up.

It offers the **best three**, plus *no capo* to compare against, with the shapes you'd play for each. Click one to use it.

Example (guitar, song in E♭):
```
Capo 1    Play: D  G  A  Bm
Capo 3    Play: C  F  G  Am
Capo 6    Play: A  D  E  F#m
No capo   Play: Eb  Ab  Bb  Cm   (now)
```

Capo and key change work together: the key sets what the song **sounds** like, and the capo sets which **shapes** you play.

---

## 5. Sounds

Settings → All songs → Playback and karaoke:

- **Ukulele sound** (ukulele and baritone): *Real ukulele* (recordings of a tenor uke, the default), *Plucked string* (made by the app) or *Hollow body*.
- **Guitar sound**: *Steel strings* (acoustic: brighter, rings longer, bigger body) or *Nylon strings* (classical: softer, warmer).

*Real ukulele* uses the FreePats "Ukulele" recordings (public domain, CC0; `src/sounds/ukulele`: 13 notes C4–C6 plus a muted strum), each played back faster or slower for the notes in between, with the set's own tuning corrections. The other four are made by the app. Each is a set of settings in one table (`SOUNDS` in `src/playback-audio.js`): how soft the pluck is, how long the strings ring, the body's resonances, and the gap between strings in a strum.

---

## 6. Strum library

**Strums…** (on the **Write** tab, or Song → Strum Library…) opens the library: common strumming patterns, ukulele first, each with **how it's played** and **what it's good for**.

| Time | Style | Strums |
|---|---|---|
| 4/4 | Everyday | Simple · Island (calypso) · Ballad · Down-up eighths |
| 4/4 | Rock | Driving downs · Rock push (3-3-2) |
| 4/4 | Country | Country boom-chick · Country train beat |
| 4/4 | Blues / jazz | Swing / shuffle · Slow blues (12/8 feel) |
| 4/4 | Reggae / ska | Chuck backbeat · Island with chuck · Reggae off-beat |
| 4/4 | Funk | Funk sixteenths |
| 3/4 | Waltz | Waltz (simple) · Waltz |
| 6/8 | Folk | 6/8 lilt |
| 2/4 | March / polka | March / polka |

The library opens on the song's time signature; the style buttons under it (All, Everyday, Rock, Country…) narrow the list. Each strum is marked Beginner, Intermediate or Advanced.

For each strum you can:
- **▶ Hear** it: four bars (C, then G, two bars each) on the song's instrument, sound and tempo.
- **Add to song**: puts the pattern (e.g. `{D-XU-UXU}`) on a line above the cursor.
- **Make default**: use it for songs that have no pattern of their own, in that time signature (other time signatures fall back to Simple).

Patterns are shown as arrows (↓ ↑ ✕, · for a rest); a stroke played harder is in bold.

**On the sheet** a pattern shows as a strum info box: the time signature, the pattern's name when it's one from this library, arrows, letters and the count (Settings → Look → Strum patterns: bold box, light box, one line or plain). A strum in another time is added as `{3/4 D-DUDU}`, which changes the song's time from that point.

**The defaults are unchanged**: when a song has no pattern, playback and karaoke use **Simple** (one strong down-strum, then lighter ones), with **Island** as the other usual choice. Settings → Playback lists every library strum under *From the strum library*, and the setting can also be made per song.

---

## 7. How it works inside (for developers)

### Instrument profiles: `src/instruments.js`

Everything that differs between instruments lives in one list:

```js
{
  id: 'guitar',                       // stored in song.ini (ukulele keeps the id 'soprano')
  name: 'Guitar', label: 'Guitar (EADGBE)',
  code: 'gtr',                        // export names
  tuningName: 'EADGBE',
  strings: [40, 45, 50, 55, 59, 64],  // open strings (MIDI), diagram order left → right
  tabNames: ['e', 'B', 'G', 'D', 'A', 'E'],  // tab lines top → bottom
  library: 'chords-guitar.json',
  chordRange: 48                      // lowest note for chords made up when there's no shape
}
```

`instrument(id)` returns a profile (unknown ids → ukulele); `INSTRUMENTS` is the ordered list. **Adding an instrument** (low-G ukulele, mandolin, drop-D guitar) means:
1. adding a profile;
2. building its chord library with `tools/build-chord-library.js`;
3. listing the library file in `package.json` → `extraResources`;
4. adding it to the two Instrument menus in `index.html`.

### Where profiles are used

| File | Use |
|---|---|
| `src/chord-library.js` | Which library file to load |
| `src/diagram-svg.js` | Any number of strings, same overall width; muted strings; `left_handed` mirrors frets, fingers and barre |
| `src/playback-schedule.js` | Open-string pitches for voicing chords; `capo` option raises every note |
| `src/tab.js` | Tab tunings (`TUNINGS`); `convertTab` between instruments; `blankTab` |
| `src/transpose.js` | `transposeIR` converts tab to `options.instrument` |
| `src/song-library.js` | Valid instruments; `exportFileName(title, { instrument, transpose, capo }, ext)` |
| `src/chord-sheet.js` | Report which instrument pasted tab is for (`tabInstruments`) |
| `index.html` | `songInstrument()`, libraries loaded for every profile, menus, sounds |

### Capo: `src/capo.js`

- `rankCapos(chordNames, library)` → `[{ capo, score, shapes }]`, best first; `suggestCapo` returns the first.
- `shapeDifficulty(definition)`:
  - highest fret × 2 + fingers;
  - + 8 for a barre;
  - + 6 above the 4th fret;
  - + 40 if the library has no shape.
- In the app, `songCapo()` reads `song.capo`. Display, diagrams and exports use `transposeIR(ir, transpose − capo)`, and playback passes `capo` to `buildSchedule`.

### Strums: `src/strums.js`

- `STRUMS`: `{ id, style, name, pattern, beats, level, description, uses }`, in library order (`ORDER`): the everyday ukulele strums first, then by style.
- `strumsFor(beats)`, `strum(id)`, `arrows(pattern)`.
- `defaultPattern(beats, style, custom)` in `playback-schedule.js` accepts any library id as the style.
- Tests check that every pattern fits its bar and reads back unchanged.

### Guitar chord library

`node tools/build-chord-library.js` rebuilds all three libraries from chords-db (`node_modules/@tombatossals/chords-db/lib`). For guitar:
- muted strings (-1) are allowed, with at least three strings sounding;
- slash chords (C/E…) aren't in the library; they're looked up by their main chord;
- the ukulele libraries come out byte-for-byte the same as before.

---

## 8. Limits and possible next steps

- **Guitar shapes come from chords-db as they are.** A few are less common voicings (e.g. Cmaj7 as 3-3-2-0-0-0). Hand-checked guitar shapes could be added the same way as for the ukulele (`tools/hand-checked/`).
- **Standard tunings only**: no low-G ukulele, drop-D or open tunings yet. Each would be one more profile.
- **Capo up to 7.** Higher positions are possible on a guitar but rarely easier.
- **Strum timing is even within a bar.** Swing is written as triplets; there's no "swing feel" setting for straight patterns.
