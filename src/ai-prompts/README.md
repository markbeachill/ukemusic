# The AI prompts

The text that ukemusic gives you to paste into an AI chat (Claude, ChatGPT, Gemini…). Edit these files to change a prompt: there's one copy of each, and everything uses it.

| File | What it's for | Where it's used |
|---|---|---|
| `ai-convert.txt` | Turns a chord sheet into ukemusic's song format, nothing more | Desktop: File → Paste from website → **Copy AI prompt**. Web player: Edit → Help from an AI chat. Website: Add songs from the web |
| `ai-practice.txt` | Gets a song ready to practise, play along with and learn. It starts with a **menu**: the AI asks which parts you want (format, timing, parts, chords, strums, what to check by ear, practice notes), or all of them, before it does anything | Desktop: **Copy AI prompt: ready to practise**. Web player and website: the same places |

Plain text, so any editor will do (Notepad is fine). Keep these lines in `ai-practice.txt` as they are, because the app fills them in with the song that's open:

- `- Song and artist:`
- `- Instrument: ukulele (GCEA)` (the start of that line)
- `[paste the chord sheet, or the song from ukemusic, here]`

After changing a prompt, run `npm test`, then `npm run build:web` to see it in the web player and on the website. `docs/song-prep-prompt.md` explains the practice prompt and what to do with the answer. The code that reads these files is `src/ai-prompt.js`.
