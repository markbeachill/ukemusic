const fs = require('./stubs/fs.js');
const SRC = '../src/';
fs.__files.set('chords.json', JSON.stringify(require('../src/chords.json')));
fs.__files.set('chords-baritone.json', JSON.stringify(require('../src/chords-baritone.json')));
fs.__files.set('chords-guitar.json', JSON.stringify(require('../src/chords-guitar.json')));
fs.__files.set('WRITING.md', require('../WRITING.md'));
fs.__files.set('ai-convert.txt', require('../src/ai-prompts/ai-convert.txt'));   // 4.64: the AI prompts
fs.__files.set('ai-practice.txt', require('../src/ai-prompts/ai-practice.txt'));
require('../src/preload.js');   // defines window.ukemusic, as in the desktop app
const { getBuiltInLibrary } = require('../src/chord-library.js');
const instruments = require('../src/instruments.js');
const cache = {};
module.exports = {
  vfs: fs,
  library(id) {
    const inst = instruments.instrument(id);
    if (!cache[inst.id]) cache[inst.id] = getBuiltInLibrary(inst.id);
    return cache[inst.id];
  },
  INSTRUMENTS: instruments.INSTRUMENTS,
  stageCssFor: null
};
