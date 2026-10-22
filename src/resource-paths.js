const fs = require('fs');
const path = require('path');

/**
 * Resolve a bundled resource path that works in both development and production.
 *
 * In development:
 *   __dirname             → /path/to/project/src
 *   Files live at:          /path/to/project/src/chords.json
 *
 * In production (asar-packed via electron-builder):
 *   process.resourcesPath → /path/to/app/resources
 *   extraResources copies files to: /path/to/app/resources/chords.json
 *   asar contains:                  /path/to/app/resources/app.asar/src/chords.json
 *
 * Search order:
 *   1. process.resourcesPath/<name>   (extraResources in production)
 *   2. __dirname/<name>               (src/ directory — dev or asar)
 *   3. __dirname/../<name>            (project root — dev)
 *   4. __dirname/../src/<name>        (project root/src — dev)
 */
function getBundledResourcePath(resourceName) {
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, resourceName));
  }

  candidates.push(path.join(__dirname, resourceName));
  candidates.push(path.join(__dirname, '..', resourceName));
  candidates.push(path.join(__dirname, '..', 'src', resourceName));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (_err) {
      continue;
    }
  }

  return candidates[0] || null;
}

function isPackaged() {
  return __dirname.includes('app.asar') ||
    (typeof process.resourcesPath === 'string' &&
      fs.existsSync(path.join(process.resourcesPath, 'app.asar')));
}

module.exports = {
  getBundledResourcePath,
  isPackaged
};
