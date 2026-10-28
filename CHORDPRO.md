# ukemusic and ChordPro

[ChordPro](https://www.chordpro.org) is the most widely used format for chord sheets, and most chord apps can read and write it. ukemusic's own song format looks very like it: chords go in square brackets in the words, `[C]Hello`. The differences are in the rest: sections, strums, song details and chord shapes.

This page says what ukemusic does with a ChordPro file when it brings one in, what it writes when it saves one, and what it adds to ChordPro that other apps don't know about. For ukemusic's own format, see [How to write songs](WRITING.md).

---

## Bringing ChordPro in

- **One file:** File → Import text file (`.cho`, `.chordpro`, `.chopro`, `.crd`, `.pro` or `.txt`). ukemusic spots that it's ChordPro and converts it.
- **A whole folder:** File → Library → Import ChordPro files… (or the library button). Every ChordPro file in the folder becomes a song, and each subfolder becomes a setlist of its songs. Songs already in the library are left alone. Songs brought in this way are marked "Copyrighted: for my own use", so they stay out of shared library packs.
- **Pasted:** File → Paste from website recognises ChordPro too.

Nothing in the file is thrown away. Whatever ukemusic doesn't turn into part of the song is kept on the song's **ChordPro** tab, and goes back out when the song is saved as ChordPro.

### The song's details

| ChordPro | In ukemusic |
|---|---|
| `{title}` / `{t}` | The song's name |
| `{artist}`, or `{subtitle}` / `{st}` when there's no artist | Artist |
| `{composer}`, `{lyricist}` | Written by |
| `{key}` | Key |
| `{time: 3/4}` | Time (2/4, 3/4, 4/4 or 6/8) |
| `{tempo}` | Tempo, if it's between 40 and 240 |
| `{album}`, `{year}` | Album, year |
| `{tag: folk}` | Tags |
| `{meta: spotify https://…}`, `{meta: youtube https://…}` | Links (Spotify, YouTube) |
| `{capo}` | Kept on the ChordPro tab, not made the song's capo (see below) |
| `{copyright}`, `{duration}`, `{sorttitle}`, `{arranger}`, other `{meta}` | Kept on the ChordPro tab |

**Why the capo isn't used:** a ChordPro file with `{capo: 2}` writes the shapes you play with the capo on. ukemusic writes the chords as they sound and works out the shapes from the capo. Bringing the capo in would move every chord.

### Sections

| ChordPro | In ukemusic |
|---|---|
| `{start_of_verse}` … `{end_of_verse}` (`{sov}` `{eov}`) | `[[Verse 1]]`, `[[Verse 2]]` … (numbered when the file doesn't name them) |
| `{start_of_verse: Verse 2}` | `[[Verse 2]]` |
| `{start_of_chorus}` / `{soc}`, and `{chorus}` | `[[Chorus]]` |
| `{start_of_bridge}` / `{sob}` | `[[Bridge]]` |
| `{start_of_x_intro: Intro}`, `{start_of_x_solo}`, any other `{start_of_…}` | A heading: `[[Intro]]`, `[[Solo]]` |
| `{start_of_tab}` … `{end_of_tab}` | A tab block (` ```tab ` … ` ``` `), which plays |
| `{start_of_grid}` … `{end_of_grid}` | A bar line of chords: `| C | G | % |` |
| `{comment: Anything}` / `{c}` / `{ci}` / `{highlight}` | `[[Anything]]`, a heading |
| `[*Riff 1]` at the start of a line | `[[Riff 1]]`, a label on that line |

### Strums

ChordPro has no way to write a strum pattern, so songbooks write it in a comment or draw it. ukemusic reads all of these:

| In the file | In ukemusic |
|---|---|
| `{comment: Strum D-DU-UDU}` (or `Strumming:`) | `{D-DU-UDU}` |
| `{comment: Strum Verse: D-DU-UDU}` | A named strum, `{Verse: D-DU-UDU}` |
| `{comment: Strum Verse}`, after one of those | That named strum again, `{Verse}` |
| `{comment: Stop: one strum, let it ring}` | `{stop}` |
| `{comment: Feel: swing}` (straight, light swing, swing, shuffle) | `{swing}` |
| A strum box (below) | A strum pattern |

**Strum boxes** are arrows over counts, between `{start_of_strum}` and `{end_of_strum}`. One character per count: `↓` down, `↑` up, `×` or `x` a muted chuck, a space for no strum, and `|` between bars:

```
{start_of_strum: Verse}
↓   ↓ ↑   ↑ ↓ ↑
1 & 2 & 3 & 4 &
{end_of_strum}
```

becomes `{Verse: D-DU-UDU}`. A named box is used again after each heading of that name, so `[[Verse 2]]` gets the Verse strum too. Bars that differ take turns: `D-DU | D-UU`.

### Chords

Chords in the words are the same in both formats. ukemusic also reads chord names written short (`Gs4` is Gsus4, `Dma7` is Dmaj7), and the marks many club songbooks put in the brackets. They stay as written, because they're part of ukemusic's own format:

| Written | Means |
|---|---|
| `[C↓]` or `[Cv]` | One strum, left to ring |
| `[C↓↓]`, `[C↓↑]` | Those strums, spread over the bar |
| `[x]`, `[mute↓]`, `[x↓↓]` | Muted strums: a "chk" |
| `[.]`, `[…]`, `[G…]` | Keep the chord going |
| `[Bm7.Am7]` | Two chords sharing the bar |
| `[|]`, `[/]` | A bar line |
| `[x2]` at the end of a line | Play the line twice |

### Chord shapes

| ChordPro | In ukemusic |
|---|---|
| `{define: Am base-fret 1 frets 2 0 0 0}` (also `{chord: …}`) | The song's own shape for Am, on the song's instrument |
| `{define-baritone: …}` | The same, for baritone ukulele |
| `{define-guitar: …}` | The same, for guitar |

A shape with the wrong number of strings for its instrument is left out.

### Harmony

| ChordPro | In ukemusic |
|---|---|
| `{x_voice: harmony}` … `{x_voice: lead}` | `{harmony}` … `{lead}`: the lines between are a harmony part, in italics |

### Everything else

Any other directive, and comment lines starting with `#`, are kept on the song's ChordPro tab and written back out on export.

---

## Saving as ChordPro

Export → ChordPro (or the download menu in the web player) writes the song in the key and capo shown.

| ukemusic | ChordPro written |
|---|---|
| Song details | `{title}`, `{subtitle}`, `{artist}`, `{key}`, `{time}`, `{tempo}`, `{capo}` …, then anything kept on the ChordPro tab |
| `[[Verse 1]]`, `[[Chorus]]`, `[[Bridge]]` (and Pre-chorus, Refrain, Hook) | `{start_of_verse: Verse 1}` … `{end_of_verse}` and so on |
| Any other heading: `[[Intro]]` | `{comment: Intro}` |
| A label at the start of a line: `[[Riff 1]] [C]…` | `[*Riff 1] [C]…` |
| `{D-DU-UDU}`, `{Verse: D-DU-UDU}`, `{Verse}` | `{comment: Strum D-DU-UDU}`, `{comment: Strum Verse: D-DU-UDU}`, `{comment: Strum Verse}` |
| `{stop}` on its own line | `{comment: Stop: one strum, let it ring}` |
| `{swing}`, `{straight}` … | `{comment: Feel: swing}` … |
| `{stop}[C]` in a line | `[*stop][C]` |
| `[C x3]` (three bars) | `[C][*×3]` |
| `[G:2]` (two beats) | `[G][*2 beats]` |
| `[C↓]`, `[x]`, `[Bm7.Am7]` … | As written |
| `[]` (a bar line) | `[|]` |
| `| C | G | % |` | `| [C] | [G] | % |` |
| `(x2)` at the end of a line | `(x2)` |
| ` ```tab ` blocks | `{start_of_tab}` … `{end_of_tab}` |
| ` ```tab 4/4 ` (timed by its bars) | `{x_ukemusic_tab_time: 4/4}`, then the tab section |
| The tune (`{melody}` lines), when you tick "with the tune as notation" | Also `{start_of_abc}` … `{end_of_abc}`, one block per section |
| `{pick: up and back}`, `{pick V: g C E A}`, `{pick V}` | `{x_ukemusic_pick: up and back}`, `{x_ukemusic_pick: V: g C E A}`, `{x_ukemusic_pick: V:}` |
| `{melody: E E F G …}`, `{melody abc: …}` | `{x_ukemusic_melody: E E F G …}`, `{x_ukemusic_melody_abc: …}` |
| The song's own chord shapes | `{define: …}` |
| `{harmony}` … `{lead}` | `{x_voice: harmony}` … `{x_voice: lead}` |

**What doesn't go out:** bold, italic and underline (ChordPro has no way to write them; the plain words go out), versions, notes and practice settings.

---

## ukemusic's additions to ChordPro

Everything ukemusic writes is valid ChordPro, so other apps open the files. A few things are ukemusic's own. Other apps show them in a readable way, and ukemusic reads them back exactly as they were:

| ukemusic writes | What other apps show | What ukemusic reads it as |
|---|---|---|
| `{comment: Strum D-DU-UDU}` | A comment: "Strum D-DU-UDU" | The strum pattern |
| `{comment: Stop: one strum, let it ring}` | A comment | `{stop}` |
| `{comment: Feel: swing}` | A comment | Swing from here on |
| `[*×3]` after a chord | "×3" above the words | The chord lasts three bars |
| `[*2 beats]` after a chord | "2 beats" above the words | The chord lasts two beats |
| `[*stop]` before a chord | "stop" above the words | One strum, left to ring |
| `[C↓]`, `[x]`, `[G…]`, `[Bm7.Am7]` | As written, as chord names | Songbook marks (see Chords) |
| `{x_voice: harmony}` / `{x_voice: lead}` | Nothing (`x_` directives are for apps that know them) | A harmony part |
| `{define-baritone: …}`, `{define-guitar: …}` | Usually nothing | Shapes for those instruments |
| `{x_ukemusic_pick: …}` | Nothing | The picking pattern from there on |
| `{x_ukemusic_melody: …}`, `{x_ukemusic_melody_abc: …}` | Nothing | The tune of the next line |
| `{x_ukemusic_tab_time: 4/4}` | Nothing | The next tab is timed by its bars |
| `# ukemusic: …` lines at the top | Nothing (`#` lines are comments ChordPro never shows) | Nothing: it writes them again each time |

**The note at the top.** When a song uses any of ukemusic's own `x_` directives, the file starts with a few `# ukemusic:` comment lines saying what each one means, so anyone opening the file (or the makers of another app) can see what they are. ChordPro never shows `#` lines, and ukemusic leaves them out when it reads the file back (it writes them fresh on the next export).

**The tune as notation (ABC).** ChordPro 6 can carry music notation in `{start_of_abc}` … `{end_of_abc}` sections, in ABC (the text format for folk tunes); ChordPro apps that support it draw it as a stave. ukemusic uses these both ways:

- **Saving:** tick **Export → ChordPro → with the tune as notation (ABC)** and a song with its tune written in (`{melody}` lines) also gets an ABC block at the start of each section with a tune of its own (a verse sung to verse 1's tune doesn't repeat it). It's off unless you tick it, because apps that don't draw ABC may show it as text. The ABC is in the key of the export, with the key signature; the `{x_ukemusic_melody}` lines go too, and they're what ukemusic reads back.
- **Bringing in:** an ABC tune in someone else's ChordPro file is shared out over the lines of chords after it, bar for bar (the tune's pickup with the first line). If the bars come out even, it becomes `{melody}` lines above those lines, and later verses with the same chords are sung to it. If they don't, the ABC is kept on the song's ChordPro tab and the import says so, so you can write it in by hand. Key signatures, accidentals, lengths, dotted pairs (`>` `<`), triplets and ties are read; a note tied across a bar line comes in as two notes.

**Why `x_`:** ChordPro sets aside directives starting `x_` for an app's own additions; other apps ignore the ones they don't know, so the song still opens and shows its chords and words everywhere. ChordPro has no way to write a picking pattern (it shows picking only as tab, in `{start_of_tab}` sections), so a picked song opened in another app shows as plain chords; one written out as tab (Pick → Write out) shows its tab.

And it reads two things from other songbooks that standard ChordPro doesn't have: **strum boxes** (`{start_of_strum}` … `{end_of_strum}`) and **custom sections** (`{start_of_x_intro}` and the like).

A song saved as ChordPro and brought back in comes back the same, apart from bold, italic and underline.
