const fs = require('fs');
const APP = '../';
const bundle = fs.readFileSync('umw.js', 'utf8');
// sheet css: the desktop stylesheet without its :root/theme/body rules, plus the strum boxes
let css = fs.readFileSync(APP + 'src/default-style.css', 'utf8');
css = css.slice(css.indexOf('.line-group'));
const strumBox = require(APP + 'src/strum-box.js');
const renderHtml = require(APP + 'src/renderer-html.js');
css += '\n' + strumBox.strumCss() + renderHtml.sheetCss();
let player = fs.readFileSync(APP + 'src/playback-audio.js', 'utf8')
  .replace("const SAMPLE_DIR = 'src/sounds/ukulele/';", "const SAMPLE_DIR = 'sounds/';")
  .replace('decode(`${name}.flac`)', 'decode(`${name}.wav`)');
if (!player.includes("'sounds/'") || !player.includes('${name}.wav')) throw new Error('player paths not replaced');
let html = fs.readFileSync('app.html', 'utf8');
const safe = (t) => t.replace(/<\/(script|style)/gi, '<\\/$1');
const put = (marker, value) => { if (!html.includes(marker)) throw new Error(marker); html = html.split(marker).join(value); };
put('/*SHEET_CSS_RAW*/', safe(css));
put('/*SHEET_CSS*/', safe(css));
put('/*KARAOKE_CSS*/', safe(fs.readFileSync('k_css.css', 'utf8')));
put('<!--KARAOKE_MARKUP-->', fs.readFileSync('k_markup.html', 'utf8'));
put('/*KARAOKE_JS*/', safe(fs.readFileSync('k_js.js', 'utf8')));
put('/*PRACTICE_CSS*/', safe(fs.readFileSync('pr_css.css', 'utf8')));
put('<!--PRACTICE_MARKUP-->', fs.readFileSync('pr_markup.html', 'utf8'));
put('/*PRACTICE_JS*/', safe(fs.readFileSync('pr_js.js', 'utf8')));
put('/*SESSION_JS*/', safe(fs.readFileSync(APP + 'src/session-fit.js', 'utf8') + '\n' + fs.readFileSync(APP + 'src/session-screen.js', 'utf8')));
put('/*UMW_BUNDLE*/', safe(bundle));
put('/*PLAYER*/', safe(player));
put('/*SONG_UI_JS*/', safe(fs.readFileSync(APP + 'src/song-ui.js', 'utf8')));
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/ukemusic-web.html', html);
// A standalone page for any web server (GitHub Pages): the same app with a doctype, charset and viewport
// 4.45: and a web app: its manifest (Add to Home Screen / Install), icons, and the offline copy (sw.js)
const head = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="icon" href="icons/icon-192.png">',
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
  "<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));</script>"
].join('\n');
// For search engines and anyone without JavaScript (the app itself needs it): what this is, in words
const about = [
  '<title>ukemusic web player: free ukulele songs, play-along and Free Practice</title>',
  '<meta name="description" content="The free, open-source ukemusic web player: ukulele songs to play along with and learn by heart, and Free Practice with 39 exercises. Runs in your browser, works offline, no account.">',
  '<link rel="canonical" href="https://markbeachill.github.io/ukemusic/app/">'
].join('\n');
const noscript = '<noscript><div style="max-width:42em;margin:2em auto;padding:0 16px;font:17px/1.5 system-ui,sans-serif">'
  + '<h1>ukemusic web player</h1>'
  + '<p>The free, open-source ukemusic web player: public-domain ukulele songs to play along with, sing with karaoke and learn by heart; your own songs to write and keep on this device; and Free Practice, 39 exercises for warm-ups, chord changes, strumming, fingerpicking, scales and improvising, with a metronome, routines and progress.</p>'
  + '<p>It needs JavaScript. Without it, read about it here: <a href="../practice/">Free Practice: all 39 exercises</a> · <a href="../">the ukemusic website</a> · <a href="https://github.com/markbeachill/ukemusic">the source code on GitHub</a> (MIT licence).</p>'
  + '</div></noscript>';
const page = '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + about + '\n' + head + '\n' + html.replace('<title>ukemusic web</title>', '').replace('\n<div id="app">', () => '\n' + noscript + '\n<div id="app">');
if (!page.includes(noscript)) throw new Error('noscript not placed');
fs.mkdirSync('out/icons', { recursive: true });
for (const f of fs.readdirSync('icons')) fs.copyFileSync('icons/' + f, 'out/icons/' + f);
fs.writeFileSync('out/manifest.webmanifest', JSON.stringify({
  name: 'ukemusic',
  short_name: 'ukemusic',
  description: 'Ukulele songs: play along, karaoke, learn by heart, practise, and write your own.',
  id: './',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#f4f7f6',
  theme_color: '#0e6b64',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
}, null, 2));
fs.writeFileSync('out/index.html', page);
console.log('ok', (html.length / 1024).toFixed(0) + 'KB');
