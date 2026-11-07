// 4.65: the Instrument menu: Default (your instrument), or the song's own; the library says which
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const html = read('index.html');
const app = read('web/app.html');

test('desktop: the menu starts with Default (…), short names so it doesn\'t widen', () => {
  assert.match(html, /<select id="instrumentSelect"[^>]*data-follow-default="1"[^>]*>\s*<option value="">Default \(Uke\)<\/option>/);
  assert.match(html, /const INSTRUMENT_SHORT = \{ soprano: 'Uke', lowg: 'Low G', baritone: 'Baritone', guitar: 'Guitar' \};/);
  for (const label of ['Uke', 'Low G', 'Baritone', 'Guitar']) assert.ok(`Default (${label})`.length <= 18, label);
});

test('desktop: it shows the song\'s own instrument, and Default removes it', () => {
  assert.match(html, /element\.value = getAt\(state\.songSettings \|\| \{\}, path\.join\('\.'\)\) \|\| '';/);
  assert.match(html, /if \(element\.dataset\.followDefault && nextValue === ''\) delete target\[key\];/);
});

test('desktop library: Default (…) in grey for a song that follows yours', () => {
  assert.match(html, /if \(song\.instrument\) instrument\.textContent = instrumentText\(song\);\s*else \{ instrument\.textContent = defaultInstrumentLabel\(\); instrument\.className = 'follows';/);
});

test('web player: the same menu, and the list names a song\'s own instrument', () => {
  assert.match(app, /\$\('instrument'\)\.innerHTML = '<option value="">Default \(Uke\)<\/option>' \+/);
  assert.match(app, /\$\('instrument'\)\.options\[0\]\.textContent = `Default \(\$\{INSTRUMENT_SHORT\[myInstrument\(\)\] \|\| 'Uke'\}\)`;/);
  assert.match(app, /<span class="inst" title="This song has an instrument of its own"> · \$\{esc\(ownName\)\}<\/span>/);
});

test('the public-domain songs have no instrument of their own', () => {
  const dir = path.join(ROOT, 'public domain songs', 'Public Domain Songs');
  for (const song of fs.readdirSync(dir)) {
    const ini = path.join(dir, song, 'song.ini');
    if (fs.existsSync(ini)) assert.ok(!/^\s*instrument\s*=/m.test(fs.readFileSync(ini, 'utf8')), song);
  }
});
