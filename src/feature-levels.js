// Simple view, or all features (4.78). One table says which features a beginner sees: the simple
// view shows the 'simple' ones; "Show all features" shows everything. Change a feature's level in
// the table below, or in the app (Settings → Features), which keeps your changes on top of it.
//
// How it works: each control (a ribbon group, a button, a settings section…) carries
// data-feature="id" for the row it belongs to. With the simple view on, the page's <html> has
// data-simple, and css() hides the controls of every 'all' feature. Settings are not hidden but
// greyed (data-feature-grey on them), so you can see what's there.
// A feature with `uses` comes back by itself when the song open uses it (data-song-uses on <html>):
// the Picking tab for a song with picking or tab, the tune setting for a song with a tune.
// Hidden is not off: a song using a hidden feature plays and prints as before; keys still work.
//
// Pure; used by the desktop app (index.html) and the web player (app.html); unit tested.
(function (root) {
  // app: 'desktop', 'web' or 'both'. level: 'simple' (in the simple view) or 'all' (all features only)
  const FEATURES = [
    // ── Desktop: File ──
    { id: 'save', app: 'desktop', where: 'File', name: 'Save, Save as new', level: 'simple' },
    { id: 'versions', app: 'desktop', where: 'File', name: 'Earlier versions of a song', level: 'all' },
    { id: 'songFile', app: 'desktop', where: 'File', name: 'Rename, Close', level: 'simple' },
    { id: 'bringIn', app: 'desktop', where: 'File', name: 'Bring in: import, paste a chord sheet', level: 'simple' },
    { id: 'tidy', app: 'desktop', where: 'File', name: 'Tidy chords above the words', level: 'all' },
    { id: 'setlists', app: 'desktop', where: 'File, and the Setlists tab', name: 'Setlists and songbooks', level: 'all' },
    // ── Desktop: Write ──
    { id: 'writeAdd', app: 'desktop', where: 'Write', name: 'Put in: tab, chord shapes', level: 'simple' },
    { id: 'formatWords', app: 'desktop', where: 'Write', name: 'Bold, italic, underline', level: 'all' },
    { id: 'writeCheck', app: 'desktop', where: 'Write', name: 'Key and patterns: guess the key, chord patterns', level: 'all' },
    { id: 'writeEdit', app: 'desktop', where: 'Write', name: 'Undo, Redo', level: 'simple' },
    { id: 'writeHelp', app: 'desktop', where: 'Write', name: 'How to write songs', level: 'simple' },
    // ── Desktop: Song ──
    { id: 'key', app: 'desktop', where: 'Song', name: 'Key: try it higher or lower, other keys', level: 'simple' },
    { id: 'keyVersions', app: 'desktop', where: 'Song', name: 'Saved keys: keep a key as a version, rewrite the song in a key', level: 'all' },
    { id: 'capo', app: 'desktop', where: 'Song', name: 'Capo', level: 'simple' },
    { id: 'capoSuggest', app: 'desktop', where: 'Song', name: 'Suggest a capo', level: 'all' },
    { id: 'instrument', app: 'both', where: 'Song; web: the song page', name: 'Instrument', level: 'simple' },
    { id: 'tempoTime', app: 'desktop', where: 'Song', name: 'Tempo and time', level: 'simple' },
    { id: 'songStrum', app: 'desktop', where: 'Song', name: 'Strum where none is written', level: 'all' },
    // ── Desktop: Display ──
    { id: 'style', app: 'desktop', where: 'Display', name: 'Style sets, the Stage look, the stylesheet', level: 'all' },
    { id: 'diagrams', app: 'both', where: 'Display; web: Settings', name: 'Chord diagrams', level: 'simple' },
    { id: 'textSize', app: 'both', where: 'Display; web: the song page', name: 'Text size', level: 'simple' },
    { id: 'tune', app: 'both', where: 'Display; web: Settings', name: 'The tune as notes', level: 'all', uses: 'tune' },
    { id: 'strumLook', app: 'desktop', where: 'Display', name: 'How strum patterns look', level: 'all' },
    { id: 'layout', app: 'both', where: 'Display; web: Settings', name: 'Layout: chords above, in the words, raised', level: 'simple' },
    { id: 'tabLook', app: 'desktop', where: 'Display', name: 'Tab: frets and size', level: 'all', uses: 'picking' },
    { id: 'chordEdit', app: 'both', where: 'Write; web: the Edit page', name: 'Edit chords on the sheet', level: 'simple' },
    // ── Desktop: Export ──
    { id: 'export', app: 'desktop', where: 'Export', name: 'Export now, the exports folder', level: 'simple' },
    { id: 'pdfs', app: 'desktop', where: 'Export', name: 'PDFs', level: 'simple' },
    { id: 'exportKeys', app: 'desktop', where: 'Export', name: 'Keys to export in', level: 'all' },
    { id: 'sectionNames', app: 'desktop', where: 'Export', name: 'Section names', level: 'all' },
    { id: 'stage', app: 'both', where: 'Export; web: Settings', name: 'Stage copies', level: 'all' },
    { id: 'twoPage', app: 'desktop', where: 'Export', name: 'Two-page Stage', level: 'all' },
    { id: 'exportMore', app: 'desktop', where: 'Export', name: 'More formats: web page, text, ChordPro, words only, learn and pick sheets', level: 'all' },
    // ── Desktop: Play ──
    { id: 'play', app: 'both', where: 'Play; web: the player', name: 'Play, Stop', level: 'simple' },
    { id: 'karaoke', app: 'both', where: 'Play; web: the player', name: 'Karaoke', level: 'simple' },
    { id: 'session', app: 'both', where: 'Play; web: the player', name: 'Session screen', level: 'all' },
    { id: 'tempo', app: 'both', where: 'Play; web: the player', name: 'Tempo: slower, faster, tap', level: 'simple' },
    { id: 'practice', app: 'desktop', where: 'Play', name: 'Practice speed', level: 'all' },
    { id: 'sound', app: 'both', where: 'Play; web: Settings', name: 'Sound and feel', level: 'all' },
    { id: 'countIn', app: 'desktop', where: 'Play', name: 'Count in and voice', level: 'all' },
    { id: 'accompaniment', app: 'web', where: 'the song page and player', name: 'Accompaniment: the strum it plays', level: 'all' },
    // ── Desktop: Learn ──
    { id: 'learnMemory', app: 'desktop', where: 'Learn', name: 'Play from memory', level: 'simple' },
    { id: 'learnQuiz', app: 'desktop', where: 'Learn', name: 'Test yourself: Next chord?', level: 'simple' },
    { id: 'learnFingers', app: 'desktop', where: 'Learn', name: 'Chord changes, drills', level: 'all' },
    { id: 'learnNumbers', app: 'desktop', where: 'Learn', name: 'Chords as numbers', level: 'all' },
    { id: 'learnKey', app: 'desktop', where: 'Learn', name: 'Learn it in another key', level: 'all' },
    { id: 'learnTheory', app: 'desktop', where: 'Learn', name: 'How the song works: learn sheet, circle, patterns', level: 'all' },
    { id: 'learn', app: 'web', where: 'the player', name: 'Learn', level: 'simple' },
    // ── Desktop: Picking ──
    { id: 'picking', app: 'desktop', where: 'Picking', name: 'Picking: the whole tab', level: 'all', uses: 'picking' },
    // ── Desktop: the library ──
    { id: 'phone', app: 'desktop', where: 'the library', name: 'Phone and tablet', level: 'simple' },
    { id: 'libraries', app: 'desktop', where: 'the library', name: 'Other libraries and library packs', level: 'all' },
    { id: 'libraryTools', app: 'desktop', where: 'the library', name: 'Open the library folder, export every song', level: 'all' },
    // ── Desktop: song tabs ──
    { id: 'detailsMore', app: 'desktop', where: 'the song: Details tab', name: 'Album, source, difficulty, licence', level: 'all' },
    { id: 'songLinks', app: 'desktop', where: 'the song: Links tab', name: 'Links', level: 'all' },
    { id: 'songExports', app: 'desktop', where: 'the song: Exports tab', name: 'Exports', level: 'all' },
    { id: 'songChordPro', app: 'desktop', where: 'the song: ChordPro tab', name: 'ChordPro fields', level: 'all' },
    // ── Settings (greyed in the simple view, not hidden) ──
    { id: 'setSongCustom', app: 'desktop', where: 'Settings', name: 'Settings: custom for this song', level: 'all', grey: true },
    { id: 'setSongFonts', app: 'desktop', where: 'Settings', name: 'Settings: font for this song', level: 'all', grey: true },
    { id: 'setPrint', app: 'desktop', where: 'Settings', name: 'Settings: fonts, colours and printing', level: 'all', grey: true },
    { id: 'setStage', app: 'desktop', where: 'Settings', name: 'Settings: Stage copies', level: 'all', grey: true },
    // ── Web player only ──
    { id: 'sectionJump', app: 'web', where: 'the song page', name: 'Jump to section', level: 'all' },
    { id: 'playingReset', app: 'web', where: 'Settings', name: 'Reset playing choices', level: 'simple' },
    { id: 'restart', app: 'web', where: 'the player', name: 'Restart', level: 'simple' },
    { id: 'downloadMore', app: 'web', where: 'Download', name: 'More downloads: words only, ChordPro, club logo, date', level: 'all' },
    { id: 'tuneButton', app: 'web', where: 'the Edit page', name: 'Tune button (♪)', level: 'all' }
  ];

  const byId = new Map(FEATURES.map((f) => [f.id, f]));
  const forApp = (app) => FEATURES.filter((f) => f.app === app || f.app === 'both');

  /** Each feature's level, with your changes on top of the table: { id: 'simple' | 'all' } */
  function levels(changes = {}) {
    const out = {};
    for (const f of FEATURES) out[f.id] = changes[f.id] === 'simple' || changes[f.id] === 'all' ? changes[f.id] : f.level;
    return out;
  }
  /** Changes kept as text ("id:simple,id:all"), as config.ini keeps them */
  const parseChanges = (text) => Object.fromEntries(String(text || '').split(',').map((p) => p.trim().split(':')).filter(([id, lv]) => byId.has(id) && (lv === 'simple' || lv === 'all')));
  const changesText = (changes) => Object.entries(changes || {}).filter(([id, lv]) => byId.has(id) && lv !== byId.get(id).level).map(([id, lv]) => `${id}:${lv}`).join(',');

  /** The CSS for the simple view: the 'all' features' controls hidden (settings greyed) */
  function css(changes = {}) {
    const lv = levels(changes);
    const rules = [];
    for (const f of FEATURES) {
      if (lv[f.id] !== 'all') continue;
      const on = `html[data-simple]${f.uses ? `:not([data-song-uses~="${f.uses}"])` : ''}`;
      rules.push(`${on} [data-feature~="${f.id}"]:not([data-feature-grey]) { display: none !important; }`);
      // 4.81: a greyed settings section is its heading only (a long greyed list helped nobody)
      rules.push(`${on} [data-feature~="${f.id}"][data-feature-grey] { opacity: 0.6; pointer-events: none; }`);
      rules.push(`${on} [data-feature~="${f.id}"][data-feature-grey] > :not(h3) { display: none !important; }`);
      rules.push(`${on} [data-feature~="${f.id}"][data-feature-grey] > h3::after { content: " · shown with all features"; font-weight: 400; font-size: 0.85em; }`);
    }
    return rules.join('\n');
  }

  /** What the song uses that brings a feature back: 'picking' (picking or tab), 'tune' (its tune written in) */
  function songUses(ir) {
    const uses = new Set();
    for (const n of ir || []) {
      if (n.type === 'tab' || n.type === 'pick') uses.add('picking');
      if (n.type === 'melody') uses.add('tune');
    }
    return [...uses].join(' ');
  }

  /**
   * The Features table, for Settings: each feature, where it is, and whether it's in the simple view.
   * Returns HTML; the checkboxes carry data-feature-level="id".
   */
  function tableHtml(app, changes = {}) {
    const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lv = levels(changes);
    // where: "Display; web: Settings" is Display on the desktop, Settings in the web player
    const whereIn = (f) => { const [desk, web] = String(f.where).split('; web: '); return app === 'web' && f.app === 'both' ? (web || desk) : desk; };
    // 4.81: rows grouped under where they are; "Simple view" is the column's heading, not each row's words
    let last = null;
    const rows = forApp(app).map((f) => {
      const changed = lv[f.id] !== f.level;
      const where = whereIn(f);
      const head = where === last ? '' : `<tr class="feature-where"><th colspan="2" scope="colgroup">${esc(where)}</th></tr>`;
      last = where;
      return `${head}<tr${changed ? ' class="feature-changed"' : ''}><td>${esc(f.name)}${f.uses ? ' <span class="feature-note">(shown when the song uses it)</span>' : ''}${changed ? ' <span class="feature-note">changed</span>' : ''}</td><td><label class="feature-check"><input type="checkbox" data-feature-level="${f.id}" aria-label="${esc(f.name)}: in the simple view"${lv[f.id] === 'simple' ? ' checked' : ''}></label></td></tr>`;
    }).join('');
    return `<table class="feature-table"><thead><tr><th>Feature</th><th>Simple view</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  const TABLE_CSS = `
.feature-table { border-collapse: collapse; width: 100%; font-size: 13px; }
.feature-table th, .feature-table td { text-align: left; padding: 4px 8px; border-bottom: 1px solid rgba(128,128,128,.25); vertical-align: top; }
.feature-table th { font-weight: 700; }
.feature-table tr.feature-changed td:first-child { font-weight: 700; }
.feature-table .feature-note { color: #888; font-size: 0.9em; }
.feature-table .feature-check { display: block; text-align: center; }
.feature-table th:last-child, .feature-table td:last-child { text-align: center; width: 6em; }
.feature-table tr.feature-where th { padding-top: 12px; font-size: 0.85em; text-transform: uppercase; letter-spacing: .04em; opacity: .7; border-bottom: 0; }
.feature-table tr.feature-where th::first-letter { text-transform: uppercase; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }`;

  const api = { FEATURES, levels, parseChanges, changesText, css, songUses, tableHtml, TABLE_CSS, forApp };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeFeatureLevels = api;
}(typeof window !== 'undefined' ? window : globalThis));
