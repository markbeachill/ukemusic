// 4.99.10: what the desktop app adds is written from web/features.js, so the home page and the
// Features page can't say the desktop app alone has things the web player has (setlists, Stage copies)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const F = require('../web/features');
const norm = (s) => s.replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

t('desktopAdds names every row the web player lacks', () => {
  const s = F.desktopAdds();
  assert.match(s, /^The desktop app adds .+\.$/);
  for (const sec of F.SECTIONS) for (const r of sec.rows) {
    if (r.web === false && r.desktop) assert.ok(r.adds, `no adds for ${r.f}`);
    if (r.adds) assert.ok(s.includes(r.adds), r.adds);
  }
  assert.doesNotMatch(s, /setlists|stage cop|learn sheet/i);
});

t('the home page carries the sentence, and no longer says the desktop adds setlists', () => {
  const home = norm(fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8'));
  const marks = home.match(/<!-- adds -->([\s\S]*?)<!-- \/adds -->/g) || [];
  assert.strictEqual(marks.length, 2);
  for (const m of marks) assert.ok(m.includes(F.desktopAdds()));
  assert.doesNotMatch(home, /desktop app adds setlists/i);
  assert.doesNotMatch(home, /<li>Setlists, songbooks, Stage copies/);
});

t('the home page links straight into a song and Free Practice; the web player opens them', () => {
  const home = norm(fs.readFileSync(path.join(__dirname, '..', 'site', 'index.html'), 'utf8'));
  assert.ok(home.includes('href="app/#song=amazing-grace"'));
  assert.ok(home.includes('href="app/#practice"'));
  const app = norm(fs.readFileSync(path.join(__dirname, '..', 'web', 'app.html'), 'utf8'));
  assert.match(app, /function openFromLink\(\)/);
  assert.match(app, /#song=\(\[a-z0-9-\]/);
  // the song the link names is one of the built-in songs
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'public domain songs', 'Public Domain Songs', 'Amazing Grace')));
});

console.log(`v4.99.10: ${n} tests passed`);
