// Rewrite a song in another key: the chords in the text itself change, not just the view.
//
// Used by "Make this the song's key": you try a key with − / + (or pick a saved version),
// like it, and make it the song's own key. The text is rewritten, the saved versions are
// moved so they still sound the same, and the old key becomes a saved version.

const { transposeName, parseVersions, formatVersions, versionFromShift, songChords } = require('./versions');
const { transposeTab } = require('./tab');
const { isChordName } = require('./chord-names');
const { transposeKey, parseKey } = require('./keys');
const { parseChordToken, parseGridLine, splitRepeat } = require('./song-syntax');
const { melodyLine, transposeMelodyLine } = require('./melody');
const { noteName } = require('./picking');

/**
 * The song text with every [chord] and every ```tab block moved by `semitones`.
 *   key: the song's key (from parseKey/detectKey) so chords are spelled for the new key
 *   instrument: for the tab
 * [[Labels]], [] and other brackets, {strum patterns} and words are left as they are.
 */
function rewriteText(text, semitones, { key = null, instrument = 'soprano' } = {}) {
  if (!semitones) return String(text);
  const lines = String(text).split('\n');
  const out = [];
  let tab = null;
  for (const line of lines) {
    if (tab) {
      if (/^```\s*$/.test(line.trim())) {
        out.push(...transposeTab(tab.join('\n'), semitones, { instrument }).text.split('\n'), line);
        tab = null;
      } else {
        tab.push(line);
      }
      continue;
    }
    if (/^```tab(?:\s+\d+\s*\/\s*\d+)?\s*$/i.test(line.trim())) {
      out.push(line);
      tab = [];
      continue;
    }
    // 4.49: a key change moves too
    const kc = line.match(/^(\s*\{\s*key\s*:\s*)([^}]+?)(\s*\}\s*)$/i);
    if (kc) {
      const keys = require('./keys');
      const k = keys.parseKey(kc[2]);
      out.push(k ? `${kc[1]}${keys.transposeKey(k, semitones).name}${kc[3]}` : line);
      continue;
    }
    // 4.44: the tune moves too
    if (melodyLine(line)) {
      out.push(transposeMelodyLine(line, semitones, (n) => transposeName(n, semitones, key)));
      continue;
    }
    // A bar line, "[[Intro]] | C | G7 C | % | (x2)": the chords aren't in brackets
    const body = splitRepeat(line).text.replace(/^\s*\[\[.*?\]\][:.;,\-–—]*\s*/, '');
    if (parseGridLine(body)) {
      const start = line.indexOf(body.trim());
      const end = start + body.trim().length;
      const moved = line.slice(start, end).replace(/[^\s|:%]+/g, (tok) => (isChordName(tok) ? transposeName(tok, semitones, key) : tok));
      out.push(line.slice(0, start) + moved + line.slice(end));
      continue;
    }
    out.push(line.replace(/(?<!\[)\[([^[\]\n]+)\](?!\])/g, (whole, inner) => {
      const name = inner.trim();
      if (isChordName(name)) return `[${transposeName(name, semitones, key)}]`;
      const token = parseChordToken(inner);           // [C x3] [C↓] [Gs4] [Bm7.Am7]
      if (!token) return whole;
      if (token.pair) return `[${token.pair.map((p) => transposeName(p.name, semitones, key) + (p.marks || '')).join('.')}]`;
      if (!token.name || token.noChord) return whole;
      return whole.replace(token.written || token.name, transposeName(token.name, semitones, key));
    }));
  }
  if (tab) out.push(...tab); // an unclosed tab block stays as it was
  return out.join('\n');
}

/**
 * Song settings after rewriting by `semitones`: saved versions move so each still sounds the
 * same, the old original becomes a version, the shift resets to 0 and a set key moves too.
 *   settings: song.ini settings; chords: the song's chords before the change (for naming the
 *   old key's version); key: the song's key before the change.
 */
function rekeySettings(settings, semitones, { chords = [], key = null } = {}) {
  const next = JSON.parse(JSON.stringify(settings || {}));
  const old = parseVersions(next.versions?.list || '');
  const moved = [];
  for (const v of old) {
    const s = v.semitones - semitones;
    if (s === 0 || s < -11 || s > 11) continue;
    const newChords = chords.map((c) => transposeName(c, semitones, key));
    const newKey = key ? transposeKey(key, semitones) : null;
    moved.push(versionFromShift(s, newChords, newKey));
  }
  // The key it used to be in, as a version of the new one
  const back = -semitones;
  if (back >= -11 && back <= 11 && back !== 0 && !moved.some((v) => v.semitones === back)) {
    const newChords = chords.map((c) => transposeName(c, semitones, key));
    moved.push(versionFromShift(back, newChords, key ? transposeKey(key, semitones) : null));
  }
  next.versions = { list: formatVersions(moved.sort((a, b) => a.semitones - b.semitones)) };
  next.song = { ...(next.song || {}), transpose: 0 };
  const setKey = parseKey(next.song.key);
  if (setKey) next.song.key = transposeKey(setKey, semitones).name;
  // 4.44: the first note to sing moves with it
  if (next.song.first_note && noteName(next.song.first_note, semitones)) next.song.first_note = transposeName(String(next.song.first_note).replace(/\d$/, ''), semitones, key);
  return next;
}

module.exports = { rewriteText, rekeySettings, songChords };
