// Club touches on printed sheets (4.76), for the desktop app and the web player:
//   - your club's logo at the top of each sheet, and on a songbook's cover
//   - "Updated 9 Nov 2026" at the foot, so a club can tell which copy is the newest
//   - a cover page for a songbook
//   - how many pages a sheet will print on, while you work (pageCount, in the page)
// Pure apart from pageCount (which lays the sheet out in a hidden frame); unit tested.
(function (root) {
  const esc = (t) => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // A logo: a picture file, kept small (it goes into every sheet)
  const LOGO_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  const LOGO_MAX_BYTES = 1024 * 1024;
  const isLogo = (url) => /^data:image\/(png|jpeg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(String(url || ''));

  /** "9 Nov 2026" (the same everywhere, whatever the computer's language) */
  function formatDate(when) {
    const d = when instanceof Date ? when : new Date(when);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  /** The logo for the top of a sheet ('' with none) */
  function logoHtml(url, { cls = 'club-logo' } = {}) {
    return isLogo(url) ? `<img class="${cls}" src="${url}" alt="">` : '';
  }
  /** "Updated 9 Nov 2026" for the foot of a sheet */
  function updatedHtml(when) {
    const text = formatDate(when);
    return text ? `<p class="sheet-updated">Updated ${esc(text)}</p>` : '';
  }
  /** A songbook's cover: its name, the logo, how many songs, the date */
  function coverHtml({ title = '', logo = '', count = 0, when = new Date(), note = '' } = {}) {
    return `<section class="book-cover">
${isLogo(logo) ? `<img class="cover-logo" src="${logo}" alt="">` : ''}
<h1 class="cover-title">${esc(title)}</h1>
${note ? `<p class="cover-note">${esc(note)}</p>` : ''}
<p class="cover-meta">${count} song${count === 1 ? '' : 's'} · ${esc(formatDate(when))}</p>
</section>`;
  }

  const CSS = `
/* 4.76: club logo, "Updated" date, songbook cover */
.club-logo { float: right; max-height: 64px; max-width: 30%; margin: 0 0 8px 16px; object-fit: contain; }
.sheet-updated { clear: both; margin: 18px 0 0; text-align: right; font: 11px var(--font-family, system-ui, sans-serif); color: #777; }
.book-cover { min-height: 90vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 18px; page-break-after: always; break-after: page; }
.book-cover .cover-logo { max-width: 60%; max-height: 40vh; object-fit: contain; }
.book-cover .cover-title { font-size: 40px; margin: 0; line-height: 1.15; }
.book-cover .cover-note { font-size: 18px; margin: 0; color: #444; }
.book-cover .cover-meta { font-size: 14px; margin: 0; color: #666; }
@media print { .book-cover { min-height: 0; height: calc(100vh - 2px); } }`;

  /** The printable area of a page at 96px an inch, with the PDF's 0.6" margins */
  function pageArea(pageSize = 'A4') {
    const letter = pageSize === 'Letter';
    return { width: Math.round(((letter ? 8.5 : 8.27) - 1.2) * 96), height: Math.round(((letter ? 11 : 11.69) - 1.2) * 96) };
  }
  /** How many pages: the laid-out height over a page's (a song part is never split, so this can be one short) */
  const pagesFor = (heightPx, pageSize = 'A4') => Math.max(1, Math.ceil((heightPx - 4) / pageArea(pageSize).height));

  /**
   * How many pages a whole sheet (an HTML document) will print on: it's laid out, unseen, at the
   * page's width. In the page only (desktop renderer, web player). Resolves to a number, or 0.
   */
  function pageCount(html, { pageSize = 'A4', doc = root.document } = {}) {
    return new Promise((resolve) => {
      if (!doc || !doc.body) { resolve(0); return; }
      const { width, height } = pageArea(pageSize);
      const frame = doc.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${width}px;height:${height}px;border:0;visibility:hidden;pointer-events:none`;
      let done = false;
      const finish = (n) => { if (done) return; done = true; frame.remove(); resolve(n); };
      frame.onload = async () => {
        try {
          const d = frame.contentDocument;
          // print rules (no screen-only extras), as the PDF is made
          const style = d.createElement('style');
          style.textContent = 'html, body { overflow: visible !important; height: auto !important; }';
          d.head.appendChild(style);
          if (d.fonts && d.fonts.ready) await d.fonts.ready;
          finish(pagesFor(Math.max(d.documentElement.scrollHeight, d.body.scrollHeight), pageSize));
        } catch (_e) { finish(0); }
      };
      setTimeout(() => finish(0), 8000);
      frame.srcdoc = html;
      doc.body.appendChild(frame);
    });
  }

  const api = { formatDate, logoHtml, updatedHtml, coverHtml, isLogo, pageArea, pagesFor, pageCount, CSS, LOGO_TYPES, LOGO_MAX_BYTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeSheetExtras = api;
}(typeof window !== 'undefined' ? window : globalThis));
