// A browser for the UI review: Playwright's own Chromium, or, if it hasn't been downloaded
// (npx playwright install chromium), the Edge or Chrome already on the computer (as site-pictures)
async function launchBrowser(chromium, options = {}) {
  const errors = [];
  for (const channel of [undefined, 'msedge', 'chrome']) {
    try { return await chromium.launch(channel ? { ...options, channel } : options); } catch (error) { errors.push(String(error.message).split('\n')[0]); }
  }
  const error = new Error(`No browser to take the pictures with. Download Playwright's once with:  npx playwright install chromium\n(or install Microsoft Edge or Google Chrome)\n${errors.join('\n')}`);
  error.noBrowser = true;
  throw error;
}
module.exports = { launchBrowser };
