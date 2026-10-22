// A tiny in-memory file system for the browser: chord libraries, WRITING.md and practice.json
const files = new Map();
const listeners = [];
const key = (p) => String(p).split(/[\\/]/).pop();
function missing(p) { const e = new Error(`ENOENT: ${p}`); e.code = 'ENOENT'; return e; }
module.exports = {
  existsSync: (p) => files.has(key(p)),
  readFileSync: (p) => { if (!files.has(key(p))) throw missing(p); return files.get(key(p)); },
  writeFileSync: (p, data) => { files.set(key(p), String(data)); for (const f of listeners) f(key(p), String(data)); },
  mkdirSync() {},
  readdirSync: () => [],
  statSync: (p) => { if (!files.has(key(p))) throw missing(p); return { isDirectory: () => false, isFile: () => true, mtimeMs: 0 }; },
  promises: {},
  __files: files,
  __onWrite: (f) => listeners.push(f)
};
