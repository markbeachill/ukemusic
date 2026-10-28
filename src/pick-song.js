// Write the picking out as a song (4.44): every line the pattern picks becomes ordinary tab, so
// the arrangement can be edited note by note like any other song.
//
//   [C]Joyful, joyful, [G7]we adore Thee      ->   ```tab 4/4
//                                                    C               G7
//                                                  A|----------------|--------...
//                                                  E|0---0---1-------|----1---...
//                                                  C|0---------------|--------...
//                                                  G|------------0---|0-------...
//                                                    Joyful, joyful,  we adore Thee,
//                                                  ```
// A ```tab 4/4 block is timed by its bars (src/tab.js barTiming), so held notes and quarter
// notes play exactly as written. Headings, blank lines, the song's own tab, and lines that
// aren't picked (N.C., a marked strum) are kept as they were; {melody} and strum lines go (the
// tab says it all), apart from a change of time ({3/4}). The original song is not touched.

const { instrument: profile } = require('./instruments');
const { songLines, lineBars } = require('./pick-sheet');

const MAX_WIDTH = 78;   // characters across, before a line of bars carries on in a new system

/**
 * text: the song text the IR was parsed from (for the lines kept as they are); ir and schedule:
 * the song in the key it's written out in, scheduled with options.pick (countIn: false)
 * options: { instrument, beats, compound, words: true, chordNames: true }
 * -> { text, picked: number of lines written as tab, kept: lines kept as they were }
 */
function writePickedSong(text, ir, schedule, { instrument = 'soprano', beats = 4, compound = false, words = true, chordNames = true, only = null } = {}) {
  // only: a Set of line numbers to write out (Write out this line); the rest stays exactly as it is
  const prof = profile(instrument);
  const n = prof.strings.length;
  const labels = prof.tabNames;
  const perCount = compound ? 1 : 2;
  const bars = schedule.bars || [];
  const lines = songLines(ir).filter((l) => l.kind === 'line');
  const lineOf = new Map();
  for (const l of lines) { const first = [...l.nodes][0]; if (first) lineOf.set(first.line, l); }

  // each line's runs (the times it's played: (x2) plays it twice), in order
  const runs = new Map();
  let last = null;
  for (const b of bars) {
    const key = `${b.line}:${b.pass || 1}`;
    if (!last || last.key !== key) {
      last = { key, line: b.line, pass: b.pass || 1, bars: [] };
      if (!runs.has(b.line)) runs.set(b.line, []);
      runs.get(b.line).push(last);
    }
    last.bars.push(b);
  }
  // a repeat's later passes take their words from the first time through
  for (const list of runs.values()) {
    const first = list[0];
    for (const r of list.slice(1)) r.bars = r.bars.map((b, i) => ({ ...b, src: first.bars[i] ? first.bars[i].src : b.src }));
  }
  const pickedLine = (lineNo) => {
    const list = runs.get(lineNo);
    return list && lineOf.has(lineNo) && list.every((r) => r.bars.length && r.bars.every((b) => b.pickNotes && b.pickNotes.length));
  };

  /** One run as tab: { systems: [{ chord, rows, words }], lastBar: { system, start, cells, w } } */
  const renderRun = (run, lineObj) => {
    const boxes = lineBars(lineObj, run.bars, ir, instrument);
    const pickupBox = boxes[0] && boxes[0].pickup ? boxes.shift() : null;
    // boxes -> full bars (two chords can share one)
    const full = [];
    let cur = [];
    boxes.forEach((box, i) => {
      cur.push({ chord: box.chord, words: words ? box.words : '', steps: run.bars[i].pickNotes || [] });
      if (box.end || i === boxes.length - 1) { full.push(cur); cur = []; }
    });
    const systems = [];
    let sys = null;
    let lastBar = null;
    const newSystem = () => { sys = { chord: '', rows: labels.map((l) => `${l}|`), words: '' }; systems.push(sys); };
    newSystem();
    const indent = labels[0].length + 1;
    for (const bar of full) {
      const fretW = Math.max(1, ...bar.flatMap((m) => m.steps.flat().map((nt) => String(nt.fret).length)));
      let w = Math.max(2, fretW + 1);
      for (const m of bar) w = Math.max(w, Math.ceil((Math.max(m.words.length, chordNames ? m.chord.length : 0) + 1) / Math.max(1, m.steps.length)));
      const cells = bar.reduce((a, m) => a + m.steps.length, 0);
      if (sys.rows[0].length + cells * w + 1 > MAX_WIDTH && sys.rows[0].length > indent) newSystem();
      const start = sys.rows[0].length;
      let col = start;
      for (const m of bar) {
        sys.chord = sys.chord.padEnd(col - indent, ' ');
        if (chordNames && m.chord) sys.chord += m.chord;
        sys.words = sys.words.padEnd(col - indent, ' ');
        if (m.words) sys.words += m.words;
        for (const step of m.steps) {
          for (let r = 0; r < n; r += 1) {
            const note = step.find((nt) => nt.string === n - 1 - r);
            sys.rows[r] += note ? String(note.fret).padEnd(w, '-') : '-'.repeat(w);
          }
        }
        col += m.steps.length * w;
      }
      for (let r = 0; r < n; r += 1) sys.rows[r] += '|';
      lastBar = { system: systems.length - 1, start, cells, w };
    }
    return { systems, lastBar, pickup: pickupBox ? { steps: run.bars[0].pickupNotes || [], words: words ? pickupBox.words : '' } : null };
  };

  // a pickup: its notes at the end of the bar before (or of a bar of its own, at the start)
  const placePickup = (target, pickup) => {
    const { system, start, cells, w } = target.lastBar;
    const sys = target.systems[system];
    const k = pickup.steps.length;
    if (k > cells) return false;
    const from = start + (cells - k) * w;
    for (let r = 0; r < n; r += 1) {
      const row = sys.rows[r].split('');
      pickup.steps.forEach((step, j) => {
        const note = step.find((nt) => nt.string === n - 1 - r);
        if (!note) return;
        const at = from + j * w;
        if (row.slice(at, at + w).join('').replace(/-/g, '') === '') String(note.fret).split('').forEach((ch, c) => { if (row[at + c] !== '|') row[at + c] = ch; });
      });
      sys.rows[r] = row.join('');
    }
    if (pickup.words) {
      const indent = labels[0].length + 1;
      const col = Math.max(from - indent, sys.words.replace(/\s+$/, '').length + 1);
      sys.words = sys.words.padEnd(col, ' ') + pickup.words;
    }
    return true;
  };

  const src = String(text).split('\n');
  // Write out this line: the {melody} line above it goes, and a later line that was sung to its
  // tune (same chords, no tune of its own) gets the tune line written above it instead
  const dropMelody = new Set();
  const moveMelody = new Map();
  if (only) {
    const tunes = require('./melody').songMelody(ir, { beats, compound });
    for (const lineNo of only) {
      const t = tunes.get(lineNo);
      if (!t || t.borrowed || !pickedLine(lineNo)) continue;
      dropMelody.add(t.melodyLine);
      for (const [l, u] of [...tunes].sort((a, b) => a[0] - b[0])) {
        if (l > lineNo && !only.has(l) && u.borrowed && u.melodyLine === t.melodyLine) { moveMelody.set(l, src[t.melodyLine - 1]); break; }
      }
    }
  }
  const startAt = src.indexOf('--START MUSIC--');
  const endAt = src.indexOf('--END MUSIC--');
  const items = [];   // { raw } | { block: [rendered runs] }
  let picked = 0;
  let kept = 0;
  let lastBlock = null;
  src.forEach((line, i) => {
    const lineNo = i + 1;
    const inMusic = startAt < 0 || (i > startAt && (endAt < 0 || i < endAt));
    if (!inMusic) { items.push({ raw: line }); return; }
    if (only && !only.has(lineNo)) {
      // a tune line for a line being written out goes (the tab has its notes now)
      if (dropMelody.has(lineNo)) return;
      if (moveMelody.has(lineNo)) items.push({ raw: moveMelody.get(lineNo) });
      items.push({ raw: line });
      return;
    }
    if (/^\s*\{\s*(?:melody|tune)\b[^}]*:/i.test(line)) return;
    const brace = line.match(/^\s*\{([^}]*)\}\s*$/);
    if (brace && !/^\s*(harmony|lead)\s*$/i.test(brace[1])) {
      const time = brace[1].match(/\b(\d+\s*\/\s*\d+)\b/);
      if (time) items.push({ raw: `{${time[1].replace(/\s+/g, '')}}` });
      return;
    }
    if (pickedLine(lineNo)) {
      const rendered = runs.get(lineNo).map((run) => renderRun(run, lineOf.get(lineNo)));
      for (const r of rendered) {
        if (only) break;   // one line on its own: the line before plays its own picking, so no pickup
        if (!r.pickup || !r.pickup.steps.some((s) => s.length)) continue;
        if (lastBlock && lastBlock.lastBar && placePickup(lastBlock, r.pickup)) { lastBlock = r; continue; }
        // nothing before it: a bar of its own, the pickup at its end
        const cells = beats * perCount;
        const lead = { systems: [{ chord: '', rows: labels.map((l) => `${l}|`), words: '' }], lastBar: null };
        for (let rr = 0; rr < n; rr += 1) lead.systems[0].rows[rr] += `${'-'.repeat(cells * 2)}|`;
        lead.lastBar = { system: 0, start: labels[0].length + 1, cells, w: 2 };
        placePickup(lead, r.pickup);
        // the lead-in bar goes first in this run's tab
        const s0 = r.systems[0];
        const l0 = lead.systems[0];
        s0.rows = s0.rows.map((row, rr) => l0.rows[rr] + row.slice(labels[0].length + 1));
        const shift = l0.rows[0].length - (labels[0].length + 1);
        s0.chord = ' '.repeat(shift) + s0.chord;
        s0.words = l0.words.padEnd(shift, ' ') + s0.words.replace(/^\s{0,0}/, '');
        if (r.lastBar && r.lastBar.system === 0) r.lastBar.start += shift;
      }
      items.push({ block: rendered, fence: `\`\`\`tab ${compound ? `${beats}/8` : `${beats}/4`}` });
      lastBlock = rendered[rendered.length - 1];
      picked += 1;
      return;
    }
    // a line kept as it was (N.C., a marked strum, a heading, a blank line, the song's own tab)
    if (lineOf.has(lineNo)) { kept += 1; lastBlock = null; }
    items.push({ raw: line });
  });

  const indent = ' '.repeat(labels[0].length + 1);
  const out = [];
  for (const item of items) {
    if (item.raw !== undefined) { out.push(item.raw); continue; }
    out.push(item.fence);
    for (const r of item.block) {
      for (const sys of r.systems) {
        if (chordNames && sys.chord.trim()) out.push(`${indent}${sys.chord}`.replace(/\s+$/, ''));
        out.push(...sys.rows);
        if (words && sys.words.trim()) out.push(`${indent}${sys.words}`.replace(/\s+$/, ''));
      }
    }
    out.push('```');
  }
  return { text: out.join('\n'), picked, kept };
}

module.exports = { writePickedSong };
