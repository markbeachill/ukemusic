// 4.99.27: compact, accurate About credits in both apps
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { aboutHtml, acknowledgements } = require('../src/about');

test('both apps credit the FreePats recordings and link to the licence details', () => {
  for (const edition of ['desktop', 'web']) {
    const sounds = acknowledgements(edition).find(group => group.group === 'Sounds');
    assert.deepEqual(sounds.items.map(item => item.licence), ['CC0 1.0', 'CC0 1.0']);
    const html = aboutHtml({ edition });
    assert.match(html, /GuitarFamily\/ukulele\.html/);
    assert.match(html, /acoustic-guitar\.html[^>]*>FreePats nylon-string guitar<\/a><\/strong> by roberto@zenvoid\.org · Recordings for guitar and baritone ukulele playback/);
    assert.match(html, /THIRD_PARTY_NOTICES\.md/);
  }
});

test('both apps credit the music notation and Easy to read fonts', () => {
  for (const edition of ['desktop', 'web']) {
    const html = aboutHtml({ edition });
    assert.match(html, /Bravura/);
    assert.match(html, /Atkinson Hyperlegible Next and Mono/);
  }
});
