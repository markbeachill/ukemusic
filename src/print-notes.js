// Print notes (4.32): a one-line key to the song shorthand at the foot of a printed sheet, so a
// sheet can be read without knowing how songs are written: "C×2 = 2 bars of C · F:1 = 1 beat
// of F · | = …". Only what the song actually uses is explained. Pure; unit tested.

/** The shorthand the song uses: [{ mark, meaning }] in a fixed order */
function shorthandUsed(irNodes) {
  const used = new Set();
  let example = {};
  for (const n of irNodes || []) {
    if (n.type === 'chord' && !n.hidden) {
      if (n.bars > 1 && !n.grid) { used.add('bars'); example.bars = example.bars || `${n.content}×${n.bars}`; }
      if (n.beats) { used.add('beats'); example.beats = example.beats || `${n.content}:${n.beats}`; }
      if (n.stopped) used.add('stop');
      if (n.noChord) used.add('nc');
    }
    if (n.type === 'bar' && !n.grid) used.add('bar');
    if ((n.type === 'bar' || n.type === 'chord') && n.mark === '%') used.add('percent');
    if (n.type === 'repeat') used.add('repeat');
  }
  const out = [];
  const bars = example.bars || 'C×2';
  const beats = example.beats || 'F:1';
  const nb = bars.match(/×(\d+)$/);
  const nbeat = beats.match(/:(\d+)$/);
  if (used.has('bars')) out.push({ mark: bars, meaning: `${nb ? nb[1] : 2} bars of ${bars.replace(/×\d+$/, '')}` });
  if (used.has('beats')) out.push({ mark: beats, meaning: `${nbeat ? nbeat[1] : 1} beat${nbeat && nbeat[1] === '1' ? '' : 's'} of ${beats.replace(/:\d+$/, '')}` });
  if (used.has('bar')) out.push({ mark: '|', meaning: 'one more bar of the chord before' });
  if (used.has('percent')) out.push({ mark: '%', meaning: 'the bar before, again' });
  if (used.has('repeat')) out.push({ mark: '×2 at the end of a line', meaning: 'play the line twice' });
  if (used.has('stop')) out.push({ mark: 'stop', meaning: 'one strum, let it ring' });
  if (used.has('nc')) out.push({ mark: 'N.C.', meaning: 'no chord' });
  return out;
}

const escapeHtml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The key as a line of HTML for the foot of a sheet ('' when the song uses no shorthand) */
function shorthandKeyHtml(irNodes) {
  const used = shorthandUsed(irNodes);
  if (!used.length) return '';
  return `<p class="shorthand-key">${used.map((u) => `<strong>${escapeHtml(u.mark)}</strong> = ${escapeHtml(u.meaning)}`).join(' · ')}</p>`;
}

module.exports = { shorthandUsed, shorthandKeyHtml };
