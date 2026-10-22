const join = (...a) => a.filter((x) => x !== '').join('/').replace(/\/+/g, '/');
module.exports = { join, resolve: join, dirname: (p) => String(p).replace(/\/[^/]*$/, ''), basename: (p, ext) => { const b = String(p).split('/').pop(); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; }, extname: (p) => (String(p).match(/\.[^./]*$/) || [''])[0], sep: '/' };
