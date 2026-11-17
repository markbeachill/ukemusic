// Small drawings for Free Practice (4.87): one for each exercise card, one for each category and
// one for each slide of the instructions. Plain SVG text, drawn in the colour of the text around
// them (currentColor), so the same picture works on a card, in a slide, in the dark and in print.
// Nothing here is a photograph of a hand: they're diagrams of what the screen will show.
const W = 160;
const H = 100;
const svg = (body, label) => `<svg class="pr-pic" viewBox="0 0 ${W} ${H}" role="img" aria-label="${String(label).replace(/"/g, '&quot;')}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const text = (x, y, s, { size = 13, weight = 700, anchor = 'middle', fill = 'currentColor', opacity = 1 } = {}) => `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}" stroke="none" opacity="${opacity}">${s}</text>`;
const soft = 'fill="currentColor" fill-opacity="0.12"';
const solid = 'fill="currentColor" stroke="none"';

/** A piece of fretboard: four strings across, `frets` frets; dots: [{ string 0-3 from the top, fret 1.., label, kind }] */
function board(dots = [], { frets = 5, x = 14, y = 22, w = 132, h = 56, open = [] } = {}) {
  const fw = w / frets;
  const sh = h / 3;
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" ${soft} stroke="none"/>`;
  out += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + h}" stroke-width="5"/>`;
  for (let f = 1; f <= frets; f += 1) out += `<line x1="${x + f * fw}" y1="${y}" x2="${x + f * fw}" y2="${y + h}" stroke-width="1.2" opacity="0.5"/>`;
  for (let s = 0; s < 4; s += 1) out += `<line x1="${x}" y1="${y + s * sh}" x2="${x + w}" y2="${y + s * sh}" stroke-width="1.4" opacity="0.75"/>`;
  for (const s of open) out += `<circle cx="${x - 8}" cy="${y + s * sh}" r="4.5" stroke-width="1.8"/>`;
  for (const d of dots) {
    const cx = x + (d.fret - 0.5) * fw;
    const cy = y + d.string * sh;
    if (d.kind === 'next') out += `<circle cx="${cx}" cy="${cy}" r="8" stroke-dasharray="3 2.5" fill="currentColor" fill-opacity="0.1"/>${d.label ? text(cx, cy + 4, d.label, { size: 10 }) : ''}`;
    else if (d.kind === 'faint') out += `<circle cx="${cx}" cy="${cy}" r="6" ${solid} opacity="0.35"/>`;
    else out += `<circle cx="${cx}" cy="${cy}" r="8" ${solid}/>${d.label ? text(cx, cy + 4, d.label, { size: 10, fill: '#fff' }) : ''}`;
  }
  return out;
}

/** Strum boxes for a pattern: D down, U up, - a miss, X a muted stroke, > the accent mark (skipped) */
function strumRow(pattern, { y = 30, height = 44 } = {}) {
  const steps = String(pattern).replace(/>/g, '').split('').slice(0, 8);
  const n = steps.length;
  const gap = 4;
  const bw = Math.min(26, (W - 16 - gap * (n - 1)) / n);
  const x0 = (W - (bw * n + gap * (n - 1))) / 2;
  return steps.map((s, i) => {
    const x = x0 + i * (bw + gap);
    const cx = x + bw / 2;
    const top = y + 9;
    const bottom = y + height - 9;
    let mark;
    if (s === 'D') mark = `<path d="M${cx} ${top}V${bottom}M${cx - 6} ${bottom - 7}L${cx} ${bottom}L${cx + 6} ${bottom - 7}" stroke-width="2.6"/>`;
    else if (s === 'U') mark = `<path d="M${cx} ${bottom}V${top}M${cx - 6} ${top + 7}L${cx} ${top}L${cx + 6} ${top + 7}" stroke-width="2.6"/>`;
    else if (s === 'X') mark = `<path d="M${cx - 6} ${y + height / 2 - 6}l12 12m0 -12l-12 12" stroke-width="2.6"/>`;
    else mark = `<circle cx="${cx}" cy="${y + height / 2}" r="2.2" ${solid} opacity="0.5"/>`;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${height}" rx="6" ${i === 0 ? soft : 'opacity="0.35"'} stroke-width="1.4"/>${mark}`;
  }).join('');
}

/** A chord box: frets[] for the four strings (0 open), drawn x..x+w */
function chordBox(name, frets, x, { w = 40, big = true } = {}) {
  const y = 34;
  const h = big ? 48 : 40;
  const sw = w / 3;
  const fh = h / 4;
  let out = text(x + w / 2, 20, name, { size: big ? 20 : 15, weight: 800, opacity: big ? 1 : 0.6 });
  out += `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke-width="4"/>`;
  for (let s = 0; s < 4; s += 1) out += `<line x1="${x + s * sw}" y1="${y}" x2="${x + s * sw}" y2="${y + h}" stroke-width="1.3" opacity="0.7"/>`;
  for (let f = 1; f <= 4; f += 1) out += `<line x1="${x}" y1="${y + f * fh}" x2="${x + w}" y2="${y + f * fh}" stroke-width="1.3" opacity="0.7"/>`;
  frets.forEach((f, s) => {
    if (f > 0) out += `<circle cx="${x + s * sw}" cy="${y + (f - 0.5) * fh}" r="${big ? 5 : 4}" ${solid}/>`;
    else out += `<circle cx="${x + s * sw}" cy="${y - 7}" r="3" stroke-width="1.5"/>`;
  });
  return out;
}
const SHAPES = { C: [0, 0, 0, 3], F: [2, 0, 1, 0], Am: [2, 0, 0, 0], G: [0, 2, 3, 2], Bb: [3, 2, 1, 1], G7: [0, 2, 1, 2], D: [2, 2, 2, 0], Em: [0, 4, 3, 2] };
const shapeOf = (name) => SHAPES[name] || SHAPES.C;

const arrow = (x1, x2, y) => `<path d="M${x1} ${y}H${x2}M${x2 - 7} ${y - 6}L${x2} ${y}L${x2 - 7} ${y + 6}" stroke-width="2.6"/>`;
const stopwatch = (cx, cy, r, label) => `<circle cx="${cx}" cy="${cy}" r="${r}" ${soft}/><path d="M${cx - 5} ${cy - r - 7}h10M${cx} ${cy - r - 7}v7M${cx + r * 0.75} ${cy - r * 0.75}l5 -5"/>${label ? text(cx, cy + 6, label, { size: r * 0.62, weight: 800 }) : `<path d="M${cx} ${cy}V${cy - r * 0.6}M${cx} ${cy}l${r * 0.4} ${r * 0.25}" stroke-width="2.6"/>`}`;
const pill = (x, y, w, label, { filled = false } = {}) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="13" ${filled ? solid : soft}/>${text(x + w / 2, y + 18, label, { size: 12, fill: filled ? '#fff' : 'currentColor' })}`;
const tick = (cx, cy, s = 1) => `<path d="M${cx - 9 * s} ${cy}l6 ${6 * s}l${12 * s} ${-13 * s}" stroke-width="${3.2 * s}"/>`;

/**
 * A hand, palm towards you, fingers up: four fingers and a thumb, each fingertip labelled.
 * labels: [thumb, index, middle, ring, little] ('' for none). mirror: the thumb on the other side.
 */
function hand(labels, { cx = 80, mirror = false, caption = '' } = {}) {
  const fingers = [[-27, 30, 15], [-9, 18, 16], [9, 22, 16], [27, 36, 14]]; // x from the middle, top y, width: index, middle, ring, little
  const flip = (x) => (mirror ? -x : x);
  const skin = 'fill="currentColor" fill-opacity="0.14"';
  let out = `<rect x="${cx - 37}" y="52" width="74" height="36" rx="14" ${skin}/>`;
  fingers.forEach(([dx, top, w]) => { out += `<rect x="${cx + flip(dx) - w / 2}" y="${top}" width="${w}" height="${66 - top}" rx="${w / 2}" ${skin}/>`; });
  const tx = cx + flip(-38);
  out += `<rect x="${tx - 8}" y="42" width="16" height="44" rx="8" ${skin} transform="rotate(${mirror ? 32 : -32} ${tx} 82)"/>`;
  const tip = (x, y, label) => (label ? `<circle cx="${x}" cy="${y}" r="8.5" ${solid}/>${text(x, y + 4, label, { size: 10.5, fill: '#fff' })}` : '');
  out += tip(cx + flip(-56), 53, labels[0]);
  fingers.forEach(([dx, top], i) => { out += tip(cx + flip(dx), top + 9, labels[i + 1]); });
  return out + (caption ? text(80, 98, caption, { size: 8.6, weight: 600, opacity: 0.8 }) : '');
}

const PICTURES = {
  // what the screens show
  spider: (order = '1234') => svg(board(String(order).replace(/\D/g, '').slice(0, 4).split('').map((n, i) => ({ string: 3, fret: Number(n), label: n, kind: i === 0 ? 'now' : (i === 1 ? 'next' : 'faint') }))) + text(80, 96, 'one finger for each fret', { size: 10, weight: 600, opacity: 0.7 }), 'A fretboard with a finger number at each of the first four frets'),
  hop: () => svg(board([{ string: 3, fret: 1, label: '1' }, { string: 1, fret: 2, label: '2', kind: 'next' }, { string: 2, fret: 3, kind: 'faint' }, { string: 0, fret: 4, kind: 'faint' }]), 'Notes jumping from string to string'),
  stretch: () => svg(board([{ string: 3, fret: 2, label: '1' }, { string: 3, fret: 3, kind: 'faint' }, { string: 3, fret: 4, kind: 'faint' }, { string: 3, fret: 5, label: '4' }], { frets: 6 }) + `<path d="M40 90H118M46 85l-6 5l6 5M112 85l6 5l-6 5" stroke-width="2"/>`, 'A wide stretch across the frets'),
  walk: () => svg(board([{ string: 2, fret: 2, label: '1' }, { string: 2, fret: 3, kind: 'faint' }, { string: 2, fret: 4, kind: 'faint' }, { string: 2, fret: 5, kind: 'faint' }], { frets: 7 }) + arrow(56, 126, 91), 'The hand moving up the neck'),
  strum: (pattern = 'D-DU-UDU') => svg(strumRow(pattern) + text(80, 92, String(pattern).replace(/>/g, ''), { size: 11, weight: 700, opacity: 0.7 }), `The strum ${pattern} as arrows`),
  ladder: () => svg([1, 2, 3, 4].map((n, i) => `<rect x="${22 + i * 31}" y="${70 - i * 16}" width="24" height="${16 + i * 16}" rx="4" ${soft}/>${text(34 + i * 31, 82, ['1', '2', '3', '4'][i], { size: 11 })}`).join('') + text(80, 16, 'more strokes, same beat', { size: 10, weight: 600, opacity: 0.7 }), 'Steps getting higher: more strokes in the same beat'),
  loud: () => svg(strumRow('DDDD', { y: 20, height: 34 }) + `<path d="M18 84L78 84L78 74Z" ${soft}/><path d="M84 84L144 84L144 60Z" fill="currentColor" stroke="none" opacity="0.6"/>` + text(48, 98, 'soft', { size: 10.5 }) + text(114, 98, 'loud', { size: 10.5 }), 'Soft bars then loud bars'),
  change: (a = 'C', b = 'F') => svg(chordBox(a, shapeOf(a), 22) + arrow(72, 92, 58) + chordBox(b, shapeOf(b), 102), `The chord ${a}, an arrow, the chord ${b}`),
  names: (a = 'G', b = 'C') => svg(`<rect x="12" y="24" width="54" height="52" rx="10" ${soft}/><rect x="94" y="24" width="54" height="52" rx="10" stroke-width="1.6"/>` + text(39, 60, a, { size: 26, weight: 800 }) + text(121, 60, b, { size: 26, weight: 800 }) + arrow(70, 90, 50), `From the chord ${a} to the chord ${b}`),
  drill: () => svg(chordBox('C', SHAPES.C, 14, { w: 34, big: false }) + chordBox('Am', SHAPES.Am, 63, { w: 34 }) + chordBox('F', SHAPES.F, 112, { w: 34, big: false }), 'Chord shapes coming up one after another'),
  oneminute: () => svg(stopwatch(50, 56, 30, '1:00') + text(118, 50, '×', { size: 16, opacity: 0.6 }) + text(118, 72, '24', { size: 26, weight: 800 }) + text(118, 88, 'changes', { size: 10, weight: 600, opacity: 0.7 }), 'A stopwatch at one minute and a count of changes'),
  numerals: () => svg(['I', 'V', 'vi', 'IV'].map((n, i) => `<rect x="${10 + i * 36}" y="30" width="32" height="40" rx="6" ${i === 0 ? soft : 'opacity="0.35"'} stroke-width="1.4"/>${text(26 + i * 36, 56, n, { size: 16, weight: 800 })}`).join('') + text(80, 90, 'in any key', { size: 10, weight: 600, opacity: 0.7 }), 'The chord numbers I, V, vi and IV'),
  memory: () => svg(['I', 'V', '?', '?'].map((n, i) => `<rect x="${10 + i * 36}" y="30" width="32" height="40" rx="6" ${i < 2 ? soft : 'stroke-dasharray="4 3" opacity="0.6"'} stroke-width="1.4"/>${text(26 + i * 36, 56, n, { size: 16, weight: 800 })}`).join('') + text(80, 90, 'find the chords yourself', { size: 10, weight: 600, opacity: 0.7 }), 'Chord numbers with some hidden'),
  barre: () => svg(chordBox('Bb', [3, 2, 0, 0], 60).replace(/<circle[^>]*r="3"[^>]*\/>/g, '') + `<rect x="81" y="35" width="25" height="10" rx="5" ${solid}/>` + text(128, 44, 'one', { size: 10, weight: 600, opacity: 0.75 }) + text(128, 56, 'finger', { size: 10, weight: 600, opacity: 0.75 }), 'A barre chord: one finger across two strings'),
  blues: () => svg(Array.from({ length: 12 }, (_, i) => { const four = [4, 5, 9].includes(i); const five = [8, 11].includes(i); return `<rect x="${12 + (i % 4) * 35}" y="${14 + Math.floor(i / 4) * 26}" width="31" height="22" rx="4" ${four || five ? soft : 'opacity="0.4"'} stroke-width="1.3"/>${text(27.5 + (i % 4) * 35, 30 + Math.floor(i / 4) * 26, five ? 'V' : (four ? 'IV' : 'I'), { size: 11 })}`; }).join(''), 'The twelve bars of a blues'),
  metronome: () => svg(`<path d="M58 86L72 16H88L102 86Z" ${soft}/><path d="M80 78L98 26" stroke-width="3"/><circle cx="92" cy="43" r="5" ${solid}/><path d="M52 86H108"/><path d="M24 40q-8 12 0 24M136 40q8 12 0 24" opacity="0.6"/>`, 'A metronome'),
  pick: (fingers = 'pima') => svg([0, 1, 2, 3].map((s) => `<line x1="14" y1="${24 + s * 16}" x2="146" y2="${24 + s * 16}" stroke-width="1.4" opacity="0.7"/>${text(8, 28 + s * 16, 'AECG'[s], { size: 9, weight: 600, opacity: 0.6 })}`).join('') + String(fingers).split('').slice(0, 4).map((f, i) => { const string = { p: 3, i: 2, m: 1, a: 0 }[f] ?? (3 - i); return `<circle cx="${36 + i * 30}" cy="${24 + string * 16}" r="9" ${solid}/>${text(36 + i * 30, 28 + string * 16, f, { size: 11, fill: '#fff' })}`; }).join('') + text(80, 94, 'thumb · index · middle · ring', { size: 9.5, weight: 600, opacity: 0.7 }), 'Four strings with the picking fingers p, i, m and a'),
  single: () => svg([0, 1, 2, 3].map((s) => `<line x1="14" y1="${24 + s * 16}" x2="146" y2="${24 + s * 16}" stroke-width="1.4" opacity="${s === 1 ? 1 : 0.35}"/>`).join('') + ['i', 'm', 'i', 'm'].map((f, i) => `<circle cx="${36 + i * 30}" cy="40" r="9" ${i % 2 ? soft : solid}/>${text(36 + i * 30, 44, f, { size: 11, fill: i % 2 ? 'currentColor' : '#fff' })}`).join('') + text(80, 94, 'index · middle · index · middle', { size: 9.5, weight: 600, opacity: 0.7 }), 'One string picked by two fingers in turn'),
  scale: () => svg(Array.from({ length: 8 }, (_, i) => `<circle cx="${20 + i * 17}" cy="${80 - i * 8}" r="6.5" ${i === 0 || i === 7 ? solid : soft}/>`).join('') + text(20, 98, 'C', { size: 10 }) + text(139, 14, 'C', { size: 10 }), 'Eight notes going up in steps'),
  sequence: () => svg([0, 1, 2, 1, 2, 3, 2, 3, 4].map((n, i) => `<circle cx="${16 + i * 16}" cy="${76 - n * 13}" r="5.5" ${i % 3 === 0 ? solid : soft}/>`).join('') + text(80, 96, '1-2-3 · 2-3-4 · 3-4-5', { size: 9.5, weight: 600, opacity: 0.7 }), 'A scale played in groups of three'),
  melody: () => svg([0, 1, 2, 3, 4].map((l) => `<line x1="12" y1="${30 + l * 10}" x2="148" y2="${30 + l * 10}" stroke-width="1" opacity="0.45"/>`).join('') + [[30, 60], [52, 60], [74, 40], [96, 40], [118, 35], [138, 35]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.5" ${solid} transform="rotate(-18 ${x} ${y})"/><line x1="${x + 5.5}" y1="${y - 1}" x2="${x + 5.5}" y2="${y - 24}" stroke-width="1.6"/>${i === 5 ? '' : ''}`).join(''), 'Notes of a tune on a stave'),
  ear: () => svg(`<path d="M20 42v16h12l16 14V28L32 42Z" ${soft}/><path d="M58 38q8 12 0 24M68 30q14 20 0 40" opacity="0.7"/>${arrow(86, 104, 50)}${text(128, 62, '?', { size: 40, weight: 800 })}`, 'Hear a phrase, then find it'),
  noodle: () => svg(board([{ string: 0, fret: 2, kind: 'faint' }, { string: 1, fret: 1 }, { string: 1, fret: 3, kind: 'faint' }, { string: 2, fret: 2 }, { string: 2, fret: 4, kind: 'faint' }, { string: 3, fret: 3 }, { string: 0, fret: 5, kind: 'faint' }], { y: 14, h: 48 }) + `<path d="M18 86q12 -14 24 0t24 0t24 0t24 0t24 0" stroke-width="2.4"/>`, 'Notes that fit, scattered on the fretboard, and a wavy line'),
  three: () => svg(board([{ string: 1, fret: 1, label: '1' }, { string: 1, fret: 3, label: '2' }, { string: 2, fret: 2, label: '3' }], { open: [] }) + text(80, 96, 'only three notes', { size: 10, weight: 600, opacity: 0.7 }), 'Three notes on the fretboard'),
  qa: () => svg(`<rect x="10" y="20" width="76" height="34" rx="12" ${soft}/><path d="M26 54l-4 12l14 -12"/>${text(48, 42, '♪ ♪ ♩ ?', { size: 14 })}<rect x="74" y="50" width="76" height="34" rx="12" ${solid} opacity="0.85"/>${text(112, 72, '♩ ♪ ♪ !', { size: 14, fill: '#fff' })}`, 'A question phrase and an answer phrase'),
  write: () => svg(`<rect x="34" y="12" width="78" height="78" rx="6" ${soft}/><path d="M46 34h54M46 48h54M46 62h38" opacity="0.6"/><path d="M104 78l26 -34l8 6l-26 34l-11 4Z" fill="currentColor" stroke="none"/>`, 'A page and a pencil'),
  routine: () => svg(stopwatch(42, 56, 26) + [0, 1, 2].map((i) => `<rect x="84" y="${26 + i * 22}" width="62" height="14" rx="7" ${i === 0 ? solid : soft}/>`).join('') + tick(92, 33, 0.45).replace('stroke-width', 'stroke="#fff" stroke-width'), 'A stopwatch and a list of exercises'),
  // how to use it
  fretting: () => svg(hand(['', '1', '2', '3', '4'], { caption: 'index 1 · middle 2 · ring 3 · little 4' }), 'The fretting hand: index finger 1, middle 2, ring 3, little finger 4'),
  picking: () => svg(hand(['p', 'i', 'm', 'a', ''], { mirror: true, caption: 'thumb p · index i · middle m · ring a' }), 'The picking hand: thumb p, index i, middle m, ring a'),
  thumbstrum: () => svg(hand(['', '', '', '', ''], { mirror: true, cx: 52 }) + `<circle cx="79" cy="39" r="8.5" ${solid}/><path d="M122 22V76M114 66l8 10l8 -10" stroke-width="3"/><path d="M144 76V22M136 32l8 -10l8 10" stroke-width="3" opacity="0.55"/>` + text(80, 98, 'down with the nail, up with the pad', { size: 8.6, weight: 600, opacity: 0.8 }), 'Strum down with the nail of the index finger and up with its pad'),
  buttons: () => svg(pill(12, 22, 66, '▶ Start', { filled: true }) + pill(84, 22, 64, 'Show me') + text(45, 68, 'you play', { size: 10.5, weight: 600, opacity: 0.75 }) + text(116, 68, 'watch one', { size: 10.5, weight: 600, opacity: 0.75 }) + text(116, 82, 'slow round', { size: 10.5, weight: 600, opacity: 0.75 }), 'The Start and Show me buttons'),
  legend: () => svg(`<circle cx="26" cy="26" r="11" ${solid}/>${text(26, 30.5, '1', { size: 12, fill: '#fff' })}${text(46, 30.5, 'play this now', { size: 11.5, anchor: 'start', weight: 600 })}<circle cx="26" cy="54" r="11" stroke-dasharray="3 2.5" fill="currentColor" fill-opacity="0.1"/>${text(26, 58.5, '2', { size: 12 })}${text(46, 58.5, 'next', { size: 11.5, anchor: 'start', weight: 600 })}<path d="M36 82H16M24 76l-8 6l8 6" stroke-width="2.6"/>${text(46, 86.5, 'the string to pluck', { size: 11.5, anchor: 'start', weight: 600 })}`, 'A filled dot means play now, a dashed dot is next, an arrow shows the string'),
  relaxed: () => svg(hand(['', '1', '2', '3', '4'], { caption: 'loose, not tight' }), 'A relaxed hand with the fingers numbered one to four'),
  nownext: () => svg(chordBox('C', SHAPES.C, 30, { w: 44 }) + chordBox('F', SHAPES.F, 104, { w: 32, big: false }) + text(52, 96, 'NOW', { size: 9, opacity: 0.7 }) + text(120, 96, 'NEXT', { size: 9, opacity: 0.7 }), 'A large chord for now and a smaller one for next'),
  ring: () => svg([0, 1, 2, 3].map((s) => `<path d="M24 ${22 + s * 18}q14 ${s % 2 ? 6 : -6} 28 0t28 0t28 0t28 0" stroke-width="1.8" opacity="${0.5 + s * 0.15}"/>`).join('') + tick(142, 50, 0.9), 'Four strings ringing clearly'),
  tempo: () => svg(`<rect x="14" y="30" width="34" height="34" rx="8" ${soft}/>${text(31, 54, '−', { size: 22 })}<rect x="112" y="30" width="34" height="34" rx="8" ${soft}/>${text(129, 54, '+', { size: 22 })}${text(80, 52, '60', { size: 26, weight: 800 })}${text(80, 68, 'bpm', { size: 10.5, weight: 600, opacity: 0.7 })}${text(80, 92, 'slow first', { size: 10.5, weight: 600, opacity: 0.75 })}`, 'The tempo, with minus and plus'),
  countin: () => svg([1, 2, 3, 4].map((n, i) => `<circle cx="${32 + i * 32}" cy="46" r="${i === 0 ? 14 : 11}" ${i === 3 ? solid : soft}/>${text(32 + i * 32, 51, String(n), { size: 12, fill: i === 3 ? '#fff' : 'currentColor' })}`).join('') + text(80, 86, 'one bar to get ready', { size: 10.5, weight: 600, opacity: 0.75 }), 'A count of four before you start'),
  clean: () => svg(`<rect x="22" y="26" width="116" height="36" rx="18" ${solid}/>${tick(42, 45, 0.6).replace('stroke-width', 'stroke="#fff" stroke-width')}${text(92, 48.5, 'That was clean', { size: 11.5, fill: '#fff' })}${text(80, 84, 'you decide: the app can’t hear you', { size: 9.5, weight: 600, opacity: 0.75 })}`, 'The That was clean button'),
  form: () => svg(`<rect x="10" y="26" width="66" height="48" rx="8" ${soft}/>${text(43, 46, 'bar 1', { size: 10, weight: 600, opacity: 0.7 })}${text(43, 64, 'form it', { size: 13 })}<rect x="84" y="26" width="66" height="48" rx="8" stroke-width="1.6"/>${text(117, 46, 'bar 2', { size: 10, weight: 600, opacity: 0.7 })}${text(117, 64, 'strum it', { size: 13 })}`, 'One bar to form the chord, the next to strum it'),
  tap: () => svg(`<rect x="46" y="22" width="68" height="40" rx="20" ${soft}/>${text(80, 47, 'Tap', { size: 15 })}<path d="M30 30q-8 12 0 24M130 30q8 12 0 24M20 24q-12 18 0 36M140 24q12 18 0 36" opacity="0.5"/>${text(80, 86, 'tap along to set the speed', { size: 10, weight: 600, opacity: 0.75 })}`, 'Tap to set the tempo'),
  hear: () => svg(`<rect x="10" y="30" width="66" height="40" rx="8" ${soft}/><path d="M26 44v12h7l9 8V36l-9 8Z" fill="currentColor" stroke="none"/>${text(58, 55, 'hear', { size: 11 })}<rect x="84" y="30" width="66" height="40" rx="8" stroke-width="1.6"/>${text(117, 55, 'you play', { size: 11 })}${text(80, 90, 'round and round', { size: 10, weight: 600, opacity: 0.7 })}`, 'One round to hear, the next for you to play'),
  keynote: () => svg(board([{ string: 1, fret: 2, kind: 'faint' }, { string: 2, fret: 3, kind: 'faint' }, { string: 3, fret: 4, kind: 'faint' }], { y: 16, h: 50 }) + `<circle cx="27.2" cy="49.3" r="9" ${solid}/><circle cx="27.2" cy="49.3" r="13" stroke-width="2"/>` + text(80, 92, 'finish on the ringed note', { size: 10, weight: 600, opacity: 0.75 }), 'The key note has a ring round it'),
  backing: () => svg(strumRow('D-DU-UDU', { y: 12, height: 30 }) + `<path d="M18 74q12 -16 24 0t24 0t24 0t24 0t24 0" stroke-width="2.6"/>` + text(80, 94, 'the app strums; you play over it', { size: 9.5, weight: 600, opacity: 0.75 }), 'A strummed backing with your own line over it'),
  options: () => svg([['Quick change', true], ['Turnaround', true], ['Shuffle', false]].map(([label, on], i) => `<rect x="24" y="${20 + i * 24}" width="16" height="16" rx="4" ${on ? solid : soft}/>${on ? tick(32, 28 + i * 24, 0.4).replace('stroke-width', 'stroke="#fff" stroke-width') : ''}${text(50, 33 + i * 24, label, { size: 12, anchor: 'start', weight: 600 })}`).join(''), 'Tick boxes for the extras'),
  // the first-visit tour
  kinds: () => svg([['spider', 20, 22], ['change', 80, 22], ['strum', 140, 22], ['pick', 20, 70], ['scale', 80, 70], ['noodle', 140, 70]].map(([, x, y], i) => `<circle cx="${x}" cy="${y}" r="17" ${i % 2 ? soft : solid} opacity="${i % 2 ? 1 : 0.85}"/>`).join('') + text(20, 27, '1234', { size: 9, fill: '#fff' }) + text(80, 27, 'C→F', { size: 10 }) + text(140, 27, '↓↑', { size: 14, fill: '#fff' }) + text(20, 75, 'pima', { size: 10 }) + text(80, 75, '♪', { size: 16, fill: '#fff' }) + text(140, 75, '✦', { size: 14 }), 'Six kinds of exercise'),
  today: () => svg(`<rect x="12" y="14" width="136" height="72" rx="12" ${soft}/>${text(26, 36, 'Today', { size: 13, anchor: 'start', weight: 800 })}${[0, 1, 2].map((i) => `<rect x="26" y="${46 + i * 12}" width="${58 - i * 8}" height="6" rx="3" fill="currentColor" stroke="none" opacity="0.45"/>`).join('')}${pill(96, 46, 44, '▶', { filled: true })}`, 'A card with today’s practice and one Start button'),
  path: () => svg(`<path d="M20 70q20 -44 40 -22t40 -6t40 -20" stroke-dasharray="1 7" stroke-width="3"/>` + [[20, 70, true], [60, 48, true], [100, 42, false], [140, 22, false]].map(([x, y, isDone], i) => `<circle cx="${x}" cy="${y}" r="12" ${isDone ? solid : 'fill="var(--panel-bg, #fff)"'} ${isDone ? '' : 'stroke-width="2.4"'}/>${isDone ? tick(x, y, 0.5).replace('stroke-width', 'stroke="#fff" stroke-width') : text(x, y + 4.5, String(i + 1), { size: 12 })}`).join(''), 'A path of numbered steps, the first two ticked'),
  weekpic: () => svg('MTWTFSS'.split('').map((d, i) => `<circle cx="${20 + i * 20}" cy="44" r="8" ${[0, 1, 3, 4, 6].includes(i) ? solid : 'stroke-width="1.6" opacity="0.5"'}/>${text(20 + i * 20, 70, d, { size: 10, weight: 600, opacity: 0.7 })}`).join('') + text(80, 92, 'a little, most days', { size: 10.5, weight: 600, opacity: 0.75 }), 'The days of a week, most of them filled in'),
  safe: () => svg(`<path d="M80 12l40 14v22q0 28 -40 42q-40 -14 -40 -42V26Z" ${soft}/>${tick(80, 52, 1.2)}`, 'A shield with a tick'),
  gear: () => svg(`<circle cx="80" cy="50" r="12"/><path d="M80 22v10M80 68v10M52 50h10M98 50h10M60 30l7 7M93 63l7 7M100 30l-7 7M67 63l-7 7" stroke-width="5"/>${text(80, 96, 'settings are optional', { size: 10, weight: 600, opacity: 0.75 })}`, 'A settings cog')
};

/** The drawing for an exercise's card */
function forExercise(e, family = 'uke') {
  if (!e) return PICTURES.kinds();
  const set = e.set || {};
  switch (e.mode) {
    case 'spider':
      if (set.prHop) return PICTURES.hop();
      if (set.prStretch) return PICTURES.stretch();
      if (set.prMoveUp) return PICTURES.walk();
      return PICTURES.spider(/^\d+$/.test(set.prSpider || '') ? set.prSpider : '1234');
    case 'strum':
      if (e.memory) return PICTURES.memory();
      if (set.prStrum === 'ladder') return PICTURES.ladder();
      if (set.prDynamics) return PICTURES.loud();
      if (set.prProgression) return PICTURES.numerals();
      return PICTURES.strum(set.prStrum || 'D-DU-UDU');
    case 'change':
      if (e.id === 'barre' && set.prToRoot === 'Bb' && family === 'uke') return PICTURES.barre();
      if (family !== 'uke') return PICTURES.names(`${set.prFromRoot || 'C'}${set.prFromType || ''}`, `${set.prToRoot || 'F'}${set.prToType || ''}`); // the chord boxes drawn here are ukulele shapes
      return PICTURES.change(`${set.prFromRoot || 'C'}${set.prFromType || ''}`, `${set.prToRoot || 'F'}${set.prToType || ''}`);
    case 'drill': return PICTURES.drill();
    case 'oneminute': return PICTURES.oneminute();
    case 'blues': return PICTURES.blues();
    case 'metronome': return PICTURES.metronome();
    case 'notes':
      if (set.prNotesKind === 'scale') return Number(set.prSeq) > 0 ? PICTURES.sequence() : PICTURES.scale();
      if (set.prNotesKind === 'melody') return PICTURES.melody();
      if (set.prNotesKind === 'ear') return PICTURES.ear();
      if (set.prNotesKind === 'single' || set.prNotesKind === 'alternate') return PICTURES.single();
      return PICTURES.pick(set.prPickPattern === 'gecea' ? 'pmia' : 'pima');
    case 'noodle':
      if (e.create) return PICTURES.write();
      if (set.prNoodleQA) return PICTURES.qa();
      if (set.prNoodleNotes === 'three') return PICTURES.three();
      return PICTURES.noodle();
    default: return PICTURES.kinds();
  }
}

const CATEGORY = { warmup: 'spider', chords: 'change', rhythm: 'strum', picking: 'pick', melody: 'scale', noodle: 'noodle', routine: 'routine' };
function forCategory(id) { return (PICTURES[CATEGORY[id]] || PICTURES.kinds)(); }
function named(name, ...args) { return (PICTURES[name] || PICTURES.kinds)(...args); }

module.exports = { forExercise, forCategory, named, NAMES: Object.keys(PICTURES) };
