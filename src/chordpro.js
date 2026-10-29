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
  let tabTimeNext = '';   // 4.44: {x_ukemusic_tab_time: 4/4} before {start_of_tab}
  let inTab = false;
  let inGrid = false;
  let inAbc = null;              // 4.44: inside {start_of_abc} … {end_of_abc}: { label, lines }
  const abcBlocks = [];          // ABC tunes found, matched to the lines after them at the end
  const hasOwnTune = lines.some((l) => /^\s*\{\s*x_ukemusic_melody/.test(l));
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
    if (inAbc) {
      const d = parseDirective(line);
      if (d && d.name === 'end_of_abc') {
        const text = inAbc.lines.join('\n');
        // ukemusic's own (made from the {melody} lines, which come in instead) is left out
        if (!hasOwnTune && !/%\s*made by ukemusic/.test(text)) {
          out.push(`\u0000ABC${abcBlocks.length}`);
          abcBlocks.push({ text, label: inAbc.label });
        }
        inAbc = null;
      } else inAbc.lines.push(line);
      continue;
    }
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
    if (/^\s*#\s*ukemusic:/.test(line)) continue;   // 4.44: ukemusic's own note on its directives (written again on export)
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
    // 4.49: a {key} once the song has started is a key change: kept where it is
    if (name === 'key' && value && meta.key && out.some((l) => /\S/.test(l))) {
      out.push(`{key: ${value}}`);
      continue;
    }
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
    } else if (name === 'x_ukemusic_pick') {
      // 4.44: {x_ukemusic_pick: up and back} / {x_ukemusic_pick: V: g C E A} / {x_ukemusic_pick: V:}
      const named = value.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
      out.push(named ? `{pick ${named[1]}${named[2] ? `: ${named[2]}` : ''}}` : `{pick: ${value}}`);
    } else if (name === 'x_ukemusic_melody' || name === 'x_ukemusic_melody_abc') {
      out.push(`{melody${name.endsWith('_abc') ? ' abc' : ''}: ${value}}`);
    } else if (/^x_/.test(name) && name !== 'x_ukemusic_strum' && name !== 'x_ukemusic_tab_time') {
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
    } else if (name === 'start_of_abc') {
      inAbc = { label: value, lines: [] };
    } else if (name === 'x_ukemusic_tab_time') {
      tabTimeNext = /^\d+\s*\/\s*\d+$/.test(value) ? value.replace(/\s+/g, '') : '';
    } else if (name === 'start_of_tab') {
      if (value) heading(value);
      else blank();
      out.push(tabTimeNext ? `\`\`\`tab ${tabTimeNext}` : '```tab');
      tabTimeNext = '';
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
  // 4.44: ABC tunes -> {melody} lines, where their bars match the lines after them
  if (abcBlocks.length) matchAbcTunes(out, abcBlocks, { capo: Number(String(meta.capo || '').match(/\d+/)?.[0]) || 0, report, kept: keptOther });
  while (out.length && out[0] === '') out.shift();
  while (out.length && out[out.length - 1] === '') out.pop();
  const collapsed = out.filter((l, i) => !(l === '' && out[i - 1] === ''));
  const kept = chordProFields.formatFields({ fields: keptFields, other: keptOther });
  return { text: `--START MUSIC--\n${collapsed.join('\n')}\n--END MUSIC--\n`, meta, report, kept };
}

/**
 * 4.44: each ABC tune in an imported song (a placeholder line in `out`) is shared out over the
 * lines of chords after it, bar for bar: a line of 4 bars takes the tune's next 4 bars (the
 * tune's pickup goes with the first). When the bars come out even it becomes {melody} lines
 * above them (a later verse with the same chords is then sung to it); when they don't, the ABC is
 * kept on the song's ChordPro tab, to place by hand, and the report says so.
 */
function matchAbcTunes(out, blocks, { capo = 0, report, kept }) {
  const melody = require('./melody');
  const { parse } = require('./parser');
  const { buildSchedule } = require('./playback-schedule');
  report.tunes = report.tunes || { matched: 0, kept: 0, notes: [] };
  for (let k = 0; k < blocks.length; k += 1) {
    const at = out.indexOf(`\u0000ABC${k}`);
    if (at < 0) continue;
    const tune = melody.parseAbcTune(blocks[k].text);
    const flats = melody.keySignature(tune.key).flats;
    const bars = tune.pickup ? tune.bars.slice(1) : tune.bars;
    const want = bars.length;
    // the lines of chords after it, and how many bars each takes
    const targets = [];
    let got = 0;
    for (let i = at + 1; i < out.length && got < want; i += 1) {
      const line = out[i];
      if (/^\u0000ABC/.test(line)) break;
      if (!/\[[A-G][^\]]*\]/.test(line) || /^\s*\{/.test(line) || /^\s*```/.test(line)) continue;
      let n = 0;
      try {
        const s = buildSchedule(parse(`--START MUSIC--\n${line}\n--END MUSIC--\n`), { beatsPerBar: tune.perBar, countIn: false });
        n = s.bars.reduce((a, b) => a + (b.share || 1), 0);
      } catch (_e) { n = 0; }
      if (!n || Math.abs(n - Math.round(n)) > 0.01) { got = -1; break; }
      targets.push({ index: i, bars: Math.round(n) });
      got += Math.round(n);
    }
    const label = blocks[k].label ? ` (${blocks[k].label})` : '';
    if (got === want && targets.length) {
      // the {melody} lines, each line's bars with the pickup on the first
      let b = 0;
      let prev = 65;
      const inserts = targets.map((t, ti) => {
        const notes = [];
        if (ti === 0 && tune.pickup) notes.push(...tune.bars[0]);
        for (let j = 0; j < t.bars; j += 1) notes.push(...bars[b + j]);
        b += t.bars;
        const moved = notes.map((n) => ({ len: n.len, midi: n.midi === null ? null : n.midi - capo }));
        const r = melody.notesToMelodyText(moved, { perBar: tune.perBar, start: ti === 0 ? -tune.pickup : 0, prev, flats });
        prev = r.prev;
        return { index: t.index, line: `{melody: ${r.text}}` };
      });
      for (const ins of inserts.reverse()) out.splice(ins.index, 0, ins.line);
      out.splice(at, 1);
      report.tunes.matched += 1;
      report.tunes.notes.push(`A tune${label} became {melody} lines over ${targets.length} line${targets.length === 1 ? '' : 's'} (${want} bars).`);
    } else {
      out.splice(at, 1);
      kept.push('{start_of_abc}', ...blocks[k].text.split('\n'), '{end_of_abc}');
      report.tunes.kept += 1;
      report.tunes.notes.push(`A tune${label} has ${want} bars, which didn't match the lines after it, so it's kept on the song's ChordPro tab (Song → ChordPro), to write into the song by hand as {melody} lines.`);
    }
  }
}

/** 4 -> "4/4"; 6 -> "6/8" (a bar of 6 eighths) */
function tabTime(beats) {
  return [6, 9, 12].includes(Number(beats)) ? `${beats}/8` : `${beats}/4`;
}

/**
 * 4.44: # comment lines (ChordPro never shows them) saying what ukemusic's own directives in
 * this song mean, for anyone reading the file or another app. Each starts "# ukemusic:", so
 * ukemusic leaves them out when it reads the file back.
 */
function ownDirectivesNote(nodes, { abc = false } = {}) {
  const uses = {
    pick: nodes.some((n) => n.type === 'pick'),
    melody: nodes.some((n) => n.type === 'melody' && n.format !== 'abc'),
    abc: nodes.some((n) => n.type === 'melody' && n.format === 'abc'),
    tab: nodes.some((n) => n.type === 'tab' && n.barBeats),
    voice: nodes.some((n) => n.type === 'lyric' && n.harmony)
  };
  if (!Object.values(uses).some(Boolean)) return [];
  const lines = ['# ukemusic: this song uses ukemusic\'s own directives (ChordPro custom directives, x_…).',
    '# ukemusic: Other ChordPro apps ignore them; ukemusic reads them back. What they mean:'];
  if (uses.pick) {
    lines.push('# ukemusic:   {x_ukemusic_pick: up and back}   pick, don\'t strum, from here on: a pattern by name,');
    lines.push('# ukemusic:       or by string (g C E A E C; g+A together, - a rest) or by finger (p i m a);');
    lines.push('# ukemusic:       "V: …" names a pattern, "V:" uses it again, "strum" goes back to strumming');
  }
  if (uses.melody) {
    lines.push('# ukemusic:   {x_ukemusic_melody: E E F G | …}   the tune of the next line, by note name in the');
    lines.push('# ukemusic:       written key: a note is a beat, E2 two, E/2 half, E. one and a half, r a rest;');
    lines.push('# ukemusic:       each note is the nearest to the one before (\' an octave up, , down)');
  }
  if (uses.abc) lines.push('# ukemusic:   {x_ukemusic_melody_abc: …}   the tune of the next line, in ABC notation');
  if (abc && (uses.melody || uses.abc)) lines.push('# ukemusic:   {start_of_abc} blocks show the same tune as notation, for apps that draw ABC; ukemusic reads the lines above instead');
  if (uses.tab) lines.push('# ukemusic:   {x_ukemusic_tab_time: 4/4}   the next tab is timed by its bars: each |…| is a whole bar');
  if (uses.voice) lines.push('# ukemusic:   {x_voice: harmony} … {x_voice: lead}   the words between are a harmony part');
  lines.push('# ukemusic: More: WRITING.md in ukemusic, or https://github.com/markbeachill/ukemusic');
  return lines;
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
  // 4.44: a note (ChordPro # comment lines: never shown) on the ukemusic directives this song uses
  out.push(...ownDirectivesNote(irNodes || [], { abc: Boolean(info.abc) }));
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
  // 4.44: the tune as notation (info.abc): one ABC block per section with a tune of its own (a
  // verse sung to verse 1's tune doesn't repeat it), after the section's start
  const melody = require('./melody');
  const time = String(info.time || '4/4').match(/(\d+)\s*\/\s*(\d+)/);
  const beats = time ? Number(time[1]) : 4;
  const compound = time ? Number(time[2]) === 8 && [6, 9, 12].includes(beats) : false;
  const allGroups = groupLines(irNodes || []);
  const abcFor = new Map();   // group index (-1: before any heading) -> ABC text
  if (info.abc && melody.hasMelody(irNodes || [])) {
    const tunes = melody.songMelody(irNodes || [], { beats, compound });
    let section = -1;
    let label = info.title || '';
    const bySection = new Map();
    allGroups.forEach((g, gi) => {
      if (g.length === 1 && g[0].type === 'structure') { section = gi; label = g[0].content.trim(); return; }
      const line = (g.find((n) => n.type === 'chord' || n.type === 'lyric') || {}).line;
      const t = line !== undefined ? tunes.get(line) : null;
      if (!t) return;
      if (!bySection.has(section)) bySection.set(section, { label, lines: [] });
      bySection.get(section).lines.push(t);
    });
    for (const [gi, sec] of bySection) {
      if (sec.lines.every((t) => t.borrowed)) continue;
      abcFor.set(gi, melody.tuneToAbc(sec.lines, { title: sec.label, key: info.key || 'C', beats, compound, shift: Number(info.tuneSound) || 0 }));
    }
    if (abcFor.has(-1)) out.push('{start_of_abc}', abcFor.get(-1), '{end_of_abc}', '');
  }
  const nameNote = (shift) => (n) => require('./versions').transposeName(n, shift, null);
  let groupIndex = -1;
  for (let group of allGroups) {
    groupIndex += 1;
    // 4.44: {pick} and {melody} lines are ukemusic's own: ChordPro's custom directives (x_), which
    // other ChordPro apps ignore and ukemusic reads back
    const own = group.filter((n) => n.type === 'pick' || n.type === 'melody' || n.type === 'keychange');
    if (own.length) {
      for (const n of own) {
        if (n.type === 'keychange') out.push(`{key: ${n.content}}`);   // 4.49: ChordPro's own, mid-song
        else if (n.type === 'pick') out.push(`{x_ukemusic_pick: ${n.pickName ? `${n.pickName}: ` : ''}${n.content}}`.replace(/: \}$/, ':}'));
        else {
          // in the key the chords are written in for this export
          const shift = Number(info.tuneShift) || 0;
          const line = `{melody${n.format === 'abc' ? ' abc' : ''}: ${n.content}}`;
          const moved = shift ? melody.transposeMelodyLine(line, shift, nameNote(shift)) : line;
          out.push(`{x_ukemusic_melody${n.format === 'abc' ? '_abc' : ''}: ${moved.slice(moved.indexOf(':') + 1).replace(/\}\s*$/, '').trim()}}`);
        }
      }
      group = group.filter((n) => n.type !== 'pick' && n.type !== 'melody' && n.type !== 'keychange');
      if (!group.length) continue;
    }
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
      if (abcFor.has(groupIndex)) out.push('{start_of_abc}', abcFor.get(groupIndex), '{end_of_abc}');
      continue;
    }
    if (group.length === 1 && group[0].type === 'tab') {
      // 4.44: ```tab 4/4 (timed by its bars) keeps its time in a custom directive
      if (group[0].barBeats) out.push(`{x_ukemusic_tab_time: ${tabTime(group[0].barBeats)}}`);
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
