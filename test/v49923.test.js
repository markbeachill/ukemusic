// 4.99.23: the "ready to practise" prompt says what each change rests on: the AI can't hear the
// recording, keeps the sheet's timing unless it's sure, marks an estimated tempo as one, and takes out
// a chord summary or second ending at the end of a sheet (the app would play it)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ai = require('../src/ai-prompt');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const P = ai.AI_PRACTICE_PROMPT;
const flat = P.replace(/\s+/g, ' ');

assert.ok(flat.includes("You can't hear the recording, so don't call a timing or a tempo \"as on the recording\" unless you're sure of it."));
assert.ok(flat.includes('Say where each change comes from: the sheet itself, what you know of the song, or a guess.'));
assert.ok(flat.includes("Keep the sheet's lengths and where its chords fall unless you're confident they're wrong"));
assert.ok(flat.includes('a chord summary or a second version of the ending at the end of the sheet would be played too'));
assert.ok(flat.includes("saying if it's your estimate; keep it apart from the slower tempo to practise at"));
assert.ok(flat.includes('what it rests on (the sheet, what you know of the song, or a guess)'));
// the menu, the words rule and what the apps fill in are as they were
for (const item of ['1. Format', '2. Timing', '3. Parts', '4. Chords', '5. Strums', '6. Check by ear', '7. Practice notes', 'A. All of them']) assert.ok(P.includes(item), item);
assert.match(P, /Don't add, change, fix or\s+complete any words/);
const filled = ai.practicePrompt({ title: 'Danny Boy', instrument: 'guitar (EADGBE)', text: '[C]x' });
assert.ok(filled.includes('- Song and artist: Danny Boy') && filled.includes('- Instrument: guitar (EADGBE)') && filled.endsWith('[C]x'));
// lines stay short enough to read in a chat box
assert.ok(P.split('\n').every((l) => l.length <= 74), 'prompt lines under 75 characters');
// the doc says so too
const doc = read('docs/song-prep-prompt.md');
assert.ok(doc.includes("**The AI can't hear the recording.**"));
assert.ok(doc.includes("takes out a chord summary or second ending that would be played"));
console.log('v4.99.23: 8 checks passed');
