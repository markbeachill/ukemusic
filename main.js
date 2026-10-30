const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const ini = require('ini');
const { loadChordLibrary } = require('./src/chord-library');
const songs = require('./src/song-library');
const starters = require('./src/starters');
const setlists = require('./src/setlists');
const libraries = require('./src/libraries');
const { writeFileSafe } = require('./src/safe-write');
const { getBundledResourcePath } = require('./src/resource-paths');
const { upgradeStylesheet, upgradeStylesheet416, upgradeStrumScale, upgradeSectionNames, undoStage428 } = require('./src/stylesheet-upgrade');
const styleSets = require('./src/style-sets');
const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  screen,
  shell
} = require('electron');
const log = require('./src/logger');

log.init(app);
log.info('main', `ukemusic v${require('./package.json').version} starting — Electron ${process.versions.electron}, ${process.platform} ${process.arch}, ${app.isPackaged ? 'packaged' : 'dev'}`);

process.on('uncaughtException', (error) => log.error('main', 'Uncaught exception', error));
process.on('unhandledRejection', (reason) => log.error('main', 'Unhandled promise rejection', reason));

const DEFAULT_CONFIG = {
  general: { theme: 'auto', look: 'standard', style_set: 'classic' },
  library: { songs_folder: '', libraries: '', last_song: '', show_notes_on_open: true, start_screen: 'library', starters_added: false, starters_info: false },
  song: { instrument: 'soprano', key: 'auto' },
  parsing: { use_delimiters: true },
  rhythm: { enable: true, placement: 'above_chords', align: false, notation: 'raw', style: 'comic' },
  export: {
    default_format: 'html',
    include_stylesheet: true,
    markdown_rhythm_style: 'italic',
    layout: 'lines',
    theme: 'light',
    formats: 'sheet_html,sheet_pdf',
    pdf_page_size: 'A4',
    all_versions: false,
    print_style: 'standard',
    section_names: 'show',
    tune_notation: 'strip',   // 4.44: the tune as notes: strip (each tune once, at the top), lines, off
    gig_folder: '',
    gig_copy: true,
    usual_formats: '',
    chordpro_abc: false,   // 4.44: ChordPro exports carry the tune as notation ({start_of_abc})
    stage_font: 'Consolas',
    stage_size: 18,
    stage_fit: true,
    stage_format: 'compact',   // 4.52: Compact (chords in the words) is the default
    stage_compact: true,       // 4.52: settings from before then have been moved to Compact once
    stage_chorus: 'full',
    stage_diagrams: 'song'
  },
  diagrams: {
    enable: true,
    placement: 'song_start',
    max_per_row: 5,
    show_fingers: true,
    fallback: 'placeholder',
    skip_common: false,
    common_chords: 'A A7 Am B7 Bb Bm C C7 D D7 Dm E E7 Em F F7 F#m G G7 Gm Gm7'
  },
  tablature: { enable: true, frets: 'chord', size: 'same', box: false, faint: false, in_print: true },
  playback: { count_in: true, follow: true, from_cursor: false, default_strum: 'simple', custom_strum: 'D>-DU-UDU', swing: 'auto', voice_count: false, voice_sections: false, voice_chords: false, sound: 'sampled', guitar_sound: 'steel', karaoke_size: 26 }
};

let mainWindow = null;
const windowDirtyState = new Map();
const windowNotesPending = new Map(); // notes typed but not yet written (they save ~1 s after typing)
let configDir = '';
let configPath = '';
let stylesheetPath = ''; // 4.16: the old single style.css (moved into styles/mine.css)
let stylesDir = '';
let defaultStylesheetText = '';
let windowStatePath = '';

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function readJsonSafe(targetPath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  } catch (_error) {
    return fallback;
  }
}

function writeJsonSafe(targetPath, value) {
  writeFileSafe(targetPath, JSON.stringify(value, null, 2));
}

function getWindowState() {
  return readJsonSafe(windowStatePath, { width: 1280, height: 800 });
}

function saveWindowState(window) {
  try {
    if (!window || window.isDestroyed()) {
      return;
    }
    writeJsonSafe(windowStatePath, window.getBounds());
  } catch (_err) {
    // Ignore — window may be mid-destruction
  }
}

function cloneDefaultConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function mergeConfig(base, override) {
  const output = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = mergeConfig(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function normalizeValue(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value);
  }
  return value;
}

function normalizeParsedConfig(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeParsedConfig);
  }
  if (!value || typeof value !== 'object') {
    return normalizeValue(value);
  }
  const output = {};
  for (const [key, innerValue] of Object.entries(value)) {
    output[key] = normalizeParsedConfig(innerValue);
  }
  return output;
}

async function readConfigObject() {
  const raw = await fsp.readFile(configPath, 'utf8');
  const parsed = normalizeParsedConfig(ini.parse(raw));
  // 4.52: Compact became the Stage format's default: settings from before then move to it once
  // (a format chosen after this is kept)
  if (parsed.export && parsed.export.stage_compact !== true) {
    if (!parsed.export.stage_format || parsed.export.stage_format === 'clear') parsed.export.stage_format = 'compact';
    parsed.export.stage_compact = true;
  }
  return { raw, config: mergeConfig(cloneDefaultConfig(), parsed) };
}

async function writeConfigObject(config) {
  const merged = mergeConfig(cloneDefaultConfig(), config || {});
  const raw = ini.stringify(merged, { whitespace: true });
  // 4.31: the settings as they were are kept in config.ini.bak, and the new ones swapped in safely
  try {
    const before = await fsp.readFile(configPath, 'utf8');
    if (before.trim() && before !== raw) await fsp.writeFile(`${configPath}.bak`, before, 'utf8');
  } catch (_e) { /* no config yet */ }
  writeFileSafe(configPath, raw);
  return { raw, config: merged };
}

// ── Style sets ──
function styleFile(id) {
  const clean = String(id || '').replace(/[^a-z0-9-]/gi, '');
  return clean ? path.join(stylesDir, `${clean}.css`) : '';
}
async function activeStylePath() {
  let id = 'classic';
  try { id = (await readConfigObject()).config?.general?.style_set || 'classic'; } catch (_e) { /* classic */ }
  const file = styleFile(id);
  return file && fs.existsSync(file) ? file : path.join(stylesDir, 'classic.css');
}
async function listStyleSets() {
  const active = path.basename(await activeStylePath(), '.css');
  const order = styleSets.BUILT_IN.map((b) => b.id);
  const files = (await fsp.readdir(stylesDir)).filter((f) => f.endsWith('.css'));
  const sets = [];
  for (const f of files) {
    const id = f.slice(0, -4);
    if (id === styleSets.STAGE.id) continue; // the Stage style isn't one of the sets to choose
    const info = styleSets.styleSetInfo(await fsp.readFile(path.join(stylesDir, f), 'utf8').catch(() => ''), id);
    sets.push({ id, name: info.name, description: info.description, builtIn: order.includes(id), active: id === active });
  }
  const rank = (s) => (order.includes(s.id) ? order.indexOf(s.id) : s.id === styleSets.MINE.id ? order.length : order.length + 1);
  sets.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return { sets, active, folder: stylesDir };
}

async function ensureAppFiles() {
  configDir = app.getPath('userData');
  configPath = path.join(configDir, 'config.ini');
  stylesheetPath = path.join(configDir, 'style.css');
  windowStatePath = path.join(configDir, 'window-state.json');
  const defaultStylesheetPath = getBundledResourcePath('default-style.css') || path.join(__dirname, 'src', 'default-style.css');
  const defaultStylesheet = await fsp.readFile(defaultStylesheetPath, 'utf8');

  ensureDirectory(configDir);

  if (!fs.existsSync(configPath)) {
    await writeConfigObject(DEFAULT_CONFIG);
  }

  // 4.16: style sets. Each is a whole stylesheet in the styles folder; config.ini's
  // general.style_set says which one is used. The built-in ones are written when missing.
  defaultStylesheetText = defaultStylesheet;
  stylesDir = path.join(configDir, 'styles');
  ensureDirectory(stylesDir);
  // 4.19: built-in sets you haven't edited are kept up to date with the app. builtin.json
  // remembers what was written; a set changed since is yours and is left alone. (Sets from
  // before 4.19 have no record: they're refreshed once, the old one kept as .before-4.19.)
  const recordPath = path.join(stylesDir, 'builtin.json');
  const record = readJsonSafe(recordPath, {}) || {};
  const hash = (text) => require('crypto').createHash('sha1').update(String(text)).digest('hex');
  for (const set of styleSets.builtInStyleSets(defaultStylesheet)) {
    const file = path.join(stylesDir, `${set.id}.css`);
    try {
      if (!fs.existsSync(file)) {
        await fsp.writeFile(file, set.css, 'utf8');
      } else {
        const text = await fsp.readFile(file, 'utf8');
        if (text === set.css) { record[set.id] = hash(text); continue; }
        if (record[set.id] && record[set.id] !== hash(text)) continue; // edited by you: kept
        if (!record[set.id]) await fsp.writeFile(`${file}.before-4.19`, text, 'utf8');
        await fsp.writeFile(file, set.css, 'utf8');
      }
      record[set.id] = hash(set.css);
    } catch (error) {
      log.error('main', `Could not write the style set ${set.id}`, error);
    }
  }
  writeJsonSafe(recordPath, record);
  // 4.16.2: plain strum patterns sized by --plain-strum-scale (View → Plain strums); boxes as in 4.16.0
  for (const f of (await fsp.readdir(stylesDir)).filter((name) => name.endsWith('.css'))) {
    try {
      const file = path.join(stylesDir, f);
      const text = await fsp.readFile(file, 'utf8');
      const up = upgradeSectionNames(upgradeStrumScale(text).css, defaultStylesheet).css; // 4.17: section names
      if (up !== text) await fsp.writeFile(file, up, 'utf8');
    } catch (error) {
      log.error('main', `Could not update ${f}`, error);
    }
  }
  // 4.19: the Stage style (styles/stage.css), for every Stage copy. Started from the Stage
  // font and size the set in use had (they used to live in each set).
  const stagePath = path.join(stylesDir, 'stage.css');
  if (!fs.existsSync(stagePath)) {
    try {
      const active = await fsp.readFile(await activeStylePath(), 'utf8').catch(() => '');
      const pick = (name) => { const m = active.match(new RegExp(`${name}\\s*:\\s*([^;]+);`)); return m ? m[1].trim() : ''; };
      await fsp.writeFile(stagePath, styleSets.stageCss(defaultStylesheet, { font: pick('--stage-font'), size: pick('--stage-size') }), 'utf8');
    } catch (error) {
      log.error('main', 'Could not write the Stage style', error);
    }
  }
  // 4.29: 4.28's change to the Stage style is put back as it was (Stage formats replace it)
  try {
    if (fs.existsSync(stagePath)) {
      const text = await fsp.readFile(stagePath, 'utf8');
      const up = undoStage428(text);
      if (up.changed) await fsp.writeFile(stagePath, up.css, 'utf8');
    }
  } catch (error) {
    log.error('main', 'Could not update the Stage style', error);
  }
  // An older single style.css becomes the set "My style" (and is used, as before)
  const minePath = path.join(stylesDir, `${styleSets.MINE.id}.css`);
  if (fs.existsSync(stylesheetPath) && !fs.existsSync(minePath)) {
    try {
      const { config } = await readConfigObject();
      const current = await fsp.readFile(stylesheetPath, 'utf8');
      let css = upgradeStylesheet(current, defaultStylesheet, { font: config?.export?.stage_font, size: config?.export?.stage_size }).css;
      css = upgradeStylesheet416(css, defaultStylesheet).css;
      css = upgradeStrumScale(css).css;
      css = upgradeSectionNames(css, defaultStylesheet).css;
      css = styleSets.withHeader(css, styleSets.MINE.name, styleSets.MINE.description);
      await fsp.writeFile(minePath, css, 'utf8');
      await fsp.rename(stylesheetPath, `${stylesheetPath}.moved-to-styles`);
      await writeConfigObject(mergeConfig(config, { general: { style_set: styleSets.MINE.id } }));
      log.info('main', 'style.css is now the style set "My style" (styles/mine.css)');
    } catch (error) {
      log.error('main', 'Could not move style.css into the styles folder', error);
    }
  }

  if (!fs.existsSync(windowStatePath)) {
    writeJsonSafe(windowStatePath, { width: 1280, height: 800 });
  }
}

function sendMenuAction(action) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu:action', action);
  }
}

// Menu items that work on a song page only (greyed out on Your songs, settings etc.) (4.20)
const SONG_PAGE_ITEMS = ['song-history', 'song-close', 'song-save', 'song-save-as', 'song-import', 'song-export', 'song-exports', 'song-print',
  'song-undo', 'song-redo', 'song-paste', 'song-convert', 'song-style', 'song-key', 'song-capo', 'song-patterns', 'song-strums', 'song-tab', 'song-play', 'song-stop'];
// …and of those, the ones that also need the song saved (it has a folder)
const SAVED_SONG_ITEMS = ['song-exports', 'song-history'];
function setMenuState({ songPage = true, saved = true, librarySongs = 1, library = true } = {}) {
  const menu = Menu.getApplicationMenu();
  if (!menu) return;
  // Library items (4.25): greyed out when they can't be used
  const share = menu.getMenuItemById('lib-share');
  if (share) share.enabled = Boolean(library) && librarySongs > 0;
  const about = menu.getMenuItemById('lib-about');
  if (about) about.enabled = Boolean(library);
  const importCho = menu.getMenuItemById('lib-import-cho');
  if (importCho) importCho.enabled = Boolean(library);
  for (const id of SONG_PAGE_ITEMS) {
    const item = menu.getMenuItemById(id);
    if (item) item.enabled = Boolean(songPage) && (!SAVED_SONG_ITEMS.includes(id) || Boolean(saved));
  }
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Your Songs (Library)', accelerator: 'CmdOrCtrl+L', click: () => sendMenuAction('library') },
        { type: 'separator' },
        { label: 'New Song…', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('file-new') },
        { label: 'Open Song…', accelerator: 'CmdOrCtrl+O', click: () => sendMenuAction('file-open') },
        { id: 'song-history', label: 'Earlier Versions…', click: () => sendMenuAction('song-history') },
        { id: 'song-close', label: 'Close Song', accelerator: 'CmdOrCtrl+W', click: () => sendMenuAction('file-close') },
        { id: 'song-save', label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('file-save') },
        { id: 'song-save-as', label: 'Save as New Song…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenuAction('file-save-as') },
        { type: 'separator' },
        { id: 'song-import', label: 'Import Text File…', click: () => sendMenuAction('file-import') },
        { type: 'separator' },
        { id: 'song-export', label: 'Export…', accelerator: 'CmdOrCtrl+E', click: () => sendMenuAction('export') },
        { id: 'song-exports', label: 'Open Exports Folder', click: () => sendMenuAction('open-exports') },
        { type: 'separator' },
        {
          label: 'Library',
          submenu: [
            { label: 'Switch Library…', click: () => sendMenuAction('lib-switch') },
            { label: 'New Library…', click: () => sendMenuAction('lib-new') },
            { label: 'Add a Library Folder…', click: () => sendMenuAction('choose-songs-folder') },
            { type: 'separator' },
            { label: 'Open a Library Pack…', click: () => sendMenuAction('lib-open-pack') },
            { id: 'lib-share', label: 'Share This Library as a Pack…', click: () => sendMenuAction('lib-share') },
            { id: 'lib-import-cho', label: 'Import ChordPro Files…', click: () => sendMenuAction('lib-import-cho') },
            { type: 'separator' },
            { id: 'lib-about', label: 'About This Library…', click: () => sendMenuAction('lib-about') }
          ]
        },
        { type: 'separator' },
        { id: 'song-print', label: 'Print', accelerator: 'CmdOrCtrl+P', click: () => sendMenuAction('print') },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit', label: process.platform === 'darwin' ? 'Close' : 'Quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { id: 'song-undo', label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => sendMenuAction('editor-undo') },
        { id: 'song-redo', label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: () => sendMenuAction('editor-redo') },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        { id: 'song-paste', label: 'Paste from Website…', accelerator: 'CmdOrCtrl+Shift+V', click: () => sendMenuAction('paste-chord-sheet') },
        { id: 'song-convert', label: 'Tidy Chords Above Words', click: () => sendMenuAction('convert-chord-lines') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => sendMenuAction('toggle-settings') },
        { id: 'song-style', label: 'Edit Style…', accelerator: 'CmdOrCtrl+Alt+E', click: () => sendMenuAction('edit-stylesheet') },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { role: 'resetZoom', label: 'Reset Zoom' }
      ]
    },
    {
      label: 'Write',
      submenu: [
        { id: 'song-key', label: 'Guess the Key…', accelerator: 'CmdOrCtrl+K', click: () => sendMenuAction('guess-key') },
        { id: 'song-capo', label: 'Suggest a Capo…', click: () => sendMenuAction('suggest-capo') },
        { id: 'song-patterns', label: 'Chord Patterns…', click: () => sendMenuAction('chord-patterns') },
        { type: 'separator' },
        { id: 'song-strums', label: 'Strum Patterns…', click: () => sendMenuAction('strum-library') },
        { id: 'song-tab', label: 'Insert Tab Block', click: () => sendMenuAction('insert-tab') }
      ]
    },
    {
      label: 'Play',
      submenu: [
        { id: 'song-play', label: 'Play', accelerator: 'F5', click: () => sendMenuAction('play') },
        { id: 'song-stop', label: 'Stop', accelerator: 'Shift+F5', click: () => sendMenuAction('stop') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Log File',
          click: () => {
            const file = log.getLogFile();
            if (file) shell.openPath(file);
          }
        },
        { type: 'separator' },
        {
          label: 'About ukemusic',
          click: () => sendMenuAction('about')
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function handleWindowClose(event) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  const isDirty = windowDirtyState.get(mainWindow.webContents.id);
  const notesPending = windowNotesPending.get(mainWindow.webContents.id);
  // Notes save themselves a moment after typing; if that moment hasn't come yet, let the
  // window save them first and then close (no question needed — notes are always kept).
  const flushNotesAndClose = () => {
    try {
      mainWindow.webContents.send('menu:action', 'flush-and-close');
    } catch (_err) {
      windowNotesPending.set(mainWindow.webContents.id, false);
      saveWindowState(mainWindow);
      mainWindow.destroy();
    }
  };
  if (!isDirty) {
    if (notesPending) {
      event.preventDefault();
      flushNotesAndClose();
      return;
    }
    saveWindowState(mainWindow);
    return;
  }

  event.preventDefault();

  const response = dialog.showMessageBoxSync(mainWindow, {
    type: 'warning',
    buttons: ['Save', 'Discard', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Unsaved changes',
    message: 'You have unsaved changes.',
    detail: 'Save your changes before closing?'
  });

  if (response === 2) {
    // Cancel — do nothing, window stays open
    return;
  }

  if (response === 1) {
    // Discard the song text — but notes are always kept
    windowDirtyState.set(mainWindow.webContents.id, false);
    if (notesPending) {
      flushNotesAndClose();
      return;
    }
    saveWindowState(mainWindow);
    mainWindow.destroy();
    return;
  }

  // Save — tell renderer to save, then close
  try {
    mainWindow.webContents.send('menu:action', 'file-save-and-close');
  } catch (_err) {
    // If IPC fails (window already destroying), just close
    windowDirtyState.set(mainWindow.webContents.id, false);
    saveWindowState(mainWindow);
    mainWindow.destroy();
  }
}

function createWindow() {
  const state = getWindowState();
  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width: state.width || 1280,
    height: state.height || 800,
    minWidth: 1000,
    minHeight: 700,
    icon: getBundledResourcePath('icon.png') || path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'src', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      plugins: true // the PDF viewer, for previews in the Exports tab
    }
  });

  // Capture the id now: by the time 'closed' fires, webContents is destroyed and can't be read
  const webContentsId = mainWindow.webContents.id;
  windowDirtyState.set(webContentsId, false);
  mainWindow.on('resize', () => saveWindowState(mainWindow));
  mainWindow.on('move', () => saveWindowState(mainWindow));
  mainWindow.on('close', handleWindowClose);
  mainWindow.on('closed', () => {
    windowDirtyState.delete(webContentsId);
    mainWindow = null;
  });

  attachWindowLogging(mainWindow);
  // Web links (Help → About) open in the browser, not in a new app window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      log.error('ipc', `${channel} failed`, error);
      throw error;
    }
  });
}

const CONSOLE_LEVELS = ['debug', 'info', 'warning', 'error']; // legacy numeric levels

function attachWindowLogging(window) {
  const wc = window.webContents;

  // Errors and warnings printed in the editor window or preview (Electron 35+ passes one event object)
  wc.on('console-message', (event, legacyLevel, legacyMessage, legacyLine, legacySource) => {
    const level = typeof event.level === 'string' ? event.level : CONSOLE_LEVELS[legacyLevel];
    const message = event.message ?? legacyMessage;
    const line = event.lineNumber ?? legacyLine;
    const source = event.sourceId ?? legacySource;
    if (level !== 'warning' && level !== 'error') return;
    // Uncaught errors are reported with full stacks by the window's own handler (log:write)
    if (/^Uncaught\b/.test(String(message))) return;
    // 4.31: Electron's own PDF viewer reports this every time a PDF is previewed: not our error
    if (/sandboxed_renderer\.bundle\.js script failed to run|object null is not iterable/.test(String(message)) || /sandboxed_renderer/.test(String(source))) return;
    log[level === 'error' ? 'error' : 'warn']('window-console', message, source ? `at ${source}:${line}` : '');
  });

  wc.on('preload-error', (_event, preloadPath, error) => log.error('preload', `Preload script failed: ${preloadPath}`, error));
  wc.on('render-process-gone', (_event, details) => log.error('window', 'Window process crashed or was killed', details));
  wc.on('did-fail-load', (_event, code, description, url) => log.error('window', `Failed to load ${url}`, `${code} ${description}`));
  wc.on('did-finish-load', () => log.info('window', 'Window loaded'));
  window.on('unresponsive', () => log.warn('window', 'Window became unresponsive'));
  window.on('responsive', () => log.info('window', 'Window responsive again'));
}

function registerIpc() {
  ipcMain.on('log:write', (_event, entry = {}) => {
    const level = ['info', 'warn', 'error'].includes(entry.level) ? entry.level : 'error';
    log[level](entry.source || 'window', String(entry.message || '(no message)'), entry.detail);
  });

  ipcMain.on('editor:setDirty', (event, dirty) => {
    windowDirtyState.set(event.sender.id, Boolean(dirty));
  });
  ipcMain.on('editor:setNotesPending', (event, pending) => {
    windowNotesPending.set(event.sender.id, Boolean(pending));
  });

  handle('dialog:confirmUnsaved', async () => {
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: 0,
      cancelId: 2,
      title: 'Unsaved changes',
      message: 'You have unsaved changes.',
      detail: 'Save your changes before continuing?'
    });

    return ['save', 'discard', 'cancel'][response.response] || 'cancel';
  });

  handle('file:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Import a text or ChordPro file as a new song',
      properties: ['openFile'],
      filters: [
        { name: 'Songs (text and ChordPro)', extensions: ['txt', 'md', 'cho', 'chordpro', 'chopro', 'crd', 'pro'] },
        { name: 'All files', extensions: ['*'] }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const targetPath = result.filePaths[0];
    const content = await fsp.readFile(targetPath, 'utf8');
    return { content, suggestedTitle: songs.suggestTitleFromFile(targetPath), sourcePath: targetPath };
  });

  // ── Song library ────────────────────────────────────────────
  handle('library:chooseFolder', async (_event, currentFolder) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose the folder to keep your songs in',
      defaultPath: currentFolder || app.getPath('documents'),
      properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    log.info('library', `Songs folder set to ${result.filePaths[0]}`);
    return result.filePaths[0];
  });

  handle('library:folderExists', async (_event, folder) => Boolean(folder) && fs.existsSync(folder) && fs.statSync(folder).isDirectory());

  handle('songs:list', async (_event, songsFolder) => songs.listSongs(songsFolder));

  // Songs for the web: every song in one file, for the web version's "Update songs"
  handle('web:exportSongs', async (_event, songsFolder) => {
    const { buildWebSongs } = require('./src/web-songs');
    const list = songs.listSongs(songsFolder).map((s) => {
      const song = songs.readSong(s.folder);
      return { title: song.title, content: song.content, settings: song.settings, notes: song.notes };
    });
    const bundle = buildWebSongs(list, { appVersion: require('./package.json').version });
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save songs for the web',
      defaultPath: path.join(songsFolder, 'ukemusic-web-songs.json'),
      filters: [{ name: 'ukemusic songs for the web', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return null;
    await fsp.writeFile(result.filePath, JSON.stringify(bundle), 'utf8');
    log.info('library', `Songs for the web: ${bundle.songs.length} songs to ${result.filePath}`);
    return { file: result.filePath, count: bundle.songs.length };
  });

  // 4.45: songs back from the web player: its "Back up all songs" file. Only the songs written or
  // changed there come in (a song only different because it changed here since is left alone).
  let webImport = null;
  handle('web:planImport', async (_event, songsFolder) => {
    const { readWebSongs } = require('./src/web-songs');
    const { planImport } = require('./src/song-files');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Bring in songs from the web player',
      properties: ['openFile'],
      filters: [{ name: 'ukemusic songs (backup from the web player)', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const file = result.filePaths[0];
    const r = readWebSongs(await fsp.readFile(file, 'utf8'));
    if (!r.ok) throw new Error(r.error);
    const current = songs.listSongs(songsFolder).map((s) => {
      const song = songs.readSong(s.folder);
      return { title: song.title, text: song.content, settings: song.settings || {}, notes: song.notes || '', folder: s.folder, songFile: song.songFile };
    });
    const plan = planImport(current, r.songs.map((s) => ({ ...s, from: 'backup' })));
    const add = plan.add.filter((s) => s.edited);
    const update = plan.update.filter((u) => u.song.edited);
    webImport = { songsFolder, add, update };
    return {
      file,
      exported: r.exported,
      add: add.map((s) => ({ title: s.title })),
      update: update.map((u) => ({ title: u.song.title, what: u.what })),
      same: plan.same.length,
      // in the file, not changed on the web player, but different here: changed here since
      newerHere: plan.update.length - update.length,
      notChanged: plan.add.length - add.length
    };
  });
  handle('web:applyImport', async (_event, { titles = [] } = {}) => {
    if (!webImport) throw new Error('Choose the file again.');
    const want = new Set(titles);
    const { songsFolder, add, update } = webImport;
    const done = { added: [], updated: [], errors: [] };
    const merge = (a, b) => {
      const out = JSON.parse(JSON.stringify(a || {}));
      for (const [k, v] of Object.entries(b || {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? { ...(out[k] && typeof out[k] === 'object' ? out[k] : {}), ...v } : v;
      return out;
    };
    for (const s of add) {
      if (!want.has(s.title)) continue;
      try {
        const song = songs.createSong(songsFolder, s.title, s.text, s.settings || {});
        if (String(s.notes || '').trim()) songs.writeNotes(song.folder, s.notes);
        songs.appendNoteLine(song.folder, 'Brought in from the web player');
        done.added.push(song.title);
      } catch (error) { done.errors.push(`${s.title}: ${error.message}`); }
    }
    for (const u of update) {
      if (!want.has(u.song.title)) continue;
      try {
        const folder = u.current.folder;
        if (u.what.includes('words and chords')) songs.saveSong(u.current.songFile, u.song.text);
        if (u.what.includes('details')) songs.writeSongSettings(folder, merge(songs.readSongSettings(folder) || {}, u.song.settings || {}));
        if (u.what.includes('notes')) songs.writeNotes(folder, u.song.notes || '');
        songs.appendNoteLine(folder, `Changed on the web player (${u.what.join(', ')}), brought in`);
        done.updated.push(u.song.title);
      } catch (error) { done.errors.push(`${u.song.title}: ${error.message}`); }
    }
    log.info('library', `From the web player: ${done.added.length} added, ${done.updated.length} updated${done.errors.length ? `, ${done.errors.length} failed` : ''}`);
    webImport = null;
    return done;
  });

  handle('songs:fillStarterInfo', async (_event, songsFolder) => starters.fillStarterInfo(songsFolder));

  handle('songs:addStarters', async (_event, songsFolder) => {
    const added = starters.addStarterSongs(songsFolder);
    if (added.length) log.info('library', `Added starter songs: ${added.join(', ')}`);
    return added;
  });

  handle('song:validateTitle', async (_event, { songsFolder, title } = {}) => songs.validateSongTitle(title, songsFolder));

  handle('song:create', async (_event, { songsFolder, title, content, settings } = {}) => {
    const song = songs.createSong(songsFolder, title, content, settings);
    log.info('library', `Created song "${song.title}"`);
    return song;
  });

  handle('song:open', async (_event, folder) => songs.readSong(folder));

  // Rename a song (folder and song file), and change its title in every setlist
  handle('song:rename', async (_event, { folder, title } = {}) => {
    const oldTitle = path.basename(folder);
    const song = songs.renameSong(folder, title);
    if (song.title !== oldTitle) {
      setlists.renameSongInSetlists(path.dirname(folder), oldTitle, song.title);
      log.info('library', `Renamed song "${oldTitle}" to "${song.title}"`);
    }
    return song;
  });

  handle('song:save', async (_event, { songFile, content, allowEmpty = false } = {}) => songs.saveSong(songFile, content, { allowEmpty }));
  handle('song:history', async (_event, folder) => songs.songHistory(folder));
  handle('song:readHistory', async (_event, { folder, file } = {}) => {
    const dir = path.resolve(folder || '', songs.HISTORY_DIR);
    const target = path.resolve(file || '');
    if (!target.startsWith(dir + path.sep)) throw new Error('Not one of this song\'s earlier versions');
    return fsp.readFile(target, 'utf8');
  });
  // A plain question with buttons (4.31): returns the index of the button pressed
  handle('dialog:ask', async (_event, { message = '', detail = '', buttons = ['OK', 'Cancel'], cancelId = 1 } = {}) => {
    if (process.env.UKEMUSIC_TEST_ASK !== undefined) return Number(process.env.UKEMUSIC_TEST_ASK);
    const { response } = await dialog.showMessageBox(mainWindow, { type: 'question', message, detail, buttons, defaultId: 0, cancelId, noLink: true });
    return response;
  });

  handle('song:writeSettings', async (_event, { folder, settings } = {}) => songs.writeSongSettings(folder, settings));

  handle('song:migrateExports', async (_event, folder) => songs.migrateExportFolders(folder));
  handle('song:export', async (_event, { folder, fileName, content, subfolder } = {}) => songs.writeExport(folder, fileName, content, subfolder));

  // Render a complete HTML document to PDF in a hidden window, then save it to the song's exports.
  // Render a complete HTML document to a PDF (Buffer) in a hidden window
  let lastStageFit = null;
  async function renderPdf(html, pageSize = 'A4', printStyle = 'standard') {
    const fitSetting = printStyle === 'stage' ? await readConfigObject().then((r) => r?.config?.export?.stage_fit).catch(() => true) : false;
    const fitStage = printStyle === 'stage' && fitSetting !== false && String(fitSetting) !== 'false';
    const tempFile = path.join(app.getPath('temp'), `ukemusic-print-${process.pid}-${Date.now()}.html`);
    // Printable area at 96 px per inch (page minus 0.6" margins all round)
    const letter = pageSize === 'Letter';
    const contentWidth = Math.round(((letter ? 8.5 : 8.27) - 1.2) * 96);
    const contentHeight = Math.round(((letter ? 11 : 11.69) - 1.2) * 96);
    const printWindow = new BrowserWindow({
      show: false,
      width: contentWidth,
      height: contentHeight,
      webPreferences: { sandbox: true, javascript: true, contextIsolation: true }
    });
    try {
      await fsp.writeFile(tempFile, html, 'utf8');
      await printWindow.loadFile(tempFile);
      // Keep short sections on one page; let long ones break between lines so pages aren't left
      // half empty (a chord line always stays with its lyric line; headings stay with what follows)
      // 4.32: on Stage copies only short parts are kept whole, so pages aren't left half empty
      const keepTogether = () => printWindow.webContents.executeJavaScript(`(() => {
        const limit = ${contentHeight} * ${printStyle === 'stage' ? 0.35 : 0.6};
        document.querySelectorAll('.song-section').forEach((section) => {
          section.classList.remove('keep-together');
          if (section.getBoundingClientRect().height <= limit) section.classList.add('keep-together');
        });
      })()`);
      const print = () => printWindow.webContents.printToPDF({
        pageSize: pageSize === 'Letter' ? 'Letter' : 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        // Stage style: black, bold header/footer that survive a black-and-white printer
        headerTemplate: printStyle === 'stage'
          ? '<div style="font-family:sans-serif;font-size:10px;font-weight:700;color:#000;width:100%;text-align:center;"><span class="title"></span></div>'
          : '<div style="font-family:sans-serif;font-size:8px;color:#888;width:100%;text-align:center;"><span class="title"></span></div>',
        footerTemplate: printStyle === 'stage'
          ? '<div style="font-family:sans-serif;font-size:10px;font-weight:700;color:#000;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
          : '<div style="font-family:sans-serif;font-size:8px;color:#888;width:100%;text-align:center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
        margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 }
      });
      await keepTogether();
      let pdf = await print();
      // 4.28: a Stage copy that runs onto more pages is printed again a little smaller (no smaller
      // than 16px; only the size changes, never the spacing), counting the real pages each time, and only kept smaller if that saves a page
      if (fitStage) {
        const pagesOf = (buffer) => (buffer.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
        const before = pagesOf(pdf);
        const start = await printWindow.webContents.executeJavaScript("parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--stage-size')) || 18");
        const min = Math.min(start, 16); // 4.29: no smaller than 16px: it has to stay easy to read
        const at = async (size) => {
          await printWindow.webContents.executeJavaScript(`document.documentElement.style.setProperty('--stage-size', '${size}px')`);
          await keepTogether();
          const out = await print();
          return { pdf: out, pages: pagesOf(out) };
        };
        if (before > 1 && min < start) {
          const smallest = await at(min);
          if (smallest.pages < before) {
            // the biggest size that still gets the fewest pages (half-pixel steps, by halving)
            let lo = min;
            let hi = start;
            let best = smallest;
            while (hi - lo > 0.5) {
              const mid = Math.round(((lo + hi) / 2) * 2) / 2;
              const tryIt = await at(mid);
              if (tryIt.pages <= smallest.pages) { lo = mid; best = tryIt; } else hi = mid;
            }
            pdf = best.pdf;
            lastStageFit = { start, size: lo, before, after: best.pages };
            log.info('main', `Stage PDF fitted: ${start}px -> ${lo}px, ${before} -> ${best.pages} page(s)`);
          }
        }
      }
      return pdf;
    } finally {
      printWindow.destroy();
      fsp.unlink(tempFile).catch(() => {});
    }
  }

  handle('song:exportPdf', async (_event, { folder, subfolder, fileName, html, pageSize = 'A4', printStyle = 'standard' } = {}) => {
    const pdf = await renderPdf(html, pageSize, printStyle);
    return songs.writeExport(folder, fileName, pdf, subfolder);
  });

  // 4.40: the song's trouble spots (learn/trouble-spots.json)
  handle('song:learnRead', async (_event, { folder, fileName } = {}) => songs.readLearn(folder, fileName));
  handle('song:learnWrite', async (_event, { folder, fileName, content } = {}) => songs.writeLearn(folder, fileName, String(content || '')));

  // 4.39: the learn sheet, as a web page and a PDF, in the song's learn/ folder
  handle('song:learnSheet', async (_event, { folder, baseName, html, pageSize = 'A4' } = {}) => {
    const htmlFile = songs.writeLearn(folder, `${baseName}.html`, html);
    const pdf = await renderPdf(html, pageSize, 'standard');
    const pdfFile = songs.writeLearn(folder, `${baseName}.pdf`, pdf);
    log.info('song', `Learn sheet written: ${pdfFile}`);
    return { htmlFile, pdfFile, folder: path.dirname(pdfFile) };
  });

  // ── Setlists (src/setlists.js) ──
  handle('setlists:list', async (_event, songsFolder) => setlists.listSetlists(songsFolder));
  handle('setlists:validateName', async (_event, { songsFolder, name, except } = {}) => setlists.validateName(name, songsFolder, { except }));
  handle('setlists:write', async (_event, { songsFolder, name, songs: list, oldName } = {}) => setlists.writeSetlist(songsFolder, name, list, { oldName }));
  handle('setlists:delete', async (_event, { songsFolder, name } = {}) => {
    const { response } = process.env.UKEMUSIC_TEST_TRASH ? { response: 0 } : await dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['Delete setlist', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      message: `Delete the setlist "${name}"?`,
      detail: 'Only the list is deleted: the songs stay in your library.'
    });
    if (response !== 0) return false;
    setlists.deleteSetlist(songsFolder, name);
    log.info('library', `Deleted setlist "${name}"`);
    return true;
  });
  handle('setlists:exportPdf', async (_event, { songsFolder, name, html, pageSize = 'A4', printStyle = 'standard' } = {}) => {
    const pdf = await renderPdf(html, pageSize, printStyle);
    const target = setlists.songbookPath(songsFolder, name);
    ensureDirectory(path.dirname(target));
    await fsp.writeFile(target, pdf);
    log.info('library', `Songbook written: ${target}`);
    return target;
  });

  // ── The song's exports (4.22): list, record, delete, copy to the gig folder ──
  const exportsMap = require('./src/exports-map');
  const toBin = async (target) => {
    if (process.env.UKEMUSIC_TEST_TRASH) {
      const dest = path.join(process.env.UKEMUSIC_TEST_TRASH, `${Date.now()}-${path.basename(target)}`);
      fs.renameSync(target, dest);
    } else {
      await shell.trashItem(target);
    }
  };
  handle('exports:list', async (_event, folder, current = {}) => exportsMap.listExports(folder, current || {}));
  handle('exports:record', async (_event, { folder, entries } = {}) => { exportsMap.recordExports(folder, entries); return true; });
  handle('exports:delete', async (_event, { folder, onlyOutOfDate = false, current = {}, onlyOldName = false } = {}) => {
    const list = exportsMap.listExports(folder, current || {});
    const files = list.groups.flatMap((g) => g.files).filter((f) => (!onlyOutOfDate || f.outOfDate) && (!onlyOldName || f.reason === 'name'));
    if (onlyOldName) onlyOutOfDate = true;
    if (!files.length) return { deleted: 0 };
    const { response } = process.env.UKEMUSIC_TEST_TRASH ? { response: 0 } : await dialog.showMessageBox(mainWindow, {
      type: 'warning', buttons: ['Delete', 'Cancel'], defaultId: 1, cancelId: 1, title: 'Delete exports',
      message: onlyOutOfDate ? `Delete the ${files.length} out-of-date file${files.length === 1 ? '' : 's'}?` : `Delete all ${files.length} exported file${files.length === 1 ? '' : 's'} for this song?`,
      detail: 'They go to the Recycle Bin. Export again whenever you like.'
    });
    if (response !== 0) return { deleted: 0, cancelled: true };
    if (onlyOutOfDate) {
      for (const f of files) await toBin(f.path);
    } else {
      await toBin(path.join(folder, exportsMap.EXPORTS_DIR));
      // 4.40.5: and the learn sheets (the trouble spots stay)
      for (const f of files.filter((x) => x.learn)) await toBin(f.path);
    }
    log.info('library', `Deleted ${files.length} exported files of ${folder}`);
    return { deleted: files.length };
  });
  handle('exports:readText', async (_event, filePath) => (await fsp.readFile(filePath, 'utf8')).slice(0, 200000));
  handle('exports:open', async (_event, filePath) => shell.openPath(filePath));
  handle('exports:show', async (_event, filePath) => { shell.showItemInFolder(filePath); return true; });
  // Copy a file into a folder (the gig folder); the folder is made if it's missing
  handle('exports:copyTo', async (_event, { from, folder, name } = {}) => {
    if (!from || !folder) throw new Error('Nothing to copy');
    ensureDirectory(folder);
    const target = path.join(folder, name || path.basename(from));
    await fsp.copyFile(from, target);
    return target;
  });
  // ── Libraries (4.25): folders of songs, as in Calibre ──
  handle('libraries:list', async (_event, paths) => libraries.listLibraries(paths));
  handle('libraries:readInfo', async (_event, folder) => libraries.readInfo(folder));
  handle('libraries:writeInfo', async (_event, { folder, info } = {}) => libraries.writeInfo(folder, info));
  handle('libraries:create', async (_event, { parent, name, info } = {}) => libraries.createLibrary(parent, name, info));
  handle('libraries:copySong', async (_event, { folder, library, move = false, keepBoth = false } = {}) => libraries.copySong(folder, library, { move, keepBoth }));
  handle('libraries:licenceCheck', async (_event, { library, names = null } = {}) => libraries.licenceCheck(library, names));
  handle('libraries:exportPack', async (_event, { library, notes = false, names = null } = {}) => {
    const info = libraries.readInfo(library);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save the library pack',
      defaultPath: path.join(path.dirname(library), `${info.name}${libraries.PACK_EXTENSION}`),
      filters: [{ name: 'ukemusic library pack', extensions: ['ukelib'] }, { name: 'Zip file', extensions: ['zip'] }]
    });
    if (result.canceled || !result.filePath) return null;
    return libraries.exportPack(library, result.filePath, { notes, names });
  });
  handle('libraries:choosePack', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open a library pack',
      filters: [{ name: 'ukemusic library pack', extensions: ['ukelib', 'zip'] }],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return null;
    const file = result.filePaths[0];
    return { file, ...libraries.readPack(file) };
  });
  handle('libraries:importPack', async (_event, { file, parent = null, into = null } = {}) => libraries.importPack(file, { parent, into }));
  // 4.34: a folder of ChordPro files (a club's songbook) into the library, one song each;
  // each subfolder of songs becomes a setlist
  handle('libraries:importChordPro', async (_event, { into, instrument = 'soprano' } = {}) => {
    if (!into) throw new Error('Choose or make a library first.');
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose a folder of ChordPro files (.cho) to bring into this library',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    const source = result.filePaths[0];
    const name = path.basename(source);
    const label = /^(songs?|chordpro|cho)$/i.test(name) ? path.basename(path.dirname(source)) : name;
    return { source, ...require('./src/chordpro-import').importFolder(source, into, { instrument, source: label }) };
  });
  handle('dialog:chooseFolder', async (_event, { title = 'Choose a folder', defaultPath } = {}) => {
    const result = await dialog.showOpenDialog(mainWindow, { title, defaultPath, properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? '' : result.filePaths[0];
  });
  // A setlist folder (4.22): one PDF per song, numbered in setlist order. Old numbered PDFs
  // in that folder are cleared first so the order is always right.
  handle('setlists:folderPdf', async (_event, { folder, fileName, html, pageSize = 'A4', printStyle = 'standard', clear = false } = {}) => {
    ensureDirectory(folder);
    if (clear) {
      for (const f of await fsp.readdir(folder)) if (/^\d{2,3} .*\.pdf$/i.test(f)) await fsp.unlink(path.join(folder, f));
    }
    const pdf = await renderPdf(html, pageSize, printStyle);
    const target = path.join(folder, fileName);
    await fsp.writeFile(target, pdf);
    return target;
  });
  handle('shell:openFolder', async (_event, folder) => shell.openPath(folder));

  // Archive a song (4.21): out of the list, into "Archived songs"; it can come back
  handle('song:archive', async (_event, { folder } = {}) => {
    const result = songs.archiveSong(folder);
    log.info('library', `Archived ${folder}`);
    return result;
  });
  handle('song:listArchived', async (_event, songsFolder) => songs.listArchived(songsFolder));
  handle('song:restore', async (_event, { folder } = {}) => {
    const result = songs.restoreSong(folder);
    log.info('library', `Restored ${result.folder}`);
    return result;
  });
  // Delete an archived song for good: ask, then it goes to the Recycle Bin
  handle('song:trash', async (_event, { folder, title } = {}) => {
    if (!folder || !fs.existsSync(folder)) throw new Error('That song\'s folder is missing');
    const { response } = process.env.UKEMUSIC_TEST_TRASH ? { response: 0 } : await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Delete', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Delete song',
      message: `Delete "${title || path.basename(folder)}" for good?`,
      detail: 'Its folder (the song, its notes, links and exports) goes to the Recycle Bin.'
    });
    if (response !== 0) return { deleted: false };
    if (process.env.UKEMUSIC_TEST_TRASH) {
      fs.renameSync(folder, path.join(process.env.UKEMUSIC_TEST_TRASH, path.basename(folder)));
    } else {
      await shell.trashItem(folder);
    }
    log.info('library', `Deleted song folder ${folder} (to the Recycle Bin)`);
    return { deleted: true };
  });
  ipcMain.on('menu:state', (_event, payload) => setMenuState(payload || {}));

  // ── Session screen (4.35): a song (or a setlist) fitted to one screen, for a group ──────
  // On a second screen (a TV or projector) if there is one, full screen; the laptop keeps the
  // app, and its keys (or a presentation clicker) turn the pages.
  let sessionWindow = null;
  const sessionPrefs = () => ({
    preload: path.join(__dirname, 'src', 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false
  });
  handle('session:open', async (_event, payload = {}) => {
    const mainDisplay = screen.getDisplayMatching(mainWindow.getBounds());
    const other = screen.getAllDisplays().find((d) => d.id !== mainDisplay.id);
    const target = other || mainDisplay;
    if (!sessionWindow || sessionWindow.isDestroyed()) {
      sessionWindow = new BrowserWindow({
        x: target.bounds.x,
        y: target.bounds.y,
        width: target.bounds.width,
        height: target.bounds.height,
        fullscreen: true,
        autoHideMenuBar: true,
        backgroundColor: '#ffffff',
        title: 'ukemusic: Session screen',
        icon: getBundledResourcePath('icon.png') || path.join(__dirname, 'build', 'icon.png'),
        webPreferences: sessionPrefs()
      });
      sessionWindow.setMenuBarVisibility(false);
      attachWindowLogging(sessionWindow);
      sessionWindow.on('closed', () => {
        sessionWindow = null;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('session:state', { closed: true });
      });
      await sessionWindow.loadFile(path.join(__dirname, 'session.html'));
    }
    sessionWindow.webContents.send('session:data', payload);
    // with the session on another screen, the laptop keeps the focus (for its keys and a clicker)
    if (other) mainWindow.focus(); else sessionWindow.focus();
    return { external: Boolean(other) };
  });
  ipcMain.on('session:key', (_event, key) => { if (sessionWindow && !sessionWindow.isDestroyed()) sessionWindow.webContents.send('session:key', key); });
  ipcMain.on('session:state', (_event, state) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('session:state', state); });
  ipcMain.on('session:close', () => { if (sessionWindow && !sessionWindow.isDestroyed()) sessionWindow.close(); });
  // Does every song fit one screen? Each is laid out, unseen, at 1920×1080 (a TV), as the
  // Session screen would; the answer lists the songs that need pages or small text.
  handle('session:check', async (_event, payload = {}) => {
    const win = new BrowserWindow({ show: false, width: 1920, height: 1080, useContentSize: true, webPreferences: sessionPrefs() });
    try {
      await win.loadFile(path.join(__dirname, 'session.html'), { query: { check: '1' } });
      win.setContentSize(1920, 1080);
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('The check took too long.')), 120000);
        ipcMain.once('session:checked', (_e, result) => { clearTimeout(timer); resolve(result); });
        win.webContents.send('session:data', { ...payload, check: true });
      });
    } finally {
      if (!win.isDestroyed()) win.destroy();
    }
  });
  handle('song:readChordPro', async (_event, folder) => songs.readChordPro(folder));
  handle('song:writeChordPro', async (_event, { folder, text } = {}) => songs.writeChordPro(folder, text));
  handle('song:writeLinks', async (_event, { folder, links } = {}) => require('./src/links').writeLinks(folder, links));
  handle('song:writeNotes', async (_event, { folder, text } = {}) => songs.writeNotes(folder, text));

  handle('song:appendNote', async (_event, { folder, line } = {}) => songs.appendNoteLine(folder, line));

  handle('song:openExports', async (_event, folder) => {
    const exportsFolder = path.join(folder, songs.EXPORTS_DIR);
    ensureDirectory(exportsFolder);
    return shell.openPath(exportsFolder);
  });

  handle('config:read', async () => {
    const { raw, config } = await readConfigObject();
    return { path: configPath, raw, config };
  });

  handle('config:write', async (_event, payload = {}) => {
    const config = typeof payload === 'string'
      ? normalizeParsedConfig(ini.parse(payload))
      : payload.config || normalizeParsedConfig(ini.parse(payload.raw || ''));
    const { raw, config: mergedConfig } = await writeConfigObject(config);
    return { path: configPath, raw, config: mergedConfig };
  });

  handle('stylesheet:read', async () => {
    const file = await activeStylePath();
    return { path: file, content: await fsp.readFile(file, 'utf8'), set: path.basename(file, '.css') };
  });

  handle('stylesheet:write', async (_event, payload = {}) => {
    const content = typeof payload === 'string' ? payload : payload.content || '';
    const file = await activeStylePath();
    writeFileSafe(file, content);
    return { path: file, content };
  });

  // Style sets: list, copy (as a new set), put a built-in one back as it came, delete your own
  handle('styles:list', async () => listStyleSets());
  handle('styles:copy', async (_event, { from, name, content } = {}) => {
    const source = styleFile(from);
    if (!source || !fs.existsSync(source)) throw new Error('That style set is missing');
    const sourceCss = await fsp.readFile(source, 'utf8');
    const cleanName = String(name || '').trim() || 'My copy';
    let id = styleSets.styleSetId(cleanName);
    for (let n = 2; fs.existsSync(path.join(stylesDir, `${id}.css`)) || styleSets.BUILT_IN.some((b) => b.id === id); n += 1) id = `${styleSets.styleSetId(cleanName)}-${n}`;
    const css = styleSets.withHeader(typeof content === 'string' && content.trim() ? content : sourceCss, cleanName, `copied from ${styleSets.styleSetInfo(sourceCss, from).name}`);
    await fsp.writeFile(path.join(stylesDir, `${id}.css`), css, 'utf8');
    return { id, sets: await listStyleSets() };
  });
  handle('styles:restore', async (_event, id) => {
    const set = styleSets.builtInStyleSets(defaultStylesheetText).find((b) => b.id === id);
    if (!set) throw new Error('Only the built-in style sets can be put back');
    await fsp.writeFile(path.join(stylesDir, `${set.id}.css`), set.css, 'utf8');
    return listStyleSets();
  });
  handle('styles:delete', async (_event, id) => {
    if (styleSets.BUILT_IN.some((b) => b.id === id)) throw new Error('The built-in style sets can\'t be deleted');
    const file = styleFile(id);
    if (file && fs.existsSync(file)) await fsp.rename(file, `${file}.deleted`);
    return listStyleSets();
  });
  handle('styles:folder', async () => shell.openPath(stylesDir));
  // The Stage style (4.19)
  const stageFile = () => path.join(stylesDir, 'stage.css');
  handle('styles:readStage', async () => {
    if (!fs.existsSync(stageFile())) await fsp.writeFile(stageFile(), styleSets.stageCss(defaultStylesheetText), 'utf8');
    return { path: stageFile(), content: await fsp.readFile(stageFile(), 'utf8') };
  });
  handle('styles:writeStage', async (_event, payload = {}) => {
    const content = typeof payload === 'string' ? payload : payload.content || '';
    writeFileSafe(stageFile(), content);
    return { path: stageFile(), content };
  });
  handle('styles:restoreStage', async () => {
    const current = await fsp.readFile(stageFile(), 'utf8').catch(() => '');
    const pick = (name) => { const m = current.match(new RegExp(`${name}\\s*:\\s*([^;]+);`)); return m ? m[1].trim() : ''; };
    const css = styleSets.stageCss(defaultStylesheetText, { font: pick('--stage-font'), size: pick('--stage-size') });
    await fsp.writeFile(stageFile(), css, 'utf8');
    return { path: stageFile(), content: css };
  });

  handle('config:path', async () => configDir);

  handle('chords:read', async (_event, instrument) => loadChordLibrary(configDir, instrument));

  handle('shell:openExternal', async (_event, targetPath) => {
    const openPath = targetPath || await activeStylePath();
    return shell.openPath(openPath);
  });
}

app.whenReady().then(async () => {
  try {
    await ensureAppFiles();
  } catch (error) {
    log.error('main', 'Could not create config files', error);
  }
  registerIpc();
  buildMenu();
  createWindow();
  log.info('main', `Config folder: ${configDir}`);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
