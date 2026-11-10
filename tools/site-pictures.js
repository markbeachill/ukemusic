// The website's pictures, taken again from the app as it is now: every picture in site/img (but
// not session.webp, which is kept as it is) and the gallery's files and thumbnails (site/gallery).
//
//   npm run site-pictures                 everything (about 10 minutes; windows open and close)
//   npm run site-pictures -- img          only the pictures in site/img
//   npm run site-pictures -- gallery      only the gallery
//   npm run site-pictures -- img editor playing     only those pictures (names without .webp)
//
// Needs, once (as for the UI review, plus pdf.js for the pictures of PDFs):
//   npm install --no-save playwright pdfjs-dist@4.10.38
//   npx playwright install chromium   (or not: without it, the Microsoft Edge or Google Chrome
//                                      already on the computer is used)
// They can also be kept in tools/node_modules (npm install --prefix tools …), apart from the app's.
//
// It runs the desktop app with its own settings folder and a copy of the public-domain songs
// (your songs and settings are left alone), and the web player (built with node web/make.js) as
// an iPhone. Each scene below says what the picture shows; the pages that use them are
// site/index.html, web/pages.js and README.md.
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const REPO = path.resolve(__dirname, '..');
const WORK = path.join(os.tmpdir(), 'ukemusic-site-pictures');
const IMG = path.join(REPO, 'site', 'img');
const GALLERY = path.join(REPO, 'site', 'gallery');
const PD = path.join(REPO, 'public domain songs', 'Public Domain Songs');
const SONGS = path.join(WORK, 'Songs');
const HOME = path.join(WORK, 'settings');
const RAW = path.join(WORK, 'raw');
const args = process.argv.slice(2);
const doImg = !args.includes('gallery') || args.includes('img');
const doGallery = !args.includes('img') || args.includes('gallery');
const onlyPics = args.filter((a) => !['img', 'gallery'].includes(a));
const want = (name) => !onlyPics.length || onlyPics.includes(name);
const KEEP = new Set(['session']);   // never retaken
const log = (...a) => console.log('site-pictures', ...a);

const find = (mod) => { try { return require.resolve(mod, { paths: [REPO, __dirname] }); } catch (_e) { return require.resolve(mod); } };
function need(mod, fix) {
  try { return require(find(mod)); } catch (_e) { console.error(`\nThe site pictures need ${mod}. ${fix}\n`); process.exit(1); }
}
const playwright = need('playwright', 'Install it once with:  npm install --no-save playwright   then:  npx playwright install chromium');
let PDFJS = '';
try { PDFJS = path.dirname(find('pdfjs-dist/build/pdf.min.mjs')); } catch (_e) {
  console.error('\nThe site pictures need pdf.js, for the pictures of PDFs. Install it once with:  npm install --no-save pdfjs-dist@4.10.38\n');
  process.exit(1);
}
const ELECTRON = process.env.UKEMUSIC_ELECTRON || need('electron', 'Run  npm install  in the project folder first.');

// A browser for the web player and the PDFs: Playwright's own Chromium, or, if it hasn't been
// downloaded (npx playwright install chromium), the Edge or Chrome already on the computer
async function launchBrowser() {
  const errors = [];
  for (const channel of [undefined, 'msedge', 'chrome']) {
    try { return await playwright.chromium.launch(channel ? { channel } : {}); } catch (error) { errors.push(String(error.message).split('\n')[0]); }
  }
  console.error(`\nThe site pictures need a browser. Download Playwright's once with:  npx playwright install chromium\n(or install Microsoft Edge or Google Chrome)\n${errors.join('\n')}\n`);
  process.exit(1);
}

/** A small web server: the web player at /app/, pdf.js at /pdfjs/, the work folder at /work/ */
function serve() {
  const roots = { '/app/': path.join(REPO, 'web', 'out'), '/pdfjs/': PDFJS, '/work/': WORK };
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.pdf': 'application/pdf' };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const prefix = Object.keys(roots).find((p) => url.startsWith(p));
    const file = prefix ? path.join(roots[prefix], url.slice(prefix.length) || 'index.html') : '';
    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ── The desktop app ──────────────────────────────────────────────────────────────────────────
const W = 1360, H = 860;
async function desktop() {
  for (const d of [SONGS, HOME, RAW]) { fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d, { recursive: true }); }
  for (const t of fs.readdirSync(PD)) fs.cpSync(path.join(PD, t), path.join(SONGS, t), { recursive: true, filter: (s) => !/[\\/](exports|learn)([\\/]|$)/.test(s) });
  // an original tune with tab, for "The tab, in steps" (not a real song)
  fs.mkdirSync(path.join(SONGS, 'Picking Song'), { recursive: true });
  fs.writeFileSync(path.join(SONGS, 'Picking Song', 'Picking Song-song.txt'), '--START MUSIC--\n[[Intro]]\n```tab\nA|-----0-----0-|-----0-----0-|-----1-----1-|-----0-----0-|\nE|---0-----0---|---1-----1---|---1-----1---|---0-----0---|\nC|-0-----0-----|-0-----0-----|-0-----0-----|-0-----0-----|\ng|0-----0------|2-----2------|2-----2------|0-----0------|\n```\n[[Verse]]\n[C]Morning comes in [G7]slow and grey,\n[F]picking out the [C]tune all day\n--END MUSIC--\n');
  fs.mkdirSync(path.join(SONGS, 'Setlists'), { recursive: true });
  fs.writeFileSync(path.join(SONGS, 'Setlists', 'Club night.txt'), ['The Wild Rover', "It's a Long Way to Tipperary", 'Danny Boy', 'Amazing Grace', 'Scarborough Fair'].join('\n') + '\n');
  fs.writeFileSync(path.join(HOME, 'config.ini'), `[library]\nsongs_folder = ${SONGS}\nstart_screen = library\nstarters_added = true\n`);

  const app = await playwright._electron.launch({
    executablePath: ELECTRON,
    args: [REPO, '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    env: { ...process.env, UKEMUSIC_USER_DATA: HOME, UKEMUSIC_TEST_TRASH: path.join(WORK, 'trash') }
  });
  const page = await app.firstWindow();
  page.on('pageerror', (e) => log('page error:', e.message));
  page.on('dialog', (d) => d.dismiss());
  for (const method of ['click', 'fill', 'selectOption', 'check', 'uncheck']) {
    const original = page[method].bind(page);
    page[method] = async (selector, ...rest) => {
      if (typeof selector === 'string') await page.evaluate((s) => window.ukemusicReveal && window.ukemusicReveal(s), selector).catch(() => {});
      return original(selector, ...rest);
    };
  }
  page.setDefaultTimeout(10000);
  await page.waitForTimeout(1500);
  await app.evaluate(({ BrowserWindow }, [w, h]) => { const win = BrowserWindow.getAllWindows()[0]; win.setFullScreen(false); win.unmaximize(); win.setContentSize(w, h); }, [W, H]);
  await page.waitForTimeout(800);

  const tidy = (p) => p.evaluate(() => {
    const f = document.getElementById('libFolder'); if (f) f.style.visibility = 'hidden';
    const t = document.getElementById('toast'); if (t) t.classList.remove('visible');
  }).catch(() => {});
  const shot = async (name, p = page) => { await tidy(p); await p.waitForTimeout(200); await p.screenshot({ path: path.join(RAW, `${name}.png`) }); log('took', name); };
  const closeDialogs = () => page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  const reset = async () => {
    await page.keyboard.press('Escape').catch(() => {});
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('dialog[open]')) d.close();
      for (const id of ['karaokeClose', 'practiceClose']) { const b = document.getElementById(id); if (b && b.offsetParent) b.click(); }
    }).catch(() => {});
    for (const w of app.windows().slice(1)) await w.close().catch(() => {});
    await page.waitForTimeout(800);
  };
  const scene = async (name, fn, { always = false } = {}) => {
    if (!always && (!want(name) || KEEP.has(name))) return;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try { await fn(); return; } catch (e) { log(`${attempt === 1 ? 'retrying' : '!! not taken:'} ${name}: ${e.message.split('\n')[0]}`); await reset(); }
    }
  };
  const library = async () => {
    await closeDialogs();
    await page.evaluate(() => window.ukemusicShowLibrary());
    await page.waitForTimeout(500);
    await page.click('#libTabSongs').catch(() => {});
    await page.fill('#libSearch', '');
    await page.waitForTimeout(300);
  };
  const open = async (title) => {
    await library();
    await page.fill('#libSearch', title);
    await page.waitForTimeout(400);
    await page.locator('#libList .library-row', { hasText: title }).first().click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const p = document.getElementById('preview'); if (p && p.contentWindow) p.contentWindow.scrollTo(0, 0); });
  };
  const tab = async (t) => { await page.click(`#ribbonTab${t}`); await page.waitForTimeout(400); };
  const clubNight = async () => {
    await library(); await page.click('#libTabSetlists'); await page.waitForTimeout(500);
    await page.locator('#setlistList >> text=Club night').first().click(); await page.waitForTimeout(800);
  };

  if (doImg) {
    // the library, and a setlist for a club night
    await scene('library', async () => { await library(); await page.waitForTimeout(600); await shot('library'); });
    await scene('setlist', async () => { await clubNight(); await shot('setlist'); });
    // a song open on the Write tab: the words and chords, and the sheet beside them
    await scene('editor', async () => { await open('The Wild Rover'); await tab('Write'); await shot('editor'); });
    // playing: the line, the chord and the strum lit, the next shapes ready
    await scene('playing', async () => {
      await open('The Wild Rover'); await tab('Play'); await page.click('#playButton'); await page.waitForTimeout(7000);
      await shot('playing'); await page.click('#stopButton').catch(() => {}); await page.waitForTimeout(500);
    });
    // karaoke, full screen
    await scene('karaoke', async () => {
      await open('The Wild Rover'); await tab('Play'); await page.click('#karaokeButton'); await page.waitForTimeout(8000);
      await shot('karaoke'); await page.click('#karaokeClose').catch(() => page.keyboard.press('Escape')); await page.waitForTimeout(600);
    });
    // playing from memory: the chords shown the first time each part comes, then ?
    await scene('learn-memory', async () => {
      await open('The Wild Rover'); await tab('Learn'); await page.selectOption('#learnStage', 'repeats'); await page.click('#learnPlayButton'); await page.waitForTimeout(15000);
      await shot('learn-memory'); await page.click('#karaokeClose').catch(() => page.keyboard.press('Escape')); await page.waitForTimeout(600);
    });
    // Next chord? the quiz
    await scene('learn-quiz', async () => {
      await open('The Wild Rover'); await tab('Learn'); await page.click('#learnQuizButton'); await page.waitForSelector('#learnQuizDialog[open]'); await page.waitForTimeout(700);
      await shot('learn-quiz'); await closeDialogs();
    });
    // the chords as numbers on the sheet
    await scene('learn-numbers', async () => {
      await open("It's a Long Way to Tipperary"); await tab('Learn'); await page.check('#learnNumbers'); await page.waitForTimeout(900);
      await shot('learn-numbers'); await page.uncheck('#learnNumbers');
    });
    // the changes, hardest first, with what each finger does
    await scene('changes', async () => {
      await open("It's a Long Way to Tipperary"); await tab('Learn'); await page.click('#learnChangesButton'); await page.waitForSelector('#learnChangesDialog[open]'); await page.waitForTimeout(700);
      await shot('changes'); await closeDialogs();
    });
    // picking while it plays, with the tune drawn as notes
    await scene('tune', async () => {
      await open("Brahms' Lullaby"); await tab('Pick'); await page.check('#pickTune').catch(() => {});
      await page.click('#pickPlayButton'); await page.waitForTimeout(7000);
      await shot('tune'); await page.click('#pickStopButton').catch(() => {}); await page.uncheck('#pickTune').catch(() => {}); await page.waitForTimeout(500);
    });
    // the tab, in steps
    await scene('picking', async () => {
      await open('Picking Song'); await tab('Pick'); await page.click('#learnPickButton'); await page.waitForSelector('#learnPickDialog[open]'); await page.waitForTimeout(700);
      await shot('picking'); await closeDialogs();
    });
    // Free Practice
    await scene('practice', async () => {
      await library(); await page.click('#libPractice'); await page.waitForSelector('#practice:not([hidden])', { timeout: 15000 }); await page.waitForTimeout(1500);
      await shot('practice'); await page.click('#practiceClose').catch(() => {}); await page.waitForTimeout(500);
    });
    // the Session screen running a setlist: song 2 of 5
    await scene('session-setlist', async () => {
      await clubNight();
      const [win] = await Promise.all([app.waitForEvent('window'), page.click('#setlistSession')]);
      await win.waitForTimeout(1500);
      // out of full screen first (that takes a moment), then the size of the picture
      await app.evaluate(({ BrowserWindow }) => { for (const x of BrowserWindow.getAllWindows().slice(1)) { x.setFullScreen(false); x.unmaximize(); } });
      await win.waitForTimeout(1500);
      await app.evaluate(({ BrowserWindow }) => { for (const x of BrowserWindow.getAllWindows().slice(1)) x.setContentSize(1360, 765); });
      await win.waitForTimeout(1500);
      let got = await win.evaluate(() => [innerWidth, innerHeight]);
      if (got[0] !== 1360 || got[1] !== 765) {
        // a window that won't leave full screen (no window manager): the page is given that size instead
        await win.setViewportSize({ width: 1360, height: 765 }); await win.waitForTimeout(1500);
        got = await win.evaluate(() => [innerWidth, innerHeight]);
      }
      if (got[0] !== 1360 || got[1] !== 765) throw new Error(`the Session window is ${got.join('×')}, not 1360×765`);
      await win.keyboard.press('ArrowRight'); await win.waitForTimeout(1800);
      await shot('session-setlist', win);
      await win.close().catch(() => {}); await page.waitForTimeout(600);
    });
  }

  // The files: exported as the app makes them, for the gallery, the Stage picture and the learn
  // and pick sheet pictures
  const songsToExport = [];
  if (doGallery) songsToExport.push('The Wild Rover', "Brahms' Lullaby", 'Danny Boy');
  else {
    if (want('stage')) songsToExport.push('The Wild Rover');
    if (want('pick-sheet')) songsToExport.push("Brahms' Lullaby");
    if (want('learn')) songsToExport.push('Danny Boy');
  }
  for (const title of [...new Set(songsToExport)]) {
    await scene(`export ${title}`, async () => {
      await open(title);
      await page.evaluate(() => { window.ukemusicExportDialog(); });
      await page.waitForSelector('#exportDialog[open]');
      await page.evaluate(() => {
        const wanted = ['sheet_pdf', 'sheet_stage', 'sheet_stage2', 'sheet_html', 'sheet_md', 'sheet_cho', 'lyrics_pdf', 'lyrics_txt', 'learn_sheet', 'pick_sheet'];
        for (const b of document.querySelectorAll('#exportForm input[name="format"]')) b.checked = wanted.includes(b.value);
        const current = document.querySelector('input[name="exportScope"][value="current"]'); if (current) current.checked = true;
      });
      await page.click('#exportOk');
      await page.waitForFunction(() => /Export complete|Export failed/.test(document.getElementById('toastMessage')?.textContent || ''), null, { timeout: 180000 });
      const said = await page.textContent('#toastMessage');
      await page.evaluate(() => { document.getElementById('toastMessage').textContent = ''; });
      if (!/complete/.test(said)) throw new Error(said);
      log('exported', title);
    }, { always: true });
  }
  if (doGallery) {
    await scene('songbook', async () => {
      await clubNight(); await page.click('#setlistPdf'); await page.waitForSelector('#songbookDialog[open]');
      await page.click('#songbookOk');
      await page.waitForFunction(() => /Songbook|songbook/.test(document.getElementById('toastMessage')?.textContent || ''), null, { timeout: 180000 });
      log('songbook made');
    }, { always: true });
  }
  await app.close();
}

// ── The web player, as an iPhone ─────────────────────────────────────────────────────────────
async function phone(base) {
  const DEV = { ...playwright.devices['iPhone 15'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 2 };
  delete DEV.defaultBrowserType;
  const b = await launchBrowser();
  const ctx = await b.newContext(DEV);
  const p = await ctx.newPage();
  p.on('dialog', (d) => d.dismiss());
  const home = async () => { await p.goto(`${base}/app/index.html`); await p.waitForTimeout(2000); };
  if (want('phone-library')) { await home(); await p.screenshot({ path: path.join(RAW, 'phone-library.png') }); log('took phone-library'); }
  if (want('phone-song')) {
    await home();
    await p.locator('.song-row', { hasText: 'Shenandoah' }).first().click(); await p.waitForTimeout(1500);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: path.join(RAW, 'phone-song.png') }); log('took phone-song');
  }
  await b.close();
}

// ── Pictures of files, and the WebP files themselves (made in Chromium) ──────────────────────
async function finish(base) {
  const b = await launchBrowser();
  const p = await b.newPage();
  await p.goto(`${base}/pdfjs/pdf.min.mjs`);   // a page on the server, so pdf.js can be imported
  await p.evaluate(async () => {
    window.pdfjs = await import('/pdfjs/pdf.min.mjs');
    window.pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  });
  const toWebp = async (pngFile, outFile, { quality = 0.82, crop = null } = {}) => {
    const data = fs.readFileSync(pngFile).toString('base64');
    const out = await p.evaluate(async ({ data, quality, crop }) => {
      const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
      const [x, y, w, h] = crop || [0, 0, img.width, img.height];
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, x, y, w, h, 0, 0, w, h);
      return c.toDataURL('image/webp', quality);
    }, { data, quality, crop });
    fs.writeFileSync(outFile, Buffer.from(out.split(',')[1], 'base64'));
  };
  /** Pages of a PDF in the work folder as WebP: { pages, images: [dataURL…] } */
  const pdfPages = (file, { pages = [1], height = 0, box = null, compose = null } = {}) => p.evaluate(async ({ url, pages, height, box, compose }) => {
    const doc = await window.pdfjs.getDocument({ url }).promise; // { url }: pdf.js 5 and later no longer take the address alone
    const canvases = [];
    for (const n of pages) {
      if (n > doc.numPages) continue;
      const pg = await doc.getPage(n);
      const v1 = pg.getViewport({ scale: 1 });
      const scale = box ? Math.min(box[0] / v1.width, box[1] / v1.height) : height / v1.height;
      const v = pg.getViewport({ scale: scale * 2 });
      const c = document.createElement('canvas'); c.width = Math.round(v.width); c.height = Math.round(v.height);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await pg.render({ canvasContext: g, viewport: v }).promise;
      const s = document.createElement('canvas'); s.width = Math.round(v.width / 2); s.height = Math.round(v.height / 2);
      s.getContext('2d').drawImage(c, 0, 0, s.width, s.height);
      canvases.push(s);
    }
    if (compose) {
      // pages side by side on a grey ground (the Stage picture)
      const [w, h, gap] = compose;
      const out = document.createElement('canvas'); out.width = w; out.height = h;
      const g = out.getContext('2d'); g.fillStyle = '#e9e6df'; g.fillRect(0, 0, w, h);
      const total = canvases.reduce((a, c) => a + c.width, 0) + gap * (canvases.length - 1);
      let x = Math.round((w - total) / 2);
      for (const c of canvases) {
        const y = Math.round((h - c.height) / 2);
        g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x + 4, y + 6, c.width, c.height);
        g.drawImage(c, x, y); x += c.width + gap;
      }
      return { pages: doc.numPages, images: [out.toDataURL('image/webp', 0.85)] };
    }
    return { pages: doc.numPages, images: canvases.map((c) => c.toDataURL('image/webp', 0.82)) };
  }, { url: `${base}/work/${path.relative(WORK, file).split(path.sep).map(encodeURIComponent).join('/')}`, pages, height, box, compose });
  const saveData = (dataUrl, outFile) => fs.writeFileSync(outFile, Buffer.from(dataUrl.split(',')[1], 'base64'));
  const songFile = (title, ...rest) => path.join(SONGS, title, ...rest);

  if (doImg) {
    // the screens
    for (const f of fs.readdirSync(RAW).filter((x) => x.endsWith('.png'))) {
      const name = f.replace(/\.png$/, '');
      if (KEEP.has(name)) continue;
      await toWebp(path.join(RAW, f), path.join(IMG, `${name}.webp`));
      log('saved', `site/img/${name}.webp`);
    }
    // a Stage PDF, its pages side by side
    const stagePdf = songFile('The Wild Rover', 'exports', 'Stage', 'The Wild Rover_uke (stage).pdf');
    if (want('stage') && fs.existsSync(stagePdf)) {
      const r = await pdfPages(stagePdf, { pages: [1, 2], height: 705, compose: [1360, 765, 28] });
      saveData(r.images[0], path.join(IMG, 'stage.webp')); log('saved', 'site/img/stage.webp');
    }
    // the learn sheet and the pick sheet, as the web pages the app makes
    const sheets = [
      ['learn', songFile('Danny Boy', 'learn'), /\(learn\)\.html$/, 860],
      ['pick-sheet', songFile("Brahms' Lullaby", 'learn'), /\(pick\)\.html$/, 1416]
    ];
    const sheetPage = await b.newPage({ viewport: { width: 1360, height: 1416 } });
    for (const [name, dir, re, h] of sheets) {
      if (!want(name) || !fs.existsSync(dir)) continue;
      const html = fs.readdirSync(dir).find((f) => re.test(f));
      if (!html) continue;
      await sheetPage.goto(require('url').pathToFileURL(path.join(dir, html)).href); await sheetPage.waitForTimeout(800);
      const png = path.join(RAW, `${name}.sheet.png`);
      await sheetPage.screenshot({ path: png, clip: { x: 0, y: 0, width: 1360, height: h } });
      await toWebp(png, path.join(IMG, `${name}.webp`));
      log('saved', `site/img/${name}.webp`);
    }
  }

  if (doGallery) {
    const SLUGS = [['The Wild Rover', 'wild-rover'], ["Brahms' Lullaby", 'brahms-lullaby'], ['Danny Boy', 'danny-boy']];
    const files = (t) => ({
      'sheet.pdf': ['exports', 'Song', `${t}_uke.pdf`], 'stage.pdf': ['exports', 'Stage', `${t}_uke (stage).pdf`],
      'stage2.pdf': ['exports', 'Stage', `${t}_uke (stage, two pages).pdf`],
      'lyrics.pdf': ['exports', 'Lyrics', `${t} (lyrics).pdf`], 'lyrics-stage.pdf': ['exports', 'Stage', `${t} (lyrics) (stage).pdf`],
      'learn.pdf': ['learn', `${t} (learn).pdf`], 'pick.pdf': ['learn', `${t} (pick).pdf`],
      'sheet.html': ['exports', 'Song', `${t}_uke.html`], 'song.cho': ['exports', 'Song', `${t}_uke.cho`], 'song.md': ['exports', 'Song', `${t}_uke.md`],
      'lyrics.txt': ['exports', 'Lyrics', `${t} (lyrics).txt`]
    });
    const missing = [];
    for (const [t, slug] of SLUGS) for (const [k, parts] of Object.entries(files(t))) if (!fs.existsSync(songFile(t, ...parts))) missing.push(`${t}: ${k}`);
    const songbook = require(path.join(REPO, 'src', 'setlists.js')).songbookPath(SONGS, 'Club night');
    if (!fs.existsSync(songbook)) missing.push('the songbook');
    if (missing.length) {
      log(`!! the gallery is left as it was: these weren't made: ${missing.join('; ')}`);
    } else {
      fs.rmSync(GALLERY, { recursive: true, force: true }); fs.mkdirSync(GALLERY, { recursive: true });
      const manifest = [];
      for (const [t, slug] of SLUGS) {
        const dir = path.join(GALLERY, slug); fs.mkdirSync(dir);
        const info = { title: t, slug, pages: {} };
        for (const [k, parts] of Object.entries(files(t))) {
          fs.copyFileSync(songFile(t, ...parts), path.join(dir, k));
          if (k === 'sheet.html') { // a title, description and address for search engines
            const page = path.join(dir, k);
            fs.writeFileSync(page, require(path.join(REPO, 'web', 'pages.js')).galleryPageHead(fs.readFileSync(page, 'utf8'), t, slug));
          }
          if (k.endsWith('.pdf')) {
            const r = await pdfPages(songFile(t, ...parts), { pages: [1], box: [360, 520] });
            info.pages[k] = r.pages;
            saveData(r.images[0], path.join(dir, k.replace(/\.pdf$/, '.webp')));
          }
        }
        manifest.push(info); log('gallery', slug);
      }
      const dir = path.join(GALLERY, 'songbook'); fs.mkdirSync(dir);
      fs.copyFileSync(songbook, path.join(dir, 'club-night.pdf'));
      const r = await pdfPages(songbook, { pages: [2], box: [360, 520] });
      saveData(r.images[0], path.join(dir, 'club-night.webp'));
      manifest.push({ title: 'Club night', slug: 'songbook', pages: { 'club-night.pdf': r.pages } });
      fs.writeFileSync(path.join(GALLERY, 'gallery.json'), JSON.stringify(manifest, null, 1) + '\n');
      log('gallery', 'songbook, gallery.json');
    }
  }
  await b.close();
}

(async () => {
  fs.mkdirSync(WORK, { recursive: true });
  log(`working folder: ${WORK}`);
  await desktop();
  // the web player, built from this code (for the phone pictures)
  if (doImg && (want('phone-library') || want('phone-song'))) {
    log('building the web player (node web/make.js)…');
    require('child_process').execFileSync(process.execPath, [path.join(REPO, 'web', 'make.js')], { stdio: 'inherit', cwd: REPO });
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  if (doImg && (want('phone-library') || want('phone-song'))) await phone(base);
  await finish(base);
  server.close();
  log('done. Look at site/img and site/gallery (git diff shows what changed), then build the site: node web/make.js');
})().catch((e) => { console.error(e); process.exit(1); });
