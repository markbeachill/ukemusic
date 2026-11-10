// What ukemusic does, in the web player and the desktop app: the one list behind the website's
// Features page, the summary on the home page, the README's table and the structured data that
// search engines read. Change a feature here, then build the website (node web/make.js); the
// home page and the README are updated by that build, and a test checks they match.
//
// A cell is true (✓), false (—), or text: a tick with a note ("Print"; "On this device").
// Each section is also a card on the home page (card: its heading and one line; tone: its colour).
// home: true marks the main rows (kept for the README and anyone who wants the short list).

const SECTIONS = [
  {
    title: 'Get songs in', link: 'songs.html',
    tone: 'teal', icon: 'paste', card: { h: 'Any chord sheet from the web', p: "Paste it from any website, or bring in your club's songbook. The chords go into the words for you." },
    rows: [
      { f: 'Paste a chord sheet from any website', web: true, desktop: true, home: true },
      { f: 'Import ChordPro files, or a whole songbook folder', web: 'Files, or a zipped folder', desktop: true, home: true },
      { f: 'AI prompts for difficult sheets and PDFs', web: true, desktop: true },
      { f: 'Public-domain songs to start with, ready to play', web: true, desktop: true },
      { f: 'A simple view to start with; all features when you want them', web: true, desktop: true }, // 4.78
      { f: 'Change a song, or write your own', web: true, desktop: true },
      { f: 'Drag a chord to the right word on the sheet: Edit chords on the sheet (Write tab, or right-click the sheet)', web: 'On the Edit page', desktop: true }, // 4.77; 4.79: on the Write tab
      { f: 'Find songs by title, artist, tag or key', web: true, desktop: 'Several libraries too' }
    ]
  },
  {
    title: 'Play along', link: 'practise.html',
    tone: 'coral', icon: 'play', card: { h: 'Play along, with karaoke', p: 'It plays the chords and the strum while the words light up. Any key, slower or faster.' },
    rows: [
      { f: 'It plays along with you: the chords and the strum, or picking', web: true, desktop: true, home: true },
      { f: 'Karaoke: the words light up as it plays', web: true, desktop: true },
      { f: 'Any key, with a capo; slower or faster', web: true, desktop: true },
      { f: 'The tune, shown as notes and played', web: true, desktop: true },
      { f: 'Real recordings: a ukulele, and a nylon-string guitar for baritone and guitar', web: true, desktop: true },
      { f: 'Loop a part', web: false, desktop: true },
      { f: 'Keep a song in several keys', web: false, desktop: true }
    ]
  },
  {
    title: 'Learn a song by heart', link: 'learn.html',
    tone: 'amber', icon: 'bulb', card: { h: 'Learn it by heart', p: 'Fewer chords on the sheet each time you play, quizzes on the changes, and a learn sheet.' },
    rows: [
      { f: 'Play from memory, with fewer chords each time', web: true, desktop: true, home: true },
      { f: 'Quizzes on the changes and the chord numbers', web: true, desktop: true },
      { f: 'A learn sheet to print', web: 'Print', desktop: 'PDF' }
    ]
  },
  {
    title: 'Free Practice', link: 'practice/',
    tone: 'blue', icon: 'metronome', card: { h: 'Free Practice', p: '40 exercises: warm-ups, chord switching, strumming, picking, scales and improvising, with routines.' },
    rows: [
      { f: '40 exercises: warm-ups, chords, strumming, picking, scales, improvising', web: true, desktop: true, home: true },
      { f: 'Routines, and your progress (days, best tempos, scores)', web: true, desktop: true },
      { f: 'Progressions from memory, major and minor', web: true, desktop: true },
      { f: 'Chords by key, a sheet to print', web: 'Print', desktop: 'PDF' }
    ]
  },
  {
    title: 'Print and share', link: 'chord-sheets.html',
    tone: 'teal', icon: 'print', card: { h: 'Chord sheets to print', p: 'The chord shapes beside the words, in any key. Stage copies big enough to read at a gig.' },
    rows: [
      { f: 'Chord sheets with chord diagrams', web: 'Print or save a PDF', desktop: 'PDF', home: true },
      { f: 'Stage copies: big and easy to read at a gig', web: true, desktop: 'One or two pages' },
      { f: 'Pick sheets: tab for fingerpicking', web: true, desktop: true },
      { f: 'Easy-to-read text for low vision (Atkinson Hyperlegible)', web: true, desktop: true },
      { f: 'ChordPro, web page and lyrics files', web: true, desktop: 'And Markdown' },
      { f: 'Songbook PDFs of a setlist, with a cover and contents', web: false, desktop: true },
      { f: 'Your club\'s logo and an "Updated" date on sheets', web: true, desktop: true }, // 4.76
      { f: 'Export every song at once', web: false, desktop: true }
    ]
  },
  {
    title: 'Play together', link: 'perform.html',
    tone: 'coral', icon: 'group', card: { h: 'Play together', p: "The Session screen puts the song on the TV for the whole room, and goes through the night's setlist." },
    rows: [
      { f: 'Setlists', web: false, desktop: true },
      { f: 'The Session screen: big words and chords for a group', web: 'On this device', desktop: 'On a second screen or TV' },
      { f: 'Songs from the desktop to a phone or tablet, in one file', web: 'Takes it in', desktop: true }
    ]
  },
  {
    title: 'Your instrument', link: 'instruments.html',
    tone: 'amber', icon: 'note', card: { h: 'Ukulele, baritone or guitar', p: 'High or low G, baritone or guitar, each with its own chord shapes. Left-handed too.' },
    rows: [
      { f: 'Ukulele (high or low G), baritone ukulele and guitar', web: true, desktop: true, home: true },
      { f: 'Left-handed chord diagrams', web: true, desktop: true, home: true },
      { f: 'Your own chord shape for a song', web: false, desktop: true }
    ]
  },
  {
    title: 'Free, offline and private', link: 'phone.html',
    tone: 'blue', icon: 'heart', card: { h: 'Free, offline, no account', p: 'Open source, no adverts, works without the internet, and your songs stay on your device.' },
    rows: [
      { f: 'Free and open source', web: true, desktop: true, home: true },
      { f: 'Works offline', web: 'Once opened, or added to your home screen', desktop: true, home: true },
      { f: 'No account needed, no adverts', web: true, desktop: true, home: true },
      { f: 'Your songs stay on your device', web: true, desktop: true },
      { f: 'Share a songs folder between devices with Dropbox', web: true, desktop: true },
      { f: 'Phones and tablets', web: true, desktop: false },
      { f: 'Windows, Mac and Linux', web: 'In any browser', desktop: true }
    ]
  }
];

const WHAT_IT_ISNT = 'What it isn\'t: a song catalogue. You bring the songs (it comes with some that are out of copyright), and they stay yours. Nothing to pay, no account, no adverts.';

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Line icons, 24×24, drawn in the section's colour
const ICONS = {
  paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M9 10h6M9 14h6M9 18h3"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  metronome: '<path d="M9 3h6l4 18H5zM12 17l5-10M8 17h8"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
  group: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 14.5c3 0 6 2 6 5.5"/>',
  note: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'
};
const icon = (name) => `<svg class="f-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

function cellHtml(value) {
  if (value === true) return '<td class="yes"><span class="mark" aria-label="Yes">✓</span></td>';
  if (value === false) return '<td class="no"><span class="mark" aria-label="Not in this one">–</span></td>';
  return `<td class="yes"><span class="mark" aria-label="Yes">✓</span><small>${esc(value)}</small></td>`;
}

/** The whole table as HTML (the Features page): a coloured band for each section */
function tableHtml({ prefix = '' } = {}) {
  const head = '<thead><tr><th scope="col">Feature</th><th scope="col">Web player<small>phones, tablets, any browser</small></th><th scope="col">Desktop app<small>Windows, Mac, Linux</small></th></tr></thead>';
  const body = SECTIONS.map((s) => {
    const sectionRow = `<tr class="section"><th scope="rowgroup" colspan="3"><a href="${prefix}${s.link}">${icon(s.icon)}${esc(s.title)}</a></th></tr>`;
    return `<tbody class="tone-${s.tone}">${sectionRow}${s.rows.map((r) => `<tr><th scope="row">${esc(r.f)}</th>${cellHtml(r.web)}${cellHtml(r.desktop)}</tr>`).join('')}</tbody>`;
  }).join('\n');
  return `<table class="features">${head}\n${body}\n</table>`;
}

/** The home page's cards: one for each section, its heading and one line */
function cardsHtml({ prefix = '' } = {}) {
  const cards = SECTIONS.map((s) => `<a class="f-card tone-${s.tone}" href="${prefix}${s.link}">${icon(s.icon)}<h3>${esc(s.card.h)}</h3><p>${esc(s.card.p)}</p></a>`).join('\n');
  return `<div class="f-cards">\n${cards}\n</div>`;
}

/** The table as Markdown (the README) */
function tableMarkdown(siteUrl) {
  const cell = (v) => (v === true ? '✓' : v === false ? '—' : `✓ ${v}`);
  const lines = ['| Feature | Web player (phones, tablets, any browser) | Desktop app (Windows, Mac, Linux) |', '|---|:---:|:---:|'];
  for (const s of SECTIONS) {
    lines.push(`| **[${s.title}](${siteUrl}${s.link})** | | |`);
    for (const r of s.rows) lines.push(`| ${r.f} | ${cell(r.web)} | ${cell(r.desktop)} |`);
  }
  return `${lines.join('\n')}\n\n${WHAT_IT_ISNT}`;
}

/** One app's features, for the structured data search engines read */
function featureList(app) {
  return SECTIONS.flatMap((s) => s.rows.filter((r) => r[app] !== false).map((r) => r.f));
}

// The styles for both (the build puts them into the home page's stylesheet, which every page shares).
// Four colours, each with a soft background, for light and dark.
const CSS = `
.tone-teal { --tone: var(--teal); --tone-ink: var(--teal-ink); --tone-soft: var(--teal-soft); }
.tone-coral { --tone: #c2452d; --tone-ink: #9c3420; --tone-soft: #fbe5de; }
.tone-amber { --tone: #b7790f; --tone-ink: #8a5a06; --tone-soft: #f8ebcf; }
.tone-blue { --tone: #2f64a8; --tone-ink: #234d84; --tone-soft: #e1eaf6; }
:root[data-theme="dark"] .tone-coral { --tone: #ff8a70; --tone-ink: #ffb19f; --tone-soft: #3a211b; }
:root[data-theme="dark"] .tone-amber { --tone: #e8b04a; --tone-ink: #f2cd85; --tone-soft: #33291a; }
:root[data-theme="dark"] .tone-blue { --tone: #7fa9e6; --tone-ink: #a9c6f0; --tone-soft: #1c2738; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tone-coral { --tone: #ff8a70; --tone-ink: #ffb19f; --tone-soft: #3a211b; }
  :root:not([data-theme="light"]) .tone-amber { --tone: #e8b04a; --tone-ink: #f2cd85; --tone-soft: #33291a; }
  :root:not([data-theme="light"]) .tone-blue { --tone: #7fa9e6; --tone-ink: #a9c6f0; --tone-soft: #1c2738; }
}
.f-icon { width: 24px; height: 24px; flex: none; }
.f-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; margin: 8px 0 22px; }
@media (max-width: 980px) { .f-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.f-card { display: block; padding: 20px 20px 18px; border-radius: var(--radius, 14px); background: var(--paper); border: 1px solid var(--line); border-top: 4px solid var(--tone); color: var(--ink); text-decoration: none; box-shadow: var(--shadow); transition: transform .15s ease, box-shadow .15s ease; }
.f-card:hover { transform: translateY(-2px); }
.f-card .f-icon { width: 44px; height: 44px; padding: 10px; border-radius: 12px; background: var(--tone-soft); color: var(--tone-ink); box-sizing: border-box; }
.f-card h3 { margin: 14px 0 6px; font-size: 18px; line-height: 1.25; }
.f-card p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.45; }
@media (max-width: 520px) {
  .f-cards { grid-template-columns: 1fr; gap: 12px; }
  .f-card { display: grid; grid-template-columns: 44px 1fr; gap: 2px 14px; padding: 16px; }
  .f-card .f-icon { grid-row: span 2; }
  .f-card h3 { margin: 2px 0 2px; }
}
.f-both { display: flex; flex-wrap: wrap; gap: 10px 22px; align-items: center; margin: 0 0 20px; color: var(--muted); font-size: 15px; }
.f-both b { color: var(--ink); }
table.features { width: 100%; border-collapse: separate; border-spacing: 0; margin: 8px 0 18px; font-size: 15px; }
table.features th, table.features td { padding: 9px 12px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
table.features thead th { font-size: 14px; position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 2px solid var(--ink); }
table.features thead th small { display: block; font-weight: 400; color: var(--muted); font-size: 12px; }
table.features td { text-align: center; width: 24%; }
table.features .mark { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 14px; font-weight: 800; line-height: 1; }
table.features td.yes .mark { background: var(--tone, var(--teal)); color: #fff; }
:root[data-theme="dark"] table.features td.yes .mark { color: #10201d; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) table.features td.yes .mark { color: #10201d; } }
table.features td.no .mark { background: var(--line); color: var(--muted); }
table.features td small { display: block; margin-top: 4px; color: var(--muted); font-size: 12px; line-height: 1.3; }
table.features tbody th { font-weight: 500; }
table.features tr.section th { padding: 22px 12px 10px; border-bottom: 0; }
table.features tr.section a { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 10px; background: var(--tone-soft); color: var(--tone-ink); font-size: 17px; font-weight: 800; text-decoration: none; }
table.features tr.section a:hover { text-decoration: underline; }
@media (max-width: 600px) { table.features { font-size: 14px; } table.features th, table.features td { padding: 8px 5px; } table.features td { width: 25%; } table.features tr.section th { padding: 16px 0 8px; } }
`;

module.exports = { SECTIONS, WHAT_IT_ISNT, tableHtml, cardsHtml, tableMarkdown, featureList, CSS, ICONS };
