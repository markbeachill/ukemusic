// The release notes for a version: its section of CHANGELOG.md, for the GitHub release page.
//   node tools/release-notes.js v4.36.0  > notes.md
// Used by .github/workflows/release.yml when a release is published.
const fs = require('fs');
const path = require('path');

const SITE = 'https://markbeachill.github.io/ukemusic';

/** CHANGELOG text + "v4.36.0" (or "4.36.0") -> that version's notes, or null */
function notesFor(changelog, tag) {
  const version = String(tag || '').trim().replace(/^v/i, '');
  const lines = String(changelog).replace(/\r\n?/g, '\n').split('\n');
  const start = lines.findIndex((l) => new RegExp(`^##\\s+v?${version.replace(/\./g, '\\.')}\\b`).test(l));
  if (start < 0) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(start + 1, end).join('\n').trim()
    .replace(/^### /gm, '## '); // one level up: the release page has its own title
}

function releaseNotes(changelog, tag) {
  const notes = notesFor(changelog, tag);
  const more = `\n\n---\nEvery version's changes: [What's new](${SITE}/changes.html) · Downloads below: Windows (.exe), Mac (.dmg), Linux (.AppImage). The installers aren't code-signed; [the website](${SITE}/#download) says how to open them.`;
  return (notes || `See [What's new](${SITE}/changes.html).`) + more + '\n';
}

module.exports = { notesFor, releaseNotes };

if (require.main === module) {
  const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');
  process.stdout.write(releaseNotes(changelog, process.argv[2] || `v${require('../package.json').version}`));
}
