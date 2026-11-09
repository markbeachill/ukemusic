// Sung words (4.45; one copy since 4.75): while a song plays, the words of the line being sung are
// coloured one by one (a word as soon as it's begun), so a line that wraps onto two rows fills
// along the first row and then the second, as you read it. Used by the desktop app's sheet and
// the web player's.
//
//   const sung = UkeSungWords.create()
//   sung.show(root, lineNo, fraction)   colour the words of source line lineNo, 0–1 of the way
//   sung.clear(root)                    none coloured
//
// The words of a line (.line-group[data-line] → .lyrics / .inline-line, from src/renderer-html.js)
// are put in <span class="w"> the first time it plays (again after the sheet redraws); chords,
// labels and bar lines are left alone. The colour itself is the page's CSS (.w.sung).
(function (root) {
  const SKIP = '.ichord, .inline-label, .repeat-mark, .bar, .chord';

  /** The words of a line, each in its own span (made the first time) */
  function wordsOf(host, lineNo) {
    const doc = host.ownerDocument || host;
    const words = [];
    for (const group of host.querySelectorAll(`.line-group[data-line="${lineNo}"]`)) {
      for (const box of group.querySelectorAll('.lyrics, .inline-line')) {
        if (!box.dataset.words) {
          const walker = doc.createTreeWalker(box, 4 /* text */, { acceptNode: (n) => (n.parentElement && n.parentElement.closest(SKIP) ? 2 : 1) });
          const texts = [];
          while (walker.nextNode()) texts.push(walker.currentNode);
          for (const t of texts) {
            const parts = t.textContent.split(/([\s ]+)/).filter(Boolean);
            if (!parts.some((x) => x.trim())) continue;
            const frag = doc.createDocumentFragment();
            for (const part of parts) {
              if (!part.replace(/[\s ]+/g, '')) { frag.appendChild(doc.createTextNode(part)); continue; }
              const span = doc.createElement('span');
              span.className = 'w';
              span.textContent = part;
              frag.appendChild(span);
            }
            t.replaceWith(frag);
          }
          box.dataset.words = '1';
        }
        words.push(...box.querySelectorAll('.w'));
      }
    }
    return words;
  }

  function create() {
    const sung = { key: '', words: [], letters: 0 };
    function show(host, lineNo, fraction) {
      if (!host) return;
      if (sung.key !== String(lineNo) || !sung.words.length || !sung.words[0].isConnected) {
        sung.key = String(lineNo);
        sung.words = wordsOf(host, lineNo);
        sung.letters = sung.words.reduce((a, w) => a + w.textContent.length, 0);
      }
      const reach = Math.max(0, Math.min(1, fraction)) * sung.letters;
      let at = 0;
      for (const w of sung.words) {
        w.classList.toggle('sung', at < reach - 1e-6);
        at += w.textContent.length;
      }
    }
    function clear(host) {
      if (host) for (const w of host.querySelectorAll('.w.sung')) w.classList.remove('sung');
      sung.key = '';
      sung.words = [];
    }
    return { show, clear };
  }

  const api = { create, wordsOf, SKIP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeSungWords = api;
}(typeof window !== 'undefined' ? window : globalThis));
