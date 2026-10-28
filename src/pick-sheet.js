// The pick sheet (4.44): a song set out for fingerpicking, laid out as fingerstyle songbooks do.
//   1. The pattern: its name and strings, what each finger does, and one bar counted out
//   2. The chord shapes (ordinary chord boxes: hold the shape, pick from it)
//   3. The song as tab: each line's bars with the chord over the bar where it starts and the
//      words under it, so the three line up. The song's own ```tab blocks are shown as written.
// One self-contained web page (the app also makes a PDF of it, beside the learn sheet).

const picking = require('./picking');
const { instrument: profile } = require('./instruments');
const renderDiagramSvg = require('./diagram-svg');

const MAX_ACROSS = 96;   // characters of tab across the page, before a line of bars starts a new row
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
*{box-sizing:border-box}
body{font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d2321;margin:0 auto;max-width:900px;padding:28px 32px}
h1{font-size:28px;margin:0}
.sub{color:#5b6662;margin:2px 0 10px}
.facts{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:13.5px;color:#3c4643;margin:6px 0 16px}
h2{font-size:17px;margin:22px 0 8px;padding-bottom:3px;border-bottom:2px solid #0f766e;color:#0f4f4a}
.pattern{border:1.5px solid #0f766e;border-radius:10px;padding:12px 14px;background:#f2faf8;break-inside:avoid}
.pattern .name{font-weight:700;font-size:16px}
.pattern .strings{font:600 15px Consolas,"Courier New",monospace;color:#0f766e;margin-left:8px}
.pattern p{margin:4px 0 8px}
.count{border-collapse:collapse;font:600 14px/1.2 Consolas,"Courier New",monospace}
.count th{font-weight:600;color:#6b7672;padding:2px 7px;text-align:center}
.count td{padding:3px 7px;text-align:center;border-top:1px solid #cfe3de}
.count td.rest{color:#b8c4c0}
.count .lab{text-align:right;font:600 12px system-ui,sans-serif;color:#5b6662;padding-right:10px}
.key{font-size:12.5px;color:#5b6662;margin-top:6px}
.shapes{display:flex;flex-wrap:wrap;gap:10px 16px}
.shape{text-align:center;break-inside:avoid}
.shapes{--diagram-size:78px;--rhythm-color:#333;--chord-color:#b42318;--text-color:#1d2321;--bg-color:#fff}
.shape svg{display:block}
.pchange{font:600 12.5px system-ui,sans-serif;color:#0f766e;margin:10px 0 4px;padding:2px 8px;border-left:3px solid #0f766e;background:#f2faf8;display:inline-block}
.head{font-weight:700;color:#0f4f4a;margin:16px 0 4px;text-transform:uppercase;font-size:13px;letter-spacing:.04em}
.sys{display:flex;flex-wrap:wrap;align-items:flex-start;margin:0 0 12px;break-inside:avoid}
.bar{display:flex;flex-direction:column}
.bar .ch{font:700 13px/16px system-ui,sans-serif;color:#b42318;height:16px;white-space:nowrap}
.bar pre,.bar .w{font:13px/1.25 Consolas,"Courier New",monospace;margin:0;white-space:pre}
.bar pre{color:#2b3532}
.bar .w{color:#1d2321;font-size:13px;line-height:18px;height:18px}
.plain{margin:0 0 8px}
.pc{display:inline-flex;flex-direction:column;vertical-align:bottom}
.pc b{color:#b42318;font-size:13.5px;line-height:1.1;min-height:1.1em;padding-right:6px}
.pc span{white-space:pre-wrap}
pre.own{font:13px/1.25 Consolas,"Courier New",monospace;margin:2px 0 10px;color:#2b3532}
.own-note{font-size:12.5px;color:#5b6662;margin:0}
.how{font-size:13.5px;color:#3c4643}
.made{margin-top:24px;font-size:12px;color:#8a9490}
@media print{body{padding:0;max-width:none}h2{break-after:avoid}}
`;

/** The song's lines: { kind: 'head', text } | { kind: 'line', nodes: Set, pieces: [{ chord, text, node }] } | { kind: 'tab', text } */
function songLines(ir) {
  const out = [];
  let cur = null;
  const flush = () => { if (cur && cur.pieces.some((p) => p.chord || p.text.trim())) out.push(cur); cur = null; };
  for (const node of ir || []) {
    if (node.type === 'linebreak') { flush(); continue; }
    if (node.type === 'structure') { flush(); out.push({ kind: 'head', text: node.content }); continue; }
    if (node.type === 'tab') { flush(); out.push({ kind: 'tab', text: node.content }); continue; }
    if (node.type === 'pick') { flush(); out.push({ kind: 'pick', text: node.content, name: node.pickName || '' }); continue; }
    if (!['chord', 'lyric', 'bar'].includes(node.type)) continue;
    if (!cur) cur = { kind: 'line', nodes: new Set(), pieces: [] };
    cur.nodes.add(node);
    if (node.type === 'bar') continue;
    if (node.type === 'chord') {
      cur.pieces.push({ chord: node.hidden ? '' : (node.noChord ? 'N.C.' : node.content), text: '', node });
    } else if (cur.pieces.length) cur.pieces[cur.pieces.length - 1].text += node.content;
    else cur.pieces.push({ chord: '', text: node.content, node: null });
  }
  flush();
  return out;
}

/**
 * One line of the song as tab, bar by bar: [{ chord, words, rows: [text per string, top first], end }]
 *   bars: the schedule's bars for the line (the first time it's played), in order; bar.src is
 *   the index of its node in `ir`
 */
function lineBars(line, bars, ir, instrument) {
  const n = profile(instrument).strings.length;
  const pieceOf = new Map(line.pieces.filter((p) => p.node).map((p) => [p.node, p]));
  const lead = line.pieces.find((p) => !p.node);
  // a chord held for several bars ([C x3]): its words shared out over its bars, a word at a time
  const barsOf = new Map();
  bars.forEach((bar) => { const node = ir[bar.src]; barsOf.set(node, (barsOf.get(node) || 0) + 1); });
  const share = (text, count) => {
    const words = String(text).split(/(?<=\s)/);
    if (count <= 1 || words.length <= 1) return [text, ...Array(Math.max(0, count - 1)).fill('')];
    const target = text.length / count;
    const out = Array(count).fill('');
    let k = 0;
    for (const w of words) {
      if (k < count - 1 && out[k].length && out[k].length + w.length / 2 > target * 1.05) k += 1;
      out[k] += w;
    }
    return out;
  };
  const chunks = new Map();
  const seen = new Map();
  let filled = 0;   // how much of the bar the boxes so far fill (a chord can take half a bar)
  const grid = (steps, words) => {
    const maxFret = Math.max(1, ...steps.flat().map((nt) => String(nt.fret).length));
    const width = Math.max(maxFret + 1, 2, Math.ceil((words.length + 1) / Math.max(1, steps.length)));
    return Array.from({ length: n }, (_, r) => {
      const string = n - 1 - r;
      return steps.map((step) => {
        const note = step.find((nt) => nt.string === string);
        return note ? String(note.fret).padEnd(width, '-') : '-'.repeat(width);
      }).join('');
    });
  };
  // a pickup (chord melody): the notes before the line's first chord, with the words sung on them
  const pickup = bars[0] && bars[0].pickupNotes && bars[0].pickupNotes.length ? bars[0].pickupNotes : null;
  const out = [];
  if (pickup) {
    const words = (lead ? lead.text : '').replace(/\s+$/, '');
    out.push({ chord: '', words, rows: grid(pickup, words).map((r) => `${r}|`), end: true, pickup: true });
  }
  return out.concat(bars.map((bar, k) => {
    const node = ir[bar.src];
    const piece = pieceOf.get(node);
    const nth = seen.get(node) || 0;
    seen.set(node, nth + 1);
    if (piece && !chunks.has(node)) chunks.set(node, share(piece.text, barsOf.get(node) || 1));
    const chord = piece && nth === 0 ? piece.chord : '';
    const words = `${k === 0 && lead && !pickup ? lead.text : ''}${piece ? chunks.get(node)[nth] || '' : ''}`.replace(/\s+$/, '');
    const rows = grid(bar.pickNotes || [], words);
    filled += bar.share || 1;
    const end = filled > 1 - 1e-6;
    if (end) filled = 0;
    return { chord, words, rows: rows.map((r) => (end ? `${r}|` : r)), end };
  }));
}

/** The whole line as plain tab text (the rows of every bar side by side) */
function lineTab(bars, instrument) {
  const labels = profile(instrument).tabNames;
  if (!bars.length) return '';
  return labels.map((l, r) => `${l}|${bars.map((b) => b.rows[r]).join('')}`).join('\n');
}

/**
 * info: { title, sub, facts: [[label, value]], patternId, instrument, beats, ir, schedule (built
 *   with options.pick), chordDef(name) -> chord definition | null, made }
 */
function pickSheetHtml(info) {
  const { title = 'Song', sub = '', facts = [], patternId = 'up', instrument = 'soprano', beats = 4, ir = [], schedule = { bars: [] }, made = '', chordDef = () => null, diagramOptions = {} } = info || {};
  const pat = picking.pattern(patternId) || picking.PATTERNS[0];
  const compound = beats === 6;
  const names = picking.stringNames(instrument);
  const labels = profile(instrument).tabNames;
  const allBars = schedule.bars || [];
  // the pattern counted out, on the song's first picked chord
  const tokens = picking.patternFor(pat.id, beats, compound);
  const per = compound ? 1 : 2;
  const counts = tokens.map((_, k) => (compound ? String(k + 1) : (k % per === 0 ? String(k / per + 1) : '&')));
  const firstBar = allBars.find((b) => b.pickNotes && b.pickNotes.length);
  const chordName = firstBar ? firstBar.chord : '';
  const def = chordName ? chordDef(chordName) : null;
  const roles = def ? picking.roleStrings(def.frets, chordName, instrument) : null;
  const fingerOf = (t) => (t === '-' ? '·' : t.replace(/P/g, 'p'));
  const stringOf = (t) => (t === '-' || !roles ? '·' : picking.tokenStrings(t, roles).map((s) => names[s]).join('+'));
  const countTable = `<table class="count"><tr><td class="lab">Count</td>${counts.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>`
    + `<tr><td class="lab">Finger</td>${tokens.map((t) => `<td class="${t === '-' ? 'rest' : ''}">${esc(fingerOf(t))}</td>`).join('')}</tr>`
    + (roles ? `<tr><td class="lab">String</td>${tokens.map((t) => `<td class="${t === '-' ? 'rest' : ''}">${esc(stringOf(t))}</td>`).join('')}</tr>` : '')
    + '</table>';
  const shown = def ? picking.pickText(pat.id, { frets: def.frets, chord: chordName, instrument, beats, compound }).split(' ') : [];
  const half = shown.length % 2 === 0 && shown.slice(0, shown.length / 2).join(' ') === shown.slice(shown.length / 2).join(' ') ? shown.slice(0, shown.length / 2) : shown;
  const patternHtml = pat.id === 'melody'
    ? `<div class="pattern"><span class="name">${esc(pat.name)}</span><p>The tune is on the top strings, picked from the chord shape you're holding, with a chord note under it on beat 1 (thumb). Play the tune with your index and middle fingers (or whichever finger is nearest the string), and the low note with your thumb.</p>`
      + '<p class="key">Hold the whole chord shape and reach for any tune note outside it, then come back to the shape. A line without a tune of its own is sung to the tune of an earlier line with the same chords; a line with no tune at all is picked One string a beat.</p></div>'
    : `<div class="pattern"><span class="name">${esc(pat.name)}</span><span class="strings">${esc(half.join(' ') || pat.strings)}</span><p>${esc(pat.tip)}</p>${countTable}`
    + '<p class="key">Fingers: p thumb · i index · m middle · a ring. + means picked together; · is a rest. Hold the whole chord shape and pick from it: every fret number in the tab is already under a finger.</p></div>';
  // the chord shapes, in the order the song plays them
  const seen = [];
  for (const b of allBars) if (b.pickNotes && b.chord && !seen.includes(b.chord)) seen.push(b.chord);
  const shapesHtml = seen.map((name) => {
    const d = chordDef(name);
    return d ? `<div class="shape">${renderDiagramSvg({ ...d, name }, { show_fingers: true, ...diagramOptions })}</div>` : '';
  }).join('');
  // the song: each line's bars, the first time the line is played
  const lines = songLines(ir);
  const named = new Map();
  const songHtml = lines.map((l) => {
    if (l.kind === 'head') return `<div class="head">${esc(l.text)}</div>`;
    if (l.kind === 'pick') {
      // 4.44: the pattern changes here ({pick} line)
      let r = l.text ? picking.resolvePick(l.text, instrument) : named.get(l.name.toLowerCase());
      if (l.name && l.text && r && !r.error) named.set(l.name.toLowerCase(), r);
      if (!r || r.error) return '';
      return `<div class="pchange">${r.off ? 'Strummed from here' : `Picked from here: <b>${esc(r.label)}</b>`}</div>`;
    }
    if (l.kind === 'tab') return `<p class="own-note">The song's own tab, as written:</p><pre class="own">${esc(l.text)}</pre>`;
    const bars = [];
    const done = new Set();
    for (const b of allBars) {
      const node = b.src === undefined ? null : ir[b.src];
      if (!l.nodes.has(node)) { if (bars.length) done.add('x'); continue; }
      if (done.size) break;   // the line again later (a repeat): the first time is enough
      bars.push(b);
    }
    const picked = bars.filter((b) => b.pickNotes);
    if (!picked.length || picked.length !== bars.length) {
      // nothing picked here (a stop, N.C., strummed on purpose): chords over the words
      return `<div class="plain">${l.pieces.map((p) => `<span class="pc"><b>${esc(p.chord)}</b><span>${esc(p.text) || '&nbsp;'}</span></span>`).join('')}</div>`;
    }
    const boxes = lineBars(l, bars, ir, instrument);
    const labelBox = `<div class="bar"><div class="ch"></div><pre>${labels.map((x) => `${esc(x)}|`).join('\n')}</pre><div class="w"></div></div>`;
    // rows of bars that fit across the page, each starting with the string names
    const rowsOf = [[]];
    let across = 0;
    for (const b of boxes) {
      const w = Math.max(b.rows[0].length, b.words.length + 1);
      if (across && across + w > MAX_ACROSS) { rowsOf.push([]); across = 0; }
      rowsOf[rowsOf.length - 1].push(b);
      across += w;
    }
    return rowsOf.map((row) => `<div class="sys">${labelBox}${row.map((b) => `<div class="bar"><div class="ch">${esc(b.chord)}</div><pre>${esc(b.rows.join('\n'))}</pre><div class="w">${esc(b.words)}</div></div>`).join('')}</div>`).join('');
  }).join('');
  const ownTab = lines.some((l) => l.kind === 'tab');
  const firstNote = (facts.find(([k]) => k === 'First note') || [])[1] || '';
  // more than one pattern in the song ({pick} lines): which, and where
  const used = [];
  for (const b of allBars) if (b.pickLabel && !used.includes(b.pickLabel)) used.push(b.pickLabel);
  const usedHtml = used.length > 1 ? `<p class="key">This song changes pattern as it goes (marked in the song below): ${used.map((u) => `<b>${esc(u)}</b>`).join(', ')}.</p>` : '';
  const factsHtml = facts.filter(([, v]) => v).map(([k, v]) => `<span>${esc(k)}: <b>${esc(v)}</b></span>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}: pick sheet</title><style>${CSS}</style></head><body>
<h1>${esc(title)}</h1>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
<div class="facts">${factsHtml}<span>Picked: <b>${esc(pat.name)}</b></span></div>
${pat.id === 'melody'
    ? `<p class="key">A picked solo: the tune is in the picking. Sing along with it if you like${firstNote ? ` (your first note is <b>${esc(firstNote)}</b>)` : ''}.</p>`
    : `<p class="key">Picking to sing along to: the pattern is the accompaniment, the tune is your voice's job${firstNote ? `. Your first note is <b>${esc(firstNote)}</b>: pick or hum it before you start` : ''}.</p>`}
<h2>The pattern</h2>${patternHtml}${usedHtml}
${shapesHtml ? `<h2>The chords</h2><div class="shapes">${shapesHtml}</div>` : ''}
<h2>The song</h2>${ownTab ? '<p class="key">Where the song has its own tab (an intro or a riff), it\'s played as written; the pattern is for the chords.</p>' : ''}<div class="song">${songHtml}</div>
<h2>How to learn it</h2><ol class="how"><li>Hold one chord and play the pattern over and over, slowly, until your picking hand does it on its own.</li><li>Change chords on beat 1: the new shape has to be down by the time your thumb picks.</li><li>Then the song, slowly (Pick → Play, with the practice speed turned down), up to speed over a few days.</li><li>Then sing over it. If the words throw your fingers, go back to an easier pattern for a while.</li></ol>
<p class="made">Made with ukemusic${made ? ` · ${esc(made)}` : ''}</p>
</body></html>`;
}

module.exports = { pickSheetHtml, songLines, lineBars, lineTab };
