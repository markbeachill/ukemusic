// Session screen (4.35): the screen itself, shared by the desktop app's Session window
// (session.html) and the web player's full-screen view. It shows one song at a time fitted to
// the screen (src/session-fit.js), with its chord shapes, and turns songs and pages with keys,
// a clicker or a tap.
//
//   const screen = UkeSessionScreen.create(root, { css, onState, onClose })
//     root     an empty element that fills the screen
//     css      the song styles (SESSION_CSS from src/session-view.js)
//     onState  (state) => …  after every change: { index, count, page, pages, title, next, px, cols, mode, size, same, theme, blank, sections }
//              sections: [{ label, page }], the song's verses and choruses (for a "Go to" list)
//     onClose  () => …       Esc
//   screen.show({ songs, start, minPx, hideCommon, dark, size, same })   songs from sessionSong()
//     size  'fit' (each song as big as fits; the size changes from song to song) or 'same'
//           (4.73: every song the same size, a share of the screen's height, for a club that
//           wants it steady: a long song takes columns or a page turn instead of smaller text)
//     same  that share, in % of the screen's height (4.5: about 48px on a 1080p TV)
//     theme 'light' (red chords), 'blue' (dark blue chords: easier at a distance), 'dark' or
//           'contrast' (white and yellow on black, for a bright hall or a weak projector); D
//           goes round them. 4.74 (dark: true, from before, is 'dark')
//   screen.key(k)       a key name (KeyboardEvent.key): the remote control. 4.74: B blanks the
//                       screen (as a presenter's clicker's blank button does); 1–9 jump to that
//                       section (verse, chorus…), and '#n' to any
//   screen.playing(info) 4.74: the song playing (on the laptop, or the Group screen's own Play):
//                       { folder, title, line, chord, next, progress 0–1 }: its line lit, its page
//                       shown, the chord now and next and how far through; null when it stops
//   UkeSessionScreen.nowFrom(schedule, index, { folder, title })   the playing() info for bar
//                       `index` of a schedule (src/playback-schedule.js), for the player's onBar
//   create(…, { onPlay }) 4.74: a Play button in the screen's own bar (the web player's Group
//                       screen): onPlay({ index, playing }) plays or stops song `index`
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
.ss-screen.dark { --ss-bg: #0f1312; --ss-ink: #f2f4f3; --ss-muted: #a3b0ab; --ss-chord: #ff8a7a; --ss-label: #8ec3ea; --ss-faint: #7d8a86; --ss-bar: #1a201e; --ss-now: rgba(255, 226, 110, 0.2); color-scheme: dark; }
/* 4.74: colour schemes for a hall. blue: dark blue chords, as club screens often use; contrast: for a bright room or a weak projector */
.ss-screen.ss-t-blue { --ss-chord: #1d3f9e; --ss-label: #0e6b64; }
.ss-screen.ss-t-contrast { --ss-bg: #000000; --ss-ink: #ffffff; --ss-muted: #d0d0d0; --ss-chord: #ffd60a; --ss-label: #7fd4ff; --ss-faint: #b0b0b0; --ss-bar: #161616; --ss-now: #3a3300; color-scheme: dark; }
/* 4.74: the line playing (pale yellow), the chord now and next, how far through */
.ss-screen .ss-lyrics .ln.ss-now { background: var(--ss-now, #fff3a6); box-shadow: 0 0 0 0.15em var(--ss-now, #fff3a6); border-radius: 0.15em; }
.ss-screen .ss-lyrics .blk.ss-flash { animation: ss-flash 1.6s ease-out; }
@keyframes ss-flash { from { background: var(--ss-now, #fff3a6); } to { background: transparent; } }
.ss-screen .ss-play { display: none; align-items: baseline; gap: 0.45em; flex: 0 0 auto; font-weight: 800; }
.ss-screen.ss-playing .ss-play { display: flex; }
.ss-screen .ss-play .now { color: var(--ss-chord); }
.ss-screen .ss-play .nx { color: var(--ss-muted); font-weight: 600; font-size: 0.7em; }
.ss-screen .ss-progress { position: absolute; left: 0; bottom: 0; height: 0.6vh; min-height: 4px; width: 0; background: var(--ss-label); opacity: 0.8; display: none; transition: width 0.4s linear; }
.ss-screen.ss-playing .ss-progress { display: block; }
.ss-screen .ss-playbtn { border: 1px solid var(--ss-faint); border-radius: 999px; background: none; color: var(--ss-ink); font: inherit; font-size: 0.8em; font-weight: 700; padding: 0.05em 0.7em; cursor: pointer; flex: 0 0 auto; }
.ss-screen .ss-goto { border: 1px solid var(--ss-faint); border-radius: 999px; background: none; color: var(--ss-muted); font: inherit; font-size: 0.8em; padding: 0.05em 0.5em; flex: 0 0 auto; max-width: 12em; }
.ss-screen .ss-goto:empty, .ss-screen .ss-goto[hidden] { display: none; }
.ss-screen .ss-blank { position: absolute; inset: 0; background: #000; display: none; z-index: 5; }
.ss-screen.ss-blanked .ss-blank { display: block; }
.ss-screen .ss-bar { display: flex; align-items: baseline; gap: 1.2em; padding: 0.55vh 2vw; background: var(--ss-bar); font-size: clamp(14px, 2.2vh, 30px); white-space: nowrap; overflow: hidden; }
.ss-screen .ss-title { font-weight: 800; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; min-width: 30%; }
.ss-screen .ss-sub { color: var(--ss-muted); overflow: hidden; text-overflow: ellipsis; flex: 0 100 auto; min-width: 0; }
.ss-screen .ss-where { flex: 0 0 auto; }
.ss-screen .ss-where { margin-left: auto; color: var(--ss-muted); font-variant-numeric: tabular-nums; }
.ss-screen .ss-size { border: 1px solid var(--ss-faint); border-radius: 999px; background: none; color: var(--ss-muted); font: inherit; font-size: 0.8em; padding: 0.1em 0.7em; cursor: pointer; flex: 0 0 auto; }
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
  const HINT = '→ / Space next · ← back · 1–9 go to a verse or chorus · + − text size · S fit each song / same size · M chords above / in the words · D colours · B blank · C common chords · Esc end';
  const THEMES = ['light', 'blue', 'dark', 'contrast']; // 4.74: D goes round them
  const SAME = { min: 2.5, max: 9, step: 0.25, usual: 4.5 }; // 'same' size: % of the screen's height
  const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let styled = false;
  function addStyles(doc, css) {
    if (styled) return;
    styled = true;
    const el = doc.createElement('style');
    el.textContent = CSS + (css || '');
    doc.head.appendChild(el);
  }

  /** The playing() info for bar `index` of a schedule: the line, the chord now and the next one, how far through */
  function nowFrom(schedule, index, { folder = '', title = '' } = {}) {
    const bars = (schedule && schedule.bars) || [];
    const bar = bars[index];
    if (!bar) return null;
    const name = (b) => (b && !b.tab && !b.rest && b.chord ? String(b.chord) : '');
    const chord = name(bar);
    let next = '';
    for (let k = index + 1; k < bars.length && !next; k += 1) if (name(bars[k]) && name(bars[k]) !== chord) next = name(bars[k]);
    const start = schedule.countInDuration || 0;
    const length = Math.max(0.001, (schedule.duration || 0) - start);
    return { folder, title, line: bar.line, chord, next, progress: Math.max(0, Math.min(1, (bar.time - start) / length)) };
  }

  function create(rootEl, { css = '', onState = () => {}, onClose = () => {}, closeButton = false, onPlay = null } = {}) {
    const Fit = root.UkeSessionFit;
    const doc = rootEl.ownerDocument;
    addStyles(doc, css);
    rootEl.classList.add('ss-screen');
    rootEl.innerHTML = `<header class="ss-bar"><span class="ss-title"></span><span class="ss-sub"></span><span class="ss-play" aria-live="off"><span class="now"></span><span class="nx"></span></span><span class="ss-where"></span>${onPlay ? '<button class="ss-playbtn" type="button" title="Play this song, its line lit as it goes">▶ Play</button>' : ''}${closeButton ? '<select class="ss-goto" aria-label="Go to a verse or chorus" title="Go to a verse or chorus (1–9)"></select><button class="ss-size" type="button" title="Text: each song as big as fits, or every song the same size (S)"></button><button class="ss-x" type="button" title="End (Esc)" aria-label="End the Session screen">×</button>' : ''}</header>
<main class="ss-stage"><div class="ss-box"><div class="ss-lyrics"></div></div><aside class="ss-strip" aria-label="Chord shapes"></aside></main>
<div class="ss-dots" aria-hidden="true"></div><div class="ss-hint">${HINT}</div>
<div class="ss-progress"></div><div class="ss-blank"></div>`;
    const q = (c) => rootEl.querySelector(c);
    const els = { title: q('.ss-title'), sub: q('.ss-sub'), where: q('.ss-where'), box: q('.ss-box'), lyrics: q('.ss-lyrics'), strip: q('.ss-strip'), dots: q('.ss-dots'), goto: q('.ss-goto'), play: q('.ss-play'), progress: q('.ss-progress') };
    const s = { songs: [], i: 0, page: 0, pages: 1, minPx: 18, mode: 'auto', hideCommon: false, result: null, size: 'fit', same: SAME.usual, theme: 'light', blank: false, now: null, sections: [] };
    const modes = () => (s.mode === 'auto' ? ['over', 'inline'] : [s.mode]);

    function layout() {
      const song = s.songs[s.i];
      if (!song) return null;
      els.title.textContent = song.title;
      els.sub.textContent = song.sub || '';
      const chords = (song.diagrams || []).filter((d) => d.svg && !(s.hideCommon && d.common));
      // the diagram's own name is hidden (the caption is bigger) and its space below cropped off
      els.strip.innerHTML = chords.map((d) => `<figure><figcaption>${esc(d.name)}</figcaption>${String(d.svg).replace('viewBox="0 0 100 145"', 'viewBox="0 4 100 108"')}</figure>`).join('');
      // 4.73: 'same': one size for every song, from the screen's height (columns or pages if a song is long)
      const samePx = Math.max(12, Math.round(rootEl.getBoundingClientRect().height * s.same / 100));
      const [minPx, maxPx] = s.size === 'same' ? [samePx, samePx] : [s.minPx, Math.round(s.minPx * 2.6)];
      s.result = Fit.fit({ box: els.box, lyrics: els.lyrics, strip: els.strip, html: (mode) => song.html[mode], minPx, maxPx, modes: modes(), diagramPx: s.size === 'same' ? Math.round(samePx * 0.4) : null });
      s.pages = s.result.pages;
      if (s.page >= s.pages) s.page = s.pages - 1;
      s.sections = [...els.lyrics.querySelectorAll('.blk')].map((el, k) => ({ label: blockLabel(el, k), page: pageOf(el) }));
      Fit.page(els.lyrics, s.page);
      lightNow();
      status();
      return s.result;
    }
    // which page an element of the song is on (the song is laid out in columns, a page a screen wide)
    function pageOf(el) {
      const stride = els.lyrics._stride || 0;
      if (!stride || s.pages < 2) return 0;
      const dx = el.getBoundingClientRect().left - els.lyrics.getBoundingClientRect().left;
      return Math.max(0, Math.min(s.pages - 1, Math.floor((dx + 2) / stride)));
    }
    function blockLabel(el, k) {
      const lab = el.querySelector('.lab');
      if (lab) return lab.textContent.trim();
      const words = (el.querySelector('.ln')?.textContent || '').replace(/\s+/g, ' ').trim();
      if (words) return `“${words.length > 24 ? `${words.slice(0, 22)}…` : words}”`;
      return el.querySelector('.ss-strum') ? 'Strum' : `Part ${k + 1}`;
    }
    function toSection(n) {
      const sec = s.sections[n];
      if (!sec) return;
      s.page = sec.page;
      Fit.page(els.lyrics, s.page);
      const el = els.lyrics.querySelectorAll('.blk')[n];
      if (el) { el.classList.remove('ss-flash'); void el.offsetWidth; el.classList.add('ss-flash'); }
      status();
    }
    // 4.74: the song playing: its line lit and on screen, the chord now and next, how far through
    const sameSong = (a, b) => Boolean(a && b) && (a.folder && b.folder ? a.folder === b.folder : a.title === b.title);
    function lightNow() {
      for (const el of els.lyrics.querySelectorAll('.ln.ss-now')) el.classList.remove('ss-now');
      const n = s.now;
      const here = n && sameSong(s.songs[s.i], n);
      rootEl.classList.toggle('ss-playing', Boolean(here));
      const pb = rootEl.querySelector('.ss-playbtn');
      if (pb) pb.textContent = here ? '■ Stop' : '▶ Play';
      if (!here) return;
      els.play.querySelector('.now').textContent = n.chord || '';
      els.play.querySelector('.nx').textContent = n.next && n.next !== n.chord ? `then ${n.next}` : '';
      els.progress.style.width = `${Math.round(Math.max(0, Math.min(1, Number(n.progress) || 0)) * 1000) / 10}%`;
      const el = Number.isFinite(n.line) ? els.lyrics.querySelector(`.ln[data-line="${n.line}"]`) : null;
      if (!el) return;
      el.classList.add('ss-now');
      const p = pageOf(el);
      if (p !== s.page) { s.page = p; Fit.page(els.lyrics, s.page); status(); }
    }
    function playing(info) {
      const before = s.now;
      s.now = info && (info.title || info.folder) ? info : null;
      // a song further on in the set: go to it
      if (s.now && !sameSong(s.songs[s.i], s.now)) {
        const k = s.songs.findIndex((song) => sameSong(song, s.now));
        if (k >= 0) { s.i = k; s.page = 0; layout(); return; }
      }
      if (before && !s.now) { lightNow(); return; }
      lightNow();
    }
    function setTheme(theme) {
      s.theme = THEMES.includes(theme) ? theme : 'light';
      rootEl.classList.toggle('dark', s.theme === 'dark');
      rootEl.classList.toggle('ss-t-blue', s.theme === 'blue');
      rootEl.classList.toggle('ss-t-contrast', s.theme === 'contrast');
    }
    function setBlank(on) {
      s.blank = Boolean(on);
      rootEl.classList.toggle('ss-blanked', s.blank);
    }
    function status() {
      const parts = [];
      if (s.songs.length > 1) parts.push(`Song ${s.i + 1} of ${s.songs.length}`);
      if (s.pages > 1) parts.push(`page ${s.page + 1} of ${s.pages}`);
      els.where.textContent = parts.join(' · ');
      els.dots.innerHTML = s.pages > 1 ? Array.from({ length: s.pages }, (_, k) => `<i class="${k === s.page ? 'on' : ''}"></i>`).join('') : '';
      const next = s.songs[s.i + 1];
      const sizeButton = rootEl.querySelector('.ss-size');
      if (sizeButton) sizeButton.textContent = s.size === 'same' ? 'Same size' : 'Fit each song';
      if (els.goto) {
        const options = s.sections.length > 1 ? `<option value="">Go to…</option>${s.sections.map((x, k) => `<option value="${k}">${k < 9 ? `${k + 1}. ` : ''}${esc(x.label)}</option>`).join('')}` : '';
        if (els.goto.innerHTML !== options) els.goto.innerHTML = options;
        els.goto.value = '';
      }
      onState({ index: s.i, count: s.songs.length, page: s.page, pages: s.pages, title: s.songs[s.i]?.title || '', next: next ? next.title : '', px: s.result?.px, cols: s.result?.cols, mode: s.result?.mode, size: s.size, same: s.same, theme: s.theme, blank: s.blank, sections: s.sections });
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
      else if (k === '+' || k === '=') { if (s.size === 'same') s.same = Math.min(SAME.max, s.same + SAME.step); else s.minPx = Math.min(40, s.minPx + 1); layout(); }
      else if (k === '-' || k === '_') { if (s.size === 'same') s.same = Math.max(SAME.min, s.same - SAME.step); else s.minPx = Math.max(12, s.minPx - 1); layout(); }
      else if (k === 's' || k === 'S') { s.size = s.size === 'same' ? 'fit' : 'same'; s.page = 0; layout(); }
      else if (k === 'm' || k === 'M') { s.mode = s.result && s.result.mode === 'inline' ? 'over' : 'inline'; s.page = 0; layout(); } // flips what's shown
      else if (k === 'd' || k === 'D') { setTheme(THEMES[(THEMES.indexOf(s.theme) + 1) % THEMES.length]); status(); }
      else if (k === 'b' || k === 'B' || k === '.') { setBlank(!s.blank); status(); }
      else if (/^[1-9]$/.test(k)) toSection(Number(k) - 1);
      else if (/^#\d+$/.test(k)) toSection(Number(k.slice(1)));
      else if (k === 'c' || k === 'C') { s.hideCommon = !s.hideCommon; layout(); }
      else if (k === 'Escape') onClose();
      else return false;
      return true;
    }
    // click or tap: the right two-thirds go on, the left third goes back
    const onClick = (e) => {
      if (s.blank) { setBlank(false); status(); return; } // a tap brings the words back
      if (e.target.closest && e.target.closest('.ss-goto')) return;
      if (e.target.closest && e.target.closest('.ss-playbtn')) { onPlay({ index: s.i, playing: Boolean(s.now && sameSong(s.songs[s.i], s.now)) }); return; }
      if (e.target.closest && e.target.closest('.ss-x')) { onClose(); return; }
      if (e.target.closest && e.target.closest('.ss-size')) { key('S'); return; }
      const r = rootEl.getBoundingClientRect();
      go(e.clientX - r.left > r.width / 3 ? 1 : -1);
    };
    rootEl.addEventListener('click', onClick);
    if (els.goto) els.goto.addEventListener('change', () => { if (els.goto.value !== '') toSection(Number(els.goto.value)); });
    // 4.74: keep the screen awake while it's up (no screen saver mid-song); asked again when the
    // page comes back into view, as the browser lets it go when hidden
    let wake = null;
    const keepAwake = async () => {
      try { if (!wake && doc.visibilityState === 'visible' && navigator.wakeLock) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (_e) { /* not allowed here: fine */ }
    };
    const onVisible = () => { if (s.songs.length) keepAwake(); };
    doc.addEventListener('visibilitychange', onVisible);
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
      if (data.size) s.size = data.size === 'same' ? 'same' : 'fit';
      if (Number(data.same)) s.same = Math.max(SAME.min, Math.min(SAME.max, Number(data.same)));
      setTheme(data.theme || (data.dark ? 'dark' : s.theme));
      setBlank(false);
      layout();
      keepAwake();
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
    function destroy() { try { if (wake) wake.release(); } catch (_e) { /* gone */ } wake = null; doc.removeEventListener('visibilitychange', onVisible); ro.disconnect(); rootEl.removeEventListener('click', onClick); rootEl.removeEventListener('mousemove', onMove); clearTimeout(hintTimer); clearTimeout(resizeTimer); rootEl.innerHTML = ''; }
    return { show, key, playing, layout, check, destroy, state: s, get minPx() { return s.minPx; } };
  }

  const api = { create, nowFrom, CSS, SAME, THEMES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeSessionScreen = api;
}(typeof window !== 'undefined' ? window : globalThis));
