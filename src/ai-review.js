// 4.99.25: bring back what an AI chat returned for a song (Export → AI chat → Bring back; web player:
// Edit → Help from an AI chat): a zip, the files themselves, or an edit list (EDITS.txt), checked
// against the song as it is before anything changes:
//   the words (are they the same?), the chords (a transposition or a new key?), the bars each part
//   plays (before and after), song.ini setting by setting, the notes (is anything lost?), the
//   practice plan (can ukemusic run every line?)
// Then the files you tick are used. Pure: the desktop app and the web player, and the unit tests.
//
//   gather(files)                        [{ name, text }] -> { chart, notes, ini, plan, review, edits, ignored }
//   parseEdits(text)                     an edit list -> { edits: [{ row, file, kind, line, minus, plus }], problems }
//   applyEdits(current, edits, rows)     the song's files with the chosen rows' edits -> { files, problems }
//   compare(current, back, options)      -> { files: [{ id, name, changed, checks, lines }], bars }
//   reportHtml(result)                   what compare found, as HTML for a dialog
//
//   current / back: { chart, notes, ini, plan } as text (ini: song.ini as text; '' for none)
const parse = require('./parser');
const { songSlots } = require('./playback-schedule');
const { parseIni, stringifyIni } = require('./ini-utils');
const SP = require('./song-practice');

const FILES = [
  { id: 'chart', name: 'The song (words and chords)' },
  { id: 'ini', name: 'Settings (song.ini)' },
  { id: 'notes', name: 'Notes' },
  { id: 'plan', name: 'Practice plan' }
];
const clean = (s) => String(s ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The returned files, sorted out by what they are */
function gather(files = []) {
  const out = { ignored: [] };
  for (const f of files) {
    const name = String(f.name || '').replace(/\\/g, '/');
    const base = name.split('/').pop().toLowerCase();
    const text = clean(f.text);
    let id = null;
    if (base === 'notes.txt') id = 'notes';
    else if (base === 'song.ini') id = 'ini';
    else if (base === 'practice-plan.txt') id = 'plan';
    else if (base === 'review.md') id = 'review';
    else if (base === 'edits.txt' || base === 'edits-returned.txt') id = 'edits';
    else if (base === 'ai-prompt.txt' || /\.md$/.test(base) || /(^|\/)lessons\//i.test(name)) id = null;
    else if (base.endsWith('-song.txt') || base === 'pasted-song.txt' || (/\.txt$/.test(base) && /--START MUSIC--/.test(text))) id = 'chart';
    if (!id) { out.ignored.push(name); continue; }
    if (out[id] !== undefined) { out.ignored.push(`${name} (a second ${id === 'chart' ? 'song' : base})`); continue; }
    out[id] = text;
  }
  return out;
}

// ── the edit list (the same as SongFix2's) ──
const HEAD = /^@@\s+([A-Z])\s+(.+?)\s+(line\s+(\d+)|after\s+line\s+(\d+)|append|set\s+([\w-]+)\.([\w-]+))\s*$/i;
function fileId(name) {
  const base = String(name).trim().split('/').pop().toLowerCase();
  if (base === 'notes.txt') return 'notes';
  if (base === 'song.ini') return 'ini';
  if (base === 'practice-plan.txt') return 'plan';
  if (base === 'chart' || base.endsWith('-song.txt') || base.endsWith('.txt')) return 'chart';
  return null;
}

function parseEdits(text) {
  const edits = [];
  const problems = [];
  let cur = null;
  clean(text).split('\n').forEach((line, i) => {
    const n = i + 1;
    if (line.startsWith('@@')) {
      const m = line.match(HEAD);
      const file = m && fileId(m[2]);
      if (!m || !file) { problems.push(`Line ${n}: not understood: ${line}`); cur = null; return; }
      cur = { row: m[1].toUpperCase(), file, kind: m[4] ? 'replace' : m[5] ? 'after' : m[6] ? 'set' : 'append', line: Number(m[4] || m[5] || 0), sec: (m[6] || '').toLowerCase(), key: (m[7] || '').toLowerCase(), minus: [], plus: [], at: n };
      edits.push(cur);
    } else if (cur && line.startsWith('-')) cur.minus.push(line.slice(line[1] === ' ' ? 2 : 1));
    else if (cur && line.startsWith('+')) cur.plus.push(line.slice(line[1] === ' ' ? 2 : 1));
    else if (line.trim() && !line.startsWith('#')) problems.push(`Line ${n}: expected @@, - or +`);
  });
  return { edits, problems };
}

function setIni(text, sec, key, value) {
  const data = parseIni(text);
  data[sec] = data[sec] || {};
  data[sec][key] = value;
  return stringifyIni(data);
}

/** The song's files with the edits of the chosen rows (line numbers are the song's as it was sent) */
function applyEdits(current, edits, rows) {
  const want = new Set(rows || []);
  const files = { chart: clean(current.chart), notes: clean(current.notes), ini: clean(current.ini), plan: clean(current.plan) };
  const problems = [];
  const chosen = edits.filter((e) => want.has(e.row));
  for (const e of chosen.filter((x) => x.kind === 'replace')) {
    const lines = files[e.file].split('\n');
    const at = lines[e.line - 1];
    if (at === undefined || e.minus.length !== 1 || e.plus.length !== 1) { problems.push(`Row ${e.row}: the edit at line ${e.line} isn't one I can make`); continue; }
    if (at.split(e.minus[0]).length !== 2) { problems.push(`Row ${e.row}: "${e.minus[0]}" isn't on line ${e.line} (once)`); continue; }
    lines[e.line - 1] = at.replace(e.minus[0], () => e.plus[0]);
    files[e.file] = lines.join('\n');
  }
  // inserts from the bottom up; several after one line keep the list's order
  const anchors = new Map();
  for (const e of chosen.filter((x) => x.kind === 'after')) {
    const k = `${e.file}:${e.line}`;
    if (!anchors.has(k)) anchors.set(k, { file: e.file, line: e.line, plus: [] });
    anchors.get(k).plus.push(...e.plus);
  }
  for (const a of [...anchors.values()].sort((x, y) => y.line - x.line)) {
    const lines = files[a.file].split('\n');
    if (a.line > lines.length) { problems.push(`There is no line ${a.line} to add after`); continue; }
    lines.splice(a.line, 0, ...a.plus);
    files[a.file] = lines.join('\n');
  }
  for (const e of chosen) {
    if (e.kind === 'append') files[e.file] = `${files[e.file].replace(/\n+$/, '')}${files[e.file].trim() ? '\n' : ''}${e.plus.join('\n')}\n`;
    else if (e.kind === 'set') {
      if (e.file !== 'ini' || e.plus.length !== 1) problems.push(`Row ${e.row}: "set" is for one song.ini value`);
      else files.ini = setIni(files.ini, e.sec, e.key, e.plus[0].trim());
    }
  }
  return { files, problems };
}

// ── comparing ──
/** Changed lines, by a longest-common-subsequence match: [{ before: [n, text] | null, after: [n, text] | null }] */
function lineDiff(a, b) {
  const n = a.length;
  const m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) for (let j = m - 1; j >= 0; j -= 1) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0;
  let j = 0;
  const gone = [];
  const come = [];
  const flush = () => {
    const k = Math.max(gone.length, come.length);
    for (let x = 0; x < k; x += 1) out.push({ before: gone[x] || null, after: come[x] || null });
    gone.length = 0;
    come.length = 0;
  };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { flush(); i += 1; j += 1; } else if (j < m && (i >= n || L[i][j + 1] >= L[i + 1][j])) { come.push([j + 1, b[j]]); j += 1; } else { gone.push([i + 1, a[i]]); i += 1; }
  }
  flush();
  return out;
}

const CHORD = /\[([^\[\]\n]*)\]/g;
function words(text) {
  const lines = clean(text).split('\n');
  const a = lines.indexOf('--START MUSIC--');
  const b = lines.indexOf('--END MUSIC--');
  const music = a >= 0 && b > a ? lines.slice(a + 1, b) : lines;
  return music
    .map((l) => l.replace(/^\s*\[\[[^\]]*\]\]\s*/, ''))
    .filter((l) => !/^\s*\{[^{}]*\}\s*$/.test(l) && !/^\s*\|/.test(l))
    .map((l) => l.replace(CHORD, '').replace(/\s+/g, ' ').trim())
    .filter((l) => l && !/^[|%\s()x0-9]*$/.test(l));
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const rootOf = (c) => { const m = String(c).match(/^([A-G][#b]?)/); return m ? NOTES.indexOf(FLATS[m[1]] || m[1]) : -1; };

/** What the song plays: bars in all and by part, its chords in order, its key changes */
function playing(text, beatsPerBar) {
  const ir = parse(clean(text));
  const { slots } = songSlots(ir, { beatsPerBar });
  const heads = ir.filter((x) => x.type === 'structure').map((x) => ({ name: String(x.content).replace(/[:：]\s*$/, '').trim(), line: x.line }));
  const partAt = (line) => { let at = null; for (const h of heads) if (h.line <= line) at = h; return at; };
  const parts = heads.map((h) => ({ ...h, bars: 0 }));
  let bars = 0;
  for (const s of slots) {
    const b = (s.len || 0) / (s.beats || beatsPerBar);
    bars += b;
    const h = partAt(s.line);
    if (h) parts.find((p) => p.line === h.line).bars += b;
  }
  const round = (x) => Math.round(x * 100) / 100;
  return {
    bars: round(bars),
    parts: parts.map((p) => ({ ...p, bars: round(p.bars) })),
    chords: ir.filter((x) => x.type === 'chord' && !x.noChord && x.content).map((x) => x.content),
    keys: ir.filter((x) => x.type === 'keychange').map((x) => x.content).join(' ')
  };
}

function flatIni(text) {
  const out = {};
  for (const [sec, v] of Object.entries(parseIni(text))) {
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) out[`${sec}.${k}`] = String(x);
    else out[sec] = String(v);
  }
  return out;
}

/**
 * What would change, file by file, and what to look at.
 *   options: { beatsPerBar } (the song's time; checkPlan(planText, chartText) to check a plan another way)
 *   -> { files: [{ id, name, changed, ok, checks: [{ level: 'ok' | 'note' | 'look', text }], lines }], bars: { before, after } | null }
 */
function compare(current, back, { beatsPerBar = 4, checkPlan = (plan, chart) => SP.checkPlan(plan, { ir: parse(chart), text: chart }) } = {}) {
  const files = [];
  let bars = null;
  for (const f of FILES) {
    if (back[f.id] === undefined) continue;
    const before = clean(current[f.id]);
    const after = clean(back[f.id]);
    const entry = { id: f.id, name: f.name, changed: before.replace(/\n+$/, '') !== after.replace(/\n+$/, ''), checks: [], lines: [] };
    const look = (text) => entry.checks.push({ level: 'look', text });
    const ok = (text) => entry.checks.push({ level: 'ok', text });
    const note = (text) => entry.checks.push({ level: 'note', text });   // worth knowing; doesn't untick the file
    if (f.id === 'chart' && entry.changed) {
      entry.lines = lineDiff(before.split('\n'), after.split('\n'));
      const wd = lineDiff(words(before), words(after));
      if (wd.length) look(`The words change in ${wd.length} place${wd.length === 1 ? '' : 's'}: check each one is a correction you asked for.`);
      else ok('The words are the same (chords and directions aside).');
      const pb = playing(before, beatsPerBar);
      const pa = playing(after, beatsPerBar);
      bars = { before: pb.bars, after: pa.bars, parts: pa.parts.map((p, i) => ({ name: p.name, after: p.bars, before: pb.parts[i] && pb.parts[i].name === p.name ? pb.parts[i].bars : null })) };
      const marks = (t) => (clean(t).match(/(?<!\[)\[[^\[\]\n]*\](?!\])/g) || []);
      const mb = marks(before);
      const ma = marks(after);
      const norm = (m) => m.replace(/\s+/g, '');
      const rewritten = mb.length === ma.length ? mb.filter((m, i) => m !== ma[i] && norm(m) === norm(ma[i])).length : 0;
      if (rewritten) note(`${rewritten} chord marker${rewritten === 1 ? ' is' : 's are'} written another way that plays the same (such as [Cx3] → [C x3]): no need for that change.`);
      if (pb.chords.join(' ') === pa.chords.join(' ')) ok(`The chords are the same, in the same order (${pa.chords.length}).`);
      else {
        const moved = pb.chords.length === pa.chords.length ? pb.chords.map((c, i) => [c, pa.chords[i]]).filter(([x, y]) => x !== y) : [];
        const shifts = new Set(moved.map(([x, y]) => (rootOf(y) - rootOf(x) + 12) % 12));
        const same = moved.every(([x, y]) => x.replace(/^[A-G][#b]?/, '') === y.replace(/^[A-G][#b]?/, '') && rootOf(x) >= 0 && rootOf(y) >= 0);
        if (moved.length >= 4 && same && shifts.size === 1) look(`${moved.length} chords move up ${[...shifts][0]} semitones: that's a change of key. Only use it if you asked for one.`);
        else note(`The chords change (${pb.chords.length} before, ${pa.chords.length} after): check each change is one you agreed.`);
      }
      if (pb.keys !== pa.keys) look(`The key changes written in the song change ({key: …}): ${pb.keys || 'none'} → ${pa.keys || 'none'}.`);
      if (pb.bars === pa.bars) ok(`It plays the same number of bars (${pa.bars}).`);
      else note(`It plays ${pa.bars} bars instead of ${pb.bars}: see the parts below.`);
    } else if (f.id === 'ini' && entry.changed) {
      const a = flatIni(before);
      const b = flatIni(after);
      const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
      for (const k of keys) {
        if (a[k] === b[k]) continue;
        if (b[k] === undefined) ok(`${k} stays ${a[k]} (the returned file leaves it out; it's kept)`);
        else entry.lines.push({ before: a[k] === undefined ? null : [k, a[k]], after: [k, b[k]] });
      }
      if (['song.key', 'song.transpose'].some((k) => b[k] !== undefined && a[k] !== b[k])) look('The key or transpose setting changes: only use it if you asked for a change of key.');
      if (b['song.tempo'] !== undefined && a['song.tempo'] !== b['song.tempo']) note(`The playback tempo changes: ${a['song.tempo'] || 'not set'} → ${b['song.tempo']}.`);
      if (!entry.lines.length) { entry.changed = false; ok('Nothing changes.'); }
    } else if (f.id === 'notes' && entry.changed) {
      entry.lines = lineDiff(before.split('\n'), after.split('\n'));
      const kept = new Set(after.split('\n').map((l) => l.trim()));
      const lost = before.split('\n').filter((l) => l.trim() && !kept.has(l.trim()));
      if (lost.length) note(`${lost.length} line${lost.length === 1 ? '' : 's'} of your notes would go: they're kept, added back at the end.`);
      else ok('Every line of your notes is kept.');
      entry.lost = lost;
    } else if (f.id === 'plan' && entry.changed) {
      entry.lines = lineDiff(before.split('\n'), after.split('\n'));
      const problems = checkPlan ? checkPlan(after, clean(back.chart ?? current.chart)) : [];
      if (problems.length) for (const p of problems) look(`Plan line ${p.line}: ${p.message}`);
      else ok('ukemusic can run every step of the plan.');
    }
    if (!entry.changed && !entry.checks.length) ok('Nothing changes.');
    entry.ok = !entry.checks.some((c) => c.level === 'look');
    files.push(entry);
  }
  return { files, bars };
}

/** The files to use: the returned file, but notes keep any lines the AI left out (added back at the end) */
function result(current, back, compared, use) {
  const out = {};
  for (const f of compared.files) {
    if (!f.changed || !use.includes(f.id)) continue;
    if (f.id === 'ini') {
      const merged = parseIni(current.ini);
      for (const [sec, v] of Object.entries(parseIni(back.ini))) {
        if (v && typeof v === 'object') merged[sec] = { ...(merged[sec] || {}), ...v };
        else merged[sec] = v;
      }
      out.settings = merged;   // an object, as the apps keep it
    } else if (f.id === 'notes') {
      const lost = f.lost || [];
      out.notes = lost.length ? `${clean(back.notes).replace(/\n+$/, '')}\n${lost.join('\n')}\n` : clean(back.notes);
    } else out[f.id === 'chart' ? 'text' : 'plan'] = clean(back[f.id]);
  }
  return out;
}

function reportHtml(res) {
  const parts = [];
  for (const f of res.files) {
    parts.push(`<section class="air-file" data-file="${f.id}"><h3><label><input type="checkbox" class="air-use" value="${f.id}"${f.changed ? '' : ' disabled'}${f.changed && f.ok ? ' checked' : ''}> ${esc(f.name)}</label>${f.changed ? '' : ' <span class="air-same">no change</span>'}</h3><ul>`);
    for (const c of f.checks) parts.push(`<li class="air-${c.level}">${{ ok: '✓', note: 'ℹ', look: '⚠' }[c.level]} ${esc(c.text)}</li>`);
    parts.push('</ul>');
    if (f.id === 'chart' && res.bars && res.bars.before !== res.bars.after) {
      parts.push('<table class="air-bars"><tr><th>Part</th><th>Bars before</th><th>after</th></tr>');
      for (const p of res.bars.parts) parts.push(`<tr${p.before !== p.after ? ' class="air-diff"' : ''}><td>${esc(p.name)}</td><td>${p.before ?? '–'}</td><td>${p.after}</td></tr>`);
      parts.push('</table>');
    }
    if (f.lines.length) {
      parts.push(`<details${f.id === 'chart' ? ' open' : ''}><summary>What changes (${f.lines.length})</summary><table class="air-lines">`);
      for (const l of f.lines.slice(0, 80)) {
        const cell = (x, cls) => (x ? `<td class="${cls}"><span class="air-n">${esc(x[0])}</span> <code>${esc(x[1])}</code></td>` : `<td class="${cls} air-none">–</td>`);
        parts.push(`<tr>${cell(l.before, 'air-before')}${cell(l.after, 'air-after')}</tr>`);
      }
      if (f.lines.length > 80) parts.push(`<tr><td colspan="2">… and ${f.lines.length - 80} more</td></tr>`);
      parts.push('</table></details>');
    }
    parts.push('</section>');
  }
  return parts.join('');
}

/**
 * Text pasted from the chat: the song (the code block with --START MUSIC--), an edit list (@@ lines)
 * or song.ini ([song]) -> files, as gather() takes them
 */
function fromPaste(text) {
  const t = clean(text);
  if (/^\s*@@\s+[A-Z]\s/m.test(t)) {
    const fenced = [...t.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]).find((b) => /^@@/m.test(b));
    return [{ name: 'EDITS.txt', text: fenced || t }];
  }
  const blocks = [...t.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1]);
  const song = blocks.find((b) => /--START MUSIC--/.test(b)) || (/--START MUSIC--/.test(t) ? t.slice(t.indexOf('--START MUSIC--'), t.includes('--END MUSIC--') ? t.indexOf('--END MUSIC--') + 13 : undefined) : null);
  const out = [];
  if (song) out.push({ name: 'pasted-song.txt', text: `${song.replace(/^\s*\n/, '').replace(/\n+$/, '')}\n` });
  const ini = blocks.find((b) => /^\s*\[song\]/m.test(b) && !/--START MUSIC--/.test(b));
  if (ini) out.push({ name: 'song.ini', text: ini });
  return out;
}

/** Files picked, or a zip's files, as text: [{ name, text }] (readZip: song-files' zip reader) */
async function readPicked(picked, readZip) {
  const out = [];
  for (const f of picked) {
    if (/\.zip$/i.test(f.name)) {
      for (const e of await readZip(new Uint8Array(await f.arrayBuffer()))) out.push({ name: e.name, text: new TextDecoder('utf-8').decode(e.data) });
    } else out.push({ name: f.name, text: await f.text() });
  }
  return out;
}

/**
 * The dialog's contents (desktop and web): the edit list's rows to tick, if there is one, then each
 * file with its checks and what changes. holder: an element; returns { chosen() -> what to use }.
 *   got: gather()'s result; current: { chart, notes, ini, plan }; beatsPerBar: the song's time
 */
const CSS = `
.air-file { border-top: 1px solid var(--border, #d0d7de); padding: 8px 0; }
.air-file h3 { font-size: 16px; margin: 4px 0; }
.air-file ul, .air-problems { list-style: none; margin: 4px 0; padding: 0; font-size: 14px; }
.air-ok { color: #1d653f; } .air-note { color: inherit; } .air-look { color: #8c2929; font-weight: 600; }
.air-same { color: var(--muted, #667); font-size: 13px; font-weight: 400; }
.air-bars, .air-lines { border-collapse: collapse; font-size: 13px; margin: 6px 0; width: 100%; }
.air-bars td, .air-bars th { padding: 2px 8px; text-align: left; border-bottom: 1px solid var(--border, #d0d7de); }
.air-bars .air-diff td { font-weight: 700; }
.air-lines td { width: 50%; vertical-align: top; padding: 2px 6px; }
.air-lines code { white-space: pre-wrap; word-break: break-word; font-size: 13px; }
.air-before { background: #fbeded; } .air-after { background: #e8f4ed; } .air-none { color: var(--muted, #667); }
.air-n { color: var(--muted, #667); font-size: 11px; }
.air-rows { border: 1px solid var(--border, #d0d7de); border-radius: 6px; margin: 6px 0; }
.air-rows label { margin-right: 10px; white-space: nowrap; }
.air-review pre { white-space: pre-wrap; max-height: 30vh; overflow: auto; font-size: 13px; }
@media (prefers-color-scheme: dark) { .air-before { background: #3a2222; } .air-after { background: #1f3527; } .air-ok { color: #7fd1a0; } .air-look { color: #ff9a9a; } }
`;

/**
 * A returned song that is only the music (as a chat gives it, in a code block) keeps the lines the song
 * has above --START MUSIC-- and below --END MUSIC-- (its title, a practice tempo…)
 */
function keepOutside(currentChart, backChart) {
  const cur = clean(currentChart);
  const back = clean(backChart);
  const a = cur.indexOf('--START MUSIC--');
  const b = cur.indexOf('--END MUSIC--');
  if (a < 0 || b < a || !/^\s*--START MUSIC--/.test(back) || !/--END MUSIC--\s*$/.test(back)) return back;
  const before = cur.slice(0, a);
  const after = cur.slice(b + '--END MUSIC--'.length);
  if (!before.trim() && !after.trim()) return back;
  return `${before}${back.trim()}${after || '\n'}`;
}

function show(holder, { got, current, beatsPerBar = 4 }) {
  const doc = holder.ownerDocument;
  if (!doc.getElementById('airCss')) doc.head.appendChild(Object.assign(doc.createElement('style'), { id: 'airCss', textContent: CSS }));
  let back = { chart: got.chart === undefined ? undefined : keepOutside(current.chart, got.chart), notes: got.notes, ini: got.ini, plan: got.plan };
  const list = got.edits !== undefined ? parseEdits(got.edits) : null;
  let rows = list ? [...new Set(list.edits.map((e) => e.row))] : [];
  let compared = null;
  let problems = list ? [...list.problems] : [];
  const report = doc.createElement('div');
  const draw = () => {
    if (list) {
      const made = applyEdits(current, list.edits, rows);
      problems = [...list.problems, ...made.problems];
      back = { ...back };
      for (const id of ['chart', 'notes', 'ini', 'plan']) if (got[id] === undefined && list.edits.some((e) => e.file === id)) back[id] = made.files[id];
    }
    compared = compare(current, back, { beatsPerBar });
    const none = !compared.files.some((f) => f.changed);
    report.innerHTML = (problems.length ? `<ul class="air-problems">${problems.map((x) => `<li class="air-look">⚠ ${esc(x)}</li>`).join('')}</ul>` : '')
      + (none ? '<p class="air-none-changed">Nothing in these files changes the song.</p>' : '') + reportHtml(compared);
  };
  const parts = [];
  if (got.review) {
    const d = doc.createElement('details');
    d.className = 'air-review';
    d.innerHTML = '<summary>The AI\'s review (REVIEW.md)</summary>';
    d.appendChild(Object.assign(doc.createElement('pre'), { textContent: got.review }));
    parts.push(d);
  }
  if (list && rows.length) {
    const box = doc.createElement('fieldset');
    box.className = 'air-rows';
    box.innerHTML = '<legend>Rows of the edit list to use (the ones you agreed)</legend>';
    for (const r of rows.slice()) {
      const label = doc.createElement('label');
      const input = Object.assign(doc.createElement('input'), { type: 'checkbox', checked: true, value: r });
      input.addEventListener('change', () => { rows = [...box.querySelectorAll('input:checked')].map((x) => x.value); draw(); });
      label.append(input, ` ${r} `);
      box.appendChild(label);
    }
    parts.push(box);
  }
  parts.push(report);
  holder.replaceChildren(...parts);
  draw();
  return {
    chosen() {
      const use = [...report.querySelectorAll('input.air-use:checked')].map((x) => x.value);
      return { use, changes: result(current, back, compared, use) };
    },
    ignored: got.ignored || []
  };
}

/** Settings (an object, as the apps keep them) as song.ini text, to compare */
const iniText = (settings) => (settings && Object.keys(settings).length ? stringifyIni(settings) : '');

module.exports = { fromPaste, keepOutside, gather, parseEdits, applyEdits, compare, result, reportHtml, readPicked, show, iniText, lineDiff, words, FILES };
