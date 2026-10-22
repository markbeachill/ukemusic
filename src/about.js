// Help → About: what ukemusic is, and the acknowledgements for everything it uses.
// Shared by the desktop app and the web version (pure: unit tested).

const ACKNOWLEDGEMENTS = [
  {
    group: 'Sounds',
    items: [
      {
        name: 'FreePats “Ukulele” samples',
        by: 'Recorded by Mateusz Dąbrowski for the FreePats project (version 2026-08-11)',
        what: 'The real ukulele notes and the muted strum (“chuck”) heard when a song plays.',
        licence: 'Creative Commons CC0 1.0 (public domain)',
        url: 'https://freepats.zenvoid.org/GuitarFamily/ukulele.html'
      },
      {
        name: 'Other sounds',
        by: 'ukemusic',
        what: 'The guitar sounds, the “hollow” and “standard” ukulele sounds and the metronome click are made by the app itself as it plays.',
        licence: 'Part of ukemusic'
      }
    ]
  },
  {
    group: 'Chord shapes',
    items: [
      {
        name: 'chords-db',
        by: 'David Rubert',
        what: 'The ukulele, baritone and guitar chord fingerings, apart from the shapes checked by hand for ukemusic.',
        licence: 'MIT',
        url: 'https://github.com/tombatossals/chords-db'
      }
    ]
  },
  {
    group: 'Software',
    items: [
      { name: 'CodeMirror 6', by: 'Marijn Haverbeke and others', what: 'The song editor (packages @codemirror/state, view, commands and language).', licence: 'MIT', url: 'https://codemirror.net/' },
      { name: 'Lezer', by: 'Marijn Haverbeke', what: 'Used by the editor (@lezer/common, @lezer/highlight).', licence: 'MIT', url: 'https://lezer.codemirror.net/' },
      { name: 'crelt, style-mod, w3c-keyname', by: 'Marijn Haverbeke', what: 'Small helpers used by the editor.', licence: 'MIT' },
      { name: 'ini', by: 'Isaac Z. Schlueter, GitHub Inc. and contributors', what: 'Reading and writing settings files (song.ini, config.ini).', licence: 'ISC', url: 'https://github.com/npm/ini' },
      { name: 'Electron', by: 'OpenJS Foundation and Electron contributors', what: 'Runs the desktop app (with Chromium and Node.js), and makes the PDFs.', licence: 'MIT', url: 'https://www.electronjs.org/', only: 'desktop' },
      { name: 'electron-builder', by: 'Vladimir Krivosheev and contributors', what: 'Builds the installer.', licence: 'MIT', url: 'https://www.electron.build/', only: 'desktop' },
      { name: 'esbuild', by: 'Evan Wallace', what: 'Packs the app’s code for the web version.', licence: 'MIT', url: 'https://esbuild.github.io/', only: 'web' }
    ]
  },
  {
    group: 'Fonts',
    only: 'web',
    items: [
      { name: 'Figtree', by: 'Erik Kennedy', what: 'The web version’s text.', licence: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Figtree' },
      { name: 'Courier Prime', by: 'Alan Dague-Greene for Quote-Unquote Apps', what: 'The web version’s chord sheets.', licence: 'SIL Open Font License 1.1', url: 'https://fonts.google.com/specimen/Courier+Prime' }
    ]
  },
  {
    group: 'Music',
    items: [
      {
        name: 'Starter songs and practice tunes',
        by: 'Traditional and 19th-century songs',
        what: 'The starter songs and the practice melodies (Twinkle Twinkle, Ode to Joy, Frère Jacques, When the Saints, Mary Had a Little Lamb, Scarborough Fair) are old enough to be free of copyright.',
        licence: 'Public domain'
      }
    ]
  }
];

const ABOUT = {
  name: 'ukemusic',
  tagline: 'Chord sheets for ukulele (and baritone and guitar): write a song with its chords, see it laid out with chord shapes, transpose it, play along with it, and practise.',
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
      parts.push(`<li><strong>${name}</strong> · ${escapeHtml(item.by)}<br>${escapeHtml(item.what)} <span class="about-licence">${escapeHtml(item.licence)}</span></li>`);
    }
    parts.push('</ul>');
  }
  parts.push('<p class="about-foot">Full licence texts are in THIRD_PARTY_NOTICES.md and src/sounds/ukulele/LICENSE.txt in the ukemusic folder.</p>');
  return parts.join('\n');
}

module.exports = { ABOUT, ACKNOWLEDGEMENTS, acknowledgements, aboutHtml };
