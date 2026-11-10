// 4.76: for clubs: chords raised in the words (a layout and a Stage format), your club's logo on
// sheets, an "Updated" date at the foot, a songbook cover, and how many pages a sheet prints on
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings (core.autocrlf): read them as \n, as the build writes them
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');
const parse = require('../src/parser');
const { renderHtml } = require('../src/renderer-html');
const X = require('../src/sheet-extras');
const SONG = '--START MUSIC--\n[[Verse]]\nI [C]come from Ala[G7]bama\n--END MUSIC--\n';

test('chords raised in the words: no brackets, raised, the section label in the line', () => {
  const html = renderHtml(parse(SONG), { layout: 'raised' });
  assert.match(html, /<div class="inline-line">I <span class="ichord up">C<\/span>come from Ala<span class="ichord up">G7<\/span>bama<\/div>/);
  assert.ok(!html.includes('class="ib"'), 'no [ ]');
  assert.match(renderHtml(parse(SONG), { layout: 'inline' }), /<span class="ib">\[<\/span>C/, 'Chords in the words is as it was');
  assert.match(require('../src/renderer-html').sheetCss ? read('src/renderer-html.js') : '', /\.inline-line \.ichord\.up \{ font-size: 0\.78em; vertical-align: 0\.62em;/);
  const labelled = renderHtml(parse('--START MUSIC--\n[[Chorus]] [C]la [G]la\n--END MUSIC--\n'), { layout: 'raised' });
  assert.match(labelled, /<div class="inline-line"><strong class="inline-label"[^>]*>Chorus<\/strong> /);
});

test('…a Stage format too, and a choice in every menu', () => {
  const sf = require('../src/stage-formats');
  assert.deepStrictEqual(sf.formatOf('raised'), sf.FORMATS.find((f) => f.id === 'raised'));
  assert.strictEqual(sf.nameOf('raised'), 'Chords raised in the words');
  assert.ok(!('maxLineChars' in sf.stageRenderOptions({ layout: 'lines' }, { format: 'raised' })), 'words wrap by themselves');
  assert.match(sf.formatsCss(), /html\[data-stage-format="raised"\] \.inline-line \.ichord\.up/);
  assert.strictEqual((DESKTOP.match(/<option value="raised">Chords raised in the words/g) || []).length, 4, 'Layout (ribbon and Settings), Stage format (ribbon and Settings)');
  assert.strictEqual((WEB.match(/<option value="raised">Chords raised in the words<\/option>/g) || []).length, 2, 'Layout and Stage');
});

test('the logo, the date, the cover', () => {
  assert.strictEqual(X.formatDate(new Date(2026, 10, 9)), '9 Nov 2026');
  assert.strictEqual(X.formatDate('nonsense'), '');
  assert.strictEqual(X.updatedHtml(new Date(2026, 0, 31)), '<p class="sheet-updated">Updated 31 Jan 2026</p>');
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  assert.strictEqual(X.logoHtml(png), `<img class="club-logo" src="${png}" alt="">`);
  assert.strictEqual(X.logoHtml('javascript:alert(1)'), '', 'only a picture');
  assert.strictEqual(X.logoHtml('data:text/html;base64,PGI+'), '');
  const cover = X.coverHtml({ title: 'Spring <Jam>', logo: png, count: 42, when: new Date(2026, 10, 9) });
  assert.match(cover, /<h1 class="cover-title">Spring &lt;Jam&gt;<\/h1>/);
  assert.match(cover, /42 songs · 9 Nov 2026/);
  assert.match(cover, /<img class="cover-logo"/);
  assert.match(X.coverHtml({ title: 'One', count: 1 }), /1 song ·/);
  assert.match(X.CSS, /\.book-cover \{[^}]*page-break-after: always/);
});

test('pages: the printable area with the PDF\'s margins', () => {
  assert.deepStrictEqual(X.pageArea('A4'), { width: 679, height: 1007 });
  assert.deepStrictEqual(X.pageArea('Letter'), { width: 701, height: 941 });
  assert.strictEqual(X.pagesFor(900), 1);
  assert.strictEqual(X.pagesFor(1010), 1, 'a few pixels over is still one');
  assert.strictEqual(X.pagesFor(1500), 2);
  assert.strictEqual(X.pagesFor(0), 1);
});

test('desktop: the logo is kept with the settings; the sheet, the status bar, the songbook', () => {
  const main = read('main.js');
  for (const ch of ['logo:read', 'logo:choose', 'logo:clear']) assert.match(main, new RegExp(`handle\\('${ch}'`));
  assert.match(main, /club-logo\.\$\{ext === 'jpeg' \? 'jpg' : ext\}/);
  assert.match(main, /sheet_date: false,/);
  assert.match(read('src/preload.js'), /logo: \{ read: \(\) => ipcRenderer\.invoke\('logo:read'\)/);
  assert.match(DESKTOP, /<script src="src\/sheet-extras\.js"><\/script>/);
  assert.match(DESKTOP, /return `\$\{UkeSheetExtras\.logoHtml\(state\.clubLogo\)\}<h1 class="song-title">/);
  assert.ok(DESKTOP.includes('+ key + sheetUpdated(config);'));
  assert.match(DESKTOP, /id="export-sheet_date" type="checkbox" data-config-path="export\.sheet_date"/);
  assert.match(DESKTOP, /<span id="pageCountLabel"/);
  assert.match(DESKTOP, /label\.textContent = n \? `Prints on \$\{n\} page\$\{n === 1 \? '' : 's'\}` : '';/);
  assert.match(DESKTOP, /<input id="songbookCover" type="checkbox" checked \/>/);
  assert.match(DESKTOP, /const coverHtml = cover \? UkeSheetExtras\.coverHtml\(\{ title: setlist\.name, logo: state\.clubLogo, count: number \}\) : '';/);
});

test('web player: logo and date kept on this device, on printed and downloaded sheets; pages in Download', () => {
  assert.match(read('web/build.js'), /'sheet-extras\.js'[\],]/);
  assert.match(WEB, /<input id="clubLogoFile" type="file" accept="image\/png,image\/jpeg,image\/gif,image\/webp,image\/svg\+xml" hidden>/);
  assert.match(WEB, /<body>\$\{window\.UkeSheetExtras\.logoHtml\(look\.logo\)\}<h1>/);
  assert.match(WEB, /look\.sheetDate === true \? window\.UkeSheetExtras\.updatedHtml\(view\.song\.updated \|\| Date\.now\(\)\) : ''/);
  assert.match(WEB, /Prints on \$\{n === 1 \? 'one page' : `about \$\{n\} pages`\} \(A4\)/);
});

console.log('v4.76 tests passed');
