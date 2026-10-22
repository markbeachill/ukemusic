# Tablature in ukemusic

How ukemusic handles tab: how to write and paste it, what the app does with it, and how that works inside. Applies from version 2.17; guitar and baritone tab, and converting tab between instruments, from 3.0. Instruments, capo and the strum library are described in [INSTRUMENTS.md](INSTRUMENTS.md).

---

## 1. The short version

- Tab lives in the song file as plain text in a ```` ```tab ```` block. That text is the master copy: what you type is what's kept.
- Whenever the app needs to do something with the tab (check it, draw it, change its key, play it), it reads the text into a **model**: a list of notes, each with its string, fret and pitch.
- Everything else is worked out from that model. Nothing is stored apart from the text.

```
 pasted from a website ──► tidied ──► song text (```tab)  ◄── you edit here
                                            │
                                            ▼
                                     internal model
                         (string · fret · pitch · position)
                                            │
            ┌──────────────┬───────────────┼───────────────┬──────────────┐
            ▼              ▼               ▼               ▼              ▼
         checks        display        key changes      playback       karaoke
       (warnings)   (bold frets,     (tab moves      (notes picked   (notes light
                    split for PDF)    with the key)   in time)        up in turn)
```

---

## 2. Writing tab

A tab block goes inside the music section, between a ```` ```tab ```` line and a ```` ``` ```` line:

````
--START MUSIC--
[[Intro]]
```tab
A|--0--0--1--3--|--3--1--0-----|
E|--------------|--------------|
C|--------------|-----------2--|
G|--------------|--------------|
```
[C]Joyful, joyful, [G]we adore thee
--END MUSIC--
````

- **One line per string**, the highest-sounding string on top: `A E C G` for a ukulele (GCEA, high or low G: written the same way); `E B G D` for a baritone; `e B G D A E` for a guitar.
- **Numbers are frets**: 0 is the open string, 3 is the third fret. Frets 10–24 are written as two digits (`12`).
- **Dashes are space.** The spacing between notes sets the timing when the tab is played (see section 7).
- **`|` is a bar line.**
- **Symbols**: `h` hammer-on, `p` pull-off, `/` slide up, `\` slide down, `b` bend, `r` release, `~` vibrato, `x` muted. They're shown as written. The model records hammer-ons, pull-offs and slides, but playback plays every note as a plain pick.
- **Other lines are allowed** inside a block, such as chord names written above the tab or "x2". They're kept exactly where they are.
- **You can leave out strings you don't use.** A block with only `E|` and `C|` lines is fine; the app knows which strings they are from their names.

### Insert tab and overtype

- **Insert tab** (on the **Write** tab) adds an empty block for the song's instrument (4 lines for a ukulele or baritone, 6 for a guitar) below the cursor. For a ukulele:
  ```
  A|----------------|----------------|
  E|----------------|----------------|
  C|----------------|----------------|
  G|----------------|----------------|
  ```
- **Inside a tab block, typing writes over the dashes.** Put the cursor on a dash and type `3`: the dash becomes 3 and the line stays the same length, so everything stays lined up.
- **Backspace** turns the character before the cursor back into a dash.
- Only dashes are written over. Where the character under the cursor is a `|` or another fret number, typing inserts as normal, so check the line still lines up. Outside tab blocks, typing always works normally.

---

## 3. Pasting tab from a website

Use **Paste chord sheet…** and paste the whole page text: words, chords and tab together. The converter:

| What it finds | What it does |
|---|---|
| Lines like `E|--0--3--|` | Wraps them in a ```` ```tab ```` block |
| Lower-case string names (`a`, `g`) | Puts them in capitals |
| Strings left out of a system | Adds them as empty lines, so all four are there |
| Lines of different lengths | Pads them with dashes, adding the closing bar line |
| Chord names on the line just above the tab | Keeps them inside the block, above the tab |
| Several systems separated by blank lines | Puts them in one block |
| "h = hammer on, p = pull off…" | Removes it (it's a key, not music) |
| "Tuning: GCEA", "Capo: 2" | Leaves them as text (they're no longer mistaken for chords) |
| Tab for another instrument (e.g. guitar tab, `e B G D A E`) | Keeps it as written; the report says so, and it's shown converted for the song's instrument (section 6) |

The report under the box says what was done, e.g. *"1 tab block tidied, 1 symbol key removed."*

Tab that's already in a ```` ```tab ```` block is left alone.

---

## 4. Checks (warnings)

The warning bar (bottom of the window) reports problems in any tab block, with line numbers:

- **"The string lines are different lengths"**: notes further along may not line up between strings.
- **"String names … don't match a ukulele"**: for example `X|` or strings in the wrong order.
- **"5 string lines; a soprano ukulele has 4"**: too many strings.
- **"Symbols the app doesn't know"**: anything other than numbers, dashes, bar lines and the symbols listed in section 2.
- **"No tab lines found in this tab block"**: the block has text but nothing that looks like a string line.

The tuning comes from the **string names**, not the instrument setting: `A E C G` is a ukulele, `E B G D` a baritone, and six lines `e B G D A E` a guitar, whichever instrument the song is set to.

---

## 5. How tab looks

- **On screen and in exports**: fret numbers are bold, in the chord colour; string names are slightly lighter. In the **Stage** print style everything is black.
- **PDFs**: tab too wide for the page is split at bar lines, the same way long lyric lines are split, so it isn't shrunk. A split happens only at a bar line that runs through every string.
- **Markdown and ChordPro exports**: the tab text as it is (ChordPro wraps it in `{start_of_tab}` … `{end_of_tab}`).
- **Lyrics export**: tab is left out.

---

## 6. Changing key, and other instruments

### Tab written for another instrument

Tab is always **shown and played for the song's instrument** (Instrument on the **This song** tab). Tab written for a different instrument, such as guitar tab in a ukulele song, is converted:

- Every note keeps its **pitch**. It goes on the string where it needs the lowest fret (0–15).
- Notes the instrument can't reach move by an **octave** (a guitar's low notes are below a ukulele's range). The warning bar says how many.
- Bar lines and spacing are kept, and hammer-ons, pull-offs and slides keep their marks where there's room.
- A **baritone uke** is tuned like the top four strings of a guitar, so guitar tab on the top four strings comes across unchanged.

The song file keeps the tab as you wrote or pasted it. Set the song's instrument to the tab's instrument to see it exactly as written.

### Changing key

When you change key, or save or export a version in another key, the tab moves too:

1. Each note keeps its **string** if the new fret is between 0 and 15.
2. If not (for example an open string moving down), it moves to the **string that plays the same note with the lowest fret**.
3. If no string can play it (a note below the ukulele's lowest note), it moves **up or down an octave**, and the warning bar says so.

If a fret grows from one digit to two (9 → 11), a dash is added across all the strings at that point, so everything stays lined up.

The song file itself is never changed by a key change. The moved tab is worked out each time it's shown or exported, just like the chords.

---

## 7. Playback and karaoke

Plain tab doesn't say how long each note lasts, so the app uses the spacing:

- The **most common gap** between notes in a block counts as **half a beat** (an eighth note).
- **Wider gaps last longer** in proportion, up to 2 beats, and **closer notes are quicker**. Lengths are rounded to the nearest quarter beat so they sound rhythmic.
- **Notes in the same column** (one above another) are played together.
- A tab block takes **as many whole bars as it needs**, then the song carries on with the next chord.

Speed is set by the song's **tempo** on the **This song** tab, as for chords. If a riff sounds too fast, lower the tempo or space the notes out more.

In **karaoke**:
- The tab shows as written, in a fixed-width font, with a progress line under it.
- **Each note lights up as it's played**, and notes already played turn blue.
- The strip at the top shows the **name of the note** being picked (e.g. `C5`), and shows several names when notes are played together.

---

## 8. How it works inside (for developers)

All tab logic is in **`src/tab.js`**: pure functions, no screen code, unit tested in `test/tab.test.js`.

### The model

`parseTab(text, { instrument, firstLine })` returns:

```js
{
  systems: [            // a "system" is a run of string lines (one row of tab)
    {
      lines: [{ label: 'A', separator: '|', body: '--0--1--|', index: 2, prefix: 'A|' }, …],
      tuning: { name: 'soprano', strings: [['A', 69], ['E', 64], ['C', 60], ['G', 67]] },
      width: 37,
      notes: [ … ]      // this system's notes, in column order
    }
  ],
  items: [              // the whole block in order, so it can be written back unchanged
    { kind: 'text', text: '   C           G' },
    { kind: 'system', system: … }
  ],
  notes: [              // every note, in playing order
    { system: 0, column: 2, string: 1, line: 1, label: 'E', fret: 0, text: '0',
      technique: null, midi: 64, pitch: 'E4' },
    …
  ],
  warnings: [ 'Tab lines 3–6: the string lines are different lengths (…)' ]
}
```

- **`column`** is the character position in the line (after `A|`), so the writer's spacing is kept.
- **`string`** is the string in the tuning (0 = top line); **`line`** is which written line the note is on. They differ when strings are left out.
- **`midi`** is the pitch as a number (open string + fret); **`pitch`** is its name with octave (`E4`).
- The **tuning** is picked from the string names: `TUNINGS` is built from the instrument profiles in `src/instruments.js`: soprano `A E C G` (high G), baritone `E B G D` and guitar `e B G D A E`.

### Functions

| Function | Does |
|---|---|
| `parseTab(text, options)` | Text → model (above) |
| `writeTab(model)` | Model → tidy text: capitals, equal lengths, closing bar lines |
| `tidyTab(text)` | Read, add missing strings, write back. Used by the paste importer |
| `transposeTab(text, semitones, options)` | Moves notes as in section 6 → `{ text, warnings }` |
| `convertTab(text, instrument, { semitones })` | Tab for another instrument → this one, keeping pitches (section 6) |
| `blankTab(instrument)` | The empty lines for Insert tab |
| `wrapTab(text, maxChars)` | Splits long systems at shared bar lines (for PDFs) |
| `tabTiming(model)` | `{ steps: [{ beat, notes }], beats }`: playing times from the spacing (section 7) |
| `tabBars(text, beatsPerBar)` | How many whole bars a block takes when played |
| `findTabRuns(lines)` / `isStringLine(line)` | Spotting tab in pasted text (strict) or inside a block (lenient) |

### Where it's used

| File | Use |
|---|---|
| `src/parser.js` | Tab block warnings (`parseTab(…).warnings`) |
| `src/transpose.js` | `transposeIR` converts tab to `options.instrument` and moves it with the key (`convertTab`) |
| `src/renderer-html.js` | `renderTabHtml`: `.tab-string` / `.tab-fret` spans; `wrapTab` when printing |
| `src/chord-sheet.js` | `fenceRawTab`: finds and tidies pasted tab; report `tabs`, `tabLegends`, `tabWarnings` |
| `src/playback-schedule.js` | A tab block becomes one slot plus "hold" slots (one per bar); its notes become picked `strum` events marked `tabNote` |
| `src/karaoke.js` | A `kind: 'tab'` line with `steps: [{ time, pitches, marks: [{ row, col, len }] }]`, giving each note's time and its place in the text |
| `src/codemirror-ukemusic.js` | `createTabOvertype`: typing over dashes and Backspace, only on string lines inside a tab block |
| `index.html` | Insert tab button (`insertTabBlock`), base tab CSS, karaoke note highlighting |

**Keeping playback and karaoke in step:** both count a tab block's bars with the same `tabBars` function, and both time its notes with `tabTiming`. If you change how timing works, change it in `tab.js` only.

---

## 9. Limits and possible next steps

- **No real rhythm.** Timing comes from spacing. Exact rhythm would need extra markings in the text, or importing a format that has rhythm (MusicXML, Guitar Pro, alphaTex).
- **Techniques aren't played.** Hammer-ons, slides and bends are shown and recorded but played as plain picks.
- **Converting full guitar chords can drop notes.** Five or six notes played together won't all fit on four strings; the ones that can't be placed are left out and counted in the warning. Single-note riffs and melodies convert completely.
- **No grid editor.** Tab is edited as text, with overtype to keep it lined up.
- **High G only.** Low-G tuning isn't recognised separately from high G (the string names are the same), so a low-G tab's G string plays an octave too high.
