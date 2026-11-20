// 4.99.16: one set of strum symbols for every place a strum is drawn: the sheet's strum box, the
// player's strip (desktop and web), karaoke, the Music stand and Free Practice. Each used to keep
// its own list, so a palm-muted stroke (M) showed as the letter M and the strips lost accents.
//
//   SYMBOLS: D ↓  U ↑  X ✕ (chuck)  M ⇣ (palm-muted)  B b (bass notes, as written)  - · (rest)
//   steps(pattern, beatsPerBar) -> [{ stroke, accent, num, symbol }], the strip's cells:
//     ">" after a stroke accents it (as playback reads it); num is the count under it (1 & 2 &)
//
// Pure: a page script (root.UkeStrumSymbols) and a Node module. Unit tested.
(function (root) {
const SYMBOLS = { D: '↓', U: '↑', X: '✕', M: '⇣', B: 'B', b: 'b', '-': '·' };

const symbol = (stroke) => SYMBOLS[stroke] || stroke;

function steps(pattern, beatsPerBar) {
  const out = [];
  for (const ch of String(pattern || '')) {
    if (ch === '>') { if (out.length && out[out.length - 1].stroke !== '-') out[out.length - 1].accent = true; }
    else if (!/\s|\|/.test(ch)) out.push({ stroke: ch, accent: false, symbol: symbol(ch) });
  }
  const perBeat = out.length / (Number(beatsPerBar) || 4);
  out.forEach((step, i) => {
    if (Number.isInteger(perBeat) && perBeat > 0 && i % perBeat === 0) step.num = String(i / perBeat + 1);
    else if (perBeat === 2) step.num = '&'; // the "and" between beats
    else step.num = perBeat < 1 ? String(i + 1) : '';
  });
  return out;
}

const api = { SYMBOLS, symbol, steps };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.UkeStrumSymbols = api;
})(typeof window !== 'undefined' ? window : globalThis);
