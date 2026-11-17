// What Free Practice's home screen shows above the catalogue (4.87): the beginner's path, a
// suggested session for today, the last seven days, and a line of progress for each card.
// Pure functions over the catalogue and practice.json (unit tested); nothing is saved here.
const { EXERCISES, exercise } = require('./practice-catalog');

/** A colour for each category: its cards, its pictures and its exercise screen. Buttons stay the app's own colour. */
const COLOURS = {
  warmup: '#b45309', chords: '#4f46e5', rhythm: '#0e7490', picking: '#7c3aed', melody: '#be185d', noodle: '#15803d', routine: '#475569'
};

/** Getting started: a suggested order, one new thing at a time (nothing is locked). `why` is what the step is for. */
const PATH = [
  { id: 'downs', name: 'Your first strum', why: 'Steady down-strums on one chord, then four.' },
  { id: 'chord-change', name: 'Your first change', why: 'Two chords, back and forth, without stopping.' },
  { id: 'down-up', name: 'Add the up-strum', why: 'Down on the beat, up in between.' },
  { id: 'shape-drill', name: 'Four chords', why: 'C, Am, F and G: enough for hundreds of songs.' },
  { id: 'island', name: 'The island strum', why: 'The strum most ukulele songs use.' },
  { id: 'spider-1234', name: 'Wake up the fingers', why: 'One finger for each fret, string by string.' },
  { id: 'one-minute', name: 'Count your changes', why: 'How many clean changes in a minute? Beat it tomorrow.' },
  { id: 'single-string', name: 'Pick single notes', why: 'One string at a time, two fingers taking turns.' },
  { id: 'c-major', name: 'Your first scale', why: 'Eight notes: where tunes come from.' },
  { id: 'noodle-three', name: 'Make something up', why: 'Three notes over a backing: your own tune.' }
];

/** Has this exercise been done properly? The app can't hear, so: a clean mark, a score, or a minute of it. */
function done(progress, id) {
  const p = progress?.exercises?.[id];
  if (!p) return false;
  const mode = exercise(id)?.mode;
  if (mode === 'oneminute') return (p.scores || []).length > 0;
  if (mode === 'noodle' || mode === 'metronome') return (p.seconds || 0) >= 60;
  return (p.clean || 0) > 0;
}

/** The path with each step's state: 'done', 'next' (the one to do now) or 'later' */
function pathState(progress) {
  let next = false;
  return PATH.map((step, index) => {
    const e = exercise(step.id);
    const isDone = done(progress, step.id);
    const state = isDone ? 'done' : (next ? 'later' : 'next');
    if (!isDone) next = true;
    return { ...step, number: index + 1, title: e.title, cat: e.cat, state };
  });
}

const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

/**
 * A short session for today: three exercises, about eight minutes.
 * While the path isn't finished: the last step done (to keep it), then the next two.
 * After that: a warm-up, something for chords or rhythm, something for picking, melody or noodling,
 * each the one you've left longest (never tried first). The same all day; different tomorrow.
 */
function suggest(progress, today) {
  const path = pathState(progress);
  const todo = path.filter((s) => s.state !== 'done');
  let steps;
  let name;
  let reason;
  if (todo.length) {
    const lastDone = [...path].reverse().find((s) => s.state === 'done');
    steps = [
      ...(lastDone ? [{ id: lastDone.id, minutes: 2 }] : []),
      { id: todo[0].id, minutes: 3 },
      ...(todo[1] ? [{ id: todo[1].id, minutes: lastDone ? 2 : 3 }] : [])
    ];
    name = 'Today’s practice';
    reason = `Getting started: ${path.length - todo.length} of ${path.length} done. Next: ${todo[0].name.toLowerCase()}.`;
  } else {
    const day = Math.abs(daysBetween('2026-01-01', today));
    const pick = (cats, offset) => {
      const pool = EXERCISES.filter((e) => cats.includes(e.cat) && e.mode !== 'metronome');
      const age = (e) => {
        const last = progress?.exercises?.[e.id]?.last_date;
        return last ? daysBetween(last, today) : 9999;
      };
      const oldest = Math.max(...pool.map(age));
      const longest = pool.filter((e) => age(e) === oldest);
      return longest[(day + offset) % longest.length];
    };
    steps = [
      { id: pick(['warmup'], 0).id, minutes: 2 },
      { id: pick(['chords', 'rhythm'], 1).id, minutes: 3 },
      { id: pick(['picking', 'melody', 'noodle'], 2).id, minutes: 3 }
    ];
    name = 'Today’s practice';
    reason = 'A warm-up, something for the chords and rhythm, and something for the tune: the ones you’ve left longest.';
  }
  return {
    name,
    reason,
    minutes: steps.reduce((sum, s) => sum + s.minutes, 0),
    steps: steps.map((s) => ({ ...s, title: exercise(s.id).title, cat: exercise(s.id).cat, today: progress?.exercises?.[s.id]?.last_date === today }))
  };
}

/** The last seven days, oldest first: { key, letter, seconds, today } */
function week(progress, today) {
  const out = [];
  for (let back = 6; back >= 0; back -= 1) {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - back);
    const key = d.toISOString().slice(0, 10);
    out.push({ key, letter: 'SMTWTFS'[d.getUTCDay()], seconds: progress?.days?.[key] || 0, today: back === 0 });
  }
  return out;
}

/** For a card: 'new', 'tried' or 'clean', and how many of the catalogue have been tried */
function cardState(progress, id) {
  const p = progress?.exercises?.[id];
  if (!p || !(p.seconds || p.clean || (p.scores || []).length)) return 'new';
  return done(progress, id) ? 'clean' : 'tried';
}
function tried(progress) {
  return EXERCISES.filter((e) => cardState(progress, e.id) !== 'new').length;
}

module.exports = { COLOURS, PATH, done, pathState, suggest, week, cardState, tried };
