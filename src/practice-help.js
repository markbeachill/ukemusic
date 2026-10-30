// Short, optional help for the selected exercise; no full manual in the playing flow.
const { exercise } = require('./practice-catalog');
const MODES = {
  spider: { steps: ['Press Show me to watch one slow round, or Start to play along.', 'The red dot is the current note; blue is next. The number is your fretting finger. The arrow names the string to pluck.', 'Keep each note clear and your hand relaxed. Stop if anything hurts.'], goal: 'Play one relaxed round with every note clear and in time.' },
  change: { steps: ['Choose the chord you are coming from and the chord to learn.', 'Start slowly. Follow Now and Next, changing on the beat without stopping the strum.', 'Check that every string rings before increasing the tempo.'], goal: 'Make each change cleanly without a gap in the beat.' },
  oneminute: { steps: ['Choose two chords, then press Start when you are ready.', 'Change between them for one minute. Each transition counts once: C to F is one; F back to C is another.', 'Count clean changes yourself and enter the total at the end. A partner can use the live counter instead.'], goal: 'Count only changes where every intended string rings clearly.' },
  drill: { steps: ['Choose your chord sequence and In turn or Mixed up.', 'In the Form it now bar, put down the chord. In the next bar, strum once and check every string.', 'Lift off, then prepare the next shape. Slow down if a string buzzes.'], goal: 'Form every shape and strum it cleanly on the next bar.' },
  strum: { steps: ['Start with one chord if changing chords makes the rhythm difficult.', 'Follow the arrows: down, up, a dot for a miss, and X for a muted stroke. Keep the hand moving through misses.', 'Use the count-in and a slow tempo, then add the chord sequence.'], goal: 'Keep the pattern steady for four bars without losing the beat.' },
  blues: { steps: ['Choose the key and a comfortable tempo.', 'Follow the highlighted bar in the 12-bar chart.', 'Try the optional quick change, turnaround or shuffle after the basic changes feel steady.'], goal: 'Play one complete 12-bar round without stopping at a chord change.' },
  notes: { steps: ['Press Show me for one slow demonstration.', 'Follow the red dot and string arrow. A hollow dot is an open string; finger numbers belong to the fretting hand.', 'Hear it, then you alternates a demonstration with a round for you to play.'], goal: 'Play a complete round with even timing and clear notes.' },
  noodle: { steps: ['Press Start to hear the backing, then use a few of the notes shown.', 'Try a short phrase, leave a gap, then repeat or vary it. Orange dots belong to the chord playing now.', 'Finish a phrase on the ringed key note. Listen to how different notes sound over each chord.'], goal: 'Make a short phrase you can repeat deliberately, with a clear ending.' },
  metronome: { steps: ['Choose the tempo and beats per bar, then press Start.', 'Play along with the click. The larger beat is the start of the bar.', 'Tap tempo several times to match a song; change subdivisions for extra timing cues.'], goal: 'Keep a steady pulse for a minute without speeding up or slowing down.' }
};
const EXTRA = {
  'island': 'Say “down, down-up, up-down-up”. Keep moving through the two missed strokes.',
  'chucking': 'X means a muted, percussive stroke. Practise dampening the strings before adding chord changes.',
  'ladder': 'Each rhythm lasts two bars. Keep the beat at the same speed when the number of strokes changes.',
  'dynamics': 'Alternate two soft bars and two louder bars. Change the touch rather than gripping harder.',
  'barre': 'Use only enough pressure to sound the strings. Release and reset if the hand becomes tense.',
  'ear': 'Listen with the answer hidden, play the phrase back, then compare with the answer. Repeat this phrase keeps the same notes; New phrase changes them. Choose 2–6 notes to set the difficulty.',
  'four-string': 'Hold the whole chord while picking. Follow the picking-finger labels: p thumb, i index, m middle, a ring.',
  'pick-patterns': 'Hold the whole chord while picking; use the named picking fingers and keep the notes evenly spaced.',
  'arpeggios': 'Keep the chord shape held down so its notes can ring together.',
  'flowing': 'Aim for an even stream of notes across the chord changes.',
  'noodle-three': 'Limit yourself to the three note names shown. Make a phrase using rhythm and repetition.',
  'noodle-qa': 'Listen to the two-bar question, then play your own answer in the following two bars.',
  'noodle-rhythm': 'Try the suggested rhythm with just one note before adding more pitches.',
  'noodle-create': 'Create song template makes backing chords and an empty tab block for you to write in. It does not record your playing.'
};
function forExercise(id) {
  const e = exercise(id);
  if (!e) return { title: 'Free Practice', steps: ['Choose an exercise, or return to one of your last three.', 'Start here offers three short beginner exercises. Help is always optional.'], goal: 'Practise slowly enough to stay relaxed and in time.' };
  const base = MODES[e.mode];
  return { title: e.title, aim: e.aim, steps: [...base.steps, ...(EXTRA[id] ? [EXTRA[id]] : [])], goal: base.goal };
}
module.exports = { forExercise };
