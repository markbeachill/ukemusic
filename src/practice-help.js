// Short, optional help for the selected exercise; no full manual in the playing flow.
const { exercise } = require('./practice-catalog');
const MODES = {
  spider: { steps: ['Press Show me to watch one slow round, or Start to play along.', 'The red dot is the current note; blue is next. The number is your fretting finger. The arrow names the string to pluck.', 'Keep each note clear and your hand relaxed. Stop if anything hurts.'], goal: 'Play one relaxed round with every note clear and in time.' },
  change: { steps: ['Choose the chord you are coming from and the chord to learn.', 'Start slowly. Follow Now and Next, changing on the beat without stopping the strum.', 'Check that every string rings before increasing the tempo.'], goal: 'Make each change cleanly without a gap in the beat.' },
  oneminute: { steps: ['Choose two chords and press Start. Three beeps give you time to put your hand on the first chord; the fourth, higher beep is go.', 'Change between them for one minute, strumming once on each chord. Each change counts once: C to F is one; back to C is another. A beep says ten seconds to go, and three beeps say stop.', 'Your hands are busy, so don’t press anything: turn on Count by listening and the app counts your strums, or count in your head. A friend can tap +1 for you. Check the total at the end.'], goal: 'Count only changes where every intended string rings clearly.' },
  drill: { steps: ['Choose your chord sequence and In turn or Mixed up.', 'In the Form it now bar, put down the chord. In the next bar, strum once and check every string.', 'Lift off, then prepare the next shape. Slow down if a string buzzes.'], goal: 'Form every shape and strum it cleanly on the next bar.' },
  strum: { steps: ['Start with one chord if changing chords makes the rhythm difficult.', 'Follow the arrows: down, up, a dot for a miss, and X for a muted stroke. Keep the hand moving through misses.', 'Use the count-in and a slow tempo, then add the chord sequence.'], goal: 'Keep the pattern steady for four bars without losing the beat.' },
  blues: { steps: ['Choose the key and a comfortable tempo.', 'Follow the highlighted bar in the 12-bar chart.', 'Try the optional quick change, turnaround or shuffle after the basic changes feel steady.'], goal: 'Play one complete 12-bar round without stopping at a chord change.' },
  notes: { steps: ['Press Show me for one slow demonstration.', 'Follow the red dot and string arrow. A hollow dot is an open string; finger numbers belong to the fretting hand.', 'Hear it, then you alternates a demonstration with a round for you to play.'], goal: 'Play a complete round with even timing and clear notes.' },
  noodle: { steps: ['Press Start to hear the backing, then use a few of the notes shown.', 'Try a short phrase, leave a gap, then repeat or vary it. Orange dots belong to the chord playing now.', 'Finish a phrase on the ringed key note. Listen to how different notes sound over each chord.'], goal: 'Make a short phrase you can repeat deliberately, with a clear ending.' },
  metronome: { steps: ['Choose the tempo and beats per bar, then press Start.', 'Play along with the click. The larger beat is the start of the bar.', 'Tap tempo several times to match a song; change subdivisions for extra timing cues.'], goal: 'Keep a steady pulse for a minute without speeding up or slowing down.' }
};
const EXTRA = {
  'island': 'Say “down, down-up, up-down-up”. Keep moving through the two missed strokes.',
  'learn-strum': 'Four steps, one after another: Listen (the app plays it louder), Muted (rest your fretting hand lightly across the strings and copy the movement: only the rhythm sounds), On one chord, then With the changes. Choose any strum under Pattern, including My strums. When a round is clean, That was clean makes the next one faster.',
  'strum-switch': 'Two bars of each strum in turn. Look at the next strum before the change, and keep the hand moving down-up through it.',
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
  if (!e) return { title: 'Free Practice', steps: ['Start with Today’s practice, or choose an exercise, or return to one of your last three.', 'Getting started suggests an order for a beginner. How it works is always optional.'], goal: 'Practise slowly enough to stay relaxed and in time.' };
  const base = MODES[e.mode];
  return { title: e.title, aim: e.aim, steps: [...base.steps, ...(EXTRA[id] ? [EXTRA[id]] : [])], goal: base.goal };
}
// ── 4.87: the same instructions as slides with pictures, a first-visit tour, and a guide to print ──
const pictures = require('./practice-pictures');
const plan = require('./practice-plan');
const { EXERCISES, CATEGORIES, exerciseFor, instrumentFamily } = require('./practice-catalog');
// a heading and a picture for each of a mode's three steps, and a picture for its goal
const SLIDES = {
  spider: { name: 'Finger exercises', steps: [['Watch it, or play along', 'buttons'], ['Read the dots', 'legend'], ['Stay relaxed', 'relaxed']], goal: 'clean' },
  change: { name: 'Chord switching', steps: [['Choose two chords', 'change'], ['Follow Now and Next', 'nownext'], ['Let every string ring', 'ring']], goal: 'clean' },
  oneminute: { name: 'One-minute changes', steps: [['Choose two chords', 'change'], ['Change for one minute', 'oneminute'], ['Count the clean ones', 'ring']], goal: 'oneminute' },
  drill: { name: 'Chord shapes drill', steps: [['Choose your chords', 'drill'], ['Form it, then strum it', 'form'], ['Lift off and go again', 'relaxed']], goal: 'clean' },
  strum: { name: 'Strumming', steps: [['One chord first', 'nownext'], ['Follow the arrows', 'strum'], ['Slowly, with a count-in', 'countin']], goal: 'clean' },
  blues: { name: '12-bar blues', steps: [['Choose a key and a speed', 'tempo'], ['Follow the lit bar', 'blues'], ['Extras when you’re ready', 'options']], goal: 'clean' },
  notes: { name: 'Picking, scales and tunes', steps: [['Watch one slow round', 'buttons'], ['Read the dots', 'legend'], ['Hear it, then you', 'hear']], goal: 'clean' },
  noodle: { name: 'Noodling', steps: [['Start the backing', 'backing'], ['Short phrases, with gaps', 'noodle'], ['Finish on the key note', 'keynote']], goal: 'qa' },
  metronome: { name: 'Metronome', steps: [['Set the speed', 'tempo'], ['Play with the click', 'metronome'], ['Tap to match a song', 'tap']], goal: 'weekpic' }
};
const TOUR = [
  { title: 'Welcome to Free Practice', text: 'Forty-two short exercises for the things songs need: clean chords, steady strumming, picking, scales and making things up. A few minutes most days beats an hour on Sunday.', pic: 'kinds' },
  { title: 'Start with Today’s practice', text: 'The card at the top picks three exercises for today, about eight minutes in all. Press Start and it takes you through them one after another.', pic: 'today' },
  { title: 'Getting started', text: 'New to the instrument? There’s a suggested order, one new thing at a time, from your first strum to your first tune. Nothing is locked: play whatever you like.', pic: 'path' },
  { title: 'In an exercise', text: 'Start counts you in, then you play along. Show me plays one slow round for you to watch. Slow is good: − and + set the speed.', pic: 'buttons' },
  { title: 'You’re the judge', text: 'The app can’t hear you. When a round was clean, press That was clean: it remembers your best speed, and ticks the step in Getting started.', pic: 'clean' },
  { title: 'A little, most days', text: 'The home screen shows your week. Your progress is kept on this device; make a backup now and then under Keep your practice safe.', pic: 'weekpic' }
];
// which finger is which, where the screen is about to use the numbers or the letters
function handSlides(e) {
  const kind = e.set?.prNotesKind;
  const fretting = { title: 'Which finger is which', text: 'The numbers on the dots are the fingers of your fretting hand: 1 is the index finger, 2 the middle, 3 the ring and 4 the little finger. The thumb rests behind the neck.', picture: pictures.named('fretting') };
  const picking = { title: 'The picking hand', text: 'The letters are the fingers of your picking hand: p is the thumb, i the index, m the middle and a the ring finger. Rest the little finger lightly on the body if it helps.', picture: pictures.named('picking') };
  const strumming = { title: 'The strumming hand', text: 'Strum from the wrist, over where the neck joins the body: down with the nail of the index finger, up with its pad. Keep the hand loose and moving, even when it misses the strings.', picture: pictures.named('thumbstrum') };
  if (e.mode === 'spider') return [fretting];
  if (e.mode === 'notes') return ['picking', 'single', 'alternate'].includes(kind) ? [picking] : [fretting];
  if (e.mode === 'strum' && e.level === 'Beginner') return [strumming];
  return [];
}
/** Slides for an exercise as it is on an instrument (or the tour, with no id): [{ title, text, picture (SVG text) }] */
function slides(id, instrumentId = 'soprano') {
  const e = exerciseFor(exercise(id), instrumentId);
  if (!e) return TOUR.map((t) => ({ title: t.title, text: t.text, picture: pictures.named(t.pic) }));
  const base = MODES[e.mode];
  const look = SLIDES[e.mode];
  return [
    { title: e.title, text: e.aim + (EXTRA[id] ? ' ' + EXTRA[id] : ''), picture: pictures.forExercise(e, instrumentFamily(instrumentId)) },
    ...handSlides(e),
    ...base.steps.map((text, i) => ({ title: look.steps[i][0], text, picture: pictures.named(look.steps[i][1], ...(look.steps[i][1] === 'strum' && e.set?.prStrum && e.set.prStrum !== 'ladder' ? [e.set.prStrum] : [])) })),
    { title: 'The goal', text: base.goal, picture: pictures.named(look.goal) }
  ];
}
const escape = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** The Free Practice guide, to print: the tour, each kind of exercise, the first steps and the whole catalogue */
function guideHtml({ made = '' } = {}) {
  const colour = plan.COLOURS;
  const panel = (s, tint) => `<div class="slide" style="color:${tint}"><div class="pic">${s.picture}</div><div class="words"><h3>${escape(s.title)}</h3><p>${escape(s.text)}</p></div></div>`;
  const first = (mode) => EXERCISES.find((e) => e.mode === mode);
  const kinds = Object.keys(SLIDES).map((mode) => {
    const e = first(mode);
    const tint = colour[e.cat];
    const all = slides(e.id).slice(1);
    return `<section class="kind"><h2 style="color:${tint}">${escape(SLIDES[mode].name)}</h2><div class="row">${all.map((s) => panel(s, tint)).join('')}</div></section>`;
  }).join('');
  const path = plan.PATH.map((s, i) => `<li><strong>${i + 1}. ${escape(s.name)}</strong> <span>${escape(exercise(s.id).title)}: ${escape(s.why)}</span></li>`).join('');
  const cats = CATEGORIES.filter((c) => EXERCISES.some((e) => e.cat === c.id)).map((c) => `<section class="cat"><h3 style="color:${colour[c.id]}">${escape(c.name)}</h3><p class="aim">${escape(c.aim)}</p><table>${EXERCISES.filter((e) => e.cat === c.id).map((e) => `<tr><td class="thumb" style="color:${colour[c.id]}">${pictures.forExercise(e)}</td><td><strong>${escape(e.title)}</strong> <em>${escape(e.level)}</em><br>${escape(e.aim)}</td></tr>`).join('')}</table></section>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Free Practice guide</title><style>
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font: 11pt/1.45 system-ui, "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; }
h1 { font-size: 24pt; margin: 0 0 2mm; } h2 { font-size: 15pt; margin: 7mm 0 2mm; } h3 { font-size: 11.5pt; margin: 0 0 1mm; }
.lead { color: #4b5563; margin: 0 0 5mm; }
.row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
.tour { grid-template-columns: repeat(3, 1fr); }
.slide { border: 0.3mm solid #d1d5db; border-radius: 3mm; padding: 2.5mm; break-inside: avoid; }
.slide .pic svg { width: 100%; height: auto; display: block; }
.slide .words { color: #1f2937; } .slide p { margin: 0; font-size: 9.5pt; line-height: 1.35; }
.kind, .cat { break-inside: avoid; }
ol.path { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 8mm; } ol.path li { margin: 0 0 2mm; break-inside: avoid; } ol.path span { color: #4b5563; display: block; font-size: 10pt; }
table { border-collapse: collapse; width: 100%; } td { padding: 1.2mm 2mm 1.2mm 0; vertical-align: middle; font-size: 10pt; border-top: 0.2mm solid #e5e7eb; }
td.thumb { width: 24mm; } td.thumb svg { width: 22mm; height: auto; display: block; } em { color: #6b7280; font-style: normal; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
.aim { color: #4b5563; margin: 0 0 1mm; } .cats { columns: 2; column-gap: 8mm; } .foot { color: #6b7280; font-size: 9pt; margin-top: 6mm; }
.newpage { break-before: page; }
</style></head><body>
<h1>Free Practice guide</h1>
<p class="lead">How ukemusic’s practice exercises work, what each kind looks like, and all ${EXERCISES.length} of them.</p>
<div class="row tour">${TOUR.map((t) => panel({ ...t, picture: pictures.named(t.pic) }, '#0f766e')).join('')}</div>
<h2>Your hands</h2>
<div class="row tour">${['spider-1234', 'single-string', 'downs'].map((id) => panel(handSlides(exercise(id))[0], '#0f766e')).join('')}</div>
<h2>Getting started: a suggested order</h2>
<p class="lead">Ten steps for a beginner, one new thing at a time. It’s a suggestion: every exercise is open from the start. Each step is an exercise in the list at the end.</p>
<ol class="path">${path}</ol>
<h1 style="margin-top:8mm">The kinds of exercise</h1>
<p class="lead">Each exercise is one of these nine. The same slides are in the app: press “How it works” in any exercise.</p>
${kinds}
<h1 class="newpage">All ${EXERCISES.length} exercises</h1>
<div class="cats">${cats}</div>
<p class="foot">ukemusic Free Practice${made ? ' · ' + escape(made) : ''}</p>
</body></html>`;
}
/** The pieces of the guide for the website's page (web/pages.js): the same words and pictures */
function guideParts() {
  const first = (mode) => EXERCISES.find((e) => e.mode === mode);
  return {
    tour: TOUR.map((t) => ({ title: t.title, text: t.text, picture: pictures.named(t.pic) })),
    hands: ['spider-1234', 'single-string', 'downs'].map((id) => handSlides(exercise(id))[0]),
    kinds: Object.keys(SLIDES).map((mode) => ({ name: SLIDES[mode].name, colour: plan.COLOURS[first(mode).cat], count: EXERCISES.filter((e) => e.mode === mode).length, slides: slides(first(mode).id).filter((s, i) => i > 0 && !/hand|finger is which/i.test(s.title)) })),
    path: plan.PATH.map((s, i) => ({ number: i + 1, name: s.name, why: s.why, title: exercise(s.id).title, colour: plan.COLOURS[exercise(s.id).cat], picture: pictures.forExercise(exercise(s.id)) }))
  };
}
module.exports = { forExercise, slides, guideHtml, guideParts, TOUR, SLIDES };
