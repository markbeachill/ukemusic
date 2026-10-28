// The Practice library: categories and exercises (each opens one of the trainers with a
// preset), chord progressions, the rhythm ladder, the metronome, the shape drill, and the
// noodling helpers (safe notes, chord tones, question-and-answer phrases, rhythm ideas).
// Pure functions: unit tested.

const { parseChordName, SUFFIX_INTERVALS } = require('./chord-names');
const { ROOTS, scalePitches } = require('./note-exercises');

const CATEGORIES = [
  { id: 'warmup', name: 'Warm-ups & finger work', icon: '🕷️', aim: 'Finger independence, accuracy and moving round the neck' },
  { id: 'chords', name: 'Chords & changes', icon: '🎼', aim: 'Clean shapes and smooth changes' },
  { id: 'rhythm', name: 'Strumming & rhythm', icon: '🥁', aim: 'Timing and a relaxed, steady strum' },
  { id: 'picking', name: 'Fingerpicking', icon: '🎵', aim: 'Picking accuracy and right-hand independence' },
  { id: 'melody', name: 'Scales & melody', icon: '🎶', aim: 'Knowing where the notes are, and playing tunes' },
  { id: 'noodle', name: 'Noodling & creativity', icon: '✨', aim: 'Making things up over a backing' },
  { id: 'routine', name: 'My routine', icon: '⏱️', aim: 'A few exercises back to back, timed' }
];

// mode: which trainer; set: control values to apply (by element id); level: badge
const EXERCISES = [
  // Warm-ups
  { id: 'spider-1234', cat: 'warmup', level: 'Beginner', title: 'Spider walk (1-2-3-4)', aim: 'Four fingers, four frets, string by string. The classic warm-up.', mode: 'spider', set: { prSpider: '1234', prUpBack: true, prMoveUp: false, prStretch: false, prHop: false, prStartFret: '1', prTempo: 60 } },
  { id: 'spider-4321', cat: 'warmup', level: 'Beginner', title: 'Reverse spider (4-3-2-1)', aim: 'The walk backwards: lift one finger at a time.', mode: 'spider', set: { prSpider: '4321', prUpBack: true, prMoveUp: false, prStretch: false, prHop: false, prStartFret: '1', prTempo: 60 } },
  { id: 'spider-variations', cat: 'warmup', level: 'Improver', title: 'Spider variations (1-3-2-4, 1-4-2-3)', aim: 'Fingers out of order: real independence.', mode: 'spider', set: { prSpider: '1324', prUpBack: true, prMoveUp: false, prStretch: false, prHop: false, prStartFret: '1', prTempo: 60 } },
  { id: 'spider-warmup', cat: 'warmup', level: 'Beginner', title: 'Spider warm-up (all four)', aim: 'One round of each pattern: two or three minutes.', mode: 'spider', set: { prSpider: 'warmup', prUpBack: true, prMoveUp: false, prStretch: false, prHop: false, prStartFret: '1', prTempo: 70 } },
  { id: 'string-hop', cat: 'warmup', level: 'Improver', title: 'String hopping', aim: 'Jump a string with every note: picking accuracy.', mode: 'spider', set: { prSpider: '1234', prHop: true, prUpBack: true, prMoveUp: false, prStretch: false, prStartFret: '1', prTempo: 55 } },
  { id: 'stretch', cat: 'warmup', level: 'Intermediate', title: 'Finger stretching', aim: 'Start high on the neck and come down a fret each round: the stretch grows gently.', mode: 'spider', set: { prSpider: '1234', prStretch: true, prStartFret: '5', prHop: false, prUpBack: false, prMoveUp: false, prTempo: 55, prBars: '8' } },
  { id: 'fretboard-walk', cat: 'warmup', level: 'Improver', title: 'Fretboard walking', aim: 'The walk, a fret higher each round and back: get used to other positions.', mode: 'spider', set: { prSpider: '1234', prMoveUp: true, prStretch: false, prHop: false, prUpBack: false, prStartFret: '1', prTempo: 60, prBars: '8' } },
  // Chords
  { id: 'shape-drill', cat: 'chords', level: 'Beginner', title: 'Chord shapes drill', aim: 'A chord comes up: form it in one bar, strum it on the next.', mode: 'drill', set: { prDrillSet: 'C Am F G', prTempo: 70 } },
  { id: 'chord-change', cat: 'chords', level: 'Beginner', title: 'Chord switching', aim: 'Back and forth between two chords, in time.', mode: 'change', set: { prFromRoot: 'C', prFromType: '', prToRoot: 'F', prToType: '', prTempo: 70 } },
  { id: 'one-minute', cat: 'chords', level: 'Improver', title: 'One-minute changes', aim: 'How many clean changes in 60 seconds? Your scores are kept.', mode: 'oneminute', set: { prFromRoot: 'C', prFromType: '', prToRoot: 'F', prToType: '' } },
  { id: 'progressions', cat: 'chords', level: 'Improver', title: 'Common progressions', aim: 'I–V–vi–IV, the 50s, ii–V–I and more, in any key.', mode: 'strum', set: { prProgression: 'pop', prProgKey: 'C', prTempo: 80 } },
  { id: 'barre', cat: 'chords', level: 'Intermediate', title: 'Barre chords', aim: 'Into Bb from G: flatten one finger, keep the others relaxed.', mode: 'change', set: { prToRoot: 'Bb', prToType: '', prFromRoot: 'G', prFromType: '', prTempo: 60 } },
  { id: 'blues', cat: 'chords', level: 'Intermediate', title: '12-bar blues', aim: 'The blues in a key, with the shuffle.', mode: 'blues', set: { prTempo: 90 } },
  { id: 'arpeggios', cat: 'chords', level: 'Improver', title: 'Chord arpeggios', aim: 'The notes of each chord one at a time, instead of strummed.', mode: 'notes', set: { prNotesKind: 'picking', prPickPattern: 'updown', prPickChords: 'C Am F G', prPerBeat: '2', prTempo: 60 } },
  // Rhythm
  { id: 'downs', cat: 'rhythm', level: 'Beginner', title: 'Down-strums', aim: 'Steady downs on the beat.', mode: 'strum', set: { prStrum: 'D>DDD', prProgression: '', prChords: 'C Am F G', prTempo: 70 } },
  { id: 'down-up', cat: 'rhythm', level: 'Beginner', title: 'Down-up strumming', aim: 'Down on the beat, up in between: keep the hand moving.', mode: 'strum', set: { prStrum: 'D>UDUDUDU', prProgression: '', prChords: 'C Am F G', prTempo: 70 } },
  { id: 'island', cat: 'rhythm', level: 'Beginner', title: 'The island strum (D-DU-UDU)', aim: 'The ukulele strum: down, down-up, up-down-up.', mode: 'strum', set: { prStrum: 'D-DU-UDU', prProgression: '', prChords: 'C Am F G', prTempo: 80 } },
  { id: 'metronome-strum', cat: 'rhythm', level: 'Beginner', title: 'Strumming to the metronome', aim: 'Any strum, any chords, locked to the click.', mode: 'strum', set: { prClick: true, prTempo: 80 } },
  { id: 'chucking', cat: 'rhythm', level: 'Improver', title: 'Chucking (muted strums)', aim: 'The percussive chuck on 2 and 4.', mode: 'strum', set: { prStrum: 'D-X-D-X-', prProgression: '', prChords: 'C Am F G', prTempo: 75 } },
  { id: 'ladder', cat: 'rhythm', level: 'Intermediate', title: 'Rhythm ladder', aim: 'Quarters, eighths, triplets, sixteenths, then syncopation: two bars each.', mode: 'strum', set: { prStrum: 'ladder', prProgression: '', prChords: 'C', prDynamics: false, prTempo: 60 } },
  { id: 'dynamics', cat: 'rhythm', level: 'Improver', title: 'Soft and loud', aim: 'Two bars soft, two bars loud: control, not just speed.', mode: 'strum', set: { prStrum: 'D-DU-UDU', prProgression: '', prChords: 'C Am F G', prDynamics: true, prTempo: 75 } },
  { id: 'metronome', cat: 'rhythm', level: 'Beginner', title: 'Metronome', aim: 'A visual and audible metronome, with tap tempo.', mode: 'metronome' },
  // Picking
  { id: 'single-string', cat: 'picking', level: 'Beginner', title: 'Single-string picking', aim: 'One string at a time, index and middle taking turns.', mode: 'notes', set: { prNotesKind: 'single', prPerBeat: '2', prTempo: 60 } },
  { id: 'alternating', cat: 'picking', level: 'Improver', title: 'Alternating fingers', aim: 'Index on one string, middle on the next.', mode: 'notes', set: { prNotesKind: 'alternate', prPerBeat: '2', prTempo: 60 } },
  { id: 'four-string', cat: 'picking', level: 'Improver', title: 'Four-string pattern (G C E A)', aim: 'Thumb, index, middle, ring: one finger per string.', mode: 'notes', set: { prNotesKind: 'picking', prPickPattern: 'up', prPickChords: 'C Am F G', prPerBeat: '2', prTempo: 60 } },
  { id: 'pick-patterns', cat: 'picking', level: 'Intermediate', title: 'Picking patterns', aim: 'G–E–C–A, alternating thumb, pinches: choose one.', mode: 'notes', set: { prNotesKind: 'picking', prPickPattern: 'gecea', prPickChords: 'C Am F G', prPerBeat: '2', prTempo: 60 } },
  { id: 'flowing', cat: 'picking', level: 'Intermediate', title: 'Flowing arpeggios', aim: 'Up and back through each chord: smooth accompaniment.', mode: 'notes', set: { prNotesKind: 'picking', prPickPattern: 'updown', prPickChords: 'C G Am F', prPerBeat: '2', prTempo: 70 } },
  // Scales & melody
  { id: 'c-major', cat: 'melody', level: 'Beginner', title: 'C major scale', aim: 'C D E F G A B C, up and down, in the open position.', mode: 'notes', set: { prNotesKind: 'scale', prScale: 'major', prScaleRoot: 'C', prSeq: '0', prScalePos: '0', prPerBeat: '1', prTempo: 60 } },
  { id: 'pentatonic', cat: 'melody', level: 'Improver', title: 'Pentatonic scale', aim: 'Five notes that always sound good: the basis of most solos.', mode: 'notes', set: { prNotesKind: 'scale', prScale: 'minorPent', prScaleRoot: 'A', prSeq: '0', prScalePos: '0', prPerBeat: '1', prTempo: 60 } },
  { id: 'scales', cat: 'melody', level: 'Improver', title: 'Scales up and down', aim: 'Any scale, any key, open position or up the neck.', mode: 'notes', set: { prNotesKind: 'scale', prScale: 'major', prScaleRoot: 'G', prSeq: '0', prScalePos: '0', prPerBeat: '1', prTempo: 60 } },
  { id: 'sequences', cat: 'melody', level: 'Intermediate', title: 'Scale sequences', aim: '1-2-3, 2-3-4, 3-4-5…: the scale in groups.', mode: 'notes', set: { prNotesKind: 'scale', prScale: 'major', prScaleRoot: 'C', prSeq: '3', prScalePos: '0', prPerBeat: '2', prTempo: 60 } },
  { id: 'melodies', cat: 'melody', level: 'Improver', title: 'Melody repetition', aim: 'Short, well-known tunes, round and round.', mode: 'notes', set: { prNotesKind: 'melody', prMelody: 'twinkle', prPerBeat: '1', prTempo: 70 } },
  { id: 'ear', cat: 'melody', level: 'Intermediate', title: 'Ear training: call and response', aim: 'Hear a short phrase, play it back, then see the answer.', mode: 'notes', set: { prNotesKind: 'ear', prScaleRoot: 'C', prPerBeat: '1', prTempo: 60 } },
  // Noodling
  { id: 'noodle-free', cat: 'noodle', level: 'Beginner', title: 'Free noodling', aim: 'Play anything over a backing: every note shown sounds good.', mode: 'noodle', set: { prNoodleNotes: 'major', prNoodleQA: false, prNoodleRhythm: false } },
  { id: 'noodle-three', cat: 'noodle', level: 'Beginner', title: 'Three-note noodling', aim: 'Only a few notes: make the most of them.', mode: 'noodle', set: { prNoodleNotes: 'four', prNoodleQA: false, prNoodleRhythm: false } },
  { id: 'noodle-pent', cat: 'noodle', level: 'Improver', title: 'Pentatonic noodling', aim: 'Improvise with the pentatonic: no wrong notes.', mode: 'noodle', set: { prNoodleNotes: 'pent', prNoodleQA: false, prNoodleRhythm: false } },
  { id: 'noodle-qa', cat: 'noodle', level: 'Intermediate', title: 'Question and answer', aim: 'The app plays a phrase; you answer it.', mode: 'noodle', set: { prNoodleNotes: 'pent', prNoodleQA: true, prNoodleRhythm: false } },
  { id: 'noodle-rhythm', cat: 'noodle', level: 'Improver', title: 'Rhythmic noodling', aim: 'Simple notes, interesting rhythms: a new rhythm idea every two bars.', mode: 'noodle', set: { prNoodleNotes: 'four', prNoodleQA: false, prNoodleRhythm: true } },
  { id: 'noodle-create', cat: 'noodle', level: 'Intermediate', title: 'Make a melody', aim: 'Find a tune over the backing, then save it as a new song to write it down.', mode: 'noodle', set: { prNoodleNotes: 'pent', prNoodleQA: false, prNoodleRhythm: false }, create: true }
];

const DEFAULT_ROUTINES = [
  { name: '10-minute daily', steps: [
    { id: 'spider-1234', minutes: 2 }, { id: 'chord-change', minutes: 2 }, { id: 'metronome-strum', minutes: 2 },
    { id: 'four-string', minutes: 2 }, { id: 'noodle-pent', minutes: 2 }
  ] },
  { name: '5 minutes before playing', steps: [
    { id: 'spider-warmup', minutes: 2 }, { id: 'progressions', minutes: 2 }, { id: 'island', minutes: 1 }
  ] }
];

function exercise(id) {
  return EXERCISES.find((e) => e.id === id) || null;
}

// ── Progressions ──
const KEY_NOTES = {
  C: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  G: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  D: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  A: ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  F: ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
  Bb: ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A']
};
const DEGREE_QUALITY = ['', 'm', 'm', '', '', 'm', 'dim'];
const PROGRESSIONS = [
  { id: 'pop', name: 'I–V–vi–IV (the pop progression)', degrees: ['1', '5', '6', '4'] },
  { id: 'fifties', name: 'I–vi–IV–V (the 50s)', degrees: ['1', '6', '4', '5'] },
  { id: 'three', name: 'I–IV–V–I (three-chord trick)', degrees: ['1', '4', '5', '1'] },
  { id: 'sad', name: 'vi–IV–I–V', degrees: ['6', '4', '1', '5'] },
  { id: 'twofive', name: 'ii–V–I (jazz)', degrees: ['2', '5:7', '1', '1'] },
  { id: 'circle', name: 'vi–ii–V–I (round the circle)', degrees: ['6', '2', '5:7', '1'] },
  { id: 'country', name: 'I–IV–I–V', degrees: ['1', '4', '1', '5:7'] }
];

/** The chords of a progression in a major key: ('pop', 'G') -> ['G', 'D', 'Em', 'C'] */
function progressionChords(id, key = 'C') {
  const prog = PROGRESSIONS.find((p) => p.id === id);
  const notes = KEY_NOTES[key] || KEY_NOTES.C;
  if (!prog) return [];
  return prog.degrees.map((d) => {
    const [deg, extra] = String(d).split(':');
    const i = Number(deg) - 1;
    return notes[i] + (extra === '7' ? '7' : DEGREE_QUALITY[i]);
  });
}

// ── Rhythm ladder ──
const LADDER = [
  { name: 'Quarter notes: 1 2 3 4', pattern: 'DDDD' },
  { name: 'Eighth notes: 1 & 2 &', pattern: 'DUDUDUDU' },
  { name: 'Triplets: 1 & a 2 & a', pattern: 'DUDUDUDUDUDU' },
  { name: 'Sixteenths: 1 e & a', pattern: 'DUDUDUDUDUDUDUDU' },
  { name: 'Syncopation: D-DU-UDU', pattern: 'D-DU-UDU' },
  { name: 'Off-beats: just the ands', pattern: '-U-U-U-U' }
];

/**
 * The ladder (or any strum) as song text, two bars a step, with labels and loudness per bar.
 *   steps: LADDER, or [{ name, pattern }] for one pattern; dynamics: soft/loud every 2 bars
 * Returns { text, labels: [per bar], levels: ['soft'|'loud'|null per bar], bars }
 */
function strumPlan({ steps = LADDER, chords = ['C'], barsEach = 2, rounds = 1, dynamics = false } = {}) {
  const lines = [];
  const labels = [];
  const levels = [];
  let bar = 0;
  for (let r = 0; r < Math.max(1, rounds); r += 1) {
    for (const step of steps) {
      const bars = [];
      for (let b = 0; b < barsEach; b += 1) {
        bars.push(chords[bar % chords.length]);
        labels.push(step.name);
        levels.push(dynamics ? (Math.floor(bar / 2) % 2 ? 'loud' : 'soft') : null);
        bar += 1;
      }
      lines.push(`{${step.pattern}}`, `| ${bars.join(' | ')} |`);
    }
  }
  return { text: lines.join('\n'), labels, levels, bars: bar };
}

/** Soft and loud bars: strums in soft bars at about half the level */
function applyDynamics(schedule, levels) {
  return schedule.events.map((e) => {
    if ((e.kind !== 'strum' && e.kind !== 'chuck') || e.barIndex < 0) return e;
    const level = levels[e.barIndex];
    if (level === 'soft') return { ...e, velocity: e.velocity * 0.4 };
    if (level === 'loud') return { ...e, velocity: Math.min(1, e.velocity * 1.15), accent: true };
    return e;
  });
}

// ── Metronome ──
/**
 * Clicks only: { events, bars, duration, countInDuration: 0, tempo, beatsPerBar }
 *   sub: 1 (beats), 2 (eighths), 3 (triplets): the extra clicks are quieter
 */
function metronomeSchedule({ tempo = 80, beats = 4, bars = 16, sub = 1, accent = true } = {}) {
  const beat = 60 / Math.max(30, Math.min(260, Number(tempo) || 80));
  const events = [];
  const out = [];
  for (let b = 0; b < bars; b += 1) {
    out.push({ time: b * beats * beat, duration: beats * beat, chord: '', line: 0, beats, pattern: '' });
    for (let k = 0; k < beats; k += 1) {
      const t = (b * beats + k) * beat;
      events.push({ time: t, kind: 'click', accent: accent && k === 0, barIndex: b, beatIndex: k });
      for (let s = 1; s < sub; s += 1) events.push({ time: t + (s * beat) / sub, kind: 'click', accent: false, level: 0.45, barIndex: b, sub: true });
    }
  }
  return { events, bars: out, duration: bars * beats * beat, countInDuration: 0, tempo: Math.round(60 / beat), beatsPerBar: beats };
}

/** Tap tempo: bpm from tap times (ms), using the last few taps; null until there are 3 */
function tapTempo(times) {
  const recent = times.slice(-6);
  if (recent.length < 3) return null;
  const gaps = [];
  for (let i = 1; i < recent.length; i += 1) gaps.push(recent[i] - recent[i - 1]);
  const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  return Math.max(30, Math.min(260, Math.round(60000 / avg)));
}

// ── Shape drill ──
/** The chords for the drill, in a random order without the same one twice running */
function drillChords(set, count, rand = Math.random, { order = 'mix' } = {}) {
  const list = set.filter(Boolean);
  if (!list.length) return [];
  // 4.45: in turn, as typed (a song's changes: Dm Dm F G, round and round)
  if (order === 'order') return Array.from({ length: Math.max(count, list.length) }, (_, i) => list[i % list.length]);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    // never the same chord twice running: pick from the others
    const prev = out[out.length - 1];
    const choices = list.length > 1 ? list.filter((c) => c !== prev) : list;
    const pick = choices[Math.min(choices.length - 1, Math.floor(rand() * choices.length))];
    out.push(pick);
  }
  return out;
}

// ── Noodling ──
const NOODLE_SETS = {
  major: { name: 'Major scale (all seven notes)', scale: 'major' },
  pent: { name: 'Pentatonic (five notes, no wrong ones)', scale: 'majorPent' },
  blues: { name: 'Blues scale', scale: 'blues' },
  four: { name: 'Just four notes', steps: [0, 2, 4, 7] },
  chord: { name: 'Only the chord\'s notes (they change with the chord)', chordOnly: true }
};

/** Pitch classes of a chord: 'G7' -> [7, 11, 2, 5] */
function chordTones(name) {
  const parsed = parseChordName(name);
  if (!parsed) return [];
  const intervals = SUFFIX_INTERVALS[parsed.canonicalSuffix] || [0, 4, 7];
  return intervals.map((i) => (parsed.rootIndex + i) % 12);
}

/**
 * The notes to show on the fretboard for noodling: [{ string, fret, pc, root }] up to `frets`.
 *   key: the backing's key; set: a NOODLE_SETS id; chord: the chord now (for 'chord')
 */
function safeNotes({ key = 'C', set = 'pent', tuning, frets = 7, chord = null } = {}) {
  const def = NOODLE_SETS[set] || NOODLE_SETS.pent;
  const r = ROOTS[key] ?? 0;
  let pcs;
  if (def.chordOnly) pcs = chord ? chordTones(chord) : [r, (r + 4) % 12, (r + 7) % 12];
  else if (def.steps) pcs = def.steps.map((s) => (r + s) % 12);
  else pcs = require('./note-exercises').SCALES[def.scale].steps.map((s) => (r + s) % 12);
  const out = [];
  tuning.forEach((open, string) => {
    for (let fret = 0; fret <= frets; fret += 1) {
      const pc = (open + fret) % 12;
      if (pcs.includes(pc)) out.push({ string, fret, pc, root: pc === r });
    }
  });
  return out;
}

/** A short phrase for question-and-answer: pitches from the safe notes, starting on the root */
function qaPhrase({ key = 'C', set = 'pent', tuning, length = 4, rand = Math.random } = {}) {
  const def = NOODLE_SETS[set] || NOODLE_SETS.pent;
  const scale = def.scale || 'majorPent';
  const pool = scalePitches({ root: key, scale, tuning, position: 0 });
  const phrase = [pool[0]];
  let at = 0;
  while (phrase.length < length) {
    at = Math.max(0, Math.min(pool.length - 1, at + (Math.floor(rand() * 5) - 2 || 1)));
    phrase.push(pool[at]);
  }
  return phrase;
}

// Rhythm ideas for rhythmic noodling, in the usual counting syllables
const RHYTHM_IDEAS = [
  'ta  ta  ta  ta: four even notes',
  'ta  ta  ti-ti  ta: two quick ones on beat 3',
  'ta-a  ta  ta: a long note, then two',
  'ti-ti  ti-ti  ta-a: four quick, then a long one',
  '(rest)  ta  ta  ta: come in after beat 1',
  'ta  ti-ti  ta  ti-ti: skipping',
  'ta-a-a-a: one long note, make it sing',
  'ti-ti  ta  ti-ti  ta: quick-quick-slow'
];

/** A new song to write a melody in: the backing as bar lines, an empty tab block */
function melodySongText({ chords, pattern = 'D-DU-UDU', names = ['G', 'C', 'E', 'A'] } = {}) {
  const width = Math.max(...names.map((n) => n.length));
  const tab = names.slice().reverse().map((n) => `${n.padEnd(width)}|----------------|----------------|`).join('\n');
  return `--START MUSIC--
{${pattern}}
[[Backing]] | ${chords.join(' | ')} |

[[Melody]]
\`\`\`tab
${tab}
\`\`\`
--END MUSIC--
`;
}

/**
 * Bars as song text: [{ chords: ['C'] | ['Am', 'F'] | ['N.C.'], pattern }] -> "{pattern}\n| C | Am |…"
 * A {pattern} line is written wherever the pattern changes; four bars to a line.
 */
function planText(bars) {
  const lines = [];
  let pattern = null;
  let row = [];
  const flush = () => {
    if (row.length) lines.push(`| ${row.join(' | ')} |`);
    row = [];
  };
  for (const bar of bars) {
    if (bar.pattern !== pattern) {
      flush();
      pattern = bar.pattern;
      lines.push(`{${pattern}}`);
    }
    row.push(bar.chords.join(' '));
    if (row.length === 4) flush();
  }
  flush();
  return lines.join('\n');
}

module.exports = {
  planText,
  CATEGORIES, EXERCISES, DEFAULT_ROUTINES, exercise, PROGRESSIONS, KEY_NOTES, progressionChords,
  LADDER, strumPlan, applyDynamics, metronomeSchedule, tapTempo, drillChords,
  NOODLE_SETS, chordTones, safeNotes, qaPhrase, RHYTHM_IDEAS, melodySongText
};
