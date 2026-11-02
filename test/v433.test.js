// 4.33: clearer for a beginner: one export line a day in the notes; one name per action
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const songs = require('../src/song-library');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}

test('exporting twice the same day leaves one "Exported" line in the notes', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uke433-'));
  const song = songs.createSong(tmp, 'Rainbow', '[C]x');
  songs.appendNoteLine(song.folder, 'Exported 2 files (Classic + Stage, A4)');
  songs.appendNoteLine(song.folder, 'Exported 11 files (Classic + Stage, A4)');
  const notes = songs.readNotes(song.folder);
  assert.strictEqual((notes.match(/Exported/g) || []).length, 1, notes);
  assert.ok(/Exported 11 files/.test(notes));
  songs.appendNoteLine(song.folder, 'Created version C to F (+5)');
  songs.appendNoteLine(song.folder, 'Exported 2 files (Classic + Stage, A4)');
  assert.strictEqual((songs.readNotes(song.folder).match(/Exported/g) || []).length, 2, 'another line in between: a new line');
});

test('short ribbon labels and the Help menu retain the writing actions', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const old of ['Convert Chord Lines', 'Paste Chord Sheet', 'Strum Library', 'Edit Style Set']) assert.ok(!main.includes(old), old);
  for (const now of ['Tidy Chords Above Words', 'Paste from Website', "label: 'Strums…'", 'Edit Style…', 'Guess the Key']) assert.ok(main.includes(now), now);
  assert.ok(!/>Process Import</.test(html) && />Tidy chords</.test(html));
  assert.ok(/>Guess key</.test(html) && />Close</.test(html));
  const help = main.slice(main.indexOf("label: 'Help'"), main.indexOf('Menu.setApplicationMenu'));
  assert.ok(help.includes("id: 'song-strums'") && help.includes("sendMenuAction('strum-library')"));
  assert.ok(!html.includes('id="strumsButton"') && html.includes('function openStrumLibrary()'));
  assert.ok(/label: 'Write',/.test(main) && /label: 'Play',/.test(main), 'menu bar names match the ribbon tabs');
});
