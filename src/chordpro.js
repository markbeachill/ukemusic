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

/** Inline [chords]: [|] -> [], a leading [*Label] -> [[Label]] (bold label), drop other [*annotations] and [N.C.] */
function convertInline(line) {
  let dropped = false;
  let prefix = '';
  const lead = line.match(/^\s*\[\*([^\]]+)\]\s*/);
  if (lead && line.slice(lead[0].length).trim()) {
    prefix = `[[${lead[1].trim()}]] `;
    line = line.slice(lead[0].length);
  }
  const out = prefix + line.replace(/\[([^\]]*)\]/g, (whole, inner) => {
    const t = inner.trim();
    if (t === '|' || t === '||') return '[]';
    if (t.startsWith('*') || /^N\.?C\.?$/i.test(t) || t === '') {
      dropped = true;
      return '';
    }
    return whole;
  });
  return dropped ? out.replace(/ {2,}/g, ' ').trimEnd() : out;
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
    if (!d) {
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
      if (k && rest.length) keptFields.push({ name: k.toLowerCase(), value: rest.join(' ') });
    } else if (/^x_/.test(name) && name !== 'x_ukemusic_strum') {
      keptFields.push({ name, value });
    } else if (name === 'define' || name === 'chord') {
      // {define: Am base-fret 1 frets 2 0 0 0}: a chord shape for this song
      const shape = parseDefine(value);
      if (shape) (meta.defines = meta.defines || []).push(shape);
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
    } else if (name === 'end_of_grid') {
      inGrid = false;
      blank();
    } else if (/^end_of_/.test(name)) {
      blank();
    } else if (name === 'comment' || name === 'x_ukemusic_strum') {
      const strum = name === 'x_ukemusic_strum' ? value : (value.match(/^strum(?:ming)?\s*:?\s*(.+)$/i) || [])[1];
      if (strum && STRUM_RE.test(strum)) {
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

  for (const group of groupLines(irNodes || [])) {
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
      if (r.stop) out.push('{comment: Stop: one strum, let it ring}');
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
      if (n.type === 'chord') return `${n.stopped ? '[*stop]' : ''}[${n.content}]${'[|]'.repeat(Math.max(0, (n.bars || 1) - 1))}`;
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
