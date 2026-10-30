// A tiny in-memory file system for the browser: chord libraries, WRITING.md and practice.json
const files = new Map();
// Practice is durable in ordinary browsers too, independently of the optional cloud store.
try {
  const saved = localStorage.getItem('ukeweb.practice');
  if (saved) { JSON.parse(saved); files.set('practice.json', saved); }
} catch (_error) { /* unavailable storage or damaged data: start fresh */ }
const listeners = [];
const key = (p) => String(p).split(/[\\/]/).pop();
function missing(p) { const e = new Error(`ENOENT: ${p}`); e.code = 'ENOENT'; return e; }
module.exports = {
  existsSync: (p) => files.has(key(p)),
  readFileSync: (p) => { if (!files.has(key(p))) throw missing(p); return files.get(key(p)); },
  writeFileSync: (p, data) => {
    const name = key(p), text = String(data);
    if (name === 'practice.json') localStorage.setItem('ukeweb.practice', text);
    files.set(name, text);
    for (const f of listeners) f(name, text);
  },
  mkdirSync() {},
  readdirSync: () => [],
  statSync: (p) => { if (!files.has(key(p))) throw missing(p); return { isDirectory: () => false, isFile: () => true, mtimeMs: 0 }; },
  promises: {},
  __files: files,
  __onWrite: (f) => listeners.push(f)
};
