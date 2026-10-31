// UI review, web player: the web player at an iPad's or an iPhone's size (Chromium with the
// device's screen size, touch and user agent: not Safari on a real device), every screen as a
// picture with an id from catalog.json and a caption. Run by run.js; see README.md.
//   node tools/ui-review/web.js ipad|iphone <web player URL> <work folder>
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const practiceShots = require('./practice.js');

const which = process.argv[2] || 'ipad';
const URL = process.argv[3] || 'http://localhost:8770/index.html';
const WORK = path.resolve(process.argv[4] || path.join(require('os').tmpdir(), 'ukemusic-ui-review'));
// the area Safari leaves for the page, in portrait: an iPad (10th/11th generation, Air) and an iPhone 15
const DEV = which === 'ipad'
  ? { ...devices['iPad (gen 11)'], viewport: { width: 820, height: 1106 }, screen: { width: 820, height: 1180 }, deviceScaleFactor: 2 }
  : { ...devices['iPhone 15'], viewport: { width: 393, height: 740 }, screen: { width: 393, height: 852 }, deviceScaleFactor: 2 };
delete DEV.defaultBrowserType;
const OUT = path.join(WORK, 'shots', which);
const manifest = [];
const log = (...a) => console.log(which, ...a);

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext(DEV);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => log('PAGE ERROR', e.message));
  p.on('dialog', (d) => d.dismiss());
  log('viewport', JSON.stringify(p.viewportSize()));
  const shot = async (id, caption, { full = false } = {}) => {
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(OUT, `${id}.jpg`), fullPage: full, type: 'jpeg', quality: 85 });
    manifest.push({ id, caption });
    log('shot', id);
  };
  const safe = async (label, fn) => { try { await fn(); } catch (e) { log(`!! ${label}: ${e.message.split('\n')[0]}`); } };
  const closeDialogs = () => p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  const home = async () => { await p.goto(URL); await p.waitForTimeout(1800); };
  const open = async (title) => {
    await home();
    await p.locator('.song-row', { hasText: title }).first().click(); await p.waitForTimeout(1500);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  };
  const dlg = async (button, id, caption, { scroll } = {}) => safe(id, async () => {
    await p.click(button); await p.waitForTimeout(900);
    if (scroll) await p.evaluate(scroll);
    await shot(id, caption);
    await closeDialogs(); await p.waitForTimeout(300);
  });
  const stopAll = async () => {
    await p.click('#karaokeClose', { timeout: 1500 }).catch(() => {});
    await p.keyboard.press('Escape').catch(() => {});
    await closeDialogs();
    await p.waitForTimeout(500);
  };

  // ── L: Library ──
  await home();
  await safe('L1', () => shot('L1', 'Songs to play: the library'));
  await safe('L1b', async () => { await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400); await shot('L11', 'The library, scrolled to the end: New song, Dropbox, Back up, About'); await p.evaluate(() => window.scrollTo(0, 0)); });
  await safe('L2', async () => { await p.fill('#search', 'traditional'); await p.waitForTimeout(600); await shot('L2', 'Searching the library ("traditional")'); await p.fill('#search', ''); });
  await dlg('#newSongBtn', 'L4', 'New song: choosing a title');
  await dlg('#guideBtnLib', 'E5', 'How to write: the guide');
  await dlg('#aboutBtn', 'L10', 'About ukemusic');
  await dlg('#cloudBtn', 'D1', 'Songs in Dropbox: connect to a shared songs folder');

  // ── S: Song sheet ──
  await safe('S1', async () => { await open('The Wild Rover'); await shot('S1', 'A song open: the sheet, with the player at the bottom'); });
  await safe('S2', async () => {
    await p.locator('summary', { hasText: 'Song overview' }).first().click(); await p.waitForTimeout(800);
    await shot('S2', 'Song overview opened: chord shapes, tune and rhythm');
    await p.locator('summary', { hasText: 'Song overview' }).first().click(); await p.waitForTimeout(300);
  });
  await safe('S3', async () => { await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(500); await shot('S3', 'Further down the song'); await p.evaluate(() => window.scrollTo(0, 0)); });
  await safe('S4', async () => {
    await p.click('#keyUp'); await p.waitForTimeout(300); await p.click('#keyUp'); await p.waitForTimeout(300);
    await p.click('#capoUp'); await p.waitForTimeout(800);
    await shot('S4', 'The key moved up a tone, with a capo');
    await p.click('#capoDown'); await p.click('#keyDown'); await p.click('#keyDown'); await p.waitForTimeout(500);
  });
  await safe('S5', async () => {
    const hiddenTool = !(await p.isVisible('#instrument'));
    if (hiddenTool) { await p.click('#moreBtn'); await p.waitForTimeout(500); }
    await p.selectOption('#instrument', 'guitar'); await p.waitForTimeout(900);
    if (hiddenTool) { await p.click('#moreBtn'); await p.waitForTimeout(500); await p.evaluate(() => window.scrollTo(0, 0)); }
    await shot('S5', 'Another instrument: the song for guitar');
    if (hiddenTool) { await p.click('#moreBtn'); await p.waitForTimeout(400); }
    await p.selectOption('#instrument', 'soprano'); await p.waitForTimeout(500);
    if (hiddenTool) { await p.click('#moreBtn'); await p.waitForTimeout(400); }
  });
  await safe('S10', async () => { await p.click('#moreBtn'); await p.waitForTimeout(800); await shot('S10', 'Settings: playing choices for this song on this device'); });
  await safe('S6', async () => {
    await p.locator('summary', { hasText: 'Display' }).first().click(); await p.waitForTimeout(700);
    await p.locator('summary', { hasText: 'Display' }).first().scrollIntoViewIfNeeded();
    await shot('S6', 'Display: text size, layout, chord shapes, tune, look');
  });
  await safe('S7', async () => {
    const v = await p.$eval('#layout', (s) => [...s.options].find((o) => /in the words/i.test(o.textContent))?.value);
    await p.selectOption('#layout', v); await p.waitForTimeout(900);
    await p.click('#moreBtn').catch(() => {}); await p.waitForTimeout(400); await p.evaluate(() => window.scrollTo(0, 0));
    await shot('S7', 'Chords in the words');
    await p.click('#moreBtn'); await p.waitForTimeout(400);
    const l = await p.$eval('#layout', (s) => s.options[0].value);
    await p.selectOption('#layout', l); await p.waitForTimeout(300);
  });
  await safe('S8', async () => {
    await p.selectOption('#lookSel', 'stage'); await p.waitForTimeout(900);
    await p.click('#moreBtn').catch(() => {}); await p.waitForTimeout(400); await p.evaluate(() => window.scrollTo(0, 0));
    await shot('S8', 'The Stage copy look');
    await p.click('#moreBtn'); await p.waitForTimeout(300);
    await p.selectOption('#lookSel', 'standard'); await p.click('#moreBtn'); await p.waitForTimeout(400);
  });

  // ── P: Playing ──
  await safe('P2', async () => {
    await open('The Wild Rover');
    await p.click('#playBtn'); await p.waitForTimeout(7000);
    await shot('P2', 'Playing: the line lit, the chord and strum, the next shapes');
    await p.click('#playBtn').catch(() => {}); await p.waitForTimeout(500);
    await shot('P1', 'Paused: Play resumes from here, Restart goes back to the start');
    await p.click('#restartBtn').catch(() => {}); await p.waitForTimeout(400); await p.click('#playBtn').catch(() => {}); await p.waitForTimeout(300);
  });
  await safe('P3', async () => {
    await open('The Wild Rover');
    await p.click('#karaokeButton'); await p.waitForTimeout(8000);
    await shot('P3', 'Karaoke: big words lit as they\'re sung');
    await stopAll();
  });
  await safe('P4', async () => {
    await open('The Wild Rover');
    await p.click('#sessionBtn'); await p.waitForTimeout(900);
    await shot('P6', 'Group screen: the queue of songs');
    await p.click('dialog[open] [data-open]'); await p.waitForTimeout(1500);
    await shot('P4', 'The Group screen: the whole song on one screen');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  });

  // ── R: Learn ──
  await safe('R1', async () => { await open("It's a Long Way to Tipperary"); await p.click('#learnBtn'); await p.waitForTimeout(800); await shot('R1', 'Learn this song: the choices'); });
  await safe('R2', async () => {
    await p.click('#learnPlay'); await p.waitForTimeout(15000);
    await shot('R2', 'From memory: the chords hidden after the first time');
    await stopAll();
  });
  await safe('R3', async () => {
    await open("It's a Long Way to Tipperary"); await p.click('#learnBtn'); await p.waitForTimeout(500);
    await p.click('#learnQuizBtn'); await p.waitForTimeout(900);
    await shot('R3', 'Next chord? The quiz');
    await p.locator('dialog[open] button.lq-pick, dialog[open] .lq-options button').first().click(); await p.waitForTimeout(900);
    await shot('R4', 'Next chord? An answer chosen');
    await closeDialogs();
  });
  for (const [btn, id, cap] of [['#learnPatternsBtn', 'R6', 'Chord patterns: the chords as numbers, the parts and the patterns'], ['#learnCircleBtn', 'R7', 'The circle of fifths']]) {
    await safe(id, async () => { await p.click('#learnBtn'); await p.waitForTimeout(500); await p.click(btn); await p.waitForTimeout(900); await shot(id, cap); await closeDialogs(); await p.waitForTimeout(300); });
  }
  await safe('R10', async () => {
    await p.click('#learnBtn'); await p.waitForTimeout(500); await p.click('#learnSheetBtn'); await p.waitForTimeout(1500);
    await shot('R11', 'The learn sheet, shown in the app (Print, Save)'); await closeDialogs();
  });
  await safe('R9', async () => {
    await p.click('#learnBtn'); await p.waitForTimeout(500);
    const v = await p.$eval('#learnStage', (s) => [...s.options].find((o) => /numbers/i.test(o.textContent))?.value);
    await p.selectOption('#learnStage', v); await p.click('#learnPlay'); await p.waitForTimeout(6000);
    await shot('R9', 'The chords as numbers only (I, IV, V…)');
    await stopAll();
  });

  // ── A: Accompaniment ──
  await safe('A1', async () => { await open("Brahms' Lullaby"); await p.click('#accompanimentBtn'); await p.waitForTimeout(800); await shot('A1', 'Accompaniment: choose a picking pattern'); });
  await safe('A3', async () => { await p.click('#pickHelpBtn'); await p.waitForTimeout(800); await shot('A3', 'How picking works'); await p.click('#pickHelpClose').catch(() => closeDialogs()); await p.waitForTimeout(400); });
  await safe('A2', async () => {
    if (!(await p.isVisible('#pickPlay'))) { await p.click('#accompanimentBtn'); await p.waitForTimeout(600); }
    await p.locator('dialog[open] button', { hasText: 'Up and back' }).first().click(); await p.waitForTimeout(600);
    await shot('A7', 'A pattern chosen (Up and back)');
    await p.click('#pickPlay'); await p.waitForTimeout(7000);
    await shot('A2', 'Picking while it plays (in Karaoke)');
    await stopAll();
  });
  await safe('A4', async () => {
    await open("Brahms' Lullaby"); await p.click('#accompanimentBtn'); await p.waitForTimeout(600);
    await p.click('#pickSheetBtn'); await p.waitForTimeout(1500);
    await shot('A4', 'The pick sheet, shown in the app'); await closeDialogs();
  });

  // ── E: Editing ──
  await safe('E1', async () => { await open('Danny Boy'); await p.click('#editBtn'); await p.waitForTimeout(1200); await shot('E1', 'Edit: the words and chords, with insert buttons'); });
  await safe('E15', async () => { await p.locator('summary', { hasText: 'Help with insertion' }).first().click(); await p.waitForTimeout(500); await shot('E15', 'Help with the insert buttons'); await p.locator('summary', { hasText: 'Help with insertion' }).first().click(); });
  await safe('E2', async () => { await p.click('#editTabInfo'); await p.waitForTimeout(600); await shot('E2', 'Details: the song\'s facts and settings'); });
  await safe('E3', async () => { await p.click('#editTabNotes'); await p.waitForTimeout(600); await shot('E3', 'Notes'); await p.click('#editTabWords'); await p.waitForTimeout(400); });
  await safe('E14', async () => { await p.click('#editPreviewBtn'); await p.waitForTimeout(1000); await shot('E14', 'Preview while editing'); await p.click('#editPreviewBtn').catch(() => {}); await p.waitForTimeout(400); });
  await safe('E16', async () => { await p.click('#editHelp'); await p.waitForTimeout(800); await shot('E16', 'Editing help'); await closeDialogs(); });
  await safe('E17', async () => {
    await p.click('#editDone'); await p.waitForTimeout(800);
    await open('Danny Boy');
    await shot('E18', 'Back on the sheet after editing');
  });

  // ── X: Download ──
  await dlg('#downloadBtn', 'X1', 'Download: the song as a file, a web page, a Stage copy, words or ChordPro');

  // ── F: Free Practice ──
  await safe('F', async () => {
    await home(); await p.click('#libPractice'); await p.waitForTimeout(1500);
    await practiceShots(p, shot, log, { phone: which === 'iphone' });
  });

  fs.writeFileSync(path.join(WORK, `manifest-${which}.json`), JSON.stringify(manifest, null, 1));
  log('done:', manifest.length, 'pictures');
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
