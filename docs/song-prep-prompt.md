# A prompt for getting a song into shape

For a chord sheet from a website (or a song already in ukemusic) that you want to practise, play along to and learn from, not just read. Copy it into an AI chat (Claude, ChatGPT, Gemini…), fill in the first few lines, paste your sheet at the end, and choose from the menu what you want done.

It's in the apps too: **Copy AI prompt: ready to practise** in the desktop app's File → Paste from website (it fills in the song that's open, or the sheet pasted there), and **Edit → Help from an AI chat** in the web player. The text is kept in `src/ai-prompts/ai-practice.txt` (below).

It goes further than **Copy AI prompt** in File → Paste from website, which only changes the sheet into ukemusic's format. This one also sorts out the timing so playback is right, gives parts consistent names so Learn and the Stage copy work well, suggests strums, and tells you what to check by ear.

## How to use it

1. Copy the prompt (the apps fill in the song for you) and fill in the **About me and the song** lines.
2. Paste the chord sheet at the end:
   - from a website, paste it as it is, with chords above the words or in them;
   - for a song already in ukemusic, paste its text (the editor, Ctrl+A, Ctrl+C) and, if you have them, its key, tempo and time from the Info tab.
3. The AI shows its menu: answer with the numbers you want (`1 2 5`) or `A` for all.
4. Read the AI's answer:
   - **The song:** for a new song, paste it into **File → Paste from website**. For a song you already have, select all in the editor and paste over it; the old version is kept in the song's history.
   - **The details:** type these into the **Info** tab (key, time, tempo, first note) and **This song** (capo, strum).
   - **Check by ear and the practice notes (6 and 7):** paste them into the **Notes** tab, so they're there when you practise.
5. Press **Play** and listen with the recording. Fix anything from **Check by ear** that sounds wrong.

## The prompt

The prompt is kept in one place, **`src/ai-prompts/ai-practice.txt`**, a plain text file: open it to read it or change it (see `src/ai-prompts/README.md`). The apps and the website's Bring your songs page all use that file, so a change there reaches everything.

**It starts with a menu.** The AI shows it and waits; you answer with the numbers you want, or **A** for all of them. You don't have to do everything at once: tidy the format and the timing first, say, then come back for strums and practice notes.

| | What the AI does |
|---|---|
| 1. Format | The song in ukemusic's format, your words and line breaks kept exactly (always done: the rest need it) |
| 2. Timing | Every chord's length, so playback follows the recording; intros and endings as lines of bars |
| 3. Parts | The same name for the same part each time, and a repeated chorus written the same way |
| 4. Chords | Checked against the song as it knows it; any change named and explained |
| 5. Strums | Patterns for your level, named when they switch |
| 6. Check by ear | What it changed, guessed or wasn't sure of, with where and how sure |
| 7. Practice notes | The hardest changes, easier shapes, a tempo to start at, which part first |
| A. All of them | Everything above |

## Why each part is there

| Asked for | So that in ukemusic… |
|---|---|
| Every chord's length (`[C x2]`, `[Em:2]`), whole bars | **Play** and **Karaoke** stay with the recording; the Learn sheet's chord map is right |
| Intros and solos as lines of bars | They're played, and light up bar by bar in karaoke |
| The same name and the same text for a repeated chorus | **Chorus once** on Stage copies and the Session screen, **Loop the section**, Learn's chord map (one pattern to learn, not several) |
| Named strums (`{Verse}`, `{Chorus}`) | The sheet shows a strum key; playback changes pattern where you do |
| `{key: A}` | Learn counts the new key as the same pattern moved up |
| Key, time, tempo, first note (the details) | Playback at the right speed and in the right time; the first note sounds with the count-in |
| What to check by ear (6) | Website sheets are often wrong or simplified. One sheet for Higher Ground had the wrong chords throughout, and the timing was only right once each chord had its beats (`[Dm:2] [F:1] [G:1]`) |
| Practice notes (7) | On the Notes tab, beside the song; **Learn → Changes…** and **Trouble** then help with the hard changes |

## Good to know

- **The words stay yours.** The prompt asks for no words to be added or recalled, which keeps the AI to tidying what you gave it, and keeps copyrighted words you haven't got out of the song.
- **One song at a time** works best, with the recording to hand to check against.
- **To change one thing later** (a new strum from your teacher, say), paste the song and ask for that change alone, with the same rules.
- **A tune**, for **Pick → Play the tune**: ask only for a song you know well, and check every note by ear. The format is in the song guide (The tune).
