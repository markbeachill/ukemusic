// 4.94.1: Songs and Free Practice are tab shapes (the one in use joined to the page under it, a
// coloured top edge); Songs and Setlists line up (the scroll bar's room always kept).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function test(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (error) { console.error(`✗ ${name}`); throw error; }
}
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r\n/g, '\n');
const DESKTOP = read('index.html');
const WEB = read('web/app.html');

test('tab shapes: rounded tops on the bar\'s bottom edge; the one in use joined to the page', () => {
  assert.ok(DESKTOP.includes('.home-tabs { display: flex; gap: 6px; align-self: flex-end; margin-bottom: -13px;'));
  assert.ok(DESKTOP.includes('border-radius: 11px 11px 0 0;'));
  assert.ok(DESKTOP.includes('.home-tab.active { color: var(--tabs-blue); background: var(--app-bg); border-bottom-color: var(--app-bg); box-shadow: inset 0 3px 0 var(--tabs-blue); }'));
  assert.ok(DESKTOP.includes('.home-tab.practice-tab.active { color: #c2410c; background: var(--toolbar-bg); border-bottom-color: var(--toolbar-bg);'));
  assert.ok(WEB.includes('.home-tabs { display: flex; gap: 6px; align-self: flex-end; margin-bottom: -7px;'));
  assert.ok(WEB.includes('.home-tab.active { color: var(--accent); background: var(--bg); border-bottom-color: var(--bg); box-shadow: inset 0 3px 0 var(--accent); }'));
});

test('no sideways jump between Songs and Setlists', () => {
  assert.ok(DESKTOP.includes('.library { scrollbar-gutter: stable; }'));
});
