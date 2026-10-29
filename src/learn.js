// Learn (4.39): helping a song stick. Pure functions (no DOM), unit tested.
//
//   songChanges(ir, library, { tuningName })  the song's chord changes, the hardest first, with
//                                            what each finger does (stays, slides, moves, goes
//                                            down, lifts) and a tip
//   chordMap(ir, schedule, analysis)          each part of the song once, bar by bar, in rows of
//                                            four (a "chord map"), with how often it comes
//   fadePlan(ir, analysis, stage)             for playing from memory: per line, show the chords,
//                                            show them as numbers, or hide them
//   numberedIR(ir, key)                       the song with its chords as numbers in the key
//   keyLegend(chords, fromKey, toKey)         "I = G, IV = C…" for playing it in another key
//   learnSheetHtml(info)                      the learn sheet: one page to learn the song from
const { numeral } = require('./progressions');
const { getChordDefinition } = require('./chord-library');

const FINGER = { 1: 'index', 2: 'middle', 3: 'ring', 4: 'little' };
const ordinal = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th')}`;
const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Where each finger is in a shape: { 1: [{ string, fret }], … } (a barre: several strings) */
function fingerSpots(def) {
  const spots = {};
  (def.frets || []).forEach((fret, string) => {
    const f = (def.fingers || [])[string];
    if (!f || !(fret > 0)) return;
    (spots[f] = spots[f] || []).push({ string, fret });
  });
  return spots;
}

/** What the fingers do going from one shape to the next */
function fingerMoves(fromDef, toDef) {
  const a = fingerSpots(fromDef);
  const b = fingerSpots(toDef);
  const moves = { stay: [], slide: [], move: [], add: [], lift: [] };
  for (const f of [1, 2, 3, 4]) {
    const from = a[f];
    const to = b[f];
    if (!from && !to) continue;
    if (!from) { moves.add.push({ finger: f, to }); continue; }
    if (!to) { moves.lift.push({ finger: f, from }); continue; }
    const key = (s) => s.map((x) => `${x.string}:${x.fret}`).sort().join(',');
    const strings = (s) => s.map((x) => x.string).sort().join(',');
    if (key(from) === key(to)) moves.stay.push({ finger: f, to });
    else if (strings(from) === strings(to)) moves.slide.push({ finger: f, from, to });
    else moves.move.push({ finger: f, from, to });
  }
  return moves;
}

/** How hard a change is: moving fingers to new strings is hardest; a finger that stays helps */
function changeScore(moves, toDef) {
  const barre = toDef.barre ? 2 : 0;
  return moves.move.length * 3 + moves.slide.length * 1.5 + moves.add.length * 1 + moves.lift.length * 0.5 + barre - moves.stay.length * 0.5;
}

function spotText(spots, strings) {
  if (spots.length > 1) return `across the ${spots.map((s) => strings[s.string] || '?').join(' ')} strings at the ${ordinal(spots[0].fret)} fret (a barre)`;
  const s = spots[0];
  return `${strings[s.string] || '?'} string, ${ordinal(s.fret)} fret`;
}

/** A sentence about a change, the useful part first: what stays, what slides */
function changeTip(moves, strings) {
  const bits = [];
  for (const m of moves.stay) bits.push(`keep your ${FINGER[m.finger]} finger where it is (${spotText(m.to, strings)})`);
  for (const m of moves.slide) bits.push(`slide your ${FINGER[m.finger]} finger along the ${strings[m.to[0].string] || '?'} string to the ${ordinal(m.to[0].fret)} fret`);
  // (4.41: a barre is "across the G C E strings", not "on the across the…")
  const onto = (verb, spots) => (spots.length > 1 ? `${verb} ${spotText(spots, strings)}` : `${verb === 'move' ? 'to' : 'on'} the ${spotText(spots, strings)}`);
  for (const m of moves.move) bits.push(`move your ${FINGER[m.finger]} finger ${onto('move', m.to).replace(/^move /, '')}`);
  for (const m of moves.add) bits.push(`put your ${FINGER[m.finger]} finger ${onto('put', m.to).replace(/^put /, '')}`);
  for (const m of moves.lift) bits.push(`lift your ${FINGER[m.finger]} finger`);
  if (!bits.length) return 'The same shape: nothing to change.';
  const text = bits.join('; ');
  return text.charAt(0).toUpperCase() + text.slice(1) + '.';
}

/** The chords in the order they're played (holds and N.C. left out) */
function chordSequence(ir) {
  const out = [];
  for (const n of ir || []) {
    if (n.type !== 'chord' || n.noChord || n.hidden || !n.content) continue;
    out.push(n.content);
  }
  return out;
}

/**
 * The song's chord changes: [{ from, to, count, score, moves, tip, missing }], hardest first
 * (ties: the most played first). A change both ways (C→G, G→C) is two entries: they're
 * different movements.
 */
function songChanges(ir, library, { tuningName = 'GCEA' } = {}) {
  const strings = String(tuningName).split('');
  const seq = chordSequence(ir);
  const counts = new Map();
  for (let i = 1; i < seq.length; i += 1) {
    if (seq[i] === seq[i - 1]) continue;
    const k = `${seq[i - 1]}\u0000${seq[i]}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const out = [];
  for (const [k, count] of counts) {
    const [from, to] = k.split('\u0000');
    const a = library ? getChordDefinition(library, from) : null;
    const b = library ? getChordDefinition(library, to) : null;
    if (!a || !b) { out.push({ from, to, count, score: 0, moves: null, tip: '', missing: true }); continue; }
    const moves = fingerMoves(a, b);
    out.push({ from, to, count, score: changeScore(moves, b), moves, tip: changeTip(moves, strings) });
  }
  return out.sort((x, y) => y.score - x.score || y.count - x.count);
}

/**
 * The song bar by bar, from the playback schedule: [{ chords: ['C'] | ['C', 'G7'], line }]
 * (a bar with two chords lists both; the count-in is left out)
 */
function barsOf(schedule) {
  const slots = (schedule && schedule.bars) || [];
  if (!slots.length) return [];
  const first = slots[0];
  const barLength = (first.beats || schedule.beatsPerBar || 4) * (first.unit || 60 / (schedule.tempo || 100));
  const t0 = first.time;
  const bars = [];
  for (const slot of slots) {
    const index = Math.floor((slot.time - t0) / barLength + 1e-6);
    const bar = bars[index] || (bars[index] = { chords: [], line: slot.line });
    const name = slot.rest ? 'N.C.' : (slot.tab ? 'tab' : slot.chord);
    if (bar.chords[bar.chords.length - 1] !== name) bar.chords.push(name);
  }
  // a bar the schedule skipped (shouldn't happen) is shown empty rather than shifting the rest
  for (let i = 0; i < bars.length; i += 1) if (!bars[i]) bars[i] = { chords: [], line: 0 };
  return bars;
}

/** The blocks (verse, chorus…) of the song with the lines in each, in order */
function blockLines(ir) {
  const { songBlocks } = require('./progressions');
  return songBlocks(ir).map((b) => ({ first: b.first, label: b.label, lines: b.lines.map((l) => l.line), words: Object.fromEntries(b.lines.map((l) => [l.line, l.words || ''])) }));
}

// 4.40.2: the first few words of a line, as a cue ("Baby love, my baby…")
function cueWords(text, count = 6) {
  const words = plainWords(text).split(' ').filter(Boolean);
  if (!words.length) return '';
  return words.length > count ? `${words.slice(0, count).join(' ').replace(/[,;:.!?]+$/, '')}…` : words.join(' ');
}
const normCue = (t) => plainWords(t).toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Where the familiar progressions are in a part, bar by bar (4.40.2), so the sheet can mark them:
 * [{ n, name, hint, steps, chords, start: { row, bar }, end: { row, bar }, words, round }]
 * round: it finishes on the part's first chord (the next time round, or the next part).
 */
function partPatterns(rows, key = null) {
  const { PATTERNS, morePatterns } = require('./progressions');
  const core = (n) => String(n).replace(/(maj7|7|9|11|13|6|sus2|sus4|sus|add9)$/, '');
  const seq = [];
  rows.forEach((row, r) => row.forEach((bar, b) => bar.numerals.forEach((num, k) => {
    const c = core(num);
    if (!seq.length || seq[seq.length - 1].core !== c) seq.push({ core: c, chord: bar.chords[k], row: r, bar: b, words: row.words || '' });
  })));
  if (seq.length < 2) return [];
  const loop = [...seq, ...seq.slice(0, 3).map((x) => ({ ...x, round: true }))];
  const found = [];
  // 4.41: a loop and the same loop started elsewhere (Four-chord pop and Sad four-chord) once
  const rotationOf = (a, b) => a.length === b.length && [...b, ...b].join(' ').includes(a.join(' '));
  for (const p of PATTERNS) {
    if (found.some((f) => f.name === p.name || rotationOf(p.steps, f.steps))) continue;
    // a short pattern only counts inside the part, not round its end (C G7 | C is just the next verse)
    const reach = p.steps.length <= 3 ? seq.length : loop.length;
    for (let i = 0; i < seq.length && i + p.steps.length <= reach; i += 1) {
      if (!p.steps.every((step, k) => loop[i + k].core === step)) continue;
      const span = loop.slice(i, i + p.steps.length);
      const last = [...span].reverse().find((x) => !x.round) || span[0];
      found.push({ name: p.name, hint: p.hint, steps: p.steps, chords: span.map((x) => x.chord), start: { row: span[0].row, bar: span[0].bar }, end: { row: last.row, bar: last.bar }, words: span[0].words, round: span.some((x) => x.round) });
      break;
    }
  }
  // a short one inside a longer one found here says less: drop it
  const kept = found.filter((f) => !found.some((g) => g !== f && g.steps.length > f.steps.length && g.steps.join(' ').includes(f.steps.join(' '))));
  // 4.48: a circle-of-fifths run anywhere, and the part as one loop
  for (const x of morePatterns(seq.map((s) => s.core), kept, { minor: Boolean(key && key.mode === 'minor') })) {
    const span = seq.slice(x.start, x.start + x.length);
    if (!span.length) continue;
    const last = span[span.length - 1];
    kept.push({ name: x.name, hint: x.hint, steps: x.steps, chords: span.map((s) => s.chord).concat(x.steps.length > span.length ? [seq[0].chord] : []), start: { row: span[0].row, bar: span[0].bar }, end: { row: last.row, bar: last.bar }, words: span[0].words, round: false });
  }
  // numbered in the order they come in the song
  kept.sort((a, b) => a.start.row - b.start.row || a.start.bar - b.start.bar);
  return kept.map((f, i) => ({ ...f, n: i + 1 }));
}

/**
 * The chord map: each part once, bar by bar. analysis: from progressions.analyse(ir).
 *   { route: [{ letter, name, times }], parts: [{ letter, name, times, rows: [[bar…]…], numbers }] }
 * bar = { chords: ['C'], numerals: ['I'] }. Rows of four bars.
 */
function chordMap(ir, schedule, analysis) {
  const bars = barsOf(schedule);
  const blocks = blockLines(ir);
  const key = analysis && analysis.key;
  // 4.49: after a key change written in the song ({key: A}), the numbers are in the new key
  const changes = ((analysis && analysis.keyChanges) || []).filter((c) => !c.detected).sort((a, b) => a.line - b.line);
  const keyAt = (line) => { let at = key; for (const c of changes) if (c.line <= line) at = c.key; return at; };
  const blockOf = (line) => {
    let found = -1;
    blocks.forEach((b, i) => { if (b.lines.includes(line) || (b.first <= line && found === -1 && i === blocks.length - 1)) found = i; });
    if (found >= 0) return found;
    // a line outside the blocks belongs to the block before it
    for (let i = blocks.length - 1; i >= 0; i -= 1) if (blocks[i].first <= line) return i;
    return 0;
  };
  const perBlock = blocks.map(() => []);
  for (const bar of bars) if (blocks.length && !bar.chords.every((c) => c === 'tab')) perBlock[blockOf(bar.line)].push(bar);
  const sections = (analysis && analysis.sections) || [];
  const parts = [];
  for (const p of (analysis && analysis.parts) || []) {
    // the longest time the part comes (the first if they're the same)
    let best = null;
    sections.forEach((s, i) => {
      if (s.letter !== p.letter || !perBlock[i]) return;
      if (!best || perBlock[i].length > best.length) best = perBlock[i];
    });
    const shown = (best || []).map((b) => ({
      chords: b.chords,
      numerals: b.chords.map((c) => (key && c !== 'N.C.' && c !== 'tab' ? numeral(c, keyAt(b.line)) : c)),
      line: b.line
    }));
    // a row per line of the song (its phrases), a long line wrapping at six bars
    const rows = [];
    const bestBlock = blocks[perBlock.indexOf(best)];
    for (const bar of shown) {
      const row = rows[rows.length - 1];
      if (row && row[0].line === bar.line && row.length < 6) row.push(bar);
      else {
        const next = [bar];
        next.words = bestBlock && rows.every((r) => r[0].line !== bar.line) ? cueWords(bestBlock.words[bar.line]) : '';
        rows.push(next);
      }
    }
    // the same words every time it comes (learn them once), mostly the same, some coming back,
    // or new words each time (4.41: times with no words, like an intro, don't count)
    const said = sections.map((s, i) => (s.letter === p.letter && blocks[i] ? normCue(Object.values(blocks[i].words).join(' ')) : null)).filter((w) => w);
    const alike = (a, b) => { const A = new Set(a.split(' ')); const B = new Set(b.split(' ')); let n = 0; for (const w of A) if (B.has(w)) n += 1; return n / Math.max(1, new Set([...A, ...B]).size); };
    let wordsEach = '';
    if (said.length >= 2) {
      const pairs = [];
      for (let i = 0; i < said.length; i += 1) for (let j = i + 1; j < said.length; j += 1) pairs.push(alike(said[i], said[j]));
      if (said.every((w) => w === said[0])) wordsEach = 'same';
      else if (pairs.every((x) => x >= 0.5)) wordsEach = 'mostly';
      else if (pairs.some((x) => x >= 0.8)) wordsEach = 'some';
      else wordsEach = 'new';
    }
    const marks = key ? partPatterns(rows, key) : [];
    // 4.41: named as the song names it: "Verse 5" for a part heard once, "Chorus and Verse"
    // when the verse and chorus share the chords, so the map and the route agree
    const steps = ((analysis && analysis.route) || []).filter((r) => r.letter === p.letter);
    const base = (n) => String(n || '').replace(/\s+\d+$/, '').trim();
    const names = [...new Set(steps.map((r) => base(r.name)).filter(Boolean))];
    const listed = names.slice(0, 3);
    const name = p.times === 1 && steps[0] && steps[0].name ? steps[0].name : (listed.length > 1 ? `${listed.slice(0, -1).join(', ')} and ${listed[listed.length - 1]}` : (listed[0] || p.name));
    const seq = shown.flatMap((b) => b.chords).filter((c, i, a) => i === 0 || c !== a[i - 1]);
    // 4.49.1: the times it comes in another key (after {key: A}): the same numbers, other shapes
    const moved = [];
    const shownKey = shown.length ? keyAt(shown[0].line) : key;
    const bestIndex = perBlock.indexOf(best);
    const split = (lines) => (lines || []).flatMap((l) => String(l).split(' – ')).filter((c, i, a) => i === 0 || c !== a[i - 1]);
    sections.forEach((sec, i) => {
      if (sec.letter !== p.letter || i === bestIndex || !shownKey) return;
      const at = keyAt(sec.line);
      if (!at || at.name === shownKey.name) return;
      let m = moved.find((x) => x.key === at.name);
      if (!m) {
        const a = split(sections[bestIndex] && sections[bestIndex].chords);
        const b = split(sec.chords);
        const swaps = [];
        if (a.length === b.length) a.forEach((c, j) => { if (!swaps.some(([x]) => x === c)) swaps.push([c, b[j]]); });
        m = { key: at.name, names: [], swaps };
        moved.push(m);
      }
      m.names.push(sec.name);
    });
    // the words in a list of their own: a property on an array is lost crossing to the page
    parts.push({ letter: p.letter, name, times: p.times, rows, words: rows.map((r) => r.words || ''), bars: shown.length, patterns: (p.patterns || []).map((x) => x.name), marks, wordsEach, seq, moved });
  }
  // A part that is just the start of another, another with more on the end, or two others one
  // after the other (4.40.2; 4.41: by the chords in order, however the bars are written)
  const prefix = (a, b) => a.length < b.length && a.every((x, i) => x === b[i]);
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  const startOrAll = (piece, o) => (same(piece, o.seq) ? o.letter : prefix(piece, o.seq) ? `the start of ${o.letter}` : '');
  for (const part of parts) {
    if (!part.bars) continue;
    if (part.seq.length <= 1) { part.like = { how: 'one', text: 'one chord' }; continue; }
    // compare with parts of two chords or more, the most like it first
    // (only parts that come at least as often: the main verse isn't "the start of" a last verse)
    const others = parts.filter((o) => o !== part && o.seq.length >= 2 && o.times >= part.times).sort((a, b) => b.times - a.times || b.bars - a.bars);
    const longer = others.find((o) => prefix(part.seq, o.seq));
    if (longer) { part.like = { letter: longer.letter, how: 'start', text: `the start of ${longer.letter}` }; continue; }
    const shorter = others.find((o) => prefix(o.seq, part.seq));
    if (shorter) {
      const rest = part.seq.slice(shorter.seq.length);
      const restJoined = [shorter.seq[shorter.seq.length - 1], ...rest];
      // the rest is the start of it again (a last verse that repeats its opening)
      const again = prefix(rest, shorter.seq) || prefix(restJoined, shorter.seq);
      part.like = again
        ? { letter: shorter.letter, how: 'again', text: `${shorter.letter}, then the start of ${shorter.letter} again` }
        : { letter: shorter.letter, how: 'more', text: `${shorter.letter} with ${rest.length} more chord change${rest.length === 1 ? '' : 's'}` };
      continue;
    }
    // two others, one after the other (where they meet, the chord may be shared)
    const any = parts.filter((o) => o !== part && o.seq.length >= 2);
    let found = null;
    for (let k = 2; k <= part.seq.length - 2 && !found; k += 1) {
      const left = part.seq.slice(0, k);
      for (const right of [part.seq.slice(k), part.seq.slice(k - 1)]) {
        for (const x of any) {
          const l = startOrAll(left, x);
          if (!l) continue;
          for (const y of any) {
            const r = startOrAll(right, y);
            if (r && !(x === y && l === r)) { found = { how: 'join', letter: x.letter, text: `${l}, then ${r}` }; break; }
          }
          if (found) break;
        }
        if (found) break;
      }
    }
    if (found) part.like = found;
  }
  for (const part of parts) delete part.seq;
  const width = Math.max(1, ...parts.flatMap((p) => p.rows.map((r) => r.length)));
  return { key, route: (analysis && analysis.route) || [], parts, width };
}

/**
 * Playing from memory: stage 'repeats' hides the chords after the first time each part comes,
 * 'numbers' shows every chord as its number in the key, 'none' hides them all.
 * -> { lines: { line: 'show' | 'number' | 'hide' }, fallback }   (a plain object: it crosses
 *    from the preload to the page)
 */
function fadePlan(ir, analysis, stage = 'repeats') {
  const lines = {};
  const blocks = blockLines(ir);
  const sections = (analysis && analysis.sections) || [];
  const seen = new Set();
  blocks.forEach((b, i) => {
    const letter = sections[i] ? sections[i].letter : String(i);
    const repeat = seen.has(letter);
    seen.add(letter);
    const mode = stage === 'none' ? 'hide' : stage === 'numbers' ? 'number' : (repeat ? 'hide' : 'show');
    for (const line of [b.first, ...b.lines]) lines[line] = mode;
  });
  // 4.43: tab fades too: a passage heard before (the same tab) is from memory
  const seenTab = new Set();
  for (const n of ir || []) {
    if (n.type !== 'tab' || !n.content) continue;
    const k = String(n.content).replace(/\s+$/gm, '');
    lines[n.line] = stage === 'none' ? 'hide' : stage === 'numbers' ? 'number' : (seenTab.has(k) ? 'hide' : 'show');
    seenTab.add(k);
  }
  return { lines, fallback: stage === 'none' ? 'hide' : stage === 'numbers' ? 'number' : 'show' };
}

/** The song with its chords as numbers in the key (for showing on the sheet) */
function numberedIR(ir, key) {
  if (!key) return ir;
  return (ir || []).map((n) => (n.type === 'chord' && !n.noChord && n.content ? { ...n, content: numeral(n.content, key), numeral: true } : n));
}

/** "I = G, IV = C, V7 = D7…": each different number the song uses, and its chord in another key */
function keyLegend(chords, fromKey, toKey) {
  if (!fromKey || !toKey) return [];
  const { transposeChordInKey } = require('./keys');
  const { transposeChord } = require('./transpose');
  const shift = (toKey.tonic - fromKey.tonic + 12) % 12;
  const common = (name, s) => transposeChord(name, s, { spelling: 'common' });
  const seen = new Set();
  const out = [];
  for (const c of chords) {
    const n = numeral(c, fromKey);
    if (seen.has(n)) continue;
    seen.add(n);
    out.push({ numeral: n, chord: transposeChordInKey(c, shift, fromKey, common) });
  }
  return out;
}


// ── 4.40: the circle of fifths ──
const OUTER = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const INNER = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];
/** Where a chord sits on the circle: { ring: 'outer'|'inner', pos: 0…11 } (C at the top), or null */
function circlePlace(chordName) {
  const { parseChordName } = require('./chord-names');
  const p = parseChordName(String(chordName || ''));
  if (!p || p.rootIndex === undefined) return null;
  const s = String(p.suffix || '');
  if (/^(dim|°|m7b5|ø)/.test(s)) return null;                       // diminished: not on the circle
  const minor = /^m(?!aj)/.test(s) || /^min/.test(s);
  const pc = minor ? (p.rootIndex + 3) % 12 : p.rootIndex;          // a minor sits by its relative major
  return { ring: minor ? 'inner' : 'outer', pos: (pc * 7) % 12 };
}
const stepsAround = (a, b) => { let d = ((b - a) % 12 + 12) % 12; if (d > 6) d -= 12; return d; };

/** The key's family on the circle: its home and the two either side (outer and inner rings) */
function keyFamily(key) {
  if (!key) return null;
  const home = key.mode === 'minor' ? (key.tonic + 3) % 12 : key.tonic;
  const pos = (home * 7) % 12;
  return [(pos + 11) % 12, pos, (pos + 1) % 12];
}

/** The most-played changes between different places on the circle: [{ from, to, count, a, b }] */
function circleMoves(ir, limit = 5) {
  const seq = chordSequence(ir);
  const counts = new Map();
  for (let i = 1; i < seq.length; i += 1) {
    const a = circlePlace(seq[i - 1]);
    const b = circlePlace(seq[i]);
    if (!a || !b || (a.ring === b.ring && a.pos === b.pos)) continue;
    const k = `${seq[i - 1]}\u0000${seq[i]}`;
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).slice(0, limit).map(([k, count]) => {
    const [from, to] = k.split('\u0000');
    return { from, to, count, a: circlePlace(from), b: circlePlace(to) };
  });
}

/**
 * 4.41: why a chord from outside the key's family is there: the five of another chord, borrowed
 * from the key's minor (or major) twin, or a passing colour
 */
function outsideWhy(chord, key, seq = []) {
  const { parseChordName } = require('./chord-names');
  const p = parseChordName(String(chord));
  if (!p || p.rootIndex === undefined || !key) return 'a passing colour';
  const s = String(p.suffix || '');
  const minor = /^m(?!aj)/.test(s) || /^min/.test(s);
  const dim = /^(dim|°|m7b5|ø)/.test(s);
  const rel = (p.rootIndex - key.tonic + 12) % 12;
  const twin = key.mode === 'minor' ? `${OUTER[(key.tonic * 7) % 12]} major` : `${INNER[(((key.tonic + 3) % 12) * 7) % 12].replace(/m$/, '')} minor`;
  const n = numeral(chord, key);
  if (key.mode === 'major') {
    if (minor && rel === 5) return `the sad four (${n}), borrowed from ${twin}`;
    if (!minor && [3, 8, 10].includes(rel)) return `${n}, borrowed from ${twin}: a darker colour`;
    if (minor && rel === 7) return `a soft five (${n}), borrowed from ${twin}`;
    if (minor && rel === 0) return `home turned minor, borrowed from ${twin}`;
  } else {
    if (!minor && !dim && rel === 5) return `a brighter four (${n}), borrowed from ${twin} (the Dorian sound)`;
    if (!minor && !dim && rel === 0) return `home turned major (${n})`;
  }
  // a major or seventh chord a fifth above one of the key's chords: "the five of" that chord
  if (!minor && !dim) {
    const target = (p.rootIndex + 5) % 12;
    // (in a minor key its five is the major chord: E7 leads to A in D minor)
    const steps = key.mode === 'minor' ? [[0, 'm'], [3, ''], [5, 'm'], [7, ''], [8, ''], [10, '']] : [[2, 'm'], [4, 'm'], [5, ''], [7, ''], [9, 'm']];
    const hit = steps.find(([r]) => (key.tonic + r) % 12 === target);
    if (hit) {
      const names = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
      const t = `${names[target]}${hit[1]}`;
      // say "it leads to" only when the song does go there next, most of the times it's played
      const tp = parseChordName(t);
      const after = [];
      for (let i = 0; i + 1 < seq.length; i += 1) if (seq[i] === chord) after.push(seq[i + 1]);
      const goes = after.filter((x) => { const q = parseChordName(x); return q && q.rootIndex === tp.rootIndex; }).length;
      return goes && goes * 2 >= after.length ? `the five of ${t} (${n}): it leads to ${t}` : `the five of ${t} (${n}), here used as a colour on the way somewhere else`;
    }
  }
  return `a passing colour (${n})`;
}

/**
 * 4.49.1: the circle is drawn for the key the song starts in: the song up to its first key change
 * ({key: A} after the first chord), and the change and the chord that leads into it, if any
 */
function openingIr(ir) {
  const nodes = ir || [];
  const firstChord = nodes.find((n) => n.type === 'chord' && !n.noChord && n.content && typeof n.line === 'number');
  const change = firstChord && nodes.find((n) => n.type === 'keychange' && typeof n.line === 'number' && n.line > firstChord.line);
  if (!change) return { ir: nodes, change: null };
  const before = nodes.filter((n) => typeof n.line !== 'number' || n.line < change.line);
  const last = chordSequence(before).pop() || '';
  return { ir: before, change: require('./keys').parseKey(change.content), lead: last };
}

/** A few sentences about how the song sits on the circle */
function circleNotes(ir, key) {
  const opened = openingIr(ir);
  ir = opened.ir;
  const chords = [...new Set(chordSequence(ir))];
  const fam = keyFamily(key);
  const notes = [];
  if (fam) notes.push(key.mode === 'minor'
    ? `Home is ${key.name}, ringed at the top (inside, under its relative major ${OUTER[fam[1]]}). The chords either side of it are its family, numbered round the circle. A minor key also has its own five, a major chord (${OUTER[(fam[1] + 4) % 12]} or ${OUTER[(fam[1] + 4) % 12]}7): the strongest way home.`
    : `Home is ${key.name}, ringed at the top. Its closest chords sit either side: IV to the left, V to the right, and the minors ii, vi and iii inside.`);
  const placed = chords.map((c) => ({ c, at: circlePlace(c) })).filter((x) => x.at);
  // in a minor key, its major five (E or E7 in A minor) is family too, though it sits apart
  const minorFive = (c) => key && key.mode === 'minor' && /^V/.test(numeral(c, key));
  if (key && fam) {
    const inside = placed.filter((x) => fam.includes(x.at.pos) || minorFive(x.c)).map((x) => x.c);
    const outside = placed.filter((x) => !fam.includes(x.at.pos) && !minorFive(x.c)).map((x) => x.c);
    if (!outside.length) notes.push(`All ${inside.length === 1 ? 'its chord sits' : `${inside.length} of its chords sit`} in the key's family${placed.some((x) => minorFive(x.c)) ? ' (the shaded part, and its five)' : ' (the shaded part)'}, so it all belongs together.`);
    else {
      notes.push(`${inside.length ? `${inside.join(', ')} ${inside.length === 1 ? 'is' : 'are'} in the key's family. ` : ''}From outside it:`);
      const seq = chordSequence(ir);
      for (const c of outside) {
        const leads = opened.change && c === opened.lead && /^V/.test(numeral(c, opened.change));
        notes.push(`${c}: ${leads ? `the five of ${opened.change.name}: it leads into the key change` : outsideWhy(c, key, seq)}.`);
      }
    }
  }
  if (opened.change && key) {
    const d = stepsAround(circlePlace(key.name).pos, circlePlace(opened.change.name).pos);
    notes.push(`Then the song changes key to ${opened.change.name}: home moves ${Math.abs(d) === 1 ? 'one step' : `${Math.abs(d)} steps`} ${d < 0 ? 'anticlockwise' : 'clockwise'} round the circle, and the chords go with it, the same numbers. (The circle here is the key it starts in, ${key.name}.)`);
  }
  const homePos = fam ? fam[1] : null;
  const homeRing = key && key.mode === 'minor' ? 'inner' : 'outer';
  for (const m of circleMoves(ir, 4)) {
    const d = stepsAround(m.a.pos, m.b.pos);
    const home = key && m.b.pos === homePos && m.b.ring === homeRing;
    const from = key ? numeral(m.from, key).replace(/(maj7|7|9|11|13|6|sus2|sus4|sus|add9)$/, '') : '';
    let how;
    // 4.41: what the move does goes by the chords' numbers first, then by the circle
    if (home && /^(V|vii°)$/.test(from)) how = 'five to one: the strongest pull home';
    else if (home && /^(IV|iv)$/.test(from)) how = 'four to one, the "Amen" sound';
    else if (/^(II)$/.test(from) && key && /^V/.test(numeral(m.to, key))) how = 'the five of five, on to five';
    else if (/^(I|i)$/.test(from) && key && /^V(7)?$/.test(numeral(m.to, key))) how = 'from home out to five: the tension that pulls straight back';
    else if (m.a.pos === m.b.pos) how = m.b.ring === 'inner' ? 'to its relative minor, just inside it on the circle' : 'out to its relative major';
    else if (m.a.ring === m.b.ring && d === -1) how = `one step anticlockwise (down a fifth)${home ? ' and home' : ': the way music likes to move'}`;
    else if (m.a.ring === m.b.ring && d === 1) how = `one step clockwise (up a fifth)${home ? ' and home' : ''}`;
    else if (Math.abs(d) === 1) how = `one step ${d < 0 ? 'anticlockwise' : 'clockwise'}, ${m.b.ring === 'inner' ? 'in to the minors' : 'out to the majors'}${home ? ', and home' : ''}`;
    else if (Math.abs(d) === 2) how = `two steps ${d < 0 ? 'anticlockwise' : 'clockwise'}${home ? ' and home' : ''}`;
    else how = `${Math.abs(d)} steps round the circle: a jump${home ? ' home' : ''}`;
    const nums = key ? ` (${numeral(m.from, key)} → ${numeral(m.to, key)})` : '';
    notes.push(`${m.from} → ${m.to}${nums}${m.count > 1 ? `, ${m.count} times` : ''}: ${how}.`);
  }
  return notes;
}

/**
 * The circle of fifths as an SVG: the twelve major chords round the outside, their relative
 * minors inside; the key's family shaded, the song's chords lit (named as the song writes them),
 * and arrows for its main moves.
 */
function circleSvg(ir, key, { size = 440 } = {}) {
  ir = openingIr(ir).ir;
  const c = size / 2;
  const rOut = size * 0.36;
  const rIn = size * 0.245;
  // 4.40.1: turned so the key's home chord is at the top, its neighbours either side
  const fam = keyFamily(key);
  const rot = fam ? fam[1] : 0;
  const A = (pos) => ((pos - rot) * Math.PI) / 6;
  const at = (pos, r) => [c + r * Math.sin(A(pos)), c - r * Math.cos(A(pos))];
  const chords = [...new Set(chordSequence(ir))];
  const lit = new Map(); // "outer:3" -> names
  for (const ch of chords) {
    const p = circlePlace(ch);
    if (!p) continue;
    const k = `${p.ring}:${p.pos}`;
    lit.set(k, [...(lit.get(k) || []), ch]);
  }
  const parts = [];
  parts.push(`<circle cx="${c}" cy="${c}" r="${rOut + size * 0.07}" fill="none" stroke="#c9d6d2"/>`);
  // the key's family: a shaded wedge three places wide
  if (fam) {
    const a0 = -1.5 * Math.PI / 6;
    const a1 = 1.5 * Math.PI / 6;
    const R = rOut + size * 0.065;
    const r0 = rIn - size * 0.075;
    const pt = (ang, r) => `${(c + r * Math.sin(ang)).toFixed(1)} ${(c - r * Math.cos(ang)).toFixed(1)}`;
    parts.push(`<path d="M ${pt(a0, r0)} L ${pt(a0, R)} A ${R} ${R} 0 0 1 ${pt(a1, R)} L ${pt(a1, r0)} A ${r0} ${r0} 0 0 0 ${pt(a0, r0)} Z" fill="#dcefeb"/>`);
  }
  // the main moves. Between neighbours: an arc that follows the ring (anticlockwise just
  // outside it, clockwise just inside), so a change and its way back don't sit on each other;
  // otherwise a gentle curve across. Each with a small arrowhead.
  const moves = circleMoves(ir, 5);
  const most = moves.length ? moves[0].count : 1;
  const head = (x, y, ang, w) => {
    const L = size * 0.03; const W = size * 0.017;
    const bx = x - L * Math.cos(ang); const by = y - L * Math.sin(ang);
    const px = -Math.sin(ang) * W; const py = Math.cos(ang) * W;
    return `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} L ${(bx + px).toFixed(1)} ${(by + py).toFixed(1)} L ${(bx - px).toFixed(1)} ${(by - py).toFixed(1)} Z" fill="#b22222" fill-opacity="${w}"/>`;
  };
  for (const m of moves) {
    const w = (size * (0.004 + (0.005 * m.count) / most)).toFixed(1);
    const op = (0.55 + (0.4 * m.count) / most).toFixed(2);
    const turn = stepsAround(m.a.pos, m.b.pos);
    if (m.a.ring === m.b.ring && Math.abs(turn) === 1) {
      const base = m.a.ring === 'outer' ? rOut : rIn;
      const r = base + (turn < 0 ? 1 : -1) * size * (m.a.ring === 'outer' ? 0.078 : 0.07);
      const gap = 0.13; // stop short of each chord (radians)
      const a0 = A(m.a.pos) + (turn > 0 ? gap : -gap);
      const a1 = A(m.a.pos) + turn * (Math.PI / 6) - (turn > 0 ? gap : -gap);
      const pt = (ang) => [c + r * Math.sin(ang), c - r * Math.cos(ang)];
      const [x0, y0] = pt(a0); const [x1, y1] = pt(a1);
      parts.push(`<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${turn > 0 ? 1 : 0} ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="#b22222" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`);
      // the direction of travel at the end of the arc (its tangent)
      const tang = turn > 0 ? a1 : a1 + Math.PI;
      parts.push(head(x1, y1, tang, op));
    } else {
      const [x1, y1] = at(m.a.pos, m.a.ring === 'outer' ? rOut : rIn);
      const [x2, y2] = at(m.b.pos, m.b.ring === 'outer' ? rOut : rIn);
      const dx = x2 - x1; const dy = y2 - y1; const len = Math.hypot(dx, dy) || 1;
      const padA = size * (m.a.ring === 'outer' ? 0.052 : 0.045) + 3;
      const padB = size * (m.b.ring === 'outer' ? 0.052 : 0.045) + 3;
      const sx = x1 + (dx / len) * padA; const sy = y1 + (dy / len) * padA;
      const ex = x2 - (dx / len) * padB; const ey = y2 - (dy / len) * padB;
      const mx = (sx + ex) / 2 + (c - (sx + ex) / 2) * 0.25; const my = (sy + ey) / 2 + (c - (sy + ey) / 2) * 0.25;
      parts.push(`<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="#b22222" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round"/>`);
      parts.push(head(ex, ey, Math.atan2(ey - my, ex - mx), op));
    }
  }
  const node = (pos, ring, name) => {
    const [x, y] = at(pos, ring === 'outer' ? rOut : rIn);
    const names = lit.get(`${ring}:${pos}`);
    const r = size * (ring === 'outer' ? 0.052 : 0.045);
    const fs = size * (ring === 'outer' ? 0.042 : 0.034);
    const label = names ? names.join('/') : name;
    const fsUse = names && label.length > 3 ? fs * 0.8 : fs;
    return `<g class="${names ? 'lit' : 'off'}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${names ? '#b22222' : '#fff'}" stroke="${names ? '#b22222' : '#c9d6d2'}"/>`
      + `<text x="${x.toFixed(1)}" y="${(y + fsUse * 0.36).toFixed(1)}" text-anchor="middle" font-size="${fsUse.toFixed(1)}" font-weight="${names ? 800 : 500}" fill="${names ? '#fff' : '#6b7774'}" font-family="Segoe UI, Arial, sans-serif">${esc(label)}</text></g>`;
  };
  OUTER.forEach((n, i) => parts.push(node(i, 'outer', n)));
  INNER.forEach((n, i) => parts.push(node(i, 'inner', n)));
  if (fam) {
    const font = 'font-family="Segoe UI, Arial, sans-serif"';
    // home: ringed, and named in the middle
    const homeRing = key.mode === 'minor' ? 'inner' : 'outer';
    const [hx, hy] = at(rot, homeRing === 'outer' ? rOut : rIn);
    const hr = size * (homeRing === 'outer' ? 0.052 : 0.045) + size * 0.014;
    parts.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${hr.toFixed(1)}" fill="none" stroke="#0e6b64" stroke-width="${(size * 0.009).toFixed(1)}"/>`);
    parts.push(`<text x="${c}" y="${(c - size * 0.01).toFixed(1)}" text-anchor="middle" font-size="${(size * 0.034).toFixed(1)}" fill="#5b6662" ${font}>Key of</text>`);
    parts.push(`<text x="${c}" y="${(c + size * 0.052).toFixed(1)}" text-anchor="middle" font-size="${(size * 0.065).toFixed(1)}" font-weight="800" fill="#0e6b64" ${font}>${esc(key.name)}</text>`);
    parts.push(`<text x="${c}" y="${(c + size * 0.095).toFixed(1)}" text-anchor="middle" font-size="${(size * 0.028).toFixed(1)}" fill="#5b6662" ${font}>home at the top</text>`);
    // numbers for the key's chords and the song's: outside the ring, and inside the minors
    const tag = (pos, ring, name) => {
      const inFam = fam.includes(pos);
      if (!inFam && !lit.has(`${ring}:${pos}`)) return;
      const n = numeral(name, key);
      if (!n) return;
      const [x, y] = at(pos, ring === 'outer' ? rOut + size * 0.112 : rIn - size * 0.098);
      parts.push(`<text x="${x.toFixed(1)}" y="${(y + size * 0.012).toFixed(1)}" text-anchor="middle" font-size="${(size * 0.032).toFixed(1)}" font-weight="700" fill="${pos === rot && ring === homeRing ? '#0e6b64' : '#5b6662'}" ${font}>${esc(n)}</text>`);
    };
    OUTER.forEach((n, i) => tag(i, 'outer', n));
    INNER.forEach((n, i) => tag(i, 'inner', n));
  }
  return `<svg class="circle-of-fifths" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The circle of fifths, with this song's chords">${parts.join('')}</svg>`;
}

// ── 4.40: What comes next? ──
/**
 * Every chord change in the song, in order, with its place in the words:
 * [{ line, from, to, before, after }]  (before: the words up to the change; after: from it on)
 */
function quizSteps(ir) {
  const lines = new Map(); // line -> [{ text } | { chord }]
  let prev = null;
  const out = [];
  for (const n of ir || []) {
    if (n.type === 'lyric') {
      if (!lines.has(n.line)) lines.set(n.line, []);
      lines.get(n.line).push({ text: String(n.content || '') });
    } else if (n.type === 'chord' && !n.noChord && !n.hidden && n.content) {
      if (!lines.has(n.line)) lines.set(n.line, []);
      const items = lines.get(n.line);
      if (prev && prev !== n.content) out.push({ line: n.line, from: prev, to: n.content, index: items.length, items });
      items.push({ chord: n.content });
      prev = n.content;
    }
  }
  return out.map(({ items, index, ...rest }) => {
    const text = (from, to) => items.slice(from, to).map((x) => x.text || '').join('');
    return { ...rest, before: text(0, index).replace(/\s+/g, ' ').trimStart(), after: text(index).replace(/\s+/g, ' ').trimEnd() };
  });
}

/** The questions for a quiz: the changes once each (a repeated verse isn't asked again), up to `max` */
function quizQuestions(ir, max = 12) {
  const seen = new Set();
  const out = [];
  for (const s of quizSteps(ir)) {
    const k = `${s.from}>${s.to}|${s.before.slice(-20)}|${s.after.slice(0, 20)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Four answers: the right one and three others, the song's own chords first, then the key's
 * family. `seed` makes the order repeatable (for the tests).
 */
function quizOptions(step, songChords, key, seed = 1) {
  const { parseChordName } = require('./chord-names');
  const rootOf = (c) => parseChordName(String(c))?.rootIndex;
  const others = [];
  // not the chord before, and nothing on the same root as the answer (G and G7 would be a quiz about the 7)
  const add = (c) => { if (c && c !== step.from && rootOf(c) !== rootOf(step.to) && !others.some((o) => rootOf(o) === rootOf(c))) others.push(c); };
  for (const c of songChords) add(c);
  if (key) {
    // the key's family: I, IV, V, vi, ii, iii (in a minor key, from its relative major)
    const tonic = key.mode === 'minor' ? (key.tonic + 3) % 12 : key.tonic;
    const major = (pc) => OUTER[(pc * 7) % 12];
    const minor = (pc) => INNER[(((pc + 3) % 12) * 7) % 12];
    for (const c of [major(tonic), major((tonic + 5) % 12), major((tonic + 7) % 12), minor((tonic + 9) % 12), minor((tonic + 2) % 12), minor((tonic + 4) % 12)]) add(c);
  }
  const all = [step.to, ...others.slice(0, 3)];
  // a small repeatable shuffle
  let x = seed * 9301 + 49297;
  for (let i = all.length - 1; i > 0; i -= 1) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

// ── 4.40: trouble spots ──
// Kept in the song's learn folder (trouble-spots.json): { spots: [{ words, chord, line, count, from, last }] }
const plainWords = (text) => String(text || '').replace(/\[[^\]]*\]/g, '').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim();

/** Add (or count again) a spot. from: 'memory' | 'quiz' | 'tap' */
function addTrouble(store, { line, chord = '', words = '', from = 'tap', when = '' }) {
  const spots = (store && store.spots ? store.spots : []).map((s) => ({ ...s }));
  const w = plainWords(words).slice(0, 60);
  const hit = spots.find((s) => s.words === w && s.chord === chord);
  if (hit) {
    hit.count += 1;
    hit.line = line;
    hit.last = when || hit.last;
    if (!hit.from.split(',').includes(from)) hit.from = `${hit.from},${from}`;
  } else spots.push({ words: w, chord, line, count: 1, from, last: when });
  return { spots };
}

/** Find each spot's line again (the song may have been edited): by its words, near where it was */
function placeTrouble(store, songText) {
  const lines = String(songText || '').split(/\r?\n/);
  return (store && store.spots ? store.spots : []).map((s) => {
    if (!s.words) return { ...s };
    const matches = [];
    lines.forEach((l, i) => { if (plainWords(l) && plainWords(l).startsWith(s.words.slice(0, 30))) matches.push(i + 1); });
    if (!matches.length) return { ...s, gone: true };
    const best = matches.reduce((a, b) => (Math.abs(b - s.line) < Math.abs(a - s.line) ? b : a));
    return { ...s, line: best };
  });
}

function removeTrouble(store, spot) {
  return { spots: ((store && store.spots) || []).filter((s) => !(s.words === spot.words && s.chord === spot.chord)) };
}

const SHEET_CSS = `
*{box-sizing:border-box}
body{font:14px/1.45 "Segoe UI",Arial,"Liberation Sans",sans-serif;color:#1d2422;margin:0;padding:22px 26px;background:#fff}
h1{font-size:24px;margin:0}
.sub{color:#5b6662;margin:2px 0 12px}
.facts{display:flex;flex-wrap:wrap;gap:6px 18px;margin:0 0 14px;padding:8px 12px;background:#f2f6f5;border-radius:8px}
.facts b{color:#0e6b64}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:#0e6b64;margin:18px 0 6px;border-bottom:1px solid #d8e3e0;padding-bottom:3px}
.route{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:center}
.route .step{border:1px solid #c9d6d2;border-radius:999px;padding:1px 9px}
.route .step b{color:#0e6b64}
.route .arrow{color:#9aa}
.part{margin:8px 0 12px;break-inside:avoid}
.part h3{font-size:15px;margin:0 0 4px}
.part h3 .letter{display:inline-block;min-width:22px;text-align:center;background:#0e6b64;color:#fff;border-radius:5px;margin-right:6px}
.part h3 .times{color:#5b6662;font-weight:400}
.part .pats{color:#5b6662;font-size:12px;margin-left:6px}
table.map{border-collapse:collapse;margin:2px 0}
table.map td{border-left:2px solid #1d2422;padding:3px 10px 2px;min-width:78px;vertical-align:top}
table.map td.end{min-width:0;padding:0}
table.map td.w{border-left:0;width:170px;min-width:170px;max-width:170px;padding:3px 10px 2px 0;color:#5b6662;font-size:12px;font-style:italic;vertical-align:bottom}
table.map td.pat{background:#fff4d6}
table.map td .tag,.marks .tag{color:#b45309;font-weight:700;font-size:12px}
table.map td .tag{float:right;margin:-1px -6px 0 4px}
.part h3 .like{color:#5b6662;font-weight:400;font-size:13px}
.marks{list-style:none;margin:4px 0 0;padding:0;font-size:12.5px;color:#334}
.marks li{margin:2px 0}
table.map .c{font-weight:700;color:#b22222;font-size:16px;white-space:nowrap}
table.map .n{color:#5b6662;font-size:12px;white-space:nowrap}
.shapes{display:flex;flex-wrap:wrap;gap:8px 14px}
.shape{text-align:center;width:78px;--text-color:#111;--bg-color:#fff;--rhythm-color:#555;--chord-color:#b22222;--diagram-size:70px}
.shape svg .line{stroke:#555}.shape svg .dot{fill:#111}
.shape svg{width:70px;height:auto}
.shape .nm{font-weight:700;color:#b22222}
.shape .nu{font-size:12px;color:#5b6662}
.shape .ro{font-size:11px;line-height:1.25;color:#5b6662;font-style:italic}
.shape{width:84px}
.route .step{display:inline-flex;flex-direction:column;align-items:flex-start;line-height:1.25;border-radius:10px;padding:2px 9px}
.route .step small{color:#5b6662;font-size:11px;font-style:italic}
.short{margin:8px 0 0;padding-left:18px;color:#334;font-size:13px}
.short li{margin:2px 0}
.shape .chord-diagram{display:block}
.shape .dg{height:96px;display:flex;align-items:flex-start;justify-content:center}
.shape svg text.name{display:none}
.changes{margin:0;padding-left:18px}
.changes li{margin:3px 0}
.changes b{color:#b22222}
.steps{margin:0;padding-left:18px}
.notes{border:1px dashed #b9c6c2;border-radius:8px;height:90px;margin-top:4px}
.foot{margin-top:16px;color:#8a9592;font-size:11px}
.moved{margin:4px 0 0;font-size:13px}
.circle{display:flex;gap:16px;align-items:flex-start;break-inside:avoid}
.circle svg{width:220px;height:auto;flex:none}
.circle ul{margin:0;padding-left:18px;font-size:13px}
.circle li{margin:3px 0}
.pick-key{font-size:12.5px;color:#5b6662}
.trouble{margin:0 0 6px;padding-left:18px}
.trouble li{margin:2px 0}
.trouble b{color:#b22222}
@media print{body{padding:0}}
`;

/**
 * The learn sheet (a whole HTML page).
 * info: { title, sub, facts: [[label, value]], map (chordMap), shapes: [{ name, numeral, svg }],
 *         changes (songChanges), patterns: [{ name, hint }], firstPart, made,
 *         circle (circleSvg), circleNotes: [text], trouble: [{ line, chord, words, count }],
 *         summary: [text] (Chord patterns' summary), shapes[].role ("the sad home") }
 */
// ── 4.43: fingerstyle (tab) ──
// A tab passage is learned in layers: the chords under it strummed, then the picking pattern on
// open strings (the picking hand alone), then both. Each bar of tab is read as "a chord shape,
// picked in this order", which is easier to remember than a stream of fret numbers.

/** Bar lines in a tab system: the columns of '|' in its first string line's body */
function barColumns(system) {
  const body = system.lines[0] ? system.lines[0].body : '';
  const cols = [];
  for (let i = 0; i < body.length; i += 1) if (body[i] === '|') cols.push(i);
  return cols;
}

/**
 * Each bar of a tab block: the chord shape the fretted notes sit in (if they do), and the order
 * the strings are picked, as string numbers (1 is the top line of the tab: A on a ukulele;
 * notes picked together are joined with +: "4+1").
 *   -> [{ system, bar, notes: n, shape: 'C' | '', fit, pattern: '4-3-2-1', melody }]
 * candidates: chord names to try (the song's chords, and any written above the tab).
 */
function tabBarShapes(tabText, library, candidates = [], { instrument = 'soprano' } = {}) {
  const { parseTab } = require('./tab');
  const { getChordDefinition } = require('./chord-library');
  const model = parseTab(tabText, { instrument });
  const above = [];
  for (const item of model.items) if (item.kind === 'text') for (const w of String(item.text).trim().split(/\s+/)) if (/^[A-G][#b]?[a-z0-9#+°]*$/.test(w)) above.push(w);
  const names = [...new Set([...above, ...candidates])];
  const defs = names.map((name) => ({ name, def: library ? getChordDefinition(library, name) : null })).filter((x) => x.def && Array.isArray(x.def.frets));
  const out = [];
  model.systems.forEach((system, s) => {
    const strings = system.tuning.strings.length;
    // each string by name, as players say them: a re-entrant (high) bottom string in lower case (g C E A)
    const tun = system.tuning.strings;
    const nameOf = (k) => {
      const [label, midi] = tun[k] || ['?', 0];
      const reentrant = k === tun.length - 1 && tun.length > 1 && midi > tun[k - 1][1];
      return reentrant ? String(label).toLowerCase() : String(label).toUpperCase();
    };
    const cols = barColumns(system);
    const edges = [-1, ...cols, Infinity];
    let bar = 0;
    for (let e = 0; e + 1 < edges.length; e += 1) {
      const notes = system.notes.filter((n) => n.fret !== null && n.column > edges[e] && n.column < edges[e + 1]);
      if (!notes.length) continue;
      bar += 1;
      // the order the strings are picked: by column, notes in one column picked together
      const byCol = new Map();
      for (const n of notes) { if (!byCol.has(n.column)) byCol.set(n.column, []); byCol.get(n.column).push(n.string + 1); }
      const order = [...byCol.keys()].sort((x, y) => x - y).map((c) => byCol.get(c).sort((x, y) => y - x));
      const pattern = order.map((g) => g.join('+')).join('-');
      const pick = order.map((g) => g.map((n) => nameOf(n - 1)).join('+')).join('-');
      // the shape: the chord whose frets the most notes match (an open string counts when the
      // shape leaves it open)
      let best = { name: '', fit: 0 };
      for (const { name, def } of defs) {
        if (def.frets.length !== strings) continue;
        const ok = notes.filter((n) => def.frets[strings - 1 - n.string] === n.fret).length;
        const fit = ok / notes.length;
        if (fit > best.fit) best = { name, fit };
      }
      const shape = best.fit >= 0.7 ? best.name : '';
      out.push({ system: s, bar, notes: notes.length, shape, fit: Number(best.fit.toFixed(2)), pattern, pick, melody: !shape });
    }
  });
  return out;
}

/** The tab passages in a song, each with its bars read as shapes and patterns */
function pickingSummary(ir, library, { instrument = 'soprano' } = {}) {
  const chords = [...new Set(chordSequence(ir))];
  const passages = [];
  let heading = '';
  for (const n of ir || []) {
    if (n.type === 'structure') heading = String(n.content || '').replace(/[:：]\s*$/, '').trim();
    if (n.type !== 'tab' || !n.content) continue;
    const bars = tabBarShapes(n.content, library, chords, { instrument });
    if (!bars.length) continue;
    // a passage is read as chords only when every bar clearly sits on one; otherwise it's a tune,
    // and no bar is labelled with a shape
    const chordal = isChordal(bars);
    passages.push({ line: n.line, heading, chordal, bars: chordal ? bars : bars.map((b) => ({ ...b, shape: '', melody: true })) });
  }
  return passages;
}

/** Every bar of a passage in a chord shape: the passage is picked chords, not a tune */
function isChordal(bars) {
  return bars.length > 0 && bars.every((b) => b.shape);
}

/** One bar in words: "Hold C, pick g-C-E-A" (or "pick A-A-E" for a bar of tune) */
function barText(b) {
  return b.shape ? `Hold ${b.shape}, pick ${b.pick || b.pattern}` : `pick ${b.pick || b.pattern}`;
}

/** A passage in words: its bars as shapes and picking, or that it's a tune */
function passageText(p, sep = ' · ') {
  return p.chordal ? p.bars.map(barText).join(sep) : 'A tune, picked note by note';
}

/** The song's tab blocks rewritten: 'open' (the frets as 0: the picking hand alone) or
 *  'chords' (each block as a line of bars with the chord shape of each bar, to strum) */
function tabStepText(songText, mode, library, { instrument = 'soprano' } = {}) {
  const lines = String(songText || '').split('\n');
  const out = [];
  const chordsInText = [...new Set((String(songText).match(/\[([A-G][^\]\s:]*)/g) || []).map((x) => x.slice(1)))];
  let lastChord = '';
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const m of line.matchAll(/\[([A-G][^\]\s:x]*)/g)) lastChord = m[1];
    if (!/^\s*```\s*tab(?:\s+\d+\s*\/\s*\d+)?\s*$/i.test(line)) { out.push(line); continue; }
    let j = i + 1;
    while (j < lines.length && !/^\s*```\s*$/.test(lines[j])) j += 1;
    const body = lines.slice(i + 1, j);
    if (mode === 'open') {
      out.push(line, ...body.map((l) => (require('./tab').isStringLine(l, { strict: false })
        ? l.replace(/^(\s*[A-Ga-g][#♯b♭]?\s*[|:])(.*)$/, (m0, head, rest) => head + rest.replace(/\d+/g, (d) => `0${'-'.repeat(d.length - 1)}`))
        : l)));
      if (j < lines.length) out.push(lines[j]);
    } else {
      const bars = tabBarShapes(body.join('\n'), library, chordsInText, { instrument });
      // a tune (not every bar on a chord) stays as written: its notes, played slowly
      if (!isChordal(bars)) { out.push(line, ...body); if (j < lines.length) out.push(lines[j]); i = j; continue; }
      // a bar in no shape: the chord before it, or else the next one the song plays
      const nextChord = (() => { for (const l of lines.slice(j + 1)) { const m = l.match(/\[([A-G][^\]\s:x]*)/); if (m) return m[1]; } return ''; })();
      const names = bars.map((b) => b.shape || lastChord || nextChord || 'N.C.');
      // the bars on the block's first line, blank lines for the rest: the song keeps its line numbers
      out.push(names.length ? `| ${names.join(' | ')} |` : '');
      for (let k = i + 1; k <= Math.min(j, lines.length - 1); k += 1) out.push('');
      if (names.length) lastChord = names[names.length - 1];
    }
    i = j;
  }
  return out.join('\n');
}

/** 4.41: how the words go when a part comes more than once */
function wordsText(each) {
  return { same: ', the same words each time', mostly: ', mostly the same words', some: ', new words, with some coming back', new: ', new words each time' }[each] || '';
}

function learnSheetHtml(info) {
  const { title = 'Song', sub = '', facts = [], map = { route: [], parts: [] }, shapes = [], changes = [], patterns = [], made = '', circle = '', circleNotes: cNotes = [], trouble = [], summary = [], picking = [] } = info || {};
  // 4.40.3: each step with its first words, as Chord patterns shows it
  const route = map.route.map((r, i) => `${i ? '<span class="arrow">→</span>' : ''}<span class="step"><b>${esc(r.letter)}</b> ${esc(r.name)}${r.times > 1 ? ` ×${r.times}` : ''}${r.words ? `<small>${esc(r.words)}</small>` : ''}</span>`).join('');
  const CIRCLED = '①②③④⑤⑥⑦⑧⑨';
  const inMark = (m, r, b) => (r > m.start.row || (r === m.start.row && b >= m.start.bar)) && (r < m.end.row || (r === m.end.row && b <= m.end.bar));
  const told = new Set(); // a pattern's story the first time; after that, just its name
  const parts = map.parts.filter((p) => p.bars).map((p) => {
    const marks = p.marks || [];
    const rows = p.rows.map((row, r) => {
      const cells = row.map((bar, b) => {
        const on = marks.filter((m) => inMark(m, r, b));
        const tag = on.filter((m) => m.start.row === r && m.start.bar === b).map((m) => CIRCLED[m.n - 1] || m.n).join('');
        return `<td${on.length ? ' class="pat"' : ''}>${tag ? `<span class="tag">${tag}</span>` : ''}<div class="c">${esc(bar.chords.join(' '))}</div><div class="n">${esc(bar.numerals.join(' '))}</div></td>`;
      }).join('');
      return `<tr><td class="w">${esc((p.words || [])[r] || '')}</td>${cells}<td class="end"></td></tr>`;
    }).join('');
    const times = p.times > 1 ? ` <span class="times">×${p.times}${wordsText(p.wordsEach)}</span>` : '';
    const like = p.like ? p.like.text : '';
    const likeHtml = like ? ` <span class="like">= ${esc(like)}</span>` : '';
    const notes = marks.map((m) => {
      const first = !told.has(m.name);
      told.add(m.name);
      const story = first ? `. ${esc(m.hint.charAt(0).toUpperCase() + m.hint.slice(1))}` : ' (as before).';
      return `<li><span class="tag">${CIRCLED[m.n - 1] || m.n}</span> <b>${esc(m.name)}</b>: ${esc(m.chords.join(' '))}${m.round ? ' (back to the start)' : ''}, ${esc(m.steps.join(' '))}${m.words && first ? `, in the line “${esc(m.words)}”` : ''}${story}</li>`;
    }).join('');
    const movedHtml = (p.moved || []).map((m) => `<p class="moved">${esc(m.names.join(' and '))}: the same in <b>${esc(m.key)}</b>, the same numbers${m.swaps.length ? `. Play ${m.swaps.map(([a, b]) => `<b>${esc(b)}</b> for ${esc(a)}`).join(', ')}` : ''}.</p>`).join('');
    return `<div class="part"><h3><span class="letter">${esc(p.letter)}</span>${esc(p.name)}${times}${likeHtml}</h3><table class="map">${rows}</table>${movedHtml}${notes ? `<ul class="marks">${notes}</ul>` : ''}</div>`;
  }).join('');
  const most = [...map.parts].filter((p) => !p.like || p.like.how === 'more' || p.like.how === 'again').sort((a, b) => b.times - a.times)[0];
  // home first, then its closest chords, then the rest (4.40.3)
  // (4.41: by the kind of key: VI is family in a minor key, an outsider in a major one)
  const RANK = map.key && map.key.mode === 'minor' ? ['i', 'iv', 'V', 'v', 'III', 'VI', 'VII', 'ii°', 'ii'] : ['I', 'IV', 'V', 'vi', 'ii', 'iii', 'vii°'];
  const rank = (n) => { const c = String(n || '').replace(/(maj7|7|9|11|13|6|sus2|sus4|sus|add9)$/, ''); const i = RANK.indexOf(c); return i < 0 ? RANK.length : i; };
  const shapeHtml = (list) => list.map((x, i) => ({ x, i })).sort((a, b) => rank(a.x.numeral) - rank(b.x.numeral) || a.i - b.i).map(({ x }) => x).map((s) => `<div class="shape"><div class="dg">${String(s.svg || '').replace(/viewBox="0 0 100 (\d+)"/, (m, h) => `viewBox="0 4 100 ${Number(h) - 37}"`)}</div><div class="nm">${esc(s.name)}</div><div class="nu">${esc(s.numeral || '')}</div>${s.role ? `<div class="ro">${esc(s.role)}</div>` : ''}</div>`).join('');
  // 4.49.1: after a key change, the chords in the new key in a group of their own
  const homeShapes = shapes.filter((s) => !s.inKey);
  const shapesHtml = shapeHtml(homeShapes);
  const laterKeys = [...new Set(shapes.filter((s) => s.inKey).map((s) => s.inKey))];
  const laterHtml = laterKeys.map((k) => `<h2>After the key change: the chords in ${esc(k)}</h2><div class="shapes">${shapeHtml(shapes.filter((s) => s.inKey === k))}</div>`).join('');
  // how much there is to learn: Chord patterns' summary, and the parts that are only bits of others
  const bits = map.parts.filter((p) => p.like && p.like.letter && p.like.how !== 'one');
  const bitsLine = bits.length ? `Not as much to learn as it looks: ${bits.map((p) => `${p.letter} is ${p.like.text}`).join('; ')}.` : '';
  const shortHtml = [...summary, bitsLine].filter(Boolean).map((t) => `<li>${esc(t)}</li>`).join('');
  const marked = map.parts.some((p) => (p.marks || []).length);
  const hard = changes.filter((c) => !c.missing).slice(0, 5);
  const changesHtml = hard.map((c) => `<li><b>${esc(c.from)} → ${esc(c.to)}</b>${c.count > 1 ? ` (×${c.count})` : ''}: ${esc(c.tip)}</li>`).join('');
  const patternsHtml = patterns.map((p) => `<li><b>${esc(p.name)}</b>: ${esc(p.hint)}</li>`).join('');
  // 4.43: the tab, bar by bar, as shapes and picking patterns, and how to learn it in steps
  // each passage once, with how many times it comes
  const passages = [];
  for (const p of picking) {
    const sig = `${p.chordal}|${p.bars.map(barText).join('|')}`;
    const hit = passages.find((x) => x.sig === sig);
    if (hit) hit.times += 1; else passages.push({ ...p, sig, times: 1 });
  }
  const pickingHtml = passages.length ? `<h2>Picking</h2>${passages.map((p) => `<div class="part"><h3>${esc(p.heading || 'Tab')} <span class="times">(line ${esc(p.line)}${p.times > 1 ? `, ×${p.times}` : ''})</span></h3>${p.chordal
    ? `<ol class="changes">${p.bars.map((b) => `<li><b>Hold ${esc(b.shape)}</b>, pick ${esc(b.pick || b.pattern)}</li>`).join('')}</ol>`
    : '<p>A tune, picked note by note rather than on chord shapes. Learn it slowly, a bar at a time.</p>'}</div>`).join('')}<p class="pick-key">Strings by name, as on the tab (g C E A on a ukulele); g+A means picked together. Learn it in steps (Learn → Picking…): the chords strummed, then the pattern on open strings, then both, slowly first.</p>` : '';
  const circleHtml = circle ? `<h2>On the circle of fifths</h2><div class="circle">${circle}<ul>${cNotes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>` : '';
  const troubleHtml = trouble.filter((t) => !t.gone).slice(0, 12).map((t) => `<li>Line ${esc(t.line)}${t.chord ? `, <b>${esc(t.chord)}</b>` : ''}${t.words ? `: “${esc(t.words)}”` : ''}${t.count > 1 ? ` (×${t.count})` : ''}</li>`).join('');
  const factsHtml = facts.filter(([, v]) => v).map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}: learn sheet</title><style>${SHEET_CSS}</style></head><body>
<h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
<div class="facts">${factsHtml}</div>
${shapesHtml ? `<h2>The chords${map.key && map.key.name ? ` in ${esc(map.key.name)}` : ''}, and how they feel</h2><div class="shapes">${shapesHtml}</div>` : ''}${laterHtml}
<h2>The song</h2><div class="route">${route}</div>
${shortHtml ? `<ul class="short">${shortHtml}</ul>` : (most && most.times > 1 ? `<p>Learn <b>${esc(most.letter)} ${esc(most.name.toLowerCase())}</b> first: it comes ${most.times} times.</p>` : '')}
${parts ? `<h2>Chord map</h2>${parts}` : ''}
${changesHtml ? `<h2>Changes to practise</h2><ol class="changes">${changesHtml}</ol>` : ''}
${patternsHtml && !marked ? `<h2>Patterns in it</h2><ul class="changes">${patternsHtml}</ul>` : ''}
${pickingHtml}
${circleHtml}
<h2>Learning it</h2><ol class="steps">
<li>Practise the hardest changes above until they're smooth (Learn → Changes…).</li>
<li>Play along with the chords, then <b>from memory</b>: the chords hidden after the first time each part comes, then as numbers only, then none (Learn → From memory).</li>
<li>Play it in another key, thinking in numbers. If you can, you know the song, not just the shapes.</li>
<li>Come back to it in a day or two, and again in a week.</li>
</ol>
<h2>Trouble spots</h2>${troubleHtml ? `<ol class="trouble">${troubleHtml}</ol>` : ''}<div class="notes"></div>
<p class="foot">Made with ukemusic${made ? ` on ${esc(made)}` : ''}.</p>
</body></html>`;
}

module.exports = { tabBarShapes, pickingSummary, barText, passageText, isChordal, tabStepText, wordsText, outsideWhy, circlePlace, keyFamily, circleMoves, circleNotes, circleSvg, quizSteps, quizQuestions, quizOptions, addTrouble, placeTrouble, removeTrouble, plainWords, numeral, songChanges, fingerMoves, changeTip, chordSequence, barsOf, chordMap, fadePlan, numberedIR, keyLegend, learnSheetHtml };
