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
| `{melody: E E F G \| G F E D}` | The tune of the next line (see The tune, below) |
| `{pick: up and back}` `{pick: g C E A}` | Picked, not strummed, from here on (see Picking patterns, below) |

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

Tab doesn't say how long notes are, so ukemusic times it by the spacing: the most common gap between notes is an eighth. **A time after the word tab** (`` ```tab 4/4 ``, `` ```tab 3/4 ``, `` ```tab 6/8 ``) times it by its bars instead: each `|…|` is a whole bar, and a note's place in its bar is when it's played. That's exact for held notes and slow patterns; it's what **Pick → Write out** writes. Lines of words and chord names inside the block are shown with the tab and don't affect the timing.

**View → Tab** sets how tab looks in every song: the fret numbers (bold in the chord colour, bold, or plain), its size compared with the words, a shaded box behind it, and faint dashes so the frets stand out. **Export → Tab in PDFs** can leave it out of printed sheets.

---

## Picking patterns

A song can be picked instead of strummed (the **Pick** tab), and change pattern as it goes. A `{pick}` line changes it from there on, like a strum line:

```
{pick: up and back}
[C]Joyful, joyful, [G7]we adore Thee…
[[Chorus]]
{pick: travis}
[F]Melt the clouds of [C]sin and sadness
```

- **By name:** `one string a beat` (or `up`), `up twice`, `up and back`, `pinch and roll`, `travis` (or `alternating thumb`), `chord melody`.
- **Your own, by string:** `{pick: g C E A E C}`: the strings in the order they're picked, one per eighth; `g+A` picks two together, `-` is a rest. It repeats to fill each bar (8 steps in 4/4, 6 in 3/4 or 6/8). On a guitar, `E` is the bottom string and `e` the top.
- **Your own, by finger:** `{pick: p i m a m i}` (p thumb, i index, m middle, a ring); the fingers go to their strings as in How it works (on a ukulele thumb g, index C, middle E, ring A).
- **Named, to use again:** `{pick V: g+A C E C}`, then `{pick V}` later.
- **Back to strumming:** `{pick: strum}`.

**Pick → Change here** adds the line for you at the cursor. Marked strums (`[C↓]`, `{stop}`) are still strummed. A mistake in a `{pick}` line shows as a warning and the pattern carries on as it was.

**Pick → Write out ▾ → This line** turns the line at the cursor into tab, there in the song, so you can change single notes of it (a fill, a bar done differently); the rest of the song stays chords and patterns.

## The tune

A song can carry its tune, so ukemusic can play it while you learn the song (**Pick → Play the tune**) and make a picked solo from it (**Pick → Pattern → Chord melody**). Write it on a line of its own, just above the words it's sung to:

```
{melody: E E F G | G F E D | C C D E | E. D/2 D2}
[C]Joyful, joyful, [G7]we adore Thee, [C]God of glory, [G7]Lord of love;
```

- **Notes by name**, in the song's written key: `E`, `F#`, `Bb`. (They move with the key you play in, and when you rewrite the song in another key.)
- **Lengths:** a note lasts one count (a beat; an eighth in 6/8). `E2` is two counts, `E3` three, `E/2` half a count, `E.` one and a half, `E2.` three. `r` (or `-`) is a rest, with the same lengths: `r2`.
- **Octaves:** each note is taken as the nearest one to the note before, so a tune that moves by step needs no thought. Add `'` for an octave higher than that (`G'`) or `,` for an octave lower (`G,`).
- **Bars:** `|` marks the bars, to make it easier to read and check (ukemusic warns about a bar that doesn't add up). A **short first bar is a pickup**: the notes sung before the line's first chord, like the "A-" of "A-[C]mazing":
  ```
  {melody: G | C2 E/2 C/2 | E2 D | C2 A | G2 G}
  A[Cx2]mazing grace, how [F]sweet the [C]sound that
  ```
- **Verses share their tune:** a line without a `{melody}` of its own is sung to the tune of the first line before it with exactly the same chords. So usually only the first verse needs writing; give a line its own `{melody}` when it's different.
- **ABC:** if you have a tune in ABC (the folk tune text format, from sites like The Session), use `{melody abc: …}` with the ABC notes: `C` is middle C, `c` the octave above, lengths count eighth notes (`E2` is a beat), `z` is a rest.

**Seeing the tune as notes.** A song with its tune written in shows it as music on a staff (treble clef), at the pitch you sing, in the key you're playing in. **View → The tune** chooses how:
- **A strip at the top** (the usual): each tune once, with the chords above the staff where they change and the first words of its line. Verse 2 sung to verse 1's tune isn't drawn again. The sheet stays short.
- **Over every line**: a staff above each line it's sung on, like a printed songbook. It's about twice as long.
- **Hidden.**

It's saved with the song (the default for all songs is in Settings → All songs) and used in its PDFs and web pages; Stage copies never show it. While the song plays, the note being sung lights up.

Tab isn't used for the tune: a fret number is a different note on every instrument, while a note name works for all of them.

**Tunes from ChordPro files.** A ChordPro song with its tune in ABC (`{start_of_abc}`) comes in with `{melody}` lines when the tune's bars match its lines; and a ChordPro export can carry your tune as ABC notation for other apps (see [ukemusic and ChordPro](CHORDPRO.md)).

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
- **A difficult sheet** (a PDF or scan where the chords have lost their places, or the timing written in words): **Copy AI prompt** in the same window copies a prompt that tells an AI chat (Claude, ChatGPT, Gemini…) ukemusic's format. Paste it into the chat with the chord sheet, paste the answer back into Paste from website, and check the timing when you play it.
- Many websites put the chords **on a line above the words**. **File → Tidy chords above words** moves them into the words as `[chords]`. Check lines it marks: where a website has lost the spacing, it has to guess.
- ChordPro files (`.cho`, `.chopro`) can be imported with **File → Import text file**. A whole folder of them (a club's songbook, say) comes in at once with **File → Library → Import ChordPro files…** (or the library button): one song each, with their tags and links, and each subfolder becomes a setlist.
- Songbook marks in the brackets (`[C↓]`, `[x]`, `[.]`, `[Gs4]`…) are part of ukemusic's own format, so they come in as written; strum boxes of arrows over counts become strum patterns, and `[Riff 1]` a label.
- Saved as ChordPro, ukemusic's shorthand goes out as ChordPro notes, which other apps print above the words: `[C][*×3]`, `[Em][*2 beats]`, `[*stop][C]`. They come back exactly as they were.
- Everything about ChordPro (what comes in, what goes out, and what ukemusic adds to it) is in [ukemusic and ChordPro](CHORDPRO.md).
- **Words templates:** a line where each letter is a dot and the chords sit in brackets at their letter, `[Dm:2]······· [F:1][G:1]····`. Paste the line of words underneath and **File → Tidy chords above words** fills them in, each chord on its syllable. Handy when you have the chords and their places, and the words are in another document.

---

## Key changes

Some songs move up partway through ("Folsom Prison Blues" goes from G up to A for its last verses). Write the new key on a line of its own where it changes:

```
[D7x2]…and I hang my head and [G]cry
[E7]
{key: A}
[[Verse 3]]
[Ax3]…
```

- The sheet shows a small **Key change: A** mark there, and karaoke says it as it comes.
- **Learn** counts the chords after it in the new key, so verse 3 in A is still verse 1, up a tone: one pattern to learn, not two. The learn sheet's key reads "G major, then A major (Verse 3)".
- Changing the key you play in, or rewriting the song in another key, moves it too.
- The song's own key (on the Info tab) is the key it starts in.
- If you haven't written one, Learn spots a change that comes and stays, and says where to write it (on the learn sheet and in Chord patterns). It also points out the chord that leads into the new key, usually its five (E7 into A).

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

## Learning a song

The **Learn** tab is for getting a song into your head and your fingers, so you can play it without the sheet:

- **From memory:** karaoke with the chords fading. *First time only* shows each part's chords the first time it comes and a `?` after that; *As numbers only* shows I, IV, V…; *None* hides them all. Click a `?` to see the chord: the ones you needed go in your trouble spots. Press **⚑ Trouble here** (or T) when a line trips you up.
- **Next chord?:** the song's changes one at a time, with the words either side: you're playing C, which chord comes next? Four choices, and ▶ under each to hear it before you choose. After you answer you hear the real change. The ones you miss go in your trouble spots.
- **Trouble:** your trouble spots, with how often and where they came from. **Loop it** plays that line round and round, slower to start and a little faster each time; **Got it ✓** takes it off. They're kept in the song's learn folder (`trouble-spots.json`) and follow the words if you edit the song.
- **Changes…:** every chord change in the song, the hardest first, with what each finger does (stays, slides, moves, goes down, lifts) and **Practise** or **One minute** for that change in Free Practice. **Shapes** runs the shapes drill with the song's chords.
- **Pick** (its own tab): fingerpick the song instead of strumming. Choose a **Pattern** (saved with the song): **1 One string a beat** (g C E A), **2 Up, twice a bar**, **3 Up and back** (g C E A E C), **4 Pinch and roll** (g+A C E C) or **5 Alternating thumb** (Travis). On a ukulele each finger has its own string: thumb g, index C, middle E, ring A. **Play** and **Karaoke** play it picked, with each string shown in the strip as it comes. Marked strums ([C↓], {stop}) stay strummed. **How it works** explains it all.
- **Picking to sing along to:** the pattern is the accompaniment; the tune is your voice's job, as when you strum. Set **Info → First note** (the first note you sing, e.g. E) and it's sounded with the first click of the count-in, in the key you're playing in; **Pick → First note** plays it any time.
- **Pick → Play the tune:** with the song's tune written in (see The tune), it's played quietly over the chords while you learn. **Pattern → Chord melody** turns it into a picked solo: the tune on the top strings from the chord you're holding, a chord note under it on beat 1.
- **Change here / Write out ▾ → This line** (Pick): change the pattern from the cursor on (a `{pick}` line: see Picking patterns), or turn just the line at the cursor into tab you can change note by note.
- **Pick → Write out ▾ → The whole song:** makes a **new song** in your library with the picking written out as tab (each line in a `` ```tab 4/4 `` block, the chords over the bars and the words under them), so you can change any note, add a fill or rework a bar. Choose its name, the pattern, the key (when you're playing in another key) and whether the chord names and words go with the tab. The original song isn't changed, and the two stay separate from then on.
- **Pick sheet** (Pick, or Export → To learn from): the song laid out like a fingerstyle songbook: the pattern counted out, the chord boxes, then each line as tab with the chord over the bar where it starts and the words underneath. A PDF and a web page in the song's learn folder.
- **Pick → Tab in steps…:** for a song with its own tab (which is always played as written), learn it in steps: **1** the chords under the tab, strummed; **2** the same picking with every string open, so your picking hand learns it on its own; **3** both, slowly; **4** both, in time. When the tab sits on chord shapes, each bar is shown as the chord to hold and the strings in the order they're picked ("Hold C, pick g-C-E-A"; g+A means together). Tab that's a tune, picked note by note, is left as a tune, and step 1 plays it slowly. Playing from memory, the tab fades like the chords: the first time as written, then as shapes and patterns, then nothing.
- **Numbers:** the chords on the sheet as numbers in the key. I is home; IV and V are away and back. A song in numbers is the same in every key.
- **Another key → Play it:** play from memory in another key, with the chords as numbers and what each number is in that key ("I = G · IV = C · V7 = D7"). If you can, you know the song, not just the shapes.
- **Circle:** the circle of fifths, with the song's chords lit, the key's family shaded (home, its neighbours either side, and their relative minors inside), and arrows for how the song moves. Most songs live in that family, and most of their changes are one step round the circle: one step anticlockwise into home (V → I) is the strongest pull in music.
- **Learn sheet:** one page to learn the song from, as a PDF and a web page in the song's **learn** folder (also from Export → More formats → Learn sheet, and Library → Export every song… for them all): the song's parts in order, a chord map (each part once, bar by bar, a row per line with its first words, the numbers, the familiar patterns shaded and named where they happen, and a note when a part is only the start of another), the chords, the changes to practise, the patterns in it, the circle of fifths, and your trouble spots.

---

## On a phone or tablet

The web player (ukemusic in the browser) keeps its own songs on the device, and you can write and change them there: **New song**, or **Edit** on a song. The buttons over the editor type the brackets a touch keyboard hides: `[ ]` for a chord, `[[ ]]` for a heading, `{ }` for a strum, `|` for a bar line, and ♪ for a tune line. Changes are saved as you type.

- **Add songs from files…** brings in song files, ChordPro files, chord sheets, a zipped songs folder, or a backup.
- **Back up all songs** saves every song in one file. Keep it somewhere safe.
- In the desktop app, **Phone and tablet…** (in the library) sends your songs to the web player, and brings back the ones you wrote or changed there.

## Tips

- **Write → Guess the key** works out the likeliest key from the chords, with its reasons. It's only needed for spelling chords when you change key (F♯ or G♭).
- **This song → Make this the song's key…** rewrites the chords in the text itself after you've tried a key with − and +.
- Warnings (an unknown chord, an unknown strum name, tab that doesn't line up) are shown in the bar below the editor, with their line numbers.
- The song file is plain text, so it can also be edited in any text editor.
