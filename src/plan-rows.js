// 4.99.22: a song's practice plan as rows to change (the Practice tab, desktop and web player):
// each step a row with its minutes, tempo and note, Move up, Move down and Remove. The plan stays
// text (learn/practice-plan.txt): a row's change rewrites its line, so plans written by hand,
// sharing and the learn sheet are as they were. "Edit as text" is still there for the whole plan.
//
//   rowLine({ minutes, what, tempo, note }) -> "3 min  Section Chorus at 85%  ; hold the F"
//   editLine(text, line, fields) / moveLine(text, line, dir, stepLines) / removeLine(text, line)
//   render(holder, { text, parsed, plan, onText }): the rows, in a page
//
// Pure apart from render(); a page script (root.UkePlanRows) and a Node module. Unit tested.
(function (root) {
const lines = (text) => String(text || '').replace(/\r\n?/g, '\n').split('\n');

/** A tempo as written: 60, or 70% of the song's; '' for the step's usual */
function tempoText(tempo) {
  if (!tempo) return '';
  return tempo.pct ? `${tempo.pct}%` : String(tempo.abs);
}

/** A row's fields -> its line of the plan */
function rowLine({ minutes, what, tempo = '', note = '' }) {
  const raw = String(minutes ?? '').trim() === '' ? NaN : Number(minutes);
  const m = Number.isFinite(raw) ? Math.max(1, Math.min(30, Math.round(raw))) : 2;
  const t = String(tempo || '').trim().replace(/\s+/g, '').replace(/bpm$/i, '');
  const at = /^\d{2,3}%?$/.test(t) ? ` at ${t}` : '';
  const n = String(note || '').replace(/[\r\n]+/g, ' ').trim();
  return `${m} min  ${String(what || '').trim()}${at}${n ? `  ; ${n}` : ''}`;
}

/** The plan with line (1-based) replaced by the row's fields */
function editLine(text, line, fields) {
  const out = lines(text);
  if (line < 1 || line > out.length) return String(text || '');
  out[line - 1] = rowLine(fields);
  return out.join('\n');
}

/** The plan with line swapped with the step before (dir -1) or after (dir 1); stepLines: the steps' lines, in order */
function moveLine(text, line, dir, stepLines) {
  const at = stepLines.indexOf(line);
  const other = stepLines[at + dir];
  if (at < 0 || other === undefined) return String(text || '');
  const out = lines(text);
  [out[line - 1], out[other - 1]] = [out[other - 1], out[line - 1]];
  return out.join('\n');
}

/** The plan without line */
function removeLine(text, line) {
  const out = lines(text);
  if (line < 1 || line > out.length) return String(text || '');
  out.splice(line - 1, 1);
  return out.join('\n');
}

/**
 * The rows, in holder (a page element).
 *   parsed: the plan's text, read (song-practice parsePlan); plan: it made into steps (songPlan),
 *   for what each row comes to for this song; onText(newText): a row changed the plan
 */
function render(holder, { text, parsed, plan, onText }) {
  const doc = holder.ownerDocument;
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(doc.createElement(tag), props); e.append(...kids); return e; };
  const stepLines = parsed.steps.map((s) => s.line);
  const rows = parsed.steps.map((s, i) => {
    const made = (plan.steps || []).filter((x) => x.line === s.line);
    const warn = (plan.warnings || []).find((w) => w.line === s.line);
    const fields = { minutes: s.minutes, what: s.what, tempo: tempoText(s.tempo), note: s.note };
    const change = (key, value) => onText(editLine(text, s.line, { ...fields, [key]: value }));
    const title = el('div', { className: 'plan-row-what' },
      el('span', { className: 'plan-row-n', textContent: `${i + 1}.` }),
      el('span', { className: 'plan-row-label', textContent: made.length ? made.map((x) => x.label).join(' · ') : s.what }));
    if (!made.length && !warn) title.appendChild(el('span', { className: 'plan-row-none', textContent: s.kind === 'trouble' ? ' (no trouble spots marked yet)' : ' (nothing for this song)' }));
    if (warn) title.appendChild(el('span', { className: 'plan-row-warn', textContent: ` ${warn.message}` }));
    const minutes = el('input', { type: 'number', min: 1, max: 30, step: 1, value: String(s.minutes), title: 'Minutes for this step' });
    minutes.setAttribute('aria-label', `Step ${i + 1}: minutes`);
    minutes.addEventListener('change', () => change('minutes', minutes.value));
    const tempo = el('input', { type: 'text', value: fields.tempo, placeholder: 'usual', inputMode: 'numeric', title: 'Tempo: 60 (bpm), or 70% of the song\'s. Empty: the step\'s usual' });
    tempo.setAttribute('aria-label', `Step ${i + 1}: tempo`);
    tempo.size = 4;
    tempo.addEventListener('change', () => change('tempo', tempo.value));
    const note = el('input', { type: 'text', value: s.note || '', placeholder: 'A note to show while practising it', title: 'Shown above the exercise while you practise this step' });
    note.setAttribute('aria-label', `Step ${i + 1}: note`);
    note.addEventListener('change', () => change('note', note.value));
    const button = (label, aria, fn, disabled = false) => {
      const b = el('button', { type: 'button', textContent: label, title: aria, disabled });
      b.setAttribute('aria-label', `${aria}: step ${i + 1}`);
      b.addEventListener('click', fn);
      return b;
    };
    const tools = el('div', { className: 'plan-row-tools' },
      button('▲', 'Move up', () => onText(moveLine(text, s.line, -1, stepLines)), i === 0),
      button('▼', 'Move down', () => onText(moveLine(text, s.line, 1, stepLines)), i === stepLines.length - 1),
      button('✕', 'Remove', () => onText(removeLine(text, s.line))));
    const edit = el('div', { className: 'plan-row-edit' },
      el('label', { className: 'plan-row-min' }, minutes, ' min'),
      el('label', { className: 'plan-row-tempo' }, 'at ', tempo),
      el('label', { className: 'plan-row-note' }, note));
    return el('li', { className: `plan-row${warn ? ' warn' : ''}` }, el('div', { className: 'plan-row-head' }, title, tools), edit);
  });
  holder.replaceChildren(rows.length ? el('ol', { className: 'plan-rows' }, ...rows) : el('p', { className: 'plan-row-empty', textContent: 'No steps yet: + Add step puts one in.' }));
}

const api = { tempoText, rowLine, editLine, moveLine, removeLine, render };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.UkePlanRows = api;   // a page script: the desktop app and the web player
})(typeof window !== 'undefined' ? window : globalThis);
