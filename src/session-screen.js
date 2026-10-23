// Session screen (4.35): the screen itself, shared by the desktop app's Session window
// (session.html) and the web player's full-screen view. It shows one song at a time fitted to
// the screen (src/session-fit.js), with its chord shapes, and turns songs and pages with keys,
// a clicker or a tap.
//
//   const screen = UkeSessionScreen.create(root, { css, onState, onClose })
//     root     an empty element that fills the screen
//     css      the song styles (SESSION_CSS from src/session-view.js)
//     onState  (state) => …  after every change: { index, count, page, pages, title, next, px, cols, mode }
//     onClose  () => …       Esc
//   screen.show({ songs, start, minPx, hideCommon, dark })   songs from sessionSong()
//   screen.key(k)       a key name (KeyboardEvent.key): the remote control
//   screen.layout()     lay out again (after a resize, done for you)
//   screen.check()      lay out every song: [{ title, folder, px, cols, mode, pages }]
//   screen.destroy()
(function (root) {
  const CSS = `
.ss-screen { --ss-bg: #ffffff; --ss-ink: #111111; --ss-muted: #5b6662; --ss-chord: #b22222; --ss-label: #1a5276; --ss-faint: #8a8a8a; --ss-bar: #f2f2ee;
  position: relative; width: 100%; height: 100%; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; cursor: default;
  background: var(--ss-bg); color: var(--ss-ink); font-family: "Segoe UI", system-ui, Arial, "Liberation Sans", Helvetica, sans-serif; color-scheme: light;
  -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }
.ss-screen *, .ss-screen *::before, .ss-screen *::after { box-sizing: border-box; }
.ss-screen.dark { --ss-bg: #0f1312; --ss-ink: #f2f4f3; --ss-muted: #a3b0ab; --ss-chord: #ff8a7a; --ss-label: #8ec3ea; --ss-faint: #7d8a86; --ss-bar: #1a201e; color-scheme: dark; }
.ss-screen .ss-bar { display: flex; align-items: baseline; gap: 1.2em; padding: 0.55vh 2vw; background: var(--ss-bar); font-size: clamp(14px, 2.2vh, 30px); white-space: nowrap; overflow: hidden; }
.ss-screen .ss-title { font-weight: 800; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 30%; }
.ss-screen .ss-sub { color: var(--ss-muted); overflow: hidden; text-overflow: ellipsis; flex: 0 100 auto; min-width: 0; }
.ss-screen .ss-where { flex: 0 0 auto; }
.ss-screen .ss-where { margin-left: auto; color: var(--ss-muted); font-variant-numeric: tabular-nums; }
.ss-screen .ss-x { border: 0; background: none; color: var(--ss-muted); font: inherit; font-size: 1.1em; line-height: 1; padding: 0 0.1em; cursor: pointer; }
.ss-screen .ss-stage { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2vw; padding: 1.6vh 2vw 1.4vh; min-height: 0; }
.ss-screen .ss-stage.ss-tall { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
.ss-screen .ss-stage.ss-tall .ss-strip { order: -1; display: flex; flex-wrap: wrap; gap: 6px 14px; }
.ss-screen .ss-box { position: relative; overflow: hidden; min-width: 0; min-height: 0; }
.ss-screen .ss-strip { display: grid; align-content: start; gap: 4px 8px;
  --text-color: var(--ss-ink); --bg-color: var(--ss-bg); --rhythm-color: var(--ss-muted); --chord-color: var(--ss-chord); --diagram-size: 80px; }
.ss-screen .ss-strip figure { margin: 0; text-align: center; color: var(--ss-chord); font-weight: 800; font-size: clamp(13px, 1.9vh, 26px); }
.ss-screen .ss-strip figure + figure { margin-top: 0.5em; }
.ss-screen .ss-stage.ss-tall .ss-strip figure + figure { margin-top: 0; }
.ss-screen .ss-strip figcaption { line-height: 1.1; }
.ss-screen .ss-strip .chord-diagram { display: block; }
.ss-screen .ss-strip svg { display: block; margin: 0 auto; }
.ss-screen .ss-strip svg .line { stroke: var(--rhythm-color); stroke-width: 2.5; }
.ss-screen .ss-strip svg .open, .ss-screen .ss-strip svg .muted { stroke-width: 2.5; }
.ss-screen .ss-strip svg .dot { fill: var(--text-color); }
.ss-screen .ss-strip svg .name { display: none; }
.ss-screen .ss-hint { position: absolute; right: 1.2vw; bottom: 1vh; color: var(--ss-muted); font-size: 13px; opacity: 0; transition: opacity 0.4s; pointer-events: none; }
.ss-screen.show-hint .ss-hint { opacity: 0.85; }
@media (max-width: 760px), (pointer: coarse) { .ss-screen .ss-hint { display: none; } .ss-screen .ss-bar { gap: 0.7em; } }
.ss-screen .ss-dots { position: absolute; left: 50%; bottom: 0.6vh; transform: translateX(-50%); display: flex; gap: 8px; pointer-events: none; }
.ss-screen .ss-dots i { width: 10px; height: 10px; border-radius: 50%; background: var(--ss-faint); opacity: 0.35; }
.ss-screen .ss-dots i.on { opacity: 1; background: var(--ss-label); }
`;
  const HINT = '→ / Space next · ← back · + − text size · M chords above / in the words · D dark · C common chords · Esc end';
  const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let styled = false;
  function addStyles(doc, css) {
    if (styled) return;
    styled = true;
    const el = doc.createElement('style');
    el.textContent = CSS + (css || '');
    doc.head.appendChild(el);
  }

  function create(rootEl, { css = '', onState = () => {}, onClose = () => {}, closeButton = false } = {}) {
    const Fit = root.UkeSessionFit;
    const doc = rootEl.ownerDocument;
    addStyles(doc, css);
    rootEl.classList.add('ss-screen');
    rootEl.innerHTML = `<header class="ss-bar"><span class="ss-title"></span><span class="ss-sub"></span><span class="ss-where"></span>${closeButton ? '<button class="ss-x" type="button" title="End (Esc)" aria-label="End the Session screen">×</button>' : ''}</header>
<main class="ss-stage"><div class="ss-box"><div class="ss-lyrics"></div></div><aside class="ss-strip" aria-label="Chord shapes"></aside></main>
<div class="ss-dots" aria-hidden="true"></div><div class="ss-hint">${HINT}</div>`;
    const q = (c) => rootEl.querySelector(c);
    const els = { title: q('.ss-title'), sub: q('.ss-sub'), where: q('.ss-where'), box: q('.ss-box'), lyrics: q('.ss-lyrics'), strip: q('.ss-strip'), dots: q('.ss-dots') };
    const s = { songs: [], i: 0, page: 0, pages: 1, minPx: 18, mode: 'auto', hideCommon: false, result: null };
    const modes = () => (s.mode === 'auto' ? ['over', 'inline'] : [s.mode]);

    function layout() {
      const song = s.songs[s.i];
      if (!song) return null;
      els.title.textContent = song.title;
      els.sub.textContent = song.sub || '';
      const chords = (song.diagrams || []).filter((d) => d.svg && !(s.hideCommon && d.common));
      // the diagram's own name is hidden (the caption is bigger) and its space below cropped off
      els.strip.innerHTML = chords.map((d) => `<figure><figcaption>${esc(d.name)}</figcaption>${String(d.svg).replace('viewBox="0 0 100 145"', 'viewBox="0 4 100 108"')}</figure>`).join('');
      s.result = Fit.fit({ box: els.box, lyrics: els.lyrics, strip: els.strip, html: (mode) => song.html[mode], minPx: s.minPx, maxPx: Math.round(s.minPx * 2.6), modes: modes() });
      s.pages = s.result.pages;
      if (s.page >= s.pages) s.page = s.pages - 1;
      Fit.page(els.lyrics, s.page);
      status();
      return s.result;
    }
    function status() {
      const parts = [];
      if (s.songs.length > 1) parts.push(`Song ${s.i + 1} of ${s.songs.length}`);
      if (s.pages > 1) parts.push(`page ${s.page + 1} of ${s.pages}`);
      els.where.textContent = parts.join(' · ');
      els.dots.innerHTML = s.pages > 1 ? Array.from({ length: s.pages }, (_, k) => `<i class="${k === s.page ? 'on' : ''}"></i>`).join('') : '';
      const next = s.songs[s.i + 1];
      onState({ index: s.i, count: s.songs.length, page: s.page, pages: s.pages, title: s.songs[s.i]?.title || '', next: next ? next.title : '', px: s.result?.px, cols: s.result?.cols, mode: s.result?.mode });
    }
    function go(dir) {
      if (dir > 0) {
        if (s.page < s.pages - 1) { s.page += 1; Fit.page(els.lyrics, s.page); status(); return; }
        if (s.i < s.songs.length - 1) { s.i += 1; s.page = 0; layout(); }
      } else {
        if (s.page > 0) { s.page -= 1; Fit.page(els.lyrics, s.page); status(); return; }
        if (s.i > 0) { s.i -= 1; s.page = 0; layout(); }
      }
    }
    function key(k) {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n', 'N'].includes(k)) go(1);
      else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p', 'P'].includes(k)) go(-1);
      else if (k === 'Home') { s.i = 0; s.page = 0; layout(); }
      else if (k === 'End') { s.i = Math.max(0, s.songs.length - 1); s.page = 0; layout(); }
      else if (k === '+' || k === '=') { s.minPx = Math.min(40, s.minPx + 1); layout(); }
      else if (k === '-' || k === '_') { s.minPx = Math.max(12, s.minPx - 1); layout(); }
      else if (k === 'm' || k === 'M') { s.mode = s.result && s.result.mode === 'inline' ? 'over' : 'inline'; s.page = 0; layout(); } // flips what's shown
      else if (k === 'd' || k === 'D') rootEl.classList.toggle('dark');
      else if (k === 'c' || k === 'C') { s.hideCommon = !s.hideCommon; layout(); }
      else if (k === 'Escape') onClose();
      else return false;
      return true;
    }
    // click or tap: the right two-thirds go on, the left third goes back
    const onClick = (e) => {
      if (e.target.closest && e.target.closest('.ss-x')) { onClose(); return; }
      const r = rootEl.getBoundingClientRect();
      go(e.clientX - r.left > r.width / 3 ? 1 : -1);
    };
    rootEl.addEventListener('click', onClick);
    let hintTimer = null;
    const hint = (ms = 2500) => { rootEl.classList.add('show-hint'); clearTimeout(hintTimer); hintTimer = setTimeout(() => rootEl.classList.remove('show-hint'), ms); };
    const onMove = () => hint();
    rootEl.addEventListener('mousemove', onMove);
    let resizeTimer = null;
    const ro = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (s.songs.length) layout(); }, 120); });
    ro.observe(q('.ss-stage'));

    function show(data = {}) {
      s.songs = data.songs || [];
      s.i = Math.max(0, Math.min(s.songs.length - 1, data.start || 0));
      s.page = 0;
      if (data.minPx) s.minPx = data.minPx;
      if (data.hideCommon !== undefined) s.hideCommon = Boolean(data.hideCommon);
      rootEl.classList.toggle('dark', Boolean(data.dark));
      layout();
      hint(4000);
    }
    function check() {
      const report = [];
      for (let i = 0; i < s.songs.length; i += 1) {
        s.i = i; s.page = 0;
        const r = layout();
        report.push({ title: s.songs[i].title, folder: s.songs[i].folder || '', px: r.px, cols: r.cols, mode: r.mode, pages: r.pages });
      }
      return report;
    }
    function destroy() { ro.disconnect(); rootEl.removeEventListener('click', onClick); rootEl.removeEventListener('mousemove', onMove); clearTimeout(hintTimer); clearTimeout(resizeTimer); rootEl.innerHTML = ''; }
    return { show, key, layout, check, destroy, state: s, get minPx() { return s.minPx; } };
  }

  const api = { create, CSS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeSessionScreen = api;
}(typeof window !== 'undefined' ? window : globalThis));
