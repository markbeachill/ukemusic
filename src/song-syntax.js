// Song shorthand (4.5): ways of writing bars, repeats and strums without placing every one.
//
//   [C x3]               C for 3 bars (shown "C×3"). Same as [C][][].
//   [C:2]                C for 2 beats (shown "C:2"); a plain chord after it fills the bar.
//   [N.C.] [N.C.:2]      no chord: a rest, the strings stopped (a bar, or 2 beats).
//   | C | F | % | G C |  a bar line: one box per bar. % repeats the bar before; two chords in a
//                        bar share it. Good for intros, solos and instrumentals.
//   ... (x2)             at the end of a line: play the line twice (shown "×2").
//   {A: D-DU-UDU}        a named strum: used here, and again wherever {A} is written.
//   {D-DU-UDU | D-DUDU}  alternating bars: the first pattern, then the second, and so on.
//   {stop}               the next chord is one strum, left to ring; then the strum carries on.
// 4.34, the marks songbooks write inside the brackets (as the North Shore Ukulele Circle does):
//   [C↓]  [Cv]           one down-strum, left to ring (shown "C↓"); [C↑] an up-strum
//   [C↓↓] [C↓↑]          those strums, spread over the bar
//   [x] [mute↓] [x↓↓]    muted strums ("chk"), a beat each
//   [.] [...] […]        keep the chord going (nothing to play; [G…] is G)
//   [Bm7.Am7]            two chords sharing the bar
//   [|] [/]              a bar line, like []
//   [x2]                 at the end of a line: play the line twice, like (x2)
//   Gs4 Gs2 A7s4 Dma7    short names: Gsus4, Gsus2, A7sus4, Dmaj7
//   {harmony} … {lead}   (4.34, src/parser.js) the lines in between are a harmony part: their
//                        words are italic (style bit 2) and marked harmony: true.
//
// The parser (src/parser.js) uses these helpers so everything after it (playback, karaoke,
// renderers, key changes) sees ordinary chord, bar and rhythm nodes with a few extra fields:
//   chord: bars (x3), share + part (two chords in one bar), grid + gridBar + mark ('%')
//   bar:   grid + gridBar + mark ('%')
//   repeat: { count }  (one per repeated line, just before its linebreak)
//   rhythm: strumName, recall (a {A} that refers back), stop, inlineStop (shown on its chord)
//   chord:  stopped (after an inline {stop}: shown "C stop")
// Pure functions: unit tested.

const { CHORD_RE } = require('./chord-names');

const REPEAT_RE = /\s*(?:\(\s*(?:[x×]\s*(\d{1,2})|(\d{1,2})\s*[x×])\s*\)|\[\s*[x×]\s*(\d{1,2})\s*\])\s*$/i; // (x2), or [x2] (4.34)
const CHORD_TIMES_RE = /^(.+?)\s*[x×]\s*(\d{1,2})$/;
const STRUM_DEF_RE = /^\s*([A-Za-z][A-Za-z0-9 ]{0,15}?)\s*:\s*(.*\S)\s*$/;
const RESERVED = new Set(['stop', 'swing', 'shuffle', 'straight']);

const NO_CHORD_RE = /^N\.?C\.?$/i;
const CHORD_TOKEN_RE = /^(.+?)(?:\s*:\s*(\d{1,2}))?(?:\s*[x×]\s*(\d{1,2}))?$/;
const MARKS_RE = /^(.+?)([↓↑v!*]+)$/;                  // C↓ C↓↓ Cv C!
const MUTED_RE = /^(?:x|mute)([↓↑v]*)$/i;              // x mute↓ x↓↓
const HOLD_RE = /^[.…]+$/;                             // . ... …
const SHORT_QUALITIES = [[/s4$/, 'sus4'], [/s2$/, 'sus2'], [/ma7$/, 'maj7'], [/ma9$/, 'maj9']];

/** A chord name, allowing the short forms: Gs4 -> Gsus4, Dma7 -> Dmaj7. Not a chord -> null */
function fullChordName(name) {
  const n = String(name || '').trim();
  if (CHORD_RE.test(n)) return n;
  const m = n.match(/^([A-G][#b]?)(.*)$/);
  if (!m) return null;
  for (const [re, to] of SHORT_QUALITIES) {
    const fixed = m[1] + m[2].replace(re, to);
    if (fixed !== n && CHORD_RE.test(fixed)) return fixed;
  }
  return null;
}
/** ↓ v ! * -> D, ↑ -> U: the strokes a marked chord plays */
const strokesOf = (marks) => [...marks].map((c) => (c === '↑' ? 'U' : 'D')).join('');

/**
 * What's inside [ ]: "C" -> { name: 'C', bars: 1 }; "C x3" -> bars 3; "C:2" -> beats 2;
 * "N.C." / "NC" -> { name: 'N.C.', noChord: true } (no chord: a rest). Not a chord -> null.
 */
function parseChordToken(inner) {
  const text = String(inner || '').trim();
  // 4.34: the songbook marks (see the top of this file)
  if (HOLD_RE.test(text)) return { hold: true };
  if (/^[|/]$/.test(text)) return { bar: true };
  const rep = text.match(/^[x×](\d{1,2})$/i);
  if (rep) return { repeat: Number(rep[1]) };
  const muted = text.match(MUTED_RE);
  if (muted) {
    const n = Math.max(1, [...muted[1]].length);
    return { name: 'N.C.', noChord: true, muted: n, beats: n, bars: 1, written: text.replace(/v/g, '↓') };
  }
  if (/^[A-G][^\s]*\.+[A-G]/.test(text) && !/[:x×]\s*\d/.test(text)) {
    const parts = text.split(/[.…]+/).map((p) => parseChordToken(p));
    if (parts.length > 1 && parts.every((p) => p && p.name && !p.noChord && !p.pair)) return { pair: parts, bars: 1 };
  }
  const m = text.match(CHORD_TOKEN_RE);
  if (!m) return null;
  let name = m[1].trim().replace(/[.…]+$/, '');        // [G…]: G, kept going
  let marks = '';
  const marked = name.match(MARKS_RE);
  if (marked && fullChordName(marked[1])) {
    name = marked[1];
    marks = marked[2].replace(/v/g, '↓');
  }
  const noChord = NO_CHORD_RE.test(name);
  const full = noChord ? 'N.C.' : fullChordName(name);
  if (!full) return null;
  if (m[2] && m[3]) return null;
  const token = { name: full, bars: 1 };
  if (full !== name && !noChord) token.written = name;   // as written (Gs4), for rewriting the text
  if (marks && !noChord) {
    token.marks = marks;
    token.strokes = strokesOf(marks);
  }
  if (noChord) token.noChord = true;
  if (m[2]) {
    const beats = Number(m[2]);
    if (beats < 1 || beats > 12) return null;
    token.beats = beats;
  }
  if (m[3]) {
    const bars = Number(m[3]);
    if (bars < 1 || bars > 32) return null;
    token.bars = bars;
  }
  return token;
}

/** How a chord node is printed: "C", "C×3", "C:2", "N.C.", "C stop" */
function chordLabel(node) {
  if (!node) return '';
  if (node.mark) return node.mark;
  if (node.muted) return node.written || 'x';            // 4.34: a muted strum, as written
  let label = String(node.content);
  if (node.marks) label += node.marks;                     // 4.34: C↓, C↓↓
  if (node.bars > 1) label += `×${node.bars}`;
  else if (node.beats) label += `:${node.beats}`;
  return node.stopped && !node.marks ? `${label} stop` : label;
}

/** "words (x2)" -> { text: 'words', count: 2 }; no repeat -> { text, count: 1 } */
function splitRepeat(line) {
  const text = String(line || '');
  const m = text.match(REPEAT_RE);
  if (!m) return { text, count: 1 };
  const count = Number(m[1] || m[2] || m[3]);
  if (count < 2 || count > 16) return { text, count: 1 };
  const rest = text.slice(0, m.index);
  if (!rest.trim()) return { text, count: 1 };
  return { text: rest, count };
}

/**
 * A bar line: "| C | F | % | G C |" -> [['C'], ['F'], ['%'], ['G', 'C']]; anything else -> null.
 * "||" and ":" repeat signs at the ends are allowed; empty bars are not.
 */
function parseGridLine(text) {
  const t = String(text || '').trim();
  if (!/^\|/.test(t) || !/\|\s*:?$|:\|$/.test(t)) return null;
  const inner = t.replace(/^\|\|?:?/, '').replace(/:?\|\|?$/, '');
  const cells = inner.split('|').map((c) => c.trim());
  if (!cells.length || cells.some((c) => !c)) return null;
  const bars = [];
  for (const cell of cells) {
    const tokens = cell.split(/\s+/);
    if (tokens.length > 4) return null;
    for (const tok of tokens) {
      if (tok === '%') continue;
      const t = parseChordToken(tok);
      if (!t || !t.name || t.pair || t.bars > 1) return null;
    }
    if (tokens.includes('%') && tokens.length > 1) return null;
    bars.push(tokens);
  }
  if (bars[0][0] === '%') return null;
  return bars;
}

/**
 * IR nodes for a bar line. `line`: source line number; `start`: visible offset to start at.
 *   single-chord bar -> chord node; split bar -> chord nodes with share/part;
 *   % after a single-chord bar -> bar node (one more bar of that chord);
 *   % after a split bar -> copies of that bar's chords.
 */
function gridNodes(bars, line, createNode, start = 0) {
  const nodes = [];
  let offset = start;
  let previous = null;
  bars.forEach((tokens, gridBar) => {
    offset += 2; // "| "
    if (tokens[0] === '%') {
      if (previous && previous.length === 1) {
        nodes.push({ ...createNode('bar', '', line, offset, []), grid: true, gridBar, mark: '%' });
      } else if (previous) {
        const parsedPrev = previous.map(parseChordToken);
        const usedPrev = parsedPrev.reduce((sum, t) => sum + (t.beats || 0), 0);
        const openPrev = parsedPrev.filter((t) => !t.beats).length;
        parsedPrev.forEach((t, part) => {
          const node = { ...createNode('chord', t.name, line, offset + part, []), grid: true, gridBar, part };
          if (t.noChord) node.noChord = true;
          if (t.marks) { node.marks = t.marks; node.strokes = t.strokes; node.stopped = true; }
          if (t.beats) node.beats = t.beats;
          else if (usedPrev) node.restOf = { used: usedPrev, count: openPrev };
          else node.share = 1 / previous.length;
          if (part === 0) node.mark = '%';
          else node.hidden = true;
          nodes.push(node);
        });
      }
      offset += 2;
      return;
    }
    // "| C:3 G |": a chord with beats takes them; the others share what's left of the bar
    const parsed = tokens.map(parseChordToken);
    const used = parsed.reduce((sum, t) => sum + (t.beats || 0), 0);
    const open = parsed.filter((t) => !t.beats).length;
    tokens.forEach((tok, part) => {
      const t = parsed[part];
      const node = { ...createNode('chord', t.name, line, offset, []), grid: true, gridBar };
      if (t.noChord) node.noChord = true;
      if (t.marks) { node.marks = t.marks; node.strokes = t.strokes; node.stopped = true; } // 4.36: "| Dm↓↓:2 F↓ G↓ |"
      if (t.beats) node.beats = t.beats;
      else if (used && tokens.length > 1) node.restOf = { used, count: open };
      else if (tokens.length > 1) node.share = 1 / tokens.length;
      if (tokens.length > 1) node.part = part;
      nodes.push(node);
      offset += tok.length + 1;
    });
    previous = tokens;
  });
  return nodes;
}

/** Text of a named-strum definition {A: D-DU-UDU} -> { name, pattern } or null */
function strumDefinition(content) {
  const m = String(content || '').match(STRUM_DEF_RE);
  if (!m) return null;
  const name = m[1].trim();
  // "3/4 D-DU" is a time, not a name; a lone D/U/X can't be a name (it's a strum)
  if (/^[DUX]$/i.test(name) || RESERVED.has(name.toLowerCase())) return null;
  return { name, pattern: m[2].trim() };
}

/** Is this rhythm text a word (not a strum)? "Chorus", "Island" */
function looksLikeName(content) {
  const t = String(content || '').trim();
  return /^[A-Za-z][A-Za-z0-9 ]{0,15}$/.test(t) && !/^[DUXdux\s]+$/.test(t);
}

/**
 * Resolve named strums and {stop} in place: a definition {A: …} and every {A} after it get
 * content = the pattern and strumName = 'A' (recall: true on the {A} ones). A definition can
 * come after a use (at the bottom of the song, say). Unknown names get a warning.
 */
function resolveStrums(nodes) {
  const defs = new Map();
  for (const node of nodes) {
    if (node.type !== 'rhythm') continue;
    const def = strumDefinition(node.content);
    if (def && !defs.has(def.name.toLowerCase())) defs.set(def.name.toLowerCase(), def);
  }
  nodes.forEach((node, i) => {
    if (node.type !== 'rhythm') return;
    const text = String(node.content).trim();
    if (text.toLowerCase() === 'stop') {
      node.stop = true;
      // {stop} in the words, just before a chord: the chord is shown "C stop" instead of a box
      if (node.offset !== null && node.offset !== undefined) {
        for (let j = i + 1; j < nodes.length && nodes[j].type !== 'linebreak'; j += 1) {
          if (nodes[j].type === 'chord') {
            nodes[j].stopped = true;
            node.inlineStop = true;
            break;
          }
        }
      }
      return;
    }
    const withFeel = (n) => {
      const f = takeFeel(n.content);
      if (f.feel) { n.feel = f.feel; n.content = f.text; }
      if (f.feel && !f.text) n.feelOnly = true; // {swing} on its own: the feel from here on
      return n;
    };
    const def = strumDefinition(text);
    if (def) {
      node.strumName = def.name;
      node.content = def.pattern;
      withFeel(node);
      return;
    }
    const known = defs.get(text.toLowerCase());
    if (known) {
      node.strumName = known.name;
      node.content = known.pattern;
      node.recall = true;
      withFeel(node);
      return;
    }
    withFeel(node);
    if (node.feelOnly) return;
    if (looksLikeName(text) && !/^\d/.test(text)) {
      node.unknownStrum = true;
      node.warnings = [...(node.warnings || []), `Line ${node.line}: no strum called "${text}". Name one first, like {${text}: D-DU-UDU}.`];
    }
  });
  return nodes;
}

// ── Feel (4.18): straight or swung playback ──
// How late the off-beat stroke of each pair comes, as a share of the pair: 0.5 is even.
const FEELS = { straight: 0.5, light: 0.58, swing: 0.62, shuffle: 2 / 3 };
const FEEL_NAMES = { straight: 'straight', light: 'light swing', swing: 'swing', shuffle: 'shuffle' };
const FEEL_RE = /(?:^|\s)(light\s+swing|swing|shuffle|straight)(?=\s|$)/i;

/** "swing D-DU-UDU" -> { feel: 'swing', text: 'D-DU-UDU' }; no feel word -> { feel: null, text } */
function takeFeel(content) {
  const text = String(content || '');
  const m = text.match(FEEL_RE);
  if (!m) return { feel: null, text };
  const word = m[1].toLowerCase().replace(/\s+/g, ' ');
  const feel = word === 'light swing' ? 'light' : word;
  return { feel, text: text.replace(m[0], ' ').replace(/\s+/g, ' ').trim() };
}

/** Is this the Island strum (D-DU-UDU, accents or not)? */
function isIslandStrum(pattern) {
  return String(pattern || '').toUpperCase().replace(/[^DUX-]/g, '') === 'D-DU-UDU';
}

/**
 * The feel a pattern is played with: the song's own word ({swing …}) first, otherwise the
 * Feel setting. 'auto' (the default) swings the Island strum lightly and plays the rest straight.
 */
function feelFor(pattern, ownFeel, setting = 'auto') {
  if (ownFeel && FEELS[ownFeel] !== undefined) return ownFeel;
  if (FEELS[setting] !== undefined) return setting;
  return isIslandStrum(pattern) ? 'light' : 'straight';
}

/** The strum patterns in a rhythm text: "D-DU-UDU | D-DUDU" -> ['D-DU-UDU', 'D-DUDU'] */
function strumParts(content) {
  return String(content || '').split('|').map((p) => p.trim()).filter(Boolean);
}

/**
 * Play repeated lines: each line marked "(x2)" is copied in after itself, so playback and
 * karaoke see it as many times as it's played. Copies keep the source line number and get
 * pass: 2, 3…
 */
function expandRepeats(nodes) {
  if (!(nodes || []).some((n) => n.type === 'repeat')) return nodes || [];
  const out = [];
  let current = [];
  const flush = (linebreak) => {
    const repeat = current.find((n) => n.type === 'repeat');
    const body = current.filter((n) => n.type !== 'repeat');
    out.push(...body);
    if (linebreak) out.push(linebreak);
    if (repeat) {
      for (let pass = 2; pass <= repeat.count; pass += 1) {
        out.push(...body.filter((n) => n.type !== 'rhythm' || n.stop).map((n) => ({ ...n, pass })));
        if (linebreak) out.push({ ...linebreak, pass });
      }
    }
    current = [];
  };
  for (const node of nodes) {
    if (node.type === 'linebreak') flush(node);
    else current.push(node);
  }
  if (current.length) flush(null);
  return out;
}

module.exports = {
  parseChordToken, fullChordName, chordLabel, NO_CHORD_RE, splitRepeat, parseGridLine, gridNodes, strumDefinition,
  resolveStrums, strumParts, expandRepeats, REPEAT_RE, FEELS, FEEL_NAMES, takeFeel, feelFor, isIslandStrum
};
