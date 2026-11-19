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
  },
  // 4.99: the shapes you know, on the other instrument. Your ukulele shapes on a baritone: the sheet
  // keeps the ukulele's chord names and shapes (it reads just as it does for your ukulele), and it
  // sounds a fourth lower, as it does when you play them on a baritone (C-D7-F-C sounds as
  // G-A7-C-G). Everything works as on a low-G ukulele (its shapes, tab and picking), and playback
  // moves the sound by soundShift: a low-G ukulele a fourth down is exactly a baritone.
  {
    id: 'ukeonbaritone',
    name: 'Baritone, ukulele shapes',
    label: 'Baritone ukulele (DGBE), playing your ukulele shapes',
    description: 'Your ukulele chord shapes on a baritone: the chords are named as on a ukulele, and sound a fourth lower',
    code: 'uke',                       // the same sheet as a ukulele's, so the same files
    tuningName: 'DGBE, ukulele shapes',
    strings: [55, 60, 64, 69],         // the shapes are a (low-G) ukulele's; soundShift makes them a baritone
    tabNames: ['A', 'E', 'C', 'G'],
    library: 'chords.json',
    sameShapesAs: 'soprano',
    chordRange: 55,
    soundShift: -5,                    // sounds a fourth lower: D3 G3 B3 E4
    soundsLike: 'baritone',            // the baritone's playback sound
    shapesFrom: 'soprano'              // the instrument whose shapes and chord names it shows
  },
  // And the other way: baritone (or guitar) shapes on a ukulele. The sheet keeps the baritone's
  // names and shapes, and it sounds a fourth higher (G-C-D7 sounds as C-F-G7). Playback sounds like
  // a low-G ukulele: on a high-G one only the 4th string differs.
  {
    id: 'baritoneonuke',
    name: 'Ukulele, baritone shapes',
    label: 'Ukulele (GCEA), playing your baritone shapes',
    description: 'Your baritone (or guitar) chord shapes on a ukulele: the chords are named as on a baritone, and sound a fourth higher',
    code: 'bar',
    tuningName: 'GCEA, baritone shapes',
    strings: [50, 55, 59, 64],         // the shapes are a baritone's; soundShift makes them a ukulele
    tabNames: ['E', 'B', 'G', 'D'],
    library: 'chords-baritone.json',
    sameShapesAs: 'baritone',
    chordRange: 52,
    soundShift: 5,                     // sounds a fourth higher: G3 C4 E4 A4
    soundsLike: 'soprano',
    shapesFrom: 'baritone'
  }
];

const BY_ID = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i]));
const ALIASES = { uke: 'soprano', ukulele: 'soprano', concert: 'soprano', tenor: 'soprano', 'low-g': 'lowg', low_g: 'lowg', bar: 'baritone', gtr: 'guitar' };
// 4.99: the instruments a player chooses first (the others are the shapes you know on another one)
const MAIN_INSTRUMENT_IDS = INSTRUMENTS.filter((i) => !i.shapesFrom).map((i) => i.id);

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

module.exports = { INSTRUMENTS, INSTRUMENT_IDS, MAIN_INSTRUMENT_IDS, instrument, isInstrument, sameShapes };
