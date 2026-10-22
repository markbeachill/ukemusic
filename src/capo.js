// Capo: play easy shapes higher up the neck while the song still sounds in its key.
//
// With a capo on fret N, every chord is played as the shape N semitones lower: a song in
// Eb with capo 3 is played with C-family shapes. The app shows and diagrams the shapes, and
// playback raises them by N again, so what you hear is the song's real key.
// Pure functions: no DOM, so they can be unit tested.

const { transposeChord } = require('./transpose');
const { getChordDefinition } = require('./chord-library');

const MAX_CAPO = 7;

/** How hard a shape is to play: higher frets, more fingers, barres and missing shapes cost more. */
function shapeDifficulty(definition) {
  if (!definition) return 40;                       // no shape in the library at all
  const frets = definition.frets.filter((f) => typeof f === 'number' && f > 0);
  const highest = frets.length ? Math.max(...frets) : 0;
  let score = highest * 2 + frets.length;
  if (definition.barre) score += 8;                 // barre chords are the hard ones
  if (highest > 4) score += 6;                      // up the neck
  return score;
}

/**
 * Suggest a capo position for a song's chords (as they sound) on an instrument's library.
 * Returns [{ capo, score, shapes: [names] }] best first; capo 0 = no capo.
 * Ties go to the lower capo (less to move).
 */
function rankCapos(chordNames, library, { maxCapo = MAX_CAPO, spelling = 'common' } = {}) {
  const unique = [...new Set(chordNames)];
  const results = [];
  for (let capo = 0; capo <= maxCapo; capo += 1) {
    const shapes = unique.map((name) => transposeChord(name, -capo, { spelling }));
    // plus a little per fret: high up the neck the frets are cramped
    const score = capo + shapes.reduce((sum, shape) => sum + shapeDifficulty(getChordDefinition(library, shape)), 0);
    results.push({ capo, score, shapes });
  }
  return results.sort((a, b) => a.score - b.score || a.capo - b.capo);
}

function suggestCapo(chordNames, library, options) {
  return rankCapos(chordNames, library, options)[0];
}

module.exports = { MAX_CAPO, shapeDifficulty, rankCapos, suggestCapo };
