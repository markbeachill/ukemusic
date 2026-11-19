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

const round5 = (n) => Math.round(n / 5) * 5;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function songPlan({ title = 'this song', ir = [], changes = [], strum = '', tempo = 90 } = {}) {
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
  const hard = (changes || []).filter((c) => c && c.from && c.to && !c.missing && c.from !== c.to).slice(0, 2);
  hard.forEach((c, i) => {
    steps.push({ id: 'chord-change', minutes: 2, label: `Hard change ${i + 1}: ${c.from} to ${c.to}`, from: c.from, to: c.to, settings: { prEvery: 'bar', prTempo: 60 } });
  });
  if (shapes.length) {
    steps.push({ id: 'learn-strum', minutes: 3, label: 'The strum', strum: pattern, settings: { prStrumSteps: true, prStrumB: '', prProgression: '', prChords: shapes.slice(0, 4).join(' '), prClick: true, prTempo: slow } });
    steps.push({ id: 'metronome-strum', minutes: 3, label: 'The chords in order', strum: pattern, settings: { prStrumSteps: false, prStrumB: '', prProgression: '', prChords: sequence.join(' '), prClick: true, prTempo: nearer } });
  }
  return {
    name: `Practise: ${title}`,
    title,
    steps,
    after: `Now the song itself: open "${title}", then Learn → Play from memory, and play along at its own speed (${t} bpm).`
  };
}

module.exports = { songPlan, chordSequence, chordSet, songStrum, MAX_SHAPES, MAX_BARS };
