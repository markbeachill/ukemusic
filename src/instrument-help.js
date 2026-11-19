// 4.99.3: "Playing a song on another instrument": the help beside the Instrument menu (desktop and
// web player). How the instruments' shapes relate, and how to keep the shapes you know by moving
// the key yourself. Pure: returns HTML; unit tested.

const ROWS = [
  ['Ukulele', 'Baritone', 'Key − five times', 'C D7 F becomes G A7 C: your C, D7 and F shapes'],
  ['Ukulele', 'Guitar', 'Key − five times', 'the same shapes, on the top four strings; the other two add bass'],
  ['Baritone or guitar', 'Ukulele', 'Key + five times', 'G C D7 becomes C F G7: your G, C and D7 shapes'],
  ['Baritone', 'Guitar, or back', 'nothing', 'the same shapes on the top four strings'],
  ['Ukulele, high G', 'Low G, or back', 'nothing', 'the same shapes']
];

function helpHtml({ app = 'desktop' } = {}) {
  const web = app === 'web';
  const keep = web
    ? 'The key you choose is kept for this song on this device.'
    : 'To keep it with the song, use <b>Keys ▾ → Save this key as a version</b>.';
  const rows = ROWS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td><b>${r[2]}</b></td><td>${r[3]}</td></tr>`).join('');
  return `<p>A song is written as chord names. Choose another instrument and ukemusic draws that instrument's shapes for the same chords, in the same key: the song sounds the same, and your fingers learn new shapes.</p>
<p><b>To keep the shapes you know, move the key.</b> A baritone, and a guitar's top four strings, are tuned five semitones (a fourth) below a ukulele, so the same shape is a different chord on each. Choose the instrument, then:</p>
<div class="table-scroll"><table class="instrument-help-table"><thead><tr><th>You know</th><th>Now playing</th><th>Press</th><th>What you get</th></tr></thead><tbody>${rows}</tbody></table></div>
<p>The song then sounds five semitones lower (or higher) than it's written, which is usually fine to sing. ${keep}</p>
<p><b>Or let ukemusic keep the names you know</b> (with all features): <b>Instrument → Bari, uke shapes</b> plays your ukulele shapes on a baritone, and <b>Uke, bari shapes</b> your baritone or guitar shapes on a ukulele. The sheet shows the chords as you know them, and each diagram says what it sounds as (C, sounds G).</p>
<p>A shape can be a slightly different chord on the other instrument: the ukulele's F shape (2010) on a baritone is C with its E at the bottom, and its D7 shape (2020) is an A7 with no A. For strumming along, that's fine.</p>`;
}

module.exports = { helpHtml, ROWS };
