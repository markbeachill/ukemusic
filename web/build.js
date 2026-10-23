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
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync('out/ukemusic-web.html', html);
// A standalone page for any web server (GitHub Pages): the same app with a doctype, charset and viewport
const page = '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + html;
fs.writeFileSync('out/index.html', page);
console.log('ok', (html.length / 1024).toFixed(0) + 'KB');
