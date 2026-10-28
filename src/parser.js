const { parseTab } = require('./tab');
const { melodyLine } = require('./melody');
const { scanMarkers } = require('./rich-text');
const { parseChordToken, splitRepeat, parseGridLine, gridNodes, resolveStrums } = require('./song-syntax');
const INFORMAL_LABEL_RE = /^\s*((?:intro|verse|chorus|refrain|pre-?chorus|bridge|middle 8|solo|instrumental|interlude|break|riff|outro|ending|coda|tag)\b[^:[\]\n]{0,40}:)\s*(?=\[|\||$)/i;
const STRUCTURE_RE = /^\s*\[\[(.*?)\]\]\s*$/; // 4.26: spaces around a heading line are ignored
const RHYTHM_RE = /^\{([^}]*)\}$/;
const VOICE_RE = /^\s*\{\s*(harmony|lead)\s*\}\s*$/i; // 4.34: harmony lines (in italics) until {lead}
const PICK_RE = /^\s*\{\s*pick(?:\s+([A-Za-z][\w-]*))?\s*(?::\s*(.*?))?\s*\}\s*$/i; // 4.44: {pick: …}
const TAB_START_RE = /^```tab(?:\s+(\d+)\s*\/\s*(\d+))?\s*$/; // 4.44: ```tab 4/4: timed by its bars
const TAB_END_RE = /^```\s*$/;

function createNode(type, content, line, offset = null, warnings = []) {
  return { type, content, line, offset, warnings };
}

function normalizeInput(input) {
  return String(input || '').replace(/\r\n?/g, '\n');
}

function normalizeOptions(options = {}) {
  const useDelimiters = options.useDelimiters !== false;
  const rhythmEnabled = options.rhythmEnabled !== false;
  const tablatureEnabled = options.tablatureEnabled !== false;
  return { useDelimiters, rhythmEnabled, tablatureEnabled };
}

function getMusicLines(text, options) {
  const lines = text.split('\n');

  if (!options.useDelimiters) {
    return lines.map((content, idx) => ({ content, lineNumber: idx + 1 }));
  }

  const startIndex = lines.indexOf('--START MUSIC--');
  const endIndex = lines.indexOf('--END MUSIC--');

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return lines
      .slice(startIndex + 1, endIndex)
      .map((content, idx) => ({ content, lineNumber: startIndex + idx + 2 }));
  }

  return lines.map((content, idx) => ({ content, lineNumber: idx + 1 }));
}

function parseTabBlock(lines, startIndex, nodes) {
  const startLine = lines[startIndex].lineNumber;
  const contentLines = [];
  const warnings = [];
  let i = startIndex + 1;

  while (i < lines.length && !TAB_END_RE.test(lines[i].content)) {
    contentLines.push(lines[i].content);
    i += 1;
  }

  // Check the tab: string names, line lengths, unknown symbols (see src/tab.js)
  const firstLine = lines[startIndex + 1] ? lines[startIndex + 1].lineNumber : startLine + 1;
  const model = parseTab(contentLines.join('\n'), { firstLine });
  if (contentLines.some((l) => l.trim()) && !model.systems.length) {
    warnings.push(`Line ${startLine}: no tab lines found in this tab block (they start with a string name and |, like A|---0---).`);
  }
  warnings.push(...model.warnings);

  const tabNode = createNode('tab', contentLines.join('\n'), startLine, null, warnings);
  const fence = lines[startIndex].content.match(TAB_START_RE);
  if (fence && fence[1]) tabNode.barBeats = Number(fence[1]);   // ```tab 4/4: timed by its bars
  nodes.push(tabNode);

  if (i >= lines.length) {
    nodes[nodes.length - 1].warnings.push(`Line ${startLine}: tab block was not closed with \`\`\`.`);
    return lines.length - 1;
  }

  return i;
}

function parseLineContent(lineText, lineNumber, nodes, options) {
  if (lineText === '') {
    nodes.push(createNode('linebreak', '', lineNumber, null, []));
    return;
  }

  const structureMatch = lineText.match(STRUCTURE_RE);
  if (structureMatch) {
    nodes.push(createNode('structure', structureMatch[1], lineNumber, null, []));
    nodes.push(createNode('linebreak', '', lineNumber, null, []));
    return;
  }

  // {harmony} … {lead}: the words of the lines in between are a harmony part, shown in italics.
  // The line itself takes no room on the sheet.
  const voice = lineText.match(VOICE_RE);
  if (voice) {
    options.harmony = voice[1].toLowerCase() === 'harmony';
    return;
  }

  // 4.44: {pick: up and back} / {pick: g C E A} / {pick V: …} / {pick V}: the picking pattern
  // from here on (src/picking.js resolvePick). Like {melody}, it takes no room on the sheet.
  const pick = lineText.match(PICK_RE);
  if (pick) {
    nodes.push({ ...createNode('pick', (pick[2] || '').trim(), lineNumber, null, []), pickName: pick[1] || '' });
    return;
  }

  // 4.44: {melody: E E F G | …}: the tune of the next line (src/melody.js). It takes no room on
  // the sheet; playback and the Pick tab use it.
  const tune = melodyLine(lineText);
  if (tune) {
    nodes.push({ ...createNode('melody', tune.text, lineNumber, null, []), format: tune.format });
    return;
  }

  const rhythmMatch = options.rhythmEnabled ? lineText.match(RHYTHM_RE) : null;
  if (rhythmMatch) {
    nodes.push(createNode('rhythm', rhythmMatch[1], lineNumber, null, []));
    nodes.push(createNode('linebreak', '', lineNumber, null, []));
    return;
  }

  // "… (x2)" at the end of a line: play it twice (src/song-syntax.js)
  const repeat = splitRepeat(lineText);
  const pushRepeat = () => {
    if (repeat.count > 1) nodes.push({ ...createNode('repeat', String(repeat.count), lineNumber, null, []), count: repeat.count });
  };
  if (repeat.count > 1 && !STRUCTURE_RE.test(repeat.text.trim())) lineText = repeat.text.replace(/\s+$/, '');
  else repeat.count = 1;

  // A bar line: "| C | F | % | G C |", maybe after a label: "[[Intro]] | C | G |"
  const labelled = lineText.match(/^\[\[(.*?)\]\]([:.;,\-–—]*)\s*(\|.*)$/);
  const informalGrid = !labelled && lineText.match(INFORMAL_LABEL_RE); // "Solo (x2): | C | G |" (4.32)
  const grid = parseGridLine(labelled ? labelled[3] : (informalGrid ? lineText.slice(informalGrid[0].length) : lineText));
  if (grid) {
    if (labelled) nodes.push(createNode('structure', labelled[1] + labelled[2], lineNumber, null, []));
    if (informalGrid) nodes.push(createNode('structure', informalGrid[1].trim(), lineNumber, null, []));
    nodes.push(...gridNodes(grid, lineNumber, createNode));
    pushRepeat();
    nodes.push(createNode('linebreak', '', lineNumber, null, []));
    return;
  }

  let lyricBuffer = '';
  let visibleOffset = 0;
  let index = 0;
  // **bold**, *italic*, __underline__ (src/rich-text.js): the markers aren't part of the words
  const rich = scanMarkers(lineText);
  let style = 0;
  let lyricStyles = [];

  function flushLyric() {
    if (lyricBuffer.length > 0) {
      const node = createNode('lyric', lyricBuffer, lineNumber, null, []);
      if (options.harmony) {
        node.harmony = true;
        lyricStyles = lyricStyles.map((s) => s | 2); // italic (src/rich-text.js)
      }
      if (lyricStyles.some(Boolean)) node.styles = lyricStyles;
      nodes.push(node);
      lyricBuffer = '';
    }
    lyricStyles = [];
  }

  // 4.32: "Bridge (x2): [F] [Em] …" or "Ending last time:" — a part's name written as plain
  // words, followed by chords or nothing — is a label, as if it were [[Bridge (x2):]]
  const informal = lineText.match(INFORMAL_LABEL_RE);
  if (informal) {
    nodes.push(createNode('structure', informal[1].trim(), lineNumber, null, []));
    index = informal[0].length;
  }

  while (index < lineText.length) {
    if (lineText.startsWith('[[', index)) {
      const end = lineText.indexOf(']]', index + 2);
      if (end !== -1) {
        flushLyric();
        let label = lineText.slice(index + 2, end);
        let next = end + 2;
        if (index === 0) {
          // "[[Intro]]: [Am] …" — punctuation straight after the brackets belongs to the label
          const tail = lineText.slice(next).match(/^[:.;,\-–—]+/);
          if (tail) {
            label += tail[0];
            next += tail[0].length;
          }
        }
        nodes.push(createNode('structure', label, lineNumber, null, []));
        index = next;
        continue;
      }
    }

    if (lineText.startsWith('[]', index)) {
      flushLyric();
      nodes.push(createNode('bar', '', lineNumber, visibleOffset, []));
      index += 2;
      continue;
    }

    if (lineText[index] === '[') {
      const end = lineText.indexOf(']', index + 1);
      if (end !== -1) {
        const inner = lineText.slice(index + 1, end);
        const token = parseChordToken(inner);
        if (token && (token.hold || token.repeat)) {
          // [.] keep the chord going: nothing to draw or play. [x2] mid-line: nothing either
          // ([x2] at the end of a line is a repeat, taken off the line above)
          index = end + 1;
          continue;
        }
        if (token && token.bar) {
          flushLyric();
          nodes.push(createNode('bar', '', lineNumber, visibleOffset, []));
          index = end + 1;
          continue;
        }
        if (token) {
          flushLyric();
          const parts = token.pair || [token];
          parts.forEach((part, i) => {
            const chord = createNode('chord', part.name, lineNumber, visibleOffset, []);
            if (part.bars > 1) chord.bars = part.bars; // [C x3]
            if (part.beats) chord.beats = part.beats;  // [C:2]
            if (part.noChord) chord.noChord = true;    // [N.C.]
            if (part.marks) {                          // [C↓] [C↓↓] (4.34): those strums, left to ring
              chord.marks = part.marks;
              chord.strokes = part.strokes;
              chord.stopped = true;
            }
            if (part.muted) {                          // [x] [mute↓] (4.34): muted strums
              chord.muted = part.muted;
              chord.written = part.written;
            }
            if (token.pair) {                          // [Bm7.Am7] (4.34): sharing the bar
              chord.share = 1 / parts.length;
              chord.part = i;
              chord.pair = true;
            }
            nodes.push(chord);
          });
          index = end + 1;
          continue;
        }

        const warning = `Line ${lineNumber}: unrecognised bracket annotation [${inner}].`;
        flushLyric();
        nodes.push(createNode('lyric', `[${inner}]`, lineNumber, null, [warning]));
        visibleOffset += inner.length + 2;
        index = end + 1;
        continue;
      }
    }

    if (options.rhythmEnabled && lineText[index] === '{') {
      const end = lineText.indexOf('}', index + 1);
      if (end !== -1) {
        const inner = lineText.slice(index + 1, end);
        flushLyric();
        nodes.push(createNode('rhythm', inner, lineNumber, visibleOffset, []));
        index = end + 1;
        continue;
      }
    }

    if (rich.markers.has(index)) {
      const marker = rich.markers.get(index);
      style ^= marker.bit;
      index += marker.length;
      continue;
    }
    if (rich.escapes.has(index)) index += 1; // \* is a real *

    const char = lineText[index];
    lyricBuffer += char;
    lyricStyles.push(style);
    visibleOffset += 1;
    index += 1;
  }

  flushLyric();
  pushRepeat();
  nodes.push(createNode('linebreak', '', lineNumber, null, []));
}

function parse(input, options = {}) {
  const text = normalizeInput(input);
  const normalizedOptions = normalizeOptions(options);
  normalizedOptions.harmony = false; // every song starts with the main line
  const lines = getMusicLines(text, normalizedOptions);
  const nodes = [];

  for (let i = 0; i < lines.length; i += 1) {
    const { content, lineNumber } = lines[i];

    if (normalizedOptions.tablatureEnabled && TAB_START_RE.test(content)) {
      i = parseTabBlock(lines, i, nodes);
      nodes.push(createNode('linebreak', '', lineNumber, null, []));
      continue;
    }

    parseLineContent(content, lineNumber, nodes, normalizedOptions);
  }

  return resolveStrums(nodes);
}

module.exports = parse;
module.exports.parse = parse;
