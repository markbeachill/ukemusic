// The "How to write" guide (WRITING.md) as HTML for the app's help window.
// A small Markdown reader for what the guide uses: headings, paragraphs, lists, tables,
// code blocks (``` and ````), `code`, **bold** and [links](…) (shown as plain text).
// Pure functions: unit tested.

const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function inline(text, options = {}) {
  // code spans first, so nothing inside them is changed
  const parts = String(text).split(/(`[^`]+`)/g);
  return parts.map((part) => {
    if (/^`[^`]+`$/.test(part)) return `<code>${escapeHtml(part.slice(1, -1).trim() || part.slice(1, -1))}</code>`;
    return escapeHtml(part)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*\w])\*([^*\s][^*]*)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (all, label, url) => (options.href ? `<a href="${escapeHtml(options.href(url.replace(/&amp;/g, '&')))}">${label}</a>` : label));
  }).join('');
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Markdown -> { html, sections: [{ id, title }] }
 *   options.href(url)  links become <a href=…> (the app shows them as plain text)
 *   options.nested     indented list items make a list inside the item above
 */
function markdownToHtml(markdown, options = {}) {
  const inl = (t) => inline(t, options);
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  const sections = [];
  let i = 0;
  let para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inl(para.join(' '))}</p>`);
    para = [];
  };
  const cells = (row) => row.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^(`{3,})(\w*)\s*$/);
    if (fence) {
      flush();
      const body = [];
      i += 1;
      while (i < lines.length && !new RegExp(`^${fence[1]}\\s*$`).test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      out.push(`<pre class="guide-code">${escapeHtml(body.join('\n'))}</pre>`);
      i += 1;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flush();
      const level = heading[1].length;
      const id = slug(heading[2]);
      if (level === 2) sections.push({ id, title: heading[2] });
      out.push(`<h${level} id="guide-${id}">${inl(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^---+\s*$/.test(line)) {
      flush();
      i += 1;
      continue;
    }
    if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      flush();
      const head = cells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        rows.push(cells(lines[i]));
        i += 1;
      }
      out.push(`<table class="guide-table"><thead><tr>${head.map((c) => `<th>${inl(c)}</th>`).join('')}</tr></thead>`
        + `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inl(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      flush();
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const sub = options.nested && items.length && /^\s{2,}[-*]\s+/.test(lines[i]);
        let item = lines[i].replace(/^\s*[-*]\s+/, '');
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i])) {
          item += ` ${lines[i].trim()}`;
          i += 1;
        }
        if (sub) items[items.length - 1].sub.push(item);
        else items.push({ text: item, sub: [] });
      }
      out.push(`<ul>${items.map((t) => `<li>${inl(t.text)}${t.sub.length ? `<ul>${t.sub.map((x) => `<li>${inl(x)}</li>`).join('')}</ul>` : ''}</li>`).join('')}</ul>`);
      continue;
    }
    if (!line.trim()) {
      flush();
      i += 1;
      continue;
    }
    para.push(line.trim());
    i += 1;
  }
  flush();
  return { html: out.join('\n'), sections };
}

/** The guide, read from WRITING.md beside the app */
function writingGuide() {
  const candidates = [path.join(__dirname, '..', 'WRITING.md'), path.join(process.resourcesPath || '', 'WRITING.md')];
  for (const file of candidates) {
    try {
      return markdownToHtml(fs.readFileSync(file, 'utf8'));
    } catch (_err) { /* try the next */ }
  }
  return { html: '<p>The guide (WRITING.md) could not be found.</p>', sections: [] };
}

module.exports = { markdownToHtml, writingGuide };
