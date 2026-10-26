// Turn a (transposed) song into a timed list of strums for playback.
//
// Timing rules (the song format has no durations, so these are deliberately simple):
//   * every chord lasts one bar = one pass of the current strum pattern
//   * every [] bar marker adds another bar of the chord already playing
//   * a {pattern} applies to every bar after it until the next pattern
//   * with no {pattern} yet, the default strum is used (Settings → Playback):
//       simple  one heavy down-strum then lighter down-strums on the other beats (D>DDD in 4/4)
//       island  the island / calypso strum D-DU-UDU (D-DUDU in 3/4)
//       custom  a pattern you type, e.g. D>-DU-UDU
//   * ">" after a stroke accents it (played harder); the other strokes are played lighter.
//   * options.capo: the chords and tab are shapes played with a capo, so every note sounds
//     that many semitones higher (the song's real key)
//   * a ```tab block plays its notes (picked, one at a time or together) and takes as many
//     whole bars as it needs; tab has no rhythm, so timing comes from the spacing (src/tab.js)
// Pure function: no audio, no DOM, so it can be unit tested.
const { strumTime } = require('./strum-box');
const { expandRepeats, strumParts, FEELS, feelFor } = require('./song-syntax');
const { getChordDefinition } = require('./chord-library');
const { noteIndex } = require('./transpose');
const { parseChordName, SUFFIX_INTERVALS } = require('./chord-names');
const { parseTab, tabTiming, tabBars } = require('./tab');

// MIDI note of each open string, in diagram order (string 0 = left of the diagram)
const { INSTRUMENTS, instrument: profile } = require('./instruments');
const TUNINGS = Object.fromEntries(INSTRUMENTS.map((i) => [i.id, i.strings]));

const DEFAULT_PATTERNS = { 3: 'D-DUDU', 4: 'D-DU-UDU', 6: 'D-DD-DD-DD-D' }; // island strum
const STRUM_STYLES = ['simple', 'island', 'custom'];

/** The pattern used before the song sets one: { style, custom } from settings, for a bar of n beats. */
function defaultPattern(beatsPerBar = 4, style = 'simple', custom = '') {
  const simple = `D>${'D'.repeat(Math.max(0, beatsPerBar - 1))}`;
  if (style === 'custom') return parsePattern(custom) ? custom : simple;
  if (style === 'island') return DEFAULT_PATTERNS[beatsPerBar] || simple;
  // any strum from the library (src/strums.js) that fits the time signature
  const fromLibrary = require('./strums').strum(style);
  if (fromLibrary && fromLibrary.beats === beatsPerBar) return fromLibrary.pattern;
  return simple;
}

const QUALITY_INTERVALS = [
  [/^(maj7|M7)/, [0, 4, 7, 11]],
  [/^m7b5/, [0, 3, 6, 10]],
  [/^(m7|min7)/, [0, 3, 7, 10]],
  [/^(dim7)/, [0, 3, 6, 9]],
  [/^dim/, [0, 3, 6]],
  [/^aug/, [0, 4, 8]],
  [/^(m6)/, [0, 3, 7, 9]],
  [/^(m|min)/, [0, 3, 7]],
  [/^sus2/, [0, 2, 7]],
  [/^sus/, [0, 5, 7]],
  [/^(7|9|11|13|dom)/, [0, 4, 7, 10]],
  [/^6/, [0, 4, 7, 9]],
  [/^add9/, [0, 4, 7, 2]],
  [/^5/, [0, 7]]
];

/** Normalise a strum pattern into slots: D (down), U (up), X (chuck), - (rest). */
function parsePattern(text) {
  let slots = String(text || '')
    .replace(/[↓]/g, 'D').replace(/[↑]/g, 'U').replace(/[✕×]/g, 'X')
    .toUpperCase()
    .replace(/[^DUX>-]/g, '')
    .replace(/^>+/, '')        // an accent needs a stroke before it
    .replace(/-?>+/g, (m) => (m[0] === '-' ? '-' : '>')); // no accents on rests, one ">" is enough
  // "D D U U D U" written with spaces is the classic calypso strum: D-DU-UDU
  if (slots === 'DDUUDU') slots = 'D-DU-UDU';
  return slots;
}

/** "D>-DU" → [{stroke:'D',accent:true},{stroke:'-'},{stroke:'D'},{stroke:'U'}] */
function patternSteps(pattern) {
  const steps = [];
  for (const ch of String(pattern || '')) {
    if (ch === '>') {
      if (steps.length) steps[steps.length - 1].accent = true;
    } else {
      steps.push({ stroke: ch, accent: false });
    }
  }
  return steps;
}

/** Notes (MIDI) for a chord: the library fingering if there is one, otherwise a simple voicing. */
function voiceChord(chordName, library, instrument = 'soprano') {
  const tuning = TUNINGS[instrument] || TUNINGS.soprano;
  const definition = library ? getChordDefinition(library, chordName) : null;
  if (definition) {
    return definition.frets
      .map((fret, string) => (typeof fret === 'number' && fret >= 0 ? tuning[string] + fret : null))
      .filter((note) => note !== null);
  }
  const match = String(chordName).match(/^([A-G][#b]?)([^/]*)/);
  if (!match) return [];
  const root = noteIndex(match[1]);
  if (root === null) return [];
  // Known chord types use the shared table (first 4 notes); anything else falls back to a pattern match
  const parsed = parseChordName(chordName);
  const known = parsed && SUFFIX_INTERVALS[parsed.canonicalSuffix];
  const intervals = known
    ? known.slice(0, 4)
    : (QUALITY_INTERVALS.find(([re]) => re.test(match[2])) || [null, [0, 4, 7]])[1];
  const low = profile(instrument).chordRange;
  // Each chord tone in the octave starting at `low`, plus the root an octave up for a fuller sound
  const notes = intervals.map((i) => low + ((root + i - low % 12 + 24) % 12));
  notes.push(notes[0] + 12);
  return notes.sort((a, b) => a - b);
}

const EPS = 1e-6;

/**
 * 6/8, 9/8 and 12/8 are counted in eighths (a bar of 6/8 is 6 counts), but their tempo is
 * per dotted quarter, as musicians and tempo lists give it: "6/8 at 60" is two pulses a
 * second… a pulse every second, each three eighths long. (4.18; before, 6/8 counted the bpm
 * per eighth, three times too slow.) A "6/4" written in a pattern stays simple time.
 */
function isCompound(beats, label = '') {
  return [6, 9, 12].includes(Number(beats)) && (!label || /\/\s*8\s*$/.test(label));
}

/**
 * The song as a list of slots, in order: each is a chord (or a rest, or tab) for part of a bar
 * or a whole bar. Shared by buildSchedule and buildKaraoke so they count bars the same way.
 *   slot: { chord, line, pattern, beats (the bar's length), len (this slot's length in beats),
 *           node (index into `nodes`), stop?, rest?, tab?, tabHold? }
 * How long a chord lasts:
 *   [C:2]          2 beats
 *   [C]            to the end of the bar: a whole bar on the first beat, the rest of the bar
 *                  after a short chord ([Em:2]stay a[Am]way: Am gets the last 2 beats)
 *   [C x3]         to the end of the bar, then 2 more bars
 *   [] / %         one more bar of the chord before
 *   | G C |        a bar line's chords share their bar (| C:3 G | gives G the last beat)
 * Every chord starts its strum pattern from the beginning, so a 2-beat chord with the Island
 * strum plays D-DU. A slot never crosses a bar line: a long chord is split into slots there.
 */
function songSlots(irNodes, options = {}) {
  const beatsPerBar = Math.max(2, Math.min(7, Number(options.beatsPerBar) || 4));
  const instrument = profile(options.instrument).id;
  const nodes = expandRepeats(irNodes || []);
  const slots = [];
  const warnings = [];
  const checkPattern = (raw, steps, inBar = beatsPerBar) => {
    if (steps.length % inBar !== 0 && inBar % steps.length !== 0) {
      const message = `Strum pattern {${raw}} has ${steps.length} steps, which don't fit evenly into a bar of ${inBar} beats.`;
      if (!warnings.includes(message)) warnings.push(message);
    }
  };
  // patterns: one, or several that take turns bar by bar ({D-DU-UDU | D-DUDU})
  let patterns = [parsePattern(defaultPattern(beatsPerBar, options.defaultStrum, options.customStrum))];
  let turn = 0;              // which of them the next bar uses
  let stopNext = false;      // {stop}: the next chord is one strum, left to ring
  let currentChord = null;
  let currentRest = false;
  let beats = beatsPerBar;   // the time in force: {3/4 D-DUDU} changes it from there on
  let compound = isCompound(beatsPerBar); // 6/8 and friends: tempo per dotted quarter
  let ownFeel = null;        // {swing …} / {straight …} in the song, from there on
  let pos = 0;               // beats into the current bar
  const barPattern = () => patterns[(Math.max(turn, 1) - 1) % patterns.length];

  // A chord (or rest) lasting `total` beats from here, split at bar lines
  const addSlots = (index, node, total, { stopped = false, strokes = 'D' } = {}) => {
    let left = total;
    let first = true;
    while (left > EPS) {
      const room = beats - pos;
      const len = Math.min(left, room);
      const pattern = pos < EPS ? patterns[turn++ % patterns.length] : barPattern();
      const slot = { chord: currentChord, line: node.line, pattern: stopped ? (first ? strokes : '-') : pattern, beats, len, node: index };
      if (compound) slot.compound = true;
      slot.feel = feelFor(pattern, ownFeel, options.swing || 'straight'); // the app passes Play → Feel ('auto' by default)
      if (stopped) slot.stop = true;
      if (currentRest) slot.rest = true;
      if (currentRest && node.muted && first) slot.muted = node.muted; // [x] [mute↓↓] (4.34): muted strums
      slots.push(slot);
      pos += len;
      if (pos > beats - EPS) pos = 0;
      left -= len;
      first = false;
    }
  };

  nodes.forEach((node, index) => {
    if (node.type === 'rhythm') {
      if (node.stop) {
        stopNext = true;
        return;
      }
      if (node.unknownStrum) return;
      if (node.feel) ownFeel = node.feel;
      if (node.feelOnly) return;
      const time = strumTime(node.content);
      if (time) {
        beats = Math.max(2, Math.min(12, time.beats));
        compound = isCompound(time.beats, time.label);
        pos = 0;
      }
      const parsed = strumParts(node.content).map(parsePattern).filter(Boolean);
      if (parsed.length) {
        patterns = parsed;
        turn = 0;
        strumParts(node.content).forEach((raw, i) => parsed[i] && checkPattern(raw, patternSteps(parsed[i]), beats));
      } else if (time) {
        patterns = [parsePattern(defaultPattern(beats, options.defaultStrum, options.customStrum))];
        turn = 0;
      }
    } else if (node.type === 'tab') {
      const bars = tabBars(node.content, beats);
      if (bars) {
        pos = 0;
        const model = parseTab(node.content, { instrument });
        // the tab's first bar is the slot; the rest follow as 'hold' slots so bar counts line up
        const c = compound ? { compound: true } : {};
        slots.push({ tab: tabTiming(model), line: node.line, bars, beats, len: beats, node: index, ...c });
        for (let b = 1; b < bars; b += 1) slots.push({ tabHold: true, line: node.line, beats, len: beats, node: index, ...c });
      }
    } else if (node.type === 'chord') {
      currentChord = node.noChord ? 'N.C.' : node.content;
      currentRest = Boolean(node.noChord);
      let total;
      if (node.beats) total = node.beats;
      else if (node.restOf) total = Math.max(EPS * 10, (beats - node.restOf.used) / node.restOf.count);
      else if (node.share > 0 && node.share < 1) total = beats * node.share;
      else total = (pos > EPS ? beats - pos : beats) + ((node.bars > 1 ? node.bars : 1) - 1) * beats;
      // {stop}[C], or a marked chord [C↓] [C↓↑] (4.34): those strokes, left to ring
      const stopped = (stopNext || Boolean(node.strokes)) && !currentRest;
      stopNext = false;
      addSlots(index, node, total, { stopped, strokes: node.strokes || 'D' });
    } else if (node.type === 'bar' && currentChord) {
      addSlots(index, node, beats);
    }
  });
  return { nodes, slots, warnings };
}

/**
 * Build the playback schedule.
 *   options: { library, instrument, tempo, beatsPerBar, countIn, startLine, endLine,
 *              swing: 'auto' | 'straight' | 'light' | 'swing' | 'shuffle' (missing: straight) }
 *   (startLine/endLine: play only the bars on those source lines, e.g. one section to loop)
 * Returns { events, bars, duration, countInDuration }
 *   events: [{ time, kind: 'strum'|'chuck'|'click', direction, notes, velocity, barIndex }]
 *   bars:   [{ time, duration, chord, line }]
 */
function buildSchedule(irNodes, options = {}) {
  const instrument = profile(options.instrument).id;
  const tempo = Math.max(40, Math.min(240, Number(options.tempo) || 100));
  const beatsPerBar = Math.max(2, Math.min(7, Number(options.beatsPerBar) || 4));
  const beat = 60 / tempo;
  const startLine = Number(options.startLine) || 0;
  const endLine = Number(options.endLine) || 0;
  const capo = Math.max(0, Math.min(11, Number(options.capo) || 0));

  // 1. Walk the song: which chord plays when, and with which pattern
  const { slots, warnings } = songSlots(irNodes, { ...options, beatsPerBar, instrument });
  const playable = slots.filter((s) => (!startLine || s.line >= startLine) && (!endLine || s.line <= endLine));

  // 2. Lay the bars out in time
  const events = [];
  const bars = [];
  let time = 0;
  // One count of the bar: a beat, or in 6/8 an eighth (a third of the beat the tempo counts)
  const unitOf = (slot) => (slot && slot.compound ? beat / 3 : beat);
  if (options.countIn !== false && playable.length) {
    const countBeats = playable[0].beats || beatsPerBar;
    const unit = unitOf(playable[0]);
    for (let b = 0; b < countBeats; b += 1) {
      // 6/8: loud on 1 and 4, soft on the eighths between
      const click = { time: b * unit, kind: 'click', accent: b === 0, barIndex: -1 };
      if (playable[0].compound && b % 3) click.level = 0.35;
      events.push(click);
    }
    time = unit * countBeats;
  }
  const countInDuration = time;

  const voicings = new Map();
  playable.forEach((slot, barIndex) => {
    const slotBeats = slot.beats || beatsPerBar;
    const unit = unitOf(slot);
    const pulse = slot.compound ? 3 : 1;   // counts per beat of the tempo
    const barLength = unit * slotBeats;   // eslint-disable-line no-shadow
    if (slot.tabHold) {
      bars.push({ time, duration: barLength, chord: 'Tab', line: slot.line, pattern: '', tab: true, beats: slotBeats, unit, pulse });
      time += barLength;
      return;
    }
    if (slot.tab) {
      bars.push({ time, duration: barLength, chord: 'Tab', line: slot.line, pattern: '', tab: true, beats: slotBeats, unit, pulse });
      for (const step of slot.tab.steps) {
        // notes indexed by string (diagram order is the reverse of tab's top-to-bottom order)
        const notes = new Array(step.strings);
        for (const n of step.notes) notes[step.strings - 1 - n.string] = n.midi + capo;
        events.push({ time: time + step.beat * unit, kind: 'strum', direction: 'down', notes, velocity: 0.9, barIndex, tabNote: true });
      }
      time += barLength;
      return;
    }
    if (!slot.rest && !voicings.has(slot.chord)) voicings.set(slot.chord, voiceChord(slot.chord, options.library, instrument));
    const len = slot.len || slotBeats;
    const length = unit * len;
    const share = len / slotBeats;
    const barInfo = { time, duration: length, chord: slot.chord, line: slot.line, pattern: slot.pattern, beats: slotBeats, unit, pulse };
    if (share < 1 - EPS) barInfo.share = share;
    if (slot.stop) barInfo.stop = true;
    if (slot.rest) {
      // N.C.: the strings are stopped, nothing plays
      barInfo.rest = true;
      bars.push(barInfo);
      events.push({ time, kind: 'mute', barIndex });
      // [x] [mute↓↓] (4.34): a muted strum ("chk") on each beat
      if (slot.muted) {
        barInfo.muted = slot.muted;
        for (let k = 0; k < slot.muted; k += 1) events.push({ time: time + (k * length) / slot.muted, kind: 'chuck', velocity: 0.85, barIndex });
      }
      time += length;
      return;
    }
    bars.push(barInfo);
    const notes = voicings.get(slot.chord).map((midi) => midi + capo);
    // The pattern is spread over a whole bar; a shorter chord plays its first strokes
    // (every chord starts the pattern afresh: a 2-beat chord with D-DU-UDU plays D-DU)
    // Marked strums ([C↓↓], [Dm↓↓:2]) are spread over the chord's own length, not the bar (4.36:
    // [Dm↓↓:2] played one strum, the second fell on beat 3 and was cut)
    const spreadOver = slot.stop && slot.pattern.replace(/-/g, '').length > 1 ? length : barLength;
    const steps = patternSteps(slot.pattern).filter((_, i, all) => i === 0 || i * (spreadOver / all.length) < length - EPS);
    const allSteps = patternSteps(slot.pattern).length;
    const step = spreadOver / allSteps;
    const first = 0;
    const accented = steps.some((s) => s.accent);
    // Swing: strokes come in pairs (eighths in 4/4, or sixteenths), and the second of each pair
    // comes late. Only for an even split of simple-time beats; 6/8 and triplets lilt already.
    const perBeat = allSteps / slotBeats;
    const ratio = FEELS[slot.feel] || 0.5;
    const swung = !slot.compound && ratio > 0.5 + EPS && (perBeat === 2 || perBeat === 4);
    if (swung) barInfo.feel = slot.feel;
    const pulseLength = unit * pulse;
    steps.forEach(({ stroke, accent }, k) => {
      const i = k + first;
      const at = swung ? time + Math.floor(k / 2) * 2 * step + (k % 2 ? ratio * 2 * step : 0) : time + k * step;
      if (stroke === '-') return;
      const onBeat = Math.abs(((i * step) % pulseLength + pulseLength) % pulseLength) < 1e-6 || Math.abs(((i * step) % pulseLength) - pulseLength) < 1e-6;
      const down = stroke === 'D';
      // Swung, the beats lean a little more, so the long-short lilt comes through
      const usual = onBeat ? (swung ? 0.92 : 0.85) : (down ? 0.75 : 0.6) * (swung ? 0.88 : 1);
      // With accents marked, those strokes are heavy and the rest clearly lighter;
      // without, the first stroke of the bar leads a little.
      const velocity = accented ? (accent ? 1 : usual * 0.6) : (i === 0 ? 1 : usual);
      if (stroke === 'X') {
        events.push({ time: at, kind: 'chuck', velocity: accented ? velocity : 0.7, barIndex });
        return;
      }
      events.push({
        time: at,
        kind: 'strum',
        direction: down ? 'down' : 'up',
        notes,
        velocity,
        accent,
        barIndex,
        ...(slot.stop ? { ring: true } : {})
      });
    });
    time += length;
  });

  return { events, bars, duration: time, countInDuration, tempo, beatsPerBar, warnings };
}

module.exports = {
  isCompound, buildSchedule, songSlots, parsePattern, patternSteps, defaultPattern, voiceChord, TUNINGS, STRUM_STYLES };
