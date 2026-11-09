// Makes src/easy-read-fonts.js: Atkinson Hyperlegible Next and Mono (regular and bold, Latin and
// Latin Extended), as base64, for the Easy to read text setting (4.71). Embedded in the CSS, the
// fonts work offline, in the desktop app's PDFs and in downloaded sheets, with nothing to fetch.
//
// The fonts are under the SIL Open Font License 1.1 (src/fonts/*-OFL.txt), from the Fontsource
// packages @fontsource/atkinson-hyperlegible-next and -mono 5.3.0. To remake:
//   npm pack @fontsource/atkinson-hyperlegible-next@5.3.0 @fontsource/atkinson-hyperlegible-mono@5.3.0
//   (unpack each), then: node tools/make-easy-read-fonts.js <next package dir> <mono package dir>
const fs = require('fs');
const path = require('path');

const [nextDir, monoDir] = process.argv.slice(2);
if (!nextDir || !monoDir) { console.error('usage: node tools/make-easy-read-fonts.js <next package dir> <mono package dir>'); process.exit(1); }
const RANGES = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
};
const faces = [];
for (const [family, dir, file] of [['Atkinson Hyperlegible Next', nextDir, 'atkinson-hyperlegible-next'], ['Atkinson Hyperlegible Mono', monoDir, 'atkinson-hyperlegible-mono']]) {
  for (const subset of ['latin-ext', 'latin']) {
    for (const weight of [400, 700]) {
      const data = fs.readFileSync(path.join(dir, 'files', `${file}-${subset}-${weight}-normal.woff2`)).toString('base64');
      faces.push({ family, weight, range: RANGES[subset], data });
    }
  }
}
const out = `// Made by tools/make-easy-read-fonts.js: do not edit. Atkinson Hyperlegible Next and Mono,
// SIL Open Font License 1.1 (src/fonts/*-OFL.txt).
module.exports = ${JSON.stringify(faces, null, 0).replace(/\},\{/g, '},\n{')};
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'easy-read-fonts.js'), out);
console.log(`src/easy-read-fonts.js: ${faces.length} faces, ${Math.round(out.length / 1024)} KB`);
