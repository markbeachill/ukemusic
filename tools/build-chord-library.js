#!/usr/bin/env node
// Builds src/chords.json (soprano/concert/tenor, GCEA), src/chords-baritone.json (DGBE)
// and src/chords-guitar.json (EADGBE) from the chords-db ukulele and guitar data (MIT, https://github.com/tombatossals/chords-db), keeping
// the hand-checked shapes in tools/hand-checked/ as the main fingering for those chords.
//
//   node tools/build-chord-library.js [path/to/chords-db/lib]
//
// Every fingering written out is checked note-by-note: it may only contain notes of the
// chord, and (for triads, 6ths, 7ths and sus chords) must include the root and the 3rd/sus note.
// Baritone shapes are soprano shapes: a baritone plays the soprano "C" shape for G (a 4th lower).
const fs = require('fs');
const path = require('path');
const { SUFFIX_INTERVALS, SUFFIX_ALIASES, NOTE_INDEX } = require('../src/chord-names');

const libDir = process.argv[2] || path.join(__dirname, '..', 'node_modules', '@tombatossals', 'chords-db', 'lib');
const ukulele = JSON.parse(fs.readFileSync(path.join(libDir, 'ukulele.json'), 'utf8'));
const guitar = JSON.parse(fs.readFileSync(path.join(libDir, 'guitar.json'), 'utf8'));
const { instrument: profile } = require('../src/instruments');
const TUNING = { soprano: profile('soprano').strings, baritone: profile('baritone').strings, guitar: profile('guitar').strings };
const DB_KEY = { Csharp: 'C#', Fsharp: 'F#' }; // chords-db guitar spells two keys out
const ROOT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_FOR_MINOR = { Db: 'C#', Gb: 'F#', Ab: 'G#' }; // C#m, F#m, G#m read better than Dbm, Gbm, Abm

function suffixName(dbSuffix) {
  if (dbSuffix === 'major') return '';
  if (dbSuffix === 'minor') return 'm';
  return Object.prototype.hasOwnProperty.call(SUFFIX_ALIASES, dbSuffix) ? SUFFIX_ALIASES[dbSuffix] : dbSuffix;
}

function chordName(rootIndex, suffix) {
  let root = ROOT_NAMES[rootIndex];
  if (/^m(?!aj)/.test(suffix) && SHARP_FOR_MINOR[root]) root = SHARP_FOR_MINOR[root];
  return root + suffix;
}

/**
 * The notes that make a chord what it is, which a fingering must contain:
 * the root (for chords of up to 4 notes), the 3rd (or the 2nd/4th of a sus chord),
 * the 7th or 6th, and any altered or added note (b5, #5, b9, #9, add9).
 */
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
  if (set.has(6) && !set.has(7)) req.push(6); // b5 (dim, m7b5, 7b5)
  if (set.has(8) && !set.has(7)) req.push(8); // #5 (aug)
  if (set.has(1)) req.push(1); // b9
  if (set.has(3) && set.has(4)) req.push(3); // #9
  if (set.has(2) && (set.has(3) || set.has(4)) && !set.has(9) && !set.has(10) && !set.has(11)) req.push(2); // add9
  return [...new Set(req)];
}

/** Check a fingering against the chord. Returns '' if fine, else the reason. */
function problem(frets, instrument, rootIndex, suffix) {
  const intervals = SUFFIX_INTERVALS[suffix];
  if (!intervals) return 'unknown chord type';
  if (frets.some((f) => typeof f !== 'number')) return 'bad fret';
  // Ukulele shapes play every string; guitar shapes may mute some (-1), but need 3+ sounding
  if (instrument !== 'guitar' && frets.some((f) => f < 0)) return 'muted string';
  if (frets.filter((f) => f >= 0).length < 3) return 'too few strings';
  const pcs = frets.map((f, s) => (f < 0 ? null : (TUNING[instrument][s] + f) % 12)).filter((pc) => pc !== null);
  const allowed = new Set(intervals.map((i) => (rootIndex + i) % 12));
  if (pcs.some((pc) => !allowed.has(pc))) return 'wrong note';
  for (const interval of definingIntervals(intervals)) {
    if (!pcs.includes((rootIndex + interval) % 12)) return 'missing a defining note';
  }
  const fretted = frets.filter((f) => f > 0);
  if (fretted.length && Math.max(...fretted) - Math.min(...fretted) > 3) return 'too wide a stretch';
  return '';
}

function difficulty(frets) {
  const fretted = frets.filter((f) => f > 0);
  return (fretted.length ? Math.max(...fretted) : 0) * 10 + fretted.length;
}

/** Simple fingering for a generated shape: one finger per fretted string, low frets first;
 *  if all four strings are fretted and several share the lowest fret, barre them with finger 1. */
function fingerShape(frets) {
  const fingers = [0, 0, 0, 0];
  const fretted = frets.map((f, s) => ({ f, s })).filter((x) => x.f > 0).sort((a, b) => a.f - b.f || a.s - b.s);
  let barre = null;
  const lowest = fretted.length ? fretted[0].f : 0;
  const onLowest = fretted.filter((x) => x.f === lowest);
  if (fretted.length === 4 && onLowest.length >= 2) {
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

/** Search every shape in the first four frets for the easiest correct one. */
function easiestGenerated(instrument, rootIndex, suffix) {
  let best = null;
  for (let a = 0; a <= 4; a += 1) for (let b = 0; b <= 4; b += 1) for (let c = 0; c <= 4; c += 1) for (let d = 0; d <= 4; d += 1) {
    const frets = [a, b, c, d];
    if (problem(frets, instrument, rootIndex, suffix)) continue;
    if (best && difficulty(frets) >= difficulty(best)) continue;
    if (!fingerShape(frets)) continue;
    best = frets;
  }
  if (!best) return null;
  const { fingers, barre } = fingerShape(best);
  return { frets: best, fingers, barre, base_fret: 1 };
}

/** chords-db position -> ukemusic definition (absolute frets) */
function convertPosition(position) {
  const base = position.baseFret || 1;
  const frets = position.frets.map((f) => (f > 0 ? f + base - 1 : f));
  const fretted = frets.filter((f) => f > 0);
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  const baseFret = maxFret <= 4 ? 1 : Math.min(...fretted);
  let barre = null;
  if (position.barres && position.barres.length) {
    const fret = position.barres[0] + base - 1;
    const strings = frets.map((f, i) => (f === fret ? i : -1)).filter((i) => i >= 0);
    if (strings.length >= 2) barre = { fret, strings };
  }
  return { frets, fingers: position.fingers.slice(0, frets.length), barre, base_fret: baseFret };
}

function loadHandChecked(instrument) {
  const file = path.join(__dirname, 'hand-checked', `${instrument}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).chords;
}

function build(instrument) {
  const chords = {};
  const keyOf = (name) => {
    const m = name.match(/^([A-G][#b]?)(.*)$/);
    return `${NOTE_INDEX[m[1]]}:${m[2]}`;
  };
  const taken = new Set();
  const rejected = {};

  // 1. Hand-checked shapes first (ukuleles only)
  for (const [name, def] of Object.entries(instrument === 'guitar' ? {} : loadHandChecked(instrument))) {
    chords[name] = def;
    taken.add(keyOf(name));
  }

  // 2. Everything else from chords-db (for baritone: the soprano shape a 4th above)
  const shift = instrument === 'baritone' ? 5 : 0;
  const source = instrument === 'guitar' ? guitar : ukulele;
  for (const [dbKey, list] of Object.entries(source.chords)) {
    const dbRoot = NOTE_INDEX[DB_KEY[dbKey] || dbKey];
    for (const chord of list) {
      const suffix = suffixName(chord.suffix);
      if (!SUFFIX_INTERVALS[suffix]) {
        rejected[`type ${chord.suffix}`] = (rejected[`type ${chord.suffix}`] || 0) + 1;
        continue;
      }
      const rootIndex = (dbRoot - shift + 12) % 12;
      const name = chordName(rootIndex, suffix);
      if (taken.has(keyOf(name))) continue;
      // Of the fingerings that pass, take the easiest: closest to the nut, then fewest fretted strings
      let chosen = null;
      let bestScore = Infinity;
      for (const position of chord.positions) {
        const def = convertPosition(position);
        const why = problem(def.frets, instrument, rootIndex, suffix);
        if (why) {
          rejected[why] = (rejected[why] || 0) + 1;
          continue;
        }
        // Guitar: prefer shapes with the root as the lowest note
        const sounding = def.frets.map((f, i) => (f < 0 ? null : TUNING[instrument][i] + f)).filter((n) => n !== null);
        const rootInBass = sounding.length && (Math.min(...sounding) % 12) === rootIndex;
        const score = difficulty(def.frets) + (instrument === 'guitar' && !rootInBass ? 25 : 0);
        if (score < bestScore) {
          bestScore = score;
          chosen = def;
        }
      }
      // A much easier correct shape near the nut beats the database's choice
      const generated = instrument === 'guitar' ? null : easiestGenerated(instrument, rootIndex, suffix);
      if (generated && (!chosen || difficulty(generated.frets) + 15 <= difficulty(chosen.frets))) {
        chosen = generated;
        rejected['replaced by easier shape'] = (rejected['replaced by easier shape'] || 0) + 1;
      }
      if (chosen) {
        chords[name] = chosen;
        taken.add(keyOf(name));
      } else {
        rejected['no usable fingering'] = (rejected['no usable fingering'] || 0) + 1;
      }
    }
  }
  return { chords, rejected };
}

function write(instrument, chords) {
  const meta = {
    soprano: { tuning: 'GCEA', instrument: 'ukulele' },
    baritone: { tuning: 'DGBE', instrument: 'baritone ukulele' },
    guitar: { tuning: 'EADGBE', instrument: 'guitar', strings: 6 }
  }[instrument];
  meta.source = 'Hand-checked shapes plus chords-db (MIT, github.com/tombatossals/chords-db); see THIRD_PARTY_NOTICES.md';
  meta.generated_by = 'tools/build-chord-library.js';
  const names = Object.keys(chords).sort((a, b) => {
    const ra = NOTE_INDEX[a.match(/^[A-G][#b]?/)[0]];
    const rb = NOTE_INDEX[b.match(/^[A-G][#b]?/)[0]];
    return ra - rb || a.length - b.length || a.localeCompare(b);
  });
  const lines = names.map((name) => `    ${JSON.stringify(name)}: ${JSON.stringify(chords[name])}`);
  const out = `{\n  "meta": ${JSON.stringify(meta)},\n  "chords": {\n${lines.join(',\n')}\n  }\n}\n`;
  const file = path.join(__dirname, '..', 'src', profile(instrument).library);
  fs.writeFileSync(file, out, 'utf8');
  return file;
}

for (const instrument of ['soprano', 'baritone', 'guitar']) {
  const { chords, rejected } = build(instrument);
  const file = write(instrument, chords);
  console.log(`${instrument}: ${Object.keys(chords).length} chords -> ${path.relative(process.cwd(), file)}`);
  console.log('  skipped fingerings:', JSON.stringify(rejected));
}
