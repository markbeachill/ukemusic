// What ukemusic does, in the web player and the desktop app: the one list behind the website's
// Features page, the summary on the home page, the README's table and the structured data that
// search engines read. Change a feature here, then build the website (node web/make.js); the
// home page and the README are updated by that build, and a test checks they match.
//
// A cell is true (✓), false (—), or text: a tick with a note ("Print"; "On this device").
// Each section is also a card on the home page (card: its heading and one line; tone: its colour).
// home: true marks the main rows (kept for the README and anyone who wants the short list).
// adds: what the desktop app adds, in a few words, for the sentence that compares the two (4.99.10).

const SECTIONS = [
  {
    title: 'Get songs in', link: 'songs.html',
    tone: 'teal', icon: 'paste', card: { h: 'Adding songs', p: "Paste it from any website, or bring in your club's songbook. The chords go into the words for you." },
    rows: [
      { f: 'Paste a chord sheet from any website', web: true, desktop: true, home: true },
      { f: 'Import ChordPro files, or a whole songbook folder', web: 'Files, or a zipped folder', desktop: true, home: true },
      { f: 'AI prompts for difficult sheets and PDFs', web: true, desktop: true },
      { f: 'Public-domain songs to start with, ready to play', web: true, desktop: true },
      { f: 'A simple view to start with; all features when you want them', web: true, desktop: true }, // 4.78
      { f: 'A song opens as the sheet to play from; ✎ Edit words & chords to change it, or write your own', web: true, desktop: true }, // 4.93
      { f: 'Drag a chord to the right word on the sheet: Edit chords on the sheet (while editing: the Write tab, or right-click the sheet)', web: 'While editing', desktop: true }, // 4.77; 4.79: on the Write tab
      { f: 'Find songs by title, artist, tag or key', web: true, desktop: 'Several libraries too' }
    ]
  },
  {
    title: 'Play along', link: 'practise.html',
    tone: 'coral', icon: 'play', card: { h: 'Playing along', p: 'It plays the chords and the strum while the words light up. Any key, slower or faster.' },
    rows: [
      { f: 'It plays along with you: the chords and the strum, or picking', web: true, desktop: true, home: true },
      { f: 'Karaoke: the words light up as it plays', web: true, desktop: true },
      { f: 'Any key, with a capo; slower or faster', web: true, desktop: true },
      { f: 'The tune, shown as notes and played', web: true, desktop: true },
      { f: 'Real recordings: a ukulele, and a nylon-string guitar for baritone and guitar', web: true, desktop: true },
      { f: 'A strum library of 27 strums, with how to play each; build your own and keep it in My strums', web: true, desktop: true }, // 4.99.4
      { f: 'Loop a part', web: true, desktop: true },   // 4.99.11: Jump to section → Repeat it
      { f: 'Keep a song in several keys', web: false, desktop: true, adds: 'a song kept in several keys' }
    ]
  },
  {
    title: 'Learn a song by heart', link: 'learn.html',
    tone: 'amber', icon: 'bulb', card: { h: 'Learning a song by heart', p: 'Fewer chords on the sheet each time you play, quizzes on the changes, a learn sheet, and a practice plan from the song.' },
    rows: [
      { f: 'Play from memory, with fewer chords each time', web: true, desktop: true, home: true },
      { f: 'Quizzes on the changes and the chord numbers', web: true, desktop: true },
      { f: 'A learn sheet to print', web: 'Print', desktop: 'PDF' },
      { f: 'Practise this song: a plan from the song itself (its shapes, its hardest changes, its strum, its chords in order)', web: true, desktop: true, home: true } // 4.99.6
    ]
  },
  {
    title: 'Free Practice', link: 'practice/',
    tone: 'blue', icon: 'metronome', card: { h: 'Free Practice', p: '42 exercises: warm-ups, chord switching, strumming, picking, scales and improvising, with routines.' },
    rows: [
      { f: '42 exercises: warm-ups, chords, strumming, picking, scales, improvising', web: true, desktop: true, home: true },
      { f: 'Routines, and your progress (days, best tempos, scores)', web: true, desktop: true },
      { f: 'Progressions from memory, major and minor', web: true, desktop: true },
      { f: 'Learn a strum in steps: hear it, copy it muted, on one chord, then with the changes', web: true, desktop: true }, // 4.99.5
      { f: 'Chords by key, a sheet to print', web: 'Print', desktop: 'PDF' }
    ]
  },
  {
    title: 'Print and share', link: 'chord-sheets.html',
    tone: 'teal', icon: 'print', card: { h: 'Printing chord sheets', p: 'The chord shapes beside the words, in any key. Stage copies big enough to read at a gig.' },
    rows: [
      { f: 'Chord sheets with chord diagrams', web: 'Print or save a PDF', desktop: 'PDF', home: true },
      { f: 'Stage copies to print: big and easy to read at a gig', web: true, desktop: 'One or two pages' },
      { f: 'Pick sheets: tab for fingerpicking', web: true, desktop: true },
      { f: 'Easy-to-read text for low vision (Atkinson Hyperlegible)', web: true, desktop: true },
      { f: 'ChordPro, web page and lyrics files', web: true, desktop: 'And Markdown' },
      { f: 'Songbook PDFs of a setlist, with a cover and contents', web: false, desktop: true, adds: 'songbook PDFs of a setlist' },
      { f: 'Your club\'s logo and an "Updated" date on sheets', web: true, desktop: true }, // 4.76
      { f: 'Export every song at once', web: false, desktop: true, adds: 'every song exported at once' }
    ]
  },
  // 4.92: reading from a screen on your own stand is its own section, apart from printing (paper)
  // and from the Session screen (the room's TV)
  {
    title: 'Read from a tablet', link: 'perform.html#music-stand',
    tone: 'blue', icon: 'tablet', card: { h: 'Reading from a tablet', p: 'Your songs a page at a time on an iPad or laptop on your stand. A tap turns the page; a setlist goes song by song.' },
    rows: [
      { f: 'Music stand: read song after song on an iPad or laptop, a tap to turn the page', web: true, desktop: true },
      { f: 'One steady text size, chords above the words: pages, never smaller text', web: true, desktop: true },
      { f: 'A Bluetooth page-turner pedal, or the arrow keys', web: true, desktop: true }
    ]
  },
  {
    title: 'Play together', link: 'perform.html',
    tone: 'coral', icon: 'group', card: { h: 'Playing together', p: "The Session screen puts the song on the TV for the whole room, and goes through the night's setlist." },
    rows: [
      { f: 'Setlists: the night\'s songs in order, for the Music stand, the Session screen or a songbook PDF', web: true, desktop: true },
      { f: 'The Session screen: big words and chords for a group', web: 'On this device', desktop: 'On a second screen or TV', adds: 'the Session screen on a second screen or TV' },
      { f: 'Songs from the desktop to a phone or tablet, in one file', web: 'Takes it in', desktop: true }
    ]
  },
  {
    title: 'Your instrument', link: 'instruments.html',
    tone: 'amber', icon: 'note', card: { h: 'Your instrument', p: 'High or low G, baritone or guitar, each with its own chord shapes. Left-handed too.' },
    rows: [
      { f: 'Ukulele (high or low G), baritone ukulele and guitar', web: true, desktop: true, home: true },
      { f: 'Left-handed chord diagrams', web: true, desktop: true, home: true },
      { f: 'Your ukulele shapes on a baritone (or baritone shapes on a ukulele): the names you know, and what each sounds as', web: true, desktop: true }, // 4.99.0
      { f: 'Your own chord shape for a song', web: false, desktop: true, adds: 'your own chord shapes' }
    ]
  },
  {
    title: 'Free, offline and private', link: 'phone.html',
    tone: 'blue', icon: 'heart', card: { h: 'Free and private', p: 'Open source, no adverts, works without the internet, and your songs stay on your device.' },
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
  tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 7h8M8 10.5h8M8 14h5M11 18.5h2"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'
};
const icon = (name) => `<svg class="f-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

/** 4.99.10: what the desktop app adds, as one sentence, from the rows (so it can't drift from the table) */
function desktopAdds() {
  const bits = SECTIONS.flatMap((s) => s.rows.filter((r) => r.adds).map((r) => r.adds));
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}` : bits.join('');
  return `The desktop app adds ${list}.`;
}

function cellHtml(value) {
  if (value === true) return '<td class="yes"><span class="mark" aria-label="Yes">✓</span></td>';
  if (value === false) return '<td class="no"><span class="mark" aria-label="Not in this one">–</span></td>';
  return `<td class="yes"><span class="mark" aria-label="Yes">✓</span><small>${esc(value)}</small></td>`;
}

/** The whole table as HTML (the Features page): each section's heading in its colour */
function tableHtml({ prefix = '' } = {}) {
  const head = '<thead><tr><th scope="col">Feature</th><th scope="col">Web player<small>phones, tablets, any browser</small></th><th scope="col">Desktop app<small>Windows, Mac, Linux</small></th></tr></thead>';
  const body = SECTIONS.map((s) => {
    const sectionRow = `<tr class="section"><th scope="rowgroup" colspan="3"><a href="${prefix}${s.link}">${esc(s.title)}</a></th></tr>`;
    return `<tbody class="tone-${s.tone}">${sectionRow}${s.rows.map((r) => `<tr><th scope="row">${esc(r.f)}</th>${cellHtml(r.web)}${cellHtml(r.desktop)}</tr>`).join('')}</tbody>`;
  }).join('\n');
  return `<table class="features">${head}\n${body}\n</table>`;
}

/** The home page's list (4.95: plain, as the website's style asks): each section's heading, linked, and one line */
function cardsHtml({ prefix = '' } = {}) {
  const items = SECTIONS.map((s) => `<div class="tone-${s.tone}"><h3><a href="${prefix}${s.link}">${esc(s.card.h)}</a></h3><p>${esc(s.card.p)}</p></div>`).join('\n');
  return `<div class="f-list">\n${items}\n</div>`;
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
// 4.95: plain, as the website's style asks (AGENTS.md): each section's colour for its heading only.
const CSS = `
.tone-teal { --tone: var(--teal-ink); }
.tone-coral { --tone: #a83a24; }
.tone-amber { --tone: #8a5a06; }
.tone-blue { --tone: #234d84; }
:root[data-theme="dark"] .tone-coral { --tone: #ffb19f; }
:root[data-theme="dark"] .tone-amber { --tone: #f2cd85; }
:root[data-theme="dark"] .tone-blue { --tone: #a9c6f0; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) .tone-coral { --tone: #ffb19f; }
  :root:not([data-theme="light"]) .tone-amber { --tone: #f2cd85; }
  :root:not([data-theme="light"]) .tone-blue { --tone: #a9c6f0; }
}
.f-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 40px; margin: 0 0 16px; }
@media (max-width: 700px) { .f-list { grid-template-columns: 1fr; } }
.f-list h3 { margin: 12px 0 2px; }
.f-list h3 a { color: var(--tone); }
.f-list p { margin: 0; color: var(--muted); }
.f-both { margin: 0 0 16px; color: var(--muted); }
.f-both b { color: var(--ink); }
table.features { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
table.features th, table.features td { padding: 6px 10px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: top; }
table.features thead th { font-size: 14px; position: sticky; top: 0; z-index: 1; background: var(--bg); border-bottom: 2px solid var(--ink); }
table.features thead th small { display: block; font-weight: 400; color: var(--muted); }
table.features td { text-align: center; width: 24%; }
table.features .mark { font-weight: 700; }
table.features td.yes .mark { color: var(--tone, var(--teal-ink)); }
table.features td.no .mark { color: var(--muted); }
table.features td small { display: block; color: var(--muted); font-size: 14px; line-height: 1.35; }
table.features tbody th { font-weight: 400; }
table.features tr.section th { padding: 24px 10px 6px; border-bottom: 2px solid var(--tone, var(--line)); }
table.features tr.section a { color: var(--tone, var(--ink)); font-size: 20px; font-weight: 700; text-decoration: none; }
table.features tr.section a:hover { text-decoration: underline; }
@media (max-width: 600px) { table.features { font-size: 14px; } table.features th, table.features td { padding: 6px 4px; } table.features td { width: 25%; } }
`;

module.exports = { SECTIONS, WHAT_IT_ISNT, tableHtml, cardsHtml, tableMarkdown, featureList, desktopAdds, CSS, ICONS };
