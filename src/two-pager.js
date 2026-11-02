// The Stage copy on two pages (4.54): the song laid out to fit two pages, for a music stand with
// no page to turn. Runs in the page that prints it (main.js renderPdf, printStyle 'stage2'):
// main.js runs this file there, then calls UkeTwoPager.fit(...).
//
// The document holds the song more than once (renderer: twoPagerDocument): each version is a
// <div class="tp-variant" data-cols="1|2" data-once="0|1">, the same song laid out for one column
// or two, and with every chorus, or repeated choruses as "as before". fit() tries, in order, and
// keeps the first that fits on two pages:
//   1. one column, the usual spacing, the text as big as it will go (down to the smallest size);
//   2. one column, the gaps closed up (blank lines gone, less space between parts);
//   3. two columns a page, gaps closed;
//   4. the same with repeated choruses printed once (if the song has any), one column then two.
// At each step the text is the biggest size, in half-pixel steps, that fits. A part (verse,
// chorus…) is never split across columns or pages unless it's taller than a whole column.
// If nothing fits even at the smallest size, it takes the fewest pages it can.
//   -> { cols, once, spacing, px, pages, fits }   and the page is left laid out that way.
(function (root) {
  const GUTTER = 22; // between the two columns (px)

  // The blocks a version is made of: what comes before the first part (title, chord shapes,
  // strum) spans the page at the top of page 1; then each part; then the shorthand key, if any.
  function blocksOf(variant) {
    const head = [];
    const parts = [];
    let seenPart = false;
    for (const el of [...variant.children]) {
      if (el.matches('.song-section')) { seenPart = true; parts.push(el); } else if (!seenPart) head.push(el); else parts.push(el);
    }
    return { head, parts };
  }

  // How tall each element is, laid out in a column this wide (with its margins)
  function heights(nodes, width, probe) {
    probe.style.width = `${width}px`;
    probe.replaceChildren(...nodes.map((n) => n.cloneNode(true)));
    const out = [];
    let last = probe.getBoundingClientRect().top;
    // the space each one takes, margins and all, measured from one to the next
    const marker = document.createElement('div');
    marker.style.cssText = 'height:0;margin:0;padding:0;clear:both';
    probe.append(marker);
    const kids = [...probe.children];
    for (let i = 0; i < kids.length - 1; i += 1) {
      const next = kids[i + 1].getBoundingClientRect().top;
      out.push(Math.max(0, next - last));
      last = next;
    }
    return out;
  }

  // A part taller than a column is split between its lines (its heading stays with the first)
  function splitPart(part, width, colH, probe) {
    const lines = [...part.children];
    const hs = heights(lines, width, probe);
    const pieces = [];
    let cur = [];
    let h = 0;
    lines.forEach((line, i) => {
      if (cur.length && h + hs[i] > colH && !(cur.length === 1 && cur[0].matches('h2, h3, .section'))) {
        pieces.push(cur); cur = []; h = 0;
      }
      cur.push(line); h += hs[i];
    });
    if (cur.length) pieces.push(cur);
    return pieces.map((nodes) => {
      const piece = part.cloneNode(false);
      piece.classList.add('tp-piece');
      piece.append(...nodes.map((n) => n.cloneNode(true)));
      return piece;
    });
  }

  /** Lay a version out in pages: [{ head: [nodes], cols: [[nodes]...] }] */
  function pack(variant, { W, H, cols, probe }) {
    const { head, parts } = blocksOf(variant);
    const colW = cols === 2 ? Math.floor((W - GUTTER) / 2) : W;
    const headH = head.length ? heights(head, W, probe).reduce((a, b) => a + b, 0) : 0;
    let blocks = parts.map((p) => p.cloneNode(true));
    let hs = heights(blocks, colW, probe);
    // split anything taller than a whole column
    const fullH = H;
    const out = [];
    blocks.forEach((b, i) => {
      if (hs[i] > fullH - 4 && b.matches('.song-section')) for (const piece of splitPart(b, colW, fullH - 8, probe)) out.push(piece);
      else out.push(b);
    });
    blocks = out;
    hs = heights(blocks, colW, probe);
    const pages = [];
    let page = { head: head.map((n) => n.cloneNode(true)), cols: [[]], room: H - headH };
    let colRoom = page.room;
    pages.push(page);
    blocks.forEach((b, i) => {
      if (hs[i] > colRoom && page.cols[page.cols.length - 1].length) {
        if (page.cols.length < cols) { page.cols.push([]); colRoom = page.room; } else {
          page = { head: [], cols: [[]], room: H };
          pages.push(page);
          colRoom = H;
        }
      }
      page.cols[page.cols.length - 1].push(b);
      colRoom -= hs[i];
    });
    return { pages, colW };
  }

  function setSize(px, spacing) {
    document.documentElement.style.setProperty('--stage-size', `${px}px`);
    document.documentElement.dataset.tpSpacing = spacing;
  }

  function fit({ W, H, minPx = 16, maxPx = 20 } = {}) {
    const variants = [...document.querySelectorAll('.tp-variant')];
    const probe = document.createElement('div');
    probe.className = 'tp-probe';
    document.body.append(probe);
    const find = (cols, once) => variants.find((v) => Number(v.dataset.cols) === cols && v.dataset.once === once) || null;
    const hasOnce = variants.some((v) => v.dataset.once === '1');
    const steps = [
      { cols: 1, once: '0', spacing: 'normal' },
      { cols: 1, once: '0', spacing: 'tight' },
      { cols: 2, once: '0', spacing: 'tight' }
    ];
    if (hasOnce) steps.push({ cols: 1, once: '1', spacing: 'tight' }, { cols: 2, once: '1', spacing: 'tight' });
    const pagesAt = (step, px) => {
      setSize(px, step.spacing);
      return pack(find(step.cols, step.once), { W, H, cols: step.cols, probe }).pages.length;
    };
    let chosen = null;
    for (const step of steps) {
      if (!find(step.cols, step.once)) continue;
      if (pagesAt(step, minPx) > 2) continue;
      // the biggest text that still fits on two pages (half-pixel steps)
      let lo = minPx;
      let hi = maxPx;
      if (pagesAt(step, hi) <= 2) lo = hi;
      while (hi - lo > 0.5) {
        const mid = Math.round(((lo + hi) / 2) * 2) / 2;
        if (pagesAt(step, mid) <= 2) lo = mid; else hi = mid;
      }
      chosen = { ...step, px: lo };
      break;
    }
    if (!chosen) {
      // too long for two pages even at the smallest size: the fewest pages
      let best = null;
      for (const step of steps) {
        if (!find(step.cols, step.once)) continue;
        const n = pagesAt(step, minPx);
        if (!best || n < best.n) best = { ...step, px: minPx, n };
      }
      chosen = best;
    }
    setSize(chosen.px, chosen.spacing);
    const { pages, colW } = pack(find(chosen.cols, chosen.once), { W, H, cols: chosen.cols, probe });
    probe.remove();
    // the pages themselves, in place of the versions
    const book = document.createElement('div');
    book.className = 'tp-book';
    for (const p of pages) {
      const el = document.createElement('div');
      el.className = 'tp-page';
      el.style.height = `${H}px`;
      if (p.head.length) {
        const head = document.createElement('div');
        head.className = 'tp-head';
        head.append(...p.head);
        el.append(head);
      }
      const row = document.createElement('div');
      row.className = `tp-cols tp-cols-${chosen.cols}`;
      row.style.gap = `${GUTTER}px`;
      for (const c of p.cols) {
        const col = document.createElement('div');
        col.className = 'tp-col';
        col.style.width = `${colW}px`;
        col.append(...c);
        row.append(col);
      }
      el.append(row);
      book.append(el);
    }
    for (const v of variants) v.remove();
    document.body.append(book);
    // anything wider than its column (a strum box, a long tab line) is scaled down to fit it
    for (const col of book.querySelectorAll('.tp-col')) {
      for (const el of col.querySelectorAll('.strum-box, pre, table, .tab-block')) {
        const w = el.getBoundingClientRect().width;
        if (w > colW + 1) el.style.zoom = String(Math.max(0.5, colW / w));
      }
    }
    return { cols: chosen.cols, once: chosen.once === '1', spacing: chosen.spacing, px: chosen.px, pages: pages.length, fits: pages.length <= 2 };
  }

  const api = { fit, pack, GUTTER };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeTwoPager = api;
})(typeof window !== 'undefined' ? window : globalThis);
