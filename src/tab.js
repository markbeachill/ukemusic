// Tablature: plain-text tab  ⇄  internal model.
//
// The song file keeps tab as readable text (the master copy):
//     A|--0--0--1--------|
//     E|-----------0-----|
//     C|-----------------|
//     G|-----------------|
// Whenever the app needs to check, draw, transpose or play it, the text is read into a model:
//   { tuning, systems: [{ lines, width, notes }], notes, warnings }
// where each note is { system, column, string, label, fret, text, technique, midi, pitch }.
// Column = character position in the line, so the spacing the writer chose is kept.
// Pure functions: no DOM, so it can all be unit tested.

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const pitchName = (midi) => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

// String names top line first, as tab is written (the highest-sounding string on top),
// from the instrument profiles: soprano A E C G · baritone E B G D · guitar e B G D A E
const { INSTRUMENTS, instrument: profile, sameShapes } = require('./instruments');
const TUNINGS = Object.fromEntries(INSTRUMENTS.map((p) => [
  p.id, p.tabNames.map((name, i) => [name, p.strings[p.strings.length - 1 - i]])
]));
const MAX_FRET = 15;

// A tab string line: optional spaces, a string name (A, e, C#, Bb…), then | or : and the music
const STRING_LINE_RE = /^\s*([A-Ga-g][#♯b♭]?)\s*([|:])(.*)$/;
// Characters that belong in tab music
const TAB_CHARS_RE = /^[-0-9|:hpbrsxtv~/\\()<>^*.=\s]*$/i;
const TECHNIQUES = { h: 'hammer-on', p: 'pull-off', b: 'bend', r: 'release', '/': 'slide up', '\\': 'slide down', '~': 'vibrato', s: 'slide', x: 'muted', t: 'tap', v: 'vibrato' };

// strict (for spotting tab in pasted text): only tab characters allowed;
// lenient (inside a ```tab block): a string name, | and some dashes is enough, so odd
// symbols can be reported instead of the line being treated as words.
function isStringLine(line, { strict = true } = {}) {
  const m = String(line).match(STRING_LINE_RE);
  if (!m) return false;
  const body = m[3];
  if ((body.match(/-/g) || []).length < 3) return false;
  return strict ? TAB_CHARS_RE.test(body.replace(/\|/g, '')) : true;
}

/** Which tuning the labels describe: 'soprano', 'baritone', 'guitar' or null (low G reads as 'soprano'). */
function tuningFromLabels(labels) {
  const norm = (l) => l.replace('♯', '#').replace('♭', 'b');
  const wanted = labels.map(norm);
  for (const [name, strings] of Object.entries(TUNINGS)) {
    if (strings.length !== wanted.length) continue;
    if (strings.every(([label], i) => label.toUpperCase() === wanted[i].toUpperCase())) return name;
  }
  return null;
}

function tuningFor(labels, instrument = 'soprano') {
  // The song's own instrument first: a low-G ukulele's tab is labelled just like a high-G one
  const own = profile(instrument).id;
  const ownStrings = TUNINGS[own];
  const norm = (l) => l.replace('♯', '#').replace('♭', 'b').toUpperCase();
  if (ownStrings.length === labels.length && ownStrings.every(([label], i) => label.toUpperCase() === norm(labels[i]))) {
    return { name: own, strings: ownStrings };
  }
  const byLabels = tuningFromLabels(labels);
  if (byLabels) return { name: byLabels, strings: TUNINGS[byLabels] };
  // Some strings left out (only the ones used are written): fine if every name is a string
  // of one ukulele tuning, in the right top-to-bottom order
  const order = (name) => labels.map((l) => TUNINGS[name].findIndex(([n]) => n.toUpperCase() === l.replace('♯', '#').toUpperCase()));
  const preferred = [...new Set([own, ...(own === 'baritone' ? ['baritone', 'soprano'] : ['soprano', 'baritone'])])].filter((n) => TUNINGS[n].length === 4);
  for (const name of preferred) {
    const idx = order(name);
    if (idx.every((x, i) => x >= 0 && (i === 0 || x > idx[i - 1]))) return { name, strings: TUNINGS[name], partial: true };
  }
  const fallback = preferred[0];
  return { name: fallback, strings: TUNINGS[fallback], guessed: true };
}

/** Which tuning string each written line is (by its name), or its position as a fallback. */
function stringIndexes(lines, tuning) {
  return lines.map((l, k) => {
    const i = tuning.strings.findIndex(([n]) => n.toUpperCase() === l.label.replace('♯', '#').toUpperCase());
    return tuning.guessed || i < 0 ? k : i;
  });
}

/** Read the notes out of one string line's music. */
function readLineNotes(body, offset) {
  const notes = [];
  let i = 0;
  while (i < body.length) {
    if (/[0-9]/.test(body[i])) {
      let text = body[i];
      // two-digit frets (10–24)
      if (/[0-9]/.test(body[i + 1] || '') && Number(body[i] + body[i + 1]) <= 24) text += body[i + 1];
      const after = body[i + text.length] || '';
      const before = body[i - 1] || '';
      let technique = null;
      if (/[hpbr/\\~]/i.test(before)) technique = TECHNIQUES[before.toLowerCase()] || null;
      notes.push({ column: offset + i, fret: Number(text), text, technique, after });
      i += text.length;
    } else if (/x/i.test(body[i]) && /[-|]/.test(body[i - 1] || '-') && /[-|]/.test(body[i + 1] || '-')) {
      notes.push({ column: offset + i, fret: null, text: body[i], technique: 'muted' });
      i += 1;
    } else {
      i += 1;
    }
  }
  return notes;
}

/**
 * parseTab(text, { instrument }) → model.
 * Lines that aren't string lines (chord names above the tab, words, "x2") are kept as
 * `text` lines in place, so writing the model back gives the same layout.
 */
function parseTab(text, options = {}) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const systems = [];
  const items = [];          // in order: { kind: 'system', system } | { kind: 'text', text }
  const warnings = [];
  let current = null;

  lines.forEach((line, index) => {
    if (isStringLine(line, { strict: false })) {
      if (!current) {
        current = { lines: [], firstLine: index };
        systems.push(current);
        items.push({ kind: 'system', system: current });
      }
      const m = line.match(STRING_LINE_RE);
      current.lines.push({ label: m[1], separator: m[2], body: m[3], index, raw: line, prefix: line.slice(0, line.length - m[3].length) });
    } else {
      current = null;
      items.push({ kind: 'text', text: line, index });
    }
  });

  const allNotes = [];
  systems.forEach((system, s) => {
    const labels = system.lines.map((l) => l.label);
    const tuning = tuningFor(labels, options.instrument);
    system.tuning = tuning;
    const lineNo = (k) => (options.firstLine || 1) + system.lines[k].index;
    const where = `Tab lines ${lineNo(0)}–${lineNo(system.lines.length - 1)}`;

    if (system.lines.length > tuning.strings.length || (tuning.guessed && system.lines.length !== tuning.strings.length)) {
      warnings.push(`${where}: ${system.lines.length} string lines; a ${tuning.name} ukulele has ${tuning.strings.length} (${tuning.strings.map(([n]) => n).join(' ')}).`);
    } else if (tuning.guessed) {
      warnings.push(`${where}: string names ${labels.join(' ')} don't match a ukulele (expected ${tuning.strings.map(([n]) => n).join(' ')}, top to bottom).`);
    }

    const lengths = system.lines.map((l) => l.body.replace(/\s+$/, '').length);
    system.width = Math.max(...lengths);
    if (new Set(lengths).size > 1) {
      warnings.push(`${where}: the string lines are different lengths (${lengths.join(', ')} characters), so notes may not line up.`);
    }
    const odd = new Set();
    system.lines.forEach((l) => {
      for (const ch of l.body) if (!/[-0-9|:hpbrsxtv~/\\()<>^*.=\s]/i.test(ch)) odd.add(ch);
    });
    if (odd.size) warnings.push(`${where}: symbols the app doesn't know: ${[...odd].join(' ')}`);

    system.notes = [];
    const indexes = stringIndexes(system.lines, tuning);
    system.lines.forEach((l, line) => {
      const k = indexes[line];
      const open = tuning.strings[k] ? tuning.strings[k][1] : null;
      for (const n of readLineNotes(l.body, 0)) {
        const note = {
          system: s,
          column: n.column,
          string: k,
          line,
          label: l.label,
          fret: n.fret,
          text: n.text,
          technique: n.technique,
          midi: open !== null && n.fret !== null ? open + n.fret : null
        };
        note.pitch = note.midi !== null ? pitchName(note.midi) : null;
        system.notes.push(note);
      }
    });
    system.notes.sort((a, b) => a.column - b.column || a.string - b.string);
    allNotes.push(...system.notes);
  });

  return { systems, items, notes: allNotes, warnings };
}

/** Write a model back as tidy text: upper-case string names, every line the same length. */
function writeTab(model) {
  const out = [];
  for (const item of model.items) {
    if (item.kind === 'text') {
      out.push(item.text);
      continue;
    }
    const { system } = item;
    const bodies = system.lines.map((l) => l.body.replace(/\s+$/, ''));
    const width = Math.max(...bodies.map((b) => b.length));
    // If the longest lines end with a bar line, short ones get one too
    const closed = bodies.filter((b) => b.length === width).every((b) => b.endsWith('|'));
    system.lines.forEach((l, k) => {
      const label = system.tuning.name === 'guitar' ? l.label : l.label.toUpperCase();
      let body = bodies[k];
      if (body.length < width) {
        body = closed ? `${body.replace(/\|$/, '')}`.padEnd(width - 1, '-') + '|' : body.padEnd(width, '-');
      }
      out.push(`${label}${l.separator}${body}`);
    });
  }
  return out.join('\n');
}

/**
 * Tidy pasted tab: strings in tuning order with upper-case names, missing strings added as
 * empty lines, all lines the same length. Returns { text, warnings }.
 */
function tidyTab(text, options = {}) {
  const model = parseTab(text, options);
  for (const system of model.systems) {
    const tuning = system.tuning;
    if (tuning.name === 'guitar') continue;
    const labels = system.lines.map((l) => l.label.toUpperCase());
    const expected = tuning.strings.map(([n]) => n);
    // Fill in strings the writer left out (only when every label is a known string)
    if (labels.every((l) => expected.includes(l)) && labels.length < expected.length) {
      const width = Math.max(...system.lines.map((l) => l.body.replace(/\s+$/, '').length));
      const sample = system.lines[0].body;
      const blank = sample.replace(/\s+$/, '').replace(/[^|]/g, '-').padEnd(width, '-');
      system.lines = expected.map((name) => system.lines.find((l) => l.label.toUpperCase() === name)
        || { label: name, separator: '|', body: blank });
    }
  }
  const tidied = writeTab(model);
  // Report what's still wrong after tidying (uneven lengths have been fixed)
  return { text: tidied, warnings: parseTab(tidied, options).warnings };
}

/**
 * Transpose tab by semitones. Each note keeps its string if it can (fret 0–15);
 * otherwise it moves to the string that gives the same pitch with the lowest fret;
 * if no string can play it, it goes up or down an octave (reported).
 * Returns { text, warnings }.
 */
function transposeTab(text, semitones, options = {}) {
  if (!semitones) return { text, warnings: [] };
  // Fill in any strings left out first, so notes can move between strings
  const model = parseTab(tidyTab(text, options).text, options);
  const warnings = [];
  for (const system of model.systems) {
    const tuning = system.tuning.strings;
    if (system.tuning.name === 'guitar' || system.lines.length !== tuning.length) continue;
    // Work on character arrays so frets can be rewritten in place
    const rows = system.lines.map((l) => [...l.body]);
    const taken = new Set(system.notes.map((n) => `${n.column}:${n.string}`));
    const placements = [];
    for (const note of system.notes) {
      if (note.fret === null || note.midi === null) continue;
      let target = note.midi + semitones;
      let place = null;
      const tryPlace = (midi) => {
        const own = midi - tuning[note.string][1];
        if (own >= 0 && own <= MAX_FRET) return { string: note.string, fret: own };
        let best = null;
        tuning.forEach(([, open], k) => {
          const fret = midi - open;
          if (fret < 0 || fret > MAX_FRET || (k !== note.string && taken.has(`${note.column}:${k}`))) return;
          if (!best || fret < best.fret) best = { string: k, fret };
        });
        return best;
      };
      place = tryPlace(target);
      if (!place) {
        for (const shift of [12, -12]) {
          place = tryPlace(target + shift);
          if (place) {
            warnings.push(`Tab: ${note.pitch} moved an octave ${shift > 0 ? 'up' : 'down'} — it doesn't fit on a ukulele in the new key.`);
            target += shift;
            break;
          }
        }
      }
      if (!place) {
        warnings.push(`Tab: ${note.pitch} can't be played in the new key; left as it was.`);
        continue;
      }
      if (place.string !== note.string) {
        taken.delete(`${note.column}:${note.string}`);
        taken.add(`${note.column}:${place.string}`);
      }
      placements.push({ note, place });
    }
    // Clear the old frets, then write the new ones (inserting a column where a fret grows)
    for (const { note } of placements) {
      for (let c = 0; c < note.text.length; c += 1) rows[note.string][note.column + c] = '-';
    }
    // Work right-to-left so inserted columns don't move notes still to be written
    placements.sort((a, b) => b.note.column - a.note.column);
    for (const { note, place } of placements) {
      const digits = String(place.fret);
      const row = rows[place.string];
      const col = note.column;
      let room = 0;
      while (room < digits.length && (row[col + room] === '-' || row[col + room] === undefined)) room += 1;
      if (room < digits.length) {
        const extra = digits.length - room;
        rows.forEach((r) => r.splice(col + room, 0, ...'-'.repeat(extra)));
      }
      for (let c = 0; c < digits.length; c += 1) row[col + c] = digits[c];
    }
    system.lines.forEach((l, k) => { l.body = rows[k].join(''); });
  }
  return { text: writeTab(model), warnings: [...new Set(warnings)] };
}

/**
 * Convert tab written for one instrument to another (e.g. guitar tab for a ukulele),
 * keeping every note's pitch where the new instrument can play it: each note goes on the
 * string where it needs the lowest fret (0–15); notes too low or high move by octaves.
 * Bar lines and spacing are kept. `semitones` changes key at the same time.
 * Tab already for that instrument is just transposed. Returns { text, warnings }.
 */
function convertTab(text, toInstrument, options = {}) {
  const target = profile(toInstrument).id;
  const semitones = Number(options.semitones) || 0;
  const source = parseTab(text, { instrument: target });
  // High-G and low-G ukulele tab is written the same way: keep the fingering
  const differs = (name) => name !== target && !sameShapes(name, target);
  const foreign = source.systems.some((sys) => !sys.tuning.guessed && differs(sys.tuning.name));
  if (!foreign) return transposeTab(text, semitones, { instrument: target });

  const strings = TUNINGS[target];
  const out = [];
  let moved = 0;
  let unplayable = 0;
  for (const item of source.items) {
    if (item.kind === 'text') {
      out.push(item.text);
      continue;
    }
    const { system } = item;
    if (system.tuning.guessed || !differs(system.tuning.name)) {
      // this system is already for the target (or unknown): leave it, transposed
      const own = system.lines.map((l) => `${l.label}${l.separator}${l.body}`).join('\n');
      out.push(transposeTab(own, semitones, { instrument: target }).text);
      continue;
    }
    const width = Math.max(...system.lines.map((l) => l.body.replace(/\s+$/, '').length));
    // bar lines where every written string has one
    const bars = new Set();
    for (let c = 0; c < width; c += 1) if (system.lines.every((l) => l.body[c] === '|')) bars.add(c);
    const rows = strings.map(() => Array.from({ length: width }, (_, c) => (bars.has(c) ? '|' : '-')));
    const taken = new Set();
    const placed = [];
    for (const note of system.notes) {
      if (note.midi === null) continue;
      let midi = note.midi + semitones;
      let place = null;
      for (const shift of [0, 12, -12, 24, -24, 36]) {
        let best = null;
        strings.forEach(([, open], k) => {
          const fret = midi + shift - open;
          if (fret < 0 || fret > MAX_FRET || taken.has(`${note.column}:${k}`)) return;
          if (!best || fret < best.fret) best = { string: k, fret };
        });
        if (best) {
          place = best;
          if (shift) moved += 1;
          midi += shift;
          break;
        }
      }
      if (!place) { unplayable += 1; continue; }
      taken.add(`${note.column}:${place.string}`);
      placed.push({ column: note.column, ...place, technique: note.technique });
    }
    // Right to left, so widening a column for a two-digit fret doesn't move notes still to place
    placed.sort((a, b) => b.column - a.column);
    for (const p of placed) {
      const digits = String(p.fret);
      const row = rows[p.string];
      let room = 0;
      while (room < digits.length && (row[p.column + room] === '-' || row[p.column + room] === undefined)) room += 1;
      if (room < digits.length) {
        const extra = digits.length - room;
        rows.forEach((r) => r.splice(p.column + room, 0, ...'-'.repeat(extra)));
      }
      for (let c = 0; c < digits.length; c += 1) row[p.column + c] = digits[c];
      const mark = { 'hammer-on': 'h', 'pull-off': 'p', 'slide up': '/', 'slide down': '\\', bend: 'b' }[p.technique];
      if (mark && row[p.column - 1] === '-') row[p.column - 1] = mark;
    }
    strings.forEach(([name], k) => out.push(`${name}|${rows[k].join('')}`));
  }
  const warnings = [];
  const from = [...new Set(source.systems.filter((x) => !x.tuning.guessed && x.tuning.name !== target).map((x) => profile(x.tuning.name).name.toLowerCase()))];
  if (moved) warnings.push(`Tab: ${moved} note${moved > 1 ? 's' : ''} from the ${from.join('/')} tab moved by an octave to fit the ${profile(target).name.toLowerCase()}.`);
  if (unplayable) warnings.push(`Tab: ${unplayable} note${unplayable > 1 ? 's' : ''} couldn't be placed on the ${profile(target).name.toLowerCase()}.`);
  return { text: out.join('\n'), warnings, converted: from };
}

/** The empty tab block lines for an instrument: "A|----…|" etc. */
function blankTab(instrumentId, bars = 2, barWidth = 16) {
  return TUNINGS[profile(instrumentId).id].map(([name]) => `${name}|${`${'-'.repeat(barWidth)}|`.repeat(bars)}`);
}

/**
 * Split long tab systems at bar lines so each piece fits in maxChars (for printing).
 * Text lines are left alone.
 */
function wrapTab(text, maxChars) {
  const model = parseTab(text);
  if (!maxChars || !model.systems.length) return text;
  const out = [];
  for (const item of model.items) {
    if (item.kind === 'text') {
      out.push(item.text);
      continue;
    }
    const { system } = item;
    const prefixWidth = Math.max(...system.lines.map((l) => l.label.length + 1));
    const room = maxChars - prefixWidth;
    const body = system.lines[0].body;
    if (body.length <= room) {
      system.lines.forEach((l) => out.push(`${l.label}${l.separator}${l.body}`));
      continue;
    }
    // Break points: bar lines present in every string line
    const cuts = [];
    let start = 0;
    while (start < body.length) {
      let end = Math.min(body.length, start + room);
      if (end < body.length) {
        let best = -1;
        for (let c = end; c > start; c -= 1) {
          if (system.lines.every((l) => l.body[c - 1] === '|')) { best = c; break; }
        }
        if (best > start) end = best;
      }
      cuts.push([start, end]);
      start = end;
    }
    cuts.forEach(([a, b], n) => {
      if (n > 0) out.push('');
      system.lines.forEach((l) => out.push(`${l.label}${l.separator}${l.body.slice(a, b)}`));
    });
  }
  return out.join('\n');
}

/**
 * Timing for playback: tab doesn't say how long notes are, so the spacing between note
 * columns is used — the most common gap counts as half a beat (an eighth note), wider
 * gaps proportionally longer (up to 2 beats). Returns { steps: [{ beat, notes:[note…] }], beats }.
 */
function tabTiming(model, { barBeats = 0 } = {}) {
  if (barBeats > 0) return barTiming(model, barBeats);
  const steps = [];
  let beat = 0;
  for (const system of model.systems) {
    const columns = [...new Set(system.notes.filter((n) => n.midi !== null).map((n) => n.column))].sort((a, b) => a - b);
    if (!columns.length) continue;
    const gaps = columns.slice(1).map((c, i) => c - columns[i]).filter((g) => g > 0);
    const sorted = [...gaps].sort((a, b) => a - b);
    const typical = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 3;
    columns.forEach((column, i) => {
      steps.push({ beat, strings: system.tuning.strings.length, notes: system.notes.filter((n) => n.column === column && n.midi !== null) });
      const gap = i < columns.length - 1 ? columns[i + 1] - column : typical;
      // rounded to the nearest quarter beat so it sounds like rhythm, not drift
      beat += Math.max(0.25, Math.min(2, Math.round(2 * (gap / typical)) / 4));
    });
  }
  return { steps, beats: beat };
}

/**
 * 4.44: timing for tab whose bars are exact (a ```tab 4/4 block, as ukemusic writes picking out):
 * each |…| is one bar of `barBeats` beats, and a note's place in its bar is its time. Long held
 * notes and bars of quarter notes come out right, which the spacing rule can't know.
 */
function barTiming(model, barBeats) {
  const steps = [];
  let base = 0;
  for (const system of model.systems) {
    const body = system.lines[0] ? system.lines[0].body : '';
    const edges = [-1];
    for (let i = 0; i < body.length; i += 1) if (body[i] === '|') edges.push(i);
    if (edges[edges.length - 1] < body.replace(/\s+$/, '').length - 1) edges.push(body.replace(/\s+$/, '').length);
    for (let e = 0; e + 1 < edges.length; e += 1) {
      const start = edges[e] + 1;
      const width = edges[e + 1] - start;
      if (width <= 0) continue;
      const cols = [...new Set(system.notes.filter((n) => n.midi !== null && n.column >= start && n.column < edges[e + 1]).map((n) => n.column))].sort((a, b) => a - b);
      for (const column of cols) {
        steps.push({ beat: base + ((column - start) / width) * barBeats, strings: system.tuning.strings.length, notes: system.notes.filter((n) => n.column === column && n.midi !== null) });
      }
      base += barBeats;
    }
  }
  return { steps, beats: base };
}

/** "```tab 3/4" -> 3 beats a bar (6 counts in 6/8); "```tab" -> 0 (timed by its spacing) */
function tabBarBeats(fence) {
  const m = String(fence || '').match(/^\s*```\s*tab\s+(\d+)\s*\/\s*(\d+)\s*$/i);
  return m ? Number(m[1]) : 0;
}

/** How many whole bars a tab block takes in playback (0 if it has no playable notes). */
function tabBars(text, beatsPerBar = 4, { barBeats = 0 } = {}) {
  const { steps, beats } = tabTiming(parseTab(text), { barBeats });
  return steps.length ? Math.max(1, Math.ceil(beats / beatsPerBar - 1e-9)) : 0;
}

/** Find raw tab in pasted text: [{ start, end }] line ranges (inclusive) of string-line runs. */
function findTabRuns(lines) {
  const runs = [];
  let i = 0;
  while (i < lines.length) {
    if (isStringLine(lines[i])) {
      let j = i;
      while (j + 1 < lines.length && isStringLine(lines[j + 1])) j += 1;
      runs.push({ start: i, end: j });
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return runs;
}

module.exports = {
  barTiming, tabBarBeats,
  TUNINGS,
  MAX_FRET,
  isStringLine,
  tuningFromLabels,
  parseTab,
  writeTab,
  tidyTab,
  transposeTab,
  convertTab,
  blankTab,
  wrapTab,
  tabTiming,
  tabBars,
  findTabRuns,
  pitchName
};
