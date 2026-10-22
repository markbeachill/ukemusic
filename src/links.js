// Links (4.19): web pages that go with a song — the original on YouTube, a uke play-along,
// a lesson, the Wikipedia page. Kept in links.txt in the song's folder, one per line:
//   Original recording | https://www.youtube.com/watch?v=…
// Pure apart from read/write; unit tested.
const fs = require('fs');
const path = require('path');

const LINKS_FILE = 'links.txt';

/** A web address, tidied: "youtube.com/x" -> "https://youtube.com/x"; not one -> '' */
function cleanUrl(text) {
  let url = String(text || '').trim();
  if (!url) return '';
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) return '';
    return u.toString();
  } catch (_e) {
    return '';
  }
}

/** The YouTube video id in a link, or '' */
function youtubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return u.pathname.slice(1).split('/')[0] || '';
    if (host === 'youtube.com' || host === 'music.youtube.com') {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/);
      return m ? m[1] : '';
    }
  } catch (_e) { /* not a link */ }
  return '';
}

/** What a link is: { kind: 'youtube' | 'wikipedia' | 'web', site } */
function linkKind(url) {
  if (youtubeId(url)) return { kind: 'youtube', site: 'YouTube' };
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (_e) { /* none */ }
  if (/(^|\.)wikipedia\.org$/.test(host)) return { kind: 'wikipedia', site: 'Wikipedia' };
  return { kind: 'web', site: host };
}

/** links.txt text -> [{ title, url }] (lines without a link are skipped) */
function parseLinks(text) {
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const bar = line.lastIndexOf('|');
    const title = bar >= 0 ? line.slice(0, bar).trim() : '';
    const url = cleanUrl(bar >= 0 ? line.slice(bar + 1) : line);
    if (url) out.push({ title, url });
  }
  return out;
}

/** [{ title, url }] -> links.txt text */
function formatLinks(links) {
  return (links || [])
    .filter((l) => cleanUrl(l.url))
    .map((l) => `${String(l.title || '').replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()}${l.title ? ' | ' : ''}${cleanUrl(l.url)}`)
    .join('\n') + ((links || []).length ? '\n' : '');
}

/** A title when none is given: "YouTube video", "Wikipedia: Mull of Kintyre", or the site */
function defaultTitle(url) {
  const k = linkKind(url);
  if (k.kind === 'youtube') return 'YouTube video';
  if (k.kind === 'wikipedia') {
    try {
      const page = decodeURIComponent(new URL(url).pathname.split('/').pop() || '').replace(/_/g, ' ');
      return page ? `Wikipedia: ${page}` : 'Wikipedia';
    } catch (_e) { return 'Wikipedia'; }
  }
  return k.site || url;
}

function readLinks(folder) {
  try {
    return parseLinks(fs.readFileSync(path.join(folder, LINKS_FILE), 'utf8'));
  } catch (_e) {
    return [];
  }
}

function writeLinks(folder, links) {
  const file = path.join(folder, LINKS_FILE);
  const text = formatLinks(links);
  if (!text.trim()) {
    if (fs.existsSync(file)) fs.writeFileSync(file, '', 'utf8');
    return [];
  }
  require('./safe-write').writeFileSafe(file, text);
  return parseLinks(text);
}

module.exports = { LINKS_FILE, cleanUrl, youtubeId, linkKind, parseLinks, formatLinks, defaultTitle, readLinks, writeLinks };
