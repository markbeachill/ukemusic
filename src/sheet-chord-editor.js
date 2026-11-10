// Edit chords on the sheet (4.77): an option, for the desktop app's preview and the web player's
// Edit page. With it on:
//   - drag a chord along the words, even part way into a word, or onto another line
//   - click a chord: change it to another, choose its shape, or take it out
//   - click in the words: put a chord there
//   - drag a chord diagram onto the words: put that chord there
// Each change goes to onEdit as an op for src/chord-edit.js, which makes it in the song text (as if
// typed): the editor, undo, saving and everything else work as before.
// The sheet must be rendered with { editable: true } (src/renderer-html.js): each chord says which
// letter of its line it's on (data-at); the words say how the letters are laid out (data-pad,
// data-shift on a split line, data-from on a column).
//
//   const ed = UkeSheetChordEditor.attach(root, { onEdit(op), chords: () => names, onShape: (name) => … })
//   ed.detach()
//   UkeSheetChordEditor.contextToggle(doc, { isOn, onToggle(on), unavailable, within })   4.79: a
//     right-click on the sheet (within an element, if given) offers "Edit chords on the sheet", on
//     or off; unavailable() can say why not here ('' when it can be)
(function (rootObj) {
  const SKIP = '.ichord, .chord, .ib, .inline-label, .bar, .sce-pop, .rhythm, .strum-box';
  const BOXES = '.lyrics, .inline-line, td.lyric';
  const CSS = `
.sce-on [data-at] { cursor: grab; border-radius: 4px; touch-action: none; -webkit-user-select: none; user-select: none; }
.sce-on [data-at]:hover, .sce-on [data-at]:focus-visible { background: rgba(14, 107, 100, 0.14); outline: 1px solid rgba(14, 107, 100, 0.55); }
.sce-on .lyrics, .sce-on .inline-line, .sce-on td.lyric { cursor: text; }
.sce-on .chord-diagram[data-chord] { cursor: grab; touch-action: none; }
.sce-on .sce-src { opacity: 0.3; }
.sce-ghost { position: fixed; z-index: 2147483000; pointer-events: none; transform: translate(-50%, -120%); font: 800 15px system-ui, sans-serif; color: #fff; background: #0e6b64; padding: 2px 9px; border-radius: 8px; box-shadow: 0 4px 14px rgba(0,0,0,.25); white-space: nowrap; }
.sce-caret { position: fixed; z-index: 2147482999; width: 2px; background: #0e6b64; pointer-events: none; border-radius: 1px; }
.sce-pop { position: absolute; z-index: 2147483000; background: #fff; color: #111; border: 1px solid #c9d3d0; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.18); padding: 10px; font: 14px system-ui, sans-serif; width: max-content; max-width: min(300px, 90vw); }
.sce-pop .sce-h { font-weight: 800; margin: 0 0 6px; }
.sce-pop .sce-row { display: flex; flex-wrap: wrap; gap: 5px; margin: 0 0 8px; }
.sce-pop button { font: inherit; border: 1px solid #c9d3d0; background: #f4f6f5; color: #111; border-radius: 8px; padding: 3px 9px; cursor: pointer; }
.sce-pop button:hover { background: #e3ece9; }
.sce-pop .sce-chord { font-weight: 800; color: #b22222; min-width: 2.2em; }
.sce-pop form { display: flex; gap: 5px; margin: 0 0 8px; }
.sce-pop input { font: inherit; width: 7em; padding: 3px 6px; border: 1px solid #c9d3d0; border-radius: 8px; }
.sce-pop .sce-del { color: #b91c1c; }
.sce-pop .sce-tip { margin: 2px 0 0; font-size: 12px; color: #667; }
.sce-menu { padding: 4px; }
.sce-menu .sce-item { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; border: 0; background: none; padding: 6px 10px; border-radius: 8px; font-weight: 600; }
.sce-menu .sce-item:hover:not(:disabled) { background: #e3ece9; }
.sce-menu .sce-item:disabled { color: #888; cursor: default; }
.sce-menu .sce-tick { width: 1.1em; color: #0e6b64; }
.sce-menu .sce-tip { padding: 0 10px 4px 34px; max-width: 240px; }`;

  function attach(root, { onEdit, chords = () => [], onShape = null } = {}) {
    const doc = root.ownerDocument;
    const win = doc.defaultView;
    if (root.__sce) root.__sce.detach();
    if (!doc.getElementById('sce-css')) {
      const style = doc.createElement('style');
      style.id = 'sce-css';
      style.textContent = CSS;
      doc.head.appendChild(style);
    }
    root.classList.add('sce-on');
    const chordEls = () => [...root.querySelectorAll('.line-group[data-line] [data-at]')];
    for (const el of chordEls()) {
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Chord ${labelOf(el)}: drag to move it, or press Enter to change it`);
    }

    // ── where a point is in the song: the line and the letter (as the parser counts them) ──
    function caretAt(x, y) {
      if (doc.caretRangeFromPoint) { const r = doc.caretRangeFromPoint(x, y); return r ? { node: r.startContainer, offset: r.startOffset, range: r } : null; }
      if (doc.caretPositionFromPoint) { const p = doc.caretPositionFromPoint(x, y); return p ? { node: p.offsetNode, offset: p.offset } : null; }
      return null;
    }
    const skipped = (node) => Boolean(node.parentElement && node.parentElement.closest(SKIP));
    function textsOf(box) {
      const walker = doc.createTreeWalker(box, 4 /* text */);
      const out = [];
      while (walker.nextNode()) if (!skipped(walker.currentNode)) out.push(walker.currentNode);
      return out;
    }
    function indexIn(box, node, offset) {
      let n = 0;
      for (const t of textsOf(box)) {
        if (t === node) return n + offset;
        n += t.textContent.length;
      }
      return n;
    }
    const lengthOf = (box) => textsOf(box).reduce((a, t) => a + t.textContent.length, 0);
    // a place in the laid-out words -> the letter in the line as written
    function toLetter(box, i) {
      if (box.matches('td.lyric')) return Number(box.dataset.from || 0) + i;
      let shift = 0;
      for (const part of String(box.dataset.pad || '').split(',').filter(Boolean)) {
        const [at, count] = part.split(':').map(Number);
        const start = at + shift;
        if (i < start) break;
        if (i < start + count) return at + Number(box.dataset.shift || 0);
        shift += count;
      }
      return i - shift + Number(box.dataset.shift || 0);
    }
    function hit(x, y) {
      const el = doc.elementFromPoint(x, y);
      if (!el || !root.contains(el) || el.closest('.sce-pop')) return null;
      const group = el.closest('.line-group[data-line]');
      if (!group) return null;
      const line = Number(group.dataset.line);
      const onChord = el.closest('[data-at]');
      if (onChord && group.contains(onChord)) {
        const r = onChord.getBoundingClientRect();
        return { line, at: Number(onChord.dataset.at), caret: { x: r.left, top: r.top, bottom: r.bottom } };
      }
      let box = el.closest(BOXES);
      let cx = x;
      let cy = y;
      if (!box) {
        const td = el.closest('td');
        if (td && td.closest('tr.chord-row')) box = td.closest('table').querySelector('tr.lyric-row')?.children[[...td.parentElement.children].indexOf(td)] || null;
        if (!box) box = group.querySelector('.lyrics') || group.querySelector(BOXES);
        if (!box) return null;
        const r = box.getBoundingClientRect();
        cy = r.top + r.height / 2;
        cx = Math.max(r.left + 1, Math.min(x, r.right - 1));
      }
      const c = caretAt(cx, cy);
      const r = box.getBoundingClientRect();
      let i;
      if (c && c.node && c.node.nodeType === 3 && box.contains(c.node) && !skipped(c.node)) i = indexIn(box, c.node, c.offset);
      else i = cx < r.left + 4 ? 0 : lengthOf(box);
      let caretX = cx;
      if (c && c.range && c.range.getClientRects) { const rr = c.range.getClientRects()[0] || c.range.getBoundingClientRect(); if (rr && rr.height) caretX = rr.left; }
      return { line, at: Math.max(0, toLetter(box, i)), caret: { x: caretX, top: r.top, bottom: r.bottom } };
    }
    const lineChords = (line) => [...root.querySelectorAll(`.line-group[data-line="${line}"] [data-at]`)];
    function whichChord(el) {
      const line = Number(el.closest('.line-group[data-line]').dataset.line);
      const at = Number(el.dataset.at);
      const nth = lineChords(line).filter((x) => x.dataset.at === el.dataset.at).indexOf(el);
      return { line, at, nth: Math.max(0, nth) };
    }

    // ── dragging ──
    let drag = null;
    let swallowClick = false;
    let ghost = null;
    let caret = null;
    function showCaret(h) {
      if (!h) { if (caret) caret.hidden = true; return; }
      if (!caret) { caret = doc.createElement('div'); caret.className = 'sce-caret'; doc.body.appendChild(caret); }
      caret.hidden = false;
      caret.style.left = `${h.caret.x - 1}px`;
      caret.style.top = `${h.caret.top}px`;
      caret.style.height = `${Math.max(12, h.caret.bottom - h.caret.top)}px`;
    }
    function endDrag() {
      if (ghost) { ghost.remove(); ghost = null; }
      showCaret(null);
      if (drag && drag.el) drag.el.classList.remove('sce-src');
      drag = null;
    }
    const onDown = (e) => {
      if (e.button !== 0 || e.target.closest('.sce-pop')) return;
      const chordEl = e.target.closest('[data-at]');
      const diagram = !chordEl && e.target.closest('.chord-diagram[data-chord]');
      if ((!chordEl && !diagram) || !root.contains(e.target)) return;
      drag = { el: chordEl || diagram, kind: chordEl ? 'chord' : 'diagram', x: e.clientX, y: e.clientY, moving: false, id: e.pointerId };
      if (chordEl) e.preventDefault(); // no text selection
    };
    const onMove = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moving) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        drag.moving = true;
        closePop();
        ghost = doc.createElement('div');
        ghost.className = 'sce-ghost';
        ghost.textContent = drag.kind === 'chord' ? labelOf(drag.el) : drag.el.dataset.chord;
        doc.body.appendChild(ghost);
        if (drag.kind === 'chord') drag.el.classList.add('sce-src');
        try { drag.el.setPointerCapture(e.pointerId); } catch (_e) { /* fine */ }
      }
      e.preventDefault();
      ghost.style.left = `${e.clientX}px`;
      ghost.style.top = `${e.clientY}px`;
      showCaret(hit(e.clientX, e.clientY));
    };
    const onUp = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      if (!d.moving) { drag = null; if (d.kind === 'chord') { swallowClick = true; openChordPop(d.el); } return; }
      swallowClick = true;
      const h = hit(e.clientX, e.clientY);
      endDrag();
      if (!h) return;
      if (d.kind === 'chord') {
        const from = whichChord(d.el);
        if (from.line !== h.line || from.at !== h.at) onEdit({ type: 'move', ...from, toLine: h.line, toAt: h.at });
      } else onEdit({ type: 'insert', line: h.line, at: h.at, name: d.el.dataset.chord });
    };
    const onCancel = () => endDrag();
    const onClick = (e) => {
      if (swallowClick) { swallowClick = false; e.stopPropagation(); e.preventDefault(); return; }
      if (e.target.closest('.sce-pop')) return;
      if (pop) { closePop(); }
      if (e.target.closest('[data-at]') || e.target.closest('.chord-diagram')) return;
      const box = e.target.closest(BOXES);
      if (!box || !root.contains(box)) return;
      if (String(win.getSelection && win.getSelection()) !== '') return; // selecting words
      const h = hit(e.clientX, e.clientY);
      if (h) openAddPop(h);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && (pop || drag)) { closePop(); endDrag(); e.stopPropagation(); return; }
      const el = e.target.closest && e.target.closest('[data-at]');
      if (el && root.contains(el) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); openChordPop(el); }
    };

    // ── the little menus ──
    let pop = null;
    function closePop() { if (pop) { pop.remove(); pop = null; } }
    function place(el, x, y) {
      doc.body.appendChild(el);
      const w = el.offsetWidth;
      const vw = doc.documentElement.clientWidth;
      el.style.left = `${Math.max(4, Math.min(x, vw - w - 4)) + win.scrollX}px`;
      el.style.top = `${y + win.scrollY + 6}px`;
      pop = el;
      const first = el.querySelector('button, input');
      if (first) first.focus({ preventScroll: true });
    }
    const button = (text, cls, fn) => { const b = doc.createElement('button'); b.type = 'button'; b.textContent = text; if (cls) b.className = cls; b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }); return b; };
    function chordRow(skip, pick) {
      const row = doc.createElement('div');
      row.className = 'sce-row';
      for (const name of [...new Set(chords())].filter((n) => n && n !== skip)) row.appendChild(button(name, 'sce-chord', () => pick(name)));
      return row;
    }
    function nameForm(label, pick) {
      const form = doc.createElement('form');
      const input = doc.createElement('input');
      input.placeholder = 'Another: Am7';
      input.setAttribute('aria-label', 'Chord name');
      input.autocapitalize = 'off';
      form.append(input, button(label, '', () => form.requestSubmit()));
      form.addEventListener('submit', (e) => { e.preventDefault(); e.stopPropagation(); const v = input.value.trim().replace(/^\[|\]$/g, ''); if (v) pick(v); });
      return form;
    }
    function openChordPop(el) {
      closePop();
      const which = whichChord(el);
      const name = labelOf(el);
      const box = doc.createElement('div');
      box.className = 'sce-pop';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', `Chord ${name}`);
      const h = doc.createElement('p');
      h.className = 'sce-h';
      h.textContent = `${name}: change it to`;
      box.appendChild(h);
      const done = (op) => { closePop(); onEdit(op); };
      box.appendChild(chordRow(baseOf(name), (n) => done({ type: 'change', ...which, name: n })));
      box.appendChild(nameForm('Change', (n) => done({ type: 'change', ...which, name: n })));
      const acts = doc.createElement('div');
      acts.className = 'sce-row';
      if (onShape) acts.appendChild(button('Its shape…', '', () => { closePop(); onShape(baseOf(name)); }));
      acts.appendChild(button('Take it out', 'sce-del', () => done({ type: 'remove', ...which })));
      box.appendChild(acts);
      const tip = doc.createElement('p');
      tip.className = 'sce-tip';
      tip.textContent = 'Or drag it to where it\'s played.';
      box.appendChild(tip);
      const r = el.getBoundingClientRect();
      place(box, r.left, r.bottom);
    }
    function openAddPop(h) {
      closePop();
      const box = doc.createElement('div');
      box.className = 'sce-pop';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Put a chord here');
      const head = doc.createElement('p');
      head.className = 'sce-h';
      head.textContent = 'Put a chord here';
      box.appendChild(head);
      const done = (n) => { closePop(); onEdit({ type: 'insert', line: h.line, at: h.at, name: n }); };
      box.appendChild(chordRow('', done));
      box.appendChild(nameForm('Put in', done));
      showCaret(h);
      place(box, h.caret.x, h.caret.bottom);
      const hideCaret = () => showCaret(null);
      const obs = new win.MutationObserver(() => { if (!box.isConnected) { hideCaret(); obs.disconnect(); } });
      obs.observe(doc.body, { childList: true });
    }
    const onOutside = (e) => { if (pop && !e.target.closest('.sce-pop') && !e.target.closest('[data-at]')) closePop(); };

    doc.addEventListener('pointerdown', onOutside, true);
    root.addEventListener('pointerdown', onDown);
    doc.addEventListener('pointermove', onMove, { passive: false });
    doc.addEventListener('pointerup', onUp);
    doc.addEventListener('pointercancel', onCancel);
    root.addEventListener('click', onClick, true);
    doc.addEventListener('keydown', onKey, true);
    const api = {
      detach() {
        closePop(); endDrag();
        if (caret) { caret.remove(); caret = null; }
        doc.removeEventListener('pointerdown', onOutside, true);
        root.removeEventListener('pointerdown', onDown);
        doc.removeEventListener('pointermove', onMove);
        doc.removeEventListener('pointerup', onUp);
        doc.removeEventListener('pointercancel', onCancel);
        root.removeEventListener('click', onClick, true);
        doc.removeEventListener('keydown', onKey, true);
        root.classList.remove('sce-on');
        delete root.__sce;
      },
      hit
    };
    root.__sce = api;
    return api;
  }
  // 4.79: right-click the sheet: Edit chords on the sheet, on or off
  function contextToggle(doc, { isOn, onToggle, unavailable = () => '', within = null } = {}) {
    if (doc.__sceMenu) { Object.assign(doc.__sceMenu, { isOn, onToggle, unavailable, within }); return; }
    const opts = { isOn, onToggle, unavailable, within };
    doc.__sceMenu = opts;
    const win = doc.defaultView;
    if (!doc.getElementById('sce-css')) {
      const style = doc.createElement('style');
      style.id = 'sce-css';
      style.textContent = CSS;
      doc.head.appendChild(style);
    }
    let menu = null;
    const close = () => { if (menu) { menu.remove(); menu = null; } };
    doc.addEventListener('contextmenu', (e) => {
      if (opts.within && !opts.within.contains(e.target)) return;
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
      close();
      const on = Boolean(opts.isOn());
      const why = opts.unavailable() || '';
      menu = doc.createElement('div');
      menu.className = 'sce-pop sce-menu';
      menu.setAttribute('role', 'menu');
      const item = doc.createElement('button');
      item.type = 'button';
      item.className = 'sce-item';
      item.setAttribute('role', 'menuitemcheckbox');
      item.setAttribute('aria-checked', String(on));
      item.innerHTML = `<span class="sce-tick" aria-hidden="true">${on ? '✓' : ''}</span>Edit chords on the sheet`;
      item.disabled = Boolean(why) && !on;
      item.addEventListener('click', (ev) => { ev.stopPropagation(); close(); opts.onToggle(!on); });
      const tip = doc.createElement('p');
      tip.className = 'sce-tip';
      tip.textContent = why ? `${why}.` : (on ? 'On: drag a chord to move it, click one to change it.' : 'Drag chords to where they\'re played, change or add them, here on the sheet.');
      menu.append(item, tip);
      doc.body.appendChild(menu);
      const vw = doc.documentElement.clientWidth;
      menu.style.left = `${Math.max(4, Math.min(e.clientX, vw - menu.offsetWidth - 4)) + win.scrollX}px`;
      menu.style.top = `${e.clientY + win.scrollY}px`;
      if (!item.disabled) item.focus({ preventScroll: true });
    });
    doc.addEventListener('pointerdown', (e) => { if (menu && !menu.contains(e.target)) close(); }, true);
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, true);
  }

  // a chord's name as shown: without the [ ] of Chords in the words
  function labelOf(el) { return [...el.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains('ib'))).map((n) => n.textContent).join('').trim(); }
  // without its timing (C×2, F:2): the chord itself
  const baseOf = (label) => String(label).replace(/(?:[x×]\d.*|:.*|[↓↑].*)$/, '');

  const api = { attach, contextToggle, CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  rootObj.UkeSheetChordEditor = api;
}(typeof window !== 'undefined' ? window : globalThis));
