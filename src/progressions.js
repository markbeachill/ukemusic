// Chord patterns (4.21): a song's chords as numbers in its key (I IV V…), the familiar
// progressions in it, and which sections share a progression — to help remember a song.
// Pure: unit tested.
const { parseChordName } = require('./chord-names');
const { rankKeys } = require('./keys');

// Numerals by semitones above the key note. Major keys use the major scale; minor keys
// the natural minor (so in A minor, C is III and G is VII, as players say them).
const MAJOR_STEPS = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
const MINOR_STEPS = ['I', 'bII', 'II', 'III', '#III', 'IV', '#IV', 'V', 'VI', '#VI', 'VII', '#VII'];

function chordQuality(suffix) {
  const s = String(suffix || '');
  if (/^(dim|°|o(?!\w))/.test(s)) return 'dim';
  if (/^(m7b5|ø)/.test(s)) return 'half';
  if (/^aug|^\+/.test(s)) return 'aug';
  if (/^m(?!aj)/.test(s) || /^min/.test(s)) return 'min';
  return 'maj';
}

/** "G7" in C -> "V7"; "Am" in C -> "vi"; "Bb" in C -> "bVII"; "Bdim" -> "vii°" */
function numeral(chordName, key) {
  const parsed = parseChordName(chordName);
  if (!parsed || parsed.rootIndex === undefined || !key) return '?';
  const rel = (parsed.rootIndex - key.tonic + 12) % 12;
  const base = (key.mode === 'minor' ? MINOR_STEPS : MAJOR_STEPS)[rel];
  const q = chordQuality(parsed.suffix);
  const letters = base.replace(/^[b#]/, '');
  const acc = base.slice(0, base.length - letters.length);
  const cased = q === 'min' || q === 'dim' || q === 'half' ? letters.toLowerCase() : letters;
  let extra = '';
  if (q === 'dim') extra = '°';
  else if (q === 'half') extra = 'ø';
  else if (q === 'aug') extra = '+';
  const rest = parsed.suffix.replace(/^(maj(?=7|9)|m(?!aj)|min|dim|aug|\+|°|m7b5|ø)/, '');
  const ext = /^maj7/.test(parsed.suffix) ? 'maj7' : (rest.match(/^(7|9|11|13|6|sus2|sus4|sus|add9)/) || [''])[0];
  return `${acc}${cased}${extra}${ext}`;
}

/** The numeral without 7ths and the like, for matching patterns: "V7" -> "V", "ii7" -> "ii" */
const core = (n) => n.replace(/(maj7|7|9|11|13|6|sus2|sus4|sus|add9)$/, '');

// Familiar progressions (in major keys unless marked minor), with a way to remember each
const PATTERNS = [
  { name: 'Four-chord pop', steps: ['I', 'V', 'vi', 'IV'], hint: 'home, up to five, down to the sad six, then four. "Let It Be" and hundreds of pop songs.' },
  { name: '50s / doo-wop', steps: ['I', 'vi', 'IV', 'V'], hint: 'home, sad six, four, five. "Stand by Me", "Earth Angel".' },
  { name: 'Sad four-chord', steps: ['vi', 'IV', 'I', 'V'], hint: 'the four-chord pop progression starting on the sad six.' },
  { name: 'Three-chord trick', steps: ['I', 'IV', 'V', 'I'], hint: 'one, four, five, home. Folk, country and rock and roll.' },
  { name: 'Three-chord trick', steps: ['I', 'IV', 'I', 'V'], hint: 'one, four, back home, five: wants to go home again.' },
  { name: 'Turnaround (ii–V–I)', steps: ['ii', 'V', 'I'], hint: 'two, five, home: the classic way back to the key chord.' },
  { name: 'Five of five (II7–V7–I)', steps: ['II', 'V', 'I'], hint: 'a major two leads to five, five leads home: each chord a fifth above the next. Old-time and music-hall songs love it.' },
  { name: 'Circle', steps: ['vi', 'ii', 'V', 'I'], hint: 'each chord a fourth up from the last, round to home.' },
  { name: 'Ragtime', steps: ['III', 'VI', 'II', 'V'], hint: 'dominant sevenths round the circle back home ("Five Foot Two", "Alice\'s Restaurant").' },
  { name: 'Rhythm turnaround', steps: ['I', 'vi', 'ii', 'V'], hint: 'one, six, two, five: the jazz-standard loop.' },
  { name: 'Home and away', steps: ['I', 'V', 'I'], hint: 'just one and five: home, away, home ("Clementine", "Jambalaya").' },
  { name: 'Amen (plagal)', steps: ['I', 'IV', 'I'], hint: 'one, four, one: the "A-men" sound.' },
  { name: 'Rock (bVII)', steps: ['I', 'bVII', 'IV', 'I'], hint: 'the flat seven brings a rock or Celtic sound.' },
  { name: 'Mixolydian', steps: ['I', 'bVII', 'I'], hint: 'home and the flat seven.' },
  { name: 'Andalusian (minor)', steps: ['i', 'VII', 'VI', 'V'], hint: 'stepping down from home to five: flamenco, "Hit the Road Jack".' },
  { name: 'Minor one-four-five', steps: ['i', 'iv', 'V', 'i'], hint: 'the minor three-chord trick.' },
  { name: 'Minor folk', steps: ['i', 'III', 'IV', 'VI'], hint: '"House of the Rising Sun"-style minor ballad.' },
  // 4.48: more of the standard ones
  { name: 'Eight Days a Week', steps: ['I', 'II', 'IV', 'I'], hint: 'home, a bright major two that sounds as if it\'s heading for five, but drops to four instead, then home ("Eight Days a Week").' },
  { name: 'Garage-rock riff', steps: ['I', 'IV', 'V', 'IV'], hint: 'one, four, five, back to four, round and round ("Wild Thing", "Twist and Shout", "La Bamba").' },
  { name: 'Pachelbel\'s Canon', steps: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], hint: 'stepping down in pairs, then back up to five: the "Canon in D" chords ("Streets of London", "Go West").' },
  { name: 'Salty Dog', steps: ['VI', 'II', 'V', 'I'], hint: 'three major sevenths round the circle of fifths, each pulling to the next, then home ("Salty Dog", "Sweet Georgia Brown").' },
  { name: 'Minor four', steps: ['I', 'IV', 'iv', 'I'], hint: 'four, then four turned minor just before home: a bittersweet sigh, loved in ballads and Beatles songs.' },
  { name: 'Creep', steps: ['I', 'III', 'IV', 'iv'], hint: 'home, a major three, four, then four turned minor: big and sad at once ("Creep").' },
  { name: 'Minor rock (i–VI–VII)', steps: ['i', 'VI', 'VII', 'i'], hint: 'minor home, down to six, up through seven and home: the rise of a hundred rock songs and sea songs.' },
  { name: 'Watchtower', steps: ['i', 'VII', 'VI', 'VII'], hint: 'minor home, stepping down two and back: a driving minor riff ("All Along the Watchtower").' }
];

const ROLES = {
  I: 'home', i: 'home', IV: 'away', iv: 'away', V: 'tension (wants to go home)', v: 'tension',
  vi: 'the sad home', ii: 'leads to five', iii: 'a soft step', 'vii°': 'leads home', bVII: 'rock / Celtic colour',
  VI: 'away (minor key)', VII: 'leads back (minor key)', III: 'the bright side (minor key)', II: 'leads to five', bIII: 'borrowed colour', bVI: 'borrowed colour'
};
// 4.41: what a chord does depends on whether the key is major or minor ("VI" in C is A major,
// which leads to Dm; in A minor, VI is F, the warm away chord)
const ROLES_MAJOR = {
  I: 'home', IV: 'away', V: 'tension (wants to go home)', vi: 'the sad home', ii: 'leads to five', iii: 'a soft step',
  'vii°': 'leads home', bVII: 'rock / Celtic colour', iv: 'the sad four, borrowed from the minor key',
  bVI: 'a big, dark colour, borrowed from the minor key', bIII: 'borrowed from the minor key', i: 'home, turned minor',
  II: 'the five of five: leads to V', III: 'leads to the sad six (vi)', VI: 'leads to two (ii)', VII: 'leads to three (iii)', v: 'a soft five, borrowed'
};
const ROLES_MINOR = {
  i: 'home', iv: 'away', v: 'soft tension', V: 'tension (wants to go home)', III: 'the bright side (its relative major)',
  VI: 'away, warm', VII: 'leads back', 'ii°': 'leads to five', ii: 'leads to five', IV: 'a brighter four, borrowed (Dorian)',
  I: 'home, turned major', II: 'the five of five: leads to V', bII: 'a dark step down to home'
};
/** What a chord does in the key: "the sad home", "leads to five"… */
function roleOf(n, key) {
  if (n === 'I7') return 'home, leaning on to four';
  const c = core(n);
  const table = key && key.mode === 'minor' ? ROLES_MINOR : ROLES_MAJOR;
  return table[c] || ROLES[c] || '';
}

/**
 * Sections with their chord changes, line by line: [{ name, lines: [['C','G7'], ['F','C']], chords }]
 * (a chord held over from the line before isn't repeated; chords = all changes in order)
 */
function sectionChords(irNodes) {
  const sections = [];
  let current = null;
  let line = null;
  let last = null;
  const open = (name) => { current = { name, lines: [], chords: [] }; sections.push(current); line = null; last = null; };
  for (const node of irNodes || []) {
    if (node.type === 'structure') { open(String(node.content || '').replace(/[:：]\s*$/, '').trim() || 'Section'); continue; }
    if (node.type === 'linebreak') { line = null; continue; }
    if (node.type !== 'chord' || node.noChord) continue;
    if (!current) open('Start');
    if (!line) { line = []; current.lines.push(line); }
    if (node.content !== last || !line.length) {
      if (node.content !== last) current.chords.push(node.content);
      line.push(node.content);
    }
    last = node.content;
  }
  return sections.filter((s) => s.chords.length);
}

/** Consecutive repeats once: I I IV -> I IV */
const squash = (list) => list.filter((x, i) => i === 0 || x !== list[i - 1]);

/** Lines of numerals, a line repeated straight after itself shown once with ×2 */
function lineSummary(lines) {
  const out = [];
  for (const l of lines) {
    const text = l.join(' – ');
    const prev = out[out.length - 1];
    if (prev && prev.text === text) prev.times += 1;
    else out.push({ text, times: 1 });
  }
  return out.map((l) => (l.times > 1 ? `${l.text} ×${l.times}` : l.text));
}

// 4.48: a numeral's note, to tell a move up a fourth (round the circle of fifths) from any other
const ROMAN = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6 };
function corePc(c, minor = false) {
  const m = String(c).match(/^([b#]?)(VII|VI|IV|V|III|II|I)/i);
  if (!m) return null;
  const scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  return (scale[ROMAN[m[2].toUpperCase()]] + (m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0) + 12) % 12;
}

/**
 * More to say about a part's chords than the familiar patterns (4.48):
 *   * a run of four or more chords, each a fourth up from the last (round the circle of fifths),
 *     wherever it starts (the named Circle only counts one that ends at home)
 *   * the whole part as one loop: a named pattern that is the whole part says so ("round 8
 *     times"); a loop with no name is still a loop to learn ("One loop")
 * cores: the part's numerals (no repeats in a row); found: the named patterns found (their hints
 * get "the whole part" added); -> extra patterns [{ name, steps, hint, start, length }]
 */
function morePatterns(cores, found, { minor = false } = {}) {
  const out = [];
  const pcs = cores.map((c) => corePc(c, minor));
  let best = null;
  for (let i = 0; i < cores.length;) {
    let j = i;
    while (j + 1 < cores.length && pcs[j] !== null && pcs[j + 1] !== null && (pcs[j + 1] - pcs[j] + 12) % 12 === 5) j += 1;
    if (j - i + 1 >= 4 && (!best || j - i + 1 > best.length)) best = { start: i, length: j - i + 1 };
    i = j > i ? j : i + 1;
  }
  if (best) {
    const steps = cores.slice(best.start, best.start + best.length);
    // not when a named pattern already tells (most of) it: three steps of it in a row
    const threes = steps.slice(0, -2).map((_, i) => steps.slice(i, i + 3).join(' '));
    if (!found.some((f) => threes.some((t) => f.steps.join(' ').includes(t)))) {
      out.push({ name: 'Round the circle', steps, hint: `each chord a fourth up from the last, ${steps.length} in a row: round the circle of fifths, each one pulling to the next${steps[steps.length - 1] === 'I' || steps[steps.length - 1] === 'i' ? ', and home' : ''}.`, start: best.start, length: best.length });
    }
  }
  const c = cycle(cores);
  if (c.times >= 2 && c.unit.length >= 2 && c.unit.length <= 8) {
    const unit = c.unit.join(' ');
    const isUnit = (steps) => {
      const s = steps.length > 2 && steps[steps.length - 1] === steps[0] ? steps.slice(0, -1) : steps;
      return s.length === c.unit.length && [...s, ...s].join(' ').includes(unit);
    };
    const named = found.find((f) => isUnit(f.steps));
    if (named) named.hint = `${named.hint.replace(/\.$/, '')}. Here it's the whole part, round ${c.times} times.`;
    else {
      const steps = c.end === c.unit[0] ? [...c.unit, c.end] : c.unit;
      out.push({ name: 'One loop', steps, hint: `the whole part is these ${c.unit.length} chords, round and round (${c.times} times): learn this loop and you have the part.`, start: 0, length: Math.min(steps.length, cores.length) });
    }
  }
  return out;
}

// ── Key changes (4.49) ──
const MOVES = { 1: 'up a semitone', 2: 'up a tone', 3: 'up a minor third', 4: 'up a major third', 5: 'up a fourth', 6: 'a tritone away', 7: 'down a fourth', 8: 'down a major third', 9: 'down a minor third', 10: 'down a tone', 11: 'down a semitone' };
function keyMove(from, to) {
  if (!from || !to) return 'to a new key';
  const d = (to.tonic - from.tonic + 12) % 12;
  if (d === 0) return to.mode !== from.mode ? (to.mode === 'minor' ? 'to the minor' : 'to the major') : 'to the same key';
  return MOVES[d];
}
/** Does this chord lead into a key? "is the five of A: it leads into the new key" */
function leadsInto(chordName, key) {
  const parsed = parseChordName(chordName);
  if (!parsed || !key || parsed.rootIndex === undefined) return '';
  const rel = (parsed.rootIndex - key.tonic + 12) % 12;
  const q = chordQuality(parsed.suffix);
  if (rel === 7 && q === 'maj') return `is the five of ${key.name}: it leads into the new key (a "pivot" or turnaround).`;
  if (rel === 2 && q === 'maj') return `is the five of five in ${key.name}: it leads on to five, then home in the new key.`;
  return '';
}
/** Chords in a key's family: how many fit (I ii iii IV V vi vii°, and the minor key's) */
const FAMILY = { major: new Set(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']), minor: new Set(['i', 'ii°', 'III', 'iv', 'v', 'V', 'VI', 'VII']) };
function fitIn(chordNames, key) {
  if (!chordNames.length) return 0;
  const fam = FAMILY[key.mode === 'minor' ? 'minor' : 'major'];
  return chordNames.filter((c) => fam.has(core(numeral(c, key)))).length / chordNames.length;
}
/**
 * A key change that happens and stays, when none is written: the first part from which the rest
 * of the song fits another key well and the song's key badly (and what came before fits the
 * song's key). -> { line, key, block } or null
 */
function guessKeyChange(blocks) {
  const chordsOf = (list) => list.flatMap((b) => b.lines.flatMap((l) => l.chords)).filter((c) => c !== 'N.C.');
  const starts = (list) => list.map((b) => (b.lines.find((l) => l.chords.length) || { chords: [] }).chords[0]).filter(Boolean);
  for (let i = 1; i < blocks.length; i += 1) {
    const before = chordsOf(blocks.slice(0, i));
    const after = chordsOf(blocks.slice(i));
    if (after.length < 4 || before.length < 4) continue;
    const k1 = (rankKeys(before, { starts: starts(blocks.slice(0, i)) })[0] || {}).key;
    const k2 = (rankKeys(after, { starts: starts(blocks.slice(i)) })[0] || {}).key;
    if (!k1 || !k2 || (k2.tonic === k1.tonic && k2.mode === k1.mode)) continue;
    const there = fitIn(after, k2);
    if (there >= 0.9 && fitIn(after, k1) <= there - 0.3 && fitIn(before, k1) >= 0.75) return { line: blocks[i].first, key: k2, from: k1, block: blocks[i] };
  }
  return null;
}

/** Where a pattern appears in a list of numerals (as a loop too: vi IV I V inside I V vi IV I…) */
function findPatterns(cores, { minor = false } = {}) {
  const found = [];
  if (!cores.length) return found;
  const loop = [...cores, ...cores.slice(0, 3)];
  for (const p of PATTERNS) {
    for (let i = 0; i + p.steps.length <= loop.length && i < cores.length; i += 1) {
      if (p.steps.every((step, k) => loop[i + k] === step)) {
        const rotationOfFound = found.some((f) => f.steps.length === p.steps.length && [...f.steps, ...f.steps].join(' ').includes(p.steps.join(' ')));
        if (!found.some((f) => f.name === p.name) && !rotationOfFound) found.push({ name: p.name, steps: p.steps, hint: p.hint });
        break;
      }
    }
  }
  // Prefer the longer, more telling ones: drop a short pattern inside one already found
  const kept = found.filter((f) => !found.some((g) => g !== f && g.steps.length > f.steps.length && g.steps.join(' ').includes(f.steps.join(' '))));
  for (const x of morePatterns(cores, kept, { minor })) kept.push({ name: x.name, steps: x.steps, hint: x.hint });
  return kept;
}

/** 12-bar blues: I I I I IV IV I I V IV I V (or V7s), from chords bar by bar */
function isTwelveBar(cores) {
  const s = cores.join(' ');
  return /^I IV I V IV I( V)?$/.test(s) || /^I IV I IV I V IV I( V)?$/.test(s);
}

// ── Reading the song's shape (4.23) ──────────────────────────────────────────
// Songs are split into blocks at [[headings]] and at blank lines (most chord sheets mark verses
// and choruses with a blank line, not a heading). Blocks with the same chords are one part of
// the song (A, B, C…). Unlabelled parts are named from how they behave: the same chords and
// the same words each time is the chorus; the same chords with new words is a verse; a part
// heard once is the intro, the ending or the bridge.

const INFORMAL_LABEL = /^\s*(intro|verse|chorus|refrain|pre-?chorus|bridge|middle 8|solo|instrumental|interlude|break|riff|outro|ending|coda|tag)\b\s*(\d+)?[^:\n]{0,40}:\s*/i;
const normWords = (text) => String(text || '').toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
/** The first few words of a block, as written: "I come from Alabama, banjo…" */
function openingWords(block, count = 5) {
  const text = (block.lines.find((l) => l.words) || {}).words || '';
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (!words.length) return '';
  return words.length > count ? `${words.slice(0, count).join(' ').replace(/[,;:.!?]+$/, '')}…` : words.join(' ');
}
/** How alike two blocks' words are, 0-1 (shared words over all words) */
function wordsAlike(a, b) {
  const A = new Set(String(a || '').split(' ').filter(Boolean));
  const B = new Set(String(b || '').split(' ').filter(Boolean));
  if (A.size < 4 || B.size < 4) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared += 1;
  return shared / (A.size + B.size - shared);
}
const SAME_WORDS = 0.5;
const plainLabel = (label) => String(label || '').replace(/[:：]\s*$/, '').replace(/\s*\d+$/, '').trim();

/** The song as blocks: [{ label, lines: [{ chords, words }], first }] */
function songBlocks(irNodes) {
  const byLine = new Map();
  const silent = new Set();   // lines that take no room: not a blank line between two others
  let lastChord = null;
  const order = [];
  for (const node of irNodes || []) {
    if (typeof node.line !== 'number') continue;
    // lines that take no room ({melody}, {pick}, {key}) don't end a part (4.49)
    if (node.type === 'melody' || node.type === 'pick' || node.type === 'keychange') { silent.add(node.line); continue; }
    if (!byLine.has(node.line)) { byLine.set(node.line, { chords: [], words: '', heading: null, held: null, startsWithWords: null, segments: [] }); order.push(node.line); }
    const l = byLine.get(node.line);
    if (node.type === 'structure') { l.heading = String(node.content || ''); continue; }
    if (node.type === 'lyric') {
      const text = String(node.content || '');
      if (l.startsWithWords === null && text.trim()) l.startsWithWords = true;
      l.words += text;
      // Chords over words, for showing a part as it's sung (4.24)
      const seg = l.segments[l.segments.length - 1];
      if (seg && !seg.closed) seg.text += text;
      else if (text.trim() || l.segments.length) l.segments.push({ chord: '', text });
      continue;
    }
    if (node.type === 'chord' && !node.noChord) {
      l.segments.push({ chord: node.content, text: '' });
      if (l.startsWithWords === null) l.startsWithWords = false;
      if (!l.chords.length && l.startsWithWords && lastChord) l.held = lastChord; // words before the first chord: the last one is still sounding
      if (l.chords[l.chords.length - 1] !== node.content) l.chords.push(node.content);
      lastChord = node.content;
    }
  }
  // "Bridge (x2): [F] [Em]…" or "Ending last time:" written as words: a heading too (4.24)
  for (const l of byLine.values()) {
    if (l.heading !== null) continue;
    const m = l.words.match(INFORMAL_LABEL);
    if (!m) continue;
    l.heading = `${m[1][0].toUpperCase()}${m[1].slice(1).toLowerCase()}${m[2] ? ` ${m[2]}` : ''}`;
    const cut = m[0].length;
    l.words = l.words.slice(cut);
    let left = cut;
    for (const g of l.segments) { const take = Math.min(left, g.text.length); g.text = g.text.slice(take); left -= take; }
    l.segments = l.segments.filter((g) => g.chord || g.text);
  }
  const blocks = [];
  let current = null;
  let carried = null; // a heading on its own, then a blank line: it names the next block
  const close = () => {
    if (current && current.lines.some((x) => x.chords.length)) blocks.push(current);
    else if (current && current.label && !current.lines.some((x) => x.words.trim())) carried = current.label;
    current = null;
  };
  const lines = [...byLine.keys()].sort((a, b) => a - b);
  let previous = null;
  for (const n of lines) {
    const l = byLine.get(n);
    let blankBefore = false;
    if (previous !== null) for (let g = previous + 1; g < n && !blankBefore; g += 1) if (!silent.has(g)) blankBefore = true;
    const empty = !l.chords.length && !l.words.trim() && !l.heading;
    if (l.heading !== null || blankBefore || empty) close();
    if (empty) { previous = n; continue; }
    if (!current) { current = { label: l.heading !== null ? l.heading : carried, lines: [], first: n }; carried = null; }
    if (l.chords.length || l.words.trim()) current.lines.push({ chords: l.chords, words: l.words.trim(), line: n, segments: l.segments.map(({ chord, text }, i) => (i === 0 && !chord && l.held ? { chord: l.held, text, held: true } : { chord, text })) });
    previous = n;
  }
  close();
  return blocks.map((b) => ({ ...b, lines: b.lines.filter((x) => x.chords.length || x.words) }));
}

/**
 * The chord pattern a part goes round: [I vi IV V I vi IV V I] -> { unit: [I vi IV V], times: 2,
 * end: 'I' } (a last chord back on the first one is the ending, not a new round)
 */
function cycle(cores) {
  let list = [...cores];
  let end = '';
  if (list.length > 2 && list[list.length - 1] === list[0]) { end = list[0]; list = list.slice(0, -1); }
  for (let size = 2; size <= list.length / 2; size += 1) {
    if (list.length % size) continue;
    let ok = true;
    for (let i = size; i < list.length && ok; i += 1) if (list[i] !== list[i - size]) ok = false;
    if (ok) return { unit: list.slice(0, size), times: list.length / size, end };
  }
  return { unit: list, times: 1, end };
}
const cycleKey = (cores) => { const c = cycle(cores); return `${c.unit.join(' ')}${c.end && c.unit[0] !== c.end ? ` > ${c.end}` : ''}`; };
const cycleText = (c) => `${c.unit.join(' – ')}${c.times > 1 ? ` (×${c.times})` : ''}${c.end ? ` – ${c.end}` : ''}`;

/** Lines that repeat as a whole: [a, b, a, b] -> { unit: [a, b], times: 2 } */
function repeatUnit(lines) {
  const n = lines.length;
  for (let size = 1; size <= n / 2; size += 1) {
    if (n % size) continue;
    let ok = true;
    for (let i = size; i < n && ok; i += 1) if (lines[i] !== lines[i - size]) ok = false;
    if (ok) return { unit: lines.slice(0, size), times: n / size };
  }
  return { unit: lines, times: 1 };
}

/** Line strings with a whole-block repeat shown once, and a line repeated straight after shown ×2 */
function compactLines(lines) {
  const r = repeatUnit(lines);
  if (r.times > 1 && r.unit.length > 1) return { lines: lineSummary(r.unit.map((l) => l.split(' – '))), times: r.times };
  return { lines: lineSummary(lines.map((l) => l.split(' – '))), times: 1 };
}

/**
 * The analysis: { key, chords: [{ chord, numeral, role, count }], parts: [{ letter, name, times,
 * lines, chordLines, linesTimes, patterns, sameWords }], route: [{ letter, name, times }],
 * sections (each block, for older callers), letters, shape, summary }
 */
/** The first chord of each part of the song (4.41: a clue to where home is) */
function partStarts(irNodes) {
  try {
    return songBlocks(irNodes).map((b) => (b.lines.find((l) => l.chords.length) || { chords: [] }).chords[0]).filter(Boolean);
  } catch (_e) { return []; }
}

/** 4.41: the app's guess at a song's key, from its chords and how its parts start */
/** 4.49: the song up to its first written key change ({key: A}): the song's own key is the first */
function beforeKeyChange(irNodes) {
  const first = (irNodes || []).find((n) => n.type === 'keychange' && typeof n.line === 'number');
  return first ? irNodes.filter((n) => typeof n.line !== 'number' || n.line < first.line) : (irNodes || []);
}

function songKeyGuess(irNodes) {
  irNodes = beforeKeyChange(irNodes);
  // a key change that isn't written: the key it starts in
  try { const moved = !irNodes.some((n) => n.type === 'keychange') && guessKeyChange(songBlocks(irNodes)); if (moved) return moved.from; } catch (_e) { /* the usual guess */ }
  const all = (irNodes || []).filter((n) => n.type === 'chord' && !n.noChord && n.content).map((n) => n.content);
  if (!all.length) return null;
  const ranked = rankKeys(all, { starts: partStarts(irNodes) });
  return ranked.length ? ranked[0].key : null;
}

function analyse(irNodes, { key = null } = {}) {
  const all = (irNodes || []).filter((n) => n.type === 'chord' && !n.noChord).map((n) => n.content);
  let k = key && !key.guessed ? key : null;
  if (!k && all.length) {
    // (4.49: from the song's own key, before any written key change)
    const opening = beforeKeyChange(irNodes);
    const guessFrom = opening.filter((n) => n.type === 'chord' && !n.noChord).map((n) => n.content);
    // Guessing: the likeliest key, unless its home chord neither starts nor ends the song and a
    // close runner-up's does (a song in D with C and F chords can look like G)
    const ranked = rankKeys(guessFrom.length ? guessFrom : all, { starts: partStarts(opening) });
    const top = ranked[0];
    const close = ranked.filter((r) => top && r.score >= Math.min(top.score - 2.5, top.score * 0.9));
    k = top && (top.starts || top.ends) ? top.key : ((close.find((r) => r.ends) || close.find((r) => r.starts) || top || {}).key || null);
  }
  if (!k || !all.length) return { key: k, chords: [], parts: [], route: [], sections: [], letters: [], shape: '', summary: [], keyChanges: [] };
  // 4.49: key changes written in the song ({key: A}): the chords after one are numbered in it
  const { parseKey } = require('./keys');
  const written = (irNodes || []).filter((n) => n.type === 'keychange' && typeof n.line === 'number')
    .map((n) => ({ line: n.line, key: parseKey(n.content) })).filter((c) => c.key).sort((a, b) => a.line - b.line);
  // none written: one that seems to happen and stay (and then the song's key, if it was only
  // guessed, is the key it starts in: a song half in G and half in A isn't in D)
  const chosenKey = Boolean(key && !key.guessed);
  let movedTo = null;
  if (!written.length) {
    movedTo = guessKeyChange(songBlocks(irNodes));
    if (movedTo && chosenKey && !(movedTo.from.tonic === k.tonic && movedTo.from.mode === k.mode)) movedTo = null;
    if (movedTo && !chosenKey) k = movedTo.from;
  }
  const keyAt = (line) => { let at = k; for (const c of written) if (c.line <= line) at = c.key; return at; };
  const counts = new Map();
  const firstLine = new Map();
  for (const n of irNodes || []) {
    if (n.type !== 'chord' || n.noChord) continue;
    counts.set(n.content, (counts.get(n.content) || 0) + 1);
    if (!firstLine.has(n.content)) firstLine.set(n.content, n.line);
  }
  const chords = [...counts.keys()].map((chord) => {
    const ck = keyAt(firstLine.get(chord));
    const n = numeral(chord, ck);
    return { chord, numeral: n, role: roleOf(n, ck), count: counts.get(chord), ...(ck !== k ? { inKey: ck.name } : {}) };
  });

  const blocks = songBlocks(irNodes).map((b) => {
    const numLines = b.lines.filter((l) => l.chords.length).map((l) => l.chords.map((c) => numeral(c, keyAt(l.line))).join(' – '));
    const chordLines = b.lines.filter((l) => l.chords.length).map((l) => l.chords.join(' – '));
    const cores = squash(b.lines.flatMap((l) => l.chords.map((c) => core(numeral(c, keyAt(l.line))))));
    return { ...b, numLines, chordLines, cores, sig: cycleKey(cores), words: normWords(b.lines.map((l) => l.words).join(' ')) };
  });

  // Parts: blocks with the same chords
  const parts = [];
  for (const b of blocks) {
    let part = parts.find((p) => p.sig === b.sig);
    if (!part) { part = { sig: b.sig, letter: String.fromCharCode(65 + parts.length), blocks: [] }; parts.push(part); }
    part.blocks.push(b);
    b.letter = part.letter;
  }
  const lastIndex = blocks.length - 1;
  // Words that come back: a block whose words are mostly another block's is a chorus (4.24)
  for (const b of blocks) b.repeatsWords = blocks.some((o) => o !== b && wordsAlike(b.words, o.words) >= SAME_WORDS);
  for (const part of parts) {
    const chorusBlocks = part.blocks.filter((b) => b.repeatsWords);
    for (const b of part.blocks) if (!b.repeatsWords && chorusBlocks.some((o) => wordsAlike(b.words, o.words) >= 0.35)) b.repeatsWords = true;
  }
  const isLong = (b) => b.numLines.length >= 2 && b.words;
  const firstLong = blocks.findIndex(isLong);
  // Parts heard once, with words, between the others: with two or more of them they're verses
  // with tunes of their own ("Mr Tambourine Man"), not bridges
  const onceMiddle = parts.filter((p) => p.blocks.length === 1 && isLong(p.blocks[0]) && !plainLabel(p.blocks[0].label)
    && blocks.indexOf(p.blocks[0]) > 0 && blocks.indexOf(p.blocks[0]) < lastIndex);
  for (const part of parts) {
    // A heading names the part only if the labelled blocks have words (an "Intro:" line of chords
    // that's the verse's chords doesn't make the verses an intro)
    const labelled = part.blocks.filter((b) => plainLabel(b.label));
    const useLabels = labelled.length && (labelled.length === part.blocks.length || labelled.some((b) => b.words));
    const labels = useLabels ? labelled.map((b) => plainLabel(b.label)) : [];
    const counts2 = new Map();
    for (const l of labels) counts2.set(l, (counts2.get(l) || 0) + 1);
    const label = [...counts2.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    const words = part.blocks.map((b) => b.words).filter(Boolean);
    const repeatedWords = words.filter((w, i) => words.indexOf(w) !== i).length;
    const uniqueWords = words.filter((w) => words.indexOf(w) === words.lastIndexOf(w)).length;
    const firstAndLastOnly = part.blocks.length === 2 && blocks.indexOf(part.blocks[0]) === 0 && blocks.indexOf(part.blocks[1]) === lastIndex;
    part.sameWords = repeatedWords > 0 && !firstAndLastOnly;
    // A chorus starts with the same words every time (a verse has new words)
    const openings = part.blocks.map((b) => normWords(b.lines.find((l) => l.words)?.words || '').split(' ').slice(0, 4).join(' ')).filter(Boolean);
    part.chorusLike = openings.length >= 2 && openings.every((o) => o === openings[0]) && !firstAndLastOnly;
    part.times = part.blocks.length;
    const where = blocks.indexOf(part.blocks[0]);
    const short = part.blocks[0].numLines.length <= 1;
    const worded = part.blocks.filter((b) => b.words);
    const repeating = worded.filter((b) => b.repeatsWords);
    if (label) part.name = label;
    else if (part.times >= 2 && (part.chorusLike || (repeating.length >= 2 && repeating.length === worded.length && !firstAndLastOnly))) part.name = 'Chorus';
    else if (part.times >= 2 && words.length >= 2) {
      part.name = 'Verse';
      // The verse and chorus can share chords ("Stand by Me"): the blocks whose words come back
      // are the chorus (if no other part is)
      // (4.41: not when the words that come back are just the first verse sung again at the end)
      const bookends = repeating.length === 2 && blocks.indexOf(repeating[0]) === 0 && blocks.indexOf(repeating[1]) === lastIndex;
      if (bookends) part.firstAgain = true;
      else if (repeating.length >= 2 && !firstAndLastOnly) part.chorusCandidates = true;
    } else if (part.times >= 2) part.name = 'Riff';
    else if (where === 0 && (short || words.length === 0)) part.name = 'Intro';
    else if (short && where < firstLong) part.name = 'Intro';
    else if (where === lastIndex) part.name = 'Ending';
    else if (!words.length) part.name = 'Instrumental';
    else if (short) part.name = 'Link';
    else part.name = onceMiddle.length >= 2 && onceMiddle.includes(part) ? 'Verse' : 'Bridge';
    part.alsoIn = [...new Set(part.blocks.map((b) => plainLabel(b.label)).filter((l) => l && l !== label))]; // e.g. the Intro and Interlude use these chords too
    part.chordsText = cycleText(cycle(part.blocks.reduce((best, b) => (b.cores.length > best.cores.length ? b : best), part.blocks[0]).cores));
    part.labelled = Boolean(label);
    const first = part.blocks.reduce((best, b) => (b.numLines.length > best.numLines.length ? b : best), part.blocks[0]);
    const c = compactLines(first.numLines);
    part.lines = c.lines;
    part.linesTimes = c.times;
    part.chordLines = compactLines(first.chordLines).lines;
    // How it goes, with the words (4.24): the first time the part comes with words, and the
    // opening words of each time it comes, so the letters can be found on the sheet
    const sung = part.blocks.find((b) => b.lines.some((l) => l.words)) || first;
    const r = repeatUnit(sung.numLines);
    const shownLines = sung.lines.filter((l) => l.chords.length || l.words);
    part.example = { lines: (r.times > 1 ? shownLines.slice(0, Math.max(r.unit.length, 1)) : shownLines).slice(0, 8).map((l) => l.segments.length ? l.segments : [{ chord: '', text: l.words }]), more: shownLines.length > 8 && r.times === 1 };
    part.example.lines = part.example.lines.map((segs) => segs.map((g) => ({ ...g, numeral: g.chord ? numeral(g.chord, k) : '' })));
    part.occurrences = part.blocks.map((b) => ({ index: blocks.indexOf(b) + 1, line: b.first, words: openingWords(b) }));
    part.patterns = isTwelveBar(part.blocks[0].cores)
      ? [{ name: '12-bar blues', steps: part.blocks[0].cores, hint: 'four bars of one, two of four, two of one, then five, four, one (five).' }]
      : findPatterns(part.blocks[0].cores, { minor: k.mode === 'minor' });
  }
  const hasChorus = parts.some((p) => /^(chorus|refrain)/i.test(p.name));
  for (const part of parts) {
    const shared = part.chorusCandidates && !hasChorus;
    for (const b of part.blocks) b.ownName = shared && b.repeatsWords ? 'Chorus' : '';
    if (shared && !part.alsoIn.includes('Chorus')) part.alsoIn.push('Chorus');
    delete part.chorusCandidates;
  }
  // Two unlabelled parts with the same name: "Verse" and "Verse 2"
  const seen = new Map();
  for (const part of parts) {
    if (!part.labelled && /^(Intro|Ending|Link|Instrumental)$/.test(part.name)) continue; // two intro bits are both the intro
    const n = (seen.get(part.name) || 0) + 1;
    seen.set(part.name, n);
    if (n > 1) part.name = `${part.name} ${n}`;
  }

  // The route through the song, with runs: Verse ×2 → Chorus
  const route = [];
  for (const b of blocks) {
    const part = parts.find((p) => p.letter === b.letter);
    const last = route[route.length - 1];
    const name = plainLabel(b.label) ? String(b.label).replace(/[:：]\s*$/, '').trim() : (b.ownName || part.name);
    if (last && last.letter === b.letter && last.name === name) last.times += 1;
    else route.push({ letter: b.letter, name, times: 1, words: openingWords(b, 3) });
    b.shownName = name;
  }

  const uniqueCores = [...new Set(chords.map((c) => core(c.numeral)))];
  const summary = [];
  summary.push(`${chords.length} chord${chords.length === 1 ? '' : 's'}: ${chords.map((c) => `${c.chord} (${c.numeral})`).join(', ')}`);
  if (uniqueCores.length <= 3 && ['I', 'IV', 'V'].every((n) => uniqueCores.includes(n))) summary.push('The three-chord trick: just one, four and five.');
  const big = parts.filter((p) => p.blocks[0].numLines.length > 1 || p.times > 1);
  summary.push(`${blocks.length} part${blocks.length === 1 ? '' : 's'} in the song, but only ${parts.length} different chord pattern${parts.length === 1 ? '' : 's'} to learn${big.length < parts.length ? ` (${big.length} of them more than a chord or two)` : ''}.`);
  const most = [...parts].sort((a, b) => b.times - a.times)[0];
  // 4.41: one pattern for the whole song says something different from "learn that first"
  if (parts.length === 1 && most && most.times >= 2) summary.push('One chord pattern for the whole song: learn it once, then it\'s the words.');
  else if (most && most.times >= 2) summary.push(`The ${most.name.toLowerCase()} (${most.letter}) comes ${most.times} times: learn that first.`);
  if (parts.some((p) => p.firstAgain)) summary.push('The first verse comes back at the end.');

  // 4.49: key changes: the ones written in the song, or (when there are none) one that seems to
  // happen and stay (the last verses a tone higher); and the chord that leads into the new key
  const keyChanges = [];
  const sectionName = (b) => (b.label ? String(b.label).replace(/[:：]\s*$/, '').trim() : (b.shownName || `line ${b.first}`));
  const blockAtLine = (line) => blocks.find((b) => b.first >= line) || null;
  for (const c of written) {
    const from = keyAt(c.line - 1);
    const b = blockAtLine(c.line);
    keyChanges.push({ line: c.line, key: c.key, from, name: b ? sectionName(b) : `line ${c.line}` });
  }
  if (movedTo) {
    const b = blocks.find((x) => x.first >= movedTo.line) || movedTo.block;
    keyChanges.push({ line: movedTo.line, key: movedTo.key, from: k, name: sectionName(b), detected: true });
  }
  for (const c of keyChanges) {
    const move = keyMove(c.from, c.key);
    // the chord just before: the five of the new key leads into it
    const before = blocks.filter((b) => b.first < c.line).flatMap((b) => b.lines.flatMap((l) => l.chords)).pop();
    const lead = before ? leadsInto(before, c.key) : '';
    c.move = move;
    if (c.detected) summary.push(`It seems to move ${move} to ${c.key.name} at ${c.name}. Write {key: ${c.key.name}} on a line above it, and Learn numbers the chords from there in ${c.key.name} (now it's all counted in ${k.name}).`);
    else {
      // a part after the change with the chords of one before it: the same part, moved
      const after = blocks.find((b) => b.first >= c.line);
      const same = after && blocks.find((b) => b.first < c.line && b.letter === after.letter);
      summary.push(`It changes key: ${move} to ${c.key.name} at ${c.name}.${same ? ` ${sectionName(after)} is ${sectionName(same)}'s chords, ${move}: the same to learn, counted in the new key.` : ''}`);
    }
    if (lead) summary.push(`${before}, just before it, ${lead}`);
  }

  const sections = blocks.map((b) => ({ line: b.first, labelled: Boolean(plainLabel(b.label)), name: b.label ? String(b.label).replace(/[:：]\s*$/, '').trim() : b.shownName, letter: b.letter, chords: b.chordLines, numerals: b.numLines, lines: compactLines(b.numLines).lines, chordLines: compactLines(b.chordLines).lines, patterns: parts.find((p) => p.letter === b.letter).patterns, sameAs: '' }));
  return {
    key: k,
    chords,
    parts: parts.map(({ sig, blocks: bl, ...rest }) => rest),
    route,
    sections,
    letters: parts.map((p) => ({ letter: p.letter, first: p.name, numerals: p.sig })),
    shape: route.map((r) => `${r.name}${r.times > 1 ? ` ×${r.times}` : ''}`).join(' → '),
    summary,
    keyChanges: keyChanges.map(({ line, key: to, from, name, detected, move }) => ({ line, key: to, from, name, move, ...(detected ? { detected: true } : {}) }))
  };
}

/** The analysis as a few lines of text, for the song's notes */
function analysisText(result, describeKey = (k) => k.name) {
  if (!result || !result.parts || !result.parts.length) return '';
  const lines = [`Chord patterns (in ${describeKey(result.key)})`];
  lines.push(`The song: ${result.shape}`);
  for (const p of result.parts) {
    const named = p.patterns.length ? `  ← ${p.patterns.map((x) => x.name).join(', ')}` : '';
    lines.push(`${p.letter} ${p.name}${p.times > 1 ? ` (×${p.times})` : ''}: ${p.chordsText}${named}`);
    lines.push(`   as written: ${p.chordLines.join(' | ')}${p.linesTimes > 1 ? ', twice' : ''}${p.alsoIn.length ? `   (also the ${p.alsoIn.join(' and ')})` : ''}`);
    const said = (p.occurrences || []).map((o) => o.words).filter(Boolean);
    if (said.length) lines.push(`   words: ${[...new Set(said)].map((w) => `"${w}"`).join(', ')}`);
  }
  for (const line of result.summary.slice(1)) lines.push(line);
  return lines.join('\n');
}

/**
 * The song with the guessed part names written in as [[headings]] (4.24), before each part
 * that doesn't have one. Your own headings are left alone, and once written the names can be
 * corrected like any other heading. Returns { text, added }.
 */
function addLabels(text, result) {
  const lines = String(text || '').split('\n');
  const todo = ((result && result.sections) || []).filter((s) => !s.labelled && s.line >= 1 && s.line <= lines.length);
  for (const s of [...todo].sort((a, b) => b.line - a.line)) lines.splice(s.line - 1, 0, `[[${s.name}]]`);
  return { text: lines.join('\n'), added: todo.length };
}

module.exports = { roleOf, songKeyGuess, partStarts, numeral, addLabels, openingWords, analyse, analysisText, sectionChords, songBlocks, findPatterns, morePatterns, corePc, lineSummary, repeatUnit, PATTERNS };
