// Starter songs: three old songs, long out of copyright, added to a new songs folder so a
// new user has something to open, play and copy from. Each shows a little more of how songs
// are written: chords in the words, a strum pattern, sections, 3/4 time and some tab.
// They're added once (config: library.starters_added); deleting them is fine.

const songs = require('./song-library');

const STARTERS = [
  {
    title: 'Oh! Susanna',
    year: 1848,
    credit: 'Stephen Foster, 1848',
    settings: { song: { transpose: 0, tempo: 112, beats_per_bar: 4, key: 'auto', artist: 'Stephen Foster', year: 1848, tags: 'folk, singalong', licence: 'public-domain' } },
    tip: 'Bouncy island strum, about 112 bpm. Three chords: C, F and G7.',
    content: `--START MUSIC--
{D-DU-UDU}
[[Verse 1]]
I [C]come from Alabama with my [G7]banjo on my [C]knee,
I'm [C]goin' to Louisiana, my [G7]true love for to [C]see.
It [C]rained all night the day I left, the [G7]weather it was dry,
The [C]sun so hot I froze to death, Su[G7]sanna, don't you [C]cry.

[[Chorus]]
Oh! Su[F]sanna, oh [C]don't you cry for [G7]me,
For I [C]come from Alabama with my [G7]banjo on my [C]knee.

[[Verse 2]]
I [C]had a dream the other night when [G7]everything was [C]still,
I [C]thought I saw Susanna a-[G7]coming down the [C]hill.
The [C]buckwheat cake was in her mouth, the [G7]tear was in her eye,
Says [C]I, I'm coming from the South, Su[G7]sanna, don't you [C]cry.

[[Chorus]]
Oh! Su[F]sanna, oh [C]don't you cry for [G7]me,
For I [C]come from Alabama with my [G7]banjo on my [C]knee.
--END MUSIC--
`
  },
  {
    title: 'Amazing Grace',
    year: 1779,
    credit: 'Words by John Newton, 1779; tune "New Britain", 1829',
    settings: { song: { transpose: 0, tempo: 84, beats_per_bar: 3, key: 'auto', artist: 'John Newton', year: 1779, tags: 'hymn, waltz', licence: 'public-domain' } },
    tip: 'A slow waltz in 3/4: one strong strum, then two lighter ones. About 84 bpm.',
    content: `--START MUSIC--
{D>DD}
[[Verse 1]]
A[G]mazing [G7]grace, how [C]sweet the [G]sound
That saved a wretch like [D]me.
I [G]once was [G7]lost, but [C]now am [G]found,
Was [Em]blind, but [D7]now I [G]see.

[[Verse 2]]
'Twas [G]grace that [G7]taught my [C]heart to [G]fear,
And grace my fears re[D]lieved;
How [G]precious [G7]did that [C]grace ap[G]pear
The [Em]hour I [D7]first be[G]lieved.

[[Verse 3]]
Through [G]many [G7]dangers, [C]toils and [G]snares,
I have already [D]come;
'Tis [G]grace hath [G7]brought me [C]safe thus [G]far,
And [Em]grace will [D7]lead me [G]home.
--END MUSIC--
`
  },
  {
    title: 'Clementine',
    year: 1884,
    credit: 'American folk song, published 1884',
    settings: { song: { transpose: 0, tempo: 100, beats_per_bar: 3, key: 'auto', artist: 'Percy Montrose', year: 1884, tags: 'folk, waltz, tab', licence: 'public-domain' } },
    tip: 'Starts with the tune as tab: play it, or watch it light up in karaoke. Then a waltz strum in 3/4.',
    content: `--START MUSIC--
[[Intro (the chorus tune)]]
\`\`\`tab
A|---|--------0-0|0---------0|3---3---1-0|--------|
E|1-1|1----------|----1---1--|-----------|3-------|
C|---|----0------|-----------|-----------|--------|
G|---|-----------|-----------|-----------|--------|
\`\`\`

{D-DUDU}
[[Verse 1]]
In a [F]cavern, in a canyon, excavating for a [C]mine,
Dwelt a [C7]miner, forty-niner, and his daughter [F]Clementine.

[[Chorus]]
Oh my [F]darling, oh my darling, oh my darling Clemen[C]tine,
You are [C7]lost and gone forever, dreadful sorry, [F]Clementine.

[[Verse 2]]
Light she [F]was, and like a fairy, and her shoes were number [C]nine,
Herring [C7]boxes, without topses, sandals were for [F]Clementine.

[[Chorus]]
Oh my [F]darling, oh my darling, oh my darling Clemen[C]tine,
You are [C7]lost and gone forever, dreadful sorry, [F]Clementine.
--END MUSIC--
`
  }
];

function starterNotes(starter) {
  return `${starter.title}\n\nStarter song: ${starter.credit}. Out of copyright.\n${starter.tip}\n\n`
    + `How it's written: chords go in square brackets just before the word where they change, `
    + `{D-DU-UDU} sets the strum, and [[Verse 1]] starts a section.\n\n`
    + `History\n${songs.today()}  Added as a starter song\n`;
}

/**
 * Add any starter songs that aren't in the songs folder yet. Returns the titles added.
 * A starter whose folder name is taken (the user has a song of that name) is skipped.
 */
function addStarterSongs(songsFolder) {
  const added = [];
  for (const starter of STARTERS) {
    if (!songs.validateSongTitle(starter.title, songsFolder).ok) continue;
    const song = songs.createSong(songsFolder, starter.title, starter.content, starter.settings);
    songs.writeNotes(song.folder, starterNotes(starter));
    added.push(starter.title);
  }
  return added;
}

/**
 * Starter songs added before they had an artist, year and tags: fill those in (only where
 * the song still has none). Returns the titles updated.
 */
function fillStarterInfo(songsFolder) {
  const updated = [];
  for (const starter of STARTERS) {
    const folder = require('path').join(songsFolder, starter.title);
    if (!songs.findSongFile(folder) || !isStarterNotes(songs.readNotes(folder))) continue;
    const settings = songs.readSongSettings(folder) || {};
    settings.song = settings.song || {};
    let changed = false;
    for (const key of ['artist', 'year', 'tags', 'licence']) {
      if (!settings.song[key]) {
        settings.song[key] = starter.settings.song[key];
        changed = true;
      }
    }
    if (changed) {
      songs.writeSongSettings(folder, settings);
      updated.push(starter.title);
    }
  }
  return updated;
}

/** Is this one of the starter songs (by its notes)? */
function isStarterNotes(notes) {
  return /^Starter song: /m.test(String(notes || ''));
}

module.exports = { STARTERS, addStarterSongs, fillStarterInfo, isStarterNotes };
