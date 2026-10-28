// The website's pages for each purpose (Learn, Practise, Perform, Teach, Chord sheets),
// "Bring your songs" and "Phone and tablet": run by web/make.js (so on every website build), they're written into site/
// in the home page's own look, and aren't kept in git. The words are here, as data; each page
// stands on its own, so some things are said on more than one page.
const fs = require('fs');
const path = require('path');
const { AI_PROMPT } = require('../src/ai-prompt');

const APP = path.join(__dirname, '..');
const SITE = path.join(APP, 'site');
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The menu at the top of every page: what you want to do, then getting it */
const NAV = [
  { href: 'learn.html', label: 'Learn' },
  { href: 'practise.html', label: 'Practise' },
  { href: 'perform.html', label: 'Perform' },
  { href: 'teach.html', label: 'Teach' },
  { href: 'chord-sheets.html', label: 'Chord sheets' },
  { href: 'songs.html', label: 'Your songs' }
];
function siteHeader(current = '') {
  const links = NAV.map((n) => `<a class="opt" href="${n.href}"${n.href === current ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('');
  return `<header class="top">
  <div class="wrap">
    <a class="brand" href="./"><img src="img/icon-64.png" alt="">ukemusic</a>
    <nav class="links">${links}<a href="./#get">Get it</a></nav>
  </div>
</header>`;
}
/** The footer: the reference pages, and the light/dark switch */
function siteFooter() {
  return `<footer>
  <div class="wrap">
    <span>ukemusic by Mark Beachill · MIT licence · <a class="repo-link" href="https://github.com/markbeachill/ukemusic">ukemusic on GitHub</a></span>
    <span class="ref">Reference: <a href="phone.html">Phone and tablet</a> · <a href="guide.html">Song guide</a> · <a href="chordpro.html">ChordPro</a> · <a href="how-learn-works.html">How Learn works</a> · <a href="changes.html">What's new</a></span>
    <button class="theme" id="theme" type="button">Light / dark</button>
  </div>
</footer>`;
}
const THEME_SCRIPT = `<script>
(() => {
  const root = document.documentElement;
  try { const t = localStorage.getItem('ukemusic-site-theme'); if (t) root.dataset.theme = t; } catch (_e) { /* not kept */ }
  document.getElementById('theme').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ukemusic-site-theme', root.dataset.theme); } catch (_e) { /* not kept */ }
  });
  for (const b of document.querySelectorAll('[data-copy]')) {
    b.addEventListener('click', async () => {
      const text = document.getElementById(b.dataset.copy).textContent;
      try { await navigator.clipboard.writeText(text); b.textContent = 'Copied'; }
      catch (_e) { const r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = 'Selected: press Ctrl+C'; }
      setTimeout(() => { b.textContent = 'Copy the prompt'; }, 2500);
    });
  }
})();
</script>`;

// Extra styles for these pages (the rest comes from the home page)
const PAGE_CSS = `
.page-hero { padding: 56px 0 8px; }
.page-hero h1 { font-size: clamp(34px, 5vw, 52px); line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 16px; max-width: 20ch; }
.page-hero .lede { font-size: clamp(18px, 2.2vw, 21px); color: var(--muted); max-width: 52ch; margin: 0 0 26px; }
.who { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .who { grid-template-columns: 1fr; } }
.who .card h3 { font-size: 19px; display: flex; gap: 8px; align-items: center; }
.who .card ul { margin: 6px 0 0; padding-left: 20px; color: var(--muted); }
.who .card li { margin: 4px 0; }
.versions { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 760px) { .versions { grid-template-columns: 1fr; } }
.versions .card { display: flex; flex-direction: column; gap: 8px; }
.versions .card ul { margin: 0; padding-left: 20px; color: var(--muted); font-size: 15.5px; }
.versions .card .btn { align-self: flex-start; margin-top: auto; }
.versions .card.best { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-soft); }
.versions .tag { font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--teal-ink); }
.next-pages { display: flex; flex-wrap: wrap; gap: 10px; }
.prompt-box { position: relative; }
.prompt-box pre { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 18px; font: 14px/1.55 var(--mono); white-space: pre-wrap; margin: 0; max-height: 460px; overflow: auto; }
.prompt-box .btn { margin: 12px 0 0; }
.steps { counter-reset: step; list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.steps li { counter-increment: step; display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: start; color: var(--muted); }
.steps li::before { content: counter(step); width: 32px; height: 32px; border-radius: 50%; background: var(--teal); color: #fff; display: grid; place-items: center; font-weight: 800; }
.steps li strong { color: var(--ink); }
.feature.text-only { grid-template-columns: 1fr; }
.feature.text-only .text { max-width: 70ch; }
.feature.text-only ul { columns: 2; column-gap: 36px; }
@media (max-width: 760px) { .feature.text-only ul { columns: 1; } }
.note-box { background: var(--teal-soft); border-radius: var(--radius); padding: 18px 22px; }
.note-box p { margin: 0; }
footer .ref a { color: var(--muted); }
nav.links a[aria-current] { color: var(--ink); }
@media (min-width: 861px) and (max-width: 980px) { nav.links { gap: 14px; } }
`;

/** "Which version for this?": the web player or the desktop app, the best one for the page marked */
function versionsBlock(best, web, desk) {
  return `<div class="versions">
  <div class="card${best === 'web' ? ' best' : ''}"><span class="tag">${best === 'web' ? 'Start here' : 'On a phone or tablet'}</span><h3>The web player</h3><p style="margin:0;color:var(--muted)">Nothing to install: it runs in any browser, with songs to try straight away.</p><ul>${web.map((x) => `<li>${x}</li>`).join('')}</ul><a class="btn primary" href="app/">Try the web player</a></div>
  <div class="card${best === 'desktop' ? ' best' : ''}"><span class="tag">${best === 'desktop' ? 'Best for this' : 'For your own songs'}</span><h3>The desktop app</h3><p style="margin:0;color:var(--muted)">Free for Windows, Mac and Linux. Works offline; your songs are files you keep.</p><ul>${desk.map((x) => `<li>${x}</li>`).join('')}</ul><a class="btn" href="./#get">Download the app</a></div>
</div>`;
}
function featureRow(f, flip) {
  const list = f.list ? `<ul>${f.list.map((x) => `<li>${x}</li>`).join('')}</ul>` : '';
  const shot = f.img ? `<div class="shot"><img src="img/${f.img}" loading="lazy" width="1360" height="${f.h || 860}" alt="${esc(f.alt || '')}"></div>` : (f.html || '');
  return `<div class="feature${flip && shot ? ' flip' : ''}${shot ? '' : ' text-only'}"><div class="text"><h3>${f.h3}</h3>${(f.p || []).map((x) => `<p>${x}</p>`).join('')}${list}</div>${shot}</div>`;
}

// ── The pages ──
const PAGES = [
  {
    file: 'learn.html', title: 'Learn a song by heart', blurb: 'Get a song into your head and your fingers, so you can play it without the sheet.',
    eyebrow: 'Learn', h1: 'Learn a song by heart, not just the shapes',
    lede: 'ukemusic works out how your song is put together (its key, its chords as numbers, its parts and the patterns in them) and then helps you practise it the way memory works best.',
    solo: ['Play along with the chords fading away: shown the first time, then as numbers, then gone', 'A quick quiz on each change: which chord comes next?', 'The hardest changes first, with what each finger does', 'Your trouble spots, collected as you go, to loop slowly', 'Fingerpick any song instead of strumming: five standard patterns and a pick sheet', 'Fingerpicking tab in layers: the chords, then the picking on open strings, then both'],
    group: ['A one-page learn sheet for everyone, to print or send round', 'Next chord? on the big screen, as a game for the room', 'Play it in the group\'s key, thinking in numbers', 'Chord patterns: "the chorus is the verse\'s first line": less to learn'],
    features: [
      { h3: 'Play from memory', p: ['Karaoke with the chords fading out. Each part shows its chords the first time it comes, then a <b>?</b>; next time try the numbers only, then nothing at all. Tap a <b>?</b> if you need it: the ones you looked at become your trouble spots.', 'Remembering beats re-reading: that\'s one of the best-tested findings about memory.'], img: 'learn-memory.webp', alt: 'The Wild Rover playing from memory: the first verse with its chords, the rest to come as question marks' },
      { h3: 'Next chord?', p: ['The song\'s changes one at a time, with the words either side: you\'re playing C, what comes next? Hear each answer before you choose, and hear the real change after. The ones you miss go on your list.'], img: 'learn-quiz.webp', alt: 'The Next chord? quiz: four chords to choose from, each with a button to hear it' },
      { h3: 'The learn sheet', p: ['One page to keep on your music stand: the chords and how each one feels ("home", "tension", "the sad home"), the song\'s parts with their first words, a chord map with the familiar patterns marked, the five hardest changes with finger tips, and the song on the circle of fifths.'], img: 'learn.webp', alt: 'A learn sheet for Danny Boy' },
      { h3: 'The hardest changes first', p: ['Every chord change in the song, hardest first, with both shapes and what each finger does: which one stays put, which slides, which moves to another string. Practise any of them on its own, or see how many clean changes you can make in a minute.'], img: 'changes.webp', h: 765, alt: 'The changes in It\'s a Long Way to Tipperary, hardest first, with the two shapes and finger tips for each' },
      { h3: 'Pick it instead of strumming', p: ['Any song can be fingerpicked to sing along to: the chords stay, your right hand picks a pattern. Five standard ukulele patterns, easiest first: one string a beat, up twice a bar, up and back, pinch and roll, and the alternating thumb. Play along in karaoke with each string shown as it comes, and your first note sounded in the count-in.', 'Write the tune in ({melody: E E F G …}) and ukemusic plays it quietly while you learn, or makes a picked solo from it: the tune on top of the chords, a chord melody.', 'The pick sheet lays the song out like a fingerstyle songbook: the pattern counted out, the chord boxes, then each line as tab with the chord over the bar where it starts and the words underneath.'], img: 'pick-sheet.webp', h: 1416, alt: 'A pick sheet: the Alternating thumb pattern counted out, the chord boxes, and the song as tab with the chords over it and the words under it' },
      { h3: 'Fingerpicking, in layers', p: ['A song with tab? When it sits on chord shapes, ukemusic says which, bar by bar ("Hold C, pick g-C-E-A"). Learn it in four steps, each played along: the chords strummed, the picking on open strings, both slowly, then both in time. From memory fades the tab like the chords.'], img: 'picking.webp', h: 821, alt: 'Picking in steps: four steps to play, and the intro read as hold C, then G7, with the picking pattern' },
      { h3: 'Think in numbers', p: ['Turn on Numbers and the sheet shows the chords as numbers in the key: I is home, IV and V are away. Then play it in another key from memory, with the numbers to guide you.'], img: 'learn-numbers.webp', h: 765, alt: 'The Learn tab with the song\'s chords shown as numbers: I, V7, IV, II7' },
      { h3: 'Understand it, and it sticks', list: ['<b>Numbers:</b> a song in numbers (I, IV, V…) is the same in every key. Learn it once, play it anywhere', '<b>Patterns:</b> four-chord pop, the 50s progression, the three-chord trick, named where they happen, so you spot them in the next song', '<b>The circle of fifths:</b> turned so the song\'s home is at the top, with how it moves', '<b>Another key:</b> play it from memory in a different key: if you can, you know the song'] }
    ],
    best: 'web',
    web: ['From memory, Next chord?, Pick (the patterns, the pick sheet, tab in steps), the learn sheet, Chord patterns, the circle'],
    desk: ['Everything on the left, plus trouble spots kept with each song', 'The hardest changes, each with a drill', 'Learn sheets saved for every song at once'],
    more: '<p>How it works things out, and how far to trust it: <a href="how-learn-works.html">How Learn works</a>.</p>'
  },
  {
    file: 'practise.html', title: 'Practise', blurb: 'Free Practice with a moving fretboard and a metronome, and your songs slowed down, looped and sped up.',
    eyebrow: 'Practise', h1: 'Practise a little, often, and see it add up',
    lede: 'Warm-ups, chord changes, strumming, picking and scales, each with a moving fretboard and a metronome. And your own songs: slowed down, looped, and a little faster each time round.',
    solo: ['Free Practice: no song needed', 'Routines for the days you have ten minutes', 'One-minute chord changes, with your scores kept', 'Your progress over the weeks'],
    group: ['Warm up together with an exercise on the big screen', 'Everyone strums the same pattern with the metronome', 'Loop the tricky bit of the club\'s next song, slowly', 'Count in, and keep the room in time'],
    features: [
      { h3: 'Free Practice', p: ['Exercises for every stage, marked beginner, improver or intermediate: warm-ups, chord switching, strumming patterns, fingerpicking, scales and noodling. Each one shows a moving fretboard and keeps time.'], img: 'practice.webp', alt: 'Free Practice: exercise cards by category and level' },
      { h3: 'Practise your songs', p: ['Press Play and hear the song on a real ukulele, the way it\'s written. Slow it down, loop the part you\'re learning, or have it speed up a little each time round.'], list: ['Waltzes, swing and shuffle feel, picked out from the strum', 'Tap the tempo, or count yourself in', 'The strum lit up as it plays, with the next chord shapes'], img: 'playing.webp', alt: 'A song playing, the current line and its strum lit' },
      { h3: 'Practise the hard changes', p: ['Learn → The changes lists every change in the song, hardest first, with what each finger does. One click turns any of them into a drill, or a one-minute challenge with your best score kept.'], img: 'changes.webp', h: 765, alt: 'The changes in a song, hardest first, each with Practise and One minute buttons' }
    ],
    best: 'web',
    web: ['All of Free Practice, routines and progress', 'Play along with your songs: slower, looped, faster'],
    desk: ['Everything in the web player', 'Drills made from the changes in your own songs', 'Your practice kept on your computer'],
    more: ''
  },
  {
    file: 'perform.html', title: 'Perform', blurb: 'Stage copies you can read at a glance, the Session screen for club nights, setlists and songbooks.',
    eyebrow: 'Perform', h1: 'From the music stand to the big screen',
    lede: 'Clear Stage copies for the gig, a Session screen that fills the TV for a club night, and setlists that go song by song with a clicker.',
    solo: ['A Stage copy: big, bold and easy to scan', 'The web player on a tablet on your music stand', 'Setlists, and a songbook PDF of the whole set', 'Stage PDFs copied to your gig folder as you export'],
    group: ['The Session screen: the whole song on one TV or projector, laid out so nobody scrolls', 'Arrow keys, a presentation clicker or a tap for the next song', 'Karaoke for the room: big words that light up as you sing', 'Check the whole library fits one screen before the night'],
    features: [
      { h3: 'The Session screen', p: ['For a club night or a jam: the whole song on one screen, as big as it will go. Verses and choruses in columns, never split, with the chord shapes down the side. With a TV plugged in, the song fills it while the laptop shows what\'s next.'], img: 'session-setlist.webp', h: 765, alt: 'The Session screen: It\'s a Long Way to Tipperary in two columns, song 2 of 5 in the setlist' },
      { h3: 'Setlists and songbooks', p: ['Put the night\'s songs in order, in the keys you play them. Run the setlist on the Session screen, make one songbook PDF of the whole set, or a folder with a PDF per song for a tablet.'], img: 'setlist.webp', h: 765, alt: 'A setlist called Club night with five songs, and buttons for the Session screen and a songbook PDF' },
      { h3: 'Stage copies', p: ['Print the song sheet for practice and a Stage copy for the gig, in the format that suits your eyes: Clear, Brackets, Compact or Heavy. Choruses printed every time, or once and then "as before".'], img: 'stage.webp', h: 765, alt: 'A Stage copy: bold chords above plain words' },
      { h3: 'Karaoke for the whole room', p: ['Full screen, big words that light up as you sing, with the chord above each word and the shapes down the side. Tap any line to start from there.'], img: 'karaoke.webp', alt: 'The karaoke view' }
    ],
    best: 'desktop',
    web: ['The Session screen and karaoke from a tablet or laptop', 'Your songs on stage, on a phone or tablet'],
    desk: ['Setlists and songbook PDFs', 'Stage copies in every format, and the gig folder', 'The Session screen on a second display, with what\'s next on the laptop'],
    more: ''
  },
  {
    file: 'teach.html', title: 'Teach', blurb: 'For club leaders and teachers: one song file becomes handouts, the screen at the front, learn sheets and practice at home.',
    eyebrow: 'Teach', h1: 'Run a club or a class from one song file',
    lede: 'Type or import a song once, and it becomes the handout, the screen at the front of the room, a learn sheet for homework, and something to play along with at home.',
    solo: ['Prepare at home: the song in the group\'s key, with the shapes you teach', 'Make handouts: song sheet, Stage copy, words only, learn sheet', 'A songbook PDF for the term from a setlist', 'Bring in a whole folder of the club\'s ChordPro songs at once'],
    group: ['The song on the screen at the front, chords and shapes for all to see', 'Next chord? as a quiz for the room', 'Everyone loops the tricky bit together, slowly', 'Players take the songs home in the web player and practise'],
    features: [
      { h3: 'The screen at the front', p: ['The Session screen puts the song on the TV or projector, big enough for the back row, and goes through a setlist with a clicker. Karaoke lights up the words as the group sings.'], img: 'session-setlist.webp', h: 765, alt: 'The Session screen, song 2 of 5 in a club night setlist' },
      { h3: 'Teach the tricky changes', p: ['For each song, the changes that will trip the group up, hardest first, with what each finger does. Drill one together before you play the song.'], img: 'changes.webp', h: 765, alt: 'The changes in a song, hardest first, with finger tips' },
      { h3: 'Handouts that teach', p: ['A learn sheet for each song: the chords and how they feel, the parts with their first words, the patterns marked, the hardest changes with finger tips. Players learn the song, not just the shapes.'], img: 'learn.webp', alt: 'A learn sheet for Danny Boy' },
      { h3: 'Suit the room', list: ['Any key for the group\'s voices, with the chords spelled right', 'A capo, and the shapes to finger', 'Ukulele (high or low G), baritone and guitar, each with its own shapes', 'Choose the shape you teach for a chord, kept with the song'] }
    ],
    best: 'desktop',
    web: ['For your players: practise at home, play along, learn by heart', 'They bring in the songs you send with "Add songs from files…"'],
    desk: ['Write and import songs; ChordPro songbooks in one go', 'Handouts, learn sheets and songbooks', '"Phone and tablet…" saves your songs in one file to share with the group'],
    more: '<div class="note-box"><p><b>What it doesn\'t do yet:</b> there are no student accounts and no sharing server. You share songs as a file (or printouts), and players load them into the web player. Ideas for teaching features are welcome on <a class="repo-link" href="https://github.com/markbeachill/ukemusic">GitHub</a>.</p></div>'
  },
  {
    file: 'chord-sheets.html', title: 'Chord sheets', blurb: 'Clear chord sheets in any key, capo or instrument, with chord shapes and the strum.',
    eyebrow: 'Chord sheets', h1: 'Clear chord sheets, in any key',
    lede: 'Bring a song in, or type it with the chords in square brackets. ukemusic draws the sheet with the chord shapes and the strum, in any key, for any instrument, and prints it beautifully.',
    solo: ['Any key in a click, or a capo with the shapes to finger', 'Ukulele, baritone or guitar, left-handed too', 'Choose a different shape for a chord, kept with the song', 'Every save keeps the earlier versions'],
    group: ['One file, the same sheet for everyone', 'Stage copies, words-only sheets and songbooks', 'ChordPro in and out, for other chord apps', 'A library you can share as a single pack file'],
    features: [
      { h3: 'Type it once', p: ['A song is a plain text file you can read anywhere. Put each chord in square brackets just before the word where it changes, and everything else follows: the sheet, the shapes, the strum, the playback and the printing.'], img: 'editor.webp', alt: 'The song typed on the left, the chord sheet on the right' },
      { h3: 'Every format you need', list: ['PDF and web page, in your own style or a Stage format', 'Words only, Markdown for notes apps, ChordPro for other chord apps', 'A songbook PDF from a setlist', 'Tab and melody beside the words'], img: 'stage.webp', h: 765, alt: 'A Stage copy' },
      { h3: 'Your songs, in libraries', p: ['Songs live in ordinary folders on your computer. Keep several libraries, search by artist, tag or key, and put songs into setlists. ukemusic comes with a library of public-domain songs to start you off.'], img: 'library.webp', alt: 'The library of songs' }
    ],
    best: 'desktop',
    web: ['Read your songs in any key, capo or instrument', 'Download a sheet as a web page or ChordPro'],
    desk: ['Write and edit songs', 'Every export and print format', 'Libraries, setlists, versions and history'],
    more: '<p>Everything you can type: <a href="guide.html">the song guide</a>.</p>'
  }
];

// "Your songs": every way in, and the AI prompt
const SONGS_PAGE = {
  file: 'songs.html', title: 'Bring your songs', blurb: 'Paste chord sheets from websites, import ChordPro songbooks, type songs, or use an AI chat to tidy a difficult one.',
  body: () => `
<div class="page-hero"><div class="wrap">
  <p class="eyebrow">Your songs</p>
  <h1>Bring the songs you already have</h1>
  <p class="lede">Chord sheets from websites, your club's songbook, ChordPro files, PDFs, or just typing. ukemusic takes them in and turns each one into everything else: sheets, playback, karaoke, practice and a learn sheet.</p>
</div></div>
<section><div class="wrap">
  <h2>Four ways in</h2>
  <div class="grid two">
    <div class="card"><h3>Paste from a website</h3><p>Copy a chord sheet from a website and use <b>File → Paste from website</b>. Chords on their own line above the words are moved into the words for you.</p></div>
    <div class="card"><h3>Your club's songbook</h3><p>A whole folder of ChordPro songs comes in at once, one song each, with tags and links; each subfolder becomes a setlist. Strum marks clubs write in the brackets come in as written.</p></div>
    <div class="card"><h3>Type it</h3><p>Words and chords in square brackets: <code>[C]Oh my [G7]darling</code>. The <a href="guide.html">song guide</a> has everything else: strums, timings, tab.</p></div>
    <div class="card"><h3>A difficult sheet? Ask an AI</h3><p>PDFs, scans and sheets where the spacing is lost: an AI chat can tidy them into ukemusic's format. <a href="#ai">How, with a prompt to copy</a>.</p></div>
  </div>
  <div class="note-box" style="margin-top:20px"><p><b>On a phone or tablet?</b> The web player takes song files, ChordPro, a zipped songs folder or the desktop app's file, and you can write songs there too. <a href="phone.html">How to put it on your Home Screen and keep your songs safe</a>.</p></div>
</div></section>
<section id="ai"><div class="wrap">
  <p class="eyebrow">Using AI</p>
  <h2>Tidy a chord sheet with an AI chat</h2>
  <p class="intro">ukemusic's own import handles most chord sheets. For the awkward ones (a PDF where the chords have lost their places, a sheet that says "two bars of Dm" in words, chords at the top and words somewhere else), an AI chat such as Claude, ChatGPT or Gemini can do the tidying.</p>
  <ol class="steps">
    <li><span><strong>Open an AI chat</strong> and paste the chord sheet in (or attach the PDF).</span></li>
    <li><span><strong>Copy the prompt below</strong> into the same message, so the AI knows ukemusic's format. (In the desktop app it's there too: <b>File → Paste from website → Copy AI prompt</b>.)</span></li>
    <li><span><strong>Copy its answer into ukemusic</strong> with <b>File → Paste from website</b>, and save.</span></li>
    <li><span><strong>Press Play and check it</strong> against the original. The chords are usually right; the timing (how many bars each chord lasts) is the part to listen for.</span></li>
  </ol>
  <h3 style="margin-top:32px">The prompt</h3>
  <div class="prompt-box"><pre id="aiPrompt">${esc(AI_PROMPT)}</pre><button class="btn primary" type="button" data-copy="aiPrompt">Copy the prompt</button></div>
  <div class="note-box" style="margin-top:28px"><p><b>Your sheet, your responsibility.</b> Use songs you have the right to use: your own copy, for your own practice or your club's. The prompt asks the AI to work only from the sheet you give it, and not to add or invent any words. ukemusic itself only ships songs that are out of copyright, and your songs stay on your computer.</p></div>
</div></section>
<section><div class="wrap">
  <h2>Then what?</h2>
  <p class="intro">Once a song is in, it's ready for everything.</p>
  <div class="next-pages"><a class="btn" href="learn.html">Learn it</a><a class="btn" href="practise.html">Practise it</a><a class="btn" href="perform.html">Perform it</a><a class="btn" href="teach.html">Teach it</a><a class="btn" href="chord-sheets.html">Print it</a></div>
</div></section>`
};

// "Phone and tablet" (4.45): the web player as an app, getting songs in, keeping them safe
const PHONE_PAGE = {
  file: 'phone.html', title: 'Phone and tablet', blurb: 'ukemusic on an iPad, iPhone, Android or Chromebook: put it on your Home Screen, bring your songs in, write and change them, and keep them safe.',
  body: () => `
<div class="page-hero"><div class="wrap">
  <p class="eyebrow">Phone and tablet</p>
  <h1>ukemusic on your iPad, phone or Chromebook</h1>
  <p class="lede">The web player runs in the browser, with nothing to download from an app store. Put it on your Home Screen and it opens like an app, works without a connection, and keeps your songs on the device: play them, sing them, learn them, and write new ones.</p>
  <div class="cta"><a class="btn primary" href="app/">Open the web player</a><span class="note">Free · Safari, Chrome, Edge, Firefox</span></div>
</div></div>
<section><div class="wrap">
  <h2>1. Put it on your Home Screen</h2>
  <p class="intro">Open the web player first, then:</p>
  <div class="grid two">
    <div class="card"><h3>iPad and iPhone</h3><ol class="steps">
      <li><span>In <strong>Safari</strong>, press the <strong>Share</strong> button (the square with an arrow).</span></li>
      <li><span>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</span></li>
      <li><span>From now on, open ukemusic from its <strong>icon</strong>, not from Safari.</span></li>
    </ol></div>
    <div class="card"><h3>Android</h3><ol class="steps">
      <li><span>In <strong>Chrome</strong>, press the <strong>⋮</strong> menu.</span></li>
      <li><span>Choose <strong>Install app</strong> (or <strong>Add to Home screen</strong>), then <strong>Install</strong>.</span></li>
      <li><span>ukemusic is with your other apps, and opens in its own window.</span></li>
    </ol></div>
    <div class="card"><h3>A computer or Chromebook</h3><p>In <strong>Chrome</strong> or <strong>Edge</strong>, press the install button at the end of the address bar (or the menu → <strong>Install ukemusic</strong>). On a Mac, Safari's <strong>File → Add to Dock</strong> does the same. For writing lots of songs, the <a href="./#get">desktop app</a> does more.</p></div>
    <div class="card"><h3>Without a connection</h3><p>Once it has opened with a connection, ukemusic opens and plays with none, at a gig or on a train: the songs, the sounds and everything else are kept on the device. When there's a new version, it arrives the next time it opens with a connection.</p></div>
  </div>
  <div class="note-box" style="margin-top:20px"><p><b>On iPad and iPhone, the Home Screen app keeps its own songs.</b> They're separate from Safari's: songs you add in a Safari tab don't appear in the icon, and the other way round. So add it to your Home Screen first, and bring your songs in there.</p></div>
</div></section>
<section><div class="wrap">
  <h2>2. Bring your songs in</h2>
  <p class="intro">It starts with the public-domain songs to try. They become yours, to keep and change, as soon as you add or write a song.</p>
  <div class="grid two">
    <div class="card"><h3>From files</h3><p>Press <strong>Add songs from files…</strong> and choose one or more from the Files app, iCloud Drive, Google Drive, OneDrive or Downloads:</p><ul>
      <li>ukemusic songs (<code>…-song.txt</code>)</li>
      <li>ChordPro (<code>.cho</code>, <code>.chopro</code>, <code>.pro</code>)</li>
      <li>chord sheets with the chords above the words</li>
      <li>a <strong>zipped songs folder</strong>, with each song's key, tempo and notes (on an iPad, press and hold a folder in Files and choose <strong>Compress</strong>)</li>
      <li>a backup, or the desktop app's file</li>
    </ul><p>You see what's new, what's changed and what's the same before anything comes in.</p></div>
    <div class="card"><h3>From the desktop app</h3><ol class="steps">
      <li><span>In the desktop app's library, press <strong>Phone and tablet… → Save songs for the web player…</strong></span></li>
      <li><span>Save the file somewhere the tablet can reach: iCloud Drive, OneDrive or Google Drive, or email it to yourself.</span></li>
      <li><span>In the web player, press <strong>Add songs from files…</strong> and choose it.</span></li>
    </ol><p>Do it again whenever you like: new songs are added and changed ones updated, and anything you've changed on the tablet is kept unless you say so.</p></div>
  </div>
</div></section>
<section><div class="wrap">
  <h2>3. Write and change songs</h2>
  <div class="feature text-only"><div class="text">
    <p><strong>New song</strong> starts one; <strong>Edit</strong> on any song changes it. Type the words with the chords in square brackets, as in the <a href="guide.html">song guide</a>. On an iPad the chord sheet is beside the words as you type; on a phone, press <strong>Preview</strong>.</p>
    <ul>
      <li>Buttons type what touch keyboards hide: <code>[&nbsp;]</code> a chord, <code>[[&nbsp;]]</code> a heading, <code>{&nbsp;}</code> a strum, <code>|</code> a bar line, ♪ a tune line</li>
      <li><strong>Details</strong>: title, artist, year, key, capo, tempo, time and tags</li>
      <li><strong>Notes</strong>, <strong>Make a copy</strong> and <strong>Delete</strong></li>
      <li>Everything is saved as you type</li>
      <li>Songs changed here are marked <strong>changed here</strong> in the list, until the desktop app has them</li>
    </ul>
  </div></div>
</div></section>
<section><div class="wrap">
  <h2>4. Keep them safe</h2>
  <div class="grid two">
    <div class="card"><h3>Back up all songs</h3><p>Every song in one file. On an iPad or phone the share sheet opens: choose <strong>Save to Files</strong> (iCloud Drive is a good place), Google Drive, or Mail. Do it now and then, and after writing something you'd hate to lose.</p><p>To bring songs back, choose the backup with <strong>Add songs from files…</strong></p></div>
    <div class="card"><h3>Where they're kept</h3><p>On the device, in the browser's own storage. They don't go anywhere else by themselves (unless you <a href="#dropbox">keep them in Dropbox</a>).</p><p><strong>Deleting the Home Screen icon, or clearing the browser's website data, deletes them</strong>, so keep a backup.</p></div>
  </div>
</div></section>
<section><div class="wrap">
  <h2>5. Back to your computer</h2>
  <ol class="steps">
    <li><span>In the web player, press <strong>Back up all songs</strong> and save the file where the computer can reach it.</span></li>
    <li><span>In the desktop app's library, press <strong>Phone and tablet… → Bring in songs from the web player…</strong> and choose that file.</span></li>
    <li><span>Tick the songs to bring in: the ones you wrote or changed on the tablet. Changed songs keep their earlier version in the song's history, and a song you've changed on the computer since is left alone.</span></li>
  </ol>
</div></section>
<section id="dropbox"><div class="wrap">
  <h2>6. One set of songs, everywhere: Dropbox</h2>
  <p class="intro">Put the desktop app's songs folder in Dropbox, and the web player reads and writes the same songs. Change a song on the iPad and it's on your computer a moment later; change it on the computer and the iPad has it the next time it syncs. No files to move about.</p>
  <div class="grid two">
    <div class="card"><h3>Once, on your computer</h3><ol class="steps">
      <li><span>Install <strong>Dropbox</strong> (a free account is fine) and put your ukemusic songs folder inside it.</span></li>
      <li><span>In the desktop app, <strong>Settings → Songs folder</strong>: choose it there.</span></li>
      <li><span>Make a Dropbox app key for ukemusic (below). It's free and takes about five minutes.</span></li>
    </ol></div>
    <div class="card"><h3>Then, on the iPad or phone</h3><ol class="steps">
      <li><span>In the web player, press <strong>Dropbox…</strong> and <strong>Connect to Dropbox</strong>. On a Home Screen app on iPhone or iPad, press <strong>Connect with a code</strong>: Dropbox shows a code to paste back.</span></li>
      <li><span>Choose your songs folder (the one with a folder for each song) and press <strong>Use this folder</strong>.</span></li>
      <li><span>That's it: it syncs when it opens, a few seconds after you change a song, and with <strong>Sync now</strong>.</span></li>
    </ol></div>
  </div>
  <div class="grid two" style="margin-top:16px">
    <div class="card"><h3>How it behaves</h3><ul>
      <li>The songs are kept on the device too, so it works offline; changes go when the connection's back</li>
      <li>Only the song folders are touched (the song, its song.ini and notes); exports, history and setlists are left alone</li>
      <li>A new song becomes a new folder; renaming a song renames its folder; deleting one moves it to <strong>Archived songs</strong></li>
      <li>Changed in both places between syncs? Both are kept: the computer's, and "… (changed on this device)"</li>
      <li>If a song is open in the desktop app while you change it on the iPad, open it again on the computer to see the change</li>
      <li>iCloud Drive can't do this: Apple doesn't let web apps reach it</li>
    </ul></div>
    <div class="card"><h3>Making the Dropbox app key</h3><ol class="steps">
      <li><span>Go to <a href="https://www.dropbox.com/developers/apps">dropbox.com/developers/apps</a> and press <strong>Create app</strong>: <strong>Scoped access</strong>, <strong>Full Dropbox</strong>, and any name (ukemusic-yourname).</span></li>
      <li><span><strong>Permissions</strong>: tick <code>files.metadata.read</code>, <code>files.metadata.write</code>, <code>files.content.read</code> and <code>files.content.write</code>, then <strong>Submit</strong>.</span></li>
      <li><span><strong>Settings → OAuth 2</strong>: add the web player's address as a <strong>Redirect URI</strong> (this site's address with <code>app/</code> on the end), and set <strong>Allow public clients (PKCE)</strong> to <strong>Allow</strong>.</span></li>
      <li><span>Copy the <strong>App key</strong> into the web player's Dropbox dialog (or, if you run this website, into <code>DROPBOX_APP_KEY</code> in <code>web/app.html</code>, so nobody else needs one). The key isn't a password: it's safe to share.</span></li>
    </ol></div>
  </div>
</div></section>
<section><div class="wrap">
  <h2>Good to know</h2>
  <div class="feature text-only"><div class="text"><ul>
    <li>Key, capo, instrument and tempo changes you make while playing are kept on each device</li>
    <li>Practice progress is kept on each device too</li>
    <li>Sound needs a tap first (browsers don't play sound by themselves); on an iPhone, the silent switch can mute it</li>
    <li>It works in Safari, Chrome, Edge and Firefox; installing works in Safari, Chrome and Edge, and Firefox on Android</li>
    <li>For big jobs (a whole club songbook, printing, PDFs, setlist songbooks) the <a href="./#get">desktop app</a> does more</li>
  </ul></div></div>
  <div class="next-pages" style="margin-top:20px"><a class="btn primary" href="app/">Open the web player</a><a class="btn" href="songs.html">Bring your songs</a><a class="btn" href="guide.html">The song guide</a></div>
</div></section>`
};

function pageBody(p) {
  const rows = p.features.map((f, i) => featureRow(f, i % 2 === 1)).join('\n');
  return `
<div class="page-hero"><div class="wrap">
  <p class="eyebrow">${esc(p.eyebrow)}</p>
  <h1>${esc(p.h1)}</h1>
  <p class="lede">${esc(p.lede)}</p>
  <div class="cta"><a class="btn primary" href="app/">Try it in your browser</a><a class="btn" href="./#get">Download the app</a><span class="note">Free · Windows, Mac, Linux, phones and tablets</span></div>
</div></div>
<section><div class="wrap">
  <div class="who">
    <div class="card"><h3>On your own</h3><ul>${p.solo.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="card"><h3>In a group</h3><ul>${p.group.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  </div>
</div></section>
<section><div class="wrap">
${rows}
</div></section>
<section><div class="wrap">
  <p class="eyebrow">Which version?</p>
  <h2>In your browser, or on your computer</h2>
  ${versionsBlock(p.best, p.web, p.desk)}
  ${p.more ? `<div style="margin-top:28px">${p.more}</div>` : ''}
  <p style="margin-top:28px;color:var(--muted)">Your songs come in from websites, songbooks, ChordPro files or an AI chat: <a href="songs.html">bring your songs</a>.</p>
</div></section>`;
}

function wrapPage(p, body, siteCss) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} · ukemusic</title>
<meta name="description" content="${esc(p.blurb)}">
<link rel="icon" href="img/icon-64.png">
<link rel="apple-touch-icon" href="img/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Figtree:wght@400;500;600;700;800&display=swap">
<style>
${siteCss}
${PAGE_CSS}
</style>
</head>
<body>
${siteHeader(p.file)}
<main>
${body}
</main>
${siteFooter()}
${THEME_SCRIPT}
</body>
</html>
`;
}

function build() {
  const index = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const siteCss = index.slice(index.indexOf('<style>') + 7, index.indexOf('</style>'));
  for (const p of PAGES) fs.writeFileSync(path.join(SITE, p.file), wrapPage(p, pageBody(p), siteCss));
  fs.writeFileSync(path.join(SITE, SONGS_PAGE.file), wrapPage(SONGS_PAGE, SONGS_PAGE.body(), siteCss));
  fs.writeFileSync(path.join(SITE, PHONE_PAGE.file), wrapPage(PHONE_PAGE, PHONE_PAGE.body(), siteCss));
  return [...PAGES.map((p) => p.file), SONGS_PAGE.file, PHONE_PAGE.file];
}

module.exports = { build, PAGES, SONGS_PAGE, PHONE_PAGE, NAV, siteHeader, siteFooter, PAGE_CSS };
if (require.main === module) console.log('pages:', build().join(', '));
