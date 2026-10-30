// Shared browser-side behaviour for the desktop and web song workspaces.
(function (root) {
  function createSaveQueue({ read, write, status = () => {} }) {
    let revision = 0, saved = 0, pending = null;
    return {
      get dirty() { return revision !== saved; },
      changed() { revision += 1; status('saving'); },
      flush() {
        if (pending) return pending;
        pending = (async () => {
          while (saved !== revision) {
            const current = revision;
            // Freeze this attempt; typing during a write belongs to the next attempt.
            const snapshot = JSON.parse(JSON.stringify(read()));
            let ok = false;
            try { ok = (await write(snapshot)) !== false; } catch (_error) { /* keep dirty */ }
            if (!ok) { status('failed'); return false; }
            saved = current;
          }
          status('saved');
          return true;
        })().finally(() => { pending = null; });
        return pending;
      }
    };
  }
  function deletionInfo(song, linked) {
    const title = song?.title || 'this song';
    if (linked && song?.cloud?.folder) return {
      label: 'Archive in shared Dropbox',
      note: 'This archives the song in the shared Dropbox folder at the next sync. Other devices and folder members are affected. Restore it from Archived songs in Dropbox or the desktop library.',
      confirm: `Archive “${title}” in the shared Dropbox folder? It will leave this device and move to Archived songs when synced. This affects other devices and folder members.`
    };
    return { label: 'Remove from this device', note: 'Removes this local copy. Export a copy first if you need to keep it; this app has no local trash.', confirm: `Remove “${title}” from this device? Export a copy first if you need to keep it.` };
  }
  function enterOverlay(element) {
    const previous = document.activeElement;
    const changed = [];
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      for (const sibling of node.parentElement?.children || []) {
        if (sibling !== node && !['SCRIPT', 'STYLE', 'LINK'].includes(sibling.tagName)) {
          changed.push([sibling, sibling.inert]); sibling.inert = true;
        }
      }
    }
    element.setAttribute('aria-modal', 'true'); element.setAttribute('tabindex', '-1');
    const visible = () => [...element.querySelectorAll('button, a[href], input, select, summary, [tabindex="0"]')].filter((el) => !el.disabled && el.getClientRects().length);
    const trap = (event) => {
      if (event.key !== 'Tab' || document.querySelector('dialog[open]')) return;
      const items = visible(); const first = items[0], last = items[items.length - 1];
      if (!items.length) { event.preventDefault(); element.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === element)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    element.addEventListener('keydown', trap);
    (visible()[0] || element).focus();
    return () => {
      element.removeEventListener('keydown', trap);
      for (const [el, inert] of changed.reverse()) el.inert = inert;
      if (previous?.isConnected) previous.focus();
    };
  }
  function updateTransport(player) {
    const label = player.playing ? (player.paused ? 'Resume' : 'Pause') : 'Play';
    for (const id of ['playButton', 'quickPlay', 'pickPlayButton', 'karaokePlay', 'playBtn']) {
      const button = document.getElementById(id);
      if (button) { button.textContent = label; button.disabled = false; }
    }
    for (const id of ['quickStop', 'stopButton', 'pickStopButton', 'karaokeStop']) {
      const button = document.getElementById(id);
      if (button) button.disabled = !player.playing;
    }
  }
  const api = { createSaveQueue, deletionInfo, enterOverlay, updateTransport };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.UkeSongUI = api;
})(typeof window !== 'undefined' ? window : globalThis);
