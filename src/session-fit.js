// Session screen fit (4.35): the whole song on one screen, as big as it will go.
// Runs in the page (it measures the laid-out song), in the desktop app and the web player.
//
//   UkeSessionFit.fit({ box, lyrics, strip, html, minPx, maxPx, modes, maxCols })
//     box     the element the words must fit in (its size is the space)
//     lyrics  the element the words go in (inside box)
//     strip   the chord diagrams element (sized here), or null
//     html    mode -> the song's HTML for that mode ('over' | 'inline'), from sessionHtml
//     minPx   the smallest text that's readable here (18px for a TV across a room)
//     maxPx   the largest worth having
//     modes   which to try, in order (chords above first; chords in the words if it can't fit)
//     maxCols the most columns (3)
//     noWrap  4.89 (the music stand view): another column only if no line has to wrap in it;
//     wrapToColumns 4.92.1 (the music stand on a wide screen): with noWrap, when one column would
//             need more pages than columns, the columns win and a long line wraps
//     stripTop 4.90.1 (the music stand view): the chord shapes in a row across the top, on a wide
//             screen too, so the words have the whole width for their columns
//   -> { mode, px, cols, pages, fits }   and lyrics is left laid out that way
//
// How: for one, two and three columns, the largest text (minPx…maxPx) at which every block
// (verse, chorus…) fits without scrolling, blocks never split across columns. The biggest text
// wins; more columns only if that makes the text clearly bigger. If nothing fits even at minPx,
// the song is shown at minPx in pages (as few as possible), turned with UkeSessionFit.page().
(function (root) {
  const MIN_COLUMN_EM = 16; // a column narrower than this many letters wraps too much

  function measure(box) {
    const r = box.getBoundingClientRect();
    return { W: Math.floor(r.width), H: Math.floor(r.height) };
  }

  function fit({ box, lyrics, strip = null, html, minPx = 18, maxPx = 48, modes = ['over', 'inline'], diagramPx = null, maxCols = 3, noWrap = false, wrapToColumns = false, stripTop = false }) {
    // the diagrams first: they take a strip down the side (or across the top on a tall screen)
    if (strip) sizeStrip(box, strip, diagramPx || minPx, stripTop);
    const { W, H } = measure(box);
    const args = { box, lyrics, html, minPx, maxPx, modes, maxCols, W, H };
    if (!noWrap) return layoutSong({ ...args, noWrap: false });
    // 4.92.1, the music stand: columns where no line wraps. But when a long line or two would leave
    // the song in one column, over more pages than columns need (the other half of a laptop's
    // screen empty), the columns win and those lines wrap.
    const strict = layoutSong({ ...args, noWrap: true });
    if (!wrapToColumns || strict.cols > 1 || maxCols < 2 || strict.pages < 2) return strict;
    const loose = layoutSong({ ...args, noWrap: false, fewestCols: 2 });
    if (loose.cols > 1 && loose.pages <= strict.pages) return loose;
    return layoutSong({ ...args, noWrap: true });
  }

  function layoutSong({ lyrics, html, minPx, maxPx, modes, maxCols, W, H, noWrap, fewestCols = 1 }) {
    const gapFor = (px) => Math.round(px * 1.6);
    let widest = null; // { px, width }: the longest line, unwrapped, at that size (for noWrap)
    const widestAt = (px) => {
      if (widest && widest.px === px) return widest.width;
      const keep = lyrics.style.cssText;
      lyrics.style.cssText = `font-size: ${px}px; column-count: 1; width: max-content; height: auto; position: absolute; visibility: hidden;`;
      let width = 0;
      for (const el of lyrics.querySelectorAll('.ln, .ss-strum')) width = Math.max(width, el.getBoundingClientRect().width);
      lyrics.style.cssText = keep;
      widest = { px, width };
      return width;
    };
    const colsOk = (c, px) => {
      const column = (W - (c - 1) * gapFor(px)) / c;
      if (column < px * MIN_COLUMN_EM * 0.55) return false;
      // the music stand's wrapped columns: most lines still whole (a column at least 60% of the longest)
      if (fewestCols > 1 && column < widestAt(px) * 0.6) return false;
      return !noWrap || c === 1 || widestAt(px) <= column;
    };
    const apply = (px, c) => {
      const gap = gapFor(px);
      lyrics.style.fontSize = `${px}px`;
      lyrics.style.columnCount = String(c);
      lyrics.style.columnGap = `${gap}px`;
      lyrics.style.columnWidth = `${Math.floor((W - (c - 1) * gap) / c)}px`;
      lyrics.style.width = `${W}px`;
      lyrics.style.height = `${H}px`;
      lyrics.style.transform = '';
      return gap;
    };
    const fits = (px, c) => { apply(px, c); return lyrics.scrollWidth <= W + 1 && lyrics.scrollHeight <= H + 1; };
    const best = (c) => {
      if (!colsOk(c, minPx) || !fits(minPx, c)) return null;
      let lo = minPx;
      let hi = maxPx;
      while (hi > lo && !colsOk(c, hi)) hi -= 1;
      if (fits(hi, c)) return hi;
      for (let k = 0; k < 9; k += 1) {
        const mid = (lo + hi) / 2;
        if (fits(mid, c)) lo = mid; else hi = mid;
      }
      return Math.floor(lo * 2) / 2;
    };
    let chosen = null;
    for (const mode of modes) {
      lyrics.className = `ss-lyrics ${mode}`;
      lyrics.innerHTML = html(mode);
      widest = null;
      const found = [];
      for (let c = fewestCols; c <= maxCols; c += 1) {
        const px = best(c);
        if (px != null) found.push({ mode, px, cols: c });
      }
      if (found.length) {
        // the biggest text; another column only for text at least 1.5px bigger
        chosen = found.reduce((a, x) => (!a || x.px >= a.px + 1.5 ? x : a), null);
        break;
      }
    }
    let pages = 1;
    if (!chosen) {
      // too long for one screen even at the smallest text: pages, as few as possible
      const mode = modes[modes.length - 1];
      lyrics.className = `ss-lyrics ${mode}`;
      lyrics.innerHTML = html(mode);
      widest = null;
      const pagesAt = (c) => { const gap = apply(minPx, c); return Math.max(1, Math.round((lyrics.scrollWidth + gap) / (W + gap))); };
      let cols = 1;
      if (fewestCols > 1) {
        // the music stand's wrapped columns: the fewest columns for the fewest pages
        pages = Infinity;
        for (let c = fewestCols; c <= maxCols; c += 1) {
          if (!colsOk(c, minPx)) continue;
          const n = pagesAt(c);
          if (n < pages) { pages = n; cols = c; }
        }
        if (pages === Infinity) cols = 1;
      } else {
        for (let c = maxCols; c >= 1; c -= 1) if (colsOk(c, minPx)) { cols = c; break; }
      }
      chosen = { mode, px: minPx, cols };
      pages = pagesAt(cols);
    } else {
      apply(chosen.px, chosen.cols);
    }
    lyrics._stride = W + gapFor(chosen.px);
    return { ...chosen, pages, fits: pages === 1, width: W, height: H };
  }

  /** Show page n (0-based) of a paged song */
  function page(lyrics, n) {
    lyrics.style.transform = n ? `translateX(${-n * (lyrics._stride || 0)}px)` : '';
  }

  /**
   * The chord diagrams: on a wide screen a strip down the right, each as tall as about four lines
   * of the smallest text (so they grow with the screen and stay readable); on a tall screen, a
   * row across the top. Adds columns to the strip when they don't fit down the screen.
   */
  function sizeStrip(box, strip, basePx, top = false) {
    const stage = box.parentElement;
    const r = stage.getBoundingClientRect();
    const tall = top || r.height > r.width * 1.05;
    stage.classList.toggle('ss-tall', tall);
    const cells = [...strip.children];
    if (!cells.length) { strip.hidden = true; return; }
    strip.hidden = false;
    const w = tall ? Math.round(Math.max(52, Math.min(90, r.width / 8))) : Math.round(Math.max(64, Math.min(r.height / 4.2, basePx * 6)));
    for (const svg of strip.querySelectorAll('svg')) { svg.style.width = `${w}px`; svg.style.height = 'auto'; }
    if (tall) { strip.style.gridTemplateColumns = ''; return; }
    const cellH = w * 1.35 + basePx * 1.2;
    const cols = Math.max(1, Math.ceil(cells.length * cellH / Math.max(1, r.height - 16)));
    strip.style.gridTemplateColumns = `repeat(${cols}, ${w + 8}px)`;
  }

  const api = { fit, page, sizeStrip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeSessionFit = api;
}(typeof window !== 'undefined' ? window : globalThis));
