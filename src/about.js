// Help → About: what ukemusic is, and the acknowledgements for everything it uses.
// Shared by the desktop app and the web version (pure: unit tested).

const ACKNOWLEDGEMENTS = [
  {
    group: 'Sounds',
    items: [
      {
        name: 'FreePats ukulele',
        by: 'Mateusz Dąbrowski',
        what: 'Tenor ukulele notes and muted strum',
        licence: 'CC0 1.0',
        url: 'https://freepats.zenvoid.org/GuitarFamily/ukulele.html'
      },
      {
        name: 'FreePats nylon-string guitar',
        by: 'roberto@zenvoid.org',
        what: 'Recordings for guitar and baritone ukulele playback',
        licence: 'CC0 1.0',
        url: 'https://freepats.zenvoid.org/Guitar/acoustic-guitar.html'
      }
    ]
  },
  {
    group: 'Chord shapes',
    items: [
      {
        name: 'chords-db',
        by: 'David Rubert',
        what: 'Chord fingerings for ukulele, baritone and guitar',
        licence: 'MIT',
        url: 'https://github.com/tombatossals/chords-db'
      }
    ]
  },
  {
    group: 'Software',
    items: [
      { name: 'CodeMirror 6', by: 'Marijn Haverbeke and others', what: 'Song editing', licence: 'MIT', url: 'https://codemirror.net/' },
      { name: 'Lezer', by: 'Marijn Haverbeke', what: 'Song syntax highlighting', licence: 'MIT', url: 'https://lezer.codemirror.net/' },
      { name: 'crelt, style-mod, w3c-keyname', by: 'Marijn Haverbeke', what: 'Editor helpers', licence: 'MIT' },
      { name: 'ini', by: 'Isaac Z. Schlueter, GitHub Inc. and contributors', what: 'Settings files', licence: 'ISC', url: 'https://github.com/npm/ini' },
      { name: 'Electron', by: 'OpenJS Foundation and Electron contributors', what: 'Desktop app and PDFs', licence: 'MIT', url: 'https://www.electronjs.org/', only: 'desktop' },
      { name: 'electron-builder', by: 'Vladimir Krivosheev and contributors', what: 'Desktop installer', licence: 'MIT', url: 'https://www.electron.build/', only: 'desktop' },
      { name: 'esbuild', by: 'Evan Wallace', what: 'Web build', licence: 'MIT', url: 'https://esbuild.github.io/', only: 'web' }
    ]
  },
  {
    group: 'Fonts',
    items: [
      { name: 'Bravura', by: 'Steinberg Media Technologies', what: 'Music notation', licence: 'OFL 1.1' },
      { name: 'Atkinson Hyperlegible Next and Mono', by: 'Braille Institute of America', what: 'Easy to read text', licence: 'OFL 1.1' },
      { name: 'Figtree', by: 'Erik Kennedy', what: 'Web interface text', licence: 'OFL 1.1', url: 'https://fonts.google.com/specimen/Figtree', only: 'web' },
      { name: 'Courier Prime', by: 'Alan Dague-Greene for Quote-Unquote Apps', what: 'Web chord sheets', licence: 'OFL 1.1', url: 'https://fonts.google.com/specimen/Courier+Prime', only: 'web' }
    ]
  },
  {
    group: 'Music',
    items: [
      {
        name: 'Starter songs and practice tunes',
        what: 'Traditional and 19th-century songs',
        licence: 'Public domain'
      }
    ]
  }
];

const ABOUT = {
  name: 'ukemusic',
  tagline: 'Write, transpose, play and practise songs for ukulele, baritone ukulele and guitar.',
  author: 'Mark Beachill'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Acknowledgements for one edition ('desktop' or 'web'): items marked `only` for the other are left out */
function acknowledgements(edition = 'desktop') {
  return ACKNOWLEDGEMENTS
    .filter((g) => !g.only || g.only === edition)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.only || i.only === edition) }))
    .filter((g) => g.items.length);
}

/** The About page as HTML (no outer dialog) */
function aboutHtml({ version = '', edition = 'desktop', platform = '' } = {}) {
  const parts = [];
  parts.push(`<div class="about-head"><strong class="about-name">${escapeHtml(ABOUT.name)}</strong> <span class="about-version">${escapeHtml(version ? `version ${version}` : '')}${edition === 'web' ? ' · web' : ''}</span></div>`);
  parts.push(`<p class="about-tagline">${escapeHtml(ABOUT.tagline)}</p>`);
  parts.push(`<p class="about-author">By ${escapeHtml(ABOUT.author)}.${platform ? ` ${escapeHtml(platform)}` : ''}</p>`);
  parts.push('<h3 class="about-thanks">Thanks to</h3>');
  for (const group of acknowledgements(edition)) {
    parts.push(`<h4>${escapeHtml(group.group)}</h4><ul class="about-list">`);
    for (const item of group.items) {
      const name = item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.name)}</a>` : escapeHtml(item.name);
      const credit = item.by ? ` by ${escapeHtml(item.by)}` : '';
      parts.push(`<li><strong>${name}</strong>${credit} · ${escapeHtml(item.what)} · <span class="about-licence">${escapeHtml(item.licence)}</span></li>`);
    }
    parts.push('</ul>');
  }
  parts.push('<p class="about-foot">Licence details are in the <a href="https://github.com/markbeachill/ukemusic/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noopener">third-party notices</a>.</p>');
  return parts.join('\n');
}

module.exports = { ABOUT, ACKNOWLEDGEMENTS, acknowledgements, aboutHtml };
