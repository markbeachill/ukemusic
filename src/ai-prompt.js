// The prompt for turning a chord sheet into a ukemusic song with an AI chat (Claude, ChatGPT,
// Gemini…). One copy, used by the website's "Bring your songs" page (web/pages.js).
const AI_PROMPT = `Convert the chord sheet below into ukemusic's song format.
Work only from the sheet I give you. Don't add, change or invent any
words, and don't look the song up. If something is unclear, keep it
as written and list it at the end.

Format rules:
- Put the whole song between these two lines:
  --START MUSIC--
  --END MUSIC--
- Chords go in square brackets just before the syllable where they
  change: [C]Oh my [G7]darling
- Section headings on their own line: [[Intro]], [[Verse 1]],
  [[Chorus]], [[Bridge]], [[Outro]]
- If the sheet gives a strum, put it on its own line in braces before
  the song, using D (down), U (up) and - (a gap): {D-DU-UDU}.
  For 3/4 write {3/4 D-DUDU}. If no strum is given, leave it out.
- A chord lasts one bar unless the sheet says otherwise. A chord for
  part of a bar gives its beats: [Em:2]. Several bars: [C x3].
- Lines with no words (an intro, a solo): a line of bars, one chord
  per bar: [[Intro]] | C | G | Am | F |
  Two chords sharing a bar go in the same bar: | C G |
- A line played twice: add (x2) at the end of the line.
- One strum left to ring: [C↓] (or [Cv]). No chord: [N.C.]
- Keep the words exactly as they are, line by line, with a blank line
  between sections.

After the song, list anything you weren't sure of (a chord's timing,
a missing strum, a word you couldn't read) so I can check it.

Here is the chord sheet:
[paste the chord sheet here]`;

module.exports = { AI_PROMPT };
