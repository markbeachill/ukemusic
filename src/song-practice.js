// 4.99.6: Practise a song. From a song's own chords, its hardest changes and its strum, a short
// plan of Free Practice exercises run one after another (a routine): its shapes, its two
// hardest changes, its strum in steps, then its chords in order with the strum. The last step
// is the song itself, back in the song (Learn → Play from memory). Pure; unit tested.
//
//   songPlan({ title, ir, changes, strum, beats, tempo }) -> { name, title, steps, after }
//   ir: the song as parsed (in the key it's played in); changes: learn.songChanges(), hardest first
//   steps: [{ id, minutes, label, settings, from?, to?, strum? }] for Free Practice's routines

const MAX_SHAPES = 8;
const MAX_BARS = 16;

/** The chords as they come in the song, a repeat of the same chord counted once */
function chordSequence(ir) {
  const out = [];
  for (const n of ir || []) {
    if (n.type !== 'chord' || n.noChord || n.hidden || !n.content) continue;
    if (out[out.length - 1] !== n.content) out.push(n.content);
  }
  return out;
}

/** The song's chords, each once, in the order they first come */
function chordSet(ir) {
  return [...new Set(chordSequence(ir))];
}

/** The song's first strum written in it ({D-DU-UDU}), without its time or feel; or '' */
function songStrum(ir) {
  const node = (ir || []).find((n) => n.type === 'rhythm' && !n.stop && !n.feelOnly && n.content && !/\|/.test(n.content) && !n.recall);
  if (!node) return '';
  return String(node.content)
    .replace(/^\s*\d{1,2}\s*\/\s*\d{1,2}\s+/, '')
    .replace(/^(?:light\s+)?(?:swing|shuffle|straight)\s+/i, '')
    .trim();
}

/**
 * 4.99.9: the changes into the chords of your trouble spots (Learn → Trouble spots, the most
 * stumbled first): [{ from, to, line }], each change once
 */
function troubleChanges(ir, trouble = []) {
  const seq = chordSequence(ir);
  const out = [];
  for (const t of [...(trouble || [])].filter((x) => x && x.chord && !x.gone).sort((a, b) => (b.count || 1) - (a.count || 1))) {
    const i = seq.findIndex((c, k) => k > 0 && c === t.chord);
    if (i < 1) continue;
    const change = { from: seq[i - 1], to: t.chord, line: t.line };
    if (!out.some((c) => c.from === change.from && c.to === change.to)) out.push(change);
  }
  return out;
}

const round5 = (n) => Math.round(n / 5) * 5;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function songPlan({ title = 'this song', ir = [], changes = [], strum = '', tempo = 90, trouble = [], song = null } = {}) {
  const shapes = chordSet(ir).slice(0, MAX_SHAPES);
  const sequence = chordSequence(ir).slice(0, MAX_BARS);
  const pattern = songStrum(ir) || strum || 'D-DU-UDU';
  const t = Number(tempo) || 90;
  const slow = clamp(round5(t * 0.7), 50, 120);
  const nearer = clamp(round5(t * 0.85), 50, 160);
  const steps = [];
  if (shapes.length) {
    steps.push({ id: 'shape-drill', minutes: 2, label: 'The shapes', settings: { prDrillSet: shapes.join(' '), prDrillOrder: 'mix', prTempo: 60 } });
  }
  // 4.99.9: your trouble spots' changes first (up to two), then the hardest changes, two or three in all
  const mine = troubleChanges(ir, trouble).slice(0, 2);
  mine.forEach((c) => {
    steps.push({ id: 'chord-change', minutes: 2, label: `Your trouble spot${c.line ? ` (line ${c.line})` : ''}: ${c.from} to ${c.to}`, from: c.from, to: c.to, settings: { prEvery: 'bar', prTempo: 60 } });
  });
  const hard = (changes || []).filter((c) => c && c.from && c.to && !c.missing && c.from !== c.to && !mine.some((m) => m.from === c.from && m.to === c.to)).slice(0, mine.length ? 1 : 2);
  hard.forEach((c, i) => {
    steps.push({ id: 'chord-change', minutes: 2, label: `Hard change${hard.length > 1 ? ` ${i + 1}` : ''}: ${c.from} to ${c.to}`, from: c.from, to: c.to, settings: { prEvery: 'bar', prTempo: 60 } });
  });
  if (shapes.length) {
    steps.push({ id: 'learn-strum', minutes: 3, label: 'The strum', strum: pattern, settings: { prStrumSteps: true, prStrumB: '', prProgression: '', prChords: shapes.slice(0, 4).join(' '), prClick: true, prTempo: slow } });
    steps.push({ id: 'metronome-strum', minutes: 3, label: 'The chords in order', strum: pattern, settings: { prStrumSteps: false, prStrumB: '', prProgression: '', prChords: sequence.join(' '), prClick: true, prTempo: nearer } });
  }
  return {
    name: `Practise: ${title}`,
    title,
    steps,
    after: `Now the song itself, from memory, at its own speed (${t} bpm).`,
    song   // 4.99.9: which song to go back to: { folder } on the desktop, { id } in the web player, and the key it was in
  };
}

module.exports = { songPlan, chordSequence, chordSet, songStrum, troubleChanges, MAX_SHAPES, MAX_BARS };
