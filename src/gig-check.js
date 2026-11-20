// 4.99.12: Gig check (Setlists → Gig check): the set in order with each song's key and capo, and
// what to look at before the gig: songs not in the songs folder, capo changes between songs, a
// song written for another instrument, one in twice, one that needs a page turn on the Session
// screen. Pure: the app opens the songs and lays them out; this says what it found. Unit tested.
//
//   gigCheck({ entries, instrument, instruments, minPx })
//   entries: [{ title, shift, song, capo, instrument, fit }] in setlist order
//     song: the library's song ({ folder, key, versions }) or null when it isn't there
//     capo: the song's capo (0 for none); instrument: its own instrument ('' follows yours)
//     fit: the Session screen's check of it ({ pages, px }) or null
//   -> { rows: [{ n, title, key, capo, notes, problem, folder, shift }], problems, summary }

function keyOf(song, shift) {
  if (!song) return '';
  if (!shift) return song.key || '';
  const v = (song.versions || []).find((x) => x.semitones === shift);
  return (v && (v.key || v.name)) || `${song.key || ''} ${shift > 0 ? '+' : ''}${shift}`.trim();
}

const UKE = new Set(['soprano', 'lowg']);   // high or low G: the same shapes
const capoText = (capo) => (capo ? `capo ${capo}` : 'no capo');

function gigCheck({ entries = [], instrument = 'soprano', instruments = [], minPx = 0 } = {}) {
  const nameOf = (id) => (instruments.find((i) => i.id === id) || {}).name || id;
  const rows = [];
  let before = null;
  entries.forEach((e, i) => {
    const notes = [];
    const missing = !e.song;
    if (missing) notes.push('Not in the songs folder any more (renamed, archived or deleted)');
    const capo = Math.max(0, Number(e.capo) || 0);
    if (!missing && before && capo !== before.capo) notes.push(`Capo change: ${capoText(capo)} (the song before has ${capoText(before.capo)})`);
    if (!missing && e.instrument && e.instrument !== instrument && !(UKE.has(e.instrument) && UKE.has(instrument))) notes.push(`Written for ${nameOf(e.instrument)}`);
    const twice = entries.findIndex((x, k) => k < i && x.title === e.title && (x.shift || 0) === (e.shift || 0));
    if (twice >= 0) notes.push(`In the set twice (also number ${twice + 1})`);
    if (e.fit && e.fit.pages > 1) notes.push(`Needs a page turn on the Session screen (${e.fit.pages} pages)`);
    else if (e.fit && minPx && e.fit.px < minPx + 2) notes.push('Fits the Session screen only at the smallest text');
    rows.push({
      n: i + 1,
      title: e.title,
      key: keyOf(e.song, e.shift || 0),
      capo: missing ? null : capo,
      notes,
      // a capo change is worth seeing, not a problem: the rest are
      problem: notes.some((t) => !/^Capo change/.test(t)),
      folder: e.song ? e.song.folder : null,
      shift: e.shift || 0
    });
    if (!missing) before = { capo };
  });
  const problems = rows.filter((r) => r.problem).length;
  const n = rows.length;
  const summary = !n ? 'No songs in this setlist yet.'
    : problems ? `${n} song${n === 1 ? '' : 's'}: ${problems} to look at before the gig.`
      : `${n} song${n === 1 ? '' : 's'}: all ready.`;
  return { rows, problems, summary };
}

module.exports = { gigCheck, keyOf };
