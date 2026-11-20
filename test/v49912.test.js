// 4.99.12: Setlists → Gig check: the set in order with key and capo, and what to look at first
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { gigCheck } = require('../src/gig-check');
const INSTRUMENTS = require('../src/instruments').INSTRUMENTS;
let n = 0;
const t = (name, fn) => { fn(); n++; };

const song = (title, key, extra = {}) => ({ folder: `/songs/${title}`, key, versions: [], ...extra });

t('key and capo for each song, a saved key from its version', () => {
  const r = gigCheck({ entries: [
    { title: 'A', shift: 0, song: song('A', 'C'), capo: 0 },
    { title: 'B (in F)', shift: 5, song: song('B', 'C', { versions: [{ semitones: 5, key: 'F' }] }), capo: 0 }
  ] });
  assert.deepStrictEqual(r.rows.map((x) => [x.n, x.key, x.capo]), [[1, 'C', 0], [2, 'F', 0]]);
  assert.strictEqual(r.problems, 0);
  assert.strictEqual(r.summary, '2 songs: all ready.');
});

t('a missing song, one in twice, another instrument and a page turn are problems; a capo change is a note', () => {
  const r = gigCheck({ instrument: 'soprano', instruments: INSTRUMENTS, minPx: 20, entries: [
    { title: 'A', song: song('A', 'G'), capo: 0, fit: { pages: 1, px: 40 } },
    { title: 'B', song: song('B', 'D'), capo: 2, fit: { pages: 2, px: 20 } },
    { title: 'Gone', song: null },
    { title: 'A', song: song('A', 'G'), capo: 0, instrument: 'baritone', fit: { pages: 1, px: 21 } }
  ] });
  assert.match(r.rows[1].notes.join('|'), /Capo change: capo 2 \(the song before has no capo\)/);
  assert.match(r.rows[1].notes.join('|'), /page turn on the Session screen \(2 pages\)/);
  assert.strictEqual(r.rows[2].capo, null);
  assert.match(r.rows[2].notes[0], /Not in the songs folder/);
  const last = r.rows[3].notes.join('|');
  assert.match(last, /Capo change: no capo/);   // compared with B, the missing song skipped
  assert.match(last, /Written for Baritone/);
  assert.match(last, /In the set twice \(also number 1\)/);
  assert.match(last, /only at the smallest text/);
  assert.deepStrictEqual(r.rows.map((x) => x.problem), [false, true, true, true]);
  assert.strictEqual(r.summary, '4 songs: 3 to look at before the gig.');
});

t('a capo change alone is not a problem', () => {
  const r = gigCheck({ entries: [{ title: 'A', song: song('A', 'C'), capo: 0 }, { title: 'B', song: song('B', 'C'), capo: 3 }] });
  assert.strictEqual(r.problems, 0);
  assert.strictEqual(r.rows[1].notes.length, 1);
});

t('the desktop has Gig check in a setlist, and the preload gives it', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(html, /<button id="setlistGigCheck"[^>]*>Gig check<\/button>/);
  assert.match(html, /<dialog id="gigCheckDialog"/);
  assert.match(html, /window\.ukemusic\.gigCheck\(\{ entries/);
  assert.match(html, /<button id="gigCheckNext"[^>]*>Next to look at<\/button>/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'src', 'preload.js'), 'utf8'), /gigCheck: \(options\) => gigChecks\.gigCheck\(options\)/);
});

t('high G and low G ukulele are the same shapes: not flagged', () => {
  const r = gigCheck({ instrument: 'soprano', entries: [{ title: 'A', song: song('A', 'C'), capo: 0, instrument: 'lowg' }] });
  assert.strictEqual(r.rows[0].notes.length, 0);
});

console.log(`v4.99.12: ${n} tests passed`);
