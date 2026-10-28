// The tune as notation (4.44): a song's {melody} lines drawn as music on a staff (treble clef),
// as SVG, so it shows the same on screen, in PDFs and in the web version.
//
//   * tuneStripHtml: "The tune" at the top of the song: each tune once (the verse's, the
//     chorus's…; a line sung to a tune already shown isn't drawn again), with the chords above
//     the staff where they change, and the first words of the line it belongs to.
//   * lineStaffHtml: one line's tune, to go over that line of words (songbook style).
//
// Notes are drawn at the pitch sung (the song's key, moved by the key it's played in). Each
// note carries data-line (the line of words) and data-at (counts from the line's first chord),
// so playback can light up the note being sung.

const G = require('./music-glyphs');
const { songMelody, keySignature } = require('./melody');

const SP = 7;                       // a staff space, in pixels
const STEM = 3.5;                   // stem length, in staff spaces
const EPS = 1e-6;
// pitch class -> [letter index (C=0 … B=6), accidental], spelt with sharps or with flats
const SHARPS = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
const FLATS = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];
const LETTERS = 'CDEFGAB';
// key signatures, as staff positions (0 = the bottom line, E4; 1 = the space above it…)
const SHARP_POS = [8, 5, 9, 6, 3, 7, 4];   // F C G D A E B
const FLAT_POS = [4, 7, 3, 6, 2, 5, 1];    // B E A D G C F
// note values, in quarter notes: [length, head, flags, dots]
const VALUES = [[4, 'whole', 0, 0], [3, 'half', 0, 1], [2, 'half', 0, 0], [1.5, 'quarter', 0, 1], [1, 'quarter', 0, 0],
  [0.75, 'quarter', 1, 1], [0.5, 'quarter', 1, 0], [0.375, 'quarter', 2, 1], [0.25, 'quarter', 2, 0], [0.125, 'quarter', 3, 0]];
const TRIPLETS = [[2 / 3, 'quarter', 0], [1 / 3, 'quarter', 1], [1 / 6, 'quarter', 2]];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (v) => +v.toFixed(2);

/** A glyph at (x, y) in pixels */
function glyph(name, x, y, extra = '') {
  return `<path d="${G[name].d}" transform="translate(${n2(x)} ${n2(y)}) scale(${SP})"${extra}/>`;
}

/** How many of the notes need a sharp, flat or natural in this key signature */
function outside(ks, midis) {
  return midis.filter((m) => {
    const sp = spell(m, ks.flats);
    return sp.acc !== (ks.sig.get(sp.letter) || 0);
  }).length;
}

/** The key signature of the notes when the song's key isn't known: the one needing fewest accidentals */
function guessKey(midis) {
  let best = 'C';
  let bestScore = Infinity;
  for (const k of ['C', 'G', 'F', 'D', 'Bb', 'A', 'Eb', 'E', 'Ab']) {
    const ks = keySignature(k);
    const score = outside(ks, midis) * 10 + ks.sig.size;
    if (score < bestScore) { bestScore = score; best = k; }
  }
  return best;
}

/** A note's place: { pos (staff position: 0 = E4, the bottom line), acc, letter } */
function spell(midi, flats) {
  const pc = ((midi % 12) + 12) % 12;
  const [li, acc] = (flats ? FLATS : SHARPS)[pc];
  const octave = Math.floor((midi - acc) / 12) - 1;
  return { pos: octave * 7 + li - 30, acc, letter: LETTERS[li], octave };
}

/** A length in quarter notes -> note values (tied), longest first */
function values(q) {
  const out = [];
  let left = q;
  const push = (v, triplet = false) => { out.push({ q: v[0], head: v[1], flags: v[2], dots: triplet ? 0 : v[3], triplet }); left -= v[0]; };
  for (let guard = 0; left > 0.05 && guard < 12; guard += 1) {
    const exact = VALUES.find(([len]) => Math.abs(len - left) < EPS);
    if (exact) { push(exact); break; }
    const eighths = left * 8;
    const thirds = Math.abs(left * 3 - Math.round(left * 3)) < 1e-4 && Math.abs(eighths - Math.round(eighths)) > 1e-4;
    const v = thirds ? TRIPLETS.find(([len]) => len <= left + EPS) : VALUES.find(([len]) => len <= left + EPS);
    if (!v) break;
    push(v, thirds);
  }
  return out;
}

/**
 * One line of tune -> bars of notes to draw.
 *   tune: { notes: [{ at, len, midi | null }], beats, compound } (counts; at < 0 a pickup)
 * -> [{ start (quarters), length, items: [{ at (quarters from the line's start), q, head,
 *      flags, dots, triplet, midi | null, tie, count (at, in counts, for playback) }] }]
 */
function barsOf(tune, beats, compound, shift) {
  const unitQ = compound ? 0.5 : 1;
  const barQ = beats * unitQ;
  const bars = new Map();
  const barAt = (pos) => Math.floor(pos / barQ + EPS);
  for (const n of tune.notes) {
    let pos = n.at * unitQ;
    let left = n.len * unitQ;
    let first = true;
    while (left > EPS) {
      const bi = barAt(pos);
      const end = (bi + 1) * barQ;
      const take = Math.min(left, end - pos);
      if (!bars.has(bi)) bars.set(bi, []);
      const parts = values(take);
      let p = pos;
      parts.forEach((v, k) => {
        const last = k === parts.length - 1 && left - take < EPS;
        bars.get(bi).push({ ...v, at: p, midi: n.midi === null ? null : n.midi + shift, tie: n.midi !== null && !last, count: first ? n.at : null });
        first = false;
        p += v.q;
      });
      pos += take;
      left -= take;
    }
  }
  return [...bars.keys()].sort((a, b) => a - b).map((bi) => {
    const items = bars.get(bi).sort((a, b) => a.at - b.at);
    const start = bi * barQ;
    const filled = items.reduce((a, it) => a + it.q, 0);
    return { start, length: barQ, pickup: bi < 0, full: Math.abs(filled - barQ) < EPS, items };
  });
}

/**
 * One staff system as SVG.
 *   bars: from barsOf; { key, beats, compound, timeSig: bool, chords: [{ at (quarters), name }],
 *   line (data-line) }
 */
function systemSvg(bars, { ks, beats, compound, timeSig = false, chords = [], line = 0 } = {}) {
  const flats = ks.flats;
  const parts = [];
  const top = (pos) => (4 - pos / 2) * SP;   // y of a staff position (0 = bottom line)
  let minY = 0;
  let maxY = 4 * SP;
  const see = (y1, y2 = y1) => { minY = Math.min(minY, y1, y2); maxY = Math.max(maxY, y1, y2); };
  let x = SP * 0.4;
  // clef, key signature, time signature
  parts.push(glyph('gClef', x, top(2)));
  see(top(2) - 4.4 * SP, top(2) + 2.7 * SP);
  x += 3.3 * SP;
  const sigList = [...ks.sig.keys()];
  const sigPos = flats ? FLAT_POS : SHARP_POS;
  sigList.forEach((_, i) => {
    parts.push(glyph(flats ? 'accidentalFlat' : 'accidentalSharp', x, top(sigPos[i])));
    x += (flats ? 0.95 : 1.05) * SP;
  });
  if (sigList.length) x += 0.6 * SP;
  if (timeSig) {
    const upper = String(beats);
    const lower = compound ? '8' : '4';
    const w = Math.max(upper.length, lower.length) * 1.7 * SP;
    const row = (txt, y) => [...txt].forEach((d, i) => parts.push(glyph(`timeSig${d}`, x + (w - txt.length * 1.7 * SP) / 2 + i * 1.7 * SP, y)));
    row(upper, top(6));
    row(lower, top(2));
    x += w + 0.8 * SP;
  }
  x += 0.8 * SP;

  // the notes, bar by bar
  const placed = [];   // { at, x } for the chords above
  const heads = [];    // drawn notes, for stems, beams and ties
  bars.forEach((bar, bi) => {
    const inForce = new Map();   // letter+octave -> accidental written in this bar
    const wholeRest = bar.items.length === 1 && bar.items[0].midi === null && bar.full;
    bar.items.forEach((it) => {
      const width = SP * (2.4 + 2.6 * Math.sqrt(it.q));
      placed.push({ at: it.at, x });
      const data = it.count !== null ? ` data-line="${line}" data-at="${n2(it.count)}"` : '';
      if (it.midi === null) {
        const name = wholeRest || it.q >= 4 - EPS ? 'restWhole' : it.q >= 2 - EPS ? 'restHalf' : it.flags === 0 ? 'restQuarter' : it.flags === 1 ? 'rest8th' : 'rest16th';
        const ry = name === 'restWhole' ? top(6) : top(4);
        parts.push(`<g class="tune-note tune-rest"${data}>${glyph(name, wholeRest ? x + width / 2 - 0.6 * SP : x, ry)}${it.dots ? `<circle cx="${n2(x + 1.6 * SP)}" cy="${n2(top(5))}" r="${n2(0.2 * SP)}"/>` : ''}</g>`);
        x += width;
        return;
      }
      const sp = spell(it.midi, flats);
      const accKey = `${sp.letter}${sp.octave}`;
      const want = sp.acc;
      const have = inForce.has(accKey) ? inForce.get(accKey) : (ks.sig.get(sp.letter) || 0);
      const out = [];
      let hx = x;
      if (want !== have) {
        const name = want > 0 ? 'accidentalSharp' : want < 0 ? 'accidentalFlat' : 'accidentalNatural';
        out.push(glyph(name, x, top(sp.pos)));
        hx += 1.3 * SP;
        inForce.set(accKey, want);
      }
      const y = top(sp.pos);
      // ledger lines
      for (let p = -2; p >= sp.pos; p -= 2) out.push(`<line x1="${n2(hx - 0.4 * SP)}" x2="${n2(hx + 1.6 * SP)}" y1="${n2(top(p))}" y2="${n2(top(p))}" class="tune-ledger"/>`);
      for (let p = 10; p <= sp.pos; p += 2) out.push(`<line x1="${n2(hx - 0.4 * SP)}" x2="${n2(hx + 1.6 * SP)}" y1="${n2(top(p))}" y2="${n2(top(p))}" class="tune-ledger"/>`);
      const head = it.head === 'whole' ? 'noteheadWhole' : it.head === 'half' ? 'noteheadHalf' : 'noteheadBlack';
      out.push(glyph(head, hx, y));
      if (it.dots) {
        const dy = sp.pos % 2 === 0 ? y - 0.5 * SP : y;
        out.push(`<circle cx="${n2(hx + (head === 'noteheadWhole' ? 2.1 : 1.7) * SP)}" cy="${n2(dy)}" r="${n2(0.2 * SP)}"/>`);
      }
      see(y - 0.6 * SP, y + 0.6 * SP);
      const h = { it, pos: sp.pos, x: hx, y, head, bar: bi, parts: out, data, width: head === 'noteheadWhole' ? 1.69 * SP : 1.18 * SP };
      heads.push(h);
      parts.push(h);   // drawn below, with its stem
      x += width + (hx - x);
    });
    // the bar line
    x += 0.3 * SP;
    parts.push(`<line x1="${n2(x)}" x2="${n2(x)}" y1="0" y2="${4 * SP}" class="tune-bar"/>`);
    x += 1.2 * SP;
  });
  const width = x - 1.2 * SP + 0.2 * SP;

  // stems, flags and beams: eighths and shorter in the same beat share a beam
  const beatQ = compound ? 1.5 : 1;
  const groups = [];
  let cur = [];
  const flush = () => { if (cur.length) groups.push(cur); cur = []; };
  heads.forEach((h, i) => {
    if (h.it.head === 'whole') { flush(); return; }
    const beamable = h.it.flags > 0;
    const prev = cur[cur.length - 1];
    const sameBeat = prev && prev.bar === h.bar && Math.floor((prev.it.at + EPS) / beatQ) === Math.floor((h.it.at + EPS) / beatQ)
      && Math.abs(prev.it.at + prev.it.q - h.it.at) < EPS;
    if (beamable && prev && prev.it.flags > 0 && sameBeat) { cur.push(h); return; }
    flush();
    cur.push(h);
    if (!beamable) flush();
    if (i === heads.length - 1) flush();
  });
  flush();
  const stemW = 0.12 * SP;
  for (const grp of groups) {
    const avg = grp.reduce((a, h) => a + h.pos, 0) / grp.length;
    const up = avg < 4;
    const stemX = (h) => (up ? h.x + h.width - stemW / 2 : h.x + stemW / 2);
    if (grp.length === 1) {
      const h = grp[0];
      const sx = stemX(h);
      let end = up ? h.y - STEM * SP : h.y + STEM * SP;
      // notes far off the staff: the stem reaches the middle line
      if (up && end > top(4)) end = top(4);
      if (!up && end < top(4)) end = top(4);
      h.parts.push(`<line x1="${n2(sx)}" x2="${n2(sx)}" y1="${n2(h.y + (up ? -0.17 : 0.17) * SP)}" y2="${n2(end)}" class="tune-stem"/>`);
      if (h.it.flags) h.parts.push(glyph(`flag${h.it.flags >= 2 ? '16th' : '8th'}${up ? 'Up' : 'Down'}`, sx - stemW / 2, end));
      see(end);
      continue;
    }
    // a beam: from the first stem's end to the last's, not too steep, every stem reaching it
    const first = grp[0];
    const last = grp[grp.length - 1];
    const x1 = stemX(first);
    const x2 = stemX(last);
    let y1 = up ? first.y - STEM * SP : first.y + STEM * SP;
    let y2 = up ? last.y - STEM * SP : last.y + STEM * SP;
    const maxSlope = 0.12;
    const slope = Math.max(-maxSlope, Math.min(maxSlope, (y2 - y1) / Math.max(1, x2 - x1)));
    y2 = y1 + slope * (x2 - x1);
    const beamAt = (sx) => y1 + slope * (sx - x1);
    // shift the beam so the shortest stem is still 2.5 spaces
    let shiftY = 0;
    for (const h of grp) {
      const len = up ? h.y - beamAt(stemX(h)) : beamAt(stemX(h)) - h.y;
      if (len < 2.5 * SP) shiftY = up ? Math.min(shiftY, -(2.5 * SP - len)) : Math.max(shiftY, 2.5 * SP - len);
    }
    y1 += shiftY;
    y2 += shiftY;
    for (const h of grp) {
      const sx = stemX(h);
      h.parts.push(`<line x1="${n2(sx)}" x2="${n2(sx)}" y1="${n2(h.y + (up ? -0.17 : 0.17) * SP)}" y2="${n2(beamAt(sx))}" class="tune-stem"/>`);
    }
    const thick = 0.5 * SP;
    const beam = (xa, xb, off) => {
      const ya = beamAt(xa) + (up ? off : -off);
      const yb = beamAt(xb) + (up ? off : -off);
      const t = up ? thick : -thick;
      parts.push(`<path d="M${n2(xa - stemW / 2)} ${n2(ya)}L${n2(xb + stemW / 2)} ${n2(yb)}L${n2(xb + stemW / 2)} ${n2(yb + t)}L${n2(xa - stemW / 2)} ${n2(ya + t)}Z" class="tune-beam"/>`);
    };
    beam(x1, x2, 0);
    // second (and third) beams for sixteenths: across neighbours that have them, a stub otherwise
    for (let level = 2; level <= 3; level += 1) {
      let i = 0;
      while (i < grp.length) {
        if (grp[i].it.flags < level) { i += 1; continue; }
        let j = i;
        while (j + 1 < grp.length && grp[j + 1].it.flags >= level) j += 1;
        const off = (level - 1) * 0.75 * SP;
        if (j > i) beam(stemX(grp[i]), stemX(grp[j]), off);
        else {
          const sx = stemX(grp[i]);
          const stub = 1.1 * SP;
          if (i === grp.length - 1) beam(sx - stub, sx, off); else beam(sx, sx + stub, off);
        }
        i = j + 1;
      }
    }
    see(y1, y2);
  }
  // triplets: a small 3 over each beat of them
  const tripletBeats = new Set();
  for (const h of heads) {
    if (!h.it.triplet) continue;
    const k = `${h.bar}:${Math.floor((h.it.at + EPS) / (compound ? 1.5 : 1))}`;
    if (tripletBeats.has(k)) continue;
    tripletBeats.add(k);
    const y = Math.min(h.y - (STEM + 1) * SP, -1.2 * SP);
    parts.push(`<text x="${n2(h.x + 0.6 * SP)}" y="${n2(y)}" class="tune-tuplet">3</text>`);
    see(y - SP);
  }
  // ties: a curve to the next note of the same pitch
  heads.forEach((h, i) => {
    if (!h.it.tie) return;
    const next = heads[i + 1];
    if (!next || next.it.midi !== h.it.midi) return;
    const below = h.pos < 4;
    const ya = h.y + (below ? 0.6 : -0.6) * SP;
    const xa = h.x + h.width * 0.8;
    const xb = next.x + next.width * 0.2;
    const bend = (below ? 1 : -1) * Math.min(1.2, 0.5 + (xb - xa) / (20 * SP)) * SP;
    parts.push(`<path d="M${n2(xa)} ${n2(ya)}Q${n2((xa + xb) / 2)} ${n2(ya + bend)} ${n2(xb)} ${n2(ya)}Q${n2((xa + xb) / 2)} ${n2(ya + bend * 0.75)} ${n2(xa)} ${n2(ya)}Z" class="tune-tie"/>`);
    see(ya + bend);
  });

  // the chords, above the staff where they change
  if (chords.length) {
    const chordY = Math.min(minY, -0.5 * SP) - 0.7 * SP;
    const xAt = (at) => {
      let best = null;
      for (const p of placed) if (p.at <= at + EPS && (!best || p.at >= best.at)) best = p;
      return best ? best.x : 4 * SP;
    };
    let lastX = -Infinity;
    for (const c of chords) {
      const cx = Math.max(xAt(c.at), lastX);
      parts.push(`<text x="${n2(cx)}" y="${n2(chordY)}" class="tune-chord">${esc(c.name)}</text>`);
      lastX = cx + (String(c.name).length * 0.75 + 0.8) * 1.4 * SP;
    }
    see(chordY - 1.6 * SP);
  }

  const pad = 0.4 * SP;
  const y0 = minY - pad;
  const height = maxY - minY + 2 * pad;
  const body = parts.map((p) => (typeof p === 'string' ? p : `<g class="tune-note"${p.data}>${p.parts.join('')}</g>`)).join('');
  const staff = [0, 1, 2, 3, 4].map((k) => `<line x1="0" x2="${n2(width)}" y1="${k * SP}" y2="${k * SP}" class="tune-line"/>`).join('');
  return `<svg class="tune-staff-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 ${n2(y0)} ${n2(width + 1)} ${n2(height)}" width="${n2(width + 1)}" height="${n2(height)}" role="img" aria-label="The tune, as music">${staff}${body}</svg>`;
}

/** The chords of each line, at their place in the tune (quarters from the line's first chord) */
function lineChords(ir, beats) {
  const { buildSchedule } = require('./playback-schedule');
  const out = new Map();
  let schedule;
  try { schedule = buildSchedule(ir, { beatsPerBar: beats, countIn: false, tempo: 60 }); } catch (_e) { return out; }
  const firstRun = new Map();
  for (const b of schedule.bars || []) {
    if (b.tab || (b.pass || 1) > 1) continue;
    if (!firstRun.has(b.line)) firstRun.set(b.line, { start: b.time, list: [] });
    const run = firstRun.get(b.line);
    const qPerCount = b.unit && b.pulse === 3 ? 0.5 : 1;
    const at = ((b.time - run.start) / (b.unit || 1)) * qPerCount;
    const prev = run.list[run.list.length - 1];
    if (b.rest) { run.list.push({ at, name: 'N.C.' }); continue; }
    if (!prev || prev.name !== b.chord) run.list.push({ at, name: b.chord });
  }
  for (const [line, run] of firstRun) out.set(line, run.list);
  return out;
}

/** The first few words of a line of the song */
function firstWords(ir, line, max = 6) {
  const words = ir.filter((n) => n.line === line && n.type === 'lyric').map((n) => n.content).join('').trim().split(/\s+/).filter(Boolean);
  return words.length > max ? `${words.slice(0, max).join(' ')}…` : words.join(' ');
}

function prepare(ir, { beats = 4, compound = false, shift = 0, key = '', keyGuessed = false } = {}) {
  const tunes = songMelody(ir, { beats, compound });
  if (!tunes.size) return null;
  const midis = [];
  for (const t of tunes.values()) for (const n of t.notes) if (n.midi !== null) midis.push(n.midi + shift);
  // a key guessed from the chords gives way to one that fits the tune better
  let name = key;
  if (!name || (keyGuessed && outside(keySignature(name), midis) > outside(keySignature(guessKey(midis)), midis))) name = guessKey(midis);
  const ks = keySignature(name);
  return { tunes, ks };
}

/**
 * "The tune": each tune in the song once, a staff per line, with the chords above.
 *   ir: the song as shown (its chords as on the sheet); options: { beats, compound, shift
 *   (semitones the tune is moved: the key it's played in), key (the key sung in: "G", "Bb") }
 */
function tuneStripHtml(ir, options = {}) {
  const prep = prepare(ir, options);
  if (!prep) return '';
  const { tunes, ks } = prep;
  const chordsByLine = lineChords(ir, options.beats || 4);
  // a heading before each line: its section
  const sectionOf = new Map();
  let section = '';
  for (const n of ir) {
    if (n.type === 'structure') section = n.content;
    else if (typeof n.line === 'number' && !sectionOf.has(n.line)) sectionOf.set(n.line, section);
  }
  // lines sung to a tune drawn for an earlier line (verse 2 to verse 1's): playback lights that tune
  const also = new Map();
  const ownLine = new Map();
  for (const [line, tune] of [...tunes].sort((a, b) => a[0] - b[0])) if (!tune.borrowed && !ownLine.has(tune.melodyLine)) ownLine.set(tune.melodyLine, line);
  for (const [line, tune] of tunes) {
    if (!tune.borrowed) continue;
    const src = ownLine.get(tune.melodyLine);
    if (src) also.set(src, [...(also.get(src) || []), line]);
  }
  const rows = [];
  let first = true;
  let lastSection = null;
  for (const [line, tune] of [...tunes].sort((a, b) => a[0] - b[0])) {
    if (tune.borrowed) continue;
    const beats = tune.beats || options.beats || 4;
    const compound = tune.compound ?? options.compound ?? false;
    const bars = barsOf(tune, beats, compound, Number(options.shift) || 0);
    if (!bars.length) continue;
    const chords = (chordsByLine.get(line) || []).filter((c) => c.name && c.name !== 'Tab');
    const svg = systemSvg(bars, { ks, beats, compound, timeSig: first, chords, line });
    first = false;
    const sec = sectionOf.get(line) || '';
    const head = sec && sec !== lastSection ? `<span class="tune-section">${esc(sec)}</span> ` : '';
    lastSection = sec;
    const words = firstWords(ir, line);
    const alsoAttr = also.has(line) ? ` data-also="${also.get(line).sort((a, b) => a - b).join(' ')}"` : '';
    rows.push(`<div class="tune-row" data-line="${line}"${alsoAttr}><div class="tune-caption">${head}${words ? `<span class="tune-words">${esc(words)}</span>` : ''}</div>${svg}</div>`);
  }
  if (!rows.length) return '';
  return `<div class="tune-strip"><div class="tune-title">The tune</div>${rows.join('')}</div>`;
}

/** Every line's tune, for the songbook layout: Map(line -> staff html) */
function lineStaves(ir, options = {}) {
  const out = new Map();
  const prep = prepare(ir, options);
  if (!prep) return out;
  const { tunes, ks } = prep;
  let first = true;
  for (const [line, tune] of [...tunes].sort((a, b) => a[0] - b[0])) {
    const beats = tune.beats || options.beats || 4;
    const compound = tune.compound ?? options.compound ?? false;
    const bars = barsOf(tune, beats, compound, Number(options.shift) || 0);
    if (!bars.length) continue;
    out.set(line, `<div class="tune-staff" data-line="${line}">${systemSvg(bars, { ks, beats, compound, timeSig: first, line })}</div>`);
    first = false;
  }
  return out;
}

/** CSS for the tune (added to the sheet's CSS) */
function tuneCss() {
  return `
  .tune-strip { margin: 0.4em 0 1.2em; padding: 0.5em 0.8em 0.6em; border: 1px solid color-mix(in srgb, var(--text-color, #333) 18%, transparent); border-radius: 8px; break-inside: avoid; page-break-inside: avoid; }
  .tune-title { font-family: var(--font-family, system-ui, sans-serif); font-weight: 700; font-size: 0.95em; color: var(--text-color, #333); margin-bottom: 0.2em; }
  .tune-row { margin: 0.15em 0 0.35em; break-inside: avoid; page-break-inside: avoid; }
  .tune-caption { font-family: var(--font-family, system-ui, sans-serif); font-size: 0.82em; color: color-mix(in srgb, var(--text-color, #333) 70%, transparent); }
  .tune-section { font-weight: 700; color: var(--text-color, #333); margin-right: 0.3em; }
  .tune-words { font-style: italic; }
  .tune-staff { margin: 0.3em 0 0.1em; break-inside: avoid; page-break-inside: avoid; }
  .tune-staff-svg { display: block; max-width: 100%; height: auto; overflow: visible; color: var(--text-color, #333); fill: currentColor; }
  .tune-staff-svg .tune-line, .tune-staff-svg .tune-bar, .tune-staff-svg .tune-ledger { stroke: currentColor; stroke-width: ${n2(0.13 * SP)}; }
  .tune-staff-svg .tune-line { opacity: 0.7; }
  .tune-staff-svg .tune-bar { stroke-width: ${n2(0.16 * SP)}; }
  .tune-staff-svg .tune-stem { stroke: currentColor; stroke-width: ${n2(0.15 * SP)}; }
  .tune-staff-svg .tune-chord { fill: var(--chord-color, #b22222); font-family: var(--font-family, system-ui, sans-serif); font-weight: 700; font-size: ${n2(1.75 * SP)}px; }
  .tune-staff-svg .tune-tuplet { font-family: var(--font-family, system-ui, sans-serif); font-style: italic; font-size: ${n2(1.4 * SP)}px; }
  .tune-staff-svg .tune-note.now { fill: var(--chord-color, #b22222); }
  .tune-staff-svg .tune-note.now .tune-stem, .tune-staff-svg .tune-note.now .tune-ledger { stroke: var(--chord-color, #b22222); }
  @media print { .tune-staff-svg .tune-chord { fill: #000; } .tune-strip { border-color: #bbb; } }`;
}

module.exports = { tuneStripHtml, lineStaves, tuneCss, barsOf, systemSvg, spell, values, guessKey };
