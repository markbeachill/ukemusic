// UI review: make the whole "UI review" folder in one go (see README.md).
//   npm run ui-review                          everything: desktop, iPad and iPhone
//   npm run ui-review -- desktop               only the desktop app (or ipad, iphone; several are fine)
//   npm run ui-review -- desktop L S           only those sections of the desktop app (letters from catalog.json)
//   npm run ui-review -- --out "D:\Review"     somewhere else than "UI review" in the project folder
//   npm run ui-review -- --page                just rebuild the page from the last pictures
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const WORK = path.join(os.tmpdir(), 'ukemusic-ui-review');
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const OUT = outAt >= 0 ? path.resolve(args[outAt + 1]) : path.join(REPO, 'UI review');
const rest = args.filter((a, i) => i !== outAt && i !== outAt + 1);
const pageOnly = rest.includes('--page');
const APPS = ['desktop', 'ipad', 'iphone'];
let apps = rest.filter((a) => APPS.includes(a));
if (!apps.length) apps = APPS;
const sections = rest.filter((a) => /^[A-Z]$/.test(a));

function need(mod, fix) {
  try { require.resolve(mod, { paths: [REPO, __dirname] }); return true; } catch (_e) { console.error(`\nThe UI review needs ${mod}. ${fix}\n`); return false; }
}
function run(file, argv) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(__dirname, file), ...argv], { stdio: 'inherit', cwd: REPO });
    child.on('exit', (code) => resolve(code));
  });
}
/** The web player (web/out), served on this computer while the pictures are taken */
function serve(root) {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4' };
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

(async () => {
  fs.mkdirSync(WORK, { recursive: true });
  if (!pageOnly) {
    if (!need('playwright', 'Install it once with:  npm install --no-save playwright   then:  npx playwright install chromium')) process.exit(1);
    if (apps.includes('desktop') && !process.env.UKEMUSIC_ELECTRON && !need('electron', 'Run  npm install  in the project folder first.')) process.exit(1);
    console.log(`UI review: taking pictures (${apps.join(', ')}). Working folder: ${WORK}`);
    if (apps.includes('desktop')) {
      const code = await run('desktop.js', [WORK, ...sections]);
      if (code) console.log(`The desktop pictures stopped early (exit ${code}).`);
    }
    const web = apps.filter((a) => a !== 'desktop');
    if (web.length) {
      console.log('Building the web player (node web/make.js)…');
      const code = await run(path.join('..', '..', 'web', 'make.js'), []);
      if (code) { console.error('The web player did not build.'); process.exit(1); }
      const server = await serve(path.join(REPO, 'web', 'out'));
      const url = `http://127.0.0.1:${server.address().port}/index.html`;
      for (const device of web) {
        const c = await run('web.js', [device, url, WORK]);
        if (c) console.log(`The ${device} pictures stopped early (exit ${c}).`);
      }
      server.close();
    }
  }
  await run('build.js', [WORK, OUT]);
  console.log(`\nOpen ${path.join(OUT, 'index.html')} in a browser.`);
})();
