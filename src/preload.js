const { contextBridge, ipcRenderer } = require('electron');
const parse = require('./parser');
const renderHtml = require('./renderer-html');
const renderMarkdown = require('./renderer-markdown');
const { transposeIR } = require('./transpose');
const songLibrary = require('./song-library');
const versions = require('./versions');
const lyrics = require('./renderer-lyrics');
const { buildSchedule } = require('./playback-schedule');
const karaoke = require('./karaoke');
const instruments = require('./instruments');
const capoTools = require('./capo');
const strumLibrary = require('./strums');
const tabTools = require('./tab');
const chordSheet = require('./chord-sheet');
const keys = require('./keys');
const chordpro = require('./chordpro');
const { getChordDefinition } = require('./chord-library');
const { createUkemusicEditor } = require('./codemirror-ukemusic');
const shapes = require('./shapes');
const rekey = require('./rekey');
const setlistTools = require('./setlists');
const strumBox = require('./strum-box');
const renderDiagramSvg = require('./diagram-svg');
const guide = require('./guide');
const about = require('./about');
const training = require('./training');
const fingerExercises = require('./finger-exercises');
const noteExercises = require('./note-exercises');
const practiceCatalog = require('./practice-catalog');
const practiceProgress = require('./practice-progress');



let editorInstance = null;

function dispatchEditorEvent(detail) {
  window.dispatchEvent(new CustomEvent('ukemusic:editor-update', { detail }));
}

function ensureEditorManager() {
  return {
    init(selector, options = {}) {
      const host = document.querySelector(selector);
      if (!host) {
        throw new Error(`Editor host not found for selector: ${selector}`);
      }

      const fallbackSelector = options.fallbackSelector || null;
      const fallbackTextarea = fallbackSelector ? document.querySelector(fallbackSelector) : null;

      if (editorInstance && typeof editorInstance.destroy === 'function') {
        editorInstance.destroy();
        editorInstance = null;
      }

      const instance = createUkemusicEditor({
        parent: host,
        value: options.value || '',
        theme: options.theme || 'auto',
        fallbackTextarea,
        onFallbackRequired: () => {
          if (fallbackTextarea) {
            fallbackTextarea.hidden = false;
            fallbackTextarea.style.display = '';
          }
        },
        onUpdate: (detail) => dispatchEditorEvent(detail)
      });

      if (!instance) {
        if (fallbackTextarea) {
          fallbackTextarea.hidden = false;
          fallbackTextarea.style.display = '';
          fallbackTextarea.value = options.value || '';
          fallbackTextarea.focus();
        }
        return { usingCodeMirror: false };
      }

      editorInstance = instance;
      return { usingCodeMirror: true };
    },
    isAvailable() {
      return Boolean(editorInstance);
    },
    getValue() {
      return editorInstance ? editorInstance.getValue() : null;
    },
    setValue(value) {
      if (editorInstance) {
        editorInstance.setValue(value);
      }
    },
    loadValue(value) {
      if (editorInstance) {
        if (editorInstance.loadValue) editorInstance.loadValue(value);
        else editorInstance.setValue(value);
      }
    },
    focus() {
      if (editorInstance) {
        editorInstance.focus();
      }
    },
    getCursor() {
      return editorInstance ? editorInstance.getCursor() : null;
    },
    execCommand(command) {
      return editorInstance ? editorInstance.execCommand(command) : false;
    },
    goToLine(line) {
      if (editorInstance) editorInstance.goToLine(line);
    },
    topLine() {
      return editorInstance ? editorInstance.topLine() : 1;
    },
    setTheme(theme) {
      if (editorInstance && typeof editorInstance.setTheme === 'function') {
        editorInstance.setTheme(theme);
      }
    }
  };
}

contextBridge.exposeInMainWorld('ukemusic', {
  logWrite: (entry) => ipcRenderer.send('log:write', entry),
  fileImport: () => ipcRenderer.invoke('file:import'),
  chooseSongsFolder: (currentFolder) => ipcRenderer.invoke('library:chooseFolder', currentFolder),
  songsFolderExists: (folder) => ipcRenderer.invoke('library:folderExists', folder),
  listSongs: (songsFolder) => ipcRenderer.invoke('songs:list', songsFolder),
  exportWebSongs: (songsFolder) => ipcRenderer.invoke('web:exportSongs', songsFolder),
  readWebSongs: (text) => require('./web-songs').readWebSongs(text),
  addStarterSongs: (songsFolder) => ipcRenderer.invoke('songs:addStarters', songsFolder),
  fillStarterInfo: (songsFolder) => ipcRenderer.invoke('songs:fillStarterInfo', songsFolder),
  setlists: {
    list: (songsFolder) => ipcRenderer.invoke('setlists:list', songsFolder),
    validateName: (payload) => ipcRenderer.invoke('setlists:validateName', payload),
    write: (payload) => ipcRenderer.invoke('setlists:write', payload),
    remove: (payload) => ipcRenderer.invoke('setlists:delete', payload),
    exportPdf: (payload) => ipcRenderer.invoke('setlists:exportPdf', payload)
  },
  validateSongTitle: (payload) => ipcRenderer.invoke('song:validateTitle', payload),
  createSong: (payload) => ipcRenderer.invoke('song:create', payload),
  openSong: (folder) => ipcRenderer.invoke('song:open', folder),
  renameSong: (payload) => ipcRenderer.invoke('song:rename', payload),
  rekey: {
    rewriteText: (text, semitones, options) => rekey.rewriteText(text, semitones, options),
    settings: (settings, semitones, options) => rekey.rekeySettings(settings, semitones, options)
  },
  setlistEntry: {
    parse: (line) => setlistTools.parseEntry(line),
    format: (entry) => setlistTools.formatEntry(entry)
  },
  saveSong: (payload) => ipcRenderer.invoke('song:save', payload),
  writeSongSettings: (payload) => ipcRenderer.invoke('song:writeSettings', payload),
  exportSong: (payload) => ipcRenderer.invoke('song:export', payload),
  migrateExports: (folder) => ipcRenderer.invoke('song:migrateExports', folder),
  writeNotes: (payload) => ipcRenderer.invoke('song:writeNotes', payload),
  writeLinks: (payload) => ipcRenderer.invoke('song:writeLinks', payload),
  readChordPro: (folder) => ipcRenderer.invoke('song:readChordPro', folder),
  ask: (payload) => ipcRenderer.invoke('dialog:ask', payload),
  songHistory: (folder) => ipcRenderer.invoke('song:history', folder),
  readHistory: (payload) => ipcRenderer.invoke('song:readHistory', payload),
  writeChordPro: (payload) => ipcRenderer.invoke('song:writeChordPro', payload),
  chordProFields: (() => { const f = require('./chordpro-fields'); return { FIELDS: f.FIELDS, parse: f.parseFields, format: f.formatFields, beatsFromTime: f.beatsFromTime }; })(),
  trashSong: (payload) => ipcRenderer.invoke('song:trash', payload),
  archiveSong: (payload) => ipcRenderer.invoke('song:archive', payload),
  exportsList: (folder, current) => ipcRenderer.invoke('exports:list', folder, current),
  exportsRecord: (payload) => ipcRenderer.invoke('exports:record', payload),
  exportsDelete: (payload) => ipcRenderer.invoke('exports:delete', payload),
  exportsReadText: (filePath) => ipcRenderer.invoke('exports:readText', filePath),
  exportsOpen: (filePath) => ipcRenderer.invoke('exports:open', filePath),
  exportsShow: (filePath) => ipcRenderer.invoke('exports:show', filePath),
  exportsCopyTo: (payload) => ipcRenderer.invoke('exports:copyTo', payload),
  exportsMadeText: (made) => require('./exports-map').madeText(made),
  chooseFolder: (payload) => ipcRenderer.invoke('dialog:chooseFolder', payload),
  pathDirname: (p) => require('path').dirname(String(p || '')),
  pathBasename: (p) => require('path').basename(String(p || '')),
  libraryList: (() => { const l = require('./libraries'); return { parse: l.parseList, format: l.formatList }; })(),
  shorthandKeyHtml: (ir) => require('./print-notes').shorthandKeyHtml(ir),
  stageFormats: (() => { const f = require('./stage-formats'); return { FORMATS: f.FORMATS, formatOf: f.formatOf, css: f.formatsCss(), charsAcross: f.charsAcross, collapseRepeats: f.collapseRepeats }; })(),
  libraries: {
    list: (paths) => ipcRenderer.invoke('libraries:list', paths),
    readInfo: (folder) => ipcRenderer.invoke('libraries:readInfo', folder),
    writeInfo: (payload) => ipcRenderer.invoke('libraries:writeInfo', payload),
    create: (payload) => ipcRenderer.invoke('libraries:create', payload),
    copySong: (payload) => ipcRenderer.invoke('libraries:copySong', payload),
    licenceCheck: (payload) => ipcRenderer.invoke('libraries:licenceCheck', payload),
    exportPack: (payload) => ipcRenderer.invoke('libraries:exportPack', payload),
    choosePack: () => ipcRenderer.invoke('libraries:choosePack'),
    importPack: (payload) => ipcRenderer.invoke('libraries:importPack', payload),
    importChordPro: (payload) => ipcRenderer.invoke('libraries:importChordPro', payload), // 4.34: a folder of .cho files
    LICENCES: { 'public-domain': 'Public domain', own: 'My own song', permission: 'Shared with permission', personal: 'Copyrighted: for my own use' }
  },
  chordProImportSettings: (meta, instrumentId) => require('./chordpro-import').importSettings(meta, instrumentId), // 4.34
  // 4.35: the Session screen (src/session-view.js, session.html)
  sessionHtml: (ir, options) => require('./session-view').sessionHtml(ir, options),
  sessionChords: (ir) => require('./session-view').sessionChords(ir),
  sessionCss: () => require('./session-view').SESSION_CSS,
  sessionSong: (shown, options) => require('./session-view').sessionSong(shown, options),
  isCommonChord: (name, list) => require('./renderer-html').isCommonChord(name, list),
  session: {
    open: (payload) => ipcRenderer.invoke('session:open', payload),
    check: (payload) => ipcRenderer.invoke('session:check', payload),
    key: (key) => ipcRenderer.send('session:key', key),
    close: () => ipcRenderer.send('session:close'),
    sendState: (state) => ipcRenderer.send('session:state', state),
    sendChecked: (result) => ipcRenderer.send('session:checked', result),
    onData: (cb) => ipcRenderer.on('session:data', (_e, data) => cb(data)),
    onKey: (cb) => ipcRenderer.on('session:key', (_e, key) => cb(key)),
    onState: (cb) => ipcRenderer.on('session:state', (_e, state) => cb(state))
  },
  setlistFolderPdf: (payload) => ipcRenderer.invoke('setlists:folderPdf', payload),
  openFolder: (folder) => ipcRenderer.invoke('shell:openFolder', folder),
  listArchived: (songsFolder) => ipcRenderer.invoke('song:listArchived', songsFolder),
  restoreSong: (payload) => ipcRenderer.invoke('song:restore', payload),
  setMenuState: (payload) => ipcRenderer.send('menu:state', payload),
  progressions: (() => { const pr = require('./progressions'); return { analyse: pr.analyse, analysisText: pr.analysisText, addLabels: pr.addLabels }; })(),
  voiceCues: (schedule, options) => require('./voice-cues').voiceCues(schedule, options),
  spokenChord: (name) => require('./voice-cues').spokenChord(name),
  links: (() => { const l = require('./links'); return { cleanUrl: l.cleanUrl, youtubeId: l.youtubeId, linkKind: l.linkKind, defaultTitle: l.defaultTitle }; })(),
  exportPdf: (payload) => ipcRenderer.invoke('song:exportPdf', payload),
  renderLyricsText: (irNodes, options) => lyrics.renderLyricsText(irNodes, options),
  renderLyricsHtml: (irNodes, options) => lyrics.renderLyricsHtml(irNodes, options),
  lyricsCss: () => lyrics.LYRICS_CSS,
  buildSchedule: (irNodes, options) => buildSchedule(irNodes, options),
  instruments: instruments.INSTRUMENTS,
  strums: strumLibrary.STRUMS,
  strumArrows: (pattern) => strumLibrary.arrows(pattern),
  rankCapos: (chordNames, library) => capoTools.rankCapos(chordNames, library),
  shapes: {
    find: (chordName, instrumentId, options) => shapes.findShapes(chordName, instrumentId, options),
    parseFrets: (text, strings) => shapes.parseFrets(text, strings),
    text: (frets) => shapes.fretsText(frets),
    problem: (frets, chordName, instrumentId) => shapes.shapeProblem(frets, chordName, instrumentId),
    definition: (frets) => shapes.definitionFromFrets(frets),
    parseSetting: (text, strings) => shapes.parseShapeSetting(text, strings),
    formatSetting: (map) => shapes.formatShapeSetting(map),
    withShapes: (library, map) => shapes.withShapes(library, map),
    formatDefine: (name, frets) => shapes.formatDefine(name, frets)
  },
  chordDefinition: (library, chordName) => getChordDefinition(library, chordName),
  renderStrum: (text, ctx) => strumBox.renderStrum(text, ctx),
  strumCss: () => strumBox.strumCss() + renderHtml.sheetCss(),
  writingGuide: () => guide.writingGuide(),
  appVersion: require('../package.json').version,
  aboutHtml: (options) => about.aboutHtml(options),
  training: {
    EASY_CHORDS: training.EASY_CHORDS,
    BLUES_KEYS: training.BLUES_KEYS,
    ROOTS: training.ROOTS,
    TYPES: training.TYPES,
    barLines: (bars) => training.barLines(bars),
    bluesChart: (options) => training.bluesChart(options),
    shuffleShape: (name, library, instrument) => training.shuffleShape(name, library, instrument),
    definitionFromFrets: (frets, name, fingers) => training.definitionFromFrets(frets, name, fingers),
    applyShuffle: (schedule, shapes, instrument) => training.applyShuffle(schedule, shapes, instrument),
    addClicks: (schedule) => training.addClicks(schedule),
    changeTips: (from, to, library, instrument) => training.changeTips(from, to, library, instrument),
    partnersFor: (target) => training.partnersFor(target)
  },
  notesLib: {
    SCALES: noteExercises.SCALES,
    PICK_PATTERNS: noteExercises.PICK_PATTERNS,
    FINGER_WORDS: noteExercises.FINGER_WORDS,
    MELODIES: noteExercises.MELODIES,
    scaleNotes: (o) => noteExercises.scaleNotes(o),
    pickingNotes: (o) => noteExercises.pickingNotes(o),
    singleStringNotes: (o) => noteExercises.singleStringNotes(o),
    alternatingNotes: (o) => noteExercises.alternatingNotes(o),
    melodyNotes: (o) => noteExercises.melodyNotes(o),
    callResponseNotes: (o) => noteExercises.callResponseNotes(o),
    placeNotes: (pitches, tuning, o) => noteExercises.placeNotes(pitches, tuning, o)
  },
  practiceLib: {
    CATEGORIES: practiceCatalog.CATEGORIES,
    EXERCISES: practiceCatalog.EXERCISES,
    PROGRESSIONS: practiceCatalog.PROGRESSIONS,
    KEYS: Object.keys(practiceCatalog.KEY_NOTES),
    LADDER: practiceCatalog.LADDER,
    NOODLE_SETS: practiceCatalog.NOODLE_SETS,
    RHYTHM_IDEAS: practiceCatalog.RHYTHM_IDEAS,
    progressionChords: (id, key) => practiceCatalog.progressionChords(id, key),
    planText: (bars) => practiceCatalog.planText(bars),
    applyDynamics: (schedule, levels) => practiceCatalog.applyDynamics(schedule, levels),
    metronomeSchedule: (o) => practiceCatalog.metronomeSchedule(o),
    tapTempo: (times) => practiceCatalog.tapTempo(times),
    drillChords: (set, count) => practiceCatalog.drillChords(set, count),
    chordTones: (name) => practiceCatalog.chordTones(name),
    safeNotes: (o) => practiceCatalog.safeNotes(o),
    qaPhrase: (o) => practiceCatalog.qaPhrase(o),
    melodySongText: (o) => practiceCatalog.melodySongText(o)
  },
  practiceProgress: {
    read: (folder) => practiceProgress.readProgress(folder),
    write: (folder, data) => practiceProgress.writeProgress(folder, data),
    logSession: (data, id, o) => { practiceProgress.logSession(data, id, o); return data; },
    logClean: (data, id, o) => { const next = practiceProgress.logClean(data, id, o); return { data, next }; },
    logScore: (data, id, o) => { practiceProgress.logScore(data, id, o); return data; },
    bestScore: (data, id, label) => practiceProgress.bestScore(data, id, label),
    streak: (data, today) => practiceProgress.streak(data, today),
    todaySeconds: (data, today) => practiceProgress.todaySeconds(data, today),
    formatMinutes: (s) => practiceProgress.formatMinutes(s),
    defaults: () => practiceProgress.emptyProgress().routines
  },
  fingers: {
    PATTERNS: fingerExercises.PATTERNS,
    FINGER_NAMES: fingerExercises.FINGER_NAMES,
    spiderNotes: (options) => fingerExercises.spiderNotes(options),
    hopNotes: (options) => fingerExercises.hopNotes(options),
    spiderTab: (notes, names) => fingerExercises.spiderTab(notes, names),
    spiderSchedule: (notes, options) => fingerExercises.spiderSchedule(notes, options),
    describeNote: (note, names) => fingerExercises.describeNote(note, names),
    stringNames: (tuning) => fingerExercises.stringNames(tuning)
  },
  diagramSvg: (definition, options) => renderDiagramSvg(definition, options),
  instrument: (id) => instruments.instrument(id),
  blankTab: (instrument, bars, width) => tabTools.blankTab(instrument, bars, width),
  buildKaraoke: (irNodes, schedule, options) => karaoke.buildKaraoke(irNodes, schedule, options),
  pieceProgress: (piece, t) => karaoke.pieceProgress(piece, t),
  convertChordSheet: (text) => chordSheet.convertChordSheet(text),
  looksLikeChordPro: (text) => chordpro.looksLikeChordPro(text),
  chordProToUkemusic: (text) => chordpro.chordProToUkemusic(text),
  ukemusicToChordPro: (irNodes, info) => chordpro.ukemusicToChordPro(irNodes, info),
  findChordLines: (text, options) => chordSheet.findChordLines(text, options),
  appendNote: (payload) => ipcRenderer.invoke('song:appendNote', payload),
  versions: {
    parse: (value) => versions.parseVersions(value),
    format: (list) => versions.formatVersions(list),
    folder: (semitones, list) => versions.versionFolder(semitones, list),
    songChords: (irNodes) => versions.songChords(irNodes),
    make: (from, to) => versions.makeVersion(from, to),
    add: (list, version) => versions.addVersion(list, version),
    remove: (list, semitones) => versions.removeVersion(list, semitones),
    fromShift: (semitones, chords, key) => versions.versionFromShift(semitones, chords, key),
    transposeName: (chord, semitones, key) => versions.transposeName(chord, semitones, key),
    targetOptions: (from, chords, instrument, library, key) => versions.targetOptions(
      from, chords, instrument, (name) => Boolean(getChordDefinition(library, name)), key
    )
  },
  keys: {
    detect: (chordNames) => keys.detectKey(chordNames),
    rank: (chordNames) => keys.rankKeys(chordNames),
    confidence: (ranked) => keys.keyConfidence(ranked),
    parse: (name) => keys.parseKey(name),
    transpose: (key, semitones) => keys.transposeKey(key, semitones),
    describe: (key) => keys.describeKey(key),
    choices: () => [...keys.KEY_CHOICES]
  },
  openExportsFolder: (folder) => ipcRenderer.invoke('song:openExports', folder),
  exportFileName: (title, settings, extension) => songLibrary.exportFileName(title, settings, extension),
  songSettingPaths: () => [...songLibrary.SONG_SETTING_PATHS],
  pickSongSettings: (config) => songLibrary.pickSongSettings(config),
  configRead: () => ipcRenderer.invoke('config:read'),
  configWrite: (payload) => ipcRenderer.invoke('config:write', payload),
  stylesheetRead: () => ipcRenderer.invoke('stylesheet:read'),
  stylesheetWrite: (payload) => ipcRenderer.invoke('stylesheet:write', payload),
  stylesList: () => ipcRenderer.invoke('styles:list'),
  stylesCopy: (payload) => ipcRenderer.invoke('styles:copy', payload),
  stylesRestore: (id) => ipcRenderer.invoke('styles:restore', id),
  stylesDelete: (id) => ipcRenderer.invoke('styles:delete', id),
  stylesFolder: () => ipcRenderer.invoke('styles:folder'),
  stageStyleRead: () => ipcRenderer.invoke('styles:readStage'),
  stageStyleWrite: (payload) => ipcRenderer.invoke('styles:writeStage', payload),
  stageStyleRestore: () => ipcRenderer.invoke('styles:restoreStage'),
  getConfigPath: () => ipcRenderer.invoke('config:path'),
  loadChordLibrary: (instrument) => ipcRenderer.invoke('chords:read', instrument),
  openExternal: (targetPath) => ipcRenderer.invoke('shell:openExternal', targetPath),
  confirmUnsavedAction: () => ipcRenderer.invoke('dialog:confirmUnsaved'),
  parseSong: (input, options) => parse(input, options),
  transposeIR: (nodes, semitones, opts) => transposeIR(nodes, semitones, opts),
  renderHTML: (irNodes, options) => renderHtml(irNodes, options),
  renderMarkdown: (irNodes, config) => renderMarkdown(irNodes, config),
  setDirtyState: (dirty) => ipcRenderer.send('editor:setDirty', Boolean(dirty)),
  setNotesPending: (pending) => ipcRenderer.send('editor:setNotesPending', Boolean(pending)),
  editorInit: (selector, options) => ensureEditorManager().init(selector, options),
  editorAvailable: () => ensureEditorManager().isAvailable(),
  editorGetValue: () => ensureEditorManager().getValue(),
  editorSetValue: (value) => ensureEditorManager().setValue(value),
  editorLoadValue: (value) => ensureEditorManager().loadValue(value),
  editorFocus: () => ensureEditorManager().focus(),
  editorGetCursor: () => ensureEditorManager().getCursor(),
  editorExecCommand: (command) => ensureEditorManager().execCommand(command),
  editorGoToLine: (line) => ensureEditorManager().goToLine(line),
  editorTopLine: () => ensureEditorManager().topLine(),
  editorSetTheme: (theme) => ensureEditorManager().setTheme(theme),
  onEditorUpdate: (handler) => {
    const wrapped = (event) => handler(event.detail);
    window.addEventListener('ukemusic:editor-update', wrapped);
    return () => window.removeEventListener('ukemusic:editor-update', wrapped);
  },
  onMenuAction: (handler) => {
    const wrapped = (_event, action) => handler(action);
    ipcRenderer.on('menu:action', wrapped);
    return () => ipcRenderer.removeListener('menu:action', wrapped);
  }
});
