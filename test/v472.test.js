// 4.72: a real nylon-string guitar (FreePats "Spanish classical guitar", CC0) for the guitar and
// the baritone ukulele; the ukulele recordings unchanged
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings: read them as \n
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const player = read('src/playback-audio.js');

// the guitar set's notes, as playback-audio.js lists them
const guitarNotes = () => {
  const block = player.slice(player.indexOf('    guitar: {\n      dir:'), player.indexOf('const sampleLoads'));
  return [...block.matchAll(/\[(\d+), '([A-G]s?\d)', (-?\d+)\]/g)].map((m) => ({ midi: Number(m[1]), file: m[2], tune: Number(m[3]) }));
};

test('the guitar recordings: 18 notes, E2 to C6, never more than five semitones apart, every file there', () => {
  const notes = guitarNotes();
  assert.strictEqual(notes.length, 18);
  assert.strictEqual(notes[0].midi, 40);
  assert.strictEqual(notes[notes.length - 1].midi, 84);
  const names = 'C Cs D Ds E F Fs G Gs A As B'.split(' ');
  notes.forEach((n, i) => {
    assert.strictEqual(12 * (Number(n.file.slice(-1)) + 1) + names.indexOf(n.file.slice(0, -1)), n.midi, n.file);
    assert.ok(fs.existsSync(path.join(ROOT, 'src/sounds/guitar', `${n.file}.flac`)), n.file);
    assert.ok(Math.abs(n.tune) <= 12, `${n.file} tuning`);
    if (i) assert.ok(n.midi - notes[i - 1].midi <= 5, `${notes[i - 1].file} to ${n.file}`);
  });
  assert.strictEqual(fs.readdirSync(path.join(ROOT, 'src/sounds/guitar')).filter((f) => f.endsWith('.flac')).length, 18);
  assert.match(read('src/sounds/guitar/LICENSE.txt'), /CC0 1\.0 Universal/);
  assert.match(read('src/sounds/guitar/README.txt'), /Spanish classical guitar/);
  assert.match(read('THIRD_PARTY_NOTICES.md'), /## FreePats "Spanish classical guitar" samples/);
});

test('player: sample sets by name; the guitar sound uses the guitar set; the ukulele set as it was', () => {
  assert.match(player, /sampled: \{ sampled: 'ukulele',/);
  assert.match(player, /guitar: \{ sampled: 'guitar',/);
  assert.match(player, /borrow: \{ 57: 55, 60: 62 \}, \/\/ A3 -> G3, C4 -> D4/);
  assert.match(player, /borrow: \{ 67: 69, 71: 73 \}, \/\/ G4 -> A4, B4 -> C#5/);
  assert.match(player, /\[60, 'C4', -5\], \[62, 'D4', -8\]/, 'ukulele tunings unchanged');
  assert.match(player, /chuck: 'chuck\.wav',\n\s*level: 0\.25/);
  assert.match(player, /chuck: null,\n\s*level: 0\.11/);
  assert.match(player, /if \(SOUNDS\[next\]\.sampled\) this\.loadSamples\(SOUNDS\[next\]\.sampled\);/);
  assert.strictEqual((player.match(/this\.samples = await this\.loadSamples\(soundOf\(this\.sound\)\.sampled\);/g) || []).length, 2);
});

test('desktop: soundFor picks the sound; guitar defaults to the recordings; Steel moves to them once', () => {
  const html = read('index.html');
  assert.strictEqual((html.match(/player\.setSound\(soundFor\(/g) || []).length, 5);
  assert.ok(!/guitar_sound === 'nylon' \? 'nylon' : 'steel'/.test(html), 'the old choice is gone');
  // the function itself
  const src = html.slice(html.indexOf('        function soundFor(instrument) {'), html.indexOf('        // 4.71: Easy to read text'));
  // eslint-disable-next-line no-new-func
  const make = (playback) => new Function('state', `${src}; return soundFor;`)({ config: { playback } });
  assert.strictEqual(make({})('guitar'), 'guitar');
  assert.strictEqual(make({ guitar_sound: 'real' })('guitar'), 'guitar');
  assert.strictEqual(make({ guitar_sound: 'steel' })('guitar'), 'steel');
  assert.strictEqual(make({ sound: 'sampled' })('baritone'), 'guitar');
  assert.strictEqual(make({ sound: 'hollow' })('baritone'), 'hollow');
  assert.strictEqual(make({ sound: 'sampled' })('soprano'), 'sampled');
  assert.match(html, /<option value="real">Real guitar \(nylon\)<\/option>/);
  const main = read('main.js');
  assert.match(main, /guitar_sound: 'real', guitar_real: true/);
  const body = main.slice(main.indexOf('// 4.72: the real (recorded) nylon guitar'), main.indexOf('// 4.70: Auto became the default'));
  // eslint-disable-next-line no-new-func
  const move = new Function('parsed', `${body.replace(/^\s*\/\/.*$/gm, '')}; return parsed;`);
  assert.deepStrictEqual(move({ playback: { guitar_sound: 'steel' } }).playback, { guitar_sound: 'real', guitar_real: true });
  assert.deepStrictEqual(move({ playback: { guitar_sound: 'nylon' } }).playback.guitar_sound, 'nylon');
  assert.deepStrictEqual(move({ playback: { guitar_sound: 'steel', guitar_real: true } }).playback.guitar_sound, 'steel', 'chosen since: kept');
});

test('web player: the recordings for every instrument, Free Practice too; WAVs beside the page', () => {
  const app = read('web/app.html');
  assert.match(app, /const soundFor = \(instrument\) => \(instrument === 'guitar' \|\| instrument === 'baritone' \? 'guitar' : 'sampled'\);/);
  assert.strictEqual((app.match(/player\.setSound\(soundFor\(/g) || []).length, 3);
  assert.match(read('web/pr_js.js'), /player\.setSound\(soundFor\(instrument\)\);/);
  const build = read('web/build.js');
  assert.match(build, /\.replace\("dir: 'src\/sounds\/guitar\/'", "dir: 'sounds\/guitar\/'"\)/);
  const make = read('web/make.js');
  assert.match(make, /\['guitar', 'guitar', '22050'\]/);
  assert.match(make, /for \(const dir of \['icons', 'sounds', 'sounds\/guitar'\]\)/);
});

console.log('v4.72 tests passed');
