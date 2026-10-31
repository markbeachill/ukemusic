// Free Practice screens, the same markup in the desktop app and the web player.
// shot(id, caption) takes a picture; p is the page; log prints.
module.exports = async function practiceShots(p, shot, log, { phone = false } = {}) {
  const safe = async (label, fn) => { try { await fn(); } catch (e) { log(`!! practice ${label}: ${e.message.split('\n')[0]}`); } };
  const pick = (sel, text) => ({ click: () => p.evaluate(([sel, text]) => { const e = [...document.querySelectorAll(sel)].find((x) => x.textContent.includes(text)); if (!e) throw new Error('no ' + text); e.scrollIntoView({ block: 'center' }); e.click(); }, [sel, text]) });
  const card = (title) => pick('#prCards .pr-card, #prBeginnerCards button, #prRecentCards button', title);
  const cat = (name) => pick('#prCats .pr-cat', name);
  const jsClick = (id) => p.evaluate((id) => { const e = document.getElementById(id); if (e && !e.disabled) e.click(); }, id);
  const back = async () => {
    await jsClick('prStop'); await jsClick('prMobileStop');
    await p.waitForTimeout(300);
    await jsClick('prBack');
    await p.waitForTimeout(500);
  };
  const start = async () => {
    if (phone && await p.isVisible('#prMobileStart').catch(() => false)) await p.click('#prMobileStart');
    else await jsClick('prStart');
  };
  const exercise = async (catName, title, id, caption, { play = 3500, extra } = {}) => {
    await safe(id, async () => {
      await cat(catName).click(); await p.waitForTimeout(400);
      await card(title).click(); await p.waitForTimeout(900);
      if (extra) await extra();
      if (play) { await start(); await p.waitForTimeout(play); }
      await shot(id, caption);
      await back();
    });
  };
  await safe('home', async () => { await shot('F1', 'Free Practice: the menu, opened on Warm-ups'); });
  await safe('start', async () => {
    const s = p.locator('#prHome summary', { hasText: 'Start here' }).first();
    await s.click(); await p.waitForTimeout(500);
    await shot('F2', 'Start here: three beginner exercises');
    await s.click(); await p.waitForTimeout(300);
  });
  await safe('cat', async () => { await cat('Strumming').click(); await p.waitForTimeout(500); await shot('F3', 'A category: Strumming & rhythm'); });
  await exercise('Warm-ups', 'Spider walk (1-2-3-4)', 'F4', 'Spider walk, playing: the fretboard, the finger and the tab');
  await exercise('Chords', 'Chord switching', 'F5', 'Chord switching, playing: now and next chord');
  await exercise('Chords', 'One-minute changes', 'F6', 'One-minute changes, before starting', { play: 0 });
  await exercise('Chords', '12-bar blues', 'F7', '12-bar blues, playing: the grid of bars');
  await exercise('Strumming', 'The island strum', 'F8', 'The island strum, playing: the strum boxes lit');
  await exercise('Strumming', 'Metronome', 'F9', 'Metronome');
  await exercise('Fingerpicking', 'Picking patterns', 'F10', 'Picking patterns, playing');
  await exercise('Scales', 'C major scale', 'F11', 'C major scale, playing');
  await exercise('Scales', 'Ear training', 'F12', 'Ear training: call and response', { play: 2500 });
  await exercise('Noodling', 'Free noodling', 'F13', 'Free noodling over a backing, playing');
  await safe('help', async () => {
    await cat('Warm-ups').click(); await p.waitForTimeout(400);
    await card('Spider walk (1-2-3-4)').click(); await p.waitForTimeout(800);
    await jsClick('prHelpButton'); await p.waitForTimeout(700);
    await shot('F14', 'Help for one exercise (Spider walk)');
    await p.evaluate(() => document.getElementById('prHelpDialog')?.close());
    await p.waitForTimeout(300);
    if (phone) { await jsClick('prSettingsToggle'); await p.waitForTimeout(600); await shot('F15', 'An exercise\'s settings (on a phone: Edit settings)'); await jsClick('prSettingsToggle'); }
    else await shot('F15', 'An exercise\'s settings (beside the exercise)');
    await back();
  });
  await safe('routine', async () => { await cat('My routine').click(); await p.waitForTimeout(500); await shot('F16', 'My routine: ready-made routines and your own'); });
  await safe('safe', async () => {
    await cat('Warm-ups').click(); await p.waitForTimeout(300);
    const s = p.locator('#prHome summary', { hasText: 'Keep your practice safe' }).first();
    await s.click(); await p.waitForTimeout(400);
    await s.scrollIntoViewIfNeeded();
    await shot('F17', 'Keep your practice safe: practice backup');
    await s.click();
  });
};
