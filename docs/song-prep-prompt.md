# A prompt for getting a song into shape

For a chord sheet from a website (or a song already in ukemusic) that you want to practise, play along to and learn from, not just read. Copy everything in the box into an AI chat (Claude, ChatGPT, Gemini…), fill in the first few lines, and paste your sheet at the end.

It's in the apps too: **Copy AI prompt: ready to practise** in the desktop app's File → Paste from website (it fills in the song that's open, or the sheet pasted there), and **Edit → Help from an AI chat** in the web player. The text is kept in `src/ai-prompt.js` (`AI_PRACTICE_PROMPT`); a test checks this copy matches.

It goes further than **Copy AI prompt** in File → Paste from website, which only changes the sheet into ukemusic's format. This one also sorts out the timing so playback is right, gives parts consistent names so Learn and the Stage copy work well, suggests strums, and tells you what to check by ear.

## How to use it

1. Copy the prompt below and fill in the **About me and the song** lines.
2. Paste the chord sheet at the end:
   - from a website, paste it as it is, with chords above the words or in them;
   - for a song already in ukemusic, paste its text (the editor, Ctrl+A, Ctrl+C) and, if you have them, its key, tempo and time from the Info tab.
3. Read the AI's answer:
   - **Part 1, the song:** for a new song, paste it into **File → Paste from website**. For a song you already have, select all in the editor and paste over it; the old version is kept in the song's history.
   - **Part 2, the details:** type these into the **Info** tab (key, time, tempo, first note) and **This song** (capo, strum).
   - **Parts 3 and 4, the checks and the practice notes:** paste them into the **Notes** tab, so they're there when you practise.
4. Press **Play** and listen with the recording. Fix anything in **Part 3** that sounds wrong.

## The prompt

```
I'm getting a song ready for ukemusic, an app that plays chord sheets
back, shows them as karaoke and helps me learn them. Help me make the
sheet below right for practice, playback and learning.

About me and the song (fill in what you know):
- Song and artist:
- Instrument: ukulele (GCEA)            [or baritone ukulele, or guitar]
- My level: beginner                    [or improver, or confident]
- Key I want to play in: as the sheet   [or a key that suits my voice]
- What my teacher or I have decided already (strums, simpler chords…):
- Recording I'm learning from (a link, or "the original"):

THE WORDS
- Use only the words in the sheet I paste. Don't add, change, fix or
  complete any words, and don't fill in words from memory or look them
  up. If a line is missing or unclear, leave it as it is and tell me.
- You may use what you know about the song's music (its chords, key,
  form, tempo and feel) to check the sheet, but tell me what you
  changed and why (Part 3).

THE FORMAT (ukemusic)
- The whole song goes between two lines: --START MUSIC-- and
  --END MUSIC--
- Chords go in square brackets just before the syllable where they
  change: [C]Oh my [G7]darling
- Sections: a heading on its own line: [[Intro]], [[Verse 1]],
  [[Verse 2]], [[Chorus]], [[Bridge]], [[Outro]]. Leave a blank line
  between parts.
- How long each chord lasts:
    a plain chord is one bar: [C]
    several bars: [C x3]  (or [C][] for two, with [] showing where the
      next bar starts in the words)
    part of a bar, in beats: [Em:2]  (a plain chord after it fills the
      rest of the bar)
    no chord: [N.C.]   one strum left to ring: [C↓]   {stop} before a
      chord makes it one strum, left to ring
- Lines with no words (intro, solo, instrumental, outro): a line of
  bars, one chord a bar: [[Intro]] | Am | F | C | G |
  Two chords sharing a bar: | G7 C |   repeat the bar before: %
- A line played again: (x2) at the end of the line.
- Strum pattern, on its own line, from there on: {D-DU-UDU}
  D down, U up, X chuck (muted), - a gap, > after a strum: harder.
  The pattern fills one bar: 8 letters in 4/4 are eighths
  (1 & 2 & 3 & 4 &), 12 letters are triplets (1 & a 2 & a…).
  The time goes in front if it's not 4/4: {3/4 D-DUDU}; a swing feel:
  {swing D-DU-UDU}.
  Named strums, to switch between: {Verse: D-DU-UDU} the first time,
  then just {Verse}; {Chorus: D-D-DUDU} … {Chorus}. A name can go at
  the start of a line or just before a chord in the middle of one.
- Key change partway through: {key: A} on its own line where it changes.
- Tab, only if the sheet has it: a block starting with a line of
  ```tab and ending with ```.

WHAT TO DO
1. Timing first, so playback follows the song. Give every chord its
   length in bars or beats, so each line adds up to whole bars and the
   chords change where they do on the recording. Write out intros,
   instrumentals and endings as lines of bars, with the right number of
   bars.
2. Form. Name the parts consistently: the same name for the same part
   (Verse 1, Verse 2…, Chorus), and a chorus written the same way each
   time if it's played the same (same words, chords and line breaks), so
   the app can recognise it as a repeat.
3. Chords. Check them against the song as you know it. If the sheet is
   wrong, simplified or in another key, say so in Part 3. Keep the
   sheet's chords unless I asked you to correct them or the error is
   certain; when you change one, say which and why. Use chord names the
   app knows (C, Am, G7, Fmaj7, Bb, F#m, Csus4, C/G…).
4. Strums. Suggest a pattern for my level that fits the song's feel, and
   a different one per section only where it really helps. Use named
   strums when they switch, and {stop} or [C↓] for endings and
   stabs. Keep anything my teacher or I have already decided.
5. Keep my words and line breaks exactly as they are. Shorten nothing
   unless I ask.

THE ANSWER, in four parts
Part 1: the song, in one code block, between --START MUSIC-- and
  --END MUSIC--.
Part 2: the song's details, as a short list: key, time signature,
  tempo (beats a minute, as on the recording), capo (if any), the first
  note sung (e.g. E), and the strum(s) with a one-line description.
Part 3: what to check by ear. Everything you changed, guessed or weren't
  sure of (a chord's timing, a bar count, a chord you think the sheet
  got wrong), each with where it is (part and line) and how sure you
  are.
Part 4: practice notes, short: the two or three hardest chord changes
  and how to practise them, any easier chord shapes for a beginner, a
  slower tempo to start at, and which part to learn first.

Here is the sheet:
[paste the chord sheet, or the song from ukemusic, here]
```

## Why each part is there

| Asked for | So that in ukemusic… |
|---|---|
| Every chord's length (`[C x2]`, `[Em:2]`), whole bars | **Play** and **Karaoke** stay with the recording; the Learn sheet's chord map is right |
| Intros and solos as lines of bars | They're played, and light up bar by bar in karaoke |
| The same name and the same text for a repeated chorus | **Chorus once** on Stage copies and the Session screen, **Loop the section**, Learn's chord map (one pattern to learn, not several) |
| Named strums (`{Verse}`, `{Chorus}`) | The sheet shows a strum key; playback changes pattern where you do |
| `{key: A}` | Learn counts the new key as the same pattern moved up |
| Key, time, tempo, first note (Part 2) | Playback at the right speed and in the right time; the first note sounds with the count-in |
| What to check by ear (Part 3) | Website sheets are often wrong or simplified. One sheet for Higher Ground had the wrong chords throughout, and the timing was only right once each chord had its beats (`[Dm:2] [F:1] [G:1]`) |
| Practice notes (Part 4) | On the Notes tab, beside the song; **Learn → Changes…** and **Trouble** then help with the hard changes |

## Good to know

- **The words stay yours.** The prompt asks for no words to be added or recalled, which keeps the AI to tidying what you gave it, and keeps copyrighted words you haven't got out of the song.
- **One song at a time** works best, with the recording to hand to check against.
- **To change one thing later** (a new strum from your teacher, say), paste the song and ask for that change alone, with the same rules.
- **A tune**, for **Pick → Play the tune**: ask only for a song you know well, and check every note by ear. The format is in the song guide (The tune).
