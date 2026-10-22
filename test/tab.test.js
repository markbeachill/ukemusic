const assert = require('assert');
const tab = require('../src/tab');

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

const ODE = [
  'A|-----------------|-----------------|',
  'E|--0--0--1--------|-----1--0--------|',
  'C|-----------------|--------------2--|',
  'G|-----------0-----|--0--------------|'
].join('\n');

test('reads string lines into notes with pitches', () => {
  const m = tab.parseTab(ODE);
  assert.strictEqual(m.systems.length, 1);
  assert.strictEqual(m.systems[0].tuning.name, 'soprano');
  assert.deepStrictEqual(m.notes.map((n) => `${n.label}${n.fret}=${n.pitch}`),
    ['E0=E4', 'E0=E4', 'E1=F4', 'G0=G4', 'G0=G4', 'E1=F4', 'E0=E4', 'C2=D4']);
  assert.deepStrictEqual(m.warnings, []);
});

test('notes keep their columns (the spacing the writer chose)', () => {
  const m = tab.parseTab(ODE);
  assert.deepStrictEqual(m.notes.slice(0, 4).map((n) => n.column), [2, 5, 8, 11]);
});

test('two-digit frets and techniques', () => {
  const m = tab.parseTab('A|--3h5--10--12p10--|\nE|-----------------|\nC|-----------------|\nG|-----------------|');
  assert.deepStrictEqual(m.notes.map((n) => [n.fret, n.technique]),
    [[3, null], [5, 'hammer-on'], [10, null], [12, null], [10, 'pull-off']]);
});

test('baritone recognised from the string names', () => {
  const m = tab.parseTab('E|--0--|\nB|--1--|\nG|--0--|\nD|--2--|', { instrument: 'soprano' });
  assert.strictEqual(m.systems[0].tuning.name, 'baritone');
  assert.deepStrictEqual(m.notes.map((n) => n.pitch), ['E4', 'C4', 'G3', 'E3']);
});

test('warnings: different lengths, guitar tab, wrong names, unknown symbols', () => {
  assert.ok(/different lengths/.test(tab.parseTab('A|--0--|\nE|--0-|\nC|-----|\nG|-----|').warnings.join()));
  assert.deepStrictEqual(tab.parseTab('e|--0--|\nB|-----|\nG|-----|\nD|-----|\nA|-----|\nE|-----|').warnings, [], 'guitar tab is fine now');
  assert.ok(/5 string lines/.test(tab.parseTab('A|--0--|\nE|-----|\nC|-----|\nG|-----|\nD|-----|').warnings.join()));
  assert.ok(/symbols/.test(tab.parseTab('A|--0--@--|\nE|---------|\nC|---------|\nG|---------|').warnings.join()));
});

test('text lines (chords above, "x2") stay in place', () => {
  const text = '   C        G\n' + ODE + '\nx2';
  const m = tab.parseTab(text);
  assert.strictEqual(m.items[0].kind, 'text');
  assert.strictEqual(m.items[2].text, 'x2');
  assert.strictEqual(tab.writeTab(m), text);
});

test('tidy: upper-case names, missing strings added, lines evened up', () => {
  const messy = 'a|------------|\nE|--0--0--1--   \ng|-----------0-----|';
  const { text } = tab.tidyTab(messy);
  const lines = text.split('\n');
  assert.deepStrictEqual(lines.map((l) => l[0]), ['A', 'E', 'C', 'G']);
  assert.strictEqual(new Set(lines.map((l) => l.length)).size, 1, text);
  assert.strictEqual(lines[3], 'G|-----------0-----|');
});

test('transpose keeps the string when it can', () => {
  const { text, warnings } = tab.transposeTab(ODE, 2);
  const m = tab.parseTab(text);
  assert.deepStrictEqual(m.notes.map((n) => n.pitch), ['F♯4', 'F♯4', 'G4', 'A4', 'A4', 'G4', 'F♯4', 'E4']);
  assert.deepStrictEqual(m.notes.slice(0, 3).map((n) => `${n.label}${n.fret}`), ['E2', 'E2', 'E3']);
  assert.deepStrictEqual(warnings, []);
});

test('transpose down moves an open-string note to another string', () => {
  // E0 (E4) down 2 → D4: E string can't go below 0, so it moves to C string fret 2
  const { text } = tab.transposeTab('A|-----|\nE|--0--|\nC|-----|\nG|-----|', -2);
  const m = tab.parseTab(text);
  assert.deepStrictEqual(m.notes.map((n) => `${n.label}${n.fret}=${n.pitch}`), ['C2=D4']);
});

test('transpose: a fret growing to two digits keeps every string lined up', () => {
  const { text } = tab.transposeTab('A|--9|--0--|\nE|---|-----|\nC|---|-----|\nG|---|-----|', 3);
  const lines = text.split('\n');
  assert.strictEqual(new Set(lines.map((l) => l.length)).size, 1, text);
  assert.ok(lines[0].includes('12'), text);
  assert.deepStrictEqual(tab.parseTab(text).notes.map((n) => n.pitch), ['A5', 'C5']);
});

test('transpose: notes too low for a ukulele go up an octave, with a warning', () => {
  const { text, warnings } = tab.transposeTab('A|-----|\nE|-----|\nC|--0--|\nG|-----|', -3);
  assert.deepStrictEqual(tab.parseTab(text).notes.map((n) => n.pitch), ['A4']);
  assert.ok(/octave up/.test(warnings.join()));
});

test('wrap splits long tab at bar lines for printing', () => {
  const long = ['A', 'E', 'C', 'G'].map((s) => `${s}|${'--0--|'.repeat(10)}`).join('\n');
  const wrapped = tab.wrapTab(long, 26).split('\n');
  assert.ok(wrapped.every((l) => l.length <= 26), wrapped.join('\n'));
  assert.ok(wrapped.filter((l) => l.startsWith('A|')).length >= 3);
  assert.strictEqual(tab.parseTab(wrapped.join('\n')).notes.length, 40); // 10 on each of 4 strings
});

test('timing: evenly spaced notes are eighths; wider gaps longer', () => {
  const t = tab.tabTiming(tab.parseTab('A|--0--0--0-----0--|\nE|------------------|\nC|------------------|\nG|------------------|'));
  assert.deepStrictEqual(t.steps.map((s) => s.beat), [0, 0.5, 1, 2]);
});

test('finds tab runs in pasted text', () => {
  const lines = ['Ode to Joy', '', ...ODE.split('\n'), '', 'h = hammer on', 'Some words here'];
  assert.deepStrictEqual(tab.findTabRuns(lines), [{ start: 2, end: 5 }]);
  assert.ok(!tab.isStringLine('A lovely day'));
  assert.ok(!tab.isStringLine('E|'));
});

test('tab that writes out only the strings it uses is fine', () => {
  const m = tab.parseTab('E|--0--1--|\nC|--------|');
  assert.deepStrictEqual(m.warnings, []);
  assert.deepStrictEqual(m.notes.map((n) => n.pitch), ['E4', 'F4']);   // matched by name, not position
  const { text } = tab.transposeTab('E|--0--|', -2);
  assert.deepStrictEqual(tab.parseTab(text).notes.map((n) => `${n.label}${n.fret}`), ['C2']);
});


test('guitar tab converts to ukulele and baritone, keeping the notes', () => {
  const gtr = ['e|-----------0--|', 'B|--1--3--------|', 'G|--------------|', 'D|--------------|', 'A|--------------|', 'E|--------------|'].join('\n');
  const uke = tab.convertTab(gtr, 'soprano');
  const m = tab.parseTab(uke.text);
  assert.deepStrictEqual(m.systems[0].lines.map((l) => l.label), ['A', 'E', 'C', 'G']);
  assert.deepStrictEqual(m.notes.map((n) => n.pitch), ['C4', 'D4', 'E4']);   // same pitches
  assert.deepStrictEqual(uke.warnings, []);
  const bar = tab.parseTab(tab.convertTab(gtr, 'baritone').text);
  assert.deepStrictEqual(bar.notes.map((n) => `${n.label}${n.fret}`), ['B1', 'B3', 'E0'], 'baritone = top four guitar strings');
});

test('notes too low for a ukulele move up an octave (reported)', () => {
  const gtr = ['e|-----|', 'B|-----|', 'G|-----|', 'D|-----|', 'A|--3--|', 'E|-----|'].join('\n');
  const r = tab.convertTab(gtr, 'soprano');
  assert.deepStrictEqual(tab.parseTab(r.text).notes.map((n) => n.pitch), ['C4']);
  assert.ok(/octave/.test(r.warnings.join()));
});

test('uke tab on a guitar, with a key change at the same time', () => {
  const r = tab.convertTab('A|--0--|\nE|-----|\nC|-----|\nG|-----|', 'guitar', { semitones: 2 });
  const m = tab.parseTab(r.text);
  assert.strictEqual(m.systems[0].lines.length, 6);
  assert.deepStrictEqual(m.notes.map((n) => n.pitch), ['B4']);
});

test('tab already for the instrument is only transposed', () => {
  const text = 'A|--0--|\nE|-----|\nC|-----|\nG|-----|';
  assert.strictEqual(tab.convertTab(text, 'soprano').text, text);
});

test('blank tab block for each instrument', () => {
  assert.deepStrictEqual(tab.blankTab('guitar', 1, 4), ['e|----|', 'B|----|', 'G|----|', 'D|----|', 'A|----|', 'E|----|']);
  assert.deepStrictEqual(tab.blankTab('baritone', 1, 4).map((l) => l[0]), ['E', 'B', 'G', 'D']);
});


console.log('All tab tests passed.');
