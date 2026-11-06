// The prompts for an AI chat (Claude, ChatGPT, Gemini…), one copy each, used by the desktop app
// (Paste from website), the web player (Edit) and the website's "Bring your songs" page:
//   AI_PROMPT           turns a difficult chord sheet into ukemusic's format, nothing more
//   AI_PRACTICE_PROMPT  (4.56) gets a song ready to practise, play along with and learn: the
//                       timing, the parts, strums, what to check by ear (docs/song-prep-prompt.md);
//                       4.64: it starts with a menu, so you choose which of those the AI does
//   AI_CHAT_URL         where "Open an AI chat" goes
// 4.64: the prompts themselves are plain text files in src/ai-prompts/ (one copy each, easy to
// edit); the web player gets them from web/entry.js, which puts them in its small file system
const fs = require('fs');
const path = require('path');
const read = (name) => String(fs.readFileSync(path.join(__dirname, 'ai-prompts', name), 'utf8')).replace(/\r\n?/g, '\n').replace(/\n+$/, '');
const AI_PROMPT = read('ai-convert.txt');
const AI_PRACTICE_PROMPT = read('ai-practice.txt');

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
