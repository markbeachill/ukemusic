// Convert "chords above lyrics" chord sheets into ukemusic's inline [C]hord format.
//
//   C        F        C                 G7
//   Amazing grace how sweet the sound that saved...
// becomes
//   [C]Amazing g[F]race how [C]sweet the sound [G7]that saved...
//
// When the chord line has kept its spacing (usual when copying from a website), each chord
// goes in at its column. When the spacing has been lost (scans, some PDFs), the chords are
// spread across the words from the first to the last, and the line is reported as "check this".
// Pure functions, no DOM: unit tested.

const { CHORD_INNER_PATTERN: CHORD_CORE } = require('./chord-names');
const CHORD_RE = new RegExp(`^${CHORD_CORE}$`);
const LOOSE_CHORD_RE = new RegExp(`^${CHORD_CORE.replace('[A-G]', '[A-Ga-g]')}$`); // "c" from a bad scan
const NEUTRAL_RE = /^(\|+|\/+|-+|%|\(?x\d+\)?|\(?\d+x\)?|N\.?C\.?|\(|\))$/i; // bar lines, repeats, "no chord"
const JUNK_RE = /^[^A-Za-z0-9]+$/; // only punctuation: ".", "~", ",", "___)"
const SECTION_RE = /^\s*\[?\s*((?:pre[- ]?)?(?:intro|verse|chorus|bridge|outro|refrain|interlude|instrumental|solo|coda|tag|ending|hook|break)\b[^\]:]*?)\s*\]?\s*:?\s*$/i;

function tokens(line) {
  const out = [];
  const re = /\S+/g;
  let match;
  while ((match = re.exec(line))) out.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  return out;
}

function stripParens(text) {
  return text.replace(/^\((.+)\)$/, '$1');
}

const CHORD_PREFIX_RE = new RegExp(`^${CHORD_CORE}`);

/** Split chords a scan has run together ("FC" -> F, C; "G7C" -> G7, C). Null if not possible. */
function splitJoinedChords(text) {
  const parts = [];
  let rest = text;
  while (rest) {
    // Try the longest chord prefix that leaves a splittable remainder
    let found = null;
    const max = rest.match(CHORD_PREFIX_RE);
    if (!max) return null;
    for (let len = max[0].length; len >= 1; len -= 1) {
      const head = rest.slice(0, len);
      if (CHORD_RE.test(head) && (len === rest.length || /^[A-G]/.test(rest.slice(len)))) {
        found = head;
        break;
      }
    }
    if (!found) return null;
    parts.push(found);
    rest = rest.slice(found.length);
  }
  return parts.length >= 2 && parts.length <= 4 ? parts : null;
}

/**
 * Analyse a line. Returns { isChordLine, chords: [{ name, column }] }.
 * A chord line has at least one proper chord, no ordinary words, and may contain
 * bar lines, repeat marks and stray punctuation. Lower-case chords ("c") are accepted
 * only alongside proper ones, and are capitalised.
 */
function analyseLine(line) {
  const text = String(line || '');
  if (!text.trim() || /[[\]{}]/.test(text) || /^--(START|END) MUSIC--/.test(text.trim()) || /^```/.test(text.trim())) {
    return { isChordLine: false, chords: [] };
  }
  const chords = [];
  let strict = 0;
  for (const token of tokens(text)) {
    const bare = stripParens(token.text);
    if (CHORD_RE.test(bare)) {
      strict += 1;
      chords.push({ name: bare, column: token.start });
    } else if (splitJoinedChords(bare)) {
      strict += 1;
      splitJoinedChords(bare).forEach((name, k) => chords.push({ name, column: token.start + k }));
    } else if (LOOSE_CHORD_RE.test(bare) && bare.length <= 6) {
      chords.push({ name: bare[0].toUpperCase() + bare.slice(1), column: token.start, loose: true });
    } else if (NEUTRAL_RE.test(token.text) || JUNK_RE.test(token.text)) {
      // allowed in chord lines, ignored
    } else {
      return { isChordLine: false, chords: [] };
    }
  }
  // A lone capital "A" or "I"-style token could be a lyric word; require a strict chord either way
  return { isChordLine: strict > 0, chords: strict > 0 ? chords : [] };
}

function isChordLine(line) {
  return analyseLine(line).isChordLine;
}

/** Is the chord line's spacing meaningful (chords sit over their syllables)? */
function spacingKept(chordLine, chords, lyric) {
  if (chords.length <= 1) return true;
  const toks = tokens(chordLine);
  for (let i = 1; i < toks.length; i += 1) {
    if (toks[i].start - toks[i - 1].end >= 2) return true;
  }
  const span = toks[toks.length - 1].end;
  return span >= 0.7 * lyric.trimEnd().length;
}

function insertAtColumns(lyric, chords) {
  let text = lyric.replace(/\s+$/, '');
  const beyond = chords.filter((c) => c.column >= text.length);
  const within = chords.filter((c) => c.column < text.length).sort((a, b) => b.column - a.column);
  for (const chord of within) {
    text = `${text.slice(0, chord.column)}[${chord.name}]${text.slice(chord.column)}`;
  }
  for (const chord of beyond) text += ` [${chord.name}]`;
  return text;
}

function spreadOverWords(lyric, chords) {
  const text = lyric.replace(/\s+$/, '');
  const words = tokens(text);
  if (!words.length) return chords.map((c) => `[${c.name}]`).join(' ');
  const n = chords.length;
  const placements = chords.map((chord, i) => {
    const wordIndex = n === 1 ? 0 : Math.round((i * (words.length - 1)) / (n - 1));
    return { name: chord.name, column: words[Math.min(wordIndex, words.length - 1)].start, order: i };
  });
  // insert right-to-left; chords sharing a word keep their order
  let out = text;
  placements.sort((a, b) => b.column - a.column || b.order - a.order);
  for (const p of placements) out = `${out.slice(0, p.column)}[${p.name}]${out.slice(p.column)}`;
  return out;
}

function titleCase(text) {
  let t = text.trim().replace(/\s+/g, ' ');
  if (t === t.toUpperCase()) t = t.toLowerCase(); // "CHORUS" -> "Chorus"
  return t.replace(/(^|[\s-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
}

// Lines explaining tab symbols ("h = hammer on   p = pull off") — not music
const TAB_LEGEND_RE = /^\s*(?:[hpbrx/\\~]\s*[=:]\s*(?:hammer|pull|bend|release|slide|vibrato|mute|dead)[\w\s-]*[,;]?\s*){1,}$/i;

/**
 * Find tab pasted from a website (string lines like "E|--0--3--|") and fence it as a
 * ```tab block, tidied: upper-case string names, all four strings, lines the same length.
 * Chord names written just above the tab stay with it. Symbol keys are dropped.
 * Returns { lines, tabs, legends, warnings }.
 */
function fenceRawTab(lines) {
  const { findTabRuns, tidyTab, parseTab } = require('./tab');
  // Don't touch tab that is already fenced
  const fenced = new Set();
  let inside = false;
  lines.forEach((line, i) => {
    const t = line.trim();
    if (inside) { fenced.add(i); if (/^```\s*$/.test(t)) inside = false; }
    else if (/^```tab\s*$/i.test(t)) { inside = true; fenced.add(i); }
  });
  let runs = findTabRuns(lines).filter((r) => !fenced.has(r.start));
  // Join systems separated only by blank lines or chord-name lines into one block
  const between = (a, b) => lines.slice(a.end + 1, b.start);
  const joined = [];
  for (const run of runs) {
    const last = joined[joined.length - 1];
    if (last && between(last, run).every((l) => !l.trim() || isChordLine(l))) last.end = run.end;
    else joined.push({ ...run });
  }
  runs = joined;
  // Chord names directly above a block belong to it
  for (const run of runs) {
    if (run.start > 0 && isChordLine(lines[run.start - 1]) && !fenced.has(run.start - 1)) run.start -= 1;
  }
  const out = [];
  const warnings = [];
  const instruments = new Set();   // which instruments the pasted tab is written for
  let legends = 0;
  let r = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const run = runs[r];
    if (run && i === run.start) {
      const tidy = tidyTab(lines.slice(run.start, run.end + 1).join('\n'));
      out.push('```tab', ...tidy.text.split('\n'), '```');
      for (const sys of parseTab(tidy.text).systems) if (!sys.tuning.guessed) instruments.add(sys.tuning.name);
      warnings.push(...tidy.warnings.map((w) => `Tab ${r + 1}: ${w.replace(/^Tab lines \d+–\d+: /, '')}`));
      i = run.end;
      r += 1;
      continue;
    }
    if (!fenced.has(i) && TAB_LEGEND_RE.test(lines[i]) && lines[i].trim()) {
      legends += 1;
      continue;
    }
    out.push(lines[i]);
  }
  return { lines: out, tabs: runs.length, legends, warnings, instruments: [...instruments] };
}

/**
 * Convert a chord sheet (or a song containing some chord lines).
 * Lines that are already ukemusic annotations, delimiters, strum patterns and tab blocks are left alone.
 * Returns { text, report: { merged, estimated: [lineNumbers], instrumental, headings, cleaned } }
 * (line numbers refer to the returned text).
 */
function convertChordSheet(input) {
  const raw = String(input || '').replace(/\r\n?/g, '\n').split('\n');
  const tabbed = fenceRawTab(raw);
  const lines = tabbed.lines;
  const out = [];
  const report = { merged: 0, estimated: [], instrumental: 0, headings: 0, cleaned: 0, tabs: tabbed.tabs, tabLegends: tabbed.legends, tabWarnings: tabbed.warnings, tabInstruments: tabbed.instruments };
  let inTab = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inTab) {
      out.push(line);
      if (/^```\s*$/.test(trimmed)) inTab = false;
      continue;
    }
    if (/^```tab\s*$/i.test(trimmed)) {
      inTab = true;
      out.push(line);
      continue;
    }

    const section = !/^\[\[/.test(trimmed) && trimmed.match(SECTION_RE);
    if (section) {
      out.push(`[[${titleCase(section[1])}]]`);
      report.headings += 1;
      continue;
    }

    // "Intro: Am F D" or "(Intro:) Am F D" -> "[[Intro:]] [Am] [F] [D]" (bold label + chords)
    const labelled = trimmed.match(/^\(?\s*([A-Za-z][A-Za-z0-9' -]{0,24}?)\s*(:)?\s*\)?\s*:?\s+(.+)$/);
    // ("Tuning: GCEA", "Capo: 2" are information, not chords)
    const infoLabel = labelled && /^(tuning|capo|key|tempo|bpm|time|tabbed by|artist|album)$/i.test(labelled[1].trim());
    if (labelled && !infoLabel && (labelled[2] || /^\(/.test(trimmed) || /:\s/.test(trimmed)) && !analyseLine(labelled[1]).isChordLine) {
      const rest = analyseLine(labelled[3]);
      if (rest.isChordLine) {
        out.push(`[[${labelled[1].trim()}:]] ${rest.chords.map((c) => `[${c.name}]`).join(' ')}`);
        report.labelled = (report.labelled || 0) + 1;
        continue;
      }
    }

    const analysis = analyseLine(line);
    if (!analysis.isChordLine) {
      out.push(line);
      continue;
    }

    const next = lines[i + 1];
    const nextIsLyric = next !== undefined && next.trim() !== ''
      && !analyseLine(next).isChordLine
      && !/^\s*(\[|\{|--(START|END) MUSIC--|```)/.test(next)
      && !SECTION_RE.test(next);

    if (!nextIsLyric) {
      // chords with no words under them: an instrumental line
      out.push(analysis.chords.map((c) => `[${c.name}]`).join(' '));
      report.instrumental += 1;
      continue;
    }

    // Clean stray punctuation from the start of the lyric line (", ___) When we've…")
    let lyric = next;
    const leading = lyric.match(/^\s*(?:[^A-Za-z0-9\s'"(]+\s*)+(?=[A-Za-z0-9'"(])/);
    if (leading && /[^\s]/.test(leading[0])) {
      lyric = lyric.slice(leading[0].length);
      report.cleaned += 1;
    }

    // Columns are relative to the original lines; adjust if we trimmed the lyric's start
    // (unless that would pile chords onto the same spot, in which case keep their columns)
    const shift = next.length - lyric.length;
    let chords = analysis.chords.map((c) => ({ ...c, column: Math.max(0, c.column - shift) }));
    if (new Set(chords.map((c) => c.column)).size < chords.length) chords = analysis.chords;
    if (spacingKept(line, analysis.chords, next)) {
      out.push(insertAtColumns(lyric, chords));
    } else {
      out.push(spreadOverWords(lyric, chords));
      report.estimated.push(out.length);
    }
    report.merged += 1;
    i += 1; // the lyric line has been used
  }

  return { text: out.join('\n'), report };
}

/** Line numbers (1-based) of chord-only lines in a song, inside the music section if delimited. */
function findChordLines(text, { useDelimiters = true } = {}) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  let start = 0;
  let end = lines.length;
  if (useDelimiters) {
    const s = lines.indexOf('--START MUSIC--');
    const e = lines.indexOf('--END MUSIC--');
    if (s !== -1 && e > s) {
      start = s + 1;
      end = e;
    }
  }
  const found = [];
  let inTab = false;
  for (let i = start; i < end; i += 1) {
    const trimmed = lines[i].trim();
    if (inTab) {
      if (/^```\s*$/.test(trimmed)) inTab = false;
      continue;
    }
    if (/^```tab/i.test(trimmed)) {
      inTab = true;
      continue;
    }
    if (isChordLine(lines[i])) found.push(i + 1);
  }
  return found;
}

module.exports = { analyseLine, isChordLine, convertChordSheet, findChordLines };
