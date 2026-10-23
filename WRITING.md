# Writing songs in ukemusic

A guide for anyone writing or editing songs. It covers everything you can type, with examples. In the app, it's under **Write → How to write**.

A song is plain text. Chords go in square brackets inside the words, and a few other kinds of brackets add sections, strums and repeats. ukemusic turns that into a chord sheet, plays it, and prints it.

---

## The quick reference

| You type | What it does |
|---|---|
| `[C]word` | Chord C, starting on "word" |
| `[[Verse 1]]` | A section heading |
| `[[Intro]] [C] [G]` | A label at the start of a line |
| `[C][]` | C for two bars (each `[]` adds a bar) |
| `[C x3]` | C for three bars |
| `[Em:2]` | Em for two beats; a plain chord after it fills the rest of the bar |
| `[N.C.]` | No chord: a bar of silence (`[N.C.:2]` for two beats) |
| `\| C \| G C \| % \|` | A line of bars: one chord per bar, two in a shared bar, `%` repeats the bar before |
| `… (x2)` | At the end of a line: play the line twice |
| `{D-DU-UDU}` | Strum pattern from here on |
| `{3/4 D-DUDU}` | Strum pattern, and the song is in 3/4 from here on |
| `{swing D-DU-UDU}` | Strum pattern, played swung (also `light swing`, `shuffle`, `straight`) |
| `{A: D-DU-UDU}` | A named strum: used here, and wherever `{A}` is written |
| `{A}` | Use the strum named A again |
| `{D-DU-UDU \| D-DUDU}` | Strums that take turns, bar by bar |
| `{stop}` | The next chord is one strum, left to ring |
| `[C↓]` `[C↓↓]` `[x]` `[.]` | One strum, two strums, a muted strum, keep going (see Strums, mutes and holds) |
| `**loud**` `*soft*` `__this__` | Words in bold, italic or underlined |
| `{harmony}` … `{lead}` | The lines in between are a harmony part, in italics |
| A tab block (see Tab, below) | Tablature |

---

## The music section

Everything between these two lines is the song:

```
--START MUSIC--
…
--END MUSIC--
```

Anything above or below them is ignored, so it's a safe place for notes to yourself. (If a song has no such lines, the whole file is read. This can be changed in Settings → How the chord sheet looks.)

---

## Chords

Put the chord in square brackets **just before the word or syllable where it changes**:

```
I [C]come from Alabama with my [G7]banjo on my [C]knee
Oh! Su[F]sanna
```

- A chord can start mid-word: `Su[F]sanna`.
- Chord names are the usual ones: `C`, `Am`, `G7`, `Fmaj7`, `Dm7`, `Bb`, `F#m`, `Csus4`, `Cadd9`, `Bdim`, `Caug`, and slash chords like `C/G`.
- A chord with nothing after it (at the end of a line, or on a line of its own) is fine.
- Anything in single brackets that isn't a chord is shown as written, with a warning, so typos get noticed: `[Cmj]`.

### How long a chord lasts

When the song is played, **each chord lasts one bar** (one pass of the strum pattern). To hold it longer:

| You type | Bars of C |
|---|---|
| `[C]` | 1 |
| `[C][]` | 2 |
| `[C][][]` | 3 |
| `[C x3]` | 3, shown as **C×3** |

`[]` is shown as a bar line `|`, so it can also go between words to show where the next bar starts:

```
[C]Oh, Susanna, [] don't you [G]cry
```

`[C x3]` is the shorter way when you don't need to show where in the words each bar falls.

### Chords shorter than a bar

Many songs change chord every two beats in places. Put the number of beats after a colon:

```
[C]lost and [Em:2]gone for[Am:2]ever, [D]Clementine
```

- `[Em:2]` is Em for 2 beats, shown as **Em:2**.
- **A plain chord after a short one fills the rest of the bar.** In `[Em:2]gone for[Am]ever`, Am gets the last 2 beats. So you only need the number where it isn't obvious.
- `[C:1]`, `[C:3]` work too, and so does `[C:6]` (a bar and a half in 4/4).
- **Every chord starts the strum pattern from the beginning.** So a 2-beat chord plays the first half of the pattern: with the Island strum `D-DU-UDU`, that's **D-DU**, starting with a down-strum on the chord change.

### Pauses: no chord

`[N.C.]` (or `[NC]`) means **no chord**. The strings are stopped and nothing plays for a bar. `[N.C.:2]` is 2 beats of silence, and `[N.C. x2]` two bars:

```
[G:2]Clemen[N.C.:2]tine, [G7:2]Clemen[N.C.:2]tine
```

For a chord struck once and left to ring (rather than silence), use `{stop}`: see Strum patterns.

---

## Lines of bars (intros, solos, instrumentals)

For a run of chords with no words, write the bars out between `|` signs:

```
[[Intro]] | C | F | % | G7 C |
```

- **One chord in a bar** plays for the whole bar.
- **Two chords in a bar** share it: `| G7 C |` is half a bar each. Three or four chords share it equally. Beats can be given: `| C:3 G |` is 3 beats of C, then G for the last beat.
- **`N.C.`** is a bar (or part of one) with no chord: `| C | G | N.C. |`.
- **`%`** repeats the bar before (all of it, so `| G7 C | % |` plays G7 C twice).
- The line can start with a label: `[[Intro]]`, `[[Solo]]`.
- `||` and repeat signs `|:` `:|` at the ends are allowed (they're shown as plain bar lines). To play the line twice, add `(x2)`, see below.

On the sheet the bars are evenly spaced, and in karaoke the bars light up one by one.

---

## Repeating a line

Put `(x2)`, `(x3)` … at the end of a line to play it that many times:

```
Oh my [F]darling, oh my darling (x2)
[[Outro]] | C | G7 | C | (x2)
```

The sheet shows **×2** at the end of the line. Playback plays the line again, and karaoke shows it again. `(2x)` and `(×2)` work too.

---

## Sections

A label in double square brackets **on a line of its own** starts a section:

```
[[Verse 1]]
[[Chorus]]
[[Bridge]]
```

Sections are printed as headings, are kept together on one page when printing, and are what **Play → Loop the section I'm in** repeats.

A label **at the start of a line with chords** is printed in bold at the start of that line, and doesn't start a new section:

```
[[Intro:]] [Am] [F] [C] [G]
```

---

## Strum patterns

A strum pattern goes in curly brackets on a line of its own. It applies from there on, until the next one:

```
{D-DU-UDU}
```

| Letter | Means |
|---|---|
| `D` | down-strum |
| `U` | up-strum |
| `X` | chuck: a strum into strings damped with the palm, a percussive "chk" |
| `-` | a rest: let the strings ring, no strum |
| `>` | after a stroke: play it harder (`D>-DU-UDU`) |

The pattern is spread evenly over one bar. `D-DU-UDU` is eight slots in a 4/4 bar, so each is half a beat: **1 & 2 & 3 & 4 &**.

On the sheet, a pattern is shown as a strum box with arrows, letters and the count. If it's a common pattern, its name is shown too (Island, Waltz…). **Write → Strum patterns** has a library of patterns to hear and add.

### Changing the time

Put the time signature in front of the pattern. The song is in that time from there on, for playback too:

```
{3/4 D-DUDU}
```

In 6/8 (and 9/8, 12/8) the tempo counts dotted quarters, two a bar in 6/8 ("**1** 2 3 **4** 5 6"), as tempo lists do: 6/8 at 60 is one "1… 4…" a second. The count-in clicks loud on 1 and 4, soft between.

### Swing

Swung, the beats stay where they are and each in-between strum (the "&") comes a little late, so the strum goes long-short. The tempo doesn't change. **Play → Feel** sets it for a song (or all songs): Auto (a light swing on the Island strum, the rest straight), Straight, Light swing, Swing or Shuffle. To set it in the song itself, put the word in front of the pattern:

```
{swing D-DU-UDU}
{light swing D-DU-UDU}
{shuffle DUDUDUDU}
{straight D-DU-UDU}
```

It carries on from there until another one changes it; `{swing}` on its own changes just the feel. Patterns in pairs of eighths (or sixteenths) are swung; 6/8 and triplet patterns lilt already and are left as they are.

### Naming a strum and using it again

Give a pattern a name, then write just the name to use it again later:

```
{A: D-DU-UDU}
[[Verse 1]]
…
{B: D-D-D-D}
[[Chorus]]
…
{A}
[[Verse 2]]
```

- A name can be a letter or a short word: `{A: …}`, `{Verse: …}`, `{Chorus: …}`. It can't be just D, U or X, since those are strums.
- The first time, the strum gets its full box with the name on it. After that, `{A}` shows a small tag with the arrows as a reminder.
- With two or more named strums, a key to them is printed at the top of the sheet.
- A name can come with a time: `{W: 3/4 D-DUDU}`.

### Bars that take turns

Two (or more) patterns separated by `|` take turns, a bar each:

```
{D-DU-UDU | D-D-DUDU}
```

Bar 1 uses the first, bar 2 the second, bar 3 the first again, and so on. The box shows both, marked "bar 1" and "bar 2".

### Stop

`{stop}` makes the next chord a single down-strum, left to ring for its bar (or bars). After that, the strum before carries on:

```
For I [C]come from Alabama with my [G7]banjo on my {stop}[C]knee
```

It can go on a line of its own (shown as a STOP box), or in the words just before the chord (the chord is shown as **C stop**).

### Strums, mutes and holds in the brackets

Many ukulele clubs mark strums inside the chord's brackets. ukemusic reads the same marks (the North Shore Ukulele Circle's), and shows them as written:

| You type | It means |
|---|---|
| `[C↓]` | One down-strum on C, left to ring (`[Cv]` is the same, easier to type) |
| `[C↓↓]` `[C↓↑]` | Those strums, spread over the bar |
| `[x]` `[mute↓]` `[x↓↓]` | Muted strums ("chk"), a beat each |
| `[.]` `[…]` `[G…]` | Keep the chord going (nothing new to play) |
| `[Bm7.Am7]` | Two chords sharing the bar |
| `[\|]` `[/]` | A bar line, like `[]` |
| `[x2]` at the end of a line | Play the line twice, like `(x2)` |
| `[Gs4]` `[A7s4]` `[Gs2]` `[Dma7]` | Short names for Gsus4, A7sus4, Gsus2, Dmaj7 |

```
[C↓] Oh my [G↓↓]darling, [x] oh my [C]darling
```

---

## Tab

Tablature goes in a block that starts with a line of three backticks and the word tab, and ends with a line of three backticks:

````
```tab
A|--0--0--1--3--|
E|--------------|
C|--------------|
G|--------------|
```
````

One line per string, numbers are frets, dashes are space, `|` is a bar line. **Write → Insert tab** adds an empty block, and inside a block typing writes over the dashes. [TABLATURE.md](TABLATURE.md) has all the details.

**View → Tab** sets how tab looks in every song: the fret numbers (bold in the chord colour, bold, or plain), its size compared with the words, a shaded box behind it, and faint dashes so the frets stand out. **Export → Tab in PDFs** can leave it out of printed sheets.

---

## Bold, italic and underline

Mark words to stand out, for a shout, a harmony part or who sings what:

| You type | You get |
|---|---|
| `**every** word` | **every** word |
| `*softly* now` | *softly* now |
| `__all together__` | <u>all together</u> |

- Select the words and press **Write → B / I / U**, or **Ctrl+B**, **Ctrl+I**, **Ctrl+U**. Press again to take it off.
- It can run across chords: `**Oh my [C]darling**` is fine.
- It shows in the preview, PDFs, web pages and the lyrics; text exports, ChordPro and karaoke show the plain words.
- A single `*` with no partner on the line stays a `*`. To write a real `*` or `_` next to words, put a backslash before it: `\*`.

### Harmony parts

When some lines are a harmony part sung with (or over) the main line, put `{harmony}` on a line before them and `{lead}` after. Their words are in italics:

```
[C]Oh my darling, oh my darling
{harmony}
[C]  oh my darling
{lead}
[F]Oh my darling Clementine
```

`{harmony}` and `{lead}` take no room on the sheet. Every song starts with the main line.

---

## Pasting songs from websites

- **File → Paste from website** takes a song copied from a chord website and turns it into ukemusic's format.
- Many websites put the chords **on a line above the words**. **File → Tidy chords above words** moves them into the words as `[chords]`. Check lines it marks: where a website has lost the spacing, it has to guess.
- ChordPro files (`.cho`, `.chopro`) can be imported with **File → Import text file**. A whole folder of them (a club's songbook, say) comes in at once with **File → Library → Import ChordPro files…** (or the library button): one song each, with their tags and links, and each subfolder becomes a setlist.
- Songbook marks in the brackets (`[C↓]`, `[x]`, `[.]`, `[Gs4]`…) are part of ukemusic's own format, so they come in as written; strum boxes of arrows over counts become strum patterns, and `[Riff 1]` a label.
- Saved as ChordPro, ukemusic's shorthand goes out as ChordPro notes, which other apps print above the words: `[C][*×3]`, `[Em][*2 beats]`, `[*stop][C]`. They come back exactly as they were.

---

## The song's details

Artist, year, written by, album, source, tags and difficulty go on the **Info** tab beside the song, not in the song text, with the song's original key, time and tempo. Notes and history go on the **Notes** tab. How you play it (the key you play in, saved keys, capo, instrument, strum) is on the **This song** tab.

---

## How the sheet can look

**View → Layout** chooses where the chords go. The song is written the same way for all of them:

| Layout | Looks like |
|---|---|
| Chords above the words | The classic chord sheet, in a fixed-width font |
| Columns | Chords above their words in table columns, in any font |
| Chords in the words | I **[C]**come from Alabama: the most compact, good on a phone |
| Chords only | Just the chords of each line, for whoever is playing along |

The same choice is in **Settings → How the chord sheet looks**, and it applies to exports and songbooks too.

**View → Not the common ones** leaves out the diagrams of the chords everyone knows (C, G, Am, F, D7 and so on), so the shapes that need looking at stand out. The list is yours to change: **Settings → All songs → Chord diagrams → Common chords**.


### On the big screen: the Session screen

**Play → Session** (or **Session** on a setlist) shows the song for a whole group to play from, as big as it fits on one screen. It uses the song as you wrote it, so a few habits help it fit:

- **A blank line between parts** (or a heading like `[[Chorus]]`). Each part is kept together in its column, so parts are what it arranges.
- **Chorus once:** in **This song → Stage copies**, "Once, then as before" prints the chorus in full the first time and "Chorus" after that. The Session screen does the same, which often saves a page.
- **Short lines** wrap less. A long line still wraps with the chords above the right words.

**Library → Check songs fit one screen…** tells you which songs need a page turn before the night.

---

## Tips

- **Write → Guess the key** works out the likeliest key from the chords, with its reasons. It's only needed for spelling chords when you change key (F♯ or G♭).
- **This song → Make this the song's key…** rewrites the chords in the text itself after you've tried a key with − and +.
- Warnings (an unknown chord, an unknown strum name, tab that doesn't line up) are shown in the bar below the editor, with their line numbers.
- The song file is plain text, so it can also be edited in any text editor.
