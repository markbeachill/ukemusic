// 4.69: the web player keeps its built-in songs beside your own; long help pages fold into an
// accordion (the web player's guide, and the website's guide and What's new)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const ROOT = path.join(__dirname, '..');
// Windows checks files out with \r\n line endings: read them as \n
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
const app = read('web/app.html');
const { foldSections, writingGuide, markdownToHtml } = require('../src/guide');

test('foldSections: each ## section folds under its heading, keeping its id; open says how many start open', () => {
  const { html } = markdownToHtml('# T\n\nIntro\n\n## One\n\nA\n\n### Sub\n\nB\n\n## Two\n\nC\n');
  const f = foldSections(html, { open: 1 });
  assert.match(f, /^<h1 id="guide-t">T<\/h1>\n<p>Intro<\/p>/);
  assert.match(f, /<details class="fold" id="guide-one" open><summary><h2>One<\/h2><\/summary>\n<div class="fold-body">\n[\s\S]*<h3 id="guide-sub">Sub<\/h3>[\s\S]*<\/div><\/details>/);
  assert.match(f, /<details class="fold" id="guide-two"><summary><h2>Two<\/h2><\/summary>/);
  assert.strictEqual((foldSections(html, { open: 0 }).match(/ open>/g) || []).length, 0);
  const g = writingGuide();
  assert.strictEqual((foldSections(g.html).match(/<details class="fold"/g) || []).length, g.sections.length);
});

test('web player guide: folded, with a search that opens what it finds', () => {
  assert.match(app, /U\.foldSections\(g\.html \|\| '', \{ open: 0 \}\)/);
  assert.match(app, /<input id="guideFind" class="search" type="search"/);
  assert.match(app, /<button id="guideAll" class="btn" type="button">Open all<\/button>/);
  assert.match(app, /d\.hidden = !hit;\n\s*d\.open = !!q && hit;/);
  assert.match(read('src/preload.js'), /foldSections: \(html, options\) => guide\.foldSections\(html, options\)/);
});

test('website: the long documents fold; a link to a section opens it', () => {
  const docs = read('web/docs.js');
  assert.match(docs, /made\.sections\.length >= FOLD_FROM \? foldSections\(made\.html, \{ open: p\.html === 'changes\.html' \? 1 : 0 \}\)/);
  assert.match(docs, /for \(let x = el; x; x = x\.parentElement\) if \(x\.tagName === 'DETAILS'\) x\.open = true;/);
  assert.match(docs, /id="foldAll">Open every section/);
});

test('web player: built-in songs are kept apart from yours and never stored', () => {
  assert.match(app, /const builtins = new Map\(\);/);
  assert.match(app, /const getSong = \(id\) => songs\.get\(id\) \|\| builtins\.get\(id\);/);
  // nothing makes you choose between them any more
  for (const gone of ['starterShown', 'adoptStarters', 'showStarterMode', 'starterBtn', 'take the place of the public-domain songs']) assert.ok(!app.includes(gone), gone);
  // imports, backups and Dropbox see only your songs
  assert.match(app, /U\.songFiles\.planImport\(\[\.\.\.songs\.values\(\)\], read\.songs\)/);
  assert.match(app, /CS\.planSync\(\{ local: \[\.\.\.songs\.values\(\)\]/);
});

test('web player: a built-in song you change becomes yours, marked, in its place; delete yours to go back', () => {
  assert.match(app, /if \(song\.builtIn\) \{\n\s*\/\/ 4\.69[^\n]*\n\s*delete song\.builtIn;\n\s*song\.from = 'built-in';/);
  assert.match(app, /\.\.\.\(song\.from \? \{ from: song\.from \} : \{\}\)/, 'kept with the song');
  assert.match(app, /Built-in, changed/);
  assert.match(app, /go back to the built-in song\?/);
  assert.match(app, /Built-in songs come with ukemusic and can’t be deleted/);
  assert.match(app, /delete copy\.builtIn; delete copy\.from;/, 'a copy is simply yours');
});

test('web player: the library lists yours, then the built-in songs (which can be hidden)', () => {
  assert.match(app, /<div class="group-head">Your songs <span>\$\{mine\.length\}<\/span><\/div>/);
  assert.match(app, /<div class="group-head">Built-in songs <span>\$\{built\.length\}<\/span><button id="hideBuiltIn"/);
  assert.match(app, /Show the \$\{builtins\.size\} built-in songs/);
  assert.match(app, /showBuiltIn = local\.get\('showBuiltIn', true\) !== false;/);
  // an older version's unchanged copies of them are put away
  assert.match(app, /if \(!s\.edited && !s\.cloud && s\.text === b\.text\) await store\.remove\(s\.id, \{ cloud: false \}\);/);
});

console.log('v4.69 tests passed');
