const {
  getBuiltInLibrary,
  getChordDefinition
} = require('./chord-library');
const renderDiagramSvg = require('./diagram-svg');
const { renderStrum, renderStrumLegend, strumTime, timeLabel, strumSteps } = require('./strum-box');
const { chordLabel, feelFor, FEEL_NAMES } = require('./song-syntax');
const { lineCodes, insertCodes, styledHtml, nodeCodes } = require('./rich-text');
const { wrapLines } = require('./line-wrap');
const { wrapTab, isStringLine } = require('./tab');
const {
  createPlaceholderDiagram,
  createTextOnlyDiagram
} = require('./diagram-svg');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function spaces(count) {
  return count > 0 ? '&nbsp;'.repeat(count) : '';
}

function textToHtml(text) {
  return escapeHtml(text).replace(/ /g, '&nbsp;');
}

function groupLineNodes(nodes) {
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

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
}

// Tab: string names and fret numbers get their own classes (frets bold, like chords);
// for print (maxLineChars) long tab is split at bar lines.
function renderTabHtml(content, maxLineChars) {
  const text = maxLineChars ? wrapTab(content, maxLineChars) : content;
  const lines = text.split('\n').map((line) => {
    if (!isStringLine(line, { strict: false })) return escapeHtml(line);
    const m = line.match(/^(\s*[A-Ga-g][#\u266fb\u266d]?\s*[|:])(.*)$/);
    if (!m) return escapeHtml(line);
    const body = escapeHtml(m[2])
      .replace(/-+/g, (d) => `<span class="tab-dash">${d}</span>`)
      .replace(/[0-9]+/g, (d) => `<span class="tab-fret">${d}</span>`);
    return `<span class="tab-string">${escapeHtml(m[1])}</span>${body}`;
  });
  return `<pre class="tab">${lines.join('\n')}</pre>`;
}

// 4.34: the chords left out when "not the common ones" is on (the North Shore Ukulele Circle's list)
const COMMON_CHORDS = 'A A7 Am B7 Bb Bm C C7 D D7 Dm E E7 Em F F7 F#m G G7 Gm Gm7';
const ROOT_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
/** A chord's name for comparing: A# and Bb are the same chord, Cmaj7 and CM7 too */
function chordKey(name) {
  const m = String(name || '').trim().match(/^([A-G][#b]?)(.*)$/);
  if (!m || ROOT_INDEX[m[1]] === undefined) return String(name || '').trim();
  const quality = m[2].replace(/^(M7|ma7|Maj7)$/, 'maj7').replace(/^min/, 'm');
  return `${ROOT_INDEX[m[1]]}${quality}`;
}
function chordSet(text) {
  return new Set(String(text || '').split(/[\s,]+/).filter(Boolean).map(chordKey));
}

function normalizeOptions(options = {}) {
  return {
    layout: options.layout || 'lines',  // 'lines', 'table', 'inline' (chords in the words) or 'chords' (chords only)
    maxLineChars: options.maxLineChars || 0,
    rhythmNotation: options.rhythmNotation || 'raw', // 'raw' or 'arrows' (plain style)
    strumStyle: options.strumStyle || 'plain',       // src/strum-box.js: comic, clean, compact, plain
    beatsPerBar: Number(options.beatsPerBar) || 4,    // the song's time signature
    tempo: Number(options.tempo) || 0,
    swing: options.swing || 'straight',              // Play → Feel: auto, straight, light, swing, shuffle
    showFeel: options.showFeel === true,             // name the feel in the strum box (off: it's for playback)
    diagrams: {
      enable: options.diagrams?.enable !== false,
      placement: options.diagrams?.placement || 'none',
      show_fingers: options.diagrams?.show_fingers !== false,
      left_handed: options.diagrams?.left_handed === true || options.diagrams?.left_handed === 'true',
      fallback: options.diagrams?.fallback || 'placeholder',
      // 4.34: no diagram for the chords everyone knows (Settings → All songs → Chord diagrams)
      skip: options.diagrams?.skip_common === true || options.diagrams?.skip_common === 'true' ? chordSet(options.diagrams?.common_chords ?? COMMON_CHORDS) : null
    },
    chordLibrary: options.chordLibrary || getBuiltInLibrary()
  };
}

const ARROW_MAP = { D: '\u2193', d: '\u2193', U: '\u2191', u: '\u2191', X: '\u2715', x: '\u2715' };

function transformRhythmNotation(text, notation) {
  if (notation !== 'arrows') return text;
  return text.replace(/[DdUuXx]/g, (ch) => ARROW_MAP[ch] || ch);
}

/**
 * Build chord and lyric lines together so that:
 * - Long chord names (Am7, Bbdim) pad the lyric text to stay aligned
 * - Bar markers (|) insert a matching space in the lyric line
 * - At least 1 space separates consecutive chords when they'd otherwise touch
 */
function renderAlignedLines(nodes) {
  const positioned = nodes
    .filter((n) => n.type === 'chord' || n.type === 'bar')
    .sort((a, b) => {
      const ao = typeof a.offset === 'number' ? a.offset : 0;
      const bo = typeof b.offset === 'number' ? b.offset : 0;
      return ao - bo;
    });

  const lyrics = nodes.filter((n) => n.type === 'lyric');
  const lyricText = lyrics.map((n) => n.content).join('');
  let codes = lineCodes(nodes); // bold/italic/underline, one number per letter (src/rich-text.js)

  if (positioned.length === 0) {
    if (lyricText.length === 0) return { chordHtml: '', lyricHtml: '' };
    return {
      chordHtml: '',
      lyricHtml: `<div class="lyrics">${styledHtml(lyricText, codes, textToHtml)}</div>`
    };
  }

  // Pass 1: calculate adjusted offsets.
  // Each chord/bar needs an adjusted position that accounts for:
  //   - previous chord names being wider than the lyric gap
  //   - minimum 1-char gap between consecutive items
  //   - bar markers consuming 1 char of width
  const MIN_GAP = 1;
  let chordCursor = 0;
  const items = [];

  for (const node of positioned) {
    const origOffset = typeof node.offset === 'number' ? node.offset : chordCursor;
    const width = node.type === 'bar' ? 1 : chordLabel(node).length;

    let adjustedOffset = origOffset;

    // Can't overlap previous item
    if (chordCursor > origOffset) {
      adjustedOffset = chordCursor;
    }

    // Minimum gap between items (skip for first item)
    // (also when a chord starts exactly where the previous one ends, e.g. "[C] [F]",
    // which used to print as "CF")
    if (items.length > 0 && adjustedOffset < chordCursor + MIN_GAP) {
      adjustedOffset = chordCursor + MIN_GAP;
    }

    items.push({ origOffset, adjustedOffset, width, node, isBar: node.type === 'bar' });
    chordCursor = adjustedOffset + width;
  }

  // Pass 2: build the padded lyric string.
  // For each item, if its adjustedOffset > where the lyric cursor would be
  // at that point (accounting for all previous inserts), insert spaces.
  // Bar markers ALWAYS insert 1 space in the lyrics to match their | character.
  let paddedLyric = lyricText;

  // Collect all insertions (origOffset in the original lyric string, count of spaces)
  // We'll apply them right-to-left.
  const insertions = [];
  let totalShift = 0;

  for (const item of items) {
    // Extra spaces needed because the item was pushed right
    const shiftExtra = item.adjustedOffset - item.origOffset - totalShift;

    if (item.isBar) {
      // Bar markers always need 1 space in the lyrics, plus any shift
      const barPad = Math.max(shiftExtra, 0) + 1;
      insertions.push({ at: item.origOffset, count: barPad });
      totalShift += barPad;
    } else if (shiftExtra > 0) {
      insertions.push({ at: item.origOffset, count: shiftExtra });
      totalShift += shiftExtra;
    }
  }

  // Apply right to left
  for (let i = insertions.length - 1; i >= 0; i--) {
    const { at, count } = insertions[i];
    const insertAt = Math.min(at, paddedLyric.length);
    paddedLyric =
      paddedLyric.slice(0, insertAt) +
      ' '.repeat(count) +
      paddedLyric.slice(insertAt);
    codes = insertCodes(codes, insertAt, count);
  }

  // Pass 3: build chord HTML using adjusted offsets
  let chordHtml = '';
  let cursor = 0;

  for (const item of items) {
    if (item.adjustedOffset > cursor) {
      chordHtml += spaces(item.adjustedOffset - cursor);
      cursor = item.adjustedOffset;
    }

    if (item.isBar) {
      chordHtml += '<span class="bar">|</span>';
      cursor += 1;
      continue;
    }

    chordHtml += `<span class="chord">${escapeHtml(chordLabel(item.node))}</span>`;
    cursor += chordLabel(item.node).length;
  }

  const chordDiv = `<div class="chords">${chordHtml}</div>`;
  const lyricDiv = paddedLyric.length > 0
    ? `<div class="lyrics">${styledHtml(paddedLyric, codes, textToHtml)}</div>`
    : '';

  return { chordHtml: chordDiv, lyricHtml: lyricDiv };
}

// A {strum pattern}: a strum info box (src/strum-box.js) or plain text. `state.strum` keeps the
// time signature in force, so a {3/4 …} carries on until the next one changes it.
// The feel shown with a pattern (4.18): "light swing", "swing", "shuffle" when it's played
// swung, from the song's own {swing …} or Play → Feel. Only patterns that can swing (pairs of
// eighths or sixteenths, in simple time) say so.
const isCompoundTime = (beats, label) => [6, 9, 12].includes(Number(beats)) && (!label || /\/\s*8\s*$/.test(label));
// 4.21: the feel is for playback only; the sheet doesn't show it (options.showFeel to turn it back on)
function feelLabel(node, options, state, beats, label) {
  if (node.feel) state.feel = node.feel;
  if (!options.showFeel) return '';
  if (node.stop || !node.content) return '';
  const feel = feelFor(node.content, state.feel, options.swing);
  if (!feel || feel === 'straight' || isCompoundTime(beats, label)) return '';
  const steps = strumSteps(String(node.content).split('|')[0]).length;
  const perBeat = steps / (beats || 4);
  return perBeat === 2 || perBeat === 4 ? FEEL_NAMES[feel] : '';
}

function renderStrumNode(node, options, state) {
  if (node.feelOnly) {
    state.feel = node.feel;
    return options.showFeel ? `<div class="rhythm strum-feel">Feel: ${escapeHtml(FEEL_NAMES[node.feel] || node.feel)} from here</div>` : '';
  }
  const st = state.strum || (state.strum = { count: 0, beats: options.beatsPerBar, label: timeLabel(options.beatsPerBar) });
  if (options.strumStyle === 'plain') {
    const t = node.stop ? null : strumTime(node.content);
    if (t) { st.beats = t.beats; st.label = t.label; }
    const fl = feelLabel(node, options, state, st.beats, st.label);
    if (node.strumName || node.stop) {
      return renderStrum(node.content, { style: 'plain', notation: options.rhythmNotation, strumName: node.strumName, recall: node.recall, stop: node.stop, feelLabel: fl });
    }
    return `<div class="rhythm">${textToHtml(transformRhythmNotation(node.content, options.rhythmNotation))}${fl ? ` <span class="sb-feel">(${escapeHtml(fl)})</span>` : ''}</div>`;
  }
  const time = node.stop ? null : strumTime(node.content);
  const timeChanged = Boolean(time && st.count > 0 && time.label !== st.label);
  if (time) {
    st.beats = time.beats;
    st.label = time.label;
  }
  const fl = feelLabel(node, options, state, st.beats, st.label);
  const html = renderStrum(node.content, {
    feelLabel: fl,
    compound: isCompoundTime(st.beats, st.label),
    style: options.strumStyle,
    notation: options.rhythmNotation,
    beats: st.beats,
    timeLabel: st.label,
    tempo: options.tempo,
    first: st.count === 0,
    timeChanged,
    strumName: node.strumName,
    recall: node.recall && !timeChanged, // a named strum in a new time gets its full box again
    stop: node.stop
  });
  if (!node.stop) st.count += 1;
  return html;
}

function renderRhythmLines(nodes, options, state) {
  return nodes
    .filter((node) => node.type === 'rhythm' && !node.inlineStop)
    .map((node) => renderStrumNode(node, options, state))
    .join('');
}

function getGroupChordNames(group) {
  return group
    .filter((node) => node.type === 'chord' && !node.noChord)
    .map((node) => node.content);
}

function renderDiagramForChord(chordName, options) {
  if (options.diagrams.skip && options.diagrams.skip.has(chordKey(chordName))) return '';
  const definition = getChordDefinition(options.chordLibrary, chordName);
  if (definition) {
    return renderDiagramSvg({ ...definition, name: chordName }, {
      left_handed: options.diagrams.left_handed,
      show_fingers: options.diagrams.show_fingers
    });
  }

  switch (options.diagrams.fallback) {
    case 'omit':
      return '';
    case 'text_only':
      return createTextOnlyDiagram(chordName);
    case 'placeholder':
    default:
      return createPlaceholderDiagram(chordName, Number(options.chordLibrary?.meta?.strings) || 4);
  }
}

function renderSongStartDiagrams(groups, options) {
  if (!options.diagrams.enable || options.diagrams.placement !== 'song_start') {
    return '';
  }

  const seen = new Set();
  const chunks = [];
  for (const group of groups) {
    for (const chordName of getGroupChordNames(group)) {
      if (!seen.has(chordName)) {
        seen.add(chordName);
        const diagram = renderDiagramForChord(chordName, options);
        if (diagram) {
          chunks.push(diagram);
        }
      }
    }
  }

  return chunks.length > 0
    ? `<div class="chord-diagrams">${chunks.join('')}</div>`
    : '';
}

/**
 * Table layout: each syllable/word gets its own column.
 * Row 1: rhythm (if present, spans all columns)
 * Row 2: chords (one per cell, aligned to the lyric below)
 * Row 3: lyrics (one word/syllable per cell)
 */
function renderGroupAsTable(group, options, state) {
  if (group.length === 0) {
    return '<div class="lyrics"></div>';
  }

  const firstNode = group[0];

  if (group.length === 1 && firstNode.type === 'structure') {
    return `<h2 class="section">${escapeHtml(firstNode.content)}</h2>`;
  }

  if (group.length === 1 && firstNode.type === 'tab') {
    return renderTabHtml(firstNode.content, options.maxLineChars);
  }

  const parts = [];

  // Diagrams (same as lines mode)
  if (options.diagrams.enable && options.diagrams.placement === 'first_use') {
    const chordNames = getGroupChordNames(group).filter((name, i, l) => l.indexOf(name) === i);
    const diagrams = [];
    for (const chordName of chordNames) {
      if (!state.renderedChords.has(chordName)) {
        state.renderedChords.add(chordName);
        const diagram = renderDiagramForChord(chordName, options);
        if (diagram) diagrams.push(diagram);
      }
    }
    if (diagrams.length > 0) {
      parts.push(`<div class="chord-diagrams">${diagrams.join('')}</div>`);
    }
  }

  // Build columns: each chord position starts a new column.
  // Collect chords/bars with their offsets, and split the lyric text at those positions.
  const positioned = group
    .filter((n) => n.type === 'chord' || n.type === 'bar')
    .sort((a, b) => {
      const ao = typeof a.offset === 'number' ? a.offset : 0;
      const bo = typeof b.offset === 'number' ? b.offset : 0;
      return ao - bo;
    });

  const lyricText = group.filter((n) => n.type === 'lyric').map((n) => n.content).join('');
  const codes = lineCodes(group);
  const rhythmNodes = group.filter((n) => n.type === 'rhythm' && !n.inlineStop);

  if (positioned.length === 0 && lyricText.length === 0) {
    // A strum pattern on a line of its own (it used to vanish in table layout)
    if (rhythmNodes.length > 0) {
      return `${parts.join('')}${rhythmNodes.map((n) => renderStrumNode(n, options, state)).join('')}`;
    }
    return '<div class="lyrics"></div>';
  }

  // Split lyrics at chord offsets to create columns
  const columns = [];
  let lastOffset = 0;

  for (const node of positioned) {
    const offset = typeof node.offset === 'number' ? node.offset : lastOffset;
    const lyricSlice = lyricText.slice(lastOffset, offset);
    const codeSlice = codes.slice(lastOffset, offset);
    if (lyricSlice.length > 0 && columns.length > 0) {
      // Append trailing text to previous column's lyric
      columns[columns.length - 1].lyric += lyricSlice;
      columns[columns.length - 1].codes.push(...codeSlice);
    } else if (lyricSlice.length > 0) {
      columns.push({ chord: '', bar: false, lyric: lyricSlice, codes: codeSlice });
    }

    const chordName = node.type === 'bar' ? '' : chordLabel(node);
    columns.push({ chord: chordName, bar: node.type === 'bar', lyric: '', codes: [] });
    lastOffset = offset;
  }

  // Remaining lyric text after the last chord
  const remaining = lyricText.slice(lastOffset);
  if (remaining.length > 0) {
    if (columns.length > 0) {
      columns[columns.length - 1].lyric = remaining;
      columns[columns.length - 1].codes = codes.slice(lastOffset);
    } else {
      columns.push({ chord: '', bar: false, lyric: remaining, codes: codes.slice(lastOffset) });
    }
  }

  // Build table HTML
  const colCount = columns.length || 1;

  let tableHtml = '<table class="chord-table"><tbody>';

  // Rhythm row (optional)
  if (rhythmNodes.length > 0) {
    const rhythmHtml = rhythmNodes.map((n) => renderStrumNode(n, options, state)).join('');
    tableHtml += options.strumStyle === 'plain'
      ? `<tr class="rhythm-row"><td colspan="${colCount}" class="rhythm">${escapeHtml(rhythmNodes.map((n) => transformRhythmNotation(n.content, options.rhythmNotation)).join(' '))}</td></tr>`
      : `<tr class="rhythm-row"><td colspan="${colCount}">${rhythmHtml}</td></tr>`;
  }

  // Chord row
  tableHtml += '<tr class="chord-row">';
  for (const col of columns) {
    if (col.bar) {
      tableHtml += '<td class="bar">|</td>';
    } else if (col.chord) {
      tableHtml += `<td class="chord">${escapeHtml(col.chord)}</td>`;
    } else {
      tableHtml += '<td></td>';
    }
  }
  tableHtml += '</tr>';

  // Lyric row
  tableHtml += '<tr class="lyric-row">';
  for (const col of columns) {
    tableHtml += `<td class="lyric">${styledHtml(col.lyric, col.codes, textToHtml)}</td>`;
  }
  tableHtml += '</tr>';

  tableHtml += '</tbody></table>';
  parts.push(tableHtml);

  return parts.join('');
}

// A bar line ("| C | F | % | G C |"): one evenly spaced box per bar, in every layout.
function renderGridLine(group) {
  const bars = [];
  for (const node of group) {
    if (!node.grid || node.hidden) continue;
    if (!bars[node.gridBar]) bars[node.gridBar] = [];
    bars[node.gridBar].push(node.mark || chordLabel(node));
  }
  const cells = bars.filter(Boolean).map((labels) => labels);
  const width = Math.max(3, ...cells.map((labels) => labels.join(' ').length));
  let html = '';
  for (const labels of cells) {
    const text = labels.join(' ');
    html += `<span class="bar">|</span>${spaces(1)}${labels.map((l) => (l === '%' ? '<span class="bar-repeat">%</span>' : `<span class="chord">${escapeHtml(l)}</span>`)).join(spaces(1))}${spaces(width - text.length + 1)}`;
  }
  html += '<span class="bar">|</span>';
  return `<div class="chords"><span class="chord-grid">${html}</span></div>`;
}

function diagramsForGroup(group, options, state) {
  if (!options.diagrams.enable || options.diagrams.placement !== 'first_use') return '';
  const diagrams = [];
  for (const chordName of getGroupChordNames(group).filter((name, i, l) => l.indexOf(name) === i)) {
    if (!state.renderedChords.has(chordName)) {
      state.renderedChords.add(chordName);
      const diagram = renderDiagramForChord(chordName, options);
      if (diagram) diagrams.push(diagram);
    }
  }
  return diagrams.length ? `<div class="chord-diagrams">${diagrams.join('')}</div>` : '';
}

// Inline layout: chords stay in the words, "I [C]come from Alabama", in the ordinary font.
// Compact, good on a phone, and how most websites show songs.
function renderGroupInline(group, options, state) {
  const parts = [diagramsForGroup(group, options, state), renderRhythmLines(group, options, state)];
  let line = '';
  for (const node of group) {
    if (node.type === 'lyric') line += styledHtml(node.content, nodeCodes(node), escapeHtml);
    else if (node.type === 'chord') line += `<span class="ichord"><span class="ib">[</span>${escapeHtml(chordLabel(node))}<span class="ib">]</span></span>`;
    else if (node.type === 'bar') line += '<span class="bar">|</span>';
  }
  if (line.trim()) parts.push(`<div class="inline-line">${line}</div>`);
  else if (!parts.join('')) parts.push('<div class="lyrics"></div>');
  return parts.join('');
}

// Chords only: each line's chords (and bars) without the words, for whoever is playing along.
function renderGroupChordsOnly(group, options, state) {
  const parts = [diagramsForGroup(group, options, state), renderRhythmLines(group, options, state)];
  const items = group.filter((n) => n.type === 'chord' || n.type === 'bar')
    .map((n) => (n.type === 'bar' ? '<span class="bar">|</span>' : `<span class="chord">${escapeHtml(chordLabel(n))}</span>`));
  if (items.length) parts.push(`<div class="chords chords-only">${items.join(spaces(2))}</div>`);
  const hasWords = group.some((n) => n.type === 'lyric' && n.content.trim());
  if (!items.length && !hasWords && !parts.join('')) parts.push('<div class="lyrics"></div>');
  return parts.join('');
}

function renderGroup(group, options, state) {
  if (group.some((n) => n.grid)) {
    return `${diagramsForGroup(group, options, state)}${renderGridLine(group)}`;
  }
  const special = group.length === 1 && (group[0].type === 'structure' || group[0].type === 'tab');
  if (!special && options.layout === 'inline') return renderGroupInline(group, options, state);
  if (!special && options.layout === 'chords') return renderGroupChordsOnly(group, options, state);
  if (options.layout === 'table') {
    return renderGroupAsTable(group, options, state);
  }

  if (group.length === 0) {
    return '<div class="lyrics"></div>';
  }

  const firstNode = group[0];

  if (group.length === 1 && firstNode.type === 'structure') {
    return `<h2 class="section">${escapeHtml(firstNode.content)}</h2>`;
  }

  if (group.length === 1 && firstNode.type === 'tab') {
    return renderTabHtml(firstNode.content, options.maxLineChars);
  }

  const parts = [];

  if (options.diagrams.enable && options.diagrams.placement === 'first_use') {
    const chordNames = getGroupChordNames(group).filter((name, index, list) => list.indexOf(name) === index);
    const diagrams = [];
    for (const chordName of chordNames) {
      if (!state.renderedChords.has(chordName)) {
        state.renderedChords.add(chordName);
        const diagram = renderDiagramForChord(chordName, options);
        if (diagram) {
          diagrams.push(diagram);
        }
      }
    }
    if (diagrams.length > 0) {
      parts.push(`<div class="chord-diagrams">${diagrams.join('')}</div>`);
    }
  }

  const rhythmHtml = renderRhythmLines(group, options, state);
  const { chordHtml, lyricHtml } = renderAlignedLines(group);

  if (rhythmHtml) {
    parts.push(rhythmHtml);
  }
  if (chordHtml) {
    parts.push(chordHtml);
  }
  if (lyricHtml) {
    parts.push(lyricHtml);
  }

  return parts.join('');
}

// A line starting with [[Label]] and continuing with chords/lyrics: the label is printed in bold
// at the start of the line (it is not a section heading — those are [[Label]] on a line of their own).
function splitInlineLabel(group) {
  if (group.length > 1 && group[0].type === 'structure') {
    const body = group.slice(1);
    const hasContent = body.some((n) => n.type !== 'lyric' || n.content.trim());
    if (hasContent) return { label: group[0].content, body };
    return { label: null, body: [group[0]] }; // "[[Verse]] " with trailing spaces: still a heading
  }
  return { label: null, body: group };
}

function addInlineLabel(html, label, body, layout) {
  const strong = `<strong class="inline-label" style="font-weight:700;color:var(--text-color)">${escapeHtml(label)}</strong>`;
  if (body.some((n) => n.grid)) {
    return html.replace('<div class="chords">', `<div class="chords">${strong}${spaces(1)}`);
  }
  if (layout === 'inline' && html.includes('<div class="inline-line">')) {
    return html.replace('<div class="inline-line">', `<div class="inline-line">${strong} `);
  }
  if (layout === 'chords' && html.includes('<div class="chords chords-only">')) {
    return html.replace('<div class="chords chords-only">', `<div class="chords chords-only">${strong}${spaces(1)}`);
  }
  if (layout === 'inline' || layout === 'chords') return `<div class="lyrics">${strong}</div>${html}`;
  const hasLyrics = body.some((n) => n.type === 'lyric' && n.content.trim());
  if (layout === 'table') {
    if (hasLyrics) {
      return html.replace('<tr class="chord-row">', '<tr class="chord-row"><td></td>')
        .replace('<tr class="lyric-row">', `<tr class="lyric-row"><td class="lyric">${strong}</td>`);
    }
    return html.replace('<tr class="chord-row">', `<tr class="chord-row"><td>${strong}</td>`)
      .replace('<tr class="lyric-row">', '<tr class="lyric-row"><td></td>');
  }
  // Monospace lines: the label takes the same width in both rows, so chords stay aligned
  const pad = spaces(label.length);
  if (hasLyrics) {
    return html.replace('<div class="lyrics">', `<div class="lyrics">${strong}`)
      .replace('<div class="chords">', `<div class="chords">${pad}`);
  }
  if (html.includes('<div class="chords">')) {
    return html.replace('<div class="chords">', `<div class="chords">${strong}`)
      .replace('<div class="lyrics">', `<div class="lyrics">${pad}`);
  }
  return `<div class="lyrics">${strong}</div>${html}`;
}

// "(x2)" at the end of a line: "×2" after the line's last row
function addRepeatMark(html, count) {
  const mark = `<span class="repeat-mark">×${count}</span>`;
  if (html.endsWith('</tbody></table>')) {
    const rows = html.lastIndexOf('</tr>');
    return `${html.slice(0, rows)}<td class="repeat-mark">×${count}</td>${html.slice(rows)}`;
  }
  const end = html.lastIndexOf('</div>');
  if (end === -1) return `${html}<div class="lyrics">${mark}</div>`;
  return `${html.slice(0, end)}${spaces(2)}${mark}${html.slice(end)}`;
}

/** CSS for the bar lines, repeat marks and the inline / chords-only layouts (added with strumCss) */
function sheetCss() {
  return `
  .chord-grid .bar { color: var(--text-color, #333); font-weight: 400; }
  .chord-grid .bar-repeat { color: var(--text-color, #333); font-weight: 700; }
  .repeat-mark { font-family: var(--font-family, system-ui, sans-serif); font-weight: 800; color: var(--text-color, #333); border: 1.5px solid currentColor; border-radius: 0.3em; padding: 0 0.35em; margin-left: 0.4em; white-space: nowrap; }
  td.repeat-mark { border: none; vertical-align: bottom; }
  .inline-line { font-family: var(--font-family, system-ui, sans-serif); font-size: calc(var(--monospace-size, 14px) * 1.1); line-height: 1.6; color: var(--text-color, #333); white-space: pre-wrap; overflow-wrap: anywhere; min-height: 1em; }
  .inline-line .ichord { color: var(--chord-color, #b22222); font-weight: 800; white-space: nowrap; }
  .inline-line .ichord .ib { font-weight: 400; opacity: 0.7; }
  .inline-line .bar { margin: 0 0.3em; }
  .chords-only { white-space: pre-wrap; }
  @media print { .inline-line .ichord { color: #000; } }`;
}

function renderHtml(irNodes, options = {}) {
  if (!Array.isArray(irNodes)) {
    throw new TypeError('renderHtml expects an array of IR nodes.');
  }

  const normalizedOptions = normalizeOptions(options);
  // Printing: split lines too long for the page (options.maxLineChars, in characters)
  const groups = groupLineNodes(options.maxLineChars ? wrapLines(irNodes, options.maxLineChars) : irNodes);
  const state = { renderedChords: new Set() };
  const output = [];
  const songStartDiagrams = renderSongStartDiagrams(groups, normalizedOptions);

  if (songStartDiagrams) {
    output.push(songStartDiagrams);
  }
  // Two or more named strums ({A: …}, {B: …}): a key to them at the top
  const named = [];
  for (const node of irNodes) {
    if (node.type === 'rhythm' && node.strumName && !node.recall && !named.some((n) => n.name.toLowerCase() === node.strumName.toLowerCase())) {
      named.push({ name: node.strumName, pattern: node.content });
    }
  }
  if (named.length >= 2) output.push(renderStrumLegend(named, { style: normalizedOptions.strumStyle }));

  // Each [[Section]] starts a <section class="song-section"> (kept together when printing);
  // every other line is wrapped in <div class="line-group" data-line="N"> (N = source line,
  // used to highlight the line being played).
  // A section whose heading is all there is ("[[Chorus]]" on its own, or "[[Chorus]] x2") is a
  // cue: it's marked section-cue so its heading stays when section names are hidden (4.17).
  let sectionOpen = false;
  let sectionAt = -1;
  let sectionHasLines = false;
  let sectionRepeats = false;
  const closeSection = () => {
    if (!sectionOpen) return;
    if (!sectionHasLines || sectionRepeats) output[sectionAt] = '<section class="song-section section-cue">';
    output.push('</section>');
  };
  for (const group of groups) {
    // [[Label]] followed by anything on the same line: bold label at the start of that line
    const { label, body } = splitInlineLabel(group);
    let html = renderGroup(body, normalizedOptions, state);
    if (label !== null) html = addInlineLabel(html, label, body, normalizedOptions.layout);
    const repeat = body.find((n) => n.type === 'repeat');
    if (repeat) html = addRepeatMark(html, repeat.count);
    const isHeading = label === null && group.length === 1 && group[0].type === 'structure';
    if (isHeading) {
      closeSection();
      sectionAt = output.length;
      output.push('<section class="song-section">');
      sectionOpen = true;
      sectionHasLines = false;
      sectionRepeats = Boolean(repeat);
      output.push(html);
      continue;
    }
    if (html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()) sectionHasLines = true;
    const line = group.find((node) => typeof node.line === 'number')?.line;
    output.push(`<div class="line-group"${line ? ` data-line="${line}"` : ''}>${html}</div>`);
  }
  closeSection();

  return output.join('\n');
}

module.exports = renderHtml;
module.exports.renderHtml = renderHtml;
module.exports.sheetCss = sheetCss;
// 4.34/4.35: is this chord in the list of common chords (A# is Bb)? For the Session screen
module.exports.isCommonChord = (name, list) => chordSet(list ?? COMMON_CHORDS).has(chordKey(name));
module.exports.COMMON_CHORDS = COMMON_CHORDS;
