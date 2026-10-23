// ChordPro <-> ukemusic.
//
// ChordPro (chordpro.org) is the most widely used chord-sheet format. Its inline chords
// ([C]Hello) are the same as ukemusic's; the differences are in the {directives}:
//
//   ChordPro                         ukemusic
//   {title: Song}                    song title (suggested folder name)
//   {start_of_verse: Verse 1} …      [[Verse 1]]
//   {start_of_chorus} / {chorus}     [[Chorus]]
//   {start_of_tab} … {end_of_tab}    ```tab … ```
//   {comment: Strum D-DU-UDU}        {D-DU-UDU}   (ChordPro has no strum directive)
//   {comment: Anything else}         [[Anything else]]
//   [|]                              []           (bar marker)
//   {key} {time} {artist} → song settings; {define} → the song's chord shapes;
//   {tempo} {capo} {artist} … → notes (tempo is not applied)
// Pure functions, unit tested.
const { isChordName } = require('./chord-names');
const { parseChordToken, FEEL_NAMES } = require('./song-syntax');

const ALIASES = {
  t: 'title', st: 'subtitle', c: 'comment', ci: 'comment', cb: 'comment', comment_italic: 'comment',
  comment_box: 'comment', highlight: 'comment', soc: 'start_of_chorus', eoc: 'end_of_chorus',
  sov: 'start_of_verse', eov: 'end_of_verse', sob: 'start_of_bridge', eob: 'end_of_bridge',
  sot: 'start_of_tab', eot: 'end_of_tab', sog: 'start_of_grid', eog: 'end_of_grid'
};
const { parseDefine, formatDefine } = require('./shapes');
const META = ['title', 'sorttitle', 'subtitle', 'artist', 'composer', 'lyricist', 'arranger', 'album', 'year', 'key', 'capo', 'tempo', 'time', 'duration', 'copyright'];
const chordProFields = require('./chordpro-fields');
const STRUM_RE = /^\s*(?:\d{1,2}\s*\/\s*\d{1,2}\s+)?[\sDUXdux\-↓↑✕×>]+$/; // optional time: "3/4 D-DUDU"
const DIRECTIVE_LINE = /^\s*\{\s*([A-Za-z_][\w-]*)\s*(?::\s*([^}]*?)|\s+([^}]*?))?\s*\}\s*$/;

/** Does this text look like ChordPro (has ChordPro directives)? */
function looksLikeChordPro(text) {
  return /^\s*\{\s*(t|title|st|subtitle|artist|key|capo|soc|sov|sob|start_of_(chorus|verse|bridge|tab|grid)|chorus|c|comment)\b\s*(:[^}]*)?\}\s*$/mi.test(String(text || ''));
}

function parseDirective(line) {
  const m = line.match(DIRECTIVE_LINE);
  if (!m) return null;
  const raw = m[1].toLowerCase();
  let value = (m[2] !== undefined ? m[2] : m[3]) || '';
  const label = value.match(/label\s*=\s*"([^"]*)"/i);
  if (label) value = label[1];
  return { name: ALIASES[raw] || raw, value: value.trim() };
}

// 4.34: chord-name shorthands some songbooks use: Gs4 = Gsus4, Dma7 = Dmaj7, Gs2 = Gsus2
const SHORT_QUALITY = [[/s4$/, 'sus4'], [/s2$/, 'sus2'], [/ma7$/, 'maj7'], [/ma9$/, 'maj9'], [/^(.*)sus$/, '$1sus4']];
function chordName(name) {
  const n = String(name || '').trim();
  if (isChordName(n)) return n;
  for (const [re, to] of SHORT_QUALITY) {
    const m = n.match(/^([A-G][#b]?)(.*)$/);
    if (!m) return null;
    const fixed = m[1] + m[2].replace(re, to);
    if (fixed !== n && isChordName(fixed)) return fixed;
  }
  return null;
}

/**
 * 4.34: songbook marks inside the brackets (as the North Shore Ukulele Circle writes them), as
 * ukemusic writes them. Returns the replacement text, or null for anything else.
 *   [C↓] [C↓↓] [C!]   one strum, let it ring       -> {stop}[C]
 *   [x] [mute↓]       a muted strum                -> [N.C.:1]
 *   [.] [...] […]     keep the chord going          -> (nothing)    [G…] -> [G]
 *   [|] [/]           a bar line                    -> []
 *   [Bm7.Am7]         two chords, one after another -> [Bm7][Am7]
 *   [x2]              play it twice                 -> (x2), at the end of the line
 */
function songbookToken(inner) {
  let s = String(inner || '').trim();
  if (!s) return null;
  const out = [];
  let repeat = 0;
  while (s.length) {
    let m;
    if ((m = s.match(/^\s+/))) { s = s.slice(m[0].length); continue; }
    if ((m = s.match(/^[x×](\d{1,2})(?![\w#])/i))) { repeat = Number(m[1]); s = s.slice(m[0].length); continue; }
    if ((m = s.match(/^mute[↓↑]*/i)) || (m = s.match(/^x[↓↑]*(?![a-z])/i))) { out.push('[N.C.:1]'); s = s.slice(m[0].length); continue; }
    if ((m = s.match(/^[.…]+/))) { s = s.slice(m[0].length); continue; }
    if ((m = s.match(/^[|/]/))) { out.push('[]'); s = s.slice(1); continue; }
    if ((m = s.match(/^([A-G][#b]?[^\s.…|/↓↑!*]*)([↓↑!*]*)/))) {
      const name = chordName(m[1]);
      if (!name) return null;
      out.push(`${/[↓↑!*]/.test(m[2]) ? '{stop}' : ''}[${name}]`);
      s = s.slice(m[0].length);
      continue;
    }
    return null;
  }
  return { text: out.join(''), repeat };
}

/**
 * Inline [chords]: [|] -> [], a leading [*Label] -> [[Label]] (bold label); ukemusic's own
 * annotations come back as they were written ([*stop][C] -> {stop}[C], [C][*×3] -> [C x3],
 * [C][*2 beats] -> [C:2]); other [*annotations] are dropped; songbook marks (above) are read;
 * a word in brackets that isn't a chord ([Riff 1]) becomes a label.
 */
function convertInline(line) {
  let dropped = false;
  let prefix = '';
  let repeat = 0;
  const lead = line.match(/^\s*\[\*([^\]]+)\]\s*/);
  if (lead && !/^\s*\[\*(stop)\]/i.test(line) && line.slice(lead[0].length).trim()) {
    prefix = `[[${lead[1].trim()}]] `;
    line = line.slice(lead[0].length);
  }
  // ukemusic's annotations (4.34), before anything else
  line = line
    .replace(/\[\*stop\]\s*(?=\[)/gi, '{stop}')
    .replace(/\[([^\]*][^\]]*)\]\[\*[x×](\d{1,2})\]/g, '[$1 x$2]')
    .replace(/\[([^\]*][^\]]*)\]\[\*(\d{1,2}) beats?\]/g, '[$1:$2]');
  const out = prefix + line.replace(/\[([^\]]*)\]/g, (whole, inner) => {
    const t = inner.trim();
    if (t === '|' || t === '||') return '[]';
    if (t.startsWith('*') || t === '') {
      dropped = true;
      return '';
    }
    if (/^N\.?C\.?(:\d{1,2})?$/i.test(t) || /^no chord$/i.test(t)) return `[N.C.${(t.match(/:\d+$/) || [''])[0]}]`;
    if (isChordName(t) || /^.+\s*(:\s*\d{1,2}|[x×]\s*\d{1,2})$/.test(t)) return whole;
    if (/^[()]$/.test(t)) return t; // [(] [)]: brackets in the chord row
    if (parseChordToken(t)) return whole; // 4.34: songbook marks are ukemusic too ([C↓] [x] [.] [Gs4] [Bm7.Am7])
    const token = songbookToken(t);
    if (token) {
      if (token.repeat > 1) repeat = token.repeat;
      if (!token.text) dropped = true;
      return token.text;
    }
    if (/^[A-Za-z][\w '’-]{0,30}$/.test(t)) return `[[${t}]]`; // [Riff 1]: a label
    return whole;
  });
  let result = dropped ? out.replace(/ {2,}/g, ' ').trimEnd() : out;
  if (repeat > 1) result = `${result.replace(/\s+$/, '')} (x${repeat})`;
  return result;
}

// 4.34: a strum box (arrows over counts, as the North Shore songbook writes them):
//   ↓   × ↑   ↑ × ↑          one character per count; space = no strum
//   1 & 2 & 3 & 4 &          '|' between bars
// -> a ukemusic strum: "D-XU-UXU". Two or more different bars alternate: "D-DU | D-UU".
function strumBox(arrows, counts, beatsPerBar = 4) {
  const cells = [];
  for (let j = 0; j < counts.length; j += 1) {
    const c = counts[j];
    if (c === ' ') continue;
    if (c === '|') { cells.push('|'); continue; }
    const a = arrows[j] || ' ';
    cells.push({ s: a === '↓' ? 'D' : a === '↑' ? 'U' : /[×xX✕]/.test(a) ? 'X' : '-', count: c });
  }
  // bars: at '|', or when the count starts again at 1, or every beatsPerBar beats
  const bars = [];
  let bar = [];
  let beats = 0;
  for (const cell of cells) {
    if (cell === '|') { if (bar.length) bars.push(bar); bar = []; beats = 0; continue; }
    if (/\d/.test(cell.count)) {
      if ((cell.count === '1' && bar.length) || beats === beatsPerBar) { bars.push(bar); bar = []; beats = 0; }
      beats += 1;
    }
    bar.push(cell.s);
  }
  if (bar.length) bars.push(bar);
  const patterns = [...new Set(bars.map((b) => b.join('')).filter((p) => /[DUX]/.test(p)))];
  if (!patterns.length) return null;
  return patterns.join(' | ');
}

function gridLine(line) {
  const chords = line.split(/[\s|.]+/).filter((t) => isChordName(t));
  return chords.length ? chords.map((c) => `[${c}]`).join(' ') : null;
}

/**
 * ChordPro text -> { text, meta, report }
 *   meta:   { title, artist, key, capo, tempo, time, … }
 *   report: { sections, strums, ignored: [directive names] }
 */
function chordProToUkemusic(input) {
  const lines = String(input || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const meta = {};
  const report = { sections: 0, strums: 0, ignored: [] };
  // 4.27: everything else in the file is kept for the song's ChordPro tab (chordpro.txt)
  const keptFields = [];
  const keptOther = [];
  let inTab = false;
  let inGrid = false;
  let inStrum = null;            // 4.34: inside {start_of_strum} … {end_of_strum}
  const strumNames = [];        // every named strum so far ({comment: Strum Verse} recalls one)
  const boxNames = [];           // named strum boxes: used again after headings of that name
  const beatsPerBar = () => Number((String(meta.time || '').match(/^\s*(\d+)\s*\//) || [])[1]) || 4;
  const blank = () => {
    if (out.length && out[out.length - 1] !== '') out.push('');
  };
  const heading = (label) => {
    blank();
    out.push(`[[${label}]]`);
    report.sections += 1;
  };

  let verseCount = 0; // unlabelled ChordPro verses are numbered: Verse 1, Verse 2 …
  for (const line of lines) {
    if (inTab) {
      const d = parseDirective(line);
      if (d && d.name === 'end_of_tab') {
        out.push('```');
        inTab = false;
      } else {
        out.push(line);
      }
      continue;
    }
    if (/^\s*#/.test(line)) { keptOther.push(line.trim()); continue; } // ChordPro comment line: kept

    const d = parseDirective(line);
    if (inStrum && !(d && d.name === 'end_of_strum')) { inStrum.lines.push(line); continue; }
    if (!d) {
      // a bar line written with bracketed chords, "| [C] | [F] | % |" (ukemusic's own export) -> "| C | F | % |"
      if (/^\s*\|.*\|\s*(\(x\d+\))?\s*$/.test(line) && /\[[^\]]+\]/.test(line)) {
        out.push(line.replace(/\[([^\]*][^\]]*)\]/g, '$1').replace(/\[\*([^\]]+)\]\s*/, '[[$1]] ').trim());
        continue;
      }
      if (inGrid) {
        const converted = gridLine(line);
        if (converted) out.push(converted);
        continue;
      }
      out.push(convertInline(line));
      continue;
    }

    const { name, value } = d;
    if (META.includes(name)) {
      if (value && !meta[name]) meta[name] = value;
      if (value) keptFields.push({ name, value });
    } else if (name === 'meta') {
      const [k, ...rest] = value.split(/\s+/);
      if (k && rest.length && META.includes(k.toLowerCase()) && !meta[k.toLowerCase()]) meta[k.toLowerCase()] = rest.join(' ');
      // 4.34: {meta: spotify URL}, {meta: youtube URL} -> the song's links
      const url = rest.join(' ').trim();
      if (k && /^(spotify|youtube|link|url|video|audio)$/i.test(k) && /^https?:\/\//i.test(url)) {
        (meta.links = meta.links || []).push({ title: { spotify: 'Spotify', youtube: 'YouTube' }[k.toLowerCase()] || '', url });
      }
      if (k && /^orig(inal)?(_key)?$/i.test(k) && rest.length) meta.originalKey = url;
      if (k && rest.length) keptFields.push({ name: k.toLowerCase(), value: rest.join(' ') });
    } else if (name === 'tag') {
      // 4.34: {tag: 1970s} -> the song's tags
      if (value) (meta.tags = meta.tags || []).push(value.replace(/^#/, ''));
      keptFields.push({ name, value });
    } else if (name === 'x_voice') {
      // 4.34: harmony lines (in italics) until {x_voice: lead}
      out.push(/^harmony/i.test(value) ? '{harmony}' : '{lead}');
    } else if (/^x_/.test(name) && name !== 'x_ukemusic_strum') {
      keptFields.push({ name, value });
    } else if (name === 'define' || name === 'chord' || name === 'define-baritone' || name === 'define-guitar') {
      // {define: Am base-fret 1 frets 2 0 0 0}: a chord shape for this song
      // (4.34: {define-baritone: …} is the same for the baritone ukulele, {define-guitar: …} for guitar)
      const shape = parseDefine(value);
      if (shape) {
        if (name !== 'define' && name !== 'chord') shape.instrument = name.slice(7);
        (meta.defines = meta.defines || []).push(shape);
      }
    } else if (name === 'start_of_verse') {
      verseCount += 1;
      heading(value || `Verse ${verseCount}`);
    } else if (name === 'start_of_chorus' || name === 'chorus') {
      heading(value || 'Chorus');
    } else if (name === 'start_of_bridge') {
      heading(value || 'Bridge');
    } else if (name === 'start_of_tab') {
      if (value) heading(value);
      else blank();
      out.push('```tab');
      inTab = true;
    } else if (name === 'start_of_grid') {
      heading(value || 'Instrumental');
      inGrid = true;
    } else if (name === 'start_of_strum') {
      inStrum = { label: value, lines: [] };
    } else if (name === 'end_of_strum' && inStrum) {
      const rows = inStrum.lines.filter((l) => l.trim());
      const pattern = rows.length >= 2 ? strumBox(rows[0], rows[1], beatsPerBar()) : null;
      const label = (inStrum.label || '').trim();
      if (pattern) {
        const named = /^[A-Za-z][A-Za-z0-9 ]{0,15}$/.test(label) && !/^(stop|swing|shuffle|straight)$/i.test(label);
        out.push(named ? `{${label}: ${pattern}}` : `{${pattern}}`);
        if (named) { strumNames.push(label); boxNames.push(label); }
        report.strums += 1;
      } else {
        keptOther.push(...inStrum.lines);
      }
      inStrum = null;
    } else if (/^start_of_x_mono$/.test(name)) {
      blank();
    } else if (/^start_of_/.test(name)) {
      // 4.34: any other section, {start_of_x_intro: Intro}, {start_of_x_solo} …: a heading
      const kind = name.slice(9).replace(/^x_/, '').replace(/_/g, ' ');
      heading(value || kind.charAt(0).toUpperCase() + kind.slice(1));
    } else if (name === 'end_of_grid') {
      inGrid = false;
      blank();
    } else if (/^end_of_/.test(name)) {
      blank();
    } else if (name === 'comment' || name === 'x_ukemusic_strum') {
      const strum = name === 'x_ukemusic_strum' ? value : (value.match(/^strum(?:ming)?\s*:?\s*(.+)$/i) || [])[1];
      const namedStrum = strum && strum.match(/^([A-Za-z][A-Za-z0-9 ]{0,15}?)\s*(?::\s*(.+))?$/);
      if (/^stop: one strum, let it ring$/i.test(value)) {
        out.push('{stop}'); // ukemusic's own (4.34: it used to come back as a heading)
      } else if (/^feel:\s*(straight|light swing|swing|shuffle)\s*$/i.test(value)) {
        out.push(`{${value.replace(/^feel:\s*/i, '').trim().toLowerCase()}}`); // ukemusic's own (4.36)
      } else if (namedStrum && !STRUM_RE.test(strum) && (namedStrum[2] ? STRUM_RE.test(namedStrum[2].split('|')[0]) : strumNames.includes(namedStrum[1]))) {
        out.push(namedStrum[2] ? `{${namedStrum[1]}: ${namedStrum[2].trim()}}` : `{${namedStrum[1]}}`);
        if (namedStrum[2]) strumNames.push(namedStrum[1]);
        report.strums += 1;
      } else if (strum && STRUM_RE.test(strum.split('|')[0])) {
        out.push(`{${strum.trim()}}`);
        report.strums += 1;
      } else if (value) {
        heading(value);
      }
    } else {
      if (!report.ignored.includes(name)) report.ignored.push(name);
      keptOther.push(line.trim());
    }
  }

  // 4.34: a named strum box ({start_of_strum: Verse}) is used again after each heading of that name
  if (boxNames.length) {
    for (let i = out.length - 1; i >= 0; i -= 1) {
      const h = out[i].match(/^\[\[(.+?)\]\]$/);
      if (!h) continue;
      const nameFor = boxNames.find((n) => h[1].toLowerCase().replace(/^repeat\s+/, '').startsWith(n.toLowerCase()));
      if (nameFor && !/^\{/.test(out[i + 1] || '')) out.splice(i + 1, 0, `{${nameFor}}`);
    }
  }
  while (out.length && out[0] === '') out.shift();
  while (out.length && out[out.length - 1] === '') out.pop();
  const collapsed = out.filter((l, i) => !(l === '' && out[i - 1] === ''));
  const kept = chordProFields.formatFields({ fields: keptFields, other: keptOther });
  return { text: `--START MUSIC--\n${collapsed.join('\n')}\n--END MUSIC--\n`, meta, report, kept };
}

function groupLines(nodes) {
  const groups = [];
  let current = [];
  for (const node of nodes) {
    if (node.type === 'linebreak') {
      groups.push(current);
      current = [];
    } else {
      current.push(node);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function sectionKind(label) {
  if (/^(chorus|refrain|hook)/i.test(label)) return 'chorus';
  if (/^(pre[- ]?chorus|verse)/i.test(label)) return 'verse';
  if (/^bridge/i.test(label)) return 'bridge';
  return null;
}

/**
 * ukemusic IR -> ChordPro text.
 *   info: { title, subtitle, key, tempo, time, capo }
 */
function ukemusicToChordPro(irNodes, info = {}) {
  const out = [];
  // The song's own values win; the fields kept from an imported file (its ChordPro tab) fill
  // in the rest (4.27). A saved key with no subtitle of its own says which key it is.
  const linked = { ...info };
  delete linked.defines;
  delete linked.kept;
  delete linked.keyLabel;
  const keptSubtitle = chordProFields.valueOf(chordProFields.parseFields(info.kept || '').fields, 'subtitle');
  if (!linked.subtitle && !keptSubtitle && info.keyLabel) linked.subtitle = info.keyLabel;
  out.push(...chordProFields.headerLines(info.kept || '', linked));
  // The song's own chord shapes
  for (const [chord, frets] of Object.entries(info.defines || {})) out.push(formatDefine(chord, frets));
  out.push('');
  let open = null;
  const close = () => {
    if (open) {
      if (out[out.length - 1] === '') out.pop();
      out.push(`{end_of_${open}}`);
      out.push('');
      open = null;
    }
  };

  let harmony = false; // 4.34: {x_voice: harmony} … {x_voice: lead}
  for (const group of groupLines(irNodes || [])) {
    const lyrics = group.filter((n) => n.type === 'lyric' && n.content.trim());
    if (lyrics.length && lyrics.every((n) => n.harmony) !== harmony) {
      harmony = !harmony;
      out.push(`{x_voice: ${harmony ? 'harmony' : 'lead'}}`);
    }
    if (group.length === 0) {
      if (out[out.length - 1] !== '') out.push('');
      continue;
    }
    if (group.length === 1 && group[0].type === 'structure') {
      close();
      const label = group[0].content.trim();
      const kind = sectionKind(label);
      if (kind) {
        out.push(`{start_of_${kind}: ${label}}`);
        open = kind;
      } else {
        out.push(`{comment: ${label}}`);
      }
      continue;
    }
    if (group.length === 1 && group[0].type === 'tab') {
      out.push('{start_of_tab}', group[0].content, '{end_of_tab}');
      continue;
    }
    const strums = group.filter((n) => n.type === 'rhythm' && !n.inlineStop);
    for (const r of strums) {
      if (r.feelOnly) out.push(`{comment: Feel: ${FEEL_NAMES[r.feel] || r.feel}}`); // 4.36: {swing} came back as a heading
      else if (r.stop) out.push('{comment: Stop: one strum, let it ring}');
      else if (r.recall) out.push(`{comment: Strum ${r.strumName}}`);
      else out.push(`{comment: Strum ${r.strumName ? `${r.strumName}: ` : ''}${r.content.trim()}}`);
    }
    const repeat = group.find((n) => n.type === 'repeat');
    const rest = group.filter((n) => n.type !== 'rhythm' && n.type !== 'repeat');
    if (!rest.length) continue;
    if (rest.some((n) => n.grid)) {
      // a bar line: "| [C] | [G] [C] | % |"
      const bars = [];
      for (const n of rest) {
        if (!n.grid || n.hidden) continue;
        (bars[n.gridBar] = bars[n.gridBar] || []).push(n.mark ? n.mark : `[${n.content}]`);
      }
      const label = rest[0].type === 'structure' ? `[*${rest[0].content}] ` : '';
      out.push(`${label}| ${bars.filter(Boolean).map((b) => b.join(' ')).join(' | ')} |${repeat ? ` (x${repeat.count})` : ''}`);
      continue;
    }
    // inline [[Label]] at the start of a line -> ChordPro annotation [*Label]
    const label = rest[0].type === 'structure' ? `[*${rest[0].content}]` : '';
    const body = rest.map((n) => {
      // 4.34: ukemusic's shorthand as ChordPro annotations ([*text]), which other apps print
      // above the words but don't treat as chords; ukemusic reads them back
      if (n.type === 'chord') {
        if (n.muted) return `[${n.written || 'x'}]`;                       // [x] [mute↓] as written
        if (n.pair) return n.part === 0 ? `[${rest.filter((p) => p.pair && p.line === n.line && p.offset === n.offset).map((p) => p.content).join('.')}]` : '';
        const extra = n.bars > 1 ? `[*×${n.bars}]` : (n.beats ? `[*${n.beats} beat${n.beats > 1 ? 's' : ''}]` : '');
        return `${n.stopped && !n.marks ? '[*stop]' : ''}[${n.content}${n.marks || ''}]${extra}`;
      }
      if (n.type === 'bar') return '[|]';
      if (n.type === 'structure') return '';
      return n.content;
    }).join('');
    const line = label ? `${label} ${body.replace(/^ +/, '')}` : body;
    out.push(repeat ? `${line.replace(/\s+$/, '')} (x${repeat.count})` : line);
  }
  close();
  while (out.length && out[out.length - 1] === '') out.pop();
  return `${out.join('\n')}\n`;
}

module.exports = { looksLikeChordPro, chordProToUkemusic, ukemusicToChordPro };
