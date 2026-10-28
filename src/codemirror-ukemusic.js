const { CHORD_INNER_PATTERN } = require('./chord-names');
const { parseGridLine, REPEAT_RE } = require('./song-syntax');
const { scanMarkers } = require('./rich-text');
function loadCodeMirror() {
  try {
    const { EditorState, RangeSetBuilder, Compartment } = require('@codemirror/state');
    const { EditorView, Decoration, keymap, drawSelection, highlightActiveLine, ViewPlugin } = require('@codemirror/view');
    const { history, historyKeymap, defaultKeymap, undo, redo } = require('@codemirror/commands');
    return {
      EditorState,
      RangeSetBuilder,
      Compartment,
      EditorView,
      Decoration,
      ViewPlugin,
      keymap,
      drawSelection,
      highlightActiveLine,
      history,
      historyKeymap,
      defaultKeymap,
      undo,
      redo
    };
  } catch (_error) {
    return null;
  }
}

const TOKENS = {
  structure: 'cm-structure',
  chord: 'cm-chord',
  bar: 'cm-bar',
  rhythm: 'cm-rhythm',
  tab: 'cm-tabblock',
  delimiter: 'cm-delimiter'
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Marks for bold/italic/underline in one line (src/rich-text.js), outside [chords] and {strums} */
function richMarks(text, lineStart) {
  const { markers, escapes } = scanMarkers(text);
  if (!markers.size && !escapes.size) return [];
  const marks = [];
  let style = 0;
  let run = null; // { start, style }
  const endRun = (at) => {
    if (run && at > run.start && run.style) {
      const cls = [run.style & 1 ? 'cm-rich-b' : '', run.style & 2 ? 'cm-rich-i' : '', run.style & 4 ? 'cm-rich-u' : ''].filter(Boolean).join(' ');
      marks.push({ start: lineStart + run.start, end: lineStart + at, className: cls });
    }
    run = null;
  };
  for (let i = 0; i < text.length;) {
    const ch = text[i];
    if (ch === '[' || ch === '{') {
      const label = text.startsWith('[[', i);
      const close = text.indexOf(label ? ']]' : (ch === '[' ? ']' : '}'), i + 1);
      if (close !== -1) {
        endRun(i);
        i = close + (label ? 2 : 1);
        continue;
      }
    }
    if (markers.has(i)) {
      endRun(i);
      const m = markers.get(i);
      marks.push({ start: lineStart + i, end: lineStart + i + m.length, className: 'cm-rich-marker' });
      style ^= m.bit;
      i += m.length;
      continue;
    }
    const step = escapes.has(i) ? 2 : 1;
    if (!run || run.style !== style) {
      endRun(i);
      run = { start: i, style };
    }
    i += step;
  }
  endRun(text.length);
  return marks;
}

/** Bold/italic/underline: wrap the selection in the marker, or take it off if it's there */
function toggleMarker(view, marker) {
  const { state } = view;
  const sel = state.selection.main;
  const m = marker.length;
  const before = state.sliceDoc(Math.max(0, sel.from - m), sel.from);
  const after = state.sliceDoc(sel.to, Math.min(state.doc.length, sel.to + m));
  const inside = state.sliceDoc(sel.from, sel.to);
  // "*" must not match the inside of "**"
  const exact = (text, at) => text === marker && state.sliceDoc(at - 1, at) !== marker[0] && state.sliceDoc(at + m, at + m + 1) !== marker[0];
  if (!sel.empty && before === marker && after === marker && (m === 2 || (exact(before, sel.from - m) && exact(after, sel.to)))) {
    view.dispatch({ changes: [{ from: sel.from - m, to: sel.from, insert: '' }, { from: sel.to, to: sel.to + m, insert: '' }], selection: { anchor: sel.from - m, head: sel.to - m }, userEvent: 'input' });
  } else if (inside.length > 2 * m && inside.startsWith(marker) && inside.endsWith(marker)) {
    view.dispatch({ changes: { from: sel.from, to: sel.to, insert: inside.slice(m, -m) }, selection: { anchor: sel.from, head: sel.to - 2 * m }, userEvent: 'input' });
  } else {
    view.dispatch({ changes: [{ from: sel.from, insert: marker }, { from: sel.to, insert: marker }], selection: sel.empty ? { anchor: sel.from + m } : { anchor: sel.from + m, head: sel.to + m }, userEvent: 'input' });
  }
  view.focus();
  return true;
}
const STYLE_MARKERS = { bold: '**', italic: '*', underline: '__' };

function createHighlighter(codemirror) {
  const { Decoration, ViewPlugin, RangeSetBuilder } = codemirror;

  function buildDecorations(view) {
    const builder = new RangeSetBuilder();
    let inTabBlock = false;

    for (const { from, to } of view.visibleRanges) {
      let position = from;
      while (position <= to) {
        const line = view.state.doc.lineAt(position);
        const text = line.text;
        const lineStart = line.from;

        // Marks must reach the builder in position order, so collect them per line and sort.
        // (Adding them pass-by-pass crashed the highlighter on lines like "[C]a [] [G]b".)
        const lineMarks = [];
        const addMarks = (regex, className) => {
          regex.lastIndex = 0;
          let match;
          while ((match = regex.exec(text))) {
            const start = lineStart + match.index;
            const end = start + match[0].length;
            lineMarks.push({ start, end, className });
            if (match.index === regex.lastIndex) {
              regex.lastIndex += 1;
            }
          }
        };

        if (inTabBlock) {
          builder.add(line.from, line.to, Decoration.mark({ class: TOKENS.tab }));
          if (/^```\s*$/.test(text.trim())) {
            inTabBlock = false;
          }
        } else if (/^```tab(?:\s+\d+\s*\/\s*\d+)?\s*$/i.test(text.trim())) {
          inTabBlock = true;
          builder.add(line.from, line.to, Decoration.mark({ class: TOKENS.tab }));
        } else if (/^--(?:START|END) MUSIC--\s*$/.test(text.trim())) {
          builder.add(line.from, line.to, Decoration.mark({ class: TOKENS.delimiter }));
        } else {
          addMarks(/\[\[[^\]]+\]\]/g, TOKENS.structure);
          addMarks(/\[\]/g, TOKENS.bar);
          addMarks(/\{[^}\n]*\}/g, TOKENS.rhythm);
          addMarks(new RegExp(`\\[(?:${CHORD_INNER_PATTERN}|N\\.?C\\.?)(?:\\s*:\\s*\\d{1,2})?(?:\\s*[x×]\\s*\\d{1,2})?\\]`, 'g'), TOKENS.chord);
          // 4.34: songbook marks: [C↓] [Gs4] [x] [mute↓] [.] [G…] [Bm7.Am7] [x2] [|]
          addMarks(/\[(?:[A-G][^\]\s]*[↓↑v!*.…]+|[A-G][#b]?(?:s4|s2|ma7|ma9|7s4)|x[↓↑v]*|mute[↓↑v]*|[.…]+|[x×]\d{1,2}|[|/]|[A-G][^\]\s.]*[.…]+[A-G][^\]\s]*)\]/g, TOKENS.chord);
          // "(x2)" at the end of a line
          const repeat = text.match(REPEAT_RE);
          if (repeat) lineMarks.push({ start: lineStart + repeat.index + (repeat[0].length - repeat[0].trimStart().length), end: lineStart + text.length, className: TOKENS.bar });
          // a bar line: "| C | G C | % |" (maybe after [[Label]])
          const gridText = (repeat ? text.slice(0, repeat.index) : text).replace(/^\s*\[\[.*?\]\][:.;,\-–—]*\s*/, '');
          if (parseGridLine(gridText)) {
            const at = text.indexOf(gridText.trim());
            const re = /[^\s|:]+|\|/g;
            let m;
            while ((m = re.exec(gridText.trim()))) {
              const start = lineStart + at + m.index;
              lineMarks.push({ start, end: start + m[0].length, className: m[0] === '|' || m[0] === '%' ? TOKENS.bar : TOKENS.chord });
            }
          }
          // **bold**, *italic*, __underline__: the words shown that way, the markers faint
          lineMarks.push(...richMarks(text, lineStart));
          lineMarks.sort((a, b) => a.start - b.start || a.end - b.end);
          let lastEnd = -1;
          for (const mark of lineMarks) {
            if (mark.start < lastEnd) continue; // skip overlaps
            builder.add(mark.start, mark.end, Decoration.mark({ class: mark.className }));
            lastEnd = mark.end;
          }
        }

        position = line.to + 1;
      }
    }

    return builder.finish();
  }

  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.decorations = buildDecorations(view);
    }

    update(update) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  }, {
    decorations: (plugin) => plugin.decorations
  });
}

// ── Tab editing: overtype ───────────────────────────────────────────────────
// Inside a ```tab block, on a string line (A|---), typing a fret number or symbol replaces
// the dash under the cursor instead of pushing the rest of the line along, and Backspace
// turns the character before the cursor back into a dash. Everywhere else, normal typing.
const TAB_LINE_PREFIX_RE = /^\s*[A-Ga-g][#b]?\s*[|:]/;
function inTabBlock(state, lineNumber) {
  for (let n = lineNumber - 1, steps = 0; n >= 1 && steps < 400; n -= 1, steps += 1) {
    const text = state.doc.line(n).text.trim();
    if (/^```tab(?:\s+\d+\s*\/\s*\d+)?\s*$/i.test(text)) return true;
    if (/^```/.test(text)) return false;
  }
  return false;
}
function tabBodyPosition(state, pos) {
  const line = state.doc.lineAt(pos);
  const prefix = line.text.match(TAB_LINE_PREFIX_RE);
  if (!prefix || pos - line.from < prefix[0].length) return null;
  if (!inTabBlock(state, line.number)) return null;
  return { line, offset: pos - line.from };
}
function createTabOvertype(codemirror) {
  const { EditorView, keymap } = codemirror;
  const input = EditorView.inputHandler.of((view, from, to, text) => {
    if (from !== to || !/^[0-9hpbrxs/\\~-]$/i.test(text)) return false;
    const at = tabBodyPosition(view.state, from);
    if (!at) return false;
    const next = at.line.text[at.offset];
    if (next !== '-') return false;           // only write over dashes (never over | or a fret)
    view.dispatch({ changes: { from, to: from + 1, insert: text }, selection: { anchor: from + 1 }, userEvent: 'input.type' });
    return true;
  });
  const backspace = keymap.of([{
    key: 'Backspace',
    run: (view) => {
      const sel = view.state.selection.main;
      if (!sel.empty) return false;
      const at = tabBodyPosition(view.state, sel.head - 1);
      if (!at) return false;
      const prev = at.line.text[at.offset];
      if (prev === '|' || prev === undefined) return false;
      view.dispatch({ changes: { from: sel.head - 1, to: sel.head, insert: '-' }, selection: { anchor: sel.head - 1 }, userEvent: 'delete.backward' });
      return true;
    }
  }]);
  return [backspace, input];
}

function createTheme(codemirror, requestedTheme) {
  const { EditorView } = codemirror;
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = requestedTheme === 'dark' || (requestedTheme === 'auto' && prefersDark);

  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: 'var(--editor-font-size, 14px)',
      backgroundColor: dark ? '#111827' : '#ffffff',
      color: dark ? '#e5e7eb' : '#111827'
    },
    '.cm-scroller': {
      fontFamily: 'var(--editor-font-family, "Courier New", monospace)',
      lineHeight: '1.5'
    },
    '.cm-content': {
      minHeight: '100%',
      padding: '16px'
    },
    '.cm-line': {
      padding: '0'
    },
    '.cm-gutters': {
      backgroundColor: dark ? '#0f172a' : '#f8fafc',
      color: dark ? '#94a3b8' : '#64748b',
      borderRight: dark ? '1px solid #1f2937' : '1px solid #e5e7eb'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: dark ? '#f8fafc' : '#111827'
    },
    '&.cm-focused': {
      outline: 'none'
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: dark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(37, 99, 235, 0.18)'
    },
    '.cm-activeLine': {
      backgroundColor: dark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(148, 163, 184, 0.10)'
    },
    [`.${TOKENS.chord}`]: {
      color: 'var(--chord-color, #b22222)',
      fontWeight: '600'
    },
    [`.${TOKENS.structure}`]: {
      color: 'var(--section-color, #1a5276)',
      fontWeight: '700'
    },
    [`.${TOKENS.rhythm}`]: {
      color: 'var(--rhythm-color, #666666)'
    },
    [`.${TOKENS.bar}`]: {
      color: dark ? '#94a3b8' : '#9ca3af'
    },
    [`.${TOKENS.tab}`]: {
      backgroundColor: dark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.8)',
      fontFamily: 'var(--editor-font-family, "Courier New", monospace)'
    },
    [`.${TOKENS.delimiter}`]: {
      color: dark ? '#94a3b8' : '#6b7280'
    },
    '.cm-rich-b': { fontWeight: '700' },
    '.cm-rich-i': { fontStyle: 'italic' },
    '.cm-rich-u': { textDecoration: 'underline' },
    '.cm-rich-marker': { color: dark ? '#64748b' : '#9ca3af' }
  }, { dark });
}

function createUkemusicEditor(options = {}) {
  const codemirror = loadCodeMirror();
  if (!codemirror) {
    return null;
  }

  const {
    parent,
    value = '',
    theme = 'auto',
    onUpdate,
    fallbackTextarea,
    onFallbackRequired
  } = options;

  if (!parent) {
    throw new Error('createUkemusicEditor requires a parent element.');
  }

  const {
    EditorState,
    EditorView,
    keymap,
    drawSelection,
    highlightActiveLine,
    history,
    historyKeymap,
    defaultKeymap,
    undo,
    redo,
    Compartment
  } = codemirror;
  // 4.31: the colour theme lives in a compartment, so changing it never rebuilds the editor
  // (rebuilding threw away the undo history every time the preview updated)
  const themeCompartment = Compartment ? new Compartment() : null;

  const highlighter = createHighlighter(codemirror);

  let currentTheme = theme;
  let themeExtension = createTheme(codemirror, currentTheme);
  let view;

  const notify = (update) => {
    if (typeof onUpdate !== 'function') {
      return;
    }

    const head = update.state.selection.main.head;
    const line = update.state.doc.lineAt(head);
    onUpdate({
      docChanged: update.docChanged,
      selectionSet: update.selectionSet,
      value: update.state.doc.toString(),
      cursor: {
        line: line.number,
        col: head - line.from + 1
      }
    });
  };

  const tabOvertype = createTabOvertype(codemirror);
  const buildExtensions = () => [
    ...tabOvertype,
    history(),
    drawSelection(),
    highlightActiveLine(),
    highlighter,
    themeCompartment ? themeCompartment.of(themeExtension) : themeExtension,
    EditorView.lineWrapping, // long lines wrap to the width of the pane instead of disappearing off the edge
    keymap.of([
      { key: 'Mod-b', run: (v) => toggleMarker(v, '**') },
      { key: 'Mod-i', run: (v) => toggleMarker(v, '*') },
      { key: 'Mod-u', run: (v) => toggleMarker(v, '__') },
      ...defaultKeymap, ...historyKeymap]),
    EditorView.updateListener.of((update) => {
      if (update.docChanged || update.selectionSet) {
        notify(update);
      }
    })
  ];

  const createState = (doc) => EditorState.create({
    doc,
    extensions: buildExtensions()
  });

  view = new EditorView({
    state: createState(value),
    parent
  });

  if (fallbackTextarea) {
    fallbackTextarea.hidden = true;
    fallbackTextarea.style.display = 'none';
  }

  return {
    usingCodeMirror: true,
    getValue() {
      return view.state.doc.toString();
    },
    // An edit by the app (insert a strum, write part names…): one step you can undo
    setValue(nextValue) {
      const currentLength = view.state.doc.length;
      view.dispatch({
        changes: { from: 0, to: currentLength, insert: nextValue || '' }
      });
    },
    // 4.31: a different document (open a song, new song): a fresh editor with its own, empty
    // undo history, so Undo can never bring back the song that was open before
    loadValue(nextValue) {
      view.setState(createState(nextValue || ''));
    },
    focus() {
      view.focus();
    },
    getCursor() {
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      return { line: line.number, col: head - line.from + 1 };
    },
    // Put the cursor at the start of a line (1-based) and bring it into view, mid-pane
    goToLine(lineNumber) {
      const doc = view.state.doc;
      const line = doc.line(Math.min(Math.max(1, Number(lineNumber) || 1), doc.lines));
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'center' })
      });
      view.focus();
    },
    // The first line showing at the top of the pane (1-based)
    topLine() {
      const block = view.lineBlockAtHeight(view.scrollDOM.scrollTop + 4);
      return view.state.doc.lineAt(Math.min(block.from, view.state.doc.length)).number;
    },
    execCommand(command) {
      switch (command) {
        case 'undo':
          return undo(view);
        case 'redo':
          return redo(view);
        case 'bold':
        case 'italic':
        case 'underline':
          return toggleMarker(view, STYLE_MARKERS[command]);
        default:
          return false;
      }
    },
    setTheme(nextTheme) {
      const wanted = nextTheme || 'auto';
      if (wanted === currentTheme) return; // nothing to change (this ran after every edit)
      currentTheme = wanted;
      themeExtension = createTheme(codemirror, currentTheme);
      if (themeCompartment) {
        view.dispatch({ effects: themeCompartment.reconfigure(themeExtension) });
      } else {
        const doc = view.state.doc.toString();
        const selection = view.state.selection;
        view.setState(createState(doc));
        view.dispatch({ selection });
      }
    },
    destroy() {
      view.destroy();
      if (fallbackTextarea) {
        fallbackTextarea.hidden = false;
        fallbackTextarea.style.display = '';
      }
    },
    toTextareaAdapter() {
      if (typeof onFallbackRequired === 'function') {
        onFallbackRequired();
      }
    }
  };
}

function renderHighlightedHtml(source) {
  const lines = String(source || '').split('\n');
  let inTabBlock = false;
  const output = [];

  for (const line of lines) {
    if (inTabBlock) {
      output.push(`<span class="${TOKENS.tab}">${escapeHtml(line)}</span>`);
      if (/^```\s*$/.test(line.trim())) {
        inTabBlock = false;
      }
      continue;
    }

    if (/^```tab(?:\s+\d+\s*\/\s*\d+)?\s*$/i.test(line.trim())) {
      inTabBlock = true;
      output.push(`<span class="${TOKENS.tab}">${escapeHtml(line)}</span>`);
      continue;
    }

    if (/^--(?:START|END) MUSIC--\s*$/.test(line.trim())) {
      output.push(`<span class="${TOKENS.delimiter}">${escapeHtml(line)}</span>`);
      continue;
    }

    let html = escapeHtml(line);
    html = html.replace(/\[\[[^\]]+\]\]/g, (m) => `<span class="${TOKENS.structure}">${escapeHtml(m)}</span>`);
    html = html.replace(/\[\]/g, `<span class="${TOKENS.bar}">[]</span>`);
    html = html.replace(/\{[^}\n]*\}/g, (m) => `<span class="${TOKENS.rhythm}">${escapeHtml(m)}</span>`);
    html = html.replace(new RegExp(`\\[${CHORD_INNER_PATTERN}\\]`, 'g'), (m) => `<span class="${TOKENS.chord}">${escapeHtml(m)}</span>`);
    output.push(html);
  }

  return output.join('\n');
}

module.exports = {
  createUkemusicEditor,
  renderHighlightedHtml,
  TOKENS
};
