// The tune (4.44): a song can carry its melody, a line at a time, so ukemusic can play it while
// you learn to sing the song, and make a picked solo (chord melody) from it.
//
//   {melody: E E F G | G F E D | C C D E | E. D/2 D2}
//   [C]Joyful, joyful, [G7]we adore Thee, [C]God of glory, [G7]Lord of love;
//
// A {melody} line belongs to the line of words (and chords) after it. Two ways to write it:
//   * note names (the usual): E, F#, Bb; one count each (a beat; an eighth in 6/8). A number
//     after a note is its length in counts (E2, E3), /2 halves it (E/2), a dot adds half (E.).
//     r (or -) is a rest. Each note is the nearest one to the note before (so the tune moves
//     by step without thinking about octaves); ' puts it an octave higher, , an octave lower.
//     | marks the bars (to read it more easily; a short first bar is a pickup: the notes before
//     the line's first chord, sung on "A-" in "A-[C]mazing").
//   * ABC, the standard text format for folk tunes: {melody abc: E E F G | G F E D |}. ABC
//     notes are absolute (C is middle C, c the octave above), lengths count the default eighth
//     note (E2 is a quarter), z is a rest.
// The tune is written in the song's written key; it moves with the key it's played in.

const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MELODY_RE = /^\s*\{\s*(?:melody|tune)(?:\s+(abc|notes))?\s*:\s*(.*?)\s*\}\s*$/i;

/** A {melody: …} line -> { format, text } or null */
function melodyLine(text) {
  const m = String(text || '').match(MELODY_RE);
  return m ? { format: (m[1] || 'notes').toLowerCase(), text: m[2] } : null;
}

/** "3", "/2", "3/2", "." -> a length multiplier */
function lengthOf(num, slash, den, dot) {
  let len = num ? Number(num) : 1;
  if (slash) len /= den ? Number(den) : 2 ** slash.length;
  if (dot) len *= 1.5;
  return len;
}

/** Note names: tokens -> [{ len, pc, shift, rest, bar }] (bar: index of the |-separated part) */
function noteTokens(text, warnings) {
  const out = [];
  String(text).split('|').forEach((part, bar) => {
    for (const tok of part.trim().split(/\s+/).filter(Boolean)) {
      const rest = tok.match(/^[r\-z](\d+(?:\.\d+)?)?(?:(\/)(\d+)?)?(\.)?$/i);
      if (rest) { out.push({ len: lengthOf(rest[1], rest[2], rest[3], rest[4]), rest: true, bar }); continue; }
      const m = tok.match(/^([A-Ga-g])([#b♯♭]?)([',]*)(\d+(?:\.\d+)?)?(?:(\/)(\d+)?)?(\.)?$/);
      if (!m) { warnings.push(`"${tok}" isn't a note (write E, F#, Bb, E2, E/2, E.)`); continue; }
      const acc = /[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0;
      const shift = (m[3].match(/'/g) || []).length - (m[3].match(/,/g) || []).length;
      out.push({ len: lengthOf(m[4], m[5], m[6], m[7]), pc: (LETTER_PC[m[1].toUpperCase()] + acc + 12) % 12, shift, bar });
    }
  });
  return out;
}

/** ABC: -> [{ len (in eighths), midi | rest, bar }] */
function abcTokens(text, warnings) {
  const out = [];
  let bar = 0;
  const clean = String(text).replace(/"[^"]*"/g, ' ').replace(/![^!]*!/g, ' ');
  const re = /(\|+|:?\|:?|\[\d|\])|([_=^]*)([A-Ga-gz])([',]*)(\d*)(\/*)(\d*)|(\S)/g;
  let m;
  while ((m = re.exec(clean))) {
    if (m[1]) { if (m[1].includes('|')) bar += 1; continue; }
    if (m[8]) { if (!/[\-:()~.<>]/.test(m[8])) warnings.push(`"${m[8]}" isn't read in ABC here`); continue; }
    const len = lengthOf(m[5], m[6], m[7], '');
    if (m[3] === 'z') { out.push({ len, rest: true, bar }); continue; }
    const acc = (m[2].match(/\^/g) || []).length - (m[2].match(/_/g) || []).length;
    const upper = m[3] === m[3].toUpperCase();
    const octave = (upper ? 4 : 5) + (m[4].match(/'/g) || []).length - (m[4].match(/,/g) || []).length;
    out.push({ len, midi: 12 * (octave + 1) + LETTER_PC[m[3].toUpperCase()] + acc, bar });
  }
  return out;
}

/**
 * One {melody} line -> { notes: [{ at, len, midi | null }], pickup, warnings }
 *   at, len in counts of the bar (beats; eighths in 6/8), at < 0 for a pickup
 *   beats: counts in a bar; compound: 6/8 etc.; prev: the note before (for note names: each
 *   note is the nearest one to it)
 */
function parseMelody(line, { beats = 4, compound = false, prev = 65 } = {}) {
  const warnings = [];
  const { format, text } = typeof line === 'string' ? (melodyLine(line) || { format: 'notes', text: line }) : line;
  let toks;
  if (format === 'abc') {
    // ABC lengths count eighths: in 4/4 and 3/4 an eighth is half a count
    toks = abcTokens(text, warnings).map((t) => ({ ...t, len: t.len * (compound ? 1 : 0.5) }));
  } else {
    let last = prev;
    toks = noteTokens(text, warnings).map((t) => {
      if (t.rest) return t;
      // the nearest note with that name to the one before (up, when it's a tie)
      let midi = last - ((last - t.pc) % 12 + 12) % 12;
      if (last - midi > 6) midi += 12;
      midi += 12 * t.shift;
      last = midi;
      return { ...t, midi };
    });
  }
  // bars: the first one short (with more after it) is a pickup
  const barTotals = [];
  for (const t of toks) barTotals[t.bar] = (barTotals[t.bar] || 0) + t.len;
  const parts = barTotals.length;
  const pickup = parts > 1 && barTotals[0] !== undefined && barTotals[0] < beats - 1e-6 ? barTotals[0] : 0;
  barTotals.forEach((total, b) => {
    if (b === 0 && pickup) return;
    if (b === parts - 1) return;   // the last bar can end early (the next line takes over)
    if (total !== undefined && Math.abs(total - beats) > 1e-6) warnings.push(`bar ${b + 1} of the tune has ${+total.toFixed(2)} counts, not ${beats}`);
  });
  let at = -pickup;
  const notes = [];
  for (const t of toks) {
    notes.push({ at, len: t.len, midi: t.rest ? null : t.midi });
    at += t.len;
  }
  return { notes, pickup, warnings };
}

/**
 * Every {melody} in a song, by the line of words it belongs to.
 *   ir: the song (melody nodes: { type: 'melody', content, format, line }); beats, compound
 *   -> Map(line -> { notes, pickup, warnings, melodyLine })
 */
function songMelody(ir, { beats = 4, compound = false, start = 65 } = {}) {
  const out = new Map();
  const nodes = ir || [];
  let prev = start;
  let curBeats = beats;
  let curCompound = compound;
  nodes.forEach((node, i) => {
    if (node.type === 'rhythm') {
      const t = String(node.content || '').match(/^\s*(\d+)\s*\/\s*(\d+)/);
      if (t) { curBeats = Number(t[1]); curCompound = Number(t[2]) === 8 && [6, 9, 12].includes(curBeats); }
      return;
    }
    if (node.type !== 'melody') return;
    const target = nodes.slice(i + 1).find((n) => (n.type === 'chord' || n.type === 'lyric' || n.type === 'bar') && n.line > node.line);
    if (!target) return;
    const parsed = parseMelody({ format: node.format || 'notes', text: node.content }, { beats: curBeats, compound: curCompound, prev });
    const sung = parsed.notes.filter((n) => n.midi !== null);
    if (sung.length) prev = sung[sung.length - 1].midi;
    out.set(target.line, { ...parsed, melodyLine: node.line, beats: curBeats, compound: curCompound });
  });
  // a line with no tune of its own is sung to the tune of the first line before it with the
  // same chords (verse 2 to verse 1's tune); a {melody} of its own always wins
  const chordsOf = new Map();
  for (const n of nodes) {
    if (n.type !== 'chord' || n.pass > 1) continue;
    const k = `${n.content}${n.beats ? `:${n.beats}` : ''}${n.bars > 1 ? `x${n.bars}` : ''}`;
    chordsOf.set(n.line, `${chordsOf.get(n.line) || ''} ${k}`);
  }
  const byChords = new Map();
  for (const [line, key] of [...chordsOf].sort((a, b) => a[0] - b[0])) {
    if (out.has(line)) { if (!byChords.has(key)) byChords.set(key, out.get(line)); continue; }
    const tune = byChords.get(key);
    if (tune) out.set(line, { ...tune, borrowed: true });
  }
  return out;
}

/**
 * A {melody} line moved by `semitones` (rewriting a song in another key). nameNote(name) spells
 * a note name in the new key (src/versions transposeName); ABC is respelled from its pitch.
 */
function transposeMelodyLine(lineText, semitones, nameNote) {
  const tune = melodyLine(lineText);
  if (!tune || !semitones) return lineText;
  const start = lineText.indexOf(':') + 1;
  const head = lineText.slice(0, start);
  const body = lineText.slice(start);
  if (tune.format === 'abc') {
    const NAMES = ['C', '^C', 'D', '_E', 'E', 'F', '^F', 'G', '_A', 'A', '_B', 'B'];
    const moved = body.replace(/("[^"]*")|([_=^]*)([A-Ga-g])([',]*)/g, (whole, quoted, acc, letter, marks) => {
      if (quoted) return whole;
      const up = letter === letter.toUpperCase();
      const octave = (up ? 4 : 5) + (marks.match(/'/g) || []).length - (marks.match(/,/g) || []).length;
      const midi = 12 * (octave + 1) + LETTER_PC[letter.toUpperCase()] + (acc.match(/\^/g) || []).length - (acc.match(/_/g) || []).length + semitones;
      const o = Math.floor(midi / 12) - 1;
      const name = NAMES[((midi % 12) + 12) % 12];
      const l = name.slice(-1);
      const pre = name.length > 1 ? name[0] : '';
      return o >= 5 ? `${pre}${l.toLowerCase()}${"'".repeat(o - 5)}` : `${pre}${l}${','.repeat(4 - o)}`;
    });
    return head + moved;
  }
  const moved = body.replace(/(^|[\s|])([A-Ga-g])([#b♯♭]?)(?=[',\d/.\s|}]|$)/g, (whole, lead, letter, acc) => `${lead}${nameNote(letter.toUpperCase() + acc.replace('♯', '#').replace('♭', 'b'))}`);
  return head + moved;
}

/** Does the song have a tune? */
function hasMelody(ir) {
  return (ir || []).some((n) => n.type === 'melody');
}


// ── ABC tunes, as ChordPro songbooks carry them (4.44): {start_of_abc} … {end_of_abc} ──
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const MODE_OFFSET = { '': 0, maj: 0, major: 0, ion: 0, m: 9, min: 9, minor: 9, aeo: 9, dor: 2, phr: 4, lyd: 5, mix: 7, loc: 11 };
// major keys: how many sharps (+) or flats (-), by the tonic's pitch class (and its spelling)
const MAJOR_SIG = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 };

/** "G", "Am", "Bb", "Ddor", "F#m" -> { sig: Map(letter -> +1|-1), flats: bool, tonic, minor } */
function keySignature(key) {
  const m = String(key || 'C').trim().match(/^([A-Ga-g])([#b♯♭]?)\s*([A-Za-z]*)/);
  if (!m) return { sig: new Map(), flats: false, tonic: 0, minor: false };
  const acc = /[#♯]/.test(m[2]) ? 1 : /[b♭]/.test(m[2]) ? -1 : 0;
  const tonic = (LETTER_PC[m[1].toUpperCase()] + acc + 12) % 12;
  const modeWord = m[3].toLowerCase();
  const mode = MODE_OFFSET[modeWord.slice(0, 3)] !== undefined && modeWord.length >= 3 ? modeWord.slice(0, 3) : (/^m(in)?$/.test(modeWord) ? 'm' : '');
  const major = (tonic - (MODE_OFFSET[mode] || 0) + 12) % 12;
  let n = MAJOR_SIG[major];
  // spelt with a flat (Gb, Cb…) or a sharp (C#, F#…): follow the spelling
  if (major === 6 && acc < 0) n = -6;
  if (major === 1 && acc > 0 && !mode) n = 7;
  if (major === 11 && acc < 0) n = -7;
  const sig = new Map();
  if (n > 0) SHARP_ORDER.slice(0, n).forEach((l) => sig.set(l, 1));
  if (n < 0) FLAT_ORDER.slice(0, -n).forEach((l) => sig.set(l, -1));
  return { sig, flats: n < 0, tonic, minor: mode === 'm' || mode === 'min' || mode === 'aeo' };
}

/**
 * A whole ABC tune (header and body) -> { meter: [beats, unit], counts per bar, key, bars:
 *   [[{ len (counts), midi | null }]], pickup (counts, or 0), warnings }
 * Counts are beats (eighths in 6/8 and other compound times), as {melody} lines use them.
 */
function parseAbcTune(text) {
  const warnings = [];
  let meter = [4, 4];
  let unit = null;
  let key = 'C';
  const body = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.replace(/%.*$/, '').trimEnd();
    const h = line.match(/^([A-Za-z]):\s*(.*)$/);
    if (h && !/^[|]/.test(line)) {
      const [, f, v] = h;
      if (f === 'M') {
        if (/^C\|$/.test(v.trim())) meter = [2, 2];
        else if (/^C$/.test(v.trim())) meter = [4, 4];
        else { const mm = v.match(/(\d+)\s*\/\s*(\d+)/); if (mm) meter = [Number(mm[1]), Number(mm[2])]; }
      } else if (f === 'L') { const ll = v.match(/(\d+)\s*\/\s*(\d+)/); if (ll) unit = Number(ll[1]) / Number(ll[2]); }
      else if (f === 'K') { key = v.trim().split(/\s+/)[0] || 'C'; }
      else if (f === 'w' || f === 'W') { /* words: not needed */ }
      continue;
    }
    if (line.trim()) body.push(line);
  }
  // the default note length: 1/16 for short meters, else 1/8
  if (!unit) unit = meter[0] / meter[1] < 0.75 ? 1 / 16 : 1 / 8;
  const compound = meter[1] === 8 && [6, 9, 12].includes(meter[0]);
  const countLen = compound ? 1 / 8 : 1 / meter[1];        // a count, as a fraction of a whole note
  const perBar = meter[0] * (compound ? 1 : 1);             // counts in a bar
  const { sig } = keySignature(key);
  const bars = [[]];
  let barAcc = new Map();   // accidentals written in this bar: they last to the bar line
  let tuplet = null;        // (3abc: three in the time of two
  let broken = 0;           // > or <: the next note takes the rest of a dotted pair
  let tie = false;
  const src = body.join(' ').replace(/"[^"]*"/g, ' ').replace(/![^!]*!/g, ' ').replace(/\{[^}]*\}/g, ' ');
  const re = /(\[\|]|\|\]|\|\||\[?\|:?|:\|\]?|::)|\((\d)|([<>]+)|(-)|([_=^]*)([A-Ga-gzxZ])([',]*)(\d*)(\/*)(\d*)|(\[|\])|(\S)/g;
  let m;
  const push = (note) => {
    let len = note.len;
    if (tuplet) { len *= tuplet.q / tuplet.p; tuplet.left -= 1; if (!tuplet.left) tuplet = null; }
    if (broken) { len *= broken; broken = 0; }
    const counts = (len * unit) / countLen;
    const bar = bars[bars.length - 1];
    if (tie && bar.length && note.midi !== null && bar[bar.length - 1].midi === note.midi) { bar[bar.length - 1].len += counts; tie = false; return bar[bar.length - 1]; }
    if (tie && !bar.length && bars.length > 1) {
      const prev = bars[bars.length - 2];
      if (prev.length && prev[prev.length - 1].midi === note.midi) { const n = { len: counts, midi: note.midi, tied: true }; bar.push(n); tie = false; return n; }
    }
    tie = false;
    const n = { len: counts, midi: note.midi };
    bar.push(n);
    return n;
  };
  let last = null;
  while ((m = re.exec(src))) {
    if (m[1]) { if (bars[bars.length - 1].length) bars.push([]); barAcc = new Map(); continue; }
    if (m[2]) { const p = Number(m[2]); tuplet = { p, q: p === 3 ? 2 : p === 2 ? 3 : p === 4 ? 3 : p - 1, left: p }; continue; }
    if (m[3]) {
      // A>B: A dotted, B half as long (and < the other way): applied to the note before and after
      const k = m[3].length;
      const longer = 2 - 1 / 2 ** k;
      const shorter = 1 / 2 ** k;
      if (last) { const bar = bars[bars.length - 1]; const f = m[3][0] === '>' ? longer : shorter; last.len *= f; }
      broken = m[3][0] === '>' ? shorter : longer;
      continue;
    }
    if (m[4]) { tie = true; continue; }
    if (m[12] || m[13]) continue;
    if (!m[6]) continue;
    const len = lengthOf(m[8], m[9], m[10], '');
    if (/[zxZ]/.test(m[6])) { last = push({ len: m[6] === 'Z' ? (perBar * countLen) / unit * (Number(m[8]) || 1) : len, midi: null }); continue; }
    const letter = m[6].toUpperCase();
    const octave = (m[6] === letter ? 4 : 5) + (m[7].match(/'/g) || []).length - (m[7].match(/,/g) || []).length;
    let acc;
    if (m[5]) {
      acc = (m[5].match(/\^/g) || []).length - (m[5].match(/_/g) || []).length;
      barAcc.set(`${letter}${octave}`, acc);
    } else if (barAcc.has(`${letter}${octave}`)) acc = barAcc.get(`${letter}${octave}`);
    else acc = sig.get(letter) || 0;
    last = push({ len, midi: 12 * (octave + 1) + LETTER_PC[letter] + acc });
  }
  if (!bars[bars.length - 1].length) bars.pop();
  const totals = bars.map((b) => b.reduce((a, n) => a + n.len, 0));
  const pickup = bars.length > 1 && totals[0] < perBar - 1e-6 ? totals[0] : 0;
  totals.forEach((t, b) => {
    if ((b === 0 && pickup) || b === bars.length - 1) return;
    if (Math.abs(t - perBar) > 1e-6) warnings.push(`bar ${b + 1} of the ABC tune has ${+t.toFixed(2)} counts, not ${perBar}`);
  });
  return { meter, perBar, compound, key, bars, pickup, warnings };
}

/** counts -> the length suffix of a note name: 2, /2, 3/2, . */
function lengthText(len) {
  if (Math.abs(len - 1) < 1e-9) return '';
  if (Math.abs(len - 1.5) < 1e-9) return '.';
  for (const den of [1, 2, 3, 4, 8, 16]) {
    const num = len * den;
    if (Math.abs(num - Math.round(num)) < 1e-6) {
      const n = Math.round(num);
      return den === 1 ? String(n) : `${n === 1 ? '' : n}/${den}`;
    }
  }
  return String(+len.toFixed(3));
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/**
 * Notes ([{ len, midi | null }], bars at every `perBar` counts from `start`) -> the body of a
 * {melody: …} line by note name: each note written relative to the one before (`prev`), with ' or ,
 * where the nearest isn't the one meant. -> { text, prev }
 */
function notesToMelodyText(notes, { perBar = 4, start = 0, prev = 65, flats = false } = {}) {
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  let at = start;
  let out = '';
  let last = prev;
  notes.forEach((n, i) => {
    if (i > 0 && Math.abs(((at % perBar) + perBar) % perBar) < 1e-6) out += '| ';
    if (n.midi === null) out += `r${lengthText(n.len)} `;
    else {
      const pc = ((n.midi % 12) + 12) % 12;
      let near = last - ((last - pc) % 12 + 12) % 12;
      if (last - near > 6) near += 12;
      const shift = Math.round((n.midi - near) / 12);
      out += `${names[pc]}${shift > 0 ? "'".repeat(shift) : ','.repeat(-shift)}${lengthText(n.len)} `;
      last = n.midi;
    }
    at += n.len;
  });
  return { text: out.trim(), prev: last };
}

/** One ABC note: midi -> "^F", "_B,", "c'" with the key's signature (accidentals only where needed) */
function abcNote(midi, sig, flats, barAcc) {
  const pc = ((midi % 12) + 12) % 12;
  const name = (flats ? FLAT_NAMES : SHARP_NAMES)[pc];
  const letter = name[0];
  const acc = name.length > 1 ? (name[1] === '#' ? 1 : -1) : 0;
  const octave = Math.floor(midi / 12) - 1 - (name === 'B#' ? 1 : 0);
  const key = `${letter}${octave}`;
  const inForce = barAcc.has(key) ? barAcc.get(key) : (sig.get(letter) || 0);
  let mark = '';
  if (acc !== inForce) { mark = acc === 1 ? '^' : acc === -1 ? '_' : '='; barAcc.set(key, acc); }
  const body = octave >= 5 ? `${letter.toLowerCase()}${"'".repeat(octave - 5)}` : `${letter}${','.repeat(4 - octave)}`;
  return mark + body;
}

/** counts -> an ABC length in eighths (L:1/8): 2 -> "2" in 4/4, "" for one eighth */
function abcLength(counts, compound) {
  const eighths = compound ? counts : counts * 2;
  if (Math.abs(eighths - 1) < 1e-9) return '';
  for (const den of [1, 2, 4, 8]) {
    const num = eighths * den;
    if (Math.abs(num - Math.round(num)) < 1e-6) return den === 1 ? String(Math.round(num)) : `${Math.round(num) === 1 ? '' : Math.round(num)}/${den}`;
  }
  return String(eighths);
}

/**
 * Lines of tune -> an ABC tune (header and body), one ABC line per line of the song.
 *   lines: [{ notes: [{ at, len, midi | null }] }] (at from the line's start; < 0 a pickup)
 *   { title, key, beats, compound, shift (semitones) }
 */
function tuneToAbc(lines, { title = '', key = 'C', beats = 4, compound = false, shift = 0 } = {}) {
  const ks = keySignature(key);
  const head = ['X:1'];
  if (title) head.push(`T:${title}`);
  head.push(`M:${compound ? `${beats}/8` : `${beats}/4`}`, 'L:1/8', `K:${key || 'C'}`, '% made by ukemusic from the song\'s {melody} lines');
  const body = lines.map((l, li) => {
    let barAcc = new Map();
    let out = '';
    let at = Math.min(0, ...l.notes.map((n) => n.at));
    for (const n of l.notes) {
      // a note crossing a bar line is split, and tied
      let left = n.len;
      let pos = n.at;
      while (left > 1e-9) {
        const nextBar = Math.floor(pos / beats + 1e-9) * beats + beats;
        const take = Math.min(left, nextBar - pos);
        if (pos > at - 1e-9 && Math.abs(((pos % beats) + beats) % beats) < 1e-6 && out) { out += '| '; barAcc = new Map(); }
        out += n.midi === null ? `z${abcLength(take, compound)}` : `${abcNote(n.midi + shift, ks.sig, ks.flats, barAcc)}${abcLength(take, compound)}`;
        left -= take;
        pos += take;
        if (left > 1e-9 && n.midi !== null) out += '-';
        out += ' ';
      }
      at = pos;
    }
    return `${out.trim()} ${li === lines.length - 1 ? '|]' : '|'}`;
  });
  return [...head, ...body].join('\n');
}
module.exports = { keySignature, parseAbcTune, notesToMelodyText, tuneToAbc, lengthText, MELODY_RE, melodyLine, transposeMelodyLine, parseMelody, songMelody, hasMelody, noteTokens, abcTokens };
