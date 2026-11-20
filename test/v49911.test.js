// 4.99.11: the web player on a phone: one row (Play, Karaoke, Learn, ⋯, the tempo), the rest behind ⋯;
// Jump to section → Repeat it (the web's Loop a part); More says whether it works offline here
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('../web/features');
const app = fs.readFileSync(path.join(__dirname, '..', 'web', 'app.html'), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

t('the player has ⋯, and the extras are marked to go behind it on a phone', () => {
  assert.match(app, /<button id="playerMore" data-feature="play"/);
  for (const id of ['restartBtn', 'accompanimentBtn', 'standBtn', 'addToSetlistBtn', 'sessionBtn']) {
    assert.match(app, new RegExp(`<button id="${id}"[^>]*class="btn player-extra"`), id);
  }
  for (const id of ['playBtn', 'karaokeButton', 'learnBtn']) assert.doesNotMatch(app, new RegExp(`<button id="${id}"[^>]*player-extra`), id);
  assert.match(app, /@media \(max-width: 600px\) \{\n  \.player-row \{ flex-wrap: nowrap;/);
  assert.match(app, /<div id="playerExtras" class="player-extras" hidden><\/div>/);
  assert.match(app, /function showPlayerExtras\(on\)/);
});

t('Repeat it plays the chosen section, round and round', () => {
  assert.match(app, /<label id="sectionRepeatRow" class="section-repeat" data-feature="sectionJump" hidden/);
  assert.match(app, /function repeatRange\(\)/);
  assert.match(app, /endLine: range\.to/);
  assert.match(app, /play\.repeat && repeatRange\(\)/);
  const row = F.SECTIONS.flatMap((s) => s.rows).find((r) => r.f === 'Loop a part');
  assert.strictEqual(row.web, true);
  assert.doesNotMatch(F.desktopAdds(), /looping/);
});

t('the schedule plays only the section asked for', () => {
  const { buildSchedule } = require('../src/playback-schedule');
  const { parse } = require('../src/parser');
  const ir = parse('[[Verse 1]]\n[C]one [F]two\n[[Verse 2]]\n[G]three [C]four\n[[Chorus]]\n[Am]five\n');
  const lines = (s) => [...new Set(s.bars.filter((b) => !b.countIn).map((b) => b.line))];
  const verse2 = lines(buildSchedule(ir, { startLine: 3, endLine: 4, countIn: false }));
  assert.ok(verse2.length && verse2.every((l) => l >= 3 && l <= 4), String(verse2));
});

t('More says whether it works offline here', () => {
  assert.match(app, /<p id="offlineNote" class="lib-more-note" hidden><\/p>/);
  assert.match(app, /Works offline on this device/);
  assert.match(app, /getRegistration\(\)/);
});

console.log(`v4.99.11: ${n} tests passed`);
