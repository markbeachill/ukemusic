// 4.99.14: the ribbon, once hidden, stays hidden (next time too) until you show it yourself
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let n = 0;
const t = (name, fn) => { fn(); n++; };

t('only a click shows the tools: opening the app and Done editing switch tab without showing them', () => {
  assert.match(html, /function showRibbon\(name, \{ open = true \} = \{\}\) \{\n\s*if \(open && document\.querySelector\('nav\.ribbon\.collapsed'\)\) setRibbonHidden\(false\);/);
  assert.match(html, /showRibbon\(document\.querySelector\(`\.ribbon-tab\[data-ribbon="\$\{firstRibbon\}"\]`\) \? firstRibbon : 'song', \{ open: false \}\);/);
  assert.match(html, /\[data-edit-only\]'\)\) showRibbon\('song', \{ open: false \}\);/);
  // the hidden state is restored before that first tab is shown
  assert.ok(html.indexOf("if (localStorage.getItem(RIBBON_HIDDEN_KEY) === '1') setRibbonHidden(true);") < html.indexOf("firstRibbon : 'song', { open: false }"));
});

t('the button says what it will do, whichever way it was set', () => {
  const fn = html.slice(html.indexOf('function setRibbonHidden(hidden)'), html.indexOf("document.getElementById('ribbonHide').addEventListener"));
  assert.match(fn, /button\.setAttribute\('aria-label', hidden \? 'Show the tools' : 'Hide the tools'\)/);
});

console.log(`v4.99.14: ${n} tests passed`);
