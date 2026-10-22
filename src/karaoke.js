// Karaoke timing: which words are being sung when, worked out from the playback schedule.
//
// The song text only says which chord each word is under, and every chord lasts one bar
// (plus one more for each [] after it). So each chord's bars are shared out over the words
// that go with it, in proportion to their length. Words before a line's first chord (and
// whole lines with no chord) carry on from the chord already playing, so they share its
// time too. It's approximate by design: right chord by chord, roughly right within a bar.
// Pure function: no DOM, so it can be unit tested.

const { parseTab, tabTiming } = require('./tab');
const { chordLabel } = require('./song-syntax');

const MIN_WEIGHT = 2; // a chord with no words under it still gets a little of the line

/**
 * buildKaraoke(irNodes, schedule, { startLine })
 * Returns { lines } in song order. Each line is one of
 *   { kind: 'heading', line, label }
 *   { kind: 'words', line, label|null, pieces: [{ chord|null, text, start, end }], start, end }
 *   { kind: 'tab', line, text, pieces: [one piece spanning the tab's bars], start, end,
 *     steps: [{ time, pitches, marks: [{ row, col, len }] }] }   ← each note's place in the text
 * start/end are seconds on the schedule's clock (count-in included). Pieces that were not
 * played (before startLine) have start = end = null.
 */
function buildKaraoke(irNodes, schedule, options = {}) {
  const startLine = Number(options.startLine) || 0;
  const endLine = Number(options.endLine) || 0;
  const lines = [];
  const byLine = new Map();
  const units = [];          // one per chord: { bars: [slotIndex…], pieces: [] }
  const slots = [];          // mirrors buildSchedule: one per chord and per [] while a chord is on
  let unit = null;

  // A line played twice ("(x2)") is shown twice: its copies have pass 2, 3…
  let passNow = 1;
  const lineFor = (number) => {
    const key = `${number}:${passNow}`;
    let line = byLine.get(key);
    if (!line) {
      line = { kind: 'words', line: number, label: null, pieces: [] };
      if (passNow > 1) line.pass = passNow;
      byLine.set(key, line);
      lines.push(line);
    }
    return line;
  };
  const openPiece = (number, chord) => {
    const piece = { chord, text: '', start: null, end: null };
    lineFor(number).pieces.push(piece);
    if (chord === null) {
      if (unit) {
        unit.pieces.push(piece);  // words carried on from the chord already playing
        // 4.29: which chord that is, so it can be shown faintly over those words: "(C)"
        const playing = unit.pieces.find((x) => x.chord && x.chord !== '%');
        if (playing) piece.carried = playing.chord;
      }
    }
    return piece;
  };

  // The same slots as playback (src/playback-schedule.js songSlots), so bar counts always match
  const plan = require('./playback-schedule').songSlots(irNodes || [], { beatsPerBar: (schedule && schedule.beatsPerBar) || 4 });
  const nodes = plan.nodes;
  const slotCount = new Map();
  for (const slot of plan.slots) slotCount.set(slot.node, (slotCount.get(slot.node) || 0) + 1);
  const countFor = (index) => slotCount.get(index) || 0;
  let piece = null;
  let pieceLine = null;
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (node.type === 'tab') {
      // A tab block plays for whole bars (same count as buildSchedule); shown as it's written
      const count = countFor(i);
      piece = null;
      if (!count) continue;
      const tabPiece = { chord: null, text: '', start: null, end: null };
      // Where each note sits in the text, and when it's played (beats from the tab's start),
      // so the karaoke view can light the notes as they sound
      const model = parseTab(node.content);
      const steps = tabTiming(model).steps.map((step) => ({
        beat: step.beat,
        time: null,
        pitches: step.notes.map((n) => n.pitch),
        marks: step.notes.map((n) => {
          const written = model.systems[n.system].lines[n.line];
          return { row: written.index, col: written.prefix.length + n.column, len: n.text.length };
        })
      }));
      lines.push({ kind: 'tab', line: node.line, text: node.content, pieces: [tabPiece], steps });
      const tabUnit = { bars: [], pieces: [tabPiece] };
      units.push(tabUnit);
      for (let b = 0; b < count; b += 1) {
        tabUnit.bars.push(slots.length);
        slots.push({ line: node.line, unit: tabUnit });
      }
      unit = null; // words after the tab don't share its time
      continue;
    }
    if (node.type === 'linebreak' || node.type === 'rhythm') {
      piece = null;
      continue;
    }
    if (node.type === 'structure') {
      const next = nodes[i + 1];
      const alone = !next || next.type === 'linebreak';
      if (alone) {
        lines.push({ kind: 'heading', line: node.line, label: node.content });
      } else {
        lineFor(node.line).label = node.content; // inline label: "[[Intro:]] [Am] [F]"
      }
      continue;
    }
    passNow = node.pass || 1;
    if (`${node.line}:${passNow}` !== pieceLine) piece = null;
    pieceLine = `${node.line}:${passNow}`;
    if (node.type === 'chord') {
      if (node.grid) lineFor(node.line).grid = true;
      if (node.hidden) {
        // the second chord of a repeated split bar ("%" after "| G C |"): played, not shown
        if (!unit || unit.pieces[0]?.chord !== '%') {
          unit = { bars: [], pieces: [] };
          units.push(unit);
        }
        for (let b = 0; b < countFor(i); b += 1) {
          unit.bars.push(slots.length);
          slots.push({ line: node.line, unit });
        }
        piece = null;
        continue;
      }
      piece = openPiece(node.line, chordLabel(node));
      if (node.grid) Object.assign(piece, { gridBar: node.gridBar, ...(node.part > 0 ? {} : { newBar: true }) });
      unit = { bars: [], pieces: [piece] };
      units.push(unit);
      const count = countFor(i);
      for (let b = 0; b < count; b += 1) {
        unit.bars.push(slots.length);
        slots.push({ line: node.line, unit });
      }
      if (node.grid) piece = null;
    } else if (node.type === 'bar' && node.grid) {
      // "%" in a bar line: one more bar of the chord before
      if (unit) {
        lineFor(node.line).grid = true;
        const repeatPiece = { chord: '%', text: '', start: null, end: null, gridBar: node.gridBar, newBar: true };
        lineFor(node.line).pieces.push(repeatPiece);
        // the % gets its own bar's time, not a share of the chord's
        const own = { bars: [], pieces: [repeatPiece] };
        units.push(own);
        for (let b = 0; b < countFor(i); b += 1) {
          own.bars.push(slots.length);
          slots.push({ line: node.line, unit: own });
        }
        piece = null;
      }
    } else if (node.type === 'bar') {
      if (unit) {
        for (let b = 0; b < countFor(i); b += 1) {
          unit.bars.push(slots.length);
          slots.push({ line: node.line, unit });
        }
        // [] is shown as a bar line "|": the chord carries on, and the words after it share its time
        piece = { chord: '|', bar: true, text: '', start: null, end: null };
        lineFor(node.line).pieces.push(piece);
        unit.pieces.push(piece);
      }
    } else if (node.type === 'lyric') {
      if (!piece) {
        if (!node.content.trim() && !lineFor(node.line).pieces.length) continue; // leading spaces
        piece = openPiece(node.line, null);
      }
      piece.text += node.content;
    }
  }

  // Match the played slots to the schedule's bars (same order, same startLine filter)
  const bars = (schedule && schedule.bars) || [];
  const played = slots.filter((s) => (!startLine || s.line >= startLine) && (!endLine || s.line <= endLine));
  played.forEach((slot, index) => {
    const bar = bars[index];
    if (!bar) return;
    const u = slot.unit;
    u.start = u.start === undefined ? bar.time : Math.min(u.start, bar.time);
    u.end = Math.max(u.end || 0, bar.time + bar.duration);
    (u.barTimes = u.barTimes || []).push(bar.time);
  });

  // Share a stretch of time over some words by their length
  const share = (pieces, from, to) => {
    const weights = pieces.map((p) => Math.max(MIN_WEIGHT, p.text.trim().length));
    const total = weights.reduce((a, b) => a + b, 0);
    let t = from;
    pieces.forEach((p, k) => {
      const part = (to - from) * (weights[k] / total);
      p.start = t;
      p.end = t + part;
      t += part;
    });
  };
  // Each chord's time goes to its words. A [] ("|") starts the chord's next bar, so the words
  // after it get that bar's time.
  for (const u of units) {
    if (u.start === undefined) continue;
    const segments = [[]];
    for (const p of u.pieces) {
      if (p.bar && segments[segments.length - 1].length) segments.push([]);
      segments[segments.length - 1].push(p);
    }
    const times = (u.barTimes || []).slice().sort((a, b) => a - b);
    if (segments.length > 1 && times.length >= segments.length) {
      segments.forEach((seg, k) => share(seg, times[k], k === segments.length - 1 ? u.end : times[k + 1]));
    } else {
      share(u.pieces, u.start, u.end);
    }
  }

  // Drop empty lines; give each words line its overall span
  const out = [];
  for (const line of lines) {
    if (line.kind === 'words' || line.kind === 'tab') {
      if (line.kind === 'words') line.pieces = line.pieces.filter((p) => p.chord !== null || p.text.trim());
      if (!line.pieces.length && !line.label) continue;
      if (line.kind === 'words') line.instrumental = line.pieces.length > 0 && line.pieces.every((p) => !p.text.trim());
      const timed = line.pieces.filter((p) => p.start !== null);
      line.start = timed.length ? Math.min(...timed.map((p) => p.start)) : null;
      line.end = timed.length ? Math.max(...timed.map((p) => p.end)) : null;
      if (line.kind === 'tab' && line.start !== null) {
        // one count of the bar (an eighth in 6/8), as playback times it
        const bar = schedule && (schedule.bars || []).find((b) => Math.abs(b.time - line.start) < 1e-6);
        const beat = (bar && bar.unit) || 60 / ((schedule && schedule.tempo) || 100);
        for (const step of line.steps) step.time = line.start + step.beat * beat;
      }
    }
    out.push(line);
  }
  return { lines: out };
}

/** 0..1: how far through a piece the playback is at time t. */
function pieceProgress(piece, t) {
  if (piece.start === null || t === null || t === undefined) return 0;
  if (t >= piece.end) return 1;
  if (t <= piece.start) return 0;
  return (t - piece.start) / (piece.end - piece.start);
}

module.exports = { buildKaraoke, pieceProgress };
