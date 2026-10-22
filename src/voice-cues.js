// A speaking voice for Play and Karaoke (4.20), all optional (Play → Voice):
//   count    the count-in spoken: "one, two, three, four" (6/8: "one … two")
//   sections what's coming next, just before it: "Chorus", "Verse 2"
//   chords   the next chord, just before it changes: "G seven", "F sharp minor"
// The app speaks these with the computer's own voice (speechSynthesis); this file only works
// out what to say and when. Pure: unit tested.

const NUMBERS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

const QUALITY_WORDS = [
  [/^maj7/, 'major seven'], [/^M7/, 'major seven'], [/^maj9/, 'major nine'], [/^maj/, 'major'],
  [/^m7b5/, 'half diminished'], [/^m7/, 'minor seven'], [/^m6/, 'minor six'], [/^m9/, 'minor nine'], [/^min/, 'minor'], [/^m/, 'minor'],
  [/^dim7/, 'diminished seven'], [/^dim/, 'diminished'], [/^aug/, 'augmented'], [/^\+/, 'augmented'],
  [/^sus2/, 'sus two'], [/^sus4/, 'sus four'], [/^sus/, 'sus'], [/^add9/, 'add nine'],
  [/^13/, 'thirteen'], [/^11/, 'eleven'], [/^9/, 'nine'], [/^7/, 'seven'], [/^6/, 'six'], [/^5/, 'five']
];

/** "F#m7" -> "F sharp minor seven"; "Bb/D" -> "B flat over D"; "N.C." -> "stop" */
function spokenChord(name) {
  const text = String(name || '').trim();
  if (!text) return '';
  if (/^n\.?c\.?$/i.test(text)) return 'stop';
  const [main, bass] = text.split('/');
  const m = main.match(/^([A-G])([#b♯♭]?)(.*)$/);
  if (!m) return text;
  const accidental = { '#': ' sharp', '♯': ' sharp', b: ' flat', '♭': ' flat' }[m[2]] || '';
  let rest = m[3];
  const words = [];
  while (rest) {
    const hit = QUALITY_WORDS.find(([re]) => re.test(rest));
    if (!hit) break;
    words.push(hit[1]);
    rest = rest.replace(hit[0], '');
  }
  const out = `${m[1]}${accidental}${words.length ? ` ${words.join(' ')}` : ''}`;
  return bass ? `${out} over ${spokenChord(bass)}` : out;
}

/** Section names by line: [{ line, name }] from the parsed song (structure nodes) */
function sectionsByLine(irNodes) {
  return (irNodes || [])
    .filter((n) => n.type === 'structure' && typeof n.line === 'number')
    .map((n) => ({ line: n.line, name: String(n.content || '').replace(/[:：]\s*$/, '').trim() }))
    .sort((a, b) => a.line - b.line);
}

/**
 * The cues for a schedule (buildSchedule): [{ at, text, kind }], `at` in the schedule's seconds,
 * already a little early so the words land on time.
 * options: { count, sections, chords, irNodes, lead (seconds, default 0.12) }
 */
function voiceCues(schedule, options = {}) {
  const cues = [];
  if (!schedule) return cues;
  const lead = options.lead ?? 0.12;
  if (options.count) {
    let n = 0;
    for (const e of schedule.events || []) {
      if (e.kind !== 'click' || e.barIndex !== -1) continue;
      if (e.level && e.level < 1) continue; // 6/8: just the loud ones
      cues.push({ at: Math.max(0, e.time - lead), text: NUMBERS[n] || String(n + 1), kind: 'count' });
      n += 1;
    }
  }
  const bars = schedule.bars || [];
  if (options.sections) {
    const heads = sectionsByLine(options.irNodes);
    const sectionAt = (line) => {
      let found = null;
      for (const h of heads) { if (h.line <= line) found = h; else break; }
      return found;
    };
    let current = null;
    bars.forEach((bar) => {
      const section = sectionAt(bar.line);
      if (!section || section === current) return;
      current = section;
      // about a bar ahead (at most 2 s), so you know before it starts
      const ahead = Math.min(2, Math.max(1, bar.duration || 1.5));
      cues.push({ at: Math.max(0, bar.time - ahead), text: section.name, kind: 'section' });
    });
  }
  if (options.chords) {
    let previous = null;
    bars.forEach((bar) => {
      if (bar.tab || !bar.chord) return;
      if (bar.chord !== previous) {
        cues.push({ at: Math.max(0, bar.time - 0.7), text: spokenChord(bar.chord), kind: 'chord' });
      }
      previous = bar.chord;
    });
  }
  // While the count-in is being spoken, nothing else talks over it
  const quietUntil = options.count ? (schedule.countInDuration || 0) - 0.05 : 0;
  return cues
    .filter((c) => c.kind === 'count' || c.at >= quietUntil)
    .sort((a, b) => a.at - b.at || (a.kind === 'section' ? -1 : 1));
}

module.exports = { spokenChord, sectionsByLine, voiceCues, NUMBERS };
