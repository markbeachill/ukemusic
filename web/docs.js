// The project's documents as pages of the website: run by web/make.js (so on every website
// build), it writes site/guide.html, site/chordpro.html and site/changes.html from WRITING.md,
// CHORDPRO.md and CHANGELOG.md, in the website's own look. The .md files stay the originals;
// the pages are made fresh each time (and aren't kept in git).
const fs = require('fs');
const path = require('path');
const { markdownToHtml } = require('../src/guide');

const APP = path.join(__dirname, '..');
const SITE = path.join(APP, 'site');
const REPO = (() => {
  const r = require(path.join(APP, 'package.json')).repository;
  const url = typeof r === 'string' ? r : (r && r.url) || '';
  return url.replace(/^git\+/, '').replace(/\.git$/, '') || 'https://github.com/markbeachill/ukemusic';
})();

const PAGES = [
  { md: 'WRITING.md', html: 'guide.html', title: 'How to write songs', nav: 'Song guide', blurb: 'Everything you can type in a ukemusic song, with examples. The same guide is in the app: Write → How to write.', ownIntro: true },
  { md: 'CHORDPRO.md', html: 'chordpro.html', title: 'ukemusic and ChordPro', nav: 'ChordPro', blurb: 'What ukemusic does with ChordPro files, what it writes, and what it adds.' },
  { md: 'CHANGELOG.md', html: 'changes.html', title: "What's new", nav: "What's new", blurb: 'The changes in each version, newest first.' },
  { md: 'docs/explanation/how-learn-works.md', html: 'learn.html', title: 'How Learn works', nav: 'Learn', blurb: 'What the Learn tab works out from a song, how it helps you practise, and how far to trust it.' }
];
const BY_MD = Object.fromEntries(PAGES.map((p) => [p.md, p.html]));

/** A link in a document: the other documents' pages, the rest of the repository on GitHub.
 *  base: the folder of the document the link is in (a link is relative to it, as on GitHub) */
function href(url, base = '') {
  if (/^(https?:|mailto:|#)/.test(url)) return url;
  const [rel, hash] = url.split('#');
  const file = base ? path.posix.normalize(path.posix.join(base, rel)) : rel;
  if (BY_MD[file]) return BY_MD[file] + (hash ? `#guide-${hash}` : '');
  return `${REPO}/blob/main/${encodeURI(file)}${hash ? `#${hash}` : ''}`;
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(p, html, sections, siteCss) {
  const nav = PAGES.map((x) => `<a href="${x.html}"${x === p ? ' aria-current="page"' : ''}>${esc(x.nav)}</a>`).join('');
  // the changelog's contents list is its versions; the others, their sections
  const toc = sections.length > 2 ? `<nav class="toc" aria-label="On this page"><p>On this page</p>${sections.map((s) => `<a href="#guide-${s.id}">${esc(s.title)}</a>`).join('')}</nav>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} · ukemusic</title>
<meta name="description" content="${esc(p.blurb)}">
<link rel="icon" href="img/icon-64.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Figtree:wght@400;500;600;700;800&display=swap">
<style>
${siteCss}
/* documents */
.doc-wrap { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 48px; padding: 40px 0 72px; }
@media (max-width: 900px) { .doc-wrap { grid-template-columns: 1fr; gap: 0; padding-top: 24px; } .toc { display: none; } }
@media (max-width: 720px) { .top .wrap { gap: 12px; } nav.links { gap: 14px; font-size: 14px; } nav.links .opt { display: none; } }
@media (max-width: 420px) { .brand { font-size: 0; gap: 0; } }
.toc { position: sticky; top: 84px; align-self: start; max-height: calc(100vh - 110px); overflow-y: auto; display: grid; gap: 2px; font-size: 14px; }
.toc p { margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.toc a { color: var(--muted); text-decoration: none; padding: 3px 0; line-height: 1.35; }
.toc a:hover { color: var(--teal); }
.doc { min-width: 0; max-width: 820px; }
.doc .lede { color: var(--muted); margin: 0 0 28px; }
.doc h1 { font-size: clamp(32px, 4vw, 44px); line-height: 1.1; letter-spacing: -0.02em; margin: 0 0 8px; }
.doc h2 { font-size: 26px; letter-spacing: -0.01em; margin: 48px 0 12px; padding-top: 12px; border-top: 1px solid var(--line); scroll-margin-top: 80px; }
.doc h3 { font-size: 19px; margin: 30px 0 8px; scroll-margin-top: 80px; }
.doc h4 { font-size: 16px; margin: 22px 0 6px; }
.doc p, .doc li { line-height: 1.65; }
.doc ul { padding-left: 22px; }
.doc li { margin: 4px 0; }
.doc a { color: var(--teal); }
.doc code { font: 0.92em var(--mono); background: var(--teal-soft); color: var(--ink); padding: 1px 5px; border-radius: 5px; overflow-wrap: anywhere; }
.doc pre { font: 15px/1.5 var(--mono); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; overflow-x: auto; }
.doc table { border-collapse: collapse; width: 100%; margin: 14px 0 20px; font-size: 15.5px; display: block; overflow-x: auto; }
.doc th, .doc td { text-align: left; vertical-align: top; padding: 8px 12px; border-bottom: 1px solid var(--line); }
.doc th { font-weight: 700; background: var(--paper); }
nav.links a[aria-current] { color: var(--ink); }
.source { margin-top: 48px; font-size: 14px; color: var(--muted); }
</style>
</head>
<body>
<header class="top">
  <div class="wrap">
    <a class="brand" href="./"><img src="img/icon-64.png" alt="">ukemusic</a>
    <nav class="links">${nav}<a class="opt" href="./#download">Download</a></nav>
  </div>
</header>
<main class="wrap doc-wrap">
  ${toc || '<div></div>'}
  <article class="doc">
${p.ownIntro ? html : html.replace(/^<h1[^>]*>.*?<\/h1>/, (h) => `${h}\n<p class="lede">${esc(p.blurb)}</p>`)}
    <p class="source">This page is made from <a href="${REPO}/blob/main/${p.md}">${p.md}</a> in the ukemusic repository.</p>
  </article>
</main>
<footer>
  <div class="wrap">
    <span>ukemusic by Mark Beachill · MIT licence · <a href="${REPO}">ukemusic on GitHub</a></span>
    <button class="theme" id="theme" type="button">Light / dark</button>
  </div>
</footer>
<script>
(() => {
  const root = document.documentElement;
  try { const t = localStorage.getItem('ukemusic-site-theme'); if (t) root.dataset.theme = t; } catch (_e) { /* not kept */ }
  document.getElementById('theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ukemusic-site-theme', root.dataset.theme); } catch (_e) { /* not kept */ }
  });
})();
</script>
</body>
</html>
`;
}

function build() {
  const index = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const siteCss = index.slice(index.indexOf('<style>') + 7, index.indexOf('</style>'));
  for (const p of PAGES) {
    const md = fs.readFileSync(path.join(APP, p.md), 'utf8');
    const base = path.posix.dirname(p.md) === '.' ? '' : path.posix.dirname(p.md);
    const { html, sections } = markdownToHtml(md, { href: (u) => href(u, base), nested: true });
    fs.writeFileSync(path.join(SITE, p.html), page(p, html, sections, siteCss));
  }
  return PAGES.map((p) => p.html);
}

module.exports = { build, PAGES, href };
if (require.main === module) console.log('pages:', build().join(', '));
