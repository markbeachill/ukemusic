// "Songs for the web": every song in the songs folder in one file, which the web version
// (iPhone/iPad) loads with "Update songs". The desktop stays the master copy. Pure: unit tested.
const FORMAT = 'ukemusic-web-songs';

/** The same id the web version uses for a song: "Oh! Susanna" -> "oh-susanna" */
function songId(title) {
  return String(title).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').slice(0, 120) || 'song';
}

/** songs: [{ title, content, settings, notes }] (as song-library.readSong gives) */
function buildWebSongs(songs, { appVersion = '', exported = new Date().toISOString() } = {}) {
  const used = new Set();
  const out = [];
  for (const song of songs) {
    let id = songId(song.title);
    for (let n = 2; used.has(id); n += 1) id = `${songId(song.title)}-${n}`;
    used.add(id);
    const settings = JSON.parse(JSON.stringify(song.settings || {}));
    if (settings.song) delete settings.song.settings_format;
    out.push({ id, title: song.title, text: song.content || '', settings, notes: song.notes || '' });
  }
  out.sort((a, b) => a.title.localeCompare(b.title));
  return { format: FORMAT, version: 1, app: appVersion, exported, songs: out };
}

/** Check a file the web version was given; returns { ok, songs, exported, error } */
function readWebSongs(text) {
  let data;
  try {
    data = typeof text === 'string' ? JSON.parse(text) : text;
  } catch (_err) {
    return { ok: false, error: 'This isn’t a songs file from ukemusic (it couldn’t be read).' };
  }
  if (!data || data.format !== FORMAT || !Array.isArray(data.songs)) {
    return { ok: false, error: 'This isn’t a “Songs for the web” file from the ukemusic desktop app.' };
  }
  const songs = data.songs
    .filter((s) => s && typeof s.title === 'string' && typeof s.text === 'string')
    .map((s) => ({ id: songId(s.id || s.title), title: s.title, text: s.text, settings: s.settings && typeof s.settings === 'object' ? s.settings : {}, notes: typeof s.notes === 'string' ? s.notes : '' }));
  return { ok: true, songs, exported: data.exported || '' };
}

module.exports = { FORMAT, songId, buildWebSongs, readWebSongs };
