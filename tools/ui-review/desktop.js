// UI review, desktop app: opens the app with its own settings folder and a copy of the
// public-domain songs, goes to every screen and takes a picture of each (an id from catalog.json
// and a caption). Run by run.js; see README.md.
//   node tools/ui-review/desktop.js <work folder> [section letters, e.g. L S]
const { _electron: electron } = require('playwright');
const fs = require('fs');
const path = require('path');
const practiceShots = require('./practice.js');

const REPO = path.resolve(__dirname, '..', '..');
const WORK = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'ukemusic-ui-review'));
const only = process.argv.slice(3);
const OUT = path.join(WORK, 'shots', 'desktop');
const HOME = path.join(WORK, 'desktop-settings');
const SONGS = path.join(WORK, 'Songs');
const TRASH = path.join(WORK, 'trash');
const PD = path.join(REPO, 'public domain songs', 'Public Domain Songs');
const ELECTRON = process.env.UKEMUSIC_ELECTRON || require(path.join(REPO, 'node_modules', 'electron'));
const W = 1440, H = 900;
const log = (...a) => console.log('desktop', ...a);
const manifest = [];
const shotPath = (id) => path.join(OUT, `${id}.jpg`);

// an original practice tune with tab, for "The tab, in steps" (not a real song)
const PICK_SONG = `--START MUSIC--
[[Intro]]
\`\`\`tab
A|-----0-----0-|-----0-----0-|-----1-----1-|-----0-----0-|
E|---0-----0---|---1-----1---|---1-----1---|---0-----0---|
C|-0-----0-----|-0-----0-----|-0-----0-----|-0-----0-----|
g|0-----0------|2-----2------|2-----2------|0-----0------|
\`\`\`
[[Verse]]
[C]Morning comes in [G7]slow and grey,
[F]picking out the [C]tune all day
--END MUSIC--
`;

async function launch() {
  const app = await electron.launch({
    executablePath: ELECTRON,
    args: [REPO, '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
    // its own settings folder (UKEMUSIC_USER_DATA), so your settings and songs are left alone;
    // anything it deletes goes to the work folder's trash, not the Recycle Bin
    env: { ...process.env, UKEMUSIC_USER_DATA: HOME, UKEMUSIC_TEST_TRASH: TRASH }
  });
  const page = await app.firstWindow();
  page.on('pageerror', (e) => log('page error:', e.message));
  page.on('dialog', (d) => d.dismiss());
  // the app's tools live on ribbon tabs: show the right tab before using a control
  for (const method of ['click', 'fill', 'selectOption', 'check', 'uncheck', 'hover']) {
    const original = page[method].bind(page);
    page[method] = async (selector, ...rest) => {
      if (typeof selector === 'string') await page.evaluate((s) => window.ukemusicReveal && window.ukemusicReveal(s), selector).catch(() => {});
      return original(selector, ...rest);
    };
  }
  await page.waitForTimeout(1500);
  return { app, page };
}

(async () => {
  for (const dir of [HOME, SONGS, TRASH]) fs.rmSync(dir, { recursive: true, force: true });
  if (!only.length) fs.rmSync(OUT, { recursive: true, force: true });
  for (const dir of [OUT, TRASH, HOME, SONGS]) fs.mkdirSync(dir, { recursive: true });
  for (const t of fs.readdirSync(PD)) fs.cpSync(path.join(PD, t), path.join(SONGS, t), { recursive: true });
  fs.mkdirSync(path.join(SONGS, 'Picking Song'), { recursive: true });
  fs.writeFileSync(path.join(SONGS, 'Picking Song', 'Picking Song-song.txt'), PICK_SONG);
  fs.mkdirSync(path.join(SONGS, 'Setlists'), { recursive: true });
  fs.writeFileSync(path.join(SONGS, 'Setlists', 'Club night.txt'), ['The Wild Rover', "It's a Long Way to Tipperary", 'Danny Boy', 'Amazing Grace', 'Scarborough Fair'].join('\n') + '\n');
  fs.writeFileSync(path.join(HOME, 'config.ini'), `[library]\nsongs_folder = ${SONGS}\nstart_screen = library\nstarters_added = true\n`);

  const { app, page } = await launch();
  page.setDefaultTimeout(8000);
  const size = (w, h) => app.evaluate(({ BrowserWindow }, [w, h]) => { const win = BrowserWindow.getAllWindows()[0]; win.setFullScreen(false); win.unmaximize(); win.setContentSize(w, h); }, [w, h]);
  await size(W, H);
  await page.waitForTimeout(800);

  const tidy = (p) => p.evaluate(() => {
    const f = document.getElementById('libFolder'); if (f) f.style.visibility = 'hidden';
    const t = document.getElementById('toast'); if (t) t.classList.remove('visible');
  }).catch(() => {});
  const shot = async (id, caption, p = page) => {
    await tidy(p);
    await p.waitForTimeout(150);
    await p.screenshot({ path: shotPath(id), type: 'jpeg', quality: 85 });
    manifest.push({ id, caption });
    log('shot', id, caption);
  };
  const safe = async (label, fn) => { if (only.length && !only.includes(label.replace(/[0-9a-z]+$/, ''))) return; try { await fn(); } catch (e) { log(`!! ${label}: ${e.message.split('\n')[0]}`); } };
  const closeDialogs = () => page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  const dialog = async (button, id, caption, dlg) => safe(id, async () => {
    await closeDialogs();
    await page.click(button);
    if (dlg) await page.waitForSelector(`#${dlg}[open]`, { timeout: 5000 });
    await page.waitForTimeout(700);
    await shot(id, caption);
    await closeDialogs();
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  });
  async function library() {
    await closeDialogs();
    await page.evaluate(() => window.ukemusicShowLibrary());
    await page.waitForTimeout(500);
    await page.click('#libTabSongs').catch(() => {});
    await page.fill('#libSearch', '');
  }
  async function open(title) {
    await library();
    await page.fill('#libSearch', title);
    await page.waitForTimeout(400);
    await page.locator('#libList .library-row', { hasText: title }).first().click();
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const p = document.getElementById('preview'); if (p && p.contentWindow) p.contentWindow.scrollTo(0, 0); });
  }
  const tab = async (t) => { await page.click(`#ribbonTab${t}`); await page.waitForTimeout(400); };

  // ── L: Library ──
  await safe('L1', async () => { await library(); await page.waitForTimeout(600); await shot('L1', 'Your songs: the library'); });
  await safe('L2', async () => { await page.fill('#libSearch', 'traditional'); await page.waitForTimeout(600); await shot('L2', 'Searching the library ("traditional")'); await page.fill('#libSearch', ''); });
  await safe('L3', async () => {
    await page.waitForTimeout(400);
    const row = page.locator('#libList .library-row', { hasText: 'Danny Boy' }).first();
    await row.locator('.lib-more').click(); await page.waitForSelector('.row-menu'); await page.waitForTimeout(300);
    await shot('L3', 'A song\'s ⋯ menu in the library');
    await page.keyboard.press('Escape'); await page.mouse.click(5, 5);
  });
  await safe('L4', async () => {
    await library(); await page.click('#libNew'); await page.waitForSelector('#titleDialog[open]'); await page.waitForTimeout(400);
    await shot('L4', 'New song: choosing a title'); await closeDialogs();
  });
  await safe('L5', async () => {
    await library(); await page.click('#libTabSetlists'); await page.waitForTimeout(500);
    await page.locator('#setlistList >> text=Club night').first().click(); await page.waitForTimeout(800);
    await shot('L5', 'Setlists: a setlist for a club night');
  });
  await safe('L6', async () => {
    await library(); await page.click('#pasteSheetButton'); await page.waitForSelector('#convertDialog[open]');
    await page.fill('#convertInput', 'C           G\nHello there my friend\nF              C\nSinging all the day\n');
    await page.waitForTimeout(700);
    await shot('L6', 'Paste a song from a website'); await closeDialogs();
  });
  await safe('L7', async () => { await library(); await page.click('#libSwitch'); await page.waitForTimeout(500); await shot('L7', 'Libraries: switch, start a new one, share as a pack'); await page.keyboard.press('Escape'); await page.mouse.click(5, 5); });
  await safe('L8', async () => { await library(); await page.click('#libPhone'); await page.waitForSelector('#phoneDialog[open]'); await page.waitForTimeout(500); await shot('D2', 'Phone and tablet: songs to and from the web player'); await closeDialogs(); });

  // ── S: The song sheet ──
  await safe('S1', async () => { await open('The Wild Rover'); await tab('Song'); await shot('S1', 'A song open: the words and chords, and the chord sheet beside them'); });
  await safe('S3', async () => {
    await page.evaluate(() => { const p = document.getElementById('preview'); p.contentWindow.scrollTo(0, 700); });
    await page.waitForTimeout(500); await shot('S3', 'Further down the song');
    await page.evaluate(() => { const p = document.getElementById('preview'); p.contentWindow.scrollTo(0, 0); });
  });
  await safe('S10', async () => { await tab('ThisSong'); await shot('S10', 'This song: key, capo, instrument, tempo and strum'); });
  await safe('S4', async () => {
    await page.click('#transposeUp'); await page.waitForTimeout(300); await page.click('#transposeUp'); await page.waitForTimeout(800);
    await shot('S4', 'The key moved up a tone (C to D)');
    await page.click('#transposeDown'); await page.waitForTimeout(300); await page.click('#transposeDown'); await page.waitForTimeout(500);
  });
  await dialog('#capoSuggestButton', 'S11', 'Capo: suggested positions', 'capoDialog');
  await safe('S5', async () => {
    await page.selectOption('#instrumentSelect', 'guitar'); await page.waitForTimeout(1000);
    await shot('S5', 'Another instrument: the song for guitar');
    await page.selectOption('#instrumentSelect', 'soprano'); await page.waitForTimeout(700);
  });
  await safe('S6', async () => { await tab('View'); await shot('S6', 'Display: chord shapes, text size, strum style, layout'); });
  await safe('S7', async () => {
    await page.selectOption('#viewLayout', 'inline'); await page.waitForTimeout(900);
    await shot('S7', 'Chords in the words'); await page.selectOption('#viewLayout', 'lines'); await page.waitForTimeout(500);
  });
  await safe('S8', async () => {
    await page.selectOption('#viewLook', 'stage'); await page.waitForTimeout(1200);
    await shot('S8', 'The Stage copy look'); await page.selectOption('#viewLook', 'standard'); await page.waitForTimeout(500);
  });
  await dialog('#editStylesheetButton', 'S12', 'Edit style: the style set\'s CSS', 'cssDialog');

  // ── P: Playing ──
  await safe('P1', async () => { await open('The Wild Rover'); await tab('Play'); await shot('P1', 'Ready to play: the Play tab'); });
  await safe('P2', async () => {
    await page.click('#playButton'); await page.waitForTimeout(7000);
    await shot('P2', 'Playing: the line, chord and strum lit, the next shapes ready');
    await page.click('#stopButton').catch(() => {}); await page.waitForTimeout(500);
  });
  await safe('P3', async () => {
    await page.click('#karaokeButton'); await page.waitForTimeout(8000);
    await shot('P3', 'Karaoke: full screen, the words lit as they\'re sung');
    await page.click('#karaokeClose').catch(() => page.keyboard.press('Escape')); await page.waitForTimeout(600);
  });
  await safe('P4', async () => {
    await tab('Play');
    const [win] = await Promise.all([app.waitForEvent('window'), page.click('#sessionButton')]);
    await win.waitForTimeout(1500);
    await app.evaluate(({ BrowserWindow }) => { for (const x of BrowserWindow.getAllWindows().slice(1)) { x.setFullScreen(false); x.setContentSize(1440, 810); } });
    await win.waitForTimeout(1500);
    await shot('P4', 'The Group screen (Session): the whole song on one screen, for the TV', win);
    await win.close().catch(() => {}); await page.waitForTimeout(600);
  });
  await safe('P5', async () => {
    await tab('Play');
    await page.check('#loopSection').catch(() => {});
    await page.waitForTimeout(400);
    await shot('P5', 'Practice choices on the Play tab: loop a section, slower, speeding up');
    await page.uncheck('#loopSection').catch(() => {});
  });

  // ── R: Learn ──
  await safe('R1', async () => { await open("It's a Long Way to Tipperary"); await tab('Learn'); await shot('R1', 'The Learn tab'); });
  await safe('R2', async () => {
    await page.selectOption('#learnStage', 'repeats'); await page.click('#learnPlayButton'); await page.waitForTimeout(15000);
    await shot('R2', 'From memory: the chords hidden after the first time');
    await page.click('#karaokeClose').catch(() => page.keyboard.press('Escape')); await page.waitForTimeout(600);
  });
  await safe('R3', async () => {
    await tab('Learn'); await page.click('#learnQuizButton'); await page.waitForSelector('#learnQuizDialog[open]'); await page.waitForTimeout(600);
    await shot('R3', 'Next chord? The quiz');
    await page.locator('#learnQuizDialog .lq-pick').first().click(); await page.waitForTimeout(800);
    await shot('R4', 'Next chord? An answer chosen');
    await closeDialogs();
  });
  await dialog('#learnChangesButton', 'R5', 'Changes: the hardest first, with what each finger does', 'learnChangesDialog');
  await dialog('#learnPatternsButton', 'R6', 'Chord patterns: the chords as numbers, the parts and the patterns', 'patternsDialog');
  await dialog('#learnCircleButton', 'R7', 'The circle of fifths', 'learnCircleDialog');
  await dialog('#learnTroubleButton', 'R8', 'Trouble spots', 'learnTroubleDialog');
  await safe('R9', async () => { await tab('Learn'); await page.check('#learnNumbers'); await page.waitForTimeout(900); await shot('R9', 'Numbers on the sheet (I, IV, V…)'); await page.uncheck('#learnNumbers'); });
  await safe('R10', async () => {
    await tab('Learn'); await page.click('#learnSheetButton');
    await page.waitForFunction(() => /Learn sheet made|Could not/.test(document.getElementById('toastMessage')?.textContent || ''), null, { timeout: 40000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => { const t = document.getElementById('toast'); t.dataset.keep = '1'; });
    await page.screenshot({ path: shotPath('R10'), type: 'jpeg', quality: 85 }); manifest.push({ id: 'R10', caption: 'Learn sheet: made, with Open' }); log('shot R10');
    const dir = path.join(SONGS, "It's a Long Way to Tipperary", 'learn');
    const html = fs.readdirSync(dir).find((f) => f.endsWith('.html'));
    fs.copyFileSync(path.join(dir, html), path.join(WORK, 'learn-sheet.html'));
  });
  await safe('R12', async () => { await tab('Learn'); await page.click('#learnDrillButton'); await page.waitForTimeout(1500); await shot('R12', 'Shapes: drill this song\'s chord shapes in Free Practice'); await page.click('#practiceClose').catch(() => page.keyboard.press('Escape')); await page.waitForTimeout(600); });

  // ── A: Accompaniment ──
  await safe('A1', async () => { await open("Brahms' Lullaby"); await tab('Pick'); await shot('A1', 'Accompaniment: choose a picking pattern'); });
  await safe('A2', async () => {
    await page.check('#pickTune').catch(() => {});
    await page.click('#pickPlayButton'); await page.waitForTimeout(7000);
    await shot('A2', 'Picking while it plays, with the tune drawn as notes');
    await page.click('#pickStopButton').catch(() => {}); await page.uncheck('#pickTune').catch(() => {}); await page.waitForTimeout(500);
  });
  await dialog('#pickHelpButton', 'A3', 'How picking works', 'pickHelpDialog');
  await dialog('#pickWriteButton', 'A6', 'Write the picking out as a new song', 'pickWriteDialog');
  await safe('A4', async () => {
    await tab('Pick'); await page.click('#pickSheetButton');
    await page.waitForFunction(() => /sheet made|Could not/i.test(document.getElementById('toastMessage')?.textContent || ''), null, { timeout: 40000 });
    const dir = path.join(SONGS, "Brahms' Lullaby", 'learn');
    const html = fs.readdirSync(dir).find((f) => /pick/.test(f) && f.endsWith('.html'));
    fs.copyFileSync(path.join(dir, html), path.join(WORK, 'pick-sheet.html'));
    log('pick sheet made');
  });
  await safe('A5', async () => {
    await open('Picking Song'); await tab('Pick'); await page.click('#learnPickButton'); await page.waitForSelector('#learnPickDialog[open]'); await page.waitForTimeout(600);
    await shot('A5', 'The tab, in steps (a song with tab)'); await closeDialogs();
  });

  // ── E: Writing and editing ──
  await safe('E1', async () => { await open('Danny Boy'); await tab('Write'); await page.click('#tabSong'); await shot('E1', 'Write: the words and chords, with the writing tools'); });
  await safe('E2', async () => { await page.click('#tabDetails'); await page.waitForTimeout(500); await shot('E2', 'Details: artist, year, key, time, tags…'); });
  await safe('E3', async () => { await page.click('#tabNotes'); await page.waitForTimeout(500); await shot('E3', 'Notes'); });
  await safe('E4', async () => { await page.click('#tabLinks'); await page.waitForTimeout(500); await shot('E4', 'Links: recordings and pages for the song'); });
  await safe('E11', async () => { await page.click('#tabChordPro'); await page.waitForTimeout(500); await shot('E11', 'ChordPro fields'); });
  await safe('E12', async () => { await page.click('#tabExports'); await page.waitForTimeout(500); await shot('E12', 'The song\'s exports'); await page.click('#tabSong'); });
  await dialog('#shapesButton', 'E6', 'Chord shapes: choose a shape for each chord', 'shapeDialog');
  await dialog('#strumsButton', 'E7', 'Strum patterns: the strum library', 'strumDialog');
  await dialog('#guessKeyButton', 'E8', 'Guess the key', 'keyDialog');
  await dialog('#guideButton', 'E5', 'How to write: the guide', 'guideDialog');
  await safe('E9', async () => { await tab('ThisSong'); await page.click('#saveVersionButton'); await page.waitForSelector('#versionDialog[open]'); await page.waitForTimeout(500); await shot('E9', 'Save this key as a version'); await closeDialogs(); });
  await safe('E10', async () => { await tab('Song'); await shot('E13', 'File: close, save, rename, import, paste, add to setlist'); await page.click('#historyButton'); await page.waitForSelector('#historyDialog[open]'); await page.waitForTimeout(500); await shot('E10', 'Earlier versions of the song'); await closeDialogs(); });
  await safe('L9', async () => { await open('Danny Boy'); await tab('Song'); await page.click('#addToSetlistButton'); await page.waitForSelector('#setlistAddDialog[open]', { timeout: 5000 }); await page.waitForTimeout(500); await shot('L9', 'Add a song to a setlist'); await closeDialogs(); });

  // ── X: Export ──
  await safe('X0', async () => { await open('The Wild Rover'); await tab('Export'); await shot('X0', 'The Export tab'); });
  await safe('X1', async () => {
    await page.evaluate(() => { window.ukemusicExportDialog(); }); await page.waitForSelector('#exportDialog[open]');
    await page.evaluate(() => { const m = document.getElementById('exportMore'); if (m) m.open = true; }); await page.waitForTimeout(500);
    await shot('X1', 'Export: the formats to make'); await closeDialogs();
  });
  await safe('X3', async () => {
    await library(); await page.click('#libTabSetlists'); await page.waitForTimeout(400);
    await page.locator('#setlistList >> text=Club night').first().click(); await page.waitForTimeout(600);
    await page.click('#setlistPdf'); await page.waitForTimeout(900);
    await shot('X3', 'Songbook PDF from a setlist'); await closeDialogs();
  });

  // ── G: Settings ──
  await safe('G1', async () => {
    await open('The Wild Rover'); await page.click('#settingsToggleButton'); await page.waitForTimeout(800);
    await page.click('#settingsTabSong').catch(() => {}); await page.waitForTimeout(500);
    await shot('G1', 'Settings: this song');
    await page.click('#settingsTabAll'); await page.waitForTimeout(500);
    const heads = ['Songs folder', 'Instrument and chord diagrams', 'How the chord sheet looks', 'Fonts, colours and printing', 'Stage copies', 'Playback and karaoke', 'App appearance'];
    let n = 2;
    for (const h of heads) {
      const ok = await page.evaluate((h) => {
        const el = [...document.querySelectorAll('#settingsPanel h2, #settingsPanel h3, #settingsPanel summary, #settingsPanel legend')].find((x) => x.textContent.trim().startsWith(h));
        if (!el) return false; el.scrollIntoView({ block: 'start' }); return true;
      }, h);
      if (!ok) { log('!! no settings heading', h); continue; }
      await page.waitForTimeout(400);
      await shot(`G${n}`, `Settings, all songs: ${h}`); n += 1;
    }
    await page.click('#closeSettingsButton').catch(() => {});
  });
  await dialog('#aboutButton', 'L10', 'About ukemusic', 'aboutDialog');

  // ── F: Free Practice ──
  await safe('F', async () => {
    await library(); await page.click('#libPractice'); await page.waitForTimeout(1500);
    await practiceShots(page, shot, log, { phone: false });
    await page.click('#practiceClose').catch(() => {});
  });

  // the learn and pick sheets the app made, as pictures of the files themselves
  if (!only.length || only.includes('R') || only.includes('A')) {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const sheet = await browser.newPage({ viewport: { width: 1100, height: 1500 } });
    for (const [file, id, caption] of [['learn-sheet.html', 'R13', 'The learn sheet the app makes (web page and PDF, in the song\'s learn folder)'], ['pick-sheet.html', 'A4', 'The pick sheet the app makes (web page and PDF, in the song\'s learn folder)']]) {
      const f = path.join(WORK, file);
      if (!fs.existsSync(f)) continue;
      await sheet.goto(require('url').pathToFileURL(f).href); await sheet.waitForTimeout(800);
      await sheet.screenshot({ path: shotPath(id), type: 'jpeg', quality: 85 });
      manifest.push({ id, caption });
    }
    await browser.close();
  }
  // the manifest: what was taken (when only some sections were run, merged with the last run)
  const MF = path.join(WORK, 'manifest-desktop.json');
  let all = [];
  try { if (only.length) all = JSON.parse(fs.readFileSync(MF, 'utf8')); } catch (_e) { /* a new one */ }
  for (const m of manifest) { all = all.filter((x) => x.id !== m.id); all.push(m); }
  fs.writeFileSync(MF, JSON.stringify(all, null, 1));
  log('done:', manifest.length, 'pictures');
  await app.close();
})().catch((e) => { console.error(e); process.exit(1); });
