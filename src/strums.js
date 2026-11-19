// The strum library: common strumming patterns, ukulele first, with what they're good for.
//
// Patterns use the song notation: D down, U up, X chuck (muted), - rest, and > after a stroke
// to play it harder. Each pattern fills one bar of `beats` beats; the strokes are spread
// evenly across the bar (8 strokes in 4/4 = eighth notes, 12 = triplets/swing).
// The first two are the playback defaults: Simple and Island. Each strum has a style
// (Everyday, Rock, Country, Blues / jazz, Reggae / ska, Funk…) shown in the library.
// 4.99.4: B is the chord's bass note on its own, b the other bass note (usually the fifth), and
// M a palm-muted down. `aka`: other names players know it by; `suits`: the instruments it suits
// best, when that's not all of them (the bass-note strums: a guitar or baritone, with low strings).

const STRUMS = [
  {
    id: 'simple',
    style: 'Everyday',
    name: 'Simple',
    pattern: 'D>DDD',
    beats: 4,
    level: 'Beginner',
    description: 'One strong down-strum on beat 1, then three lighter downs: one strum per beat.',
    uses: 'Learning a new song, slow songs, keeping steady while you sing. The default when a song has no pattern.'
  },
  {
    id: 'island',
    style: 'Everyday',
    name: 'Island (calypso)',
    pattern: 'D-DU-UDU',
    beats: 4,
    level: 'Beginner',
    aka: 'the folk or campfire strum, on a guitar',
    description: 'Down, down-up, up-down-up. The ukulele\'s signature strum, with a gap where beat 3 would be.',
    uses: 'Most pop and folk songs on the ukulele, upbeat singalongs, light reggae-pop.'
  },
  {
    id: 'ballad',
    style: 'Everyday',
    name: 'Ballad',
    pattern: 'D>---D-U-',
    beats: 4,
    level: 'Beginner',
    description: 'One long down-strum left to ring, then a gentle down-up.',
    uses: 'Slow ballads, love songs, quiet verses, letting the chords ring.'
  },
  {
    id: 'down-up',
    style: 'Everyday',
    name: 'Down-up eighths',
    pattern: 'D>UDUDUDU',
    beats: 4,
    level: 'Beginner',
    description: 'Steady down-up all the way through, a little harder on beat 1.',
    uses: 'Faster songs, rock and pop, practising an even strumming hand.'
  },
  {
    id: 'driving',
    style: 'Rock',
    name: 'Driving downs',
    pattern: 'D>DDDD>DDD',
    beats: 4,
    level: 'Beginner',
    description: 'Eight down-strums to the bar, accented on beats 1 and 3.',
    uses: 'Rock, punk and anything that needs to push forward; building energy in a chorus.'
  },
  {
    id: 'chuck',
    style: 'Reggae / ska',
    name: 'Chuck backbeat',
    pattern: 'D-X-D-X-',
    beats: 4,
    level: 'Intermediate',
    description: 'Downs on beats 1 and 3, a muted "chuck" (palm or fingers damping the strings) on 2 and 4, like a snare drum.',
    uses: 'Reggae, ska, funky pop; giving a solo uke a drum-like snap.'
  },
  {
    id: 'island-chuck',
    style: 'Reggae / ska',
    name: 'Island with chuck',
    pattern: 'D-XU-UXU',
    beats: 4,
    level: 'Intermediate',
    description: 'The island strum with chucks on beats 2 and 4.',
    uses: 'Upbeat ukulele pop and covers; busking.'
  },
  {
    id: 'offbeat',
    style: 'Reggae / ska',
    name: 'Reggae off-beat',
    pattern: '-U-U-U-U',
    beats: 4,
    level: 'Intermediate',
    description: 'Only short up-strums, on the "and" between the beats. Mute straight after each one.',
    uses: 'Reggae and ska; an off-beat feel under a busy melody.'
  },
  {
    id: 'swing',
    style: 'Blues / jazz',
    name: 'Swing / shuffle',
    pattern: 'D-UD-UD-UD-U',
    beats: 4,
    level: 'Intermediate',
    description: 'A long down on each beat and a short up just before the next: the "long-short" triplet swing.',
    uses: 'Blues, swing and jazz standards, 1950s songs, shuffles.'
  },
  {
    id: 'rock-push',
    style: 'Rock',
    name: 'Rock push (3-3-2)',
    pattern: 'D>--D>--D>-',
    beats: 4,
    level: 'Intermediate',
    description: 'Three hard downs spaced 3, 3 and 2 eighths apart: the second and third land just ahead of the beat.',
    uses: 'Pop-rock and rock choruses, anthems, anything that needs a push; also Latin pop (the "tresillo").'
  },
  {
    id: 'country-boom-chick',
    style: 'Country',
    name: 'Country boom-chick',
    pattern: 'D>-D-D>-D-',
    beats: 4,
    level: 'Beginner',
    description: 'A heavy "boom" on beats 1 and 3, a light "chick" on 2 and 4, all strummed. On a guitar or baritone, Alternating bass plays the booms as bass notes.',
    uses: 'Country, bluegrass and old-time songs, cowboy songs, Johnny Cash-style rhythm.'
  },
  {
    id: 'country-train',
    style: 'Country',
    name: 'Country train beat',
    pattern: 'D>UXUD>UXU',
    beats: 4,
    level: 'Intermediate',
    description: 'Non-stop down-ups with a chuck on beats 2 and 4, like wheels on a track.',
    uses: 'Up-tempo country, rockabilly, skiffle and "train" songs.'
  },
  {
    id: 'slow-blues',
    style: 'Blues / jazz',
    name: 'Slow blues (12/8 feel)',
    pattern: 'D>DDD>DDD>DDD>DD',
    beats: 4,
    level: 'Intermediate',
    description: 'Three strums to every beat (triplets), the first of each three a little harder: a slow, rolling 12/8 feel.',
    uses: 'Slow blues, soul ballads, doo-wop and 1950s slow dances.'
  },
  {
    id: 'funk',
    style: 'Funk',
    name: 'Funk sixteenths',
    pattern: 'D>-DUXU-UDUD-XU-U',
    beats: 4,
    level: 'Advanced',
    description: 'Busy, syncopated sixteenth notes with chucks on beats 2 and 4. Keep the hand moving down-up all the time and only touch the strings where marked.',
    uses: 'Funk, disco and soul grooves; tight, percussive rhythm playing.'
  },
  {
    id: 'waltz-simple',
    style: 'Waltz',
    name: 'Waltz (simple)',
    pattern: 'D>DD',
    beats: 3,
    level: 'Beginner',
    description: 'A strong down on 1, then two lighter downs: "OOM-pah-pah".',
    uses: 'Waltzes, hymns and folk songs in 3/4. The default for 3/4 when a song has no pattern.'
  },
  {
    id: 'waltz',
    style: 'Waltz',
    name: 'Waltz',
    pattern: 'D-DUDU',
    beats: 3,
    level: 'Beginner',
    description: 'Down on 1, then down-up, down-up.',
    uses: 'Waltzes and country waltzes; a fuller sound for songs in 3/4.'
  },
  {
    id: 'six-eight',
    style: 'Folk',
    name: '6/8 lilt',
    pattern: 'D>DDD>DD',
    beats: 6,
    level: 'Beginner',
    description: 'Six strokes in two groups of three, accented on 1 and 4.',
    uses: 'Irish and Scottish folk, slow rock ballads in 6/8, lullabies.'
  },
  {
    id: 'march',
    style: 'March / polka',
    name: 'March / polka',
    pattern: 'D>-DU',
    beats: 2,
    level: 'Beginner',
    description: 'A strong down, then a quick down-up: two beats to the bar.',
    uses: 'Marches, polkas, fast folk and music-hall songs in 2/4.'
  },
  // 4.99.4: more strums, and the bass-note strums of the guitar and baritone
  {
    id: 'down-ups',
    style: 'Everyday',
    name: 'Down, then down-ups',
    pattern: 'D>-DUDUDU',
    beats: 4,
    level: 'Beginner',
    description: 'One down on beat 1, then down-ups for the rest of the bar: busier than the island strum, with no gap.',
    uses: 'Folk and pop songs that want to move along, once the island strum is easy.'
  },
  {
    id: 'alt-bass',
    style: 'Country',
    name: 'Alternating bass (boom-chick)',
    pattern: 'B-D-b-D-',
    beats: 4,
    level: 'Beginner',
    suits: 'guitar and baritone',
    aka: 'the Carter strum, bass-strum',
    description: 'The bass note of the chord on beat 1, a strum on 2, the other bass note on 3, a strum on 4. B is the bass note (the root), b the other one (usually the fifth).',
    uses: 'Country, folk, old-time and cowboy songs on a guitar or baritone; on a ukulele the "bass" is just its lowest strings.'
  },
  {
    id: 'alt-bass-ups',
    style: 'Country',
    name: 'Alternating bass with ups',
    pattern: 'B-DUb-DU',
    beats: 4,
    level: 'Intermediate',
    suits: 'guitar and baritone',
    description: 'Alternating bass with a down-up after each bass note: bass, down-up, other bass, down-up.',
    uses: 'Livelier country and folk, bluegrass rhythm, skiffle.'
  },
  {
    id: 'bass-island',
    style: 'Everyday',
    name: 'Bass and island',
    pattern: 'B-DU-UDU',
    beats: 4,
    level: 'Intermediate',
    suits: 'guitar and baritone',
    description: 'The island strum with its first down played as the chord\'s bass note: the low note leads each bar.',
    uses: 'Folk and pop on a guitar or baritone, where the island strum alone sounds thin.'
  },
  {
    id: 'bossa',
    style: 'Latin',
    name: 'Bossa nova (simple)',
    pattern: 'BD-DbD-D',
    beats: 4,
    level: 'Intermediate',
    suits: 'guitar and baritone',
    description: 'Bass notes on beats 1 and 3, short chords on the off-beats between them. A simple version of the Brazilian guitar rhythm: play it softly and keep it light.',
    uses: 'Bossa nova and gentle Latin songs, slow jazz standards.'
  },
  {
    id: 'palm-muted',
    style: 'Rock',
    name: 'Palm-muted eighths',
    pattern: 'M>MMMM>MMM',
    beats: 4,
    level: 'Intermediate',
    suits: 'guitar',
    description: 'Eight downs with the heel of the strumming hand resting on the strings by the bridge, so each one is short and thuddy. M is a palm-muted down.',
    uses: 'Rock and punk verses, building up to a big open chorus.'
  },
  {
    id: 'waltz-bass',
    style: 'Waltz',
    name: 'Waltz with bass (oom-pah-pah)',
    pattern: 'B-D-D-',
    beats: 3,
    level: 'Beginner',
    suits: 'guitar and baritone',
    description: 'The bass note on beat 1, then two strums: oom, pah, pah. Alternate B and b in turn for a walking feel.',
    uses: 'Waltzes, old-time and country songs in 3/4, Irish and Scottish songs.'
  },
  {
    id: 'six-eight-bass',
    style: 'Folk',
    name: '6/8 with bass',
    pattern: 'BDDbDD',
    beats: 6,
    level: 'Intermediate',
    suits: 'guitar and baritone',
    description: 'Bass note, two strums, the other bass note, two strums: the two pulses of 6/8 with a low note on each.',
    uses: 'Folk ballads and sea songs in 6/8, Irish jigs played slowly.'
  },
  {
    id: 'polka-bass',
    style: 'March / polka',
    name: 'Polka with bass',
    pattern: 'BDbD',
    beats: 2,
    level: 'Beginner',
    suits: 'guitar and baritone',
    description: 'Bass, strum, other bass, strum, two beats to the bar: the oom-pah of a brass band.',
    uses: 'Polkas, marches and fast country two-steps.'
  }
];

// Order in the library: the everyday ukulele strums first, then by style
const ORDER = ['simple', 'island', 'ballad', 'down-up', 'down-ups', 'bass-island', 'driving', 'palm-muted', 'rock-push', 'country-boom-chick', 'alt-bass', 'alt-bass-ups', 'country-train',
  'swing', 'slow-blues', 'chuck', 'island-chuck', 'offbeat', 'funk', 'bossa', 'waltz-simple', 'waltz', 'waltz-bass', 'six-eight', 'six-eight-bass', 'march', 'polka-bass'];
STRUMS.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));

const BY_ID = Object.fromEntries(STRUMS.map((s) => [s.id, s]));

/** Number of strokes in a pattern (">" isn't a stroke). */
const strokeCount = (pattern) => String(pattern).replace(/>/g, '').length;

/** A library strum by id, or undefined. */
function strum(id) {
  return BY_ID[id];
}

/** The strums for a time signature (beats per bar), library order. */
function strumsFor(beats) {
  return STRUMS.filter((s) => s.beats === Number(beats));
}

/** Arrows for display: ↓ ↑ ✕ and · for a rest; accented strokes stay marked with ">". */
function arrows(pattern) {
  return String(pattern).replace(/D/g, '↓').replace(/U/g, '↑').replace(/X/g, '✕').replace(/M/g, '⇣').replace(/-/g, '·');
}

module.exports = { STRUMS, strum, strumsFor, strokeCount, arrows };
