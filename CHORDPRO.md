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

And it reads two things from other songbooks that standard ChordPro doesn't have: **strum boxes** (`{start_of_strum}` … `{end_of_strum}`) and **custom sections** (`{start_of_x_intro}` and the like).

A song saved as ChordPro and brought back in comes back the same, apart from bold, italic and underline.
