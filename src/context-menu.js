// 4.58: the right-click menu. The usual text items wherever you can type or have selected text
// (Undo, Redo, Cut, Copy, Paste, Select all, and spelling suggestions); in the song editor, a few
// song items the page asks for (window.ukemusicContextItems). Electron shows no menu of its own.

/**
 * The menu as an Electron template.
 * params: Electron's context-menu params. extras: null outside the song editor, else the song items
 * ({ id, label } run in the page, or { action, label } like a menu bar item). run(item) does one.
 */
function contextTemplate(params = {}, extras = null, run = () => {}) {
  const flags = params.editFlags || {};
  const inEditor = Array.isArray(extras);
  const editable = Boolean(params.isEditable) || inEditor;
  const hasSelection = Boolean(String(params.selectionText || '').trim());
  const out = [];
  const suggestions = params.misspelledWord ? (params.dictionarySuggestions || []).slice(0, 5) : [];
  for (const word of suggestions) out.push({ label: word, click: () => run({ replace: word }) });
  if (params.misspelledWord) {
    if (!suggestions.length) out.push({ label: 'No spelling suggestions', enabled: false });
    out.push({ label: 'Add to dictionary', click: () => run({ learn: params.misspelledWord }) });
    out.push({ type: 'separator' });
  }
  if (editable) {
    // The song editor keeps its own undo history (the app's Undo), so it is always offered there
    if (inEditor) {
      out.push({ label: 'Undo', click: () => run({ action: 'editor-undo' }) });
      out.push({ label: 'Redo', click: () => run({ action: 'editor-redo' }) });
    } else {
      out.push({ label: 'Undo', enabled: flags.canUndo !== false, click: () => run({ edit: 'undo' }) });
      out.push({ label: 'Redo', enabled: flags.canRedo !== false, click: () => run({ edit: 'redo' }) });
    }
    out.push({ type: 'separator' });
    out.push({ label: 'Cut', enabled: hasSelection && flags.canCut !== false, click: () => run({ edit: 'cut' }) });
    out.push({ label: 'Copy', enabled: hasSelection && flags.canCopy !== false, click: () => run({ edit: 'copy' }) });
    out.push({ label: 'Paste', enabled: flags.canPaste !== false, click: () => run({ edit: 'paste' }) });
    out.push({ label: 'Select all', click: () => run({ edit: 'selectAll' }) });
  } else if (hasSelection) {
    out.push({ label: 'Copy', click: () => run({ edit: 'copy' }) });
    out.push({ label: 'Select all', click: () => run({ edit: 'selectAll' }) });
  }
  if (inEditor && extras.length) {
    if (out.length) out.push({ type: 'separator' });
    for (const item of extras) {
      if (item.separator) { out.push({ type: 'separator' }); continue; }
      out.push({ label: String(item.label || ''), enabled: item.enabled !== false, click: () => run(item) });
    }
  }
  while (out.length && out[out.length - 1].type === 'separator') out.pop();
  return out;
}

/** Give a window the menu. sendAction(action) runs a menu-bar action in the page. */
function attachContextMenu(win, { Menu, sendAction }) {
  const wc = win.webContents;
  wc.on('context-menu', async (_event, params) => {
    let extras = null;
    try {
      const x = Math.round(Number(params.x) || 0), y = Math.round(Number(params.y) || 0);
      extras = await wc.executeJavaScript(`window.ukemusicContextItems ? window.ukemusicContextItems(${x}, ${y}) : null`, true);
    } catch (_error) {
      extras = null;
    }
    if (win.isDestroyed()) return;
    const run = (item) => {
      // the page's own cut/copy/paste (not menu roles: those go to whichever window has the focus)
      if (item.edit) wc[item.edit]();
      else if (item.replace) wc.replaceMisspelling(item.replace);
      else if (item.learn) wc.session.addWordToSpellCheckerDictionary(item.learn);
      else if (item.action) sendAction(item.action);
      else if (item.id) wc.executeJavaScript(`window.ukemusicContextRun && window.ukemusicContextRun(${JSON.stringify(String(item.id))})`, true).catch(() => {});
    };
    const template = contextTemplate(params, Array.isArray(extras) ? extras : null, run);
    if (template.length) Menu.buildFromTemplate(template).popup({ window: win });
  });
}

module.exports = { contextTemplate, attachContextMenu };
