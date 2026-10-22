// Instrument profiles: everything that differs between instruments, in one place.
// The rest of the app asks the profile instead of assuming a ukulele.
//
// Order matters (it's the order of the menus): ukulele (high G, then low G), baritone, guitar.
// The id 'soprano' is kept for the ukulele so existing songs and settings carry on working.

const INSTRUMENTS = [
  {
    id: 'soprano',
    name: 'Ukulele',
    label: 'Ukulele (GCEA)',
    description: 'Soprano, concert or tenor ukulele with high G',
    code: 'uke',                       // file names: "Song (+2)_uke.pdf"
    tuningName: 'GCEA',
    strings: [67, 60, 64, 69],         // open strings, MIDI, in diagram order (left → right): G4 C4 E4 A4
    tabNames: ['A', 'E', 'C', 'G'],    // tab lines, top → bottom (highest-sounding string on top)
    library: 'chords.json',
    chordRange: 60                     // lowest note for chords made up when the library has no shape
  },
  {
    id: 'lowg',
    name: 'Ukulele (low G)',
    label: 'Ukulele, low G (gCEA)',
    description: 'Concert or tenor ukulele with the G string an octave lower',
    code: 'uke',                       // same shapes and tab as a high-G ukulele, so the same files
    tuningName: 'GCEA (low G)',
    strings: [55, 60, 64, 69],         // G3 C4 E4 A4: only the G string differs
    tabNames: ['A', 'E', 'C', 'G'],
    library: 'chords.json',            // same chord shapes as the ukulele
    sameShapesAs: 'soprano',
    chordRange: 55
  },
  {
    id: 'baritone',
    name: 'Baritone uke',
    label: 'Baritone ukulele (DGBE)',
    description: 'Baritone ukulele, tuned like the top four strings of a guitar',
    code: 'bar',
    tuningName: 'DGBE',
    strings: [50, 55, 59, 64],         // D3 G3 B3 E4
    tabNames: ['E', 'B', 'G', 'D'],
    library: 'chords-baritone.json',
    chordRange: 52
  },
  {
    id: 'guitar',
    name: 'Guitar',
    label: 'Guitar (EADGBE)',
    description: 'Six-string guitar in standard tuning',
    code: 'gtr',
    tuningName: 'EADGBE',
    strings: [40, 45, 50, 55, 59, 64], // E2 A2 D3 G3 B3 E4
    tabNames: ['e', 'B', 'G', 'D', 'A', 'E'],
    library: 'chords-guitar.json',
    chordRange: 48
  }
];

const BY_ID = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));
const ALIASES = { uke: 'soprano', ukulele: 'soprano', concert: 'soprano', tenor: 'soprano', 'low-g': 'lowg', low_g: 'lowg', bar: 'baritone', gtr: 'guitar' };

/** The profile for an id (or code/alias); unknown ids fall back to the ukulele. */
function instrument(id) {
  const key = String(id || '').toLowerCase();
  return BY_ID[key] || BY_ID[ALIASES[key]] || BY_ID.soprano;
}

const INSTRUMENT_IDS = INSTRUMENTS.map((i) => i.id);
const isInstrument = (id) => INSTRUMENT_IDS.includes(id);

/** Do two instruments use the same shapes and tab (high-G and low-G ukulele)? */
function sameShapes(a, b) {
  const pa = instrument(a);
  const pb = instrument(b);
  return (pa.sameShapesAs || pa.id) === (pb.sameShapesAs || pb.id);
}

module.exports = { INSTRUMENTS, INSTRUMENT_IDS, instrument, isInstrument, sameShapes };
