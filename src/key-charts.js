// Chords by key (4.61): the chords that go together in a key, for each instrument, and the
// common progressions written out in every key, major and minor. Free Practice prints it as a
// two-page sheet (src/key-charts.js builds the page; the app draws the chord diagrams), and the
// "Progressions from memory" exercise asks for them.
// Pure: unit tested.

const { KEY_NOTES } = require('./practice-catalog');

// The keys each instrument starts with: the ones whose chords are easy there
const CHART_KEYS = {
  uke: ['C', 'G', 'F', 'D', 'A', 'Bb'],
  baritone: ['G', 'C', 'D', 'A', 'E', 'F'],
  guitar: ['G', 'C', 'D', 'A', 'E', 'F']
};
const FAMILIES = { soprano: 'uke', lowg: 'uke', baritone: 'baritone', guitar: 'guitar' };
const chartKeys = (instrumentId) => CHART_KEYS[FAMILIES[instrumentId] || 'uke'];

// A major key's chords: I ii iii IV V vi and V7 (vii° is left out, as most songs leave it out).
// I, IV, V and vi do most of the work, so they're marked.
const MAJOR_DEGREES = [
  { numeral: 'I', step: 0, quality: '', main: true },
  { numeral: 'ii', step: 1, quality: 'm' },
  { numeral: 'iii', step: 2, quality: 'm' },
  { numeral: 'IV', step: 3, quality: '', main: true },
  { numeral: 'V', step: 4, quality: '', main: true },
  { numeral: 'vi', step: 5, quality: 'm', main: true },
  { numeral: 'V7', step: 4, quality: '7' }
];

/** The relative minor of a major key: 'C' -> 'Am' */
function relativeMinor(key) {
  const notes = KEY_NOTES[key];
  return notes ? `${notes[5]}m` : '';
}

/** A key's row: its chords with numerals, and the relative minor that shares them */
function keyRow(key) {
  const notes = KEY_NOTES[key];
  if (!notes) return null;
  return {
    key,
    minor: relativeMinor(key),
    chords: MAJOR_DEGREES.map((d) => ({ name: notes[d.step] + d.quality, numeral: d.numeral, main: Boolean(d.main) }))
  };
}

// Progressions as degrees of the major scale (1-7), with the chord's quality. Minor ones are
// written from the relative minor (6 = i): the same chords, the minor key's numerals.
const MAJOR_PROGRESSIONS = [
  { id: 'pop', numerals: 'I–V–vi–IV', name: 'The pop progression', chords: [[1, ''], [5, ''], [6, 'm'], [4, '']] },
  { id: 'fifties', numerals: 'I–vi–IV–V', name: 'The 50s', chords: [[1, ''], [6, 'm'], [4, ''], [5, '']] },
  { id: 'three', numerals: 'I–IV–V–I', name: 'Three-chord trick', chords: [[1, ''], [4, ''], [5, ''], [1, '']] },
  { id: 'sad', numerals: 'vi–IV–I–V', name: 'Sad pop', chords: [[6, 'm'], [4, ''], [1, ''], [5, '']] },
  { id: 'twofive', numerals: 'ii–V7–I', name: 'Jazz turnaround', chords: [[2, 'm'], [5, '7'], [1, '']] },
  { id: 'country', numerals: 'I–IV–I–V7', name: 'Country', chords: [[1, ''], [4, ''], [1, ''], [5, '7']] }
];
const MINOR_PROGRESSIONS = [
  { id: 'minor-three', numerals: 'i–iv–v', name: 'Minor three-chord', chords: [[6, 'm'], [2, 'm'], [3, 'm']] },
  { id: 'minor-v7', numerals: 'i–iv–V7–i', name: 'Minor with a 7th', chords: [[6, 'm'], [2, 'm'], ['V7'], [6, 'm']] },
  { id: 'epic', numerals: 'i–VI–III–VII', name: 'Epic minor', chords: [[6, 'm'], [4, ''], [1, ''], [5, '']] },
  { id: 'andalusian', numerals: 'i–VII–VI–V', name: 'Andalusian (flamenco)', chords: [[6, 'm'], [5, ''], [4, ''], ['V']] }
];
const PROGRESSIONS = [...MAJOR_PROGRESSIONS.map((p) => ({ ...p, mode: 'major' })), ...MINOR_PROGRESSIONS.map((p) => ({ ...p, mode: 'minor' }))];

/** A progression's chords in a major key (minor ones: in its relative minor) */
function progressionIn(progression, key) {
  const notes = KEY_NOTES[key];
  const p = typeof progression === 'string' ? PROGRESSIONS.find((x) => x.id === progression) : progression;
  if (!notes || !p) return [];
  return p.chords.map(([degree, quality]) => {
    // the minor key's V and V7 are major: built on its fifth (the major key's third note)
    if (degree === 'V7') return `${notes[2]}7`;
    if (degree === 'V') return notes[2];
    return notes[degree - 1] + quality;
  });
}

/** The key a progression is in, as said: 'C' (major) or 'Am' (minor) */
function keyName(progression, key) {
  const p = typeof progression === 'string' ? PROGRESSIONS.find((x) => x.id === progression) : progression;
  return p && p.mode === 'minor' ? relativeMinor(key) : key;
}

/** Every chord the chart uses for an instrument (to check the diagrams are all there) */
function chartChords(instrumentId) {
  const names = new Set();
  for (const key of chartKeys(instrumentId)) {
    for (const c of keyRow(key).chords) names.add(c.name);
    for (const p of PROGRESSIONS) for (const c of progressionIn(p, key)) names.add(c);
  }
  return [...names];
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * The two-page sheet as a complete HTML page.
 *   instrumentName: as shown ("Baritone uke"); instrumentId; diagram(name): an SVG string
 */
function chartHtml({ instrumentId = 'soprano', instrumentName = 'Ukulele', diagram = () => '' } = {}) {
  const keys = chartKeys(instrumentId);
  const rows = keys.map(keyRow);
  const keyRows = rows.map((r) => `<tr><th class="key">${esc(r.key)}<span>${esc(r.minor)}</span></th>${r.chords.map((c) => `<td class="${c.main ? 'main' : ''}"><div class="num">${esc(c.numeral)}</div>${diagram(c.name)}</td>`).join('')}</tr>`).join('\n');
  const progTable = (list, minor) => `<table class="prog"><thead><tr><th>${minor ? 'Minor key' : 'Key'}</th>${list.map((p) => `<th><b>${esc(p.numerals)}</b><span>${esc(p.name)}</span></th>`).join('')}</tr></thead><tbody>
${keys.map((k) => `<tr><th>${esc(minor ? relativeMinor(k) : k)}</th>${list.map((p) => `<td>${progressionIn(p, k).map(esc).join(' ')}</td>`).join('')}</tr>`).join('\n')}
</tbody></table>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Chords by key · ${esc(instrumentName)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  /* the chord diagrams' colours and size (they use the chord sheet's settings) */
  :root { --text-color: #111; --rhythm-color: #222; --chord-color: #111; --bg-color: #fff; --diagram-size: 100%; }
  .chord-diagram { margin: 0 auto; }
  body { margin: 0; font: 11px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; color: #111; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  h2 { font-size: 15px; margin: 14px 0 4px; }
  p.lead { margin: 0 0 8px; color: #333; }
  .page { break-after: page; }
  .page:last-child { break-after: auto; }
  table { border-collapse: collapse; width: 100%; }
  .keys th.key { font-size: 18px; width: 52px; text-align: left; vertical-align: middle; }
  .keys th.key span { display: block; font-size: 11px; font-weight: 400; color: #555; }
  .keys { table-layout: fixed; }
  .keys col.k { width: 46px; }
  .keys td { text-align: center; vertical-align: top; padding: 2px 3px 4px; border-top: 1px solid #ddd; }
  .keys td .chord-diagram { width: ${instrumentId === 'guitar' ? 84 : 70}px; max-width: 100%; }
  .keys td svg { display: block; width: 100% !important; height: auto; }
  .keys td.main { background: #fff4d6; }
  .keys .num { font-size: 10px; font-weight: 700; color: #555; }
  .prog th, .prog td { border: 1px solid #ccc; padding: 4px 5px; text-align: left; vertical-align: top; }
  .prog thead th b { display: block; font-size: 12px; }
  .prog thead th span { font-weight: 400; color: #555; font-size: 10px; }
  .prog tbody th { font-size: 13px; width: 52px; }
  .prog td { font-size: 13px; font-weight: 600; letter-spacing: 0.01em; }
  .how { margin-top: 12px; padding: 8px 10px; background: #f3f6f4; border-radius: 6px; }
  .how ol { margin: 4px 0 0 18px; padding: 0; }
  .foot { margin-top: 10px; color: #777; font-size: 9px; }
</style></head><body>
<section class="page">
  <h1>Chords by key · ${esc(instrumentName)}</h1>
  <p class="lead">Each row is a key and the chords that belong to it. The four shaded ones (I, IV, V and vi) play most songs in that key. A major key and its relative minor (under the key's name) share the same chords: a song in ${esc(relativeMinor(keys[0]))} uses the ${esc(keys[0])} row.</p>
  <table class="keys"><colgroup><col class="k">${'<col>'.repeat(7)}</colgroup><tbody>
${keyRows}
  </tbody></table>
</section>
<section class="page">
  <h1>Progressions in every key · ${esc(instrumentName)}</h1>
  <p class="lead">The same patterns turn up in song after song. Learn them as numbers, and you can play them in any key on page 1.</p>
  <h2>Major</h2>
  ${progTable(MAJOR_PROGRESSIONS, false)}
  <h2>Minor</h2>
  ${progTable(MINOR_PROGRESSIONS, true)}
  <div class="how"><b>How to practise them</b>
    <ol>
      <li>Pick one key. Play each progression round four times, one strum a bar, then with your usual strum.</li>
      <li>Say the chords out loud before you play them: "I, V, vi, IV… G, D, Em, C".</li>
      <li>Cover this page and play a progression from its numbers alone, in a key you know, then in a new one.</li>
      <li>In Free Practice, <b>Progressions from memory</b> gives you the numbers and a backing, and shows the chords after.</li>
    </ol>
  </div>
  <p class="foot">Made by ukemusic for ${esc(instrumentName)}.</p>
</section>
</body></html>`;
}

module.exports = { CHART_KEYS, chartKeys, keyRow, relativeMinor, MAJOR_PROGRESSIONS, MINOR_PROGRESSIONS, PROGRESSIONS, progressionIn, keyName, chartChords, chartHtml };
