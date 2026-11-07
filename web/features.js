// What ukemusic does, in the web player and the desktop app: the one list behind the website's
// Features page, the summary on the home page, the README's table and the structured data that
// search engines read. Change a feature here, then build the website (node web/make.js); the
// home page and the README are updated by that build, and a test checks they match.
//
// A cell is true (✓), false (—), or text: a tick with a note ("Print"; "On this device").
// home: true puts the row in the home page's short table.

const SECTIONS = [
  {
    title: 'Get songs in', link: 'songs.html',
    rows: [
      { f: 'Paste a chord sheet from any website', web: true, desktop: true, home: true },
      { f: 'Import ChordPro files, or a whole songbook folder', web: 'Files, or a zipped folder', desktop: true, home: true },
      { f: 'AI prompts for difficult sheets and PDFs', web: true, desktop: true },
      { f: 'Public-domain songs to start with, ready to play', web: true, desktop: true },
      { f: 'Change a song, or write your own', web: true, desktop: true },
      { f: 'Find songs by title, artist, tag or key', web: true, desktop: 'Several libraries too' }
    ]
  },
  {
    title: 'Play along', link: 'practise.html',
    rows: [
      { f: 'Playback with the chords and the strum (or picking)', web: true, desktop: true, home: true },
      { f: 'Karaoke: the words light up as it plays', web: true, desktop: true },
      { f: 'Any key, with a capo; slower or faster', web: true, desktop: true },
      { f: 'The tune, as notes and played', web: true, desktop: true },
      { f: 'Loop a part', web: false, desktop: true },
      { f: 'Keep a song in several keys', web: false, desktop: true }
    ]
  },
  {
    title: 'Learn a song by heart', link: 'learn.html',
    rows: [
      { f: 'Play from memory, with fewer chords each time', web: true, desktop: true, home: true },
      { f: 'Quizzes on the changes and the chord numbers', web: true, desktop: true },
      { f: 'A learn sheet to print', web: 'Print', desktop: 'PDF' }
    ]
  },
  {
    title: 'Free Practice', link: 'practice/',
    rows: [
      { f: '40 exercises: warm-ups, chords, strumming, picking, scales, improvising', web: true, desktop: true, home: true },
      { f: 'Routines, and your progress (days, best tempos, scores)', web: true, desktop: true },
      { f: 'Progressions from memory, major and minor', web: true, desktop: true },
      { f: 'Chords by key, a sheet to print', web: 'Print', desktop: 'PDF' }
    ]
  },
  {
    title: 'Print and share', link: 'chord-sheets.html',
    rows: [
      { f: 'Chord sheets with chord diagrams', web: 'Print or save a PDF', desktop: 'PDF', home: true },
      { f: 'Stage copies: big and easy to read at a gig', web: true, desktop: 'One or two pages' },
      { f: 'Pick sheets: tab for fingerpicking', web: true, desktop: true },
      { f: 'ChordPro, web page and lyrics files', web: true, desktop: 'And Markdown' },
      { f: 'Songbook PDFs of a setlist', web: false, desktop: true },
      { f: 'Export every song at once', web: false, desktop: true }
    ]
  },
  {
    title: 'Play together', link: 'perform.html',
    rows: [
      { f: 'Setlists', web: false, desktop: true },
      { f: 'The Session screen: big words and chords for a group', web: 'On this device', desktop: 'On a second screen or TV' },
      { f: 'Songs from the desktop to a phone or tablet, in one file', web: 'Takes it in', desktop: true }
    ]
  },
  {
    title: 'Your instrument', link: 'instruments.html',
    rows: [
      { f: 'Ukulele (high or low G), baritone ukulele and guitar', web: true, desktop: true, home: true },
      { f: 'Left-handed chord diagrams', web: true, desktop: true, home: true },
      { f: 'Your own chord shape for a song', web: false, desktop: true }
    ]
  },
  {
    title: 'Free, offline and private', link: 'phone.html',
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

function cellHtml(value) {
  if (value === true) return '<td class="yes"><span aria-label="Yes">✓</span></td>';
  if (value === false) return '<td class="no"><span aria-label="No">—</span></td>';
  return `<td class="yes"><span aria-label="Yes">✓</span> <small>${esc(value)}</small></td>`;
}

/** The table as HTML: every section, or (home) only the main rows, under one heading */
function tableHtml({ home = false, prefix = '' } = {}) {
  const head = '<thead><tr><th scope="col">Feature</th><th scope="col">Web player<small>phones, tablets, any browser</small></th><th scope="col">Desktop app<small>Windows, Mac, Linux</small></th></tr></thead>';
  const body = SECTIONS.map((s) => {
    const rows = s.rows.filter((r) => !home || r.home);
    if (!rows.length) return '';
    const sectionRow = home ? '' : `<tr class="section"><th scope="rowgroup" colspan="3"><a href="${prefix}${s.link}">${esc(s.title)}</a></th></tr>`;
    return sectionRow + rows.map((r) => `<tr><th scope="row">${esc(r.f)}</th>${cellHtml(r.web)}${cellHtml(r.desktop)}</tr>`).join('');
  }).join('\n');
  return `<table class="features${home ? ' short' : ''}">${head}<tbody>\n${body}\n</tbody></table>`;
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

const CSS = `
table.features { width: 100%; border-collapse: collapse; margin: 8px 0 18px; font-size: 15px; }
table.features th, table.features td { padding: 9px 10px; border-bottom: 1px solid var(--line, #e3ddd2); text-align: left; vertical-align: top; }
table.features thead th { font-size: 14px; position: sticky; top: 0; background: var(--bg, #f6f2ec); }
table.features thead th small { display: block; font-weight: 400; color: var(--muted, #6b6b6b); font-size: 12px; }
table.features td { text-align: center; width: 24%; }
table.features td.yes span { color: var(--teal-ink, #0e5a54); font-weight: 700; }
table.features td.no span { color: var(--muted, #8a8a8a); }
table.features td small { display: block; color: var(--muted, #6b6b6b); font-size: 12px; line-height: 1.3; }
table.features tbody th { font-weight: 500; }
table.features tr.section th { padding-top: 22px; font-size: 17px; font-weight: 700; border-bottom: 2px solid var(--ink, #222); }
table.features tr.section a { color: inherit; text-decoration: none; }
table.features tr.section a:hover { text-decoration: underline; }
@media (max-width: 600px) { table.features { font-size: 14px; } table.features th, table.features td { padding: 7px 5px; } table.features td { width: 26%; } }
`;

module.exports = { SECTIONS, WHAT_IT_ISNT, tableHtml, tableMarkdown, featureList, CSS };
