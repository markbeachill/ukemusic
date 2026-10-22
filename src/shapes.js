// Chord shapes a song chooses for itself: "play Am as 2000 in this song", or another
// fingering from the list of alternatives. Stored in song.ini per instrument:
//
//   [shapes]
//   soprano = Am 2000, F 2010
//   guitar  = C x32010, G 320033
//
// The chord names are the ones shown on the sheet (after any key change or capo), so a
// shape chosen while viewing a version applies to that version's chords.
// Also: finding alternative shapes, and ChordPro {define} lines.

const { parseChordName, SUFFIX_INTERVALS } = require('./chord-names');
const { instrument: profile } = require('./instruments');

const MAX_FRET = 15;

/** "2 0 0 0", "2000", "x32010", "x 3 2 0 1 0", "10 12 12 11" -> [2,0,0,0] (muted = -1), or null */
function parseFrets(text, strings) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const tokens = /[\s,]/.test(raw) ? raw.split(/[\s,]+/).filter(Boolean) : [...raw];
  if (tokens.length !== strings) return null;
  const frets = tokens.map((t) => {
    if (/^[xX-]$/.test(t)) return -1;
    if (!/^\d{1,2}$/.test(t)) return NaN;
    return Number(t);
  });
  if (frets.some((f) => Number.isNaN(f) || f > MAX_FRET)) return null;
  if (frets.every((f) => f < 0)) return null;
  return frets;
}

/** [2,0,0,0] -> "2000"; frets of 10 or more are written with spaces: "10 12 12 11" */
function fretsText(frets) {
  const parts = frets.map((f) => (f < 0 ? 'x' : String(f)));
  return parts.some((p) => p.length > 1) ? parts.join(' ') : parts.join('');
}

/** Fingers (1–4) and a barre for a shape, or null if it can't be fingered with four fingers. */
function fingerShape(frets) {
  const fingers = frets.map(() => 0);
  const fretted = frets.map((f, s) => ({ f, s })).filter((x) => x.f > 0).sort((a, b) => a.f - b.f || a.s - b.s);
  if (!fretted.length) return { fingers, barre: null };
  const lowest = fretted[0].f;
  const onLowest = fretted.filter((x) => x.f === lowest);
  const needBarre = fretted.length > 4 || (fretted.length === frets.length && onLowest.length >= 2);
  let barre = null;
  if (needBarre && onLowest.length >= 2) {
    onLowest.forEach((x) => { fingers[x.s] = 1; });
    barre = { fret: lowest, strings: onLowest.map((x) => x.s) };
    let next = 2;
    fretted.filter((x) => x.f !== lowest).forEach((x) => { fingers[x.s] = next++; });
  } else {
    fretted.forEach((x, i) => { fingers[x.s] = i + 1; });
  }
  if (Math.max(...fingers) > 4) return null;
  return { fingers, barre };
}

/** A library definition for a shape: { frets, fingers, barre, base_fret } */
function definitionFromFrets(frets) {
  const fingered = fingerShape(frets) || { fingers: frets.map(() => 0), barre: null };
  const fretted = frets.filter((f) => f > 0);
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  const baseFret = maxFret <= 4 ? 1 : Math.min(...fretted);
  return { frets: frets.slice(), fingers: fingered.fingers, barre: fingered.barre, base_fret: baseFret };
}

/** The notes that make a chord what it is (same rules as tools/build-chord-library.js) */
function definingIntervals(intervals) {
  const set = new Set(intervals);
  const req = [];
  if (intervals.length <= 4) req.push(0);
  if (set.has(4)) req.push(4);
  else if (set.has(3)) req.push(3);
  else if (set.has(2)) req.push(2);
  else if (set.has(5)) req.push(5);
  if (set.has(10)) req.push(10);
  else if (set.has(11)) req.push(11);
  else if (set.has(9)) req.push(9);
  if (set.has(6) && !set.has(7)) req.push(6);
  if (set.has(8) && !set.has(7)) req.push(8);
  if (set.has(1)) req.push(1);
  if (set.has(3) && set.has(4)) req.push(3);
  if (set.has(2) && (set.has(3) || set.has(4)) && !set.has(9) && !set.has(10) && !set.has(11)) req.push(2);
  return [...new Set(req)];
}

/** What's wrong with a shape for a chord ('' = fine). Unknown chord types only check playability. */
function shapeProblem(frets, chordName, instrumentId) {
  const strings = profile(instrumentId).strings;
  if (frets.length !== strings.length) return `needs ${strings.length} strings`;
  const sounding = frets.filter((f) => f >= 0).length;
  if (sounding < Math.min(3, strings.length)) return 'too few strings sound';
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 4) return 'too wide a stretch';
  if (!fingerShape(frets)) return 'needs more than four fingers';
  const parsed = parseChordName(chordName);
  const intervals = parsed && SUFFIX_INTERVALS[parsed.canonicalSuffix];
  if (!intervals) return '';
  const root = parsed.rootIndex;
  const pcs = frets.map((f, s) => (f < 0 ? null : (strings[s] + f) % 12)).filter((pc) => pc !== null);
  const allowed = new Set(intervals.map((i) => (root + i) % 12));
  if (parsed.bass) allowed.add(require('./chord-names').NOTE_INDEX[parsed.bass]);
  if (pcs.some((pc) => !allowed.has(pc))) return 'has a note that isn\'t in the chord';
  for (const interval of definingIntervals(intervals)) {
    if (!pcs.includes((root + interval) % 12)) return 'is missing a note the chord needs';
  }
  return '';
}

function difficulty(frets, chordName, strings) {
  const fretted = frets.filter((f) => f > 0);
  const fingered = fingerShape(frets);
  let score = (fretted.length ? Math.max(...fretted) : 0) * 2 + fretted.length;
  if (fingered && fingered.barre) score += 4;
  score += frets.filter((f) => f < 0).length * 2;
  if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) score += 6;
  // open strings ringing against a hand high up the neck: unusual and awkward
  if (fretted.length && Math.max(...fretted) >= 5 && frets.some((f) => f === 0)) score += 5;
  // Six strings: the root in the bass sounds right
  const parsed = parseChordName(chordName);
  if (strings.length > 4 && parsed && parsed.rootIndex !== undefined) {
    const lowest = frets.findIndex((f) => f >= 0);
    if (lowest >= 0 && (strings[lowest] + frets[lowest]) % 12 !== parsed.rootIndex) score += 8;
  }
  return score;
}

/**
 * Other ways to play a chord on an instrument, easiest first: every correct shape within
 * a four-fret hand position, from open position up to the 12th fret.
 * Guitar shapes may leave out (mute) the lowest one or two strings.
 */
function findShapes(chordName, instrumentId, { limit = 8 } = {}) {
  const strings = profile(instrumentId).strings;
  const n = strings.length;
  const seen = new Set();
  const found = [];
  for (let position = 0; position <= 12; position += 1) {
    const options = strings.map((_, s) => {
      const opts = [0];
      for (let f = Math.max(1, position); f <= Math.min(MAX_FRET, position + 3); f += 1) opts.push(f);
      if (n > 4 && s < 2) opts.push(-1);
      return opts;
    });
    const frets = new Array(n).fill(0);
    const walk = (s) => {
      if (s === n) {
        // muted strings only at the bass end
        const firstSounding = frets.findIndex((f) => f >= 0);
        if (frets.slice(firstSounding).some((f) => f < 0)) return;
        const key = frets.join(',');
        if (seen.has(key)) return;
        if (shapeProblem(frets, chordName, instrumentId)) return;
        seen.add(key);
        found.push({ frets: frets.slice(), score: difficulty(frets, chordName, strings) });
        return;
      }
      for (const f of options[s]) {
        frets[s] = f;
        walk(s + 1);
      }
    };
    walk(0);
  }
  found.sort((a, b) => a.score - b.score);
  // Offer real alternatives: first those that differ from every one already picked on at
  // least two strings, then fill up with the rest
  const picked = [];
  const differs = (a, b) => a.filter((f, i) => f !== b[i]).length >= 2;
  for (const x of found) if (picked.length < limit && picked.every((p) => differs(p.frets, x.frets))) picked.push(x);
  for (const x of found) if (picked.length < limit && !picked.includes(x)) picked.push(x);
  return picked.sort((a, b) => a.score - b.score).map((x) => definitionFromFrets(x.frets));
}

/** "Am 2000, F#m 2120" -> { Am: [2,0,0,0], 'F#m': [2,1,2,0] } (bad entries are skipped) */
function parseShapeSetting(text, strings) {
  const out = {};
  for (const part of String(text || '').split(',')) {
    const m = part.trim().match(/^(\S+)\s+(.+)$/);
    if (!m) continue;
    const frets = parseFrets(m[2], strings);
    if (frets) out[m[1]] = frets;
  }
  return out;
}

function formatShapeSetting(map) {
  return Object.entries(map || {}).map(([name, frets]) => `${name} ${fretsText(frets)}`).join(', ');
}

/** A chord library with a song's own shapes on top (names as shown on the sheet). */
function withShapes(library, map) {
  const entries = Object.entries(map || {});
  if (!library || !entries.length) return library;
  const chords = { ...(library.chords || {}) };
  for (const [name, frets] of entries) chords[name] = { ...definitionFromFrets(frets), custom: true };
  return { ...library, chords };
}

// ── ChordPro {define} ────────────────────────────────────────
// {define: Am base-fret 1 frets 2 0 0 0}  (frets are counted from base-fret; x or -1 = muted)

/** -> { name, frets (absolute) } or null */
function parseDefine(value) {
  const m = String(value || '').trim().match(/^(\S+)\s+(?:base-fret\s+(\d+)\s+)?frets\s+(.+?)(?:\s+fingers\b.*)?$/i);
  if (!m) return null;
  const base = Math.max(1, Number(m[2]) || 1);
  const tokens = m[3].trim().split(/\s+/);
  const frets = tokens.map((t) => (/^(x|X|-1|N)$/.test(t) ? -1 : Number(t)));
  if (frets.some((f) => Number.isNaN(f))) return null;
  return { name: m[1], frets: frets.map((f) => (f > 0 ? f + base - 1 : f)) };
}

function formatDefine(name, frets) {
  const fretted = frets.filter((f) => f > 0);
  const base = fretted.length && Math.max(...fretted) > 4 ? Math.min(...fretted) : 1;
  const rel = frets.map((f) => (f < 0 ? 'x' : f === 0 ? '0' : String(f - base + 1)));
  return `{define: ${name} base-fret ${base} frets ${rel.join(' ')}}`;
}

module.exports = {
  parseFrets, fretsText, fingerShape, definitionFromFrets, shapeProblem, findShapes,
  parseShapeSetting, formatShapeSetting, withShapes, parseDefine, formatDefine
};
