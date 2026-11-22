// 4.99.24: a song for an AI chat, in one go: the "ready to practise" prompt with the song and its
// other files (song.ini, notes.txt, learn/practice-plan.txt), so the chat sees the song's tempo,
// key, notes and plan as well as the sheet. Two forms:
//   text(song)  one piece of text to paste into a chat: the prompt, the sheet, then each file
//               under its own heading (=== song.ini ===)
//   zip(song)   a zip of the song's folder (Title/Title-song.txt, song.ini, notes.txt,
//               learn/practice-plan.txt) and ai-prompt.txt, to attach to a chat or keep. It opens
//               in the web player (Add songs from files), which leaves ai-prompt.txt out.
//
//   song: { title, folder, fileName, text, settings, notes, plan, artist, instrument }
//     settings: the song's own song.ini, as read ({ song: { tempo, key… }, playback: {…} })
//
// Pure (no fs, no Buffer): the desktop app and the web player (both through src/preload.js), and the
// unit tests. The zip is
// stored (not compressed): the files are small, and any zip program or browser opens it.
const prompts = require('./ai-prompt');
const { stringifyIni } = require('./ini-utils');

const PROMPT_FILE = 'ai-prompt.txt';
const clean = (s) => String(s || '').replace(/\r\n?/g, '\n');
const safe = (s) => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();

/** The song's files, as they are in its folder: [{ name, text }] (only the ones it has) */
function files(song = {}) {
  const title = safe(song.title) || 'Song';
  const folder = safe(song.folder) || title;
  const out = [{ name: `${folder}/${safe(song.fileName) || `${title}-song.txt`}`, text: clean(song.text) }];
  const settings = song.settings && typeof song.settings === 'object' ? song.settings : {};
  if (Object.keys(settings).length) out.push({ name: `${folder}/song.ini`, text: stringifyIni(settings) });
  if (clean(song.notes).trim()) out.push({ name: `${folder}/notes.txt`, text: clean(song.notes) });
  if (clean(song.plan).trim()) out.push({ name: `${folder}/learn/practice-plan.txt`, text: clean(song.plan) });
  return out;
}

const OTHER_FILES = `THE SONG'S OTHER FILES (from ukemusic)
These come with the sheet. song.ini is the song's settings as ukemusic
has them now (tempo, key, time, capo, strum, credits); notes.txt is my
notes; learn/practice-plan.txt is how I practise it. Use them for the
song's details and the practice notes. Keep them as they are: if you
would change something in them, say what and why, after the details.`;

function promptFor(song, sheet) {
  return prompts.practicePrompt({ title: song.title || '', artist: song.artist || '', instrument: song.instrument || '', text: sheet });
}

/** One piece of text for a chat: the prompt with the sheet, then the other files */
function text(song = {}) {
  const [chart, ...rest] = files(song);
  let out = promptFor(song, chart.text.replace(/\n+$/, ''));
  if (rest.length) {
    out += `\n\n${OTHER_FILES}\n`;
    for (const f of rest) out += `\n=== ${f.name.split('/').slice(1).join('/')} ===\n${f.text.replace(/\n+$/, '')}\n`;
  }
  return out;
}

/** The prompt for the zip: the sheet is in the attached files */
function zipPrompt(song = {}) {
  const list = files(song).map((f) => `  ${f.name}`).join('\n');
  return `${promptFor(song, `(The song is in the zip file attached, in ukemusic's own song folder:\n${list}\nThe sheet is the -song.txt file.)`)}\n\n${OTHER_FILES}\n`;
}

// ── a small zip writer (stored), for the browser as well as the desktop ──
const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** entries: [{ name, text }] -> a zip file (Uint8Array), stored, UTF-8 names */
function writeStoredZip(entries, date = new Date()) {
  const enc = new TextEncoder();
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const parts = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const data = enc.encode(e.text);
    const crc = crc32(data);
    const head = (sig, extra) => {
      const b = new Uint8Array(extra);
      const v = new DataView(b.buffer);
      v.setUint32(0, sig, true);
      return { b, v };
    };
    const L = head(0x04034b50, 30 + name.length);
    L.v.setUint16(4, 20, true); L.v.setUint16(6, 0x0800, true); L.v.setUint16(8, 0, true);
    L.v.setUint16(10, time, true); L.v.setUint16(12, day, true); L.v.setUint32(14, crc, true);
    L.v.setUint32(18, data.length, true); L.v.setUint32(22, data.length, true); L.v.setUint16(26, name.length, true);
    L.b.set(name, 30);
    const C = head(0x02014b50, 46 + name.length);
    C.v.setUint16(4, 20, true); C.v.setUint16(6, 20, true); C.v.setUint16(8, 0x0800, true); C.v.setUint16(10, 0, true);
    C.v.setUint16(12, time, true); C.v.setUint16(14, day, true); C.v.setUint32(16, crc, true);
    C.v.setUint32(20, data.length, true); C.v.setUint32(24, data.length, true); C.v.setUint16(28, name.length, true);
    C.v.setUint32(42, offset, true);
    C.b.set(name, 46);
    parts.push(L.b, data);
    central.push(C.b);
    offset += L.b.length + data.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0);
  const end = new Uint8Array(22);
  const v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true); v.setUint16(8, entries.length, true); v.setUint16(10, entries.length, true);
  v.setUint32(12, size, true); v.setUint32(16, offset, true);
  const all = [...parts, ...central, end];
  const out = new Uint8Array(all.reduce((n, b) => n + b.length, 0));
  let at = 0;
  for (const b of all) { out.set(b, at); at += b.length; }
  return out;
}

/** The zip: the song's folder and ai-prompt.txt */
function zip(song = {}, date) {
  return writeStoredZip([...files(song), { name: PROMPT_FILE, text: zipPrompt(song) }], date);
}

/** The zip's file name: "Amazing Grace for an AI chat.zip" */
const zipName = (song = {}) => `${safe(song.title) || 'Song'} for an AI chat.zip`;

module.exports = { files, text, zip, zipName, zipPrompt, writeStoredZip, crc32, PROMPT_FILE };
