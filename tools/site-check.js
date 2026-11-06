#!/usr/bin/env node
// Checks the finished website before it is published: every page, whatever made it, against the
// rules search engines check (Bing's Site Scan, Google Search Console). GitHub runs it after
// building the site (.github/workflows/web.yml): if a page fails, the website isn't updated and
// the problem is listed in the run.
//
//   npm run site-check            the site as built here (node web/make.js first)
//   node tools/site-check.js _site   a folder put together as GitHub publishes it
//
// What it checks, on each page:
//   - a title of 25 to 70 characters, and a description of 50 to 160 (no two pages the same)
//   - a canonical address, which is the page's own address; the page's language
//   - one main heading (h1)
//   - every picture has alt text
//   - every link and file on the site that the page points to is there
// and that the sitemap lists every page, and only pages that are there.
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE_URL = 'https://markbeachill.github.io/ukemusic/';
const LIMITS = { title: [25, 70], description: [50, 160] };

const decode = (t) => String(t)
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');

/** The page without its scripts, styles and comments: what a search engine reads as the page */
function visible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '');
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null;
}

function listPages(root) {
  const out = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) out.push(full);
    }
  })(root);
  return out.sort();
}

/** The page's address on the website (folder/index.html is folder/) */
function pageUrl(root, file) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  return SITE_URL + rel.replace(/(^|\/)index\.html$/, '$1');
}

/** Where a link from a page leads in the site folder, or null when it leads elsewhere */
function target(root, file, href) {
  let ref = href.trim();
  if (!ref || /^(#|mailto:|tel:|data:|javascript:|blob:)/i.test(ref)) return null;
  if (ref.startsWith(SITE_URL)) ref = '/' + ref.slice(SITE_URL.length);
  else if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(ref)) return null;          // another website
  ref = ref.replace(/[?#].*$/, '');
  if (!ref) return null;
  let full;
  try { ref = decodeURIComponent(ref); } catch (_e) { /* keep it as it is */ }
  if (ref.startsWith('/ukemusic/')) full = path.join(root, ref.slice('/ukemusic/'.length));
  else if (ref.startsWith('/')) full = path.join(root, ref.slice(1));
  else full = path.join(path.dirname(file), ref);
  if (ref.endsWith('/') || (fs.existsSync(full) && fs.statSync(full).isDirectory())) full = path.join(full, 'index.html');
  return full;
}

function checkSite(root) {
  const problems = [];
  const add = (file, text) => problems.push(`${file ? path.relative(root, file).split(path.sep).join('/') : 'the site'}: ${text}`);
  const pages = listPages(root);
  if (!pages.length) return [`no pages in ${root}`];
  const seen = { title: new Map(), description: new Map() };

  for (const file of pages) {
    const html = fs.readFileSync(file, 'utf8');
    const page = visible(html);
    const head = page; // title, description and canonical: in the page itself, not in its scripts

    const title = (head.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
    const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
    const descTag = metas.find((t) => (attr(t, 'name') || '').toLowerCase() === 'description');
    const description = descTag ? attr(descTag, 'content') : null;
    for (const [kind, value] of [['title', title], ['description', description]]) {
      if (value == null || !decode(value).trim()) { add(file, `no ${kind}`); continue; }
      const text = decode(value).replace(/\s+/g, ' ').trim();
      const [min, max] = LIMITS[kind];
      if (text.length < min) add(file, `${kind} too short (${text.length} characters, at least ${min}): ${text}`);
      if (text.length > max) add(file, `${kind} too long (${text.length} characters, at most ${max}): ${text}`);
      if (seen[kind].has(text)) add(file, `the same ${kind} as ${seen[kind].get(text)}`);
      else seen[kind].set(text, path.relative(root, file).split(path.sep).join('/'));
    }

    const canonicalTag = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).find((t) => (attr(t, 'rel') || '').toLowerCase() === 'canonical');
    const canonical = canonicalTag ? attr(canonicalTag, 'href') : null;
    if (!canonical) add(file, 'no canonical address (<link rel="canonical">)');
    else if (canonical !== pageUrl(root, file)) add(file, `the canonical address is ${canonical}, not the page's own (${pageUrl(root, file)})`);

    const htmlTag = (html.match(/<html\b[^>]*>/i) || [''])[0];
    if (!attr(htmlTag, 'lang')) add(file, 'no language (<html lang="en">)');

    const h1 = (page.match(/<h1[\s>]/gi) || []).length;
    if (h1 !== 1) add(file, `${h1} main headings (h1): there should be one`);

    for (const m of page.matchAll(/<img\b[^>]*>/gi)) {
      if (attr(m[0], 'alt') === null) add(file, `a picture with no alt text: ${attr(m[0], 'src') || m[0].slice(0, 80)}`);
    }

    const refs = new Set();
    for (const m of page.matchAll(/<(a|link|img|source|iframe|embed)\b[^>]*>/gi)) {
      for (const name of ['href', 'src']) { const v = attr(m[0], name); if (v) refs.add(v); }
      const set = attr(m[0], 'srcset');
      if (set) for (const part of set.split(',')) refs.add(part.trim().split(/\s+/)[0]);
    }
    for (const m of html.matchAll(/<script\b[^>]*\ssrc\s*=\s*["']([^"']+)["']/gi)) refs.add(m[1]);
    for (const ref of refs) {
      const to = target(root, file, ref);
      if (to && !fs.existsSync(to)) add(file, `a link to something that isn't there: ${ref}`);
    }
  }

  const sitemapFile = path.join(root, 'sitemap.xml');
  if (!fs.existsSync(sitemapFile)) add(null, 'no sitemap.xml');
  else {
    const listed = [...fs.readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]).trim());
    const urls = new Set(pages.map((f) => pageUrl(root, f)));
    for (const url of listed) if (!urls.has(url)) add(sitemapFile, `lists ${url}, which isn't a page`);
    for (const url of urls) if (!listed.includes(url)) add(sitemapFile, `doesn't list ${url}`);
  }
  return problems;
}

/** The site as GitHub publishes it, from what web/make.js built here (site/ and web/out/) */
function assembleLocal(repo) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ukemusic-site-'));
  const app = path.join(repo, 'web', 'out');
  if (!fs.existsSync(path.join(repo, 'site', 'sitemap.xml')) || !fs.existsSync(path.join(app, 'index.html'))) {
    throw new Error('Build the website first: node web/make.js');
  }
  fs.cpSync(path.join(repo, 'site'), out, { recursive: true });
  fs.cpSync(app, path.join(out, 'app'), { recursive: true });
  fs.rmSync(path.join(out, 'app', 'ukemusic-web.html'), { force: true });
  return out;
}

if (require.main === module) {
  let root = process.argv[2];
  let temp = null;
  try {
    if (!root) root = temp = assembleLocal(path.join(__dirname, '..'));
    const problems = checkSite(path.resolve(root));
    const count = listPages(path.resolve(root)).length;
    if (problems.length) {
      console.error(`Site check: ${problems.length} problem${problems.length === 1 ? '' : 's'} in ${count} pages`);
      for (const p of problems) console.error(`  ✗ ${p}`);
      process.exitCode = 1;
    } else {
      console.log(`Site check: all ${count} pages pass`);
    }
  } catch (error) {
    console.error(`Site check: ${error.message}`);
    process.exitCode = 1;
  } finally {
    if (temp) fs.rmSync(temp, { recursive: true, force: true });
  }
}

module.exports = { checkSite, pageUrl, visible, LIMITS, SITE_URL };
