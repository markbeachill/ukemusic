// The prompts for an AI chat (Claude, ChatGPT, Gemini…), one copy each, used by the desktop app
// (Paste from website), the web player (Edit) and the website's "Bring your songs" page:
//   AI_PROMPT           turns a difficult chord sheet into ukemusic's format, nothing more
//   AI_PRACTICE_PROMPT  (4.56) gets a song ready to practise, play along with and learn: the
//                       timing, the parts, strums, what to check by ear (docs/song-prep-prompt.md)
//   AI_CHAT_URL         where "Open an AI chat" goes
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

// (one line of the prompt per line here; it has backticks in it, so it isn't a template string)
const AI_PRACTICE_PROMPT = [
  "I'm getting a song ready for ukemusic, an app that plays chord sheets",
  "back, shows them as karaoke and helps me learn them. Help me make the",
  "sheet below right for practice, playback and learning.",
  "",
  "About me and the song (fill in what you know):",
  "- Song and artist:",
  "- Instrument: ukulele (GCEA)            [or baritone ukulele, or guitar]",
  "- My level: beginner                    [or improver, or confident]",
  "- Key I want to play in: as the sheet   [or a key that suits my voice]",
  "- What my teacher or I have decided already (strums, simpler chords…):",
  "- Recording I'm learning from (a link, or \"the original\"):",
  "",
  "THE WORDS",
  "- Use only the words in the sheet I paste. Don't add, change, fix or",
  "  complete any words, and don't fill in words from memory or look them",
  "  up. If a line is missing or unclear, leave it as it is and tell me.",
  "- You may use what you know about the song's music (its chords, key,",
  "  form, tempo and feel) to check the sheet, but tell me what you",
  "  changed and why (Part 3).",
  "",
  "THE FORMAT (ukemusic)",
  "- The whole song goes between two lines: --START MUSIC-- and",
  "  --END MUSIC--",
  "- Chords go in square brackets just before the syllable where they",
  "  change: [C]Oh my [G7]darling",
  "- Sections: a heading on its own line: [[Intro]], [[Verse 1]],",
  "  [[Verse 2]], [[Chorus]], [[Bridge]], [[Outro]]. Leave a blank line",
  "  between parts.",
  "- How long each chord lasts:",
  "    a plain chord is one bar: [C]",
  "    several bars: [C x3]  (or [C][] for two, with [] showing where the",
  "      next bar starts in the words)",
  "    part of a bar, in beats: [Em:2]  (a plain chord after it fills the",
  "      rest of the bar)",
  "    no chord: [N.C.]   one strum left to ring: [C↓]   {stop} before a",
  "      chord makes it one strum, left to ring",
  "- Lines with no words (intro, solo, instrumental, outro): a line of",
  "  bars, one chord a bar: [[Intro]] | Am | F | C | G |",
  "  Two chords sharing a bar: | G7 C |   repeat the bar before: %",
  "- A line played again: (x2) at the end of the line.",
  "- Strum pattern, on its own line, from there on: {D-DU-UDU}",
  "  D down, U up, X chuck (muted), - a gap, > after a strum: harder.",
  "  The pattern fills one bar: 8 letters in 4/4 are eighths",
  "  (1 & 2 & 3 & 4 &), 12 letters are triplets (1 & a 2 & a…).",
  "  The time goes in front if it's not 4/4: {3/4 D-DUDU}; a swing feel:",
  "  {swing D-DU-UDU}.",
  "  Named strums, to switch between: {Verse: D-DU-UDU} the first time,",
  "  then just {Verse}; {Chorus: D-D-DUDU} … {Chorus}. A name can go at",
  "  the start of a line or just before a chord in the middle of one.",
  "- Key change partway through: {key: A} on its own line where it changes.",
  "- Tab, only if the sheet has it: a block starting with a line of",
  "  ```tab and ending with ```.",
  "",
  "WHAT TO DO",
  "1. Timing first, so playback follows the song. Give every chord its",
  "   length in bars or beats, so each line adds up to whole bars and the",
  "   chords change where they do on the recording. Write out intros,",
  "   instrumentals and endings as lines of bars, with the right number of",
  "   bars.",
  "2. Form. Name the parts consistently: the same name for the same part",
  "   (Verse 1, Verse 2…, Chorus), and a chorus written the same way each",
  "   time if it's played the same (same words, chords and line breaks), so",
  "   the app can recognise it as a repeat.",
  "3. Chords. Check them against the song as you know it. If the sheet is",
  "   wrong, simplified or in another key, say so in Part 3. Keep the",
  "   sheet's chords unless I asked you to correct them or the error is",
  "   certain; when you change one, say which and why. Use chord names the",
  "   app knows (C, Am, G7, Fmaj7, Bb, F#m, Csus4, C/G…).",
  "4. Strums. Suggest a pattern for my level that fits the song's feel, and",
  "   a different one per section only where it really helps. Use named",
  "   strums when they switch, and {stop} or [C↓] for endings and",
  "   stabs. Keep anything my teacher or I have already decided.",
  "5. Keep my words and line breaks exactly as they are. Shorten nothing",
  "   unless I ask.",
  "",
  "THE ANSWER, in four parts",
  "Part 1: the song, in one code block, between --START MUSIC-- and",
  "  --END MUSIC--.",
  "Part 2: the song's details, as a short list: key, time signature,",
  "  tempo (beats a minute, as on the recording), capo (if any), the first",
  "  note sung (e.g. E), and the strum(s) with a one-line description.",
  "Part 3: what to check by ear. Everything you changed, guessed or weren't",
  "  sure of (a chord's timing, a bar count, a chord you think the sheet",
  "  got wrong), each with where it is (part and line) and how sure you",
  "  are.",
  "Part 4: practice notes, short: the two or three hardest chord changes",
  "  and how to practise them, any easier chord shapes for a beginner, a",
  "  slower tempo to start at, and which part to learn first.",
  "",
  "Here is the sheet:",
  "[paste the chord sheet, or the song from ukemusic, here]"
].join('\n');

const AI_CHAT_URL = 'https://claude.ai/new';

/** The practice prompt with what's known filled in: { title, artist, instrument, text } */
function practicePrompt({ title = '', artist = '', instrument = '', text = '' } = {}) {
  let out = AI_PRACTICE_PROMPT;
  const who = [title, artist].filter(Boolean).join(', ');
  if (who) out = out.replace('- Song and artist:', `- Song and artist: ${who}`);
  if (instrument) out = out.replace(/- Instrument: ukulele \(GCEA\)[^\n]*/, `- Instrument: ${instrument}`);
  if (String(text).trim()) out = out.replace('[paste the chord sheet, or the song from ukemusic, here]', String(text).trim());
  return out;
}

module.exports = { AI_PROMPT, AI_PRACTICE_PROMPT, AI_CHAT_URL, practicePrompt };
