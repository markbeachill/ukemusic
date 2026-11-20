// 4.99.6: Practise a song. From a song's own chords, its hardest changes and its strum, a short
// plan of Free Practice exercises run one after another (a routine): its shapes, its two
// hardest changes, its strum in steps, then its chords in order with the strum. The last step
// is the song itself, back in the song (Learn → Play from memory). Pure; unit tested.
//
//   songPlan({ title, ir, changes, strum, tempo, trouble, song, planText, shift }) -> { name, title, intro, steps, after }
//   (4.99.17: planText: the song's own plan, see below; none: the plan ukemusic makes)
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

// ── 4.99.17: the plan as text: a song's own plan (learn/practice-plan.txt), made your own ──
// One line per step: minutes, what to do, "at" a tempo, and "; a note" shown while you practise.
//
//   Practise Amazing Grace a section at a time.     <- before the steps: shown when it starts
//   2 min  Shapes                       ; the song's own chords (or: Shapes C F G7)
//   2 min  Trouble spots                ; your trouble spots' changes, if you have any
//   2 min  Hard changes 2               ; the song's two hardest changes
//   2 min  Change G7 to C at 60
//   3 min  Strum at 70%                 ; the song's strum (or: Strum D-DU-UDU)
//   3 min  Chords in order at 85%
//   3 min  Section Chorus               ; that section's chords in order
//   3 min  Exercise: Spider walk at 80  ; any Free Practice exercise
//   Then: the song from memory         <- shown at the end
//
// Words with no chords (Shapes, Hard changes, Strum, Chords in order) follow the song as it is:
// change its chords and they change too. Chords written in the plan stay as written, in the
// song's own key (played in another key or with a capo, they move with it). # starts a comment.

const AUTO_TEXT = `# Made from the song. Change any line to make it yours:
# minutes, what to do, "at" a tempo, and ; a note.
2 min  Shapes
2 min  Trouble spots
2 min  Hard changes 2
3 min  Strum at 70%
3 min  Chords in order at 85%
Then: the song itself, from memory, at its own speed
`;

const DEFAULT_MINUTES = { shapes: 2, trouble: 2, hard: 2, change: 2, strum: 3, order: 3, section: 3, exercise: 3 };
const DEFAULT_TEMPO = { shapes: { abs: 60 }, trouble: { abs: 60 }, hard: { abs: 60 }, change: { abs: 60 }, strum: { pct: 70 }, order: { pct: 85 }, section: { pct: 85 } };
const CHORD_TOKEN = /^[A-G][#b]?[A-Za-z0-9#+°ø()/-]*$/;

/** Free Practice exercise by its id or its title (without the bit in brackets), any case */
function findExercise(name) {
  const catalog = require('./practice-catalog');
  const want = String(name || '').trim().toLowerCase();
  const plain = (t) => String(t).toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').trim();
  return catalog.EXERCISES.find((e) => e.id === want || e.title.toLowerCase() === want || plain(e.title) === plain(want)) || null;
}

/** One step's words (no minutes, tempo or note) -> { kind, ... } or { problem } */
function readStep(body) {
  let m;
  if ((m = body.match(/^shapes?\b:?\s*(.*)$/i))) {
    const chords = m[1].split(/[\s,]+/).filter(Boolean);
    const bad = chords.find((c) => !CHORD_TOKEN.test(c));
    return bad ? { problem: `"${bad}" isn't a chord` } : { kind: 'shapes', chords };
  }
  if (/^trouble\s+spots?$/i.test(body)) return { kind: 'trouble' };
  if ((m = body.match(/^hard(?:est)?\s+changes?(?:\s+(\d))?$/i))) return { kind: 'hard', count: Math.max(1, Math.min(6, Number(m[1]) || 2)) };
  if ((m = body.match(/^change\b:?\s*(\S+)\s+to\s+(\S+)$/i))) {
    const bad = [m[1], m[2]].find((c) => !CHORD_TOKEN.test(c));
    return bad ? { problem: `"${bad}" isn't a chord` } : { kind: 'change', from: m[1], to: m[2] };
  }
  if ((m = body.match(/^strum\b:?\s*(.*)$/i))) {
    const pattern = m[1].trim();
    if (pattern && !/^[DUXMBb>\-|\s]+$/i.test(pattern)) return { problem: `"${pattern}" isn't a strum (D U X M B b - and >)` };
    return { kind: 'strum', pattern: pattern.replace(/[dux m]/g, (c) => c.toUpperCase()).replace(/\s+/g, '') };
  }
  if (/^chords\s+in\s+order$/i.test(body)) return { kind: 'order' };
  if ((m = body.match(/^section\b:?\s*(.+)$/i))) return { kind: 'section', name: m[1].trim() };
  if ((m = body.match(/^exercise\b:?\s*(.+)$/i))) {
    const ex = findExercise(m[1]);
    return ex ? { kind: 'exercise', id: ex.id, title: ex.title } : { problem: `No Free Practice exercise called "${m[1].trim()}"` };
  }
  return null;
}

/**
 * The plan's text -> { intro, steps, after, problems }
 *   steps: [{ line, minutes, kind, tempo: { abs } | { pct } | null, note, ... }]
 *   problems: [{ line, message }] (1-based lines): lines it can't read are left out
 */
function parsePlan(text) {
  const intro = [];
  const steps = [];
  const problems = [];
  let after = '';
  String(text || '').replace(/\r\n?/g, '\n').split('\n').forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    let m;
    if ((m = trimmed.match(/^then\b:?\s*(.*)$/i))) { after = m[1].trim(); return; }
    let body = trimmed;
    let note = '';
    const semi = body.indexOf(';');
    if (semi >= 0) { note = body.slice(semi + 1).trim(); body = body.slice(0, semi).trim(); }
    let minutes = null;
    if ((m = body.match(/^(\d{1,2})\s*(?:min|mins|minutes?)\b\.?\s*(.*)$/i))) { minutes = Math.max(1, Math.min(30, Number(m[1]))); body = m[2].trim(); }
    let tempo = null;
    if ((m = body.match(/^(.*?)\s+at\s+(\d{2,3})\s*(%|bpm)?$/i))) {
      body = m[1].trim();
      tempo = m[3] === '%' ? { pct: Math.max(30, Math.min(150, Number(m[2]))) } : { abs: Math.max(30, Math.min(240, Number(m[2]))) };
    }
    const step = readStep(body);
    if (step && step.problem) { problems.push({ line, message: step.problem }); return; }
    if (!step) {
      if (!steps.length && minutes === null && !tempo && !note) { intro.push(trimmed); return; }   // words before the steps
      problems.push({ line, message: `Not a step ukemusic knows: "${body || trimmed}"` });
      return;
    }
    steps.push({ line, minutes: minutes || DEFAULT_MINUTES[step.kind], tempo, note, ...step });
  });
  return { intro: intro.join(' '), steps, after, problems };
}

/** The chords of a section ("Chorus", "Verse 2"; the first one called that), in order */
function sectionSequence(ir, name) {
  const want = String(name || '').trim().toLowerCase();
  const out = [];
  let inIt = false;
  let found = false;
  for (const n of ir || []) {
    if (n.type === 'structure') {
      if (found && inIt) break;
      const label = String(n.content || '').replace(/[:：]\s*$/, '').trim().toLowerCase();
      inIt = label === want || (!found && label.replace(/\s+\d+$/, '') === want);
      if (inIt) found = true;
      continue;
    }
    if (inIt && n.type === 'chord' && !n.noChord && !n.hidden && n.content && out[out.length - 1] !== n.content) out.push(n.content);
  }
  return found ? out : null;
}

/** The plan, ready for Free Practice: { name, title, intro, steps, after, song, problems, warnings } */
function resolvePlan(parsed, { title = 'this song', ir = [], changes = [], strum = '', tempo = 90, trouble = [], song = null, shift = 0 } = {}) {
  const { transposeChord } = require('./transpose');
  const move = (c) => (shift ? transposeChord(c, shift) : c);
  const shapes = chordSet(ir);
  const sequence = chordSequence(ir).slice(0, MAX_BARS);
  const pattern = songStrum(ir) || strum || 'D-DU-UDU';
  const t = Number(tempo) || 90;
  const at = (st) => {
    const w = st.tempo || DEFAULT_TEMPO[st.kind];
    if (!w) return null;
    return w.abs ? w.abs : clamp(round5(t * w.pct / 100), 40, 200);
  };
  const steps = [];
  const warnings = [];
  const used = [];   // changes already in the plan
  const missing = (chords) => chords.filter((c) => !shapes.includes(c));
  const warn = (st, chords) => {
    const gone = missing(chords);
    if (gone.length) warnings.push({ line: st.line, message: `${gone.join(', ')} ${gone.length > 1 ? 'aren\'t' : 'isn\'t'} in the song any more` });
    return gone.length ? `${gone.join(', ')} not in the song any more` : '';
  };
  const change = (st, from, to, label) => {
    used.push(`${from}>${to}`);
    steps.push({ id: 'chord-change', minutes: st.minutes, label, from, to, note: st.note, settings: { prEvery: 'bar', prTempo: at(st) } });
  };
  for (const st of parsed.steps) {
    if (st.kind === 'shapes') {
      const chords = st.chords.length ? st.chords.map(move) : shapes.slice(0, MAX_SHAPES);
      if (!chords.length) continue;
      const gone = st.chords.length ? warn(st, chords) : '';
      steps.push({ id: 'shape-drill', minutes: st.minutes, label: st.chords.length ? `Shapes: ${chords.join(' ')}` : 'The shapes', note: st.note, warning: gone, settings: { prDrillSet: chords.join(' '), prDrillOrder: 'mix', prTempo: at(st) } });
    } else if (st.kind === 'trouble') {
      for (const c of troubleChanges(ir, trouble).filter((c) => !used.includes(`${c.from}>${c.to}`)).slice(0, 2)) {
        change(st, c.from, c.to, `Your trouble spot${c.line ? ` (line ${c.line})` : ''}: ${c.from} to ${c.to}`);
      }
    } else if (st.kind === 'hard') {
      const hard = (changes || []).filter((c) => c && c.from && c.to && !c.missing && c.from !== c.to && !used.includes(`${c.from}>${c.to}`)).slice(0, st.count);
      hard.forEach((c, i) => change(st, c.from, c.to, `Hard change${hard.length > 1 ? ` ${i + 1}` : ''}: ${c.from} to ${c.to}`));
    } else if (st.kind === 'change') {
      const from = move(st.from);
      const to = move(st.to);
      const gone = warn(st, [from, to]);
      change(st, from, to, `Change: ${from} to ${to}`);
      if (gone) steps[steps.length - 1].warning = gone;
    } else if (st.kind === 'strum') {
      if (!shapes.length) continue;
      const p = st.pattern || pattern;
      steps.push({ id: 'learn-strum', minutes: st.minutes, label: st.pattern ? `Strum: ${p}` : 'The strum', strum: p, note: st.note, settings: { prStrumSteps: true, prStrumB: '', prProgression: '', prChords: shapes.slice(0, 4).join(' '), prClick: true, prTempo: at(st) } });
    } else if (st.kind === 'order' || st.kind === 'section') {
      const seq = st.kind === 'order' ? sequence : sectionSequence(ir, st.name);
      if (!seq) { warnings.push({ line: st.line, message: `The song has no section called "${st.name}"` }); continue; }
      if (!seq.length) continue;
      steps.push({ id: 'metronome-strum', minutes: st.minutes, label: st.kind === 'order' ? 'The chords in order' : `Section: ${st.name}`, strum: pattern, note: st.note, settings: { prStrumSteps: false, prStrumB: '', prProgression: '', prChords: seq.slice(0, MAX_BARS).join(' '), prClick: true, prTempo: at(st) } });
    } else if (st.kind === 'exercise') {
      const tp = at(st);
      steps.push({ id: st.id, minutes: st.id === 'one-minute' ? 1 : st.minutes, label: st.title, note: st.note, settings: tp ? { prTempo: tp } : {} });
    }
  }
  // the ending: "Then: …", with the song's tempo when it speaks of its speed
  const then = parsed.after.replace(/[.!?]+$/, '');
  const after = then
    ? `${then.charAt(0).toUpperCase()}${then.slice(1)}${/speed|tempo/i.test(then) ? ` (${t} bpm)` : ''}.`
    : `Now the song itself, from memory, at its own speed (${t} bpm).`;
  return { name: `Practise: ${title}`, title, intro: parsed.intro || '', steps, after, song, problems: parsed.problems, warnings };
}

/** What's wrong with a plan's text, for the Practice tab: [{ line, message }] in line order */
function checkPlan(text, context) {
  const parsed = parsePlan(text);
  const r = context ? resolvePlan(parsed, context) : { warnings: [] };
  return [...parsed.problems, ...r.warnings].sort((a, b) => a.line - b.line);
}

/**
 * 4.99.18: the lines + Add step offers, filled from the song (in its own key): its chords, its
 * hardest changes one by one, its strum, its sections; then every Free Practice exercise.
 *   -> [{ group, label, line }]
 */
function stepChoices({ ir = [], changes = [], strum = '' } = {}) {
  const out = [];
  const add = (group, label, line) => out.push({ group, label, line });
  const chords = chordSet(ir);
  const G = 'From the song';
  add(G, 'Shapes (all the song\'s)', '2 min  Shapes');
  if (chords.length > 2) add(G, `Shapes: ${chords.slice(0, 3).join(' ')}`, `2 min  Shapes ${chords.slice(0, 3).join(' ')}`);
  add(G, 'Your trouble spots', '2 min  Trouble spots');
  add(G, 'Hard changes (the two hardest)', '2 min  Hard changes 2');
  for (const c of (changes || []).filter((x) => x && x.from && x.to && !x.missing && x.from !== x.to).slice(0, 4)) add(G, `Change ${c.from} to ${c.to}`, `2 min  Change ${c.from} to ${c.to} at 60`);
  add(G, 'The strum (the song\'s)', '3 min  Strum at 70%');
  const own = songStrum(ir) || strum;
  if (own) add(G, `Strum ${own}`, `3 min  Strum ${own} at 70%`);
  add(G, 'The chords in order', '3 min  Chords in order at 85%');
  const sections = [];
  for (const n of ir || []) {
    if (n.type !== 'structure') continue;
    const name = String(n.content || '').replace(/[:：]\s*$/, '').trim();
    if (name && !sections.includes(name)) sections.push(name);
  }
  for (const name of sections.slice(0, 8)) add(G, `Section: ${name}`, `3 min  Section ${name} at 85%`);
  add('Words', 'Words at the start', 'Before you start: …');
  add('Words', 'The ending (Then:)', 'Then: the song from memory');
  const catalog = require('./practice-catalog');
  for (const c of catalog.CATEGORIES.filter((x) => x.id !== 'routine')) {
    for (const e of catalog.EXERCISES.filter((x) => x.cat === c.id)) add(`Free Practice: ${c.name}`, e.title, `3 min  Exercise: ${e.title.replace(/\s*\(.*?\)\s*/g, ' ').trim()}`);
  }
  return out;
}

function songPlan({ title = 'this song', ir = [], changes = [], strum = '', tempo = 90, trouble = [], song = null, planText = '', shift = 0 } = {}) {
  // 4.99.17: the song's own plan (learn/practice-plan.txt), or the one ukemusic makes (AUTO_TEXT)
  const plan = resolvePlan(parsePlan(planText || AUTO_TEXT), { title, ir, changes, strum, tempo, trouble, song, shift });
  plan.own = Boolean(String(planText || '').trim());
  return plan;
}

module.exports = { songPlan, stepChoices, parsePlan, resolvePlan, checkPlan, findExercise, sectionSequence, AUTO_TEXT, chordSequence, chordSet, songStrum, troubleChanges, MAX_SHAPES, MAX_BARS };
