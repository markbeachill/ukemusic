// 4.99.4: the strum builder. A bar as a row of slots counted 1 & 2 & …; pick a stroke and tap
// the slots to place it, hear it, and keep it in My strums (src/my-strums.js). One module for the
// desktop app and the web player: the host gives it a container and what it can do (hear a
// pattern, keep My strums, use a strum for the song).
//
//   const builder = createStrumBuilder(container, host)
//   builder.load('D-DU-UDU', 4)          start from a pattern
//   host: {
//     strums,                           the strum library (src/strums.js)
//     getMine() / setMine(list)         My strums ([{ name, beats, pattern }]); setMine may be async
//     hear(pattern, beats, tempo)       play a few bars of it (a promise); stop()
//     tempo                             the starting tempo (the song's)
//     uses: [{ label, title, run(strum) }]   what to do with it: use it for this song, add it…
//     renderBox(pattern, beats)         optional: the strum as it looks on the sheet (HTML)
//   }
// The pure parts (stepsFrom, patternOf, countsFor, advice) are exported for the tests.

(function (root) {
const { parseMyStrums, saveStrum, removeStrum, cleanName, TIMES } = (typeof module !== 'undefined' && module.exports) ? require('./my-strums') : root.UkeMyStrums;

const STROKES = [
  { s: 'D', glyph: '↓', label: 'Down', title: 'A down-strum' },
  { s: 'U', glyph: '↑', label: 'Up', title: 'An up-strum' },
  { s: 'X', glyph: '✕', label: 'Chuck', title: 'A chuck: strum and mute the strings at once with the side of the hand, for a percussive "chk"' },
  { s: 'M', glyph: '⇣', label: 'Muted', title: 'A palm-muted down: the heel of the strumming hand rests on the strings by the bridge, so the chord is short and thuddy' },
  { s: 'B', glyph: 'B', label: 'Bass', title: "The chord's bass note on its own (its root, on the lowest string that has it): pick it with your thumb" },
  { s: 'b', glyph: 'b', label: 'Other bass', title: 'The other bass note (usually the fifth): alternate it with B for boom-chick' },
  { s: '-', glyph: '·', label: 'Rest', title: 'Nothing: the hand still moves, but misses the strings' }
];
const GLYPH = Object.fromEntries(STROKES.map((x) => [x.s, x.glyph]));
const PER_BEAT = [
  { n: 1, label: 'Beats' },
  { n: 2, label: 'Eighths' },
  { n: 3, label: 'Triplets' },
  { n: 4, label: 'Sixteenths' }
];

/** "D>-DU" -> [{ s: 'D', acc: true }, { s: '-' }, { s: 'D' }, { s: 'U' }] */
function stepsFrom(pattern) {
  const steps = [];
  for (const ch of String(pattern || '')) {
    if (ch === '>') { if (steps.length && steps[steps.length - 1].s !== '-') steps[steps.length - 1].acc = true; continue; }
    if (GLYPH[ch] !== undefined) steps.push({ s: ch, acc: false });
  }
  return steps;
}

/** The steps as a pattern: "D>-DU" */
function patternOf(steps) {
  return steps.map((x) => x.s + (x.acc && x.s !== '-' ? '>' : '')).join('');
}

/** How many slots a beat has, for a pattern of n strokes in a bar of `beats` (0 if it doesn't fit) */
function perBeatFor(n, beats) {
  const per = n / beats;
  return [1, 2, 3, 4].includes(per) ? per : 0;
}

/** What to count under each slot: [{ text, beat, strong }] */
function countsFor(beats, perBeat) {
  const subs = { 1: [], 2: ['&'], 3: ['&', 'a'], 4: ['e', '&', 'a'] }[perBeat] || [];
  const out = [];
  for (let b = 1; b <= beats; b += 1) {
    out.push({ text: String(b), beat: true, strong: b === 1 || (beats === 6 && b === 4) || (beats === 4 && b === 3) });
    for (const s of subs) out.push({ text: s, beat: false, strong: false });
  }
  return out;
}

/** The slots for a new bar: the old strokes kept where they still fall on a slot */
function regrid(steps, slots) {
  const out = Array.from({ length: slots }, () => ({ s: '-', acc: false }));
  steps.forEach((x, i) => {
    const at = (i * slots) / Math.max(1, steps.length);
    if (Number.isInteger(at) && at < slots) out[at] = { ...x };
  });
  if (!out.some((x) => x.s !== '-')) out[0] = { s: 'D', acc: false };
  return out;
}

/** A few plain-English notes on a pattern: how to play it, and anything unusual */
function advice(steps, beats, perBeat) {
  const notes = [];
  const strokes = steps.filter((x) => x.s !== '-');
  if (!strokes.length) return ['Pick a stroke above, then tap the slots to place it.'];
  if (perBeat === 2 || perBeat === 4) {
    notes.push(perBeat === 2
      ? 'Keep the hand moving all the time: down on the numbers, up on the "&"s. It only touches the strings where there\'s a stroke.'
      : 'Sixteenths: down on the numbers and the "&"s, up on the "e"s and "a"s, with the hand moving twice as fast.');
    const downOnUp = [];
    const upOnDown = [];
    steps.forEach((x, i) => {
      const handDown = i % 2 === 0;
      const name = countsFor(beats, perBeat)[i].text;
      if (x.s === 'U' && handDown) upOnDown.push(name);
      if ((x.s === 'D' || x.s === 'M') && !handDown) downOnUp.push(name);
    });
    if (upOnDown.length) notes.push(`An up where the hand is going down (on ${upOnDown.join(', ')}): it works, but it breaks the down-up motion. Most strums keep the downs there.`);
    if (downOnUp.length) notes.push(`A down where the hand is coming up (on ${downOnUp.join(', ')}): the hand has to make an extra move to get back up, which is harder at speed.`);
  } else if (perBeat === 3) {
    notes.push('Triplets: three strokes to a beat, down-up-down or down-down-up; this is the shuffle and 12/8 feel.');
  }
  if (strokes.some((x) => x.s === 'B' || x.s === 'b')) {
    notes.push('B and b are bass notes: pick them with your thumb (or the pick) on the low strings, then strum the rest. They suit a guitar or baritone; a high-G ukulele plays its lowest strings instead.');
  }
  if (strokes.some((x) => x.s === 'M')) notes.push('Muted strokes: rest the heel of your strumming hand lightly on the strings by the bridge.');
  if (strokes.some((x) => x.s === 'X')) notes.push('Chucks: strum and stop the strings at once with the side of the hand, for a "chk" on the beat.');
  if (!strokes.some((x) => x.acc)) notes.push('Tip: an accent (>) on beat 1, or on 2 and 4, gives the strum its shape.');
  return notes;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
}

function createStrumBuilder(root, host = {}) {
  const state = { beats: 4, perBeat: 2, steps: [], tool: 'D', mine: [], playing: false };
  root.classList.add('strum-builder');
  root.replaceChildren();

  // ── Time and slots ──
  const timeRow = el('div', { class: 'sbd-chips', role: 'group', 'aria-label': 'Time signature' });
  const perRow = el('div', { class: 'sbd-chips', role: 'group', 'aria-label': 'Slots in a beat' });
  const startSel = el('select', { id: 'sbdStart', 'aria-label': 'Start from' });
  root.append(el('div', { class: 'sbd-row' }, [
    el('div', { class: 'sbd-field' }, [el('span', { class: 'sbd-label', text: 'Time' }), timeRow]),
    el('div', { class: 'sbd-field' }, [el('span', { class: 'sbd-label', text: 'Slots' }), perRow]),
    el('div', { class: 'sbd-field' }, [el('label', { class: 'sbd-label', for: 'sbdStart', text: 'Start from' }), startSel])
  ]));

  // ── The strokes to place ──
  const palette = el('div', { class: 'sbd-palette', role: 'group', 'aria-label': 'Stroke to place' });
  const accentTool = el('button', { type: 'button', class: 'sbd-tool sbd-accent', title: 'Accent: tap a stroke to play it harder (tap again to take it off)', 'aria-pressed': 'false', onclick: () => setTool('>') }, [el('b', { text: '>' }), el('span', { text: 'Accent' })]);
  for (const x of STROKES) {
    palette.append(el('button', { type: 'button', class: 'sbd-tool', 'data-stroke': x.s, title: x.title, 'aria-pressed': 'false', onclick: () => setTool(x.s) }, [el('b', { text: x.glyph }), el('span', { text: x.label })]));
  }
  palette.append(accentTool);
  root.append(el('p', { class: 'sbd-help', text: 'Pick a stroke, then tap the slots to place it (tap a slot again to empty it).' }), palette);

  // ── The bar ──
  const grid = el('div', { class: 'sbd-grid', role: 'group', 'aria-label': 'The bar' });
  root.append(el('div', { class: 'sbd-grid-wrap' }, [grid]));
  const text = el('input', { id: 'sbdPattern', type: 'text', spellcheck: 'false', class: 'sbd-text', 'aria-label': 'The pattern as letters', title: 'The pattern as letters: D down, U up, X chuck, M muted, B and b bass notes, - rest, > after a stroke to accent it. Type here or tap the slots.' });
  const textNote = el('span', { class: 'sbd-text-note' });
  root.append(el('div', { class: 'sbd-row sbd-letters' }, [el('label', { class: 'sbd-label', for: 'sbdPattern', text: 'As letters' }), text, textNote]));
  const box = el('div', { class: 'sbd-box' });
  root.append(box);
  const notes = el('ul', { class: 'sbd-advice' });
  root.append(notes);

  // ── Hear it ──
  const tempo = el('input', { id: 'sbdTempo', type: 'number', min: '40', max: '220', step: '5', value: String(host.tempo || 90), 'aria-label': 'Tempo (bpm)' });
  const hearBtn = el('button', { type: 'button', class: 'sbd-hear primary', onclick: () => toggleHear() }, [el('span', { text: '▶ Hear it' })]);
  root.append(el('div', { class: 'sbd-row' }, [hearBtn, el('label', { class: 'sbd-label', for: 'sbdTempo', text: 'Tempo' }), tempo, el('span', { class: 'sbd-unit', text: 'bpm' })]));

  // ── Keep it ──
  const name = el('input', { id: 'sbdName', type: 'text', maxlength: '40', placeholder: 'A name, like "Skiffle"', 'aria-label': 'Name' });
  const saveBtn = el('button', { type: 'button', onclick: () => save() }, [el('span', { text: 'Save to My strums' })]);
  const usesRow = el('div', { class: 'sbd-row sbd-uses' });
  for (const use of host.uses || []) {
    usesRow.append(el('button', { type: 'button', title: use.title || '', onclick: () => use.run(current()) }, [el('span', { text: use.label })]));
  }
  const saved = el('p', { class: 'sbd-saved', 'aria-live': 'polite' });
  const mineList = el('div', { class: 'sbd-mine' });
  root.append(el('div', { class: 'sbd-row' }, [el('label', { class: 'sbd-label', for: 'sbdName', text: 'Name' }), name, saveBtn]), usesRow, saved,
    el('h3', { class: 'sbd-h', text: 'My strums' }), mineList);

  function current() {
    return { name: cleanName(name.value) || 'My strum', beats: state.beats, pattern: patternOf(state.steps) };
  }

  function setTool(tool) {
    state.tool = tool;
    for (const b of palette.querySelectorAll('.sbd-tool')) {
      const on = (b.dataset.stroke || '>') === tool;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
    }
  }

  function renderChips() {
    timeRow.replaceChildren(...[4, 3, 6, 2].map((b) => el('button', { type: 'button', class: b === state.beats ? 'on' : '', 'aria-pressed': String(b === state.beats), onclick: () => setTime(b, state.perBeat) }, [el('span', { text: TIMES[b] })])));
    const pers = state.beats === 6 ? PER_BEAT.slice(0, 2) : PER_BEAT;
    perRow.replaceChildren(...pers.map((p) => el('button', { type: 'button', class: p.n === state.perBeat ? 'on' : '', 'aria-pressed': String(p.n === state.perBeat), title: state.beats === 6 && p.n === 1 ? 'Six eighths: one slot each' : '', onclick: () => setTime(state.beats, p.n) }, [el('span', { text: state.beats === 6 && p.n === 1 ? 'Eighths' : state.beats === 6 ? 'Sixteenths' : p.label })])));
    const fits = (host.strums || []).filter((s) => s.beats === state.beats);
    const mine = state.mine.filter((s) => s.beats === state.beats);
    startSel.replaceChildren(el('option', { value: '', text: 'Choose a strum…' }),
      ...(mine.length ? [el('optgroup', { label: 'My strums' }, mine.map((s) => el('option', { value: s.pattern, text: `${s.name}: ${s.pattern}` })))] : []),
      el('optgroup', { label: 'The strum library' }, fits.map((s) => el('option', { value: s.pattern, text: `${s.name}: ${s.pattern}` }))));
  }

  function setTime(beats, perBeat) {
    const per = beats === 6 ? Math.min(perBeat, 2) : perBeat;
    state.steps = regrid(state.steps, beats * per);
    state.beats = beats;
    state.perBeat = per;
    render();
  }

  function tap(i) {
    const x = state.steps[i];
    if (state.tool === '>') {
      if (x.s !== '-') x.acc = !x.acc;
    } else if (x.s === state.tool) {
      state.steps[i] = { s: '-', acc: false };
    } else {
      state.steps[i] = { s: state.tool, acc: x.acc && state.tool !== '-' };
    }
    render();
  }

  function render() {
    renderChips();
    const counts = countsFor(state.beats, state.perBeat);
    grid.style.setProperty('--slots', String(state.steps.length));
    grid.replaceChildren(
      ...counts.map((c) => el('span', { class: `sbd-count${c.beat ? ' beat' : ''}${c.strong ? ' strong' : ''}`, text: c.text })),
      ...state.steps.map((x, i) => el('button', {
        type: 'button',
        class: `sbd-slot${x.s === '-' ? ' rest' : ''}${x.acc ? ' acc' : ''}${counts[i] && counts[i].beat ? ' beat' : ''}`,
        'data-i': String(i),
        'aria-label': `${counts[i] ? counts[i].text : i + 1}: ${(STROKES.find((y) => y.s === x.s) || {}).label || x.s}${x.acc ? ', accented' : ''}`,
        onclick: () => tap(i)
      }, [el('span', { text: GLYPH[x.s] || x.s })]))
    );
    const pattern = patternOf(state.steps);
    if (document.activeElement !== text) text.value = pattern;
    textNote.textContent = '';
    box.innerHTML = host.renderBox ? host.renderBox(pattern, state.beats) : '';
    notes.replaceChildren(...advice(state.steps, state.beats, state.perBeat).map((t) => el('li', { text: t })));
    renderMine();
  }

  function renderMine() {
    if (!state.mine.length) {
      mineList.replaceChildren(el('p', { class: 'sbd-empty', text: 'None yet: build one above, give it a name and save it. My strums are kept in your settings, and show wherever you choose a strum.' }));
      return;
    }
    mineList.replaceChildren(...state.mine.map((s) => el('div', { class: 'sbd-mine-row' }, [
      el('b', { text: s.name }), el('code', { text: `${TIMES[s.beats]} ${s.pattern}` }),
      el('button', { type: 'button', title: 'Open it in the builder', onclick: () => { name.value = s.name; load(s.pattern, s.beats); } }, [el('span', { text: 'Open' })]),
      el('button', { type: 'button', title: 'Remove it from My strums (songs that use it keep their pattern)', onclick: () => remove(s.name) }, [el('span', { text: 'Remove' })])
    ])));
  }

  async function save() {
    const strum = current();
    if (!cleanName(name.value)) { saved.textContent = 'Give it a name first.'; name.focus(); return; }
    if (!strum.pattern.replace(/[->]/g, '')) { saved.textContent = 'Place a stroke or two first.'; return; }
    state.mine = saveStrum(state.mine, strum);
    await host.setMine?.(state.mine);
    saved.textContent = `Saved "${strum.name}" to My strums.`;
    render();
  }

  async function remove(n) {
    state.mine = removeStrum(state.mine, n);
    await host.setMine?.(state.mine);
    saved.textContent = `Removed "${n}" from My strums.`;
    render();
  }

  async function toggleHear() {
    if (state.playing) { host.stop?.(); return; }
    state.playing = true;
    hearBtn.firstChild.textContent = '■ Stop';
    try {
      await host.hear?.(patternOf(state.steps), state.beats, Math.max(40, Math.min(220, Number(tempo.value) || 90)));
    } catch (error) {
      saved.textContent = error && error.message ? error.message : 'It couldn’t play.';
    } finally {
      state.playing = false;
      hearBtn.firstChild.textContent = '▶ Hear it';
    }
  }

  function load(pattern, beats = 4) {
    const steps = stepsFrom(pattern);
    const b = [4, 3, 6, 2].includes(Number(beats)) ? Number(beats) : 4;
    const per = perBeatFor(steps.length, b);
    state.beats = b;
    if (per) {
      state.perBeat = b === 6 ? Math.min(per, 2) : per;
      state.steps = per === state.perBeat ? steps : regrid(steps, b * state.perBeat);
    } else {
      state.perBeat = b === 6 ? 1 : 2;
      state.steps = regrid(steps, b * state.perBeat);
    }
    render();
  }

  text.addEventListener('input', () => {
    const steps = stepsFrom(text.value);
    const per = perBeatFor(steps.length, state.beats);
    if (per && (state.beats !== 6 || per <= 2)) {
      state.perBeat = per;
      state.steps = steps;
      render();
    } else {
      textNote.textContent = steps.length ? `${steps.length} strokes don't fill a bar of ${TIMES[state.beats]} evenly: use ${[1, 2, 3, 4].filter((p) => state.beats !== 6 || p <= 2).map((p) => p * state.beats).join(', ')}.` : '';
    }
  });
  text.addEventListener('blur', () => { text.value = patternOf(state.steps); textNote.textContent = ''; });
  startSel.addEventListener('change', () => {
    if (startSel.value) load(startSel.value, state.beats);
    startSel.value = '';
  });

  state.mine = parseMyStrums('').concat(host.getMine ? host.getMine() || [] : []);
  setTool('D');
  load('D-DU-UDU', 4);
  return { load, element: root, setMine(list) { state.mine = list || []; render(); }, stopped() { state.playing = false; hearBtn.firstChild.textContent = '▶ Hear it'; } };
}

/** The builder's look, for both apps (their own colours, through CSS variables) */
function builderCss() {
  return `
  .strum-builder { --sbd-line: var(--border, var(--line, #c9ced6)); --sbd-ink: var(--text, var(--ink, #111)); --sbd-soft: var(--muted, #666); --sbd-on: var(--accent, var(--brand, #1d4ed8)); --sbd-bg: var(--panel-bg, var(--card, #fff)); display: grid; gap: 10px; color: var(--sbd-ink); }
  .strum-builder .sbd-row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
  .strum-builder, .strum-builder > * { min-width: 0; max-width: 100%; }
  .strum-builder select { max-width: 100%; font: inherit; padding: 4px 6px; border: 1px solid var(--sbd-line); border-radius: 6px; background: var(--sbd-bg); color: var(--sbd-ink); }
  .strum-builder .sbd-row button, .strum-builder .sbd-mine-row button { border: 1px solid var(--sbd-line); background: var(--sbd-bg); color: var(--sbd-ink); border-radius: 6px; padding: 6px 12px; min-height: 34px; }
  .strum-builder .sbd-row button.sbd-hear { background: var(--sbd-on); border-color: var(--sbd-on); color: #fff; font-weight: 700; }
  .strum-builder .sbd-text, .strum-builder #sbdName { min-width: 0; flex: 1 1 12em; }
  .strum-builder .sbd-field { display: grid; gap: 4px; min-width: 0; max-width: 100%; }
  .strum-builder .sbd-field:has(select) { flex: 1 1 14em; }
  .strum-builder .sbd-field select { width: 100%; }
  .strum-builder .sbd-label { font-size: 12px; color: var(--sbd-soft); font-weight: 600; }
  .strum-builder .sbd-chips { display: flex; flex-wrap: wrap; gap: 4px; }
  .strum-builder button { font: inherit; cursor: pointer; }
  .strum-builder .sbd-chips button, .strum-builder .sbd-tool { border: 1px solid var(--sbd-line); background: var(--sbd-bg); color: var(--sbd-ink); border-radius: 6px; padding: 5px 10px; min-height: 34px; }
  .strum-builder .sbd-chips button.on, .strum-builder .sbd-tool.on { border-color: var(--sbd-on); box-shadow: inset 0 0 0 1px var(--sbd-on); font-weight: 700; }
  .strum-builder .sbd-palette { display: flex; flex-wrap: wrap; gap: 6px; }
  .strum-builder .sbd-tool { display: inline-flex; flex-direction: column; align-items: center; gap: 1px; min-width: 58px; }
  .strum-builder .sbd-tool b { font-size: 20px; line-height: 1.1; }
  .strum-builder .sbd-tool span { font-size: 11px; }
  .strum-builder .sbd-help { margin: 0; font-size: 13px; color: var(--sbd-soft); }
  .strum-builder .sbd-grid-wrap { overflow-x: auto; padding-bottom: 2px; }
  .strum-builder .sbd-grid { display: grid; grid-template-columns: repeat(var(--slots), minmax(34px, 1fr)); gap: 4px; min-width: min-content; }
  .strum-builder .sbd-count { text-align: center; font-size: 13px; color: var(--sbd-soft); }
  .strum-builder .sbd-count.beat { color: var(--sbd-ink); font-weight: 700; }
  .strum-builder .sbd-count.strong { color: var(--sbd-on); }
  .strum-builder .sbd-slot { height: 52px; border: 1px solid var(--sbd-line); border-radius: 6px; background: var(--sbd-bg); color: var(--sbd-ink); font-size: 24px; font-weight: 600; padding: 0; }
  .strum-builder .sbd-slot.beat { border-color: var(--sbd-ink); }
  .strum-builder .sbd-slot.rest { color: var(--sbd-soft); }
  .strum-builder .sbd-slot.acc { font-weight: 900; color: var(--chord-color, #b22222); text-decoration: underline; text-underline-offset: 4px; }
  .strum-builder .sbd-text { font: 600 15px/1.2 ui-monospace, "Cascadia Mono", Consolas, monospace; padding: 5px 8px; border: 1px solid var(--sbd-line); border-radius: 6px; background: var(--sbd-bg); color: var(--sbd-ink); }
  .strum-builder .sbd-text-note { font-size: 12px; color: var(--sbd-soft); }
  .strum-builder .sbd-advice { margin: 0; padding-left: 18px; font-size: 13px; display: grid; gap: 3px; }
  .strum-builder #sbdTempo { width: 5em; }
  .strum-builder #sbdName { padding: 5px 8px; border: 1px solid var(--sbd-line); border-radius: 6px; background: var(--sbd-bg); color: var(--sbd-ink); }
  .strum-builder input { font: inherit; }
  .strum-builder .sbd-saved { margin: 0; font-size: 13px; min-height: 1.2em; }
  .strum-builder .sbd-h { margin: 6px 0 0; font-size: 15px; }
  .strum-builder .sbd-mine { display: grid; gap: 4px; }
  .strum-builder .sbd-mine-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .strum-builder .sbd-mine-row code { font-size: 13px; }
  .strum-builder .sbd-empty { margin: 0; font-size: 13px; color: var(--sbd-soft); }
  .strum-builder .sbd-box:empty { display: none; }
  `;
}

const api = { createStrumBuilder, builderCss, stepsFrom, patternOf, perBeatFor, countsFor, regrid, advice, STROKES };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.UkeStrumBuilder = api;   // a page script: the desktop app and the web player
})(typeof window !== 'undefined' ? window : globalThis);
