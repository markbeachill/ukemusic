# ukemusic — AI Context Handover Document

**Version:** 4.44.0 (sections 1–15 describe 2.12; the version table in §15 has everything since)  
**Date:** 2026-10-07  
**Purpose:** Complete project context for continuing development in a new AI session

---

## 1. What This Project Is

**ukemusic** is an Electron desktop application that converts annotated song lyrics into formatted chord sheets for ukulele performance, editing, and publishing.

The user types annotated text like:

```
[[Verse 1]]
{D-DU-UDU}
[C]Clementine, []lost and gone [G]forever
[Am]Dreadful [F]sorry
```

…and the app renders a live-previewed, formatted chord sheet with chords aligned above lyrics, rhythm patterns, structural headings, fingering diagrams, and tablature.

---

## 2. Architecture

### Three-Layer Pipeline

```
Source Text → Parser → IR (Intermediate Representation) → Renderer → Output
```

1. **Parser** (`src/parser.js`): Pure function. Takes a string, returns an array of IR nodes.
2. **Renderers**: Pure functions. Take IR nodes, return formatted output.
   - `src/renderer-html.js` → HTML string
   - `src/renderer-markdown.js` → Markdown string
3. **Transpose** (`src/transpose.js`): Transforms IR nodes by shifting chord roots. Applied between parse and render.

All three layers have **zero Electron dependencies** — they work standalone with Node.js.

### IR Node Format

Every node has the shape:
```javascript
{ type, content, line, offset (nullable), warnings[] }
```

Node types:
- `chord` — e.g. content: "Am7", offset: position in lyric text
- `lyric` — plain text between annotations
- `structure` — section labels like "Verse 1", "Chorus"
- `bar` — bar marker (empty content), offset: position in lyric text
- `rhythm` — strumming pattern text
- `tab` — multi-line tablature (entire block as single node)
- `linebreak` — line boundary marker

### Five Annotation Types

| Syntax | Type | Example |
|--------|------|---------|
| `[chord]` | Chord | `[C]`, `[Am7]`, `[F#m]`, `[Bb/D]` |
| `[[label]]` | Structure | `[[Verse 1]]`, `[[Chorus]]` |
| `[]` | Bar marker | `[]` (new bar, no chord change) |
| `{pattern}` | Rhythm | `{D-DU-UDU}`, `{↓ ↓ ↑ ↑ ↓ ↑}` |
| `` ```tab ``` `` | Tablature | Multi-line block |

Chord regex: `[A-G][#b]?(m|maj|min|dim|aug|sus|add|dom|7|9|11|13|6|5|2|4|/[A-G][#b]?)*`

---

## 3. File Inventory

### Root Files

| File | Lines | Purpose |
|------|-------|---------|
| `package.json` | 97 | v2.6.0. Electron ^41.0.2, ini ^6.0.0, CodeMirror 6 deps. electron-builder config with platform targets. |
| `main.js` | 455 | Electron main process. IPC handlers, menus, config management, window state. |
| `index.html` | ~5200 | Single-page app. Library home screen, app bar + ribbon tabs, editor (CodeMirror) + preview iframe, settings panel, dialogs, karaoke. All UI in one file. |
| `preload.js` | 1 | Delegates to `src/preload.js` |
| `CHANGELOG.md` | 46 | Version history |
| `README.md` | 71 | Setup and build instructions |
| `.gitignore` | — | node_modules, dist, out |

### src/ Directory

| File | Lines | Purpose |
|------|-------|---------|
| `parser.js` | 184 | Input text → IR nodes. Handles delimiters, all 5 annotation types. Pure function. |
| `renderer-html.js` | 443 | IR → HTML. Monospace alignment via `renderAlignedLines()`. Table layout via `renderGroupAsTable()`. Diagram integration. |
| `renderer-markdown.js` | 233 | IR → Markdown. Has its own `renderAlignedLines()` matching the HTML version's logic. |
| `transpose.js` | 72 | Chord transposition. `transposeChord()`, `transposeIR()`. Handles sharps/flats/slash chords. |
| `diagram-svg.js` | 102 | Chord definition → inline SVG string. CSS-themed via custom properties. |
| `chord-library.js` | 88 | Loads built-in chords.json, merges with user's override file from config directory. |
| `chords.json` | 36 | 27+ chord definitions: C, Cm, C7, D, Dm, D7, E, Em, E7, F, Fm, F7, G, Gm, G7, A, Am, A7, B, Bm, B7, Bb, Eb, Ab, Db, F#m, C#m, G#m. Format: `{ frets, fingers, barre, base_fret }` |
| `default-style.css` | 145 | CSS with custom properties. Light/dark themes. Monospace and proportional font variables. |
| `resource-paths.js` | 55 | Resolves bundled resource paths for dev vs production (asar). `isPackaged()` helper. |
| `ini-utils.js` | 73 | INI file read/write helpers using the `ini` npm package. |
| `codemirror-ukemusic.js` | 350 | CodeMirror 6 custom language mode. Highlights chords, structure, rhythm, bar markers, tab blocks, delimiters. |
| `preload.js` | 127 | contextBridge API. Exposes IPC channels: file ops, config, stylesheet, chord library, editor methods. |

### test/ Directory (40 tests total)

| File | Tests | What it covers |
|------|-------|---------------|
| `parser.test.js` | 9 | Chord parsing, structure, bars, rhythm, tabs, delimiters, warnings, blank lines, full song |
| `renderer-html.test.js` | 11 | Chord+lyric alignment, structure headings, rhythm, tabs, bars, multi-section songs, alignment tests |
| `renderer-markdown.test.js` | 7 | Same coverage as HTML but for Markdown output |
| `diagram-svg.test.js` | 4 | SVG generation: dot count, open/muted indicators, barre rendering |
| `transpose.test.js` | 9 | Sharp/flat transposition, slash chords, edge cases |

### build/ Directory

App icons in SVG, PNG, ICO, and ICNS formats.

---

## 4. The Alignment Algorithm

This is the most complex and bug-prone part of the codebase. Both renderers have a `renderAlignedLines()` function.

### The Problem

Chords sit above lyrics at the character position where the annotation appeared. But chord names vary in width (G vs G#m7) — a 4-character chord name over a 1-character lyric position pushes everything after it rightward unless the lyric line is padded to match.

### The Solution (3-pass algorithm in `renderAlignedLines`)

**Pass 1 — Calculate adjusted offsets:**
- Collect all chord and bar nodes, sorted by their `offset`
- Walk through them maintaining a `chordCursor` (how far the chord line extends)
- If a chord's original offset falls inside the previous chord's width, push it rightward
- Enforce `MIN_GAP = 1` between consecutive chords
- Bar markers take width 1

**Pass 2 — Build padded lyric string:**
- Calculate how many spaces each chord/bar insertion needs in the lyric line
- Bar markers always insert 1 space (to match the `|` character in the chord line)
- Shifted chords insert spaces equal to the shift amount
- Apply insertions right-to-left to preserve positions

**Pass 3 — Build chord HTML:**
- Walk through items using `adjustedOffset` values
- Insert `&nbsp;` spacing between chords
- Wrap each chord in `<span class="chord">`
- Bar markers become `<span class="bar">|</span>`

### Critical CSS Requirement

For alignment to work, chords and lyrics **must** use the same monospace font at the same size. This is enforced by:
- Both `.chords` and `.lyrics` use `var(--monospace-font)` and `var(--monospace-size)`
- The settings UI updates `--monospace-font` and `--monospace-size` which affect both simultaneously
- Table layout uses `--font-family` (proportional) instead, since alignment is by table cells

---

## 5. CSS Architecture

### Custom Properties (defined in `default-style.css`)

```css
:root {
  --bg-color: #ffffff;
  --text-color: #333333;
  --chord-color: #b22222;
  --rhythm-color: #666666;
  --section-color: #1a5276;
  --monospace-font: "Courier New", monospace;   /* chords, lyrics, tab, rhythm */
  --monospace-size: 14px;                        /* shared size for alignment */
  --font-family: system-ui, -apple-system, sans-serif;  /* headings, table layout */
  --rhythm-size: 12px;
  --line-spacing: 1.4;
  --section-spacing: 1.5em;
  --verse-spacing: 1em;
}
```

### Font Split (IMPORTANT)

Two separate font stacks serve different purposes:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `--monospace-font` | `.chords`, `.lyrics`, `.tab`, `.rhythm` | Alignment-critical elements. Must be monospace for character-counting to work. |
| `--font-family` | `.section`, `body`, `.chord-table` | Proportional elements where alignment doesn't matter. |

### Theme System

Three modes controlled by `data-theme` attribute on the preview root:
- `data-theme="light"` — uses `:root` defaults
- `data-theme="dark"` — uses `[data-theme="dark"]` overrides
- `data-theme="auto"` — uses `@media (prefers-color-scheme: dark)` nested inside `[data-theme="auto"]`

---

## 6. Configuration

### Split Config Model

- **INI file** (`config.ini`): Controls behaviour — what the parser and renderer do
- **CSS file** (`style.css`): Controls appearance — colours, fonts, sizes

Both live in the platform config directory:
- Linux: `~/.config/ukemusic/`
- macOS: `~/Library/Application Support/ukemusic/`
- Windows: `%APPDATA%\ukemusic\`

### INI Structure (DEFAULT_CONFIG in main.js)

```ini
[general]
theme = auto

[parsing]
use_delimiters = true

[rhythm]
enable = true
placement = above_chords
align = false
notation = raw                ; 'raw' or 'arrows' (D→↓ U→↑ X→✕)

[export]
default_format = html
include_stylesheet = true
markdown_rhythm_style = italic  ; 'plain', 'italic', or 'bold'
layout = lines                  ; 'lines' (monospace) or 'table'

[diagrams]
enable = true
placement = song_start         ; 'none', 'song_start', or 'first_use'
max_per_row = 5
show_fingers = true
fallback = placeholder          ; 'omit', 'placeholder', or 'text_only'

[tablature]
enable = true
```

### Config → Behaviour Mapping

- `use_delimiters = false` → parser ignores `--START/END MUSIC--` markers
- `rhythm.enable = false` → `{}` treated as literal text
- `tablature.enable = false` → `` ```tab ``` `` treated as literal text
- `rhythm.notation = arrows` → renderer converts D→↓, U→↑, X→✕ at render time
- `export.layout = table` → renders chord+lyric pairs in HTML table cells (proportional font)
- `diagrams.placement` → controls where SVG fingering diagrams appear

---

## 7. Electron Architecture

### Process Model

```
Main Process (main.js)
  ├── BrowserWindow (context isolation ON)
  │     ├── Preload (src/preload.js via contextBridge)
  │     └── Renderer (index.html)
  │           ├── CodeMirror 6 editor (left panel)
  │           ├── Preview iframe (right panel)
  │           ├── Settings slide-out panel
  │           └── Toolbar (New, Open, Save, Save As, Export HTML, Export MD, Transpose ±)
  └── IPC Handlers
        ├── File I/O: fileNew, fileOpen, fileSave, fileSaveAs
        ├── Export: exportHTML, exportMarkdown
        ├── Config: configRead, configWrite
        ├── Stylesheet: stylesheetRead, stylesheetWrite
        ├── Chord Library: loadChordLibrary
        └── System: getConfigPath, openExternal
```

### Menu Bar

- **File:** New, Open, Save, Save As, —, Export HTML, Export Markdown, —, Print, —, Quit
- **Edit:** Undo, Redo, Cut, Copy, Paste
- **View:** Toggle Settings Panel, Zoom In, Zoom Out, Reset Zoom
- **Help:** About

### Render Pipeline (in index.html)

On every keystroke (debounced 300ms):
1. Get source text from CodeMirror
2. `parseSong(text, options)` → IR nodes
3. `transposeIR(nodes, semitones)` → transposed IR nodes (if transpose ≠ 0)
4. `renderHTML(nodes, options)` → HTML string
5. Inject HTML + stylesheet into preview iframe
6. Update status bar with cursor position and warnings

### Unsaved Changes

- Dirty state tracked: content changed since last save
- On New/Open/Close with dirty state: Save/Discard/Cancel dialog
- Close handler wraps IPC in try/catch, uses `mainWindow.destroy()` for Discard

---

## 8. Features

### Transpose (v2.6.0)

- Toolbar +/- buttons shift all chords by semitones (-11 to +11)
- Handles sharps (positive transposition) and flats (negative)
- Correctly handles slash chords (Am/G → Bbm/Ab at +1)
- **Preview-only** — does not modify source text
- Applied to HTML export (exports what you see)

### Strum Notation Conversion (v2.6.0)

- `rhythm.notation` config: `raw` (as typed) or `arrows`
- When `arrows`: D→↓, U→↑, X→✕ mapping applied at render time
- Dropdown in Settings panel under Rhythm section

### Two Layout Modes (v2.6.0)

- **Monospace (lines):** Character-counted alignment. Chords positioned by offset. Requires monospace font.
- **Table:** Each chord+lyric pair in its own table cell. Uses proportional font. No character-counting needed.

### Fingering Diagrams

- Built-in chord library (27+ chords, GCEA tuning)
- User override via `chords.json` in config directory (user entries take precedence)
- SVG generated at render time, CSS-themed
- Three placement modes: none, song_start, first_use
- Fallback for unknown chords: omit, placeholder (empty grid), text_only (name in box)

### Syntax Highlighting (CodeMirror 6)

- Custom language mode: `src/codemirror-ukemusic.js`
- Highlights: chords (red), structure (blue), rhythm (grey), bar markers (muted), tab blocks (distinct bg), delimiters (muted)
- Theme-aware (light/dark)

---

## 9. Build & Package

### Development

```bash
npm install
npm test           # 40 tests across 5 files
npm start          # Launch Electron in dev mode
```

### Production Build

```bash
npm run build              # Unpacked (test production paths)
npm run package            # All platforms
npm run package:win        # Windows NSIS installer
npm run package:mac        # macOS DMG
npm run package:linux      # Linux AppImage
```

Output goes to `dist/`.

### electron-builder Config

- `asar: true` — app code packed into asar archive
- `extraResources` — chords.json, default-style.css, icon.png copied alongside asar
- `src/resource-paths.js` resolves bundled vs development paths using `isPackaged()` helper

---

## 10. Bugs Fixed (History)

These are documented here so future development doesn't re-introduce them:

1. **Chord alignment drift** — Long chord names (Am7, G#m) pushed subsequent chords rightward without matching lyric padding. Fixed by unified `renderAlignedLines()` that builds both lines together.

2. **Font size mismatch** — `--chord-size: 13px` vs `--font-size: 14px` caused progressive drift in monospace alignment. Fixed by consolidating to single `--monospace-size: 14px`.

3. **Bar marker alignment** — `[]` bar markers inserted `|` in chord line with no matching space in lyric line. Fixed by inserting 1 space per bar marker in the padded lyric string.

4. **Bar marker CSS padding** — `.bar { padding: 0 0.1em; }` added sub-pixel width. Removed.

5. **Splitter sticking** — `minmax(280px, 1fr)` for right column prevented rightward resize. Changed to `1fr`. Added `preventDefault` on mousedown and `userSelect: none` during drag.

6. **Close error** — IPC to a destroying window threw. Wrapped in try/catch, use `mainWindow.destroy()` for Discard.

7. **Line height inconsistency** — `.chords` and `.rhythm` missing `line-height: var(--line-spacing)`. Added.

8. **Markdown renderer variable name** — After refactoring loop variable from `adj` to `item`, stale `adj.node` references caused crashes. Updated to `item.node`.

---

## 11. Known Issues / Post-Upgrade Notes

1. **Delete existing style.css after upgrading.** Old stylesheets have `--font-size` and `--chord-size` instead of the new `--monospace-size`. The app recreates `style.css` with correct variables on next launch if the file is missing.

2. **Markdown export has no colour.** Markdown is plain text — chords can't carry colour. This is a format limitation. Use HTML export for coloured output.

3. **Electron version.** Currently targets ^41.0.2. Check for newer stable versions when building.

---

## 12. Pending Feature: Playback (Not Yet Built)

A full specification addendum (Appendix D for v2.6) was written but **not implemented**. Key points:

- **Web Audio API** based playback engine
- Transport controls: Play, Pause, Stop, tempo slider (40-240 BPM)
- Metronome tick with optional audible click
- Chord playback: basic strum synthesis using OscillatorNode
- Follows bar markers and rhythm patterns from the IR
- Karaoke-style highlight: current chord/lyric highlighted during playback
- BPM configurable per song or globally via INI
- Proposed INI section:
  ```ini
  [playback]
  enable = true
  bpm = 120
  metronome = true
  auto_scroll = true
  ```

This is a significant feature. If implementing, it should be its own phase.

---

## 13. Specification Documents

Three specification documents exist:

1. **v2.4** — Original spec. Defines input syntax, 4 annotation types (chord, structure, bar, rhythm), rendering rules, INI configuration.
2. **v2.5 Addendum** — Adds fingering diagram support (section 12) and tablature support (section 13). Defines chord library format, SVG/PNG generation, placement modes, tab block parsing.
3. **v2.6 Spec** — Unified spec incorporating all features through v2.6.0. Generated as a Word document using `build_spec.js` (docx npm package).

The build prompts document (`ukemusic_build_prompts.md`) contains the 8-phase build plan originally used to construct the app.

---

## 14. Test Song for Verification

Use this to test all features:

```
--START MUSIC--
[[Intro]]
` ``tab
A|--3---3---3---
E|--0---0---0---
C|--0---0---0---
G|--0---0---0---
` ``

[[Verse 1]]
{D-DU-UDU}
[C]Clementine, []lost and gone [G]forever
[Am]Dreadful [F]sorry

[[Chorus]]
{↓ ↓ ↑ ↑ ↓ ↑}
[F]Lost and gone for[G]ever
--END MUSIC--
```

(Note: remove the space in `` ` `` `` ` `` tab — it's escaped here to prevent markdown parsing.)

---

## 14a. Song Library (v2.7.0)

### Folder layout

```
<songs folder>/                      ← config.ini [library] songs_folder
  Somewhere Over the Rainbow/        ← folder name = song title
    Somewhere Over the Rainbow-song.txt   ← the song (found by the "-song.txt" suffix)
    song.ini                         ← per-song settings
    exports/
      Somewhere Over the Rainbow.html
      Somewhere Over the Rainbow (baritone, +2).md
```

### Code

- `src/song-library.js` — pure Node (testable): `validateSongTitle`, `createSong`, `listSongs`, `readSong`, `saveSong`, `readSongSettings`/`writeSongSettings`, `pickSongSettings`, `exportFileName`, `writeExport`, `suggestTitleFromFile`. `SONG_SETTING_PATHS` defines which settings are per-song.
- Main-process IPC: `library:chooseFolder`, `library:folderExists`, `songs:list`, `song:validateTitle`, `song:create`, `song:open`, `song:save`, `song:writeSettings`, `song:export`, `song:openExports`, `file:import`. The old dialog-based `file:new/save/saveAs` and `export:html/markdown` were removed.
- Renderer (`index.html`): `state.song` (null = unsaved scratch document), `state.songSettings` (song.ini), `effectiveConfig()` = general config with song settings on top. Settings controls whose path is in `SONG_SETTING_PATHS` write to song.ini when a song is open, otherwise to config.ini (as defaults for new songs). The renderer is the only writer of config.ini (including `library.*`), to avoid stale overwrites.
- Title rules: not empty, not starting with "untitled", no `< > : " / \ | ? *`, not a Windows reserved name, ≤100 chars, not "exports", no existing folder with the same name ignoring case.

### Per-song settings (song.ini)

Changed in v2.13: see 14g. song.ini holds facts plus explicit overrides only (`settings_format = 2`).

### Baritone

`src/chords-baritone.json` (DGBE). `loadChordLibrary(configDir, instrument)` picks `chords.json` or `chords-baritone.json` (built-in, overridden by the same file name in the config folder). Both libraries are verified note-by-note by `test/chord-library.test.js`.

### Testing note

v2.7.0 was checked end-to-end by driving the real Electron app with Playwright (37 checks: create/validate/save/open/save-as-new/settings/exports/relaunch). That harness lives outside the repo; the unit tests run with `npm test` (57 tests).

## 14b. Versions, Notes, Lyrics, PDF, Playback (v2.8.0)

### New modules (all pure Node, unit tested)

| File | Purpose |
|------|---------|
| `src/versions.js` | Transposed versions: `makeVersion(from,to)`, `parseVersions`/`formatVersions` (song.ini string `5:C:F,-2:G:F`), `versionFolder`, `targetOptions` (11 keys with chord maps + harder/no-diagram hints), `HARDER_CHORDS` per instrument. |
| `src/renderer-lyrics.js` | `renderLyricsText`, `renderLyricsHtml`, `LYRICS_CSS`. Drops chords/strums/tabs/chord-only lines; joins words split by chords. |
| `src/playback-schedule.js` | `buildSchedule(ir, {library, instrument, tempo, beatsPerBar, countIn, startLine})` → timed strum/chuck/click events + bars (with source line). `parsePattern`, `voiceChord` (diagram fingering → MIDI; fallback voicing from chord name). |
| `src/playback-audio.js` | Browser script (loaded by index.html, not via preload): `window.UkePlayer` — Karplus–Strong pluck with all-pass tuning, look-ahead scheduler, `play(schedule, {onBar, onEnd})`, `stop()`, `renderOffline(schedule)`. |

### Changes to existing modules

- `transpose.js`: `{ spelling: 'common' }` option (Bb, Eb, Ab, Db, F#; minors C#m, F#m, G#m, Ebm, Bbm). `semitonesBetween`, `nearestShift`. The app always transposes with common spelling.
- `chord-library.js`: `getChordDefinition` tries the enharmonic root and then drops a slash bass.
- `renderer-html.js`: every `[[Section]]` opens `<section class="song-section">`; every other line is wrapped in `<div class="line-group" data-line="N">` (source line; used for print page-breaks and the playback highlight).
- `song-library.js`: `notes.txt` (`readNotes`, `writeNotes`, `appendNoteLine`), `writeExport(folder, fileName, content, subfolder)` accepts binary (PDF). New per-song settings: `song.tempo`, `song.beats_per_bar`, `versions.list`.
- `codemirror-ukemusic.js`: decorations collected per line and sorted (fixes the highlighter crash).
- `main.js`: `song:exportPdf` (hidden window + `printToPDF`, header/footer templates), `song:writeNotes`, `song:appendNote`; Playback menu (F5 / Shift+F5); File → Export… (Ctrl+E).

### Export layout

```
exports/
  Original/            Title.pdf  Title.html  Title.md
  C to F (+5)/         Title (+5).pdf …           (baritone adds "(baritone, +5)")
  Lyrics/              Title (lyrics).pdf  .txt  .html
```

### Playback timing rules

One chord = one bar = one pass of the current `{pattern}`; `[]` = another bar of the same chord; patterns persist until changed; "D D U U D U" (no rests) is read as D-DU-UDU. Default patterns: 4/4 `D-DU-UDU`, 3/4 `D-DUDU`.

### Testing

`npm test` — 87 unit tests. v2.8.0 was also driven end-to-end in the real Electron app with Playwright (54 checks, including PDF page-break verification with pdfplumber and an offline audio render checked for level and pitch). That harness is not in the repo.

## 14c. Chord-sheet conversion (v2.9.0)

`src/chord-sheet.js` (pure, unit tested):
- `analyseLine(line)` → `{ isChordLine, chords: [{ name, column }] }`. A chord line has ≥1 proper chord and no ordinary words; bar lines, repeat marks, N.C. and punctuation-only tokens are allowed; lower-case chords are accepted alongside proper ones; run-together chords ("FC", "G7C") are split.
- `convertChordSheet(text)` → `{ text, report: { merged, estimated[], instrumental, headings, cleaned } }`. Chord line + following lyric line are merged: by column if spacing was kept (any gap ≥2 spaces, or the chord line spans ≥70% of the lyric), otherwise spread first-to-last word and listed in `estimated` (1-based line numbers in the output). Section labels → `[[Heading]]`. Existing annotations, delimiters, patterns and tab blocks are untouched.
- `findChordLines(text, { useDelimiters })` → line numbers, used for the status-bar warning.

UI (`index.html`): `openConvertDialog({ mode: 'paste' | 'convert' | 'import', text })`, `pasteChordSheet()`, `convertCurrentSong()`. `setNotice()` keeps a status message until the next user edit (`setEditorProgrammatically()` doesn't clear it).

## 14d. Chord library (v2.10.0)

- `src/chords.json` / `src/chords-baritone.json` are **generated** — don't hand-edit them. Edit `tools/hand-checked/{soprano,baritone}.json` (shapes that always win) and run `npm run build:chords` (needs the `@tombatossals/chords-db` dev dependency installed).
- The build converts chords-db positions (frets relative to `baseFret`) to absolute frets, renames `b13b9`/`b13#9` to `7b9b13`/`7#9b13` (a leading "b" would read as a flat root), derives baritone from ukulele shapes 5 semitones up, validates notes (`definingIntervals`), picks the easiest, and may substitute a generated shape near the nut.
- `src/chord-names.js`: `CHORD_INNER_PATTERN`/`CHORD_RE` (used by parser, CodeMirror mode, chord-sheet converter), `SUFFIX_INTERVALS`, `SUFFIX_ALIASES`, `parseChordName`, `chordPitchClasses`.
- `chord-library.getChordDefinition` tries: as written → usual type name → other root spelling → without slash bass.
- Users can still add or override chords with `chords.json` / `chords-baritone.json` in the config folder.

## 14e. Keys and ChordPro (v2.11.0)

- `src/keys.js`: `detectKey(chordNames)` (scores the 12 major keys by diatonic fit, weighting first/last chords; picks the relative minor when the song starts or ends on it), `parseKey`, `transposeKey`, `spellInKey` (spell by scale step from the key note; null for Cb/Fb/E#/B#/double accidentals), `transposeChordInKey(name, semitones, fromKey, fallback)`.
- `transposeIR(..., { spelling: 'key', key })` uses it, falling back to `'common'`. The renderer's `transposeOptions()` passes `songKey()` = Settings `song.key` or the detected key. Versions (`targetOptions`, `versionFromShift`) take the key too.
- Note: the `ini` package writes `#` as `\#` (it's a comment character in INI), so song.ini shows `key = C\#m`; it reads back as `C#m`.
- `src/chordpro.js`: `looksLikeChordPro`, `chordProToUkemusic(text) → { text, meta, report }`, `ukemusicToChordPro(ir, info)`. Strum patterns travel as `{comment: Strum …}` (also accepts `{x_ukemusic_strum: …}`).
- Renderer: the convert dialog auto-detects ChordPro; `applyImportedMeta(meta)` sets key/tempo/time and adds notes (kept in `state.pendingImport` until a new song is saved).
- Tonal was considered and not added: chord names were already handled by `chord-names.js`, key spelling is small, and avoiding the dependency keeps installs unchanged.

## 14f. Print styles (v2.12.0)

- Renderer (`index.html`): `stageCss()` (all-black, bold, `--monospace-font` = Settings stage font + fallbacks, size = stage size) is appended after the user's stylesheet for stage exports. `maxLineChars(printStyle)` measures the monospace font's character width on a canvas and fits it to the printable width (page minus 0.6" margins at 96 px/in); passed to `renderHTML` as `maxLineChars` for PDFs and stage HTML (not table layout).
- `src/line-wrap.js`: `wrapLines(ir, maxChars)` — splits lyric lines at the space (prefer after punctuation) nearest the middle where both parts fit; chords keep their words; continuation indent 2; chords-only lines chunked. `renderHtml` calls it when `options.maxLineChars` is set.
- Main: `song:exportPdf` takes `printStyle` (stage = black bold header/footer).
- Settings: `export.print_style` (remembered from the dialog), `export.stage_font`, `export.stage_size`.
- `showToast(message, { detail, action, onAction, error, busy })` for transient messages.

## 14g. Defaults vs song settings, inline labels (v2.13.0)

### What overrides what (lowest → highest)

| Level | Where it is stored | What it covers |
|---|---|---|
| 1. Built-in defaults | `DEFAULT_CONFIG` in main.js / renderer | Everything, used when nothing else is set |
| 2. Global defaults ("All songs") | `config.ini` (renderer writes it); `style.css` for Standard fonts and colours; `export.stage_font` / `stage_size` for Stage | Every song that has not been given a custom value |
| 3. Song custom ("This song", "Use default" unticked) | `song.ini` in the song folder | Only the settings listed in `SONG_OVERRIDE_PATHS`: `song.instrument`, `export.layout`, `export.markdown_rhythm_style`, `rhythm.notation`, `diagrams.enable`, `diagrams.placement`, `font.family`, `font.size`, `font.bold`, `playback.default_strum`, `playback.custom_strum` |
| 4. Print style chosen at export | Export dialog (`export.print_style` remembers the last choice) | Stage forces all-black and bold. It uses the stage font unless the song has a custom font, which wins in both styles |

- **Song facts** are always per song and are never defaults: `song.transpose`, `song.tempo`, `song.beats_per_bar`, `song.key`, `versions.list` (`SONG_FACT_PATHS`). New songs get transpose 0, the global tempo and time, and key auto.
- Ribbon (This song tab) instrument, tempo and time (`data-scope="song"`) change the open song, or the global default when no song is open.
- `effectiveConfig()` is a deep merge of global config plus song.ini. Removing an override uses `deletePath` (empty INI sections are tidied away).
- CSS order in the preview and exports: user stylesheet → `stageCss()` (Stage only) → `songFontCss()` (song custom font only).
- Migration: `readSongSettings` reports `song.settings_format` (1 if missing). `upgradeSongSettings()` (renderer, on `loadSong`) drops values equal to the global defaults, keeps the rest as overrides, writes format 2 and adds a history note.

### Inline labels
- `[[X]]` followed by content on the same line is an inline label; on its own line it is a heading. There is no automatic conversion between the two and no auto-numbering. The one exception: ChordPro import numbers unlabelled `{sov}` verses by position.
- HTML: `splitInlineLabel` / `addInlineLabel` in renderer-html.js. The label is a `<strong class="inline-label">` at the start of the lyric line, and the chord line is padded by the same width. On chords-only lines the label sits on the chord line. In table layout it gets an extra cell.
- Markdown: `withInlineLabel`. Lyrics: the label is kept and chords-only lines are dropped. ChordPro: `[*Label]` both ways. Chord-sheet converter: `Intro: Am F D` → `[[Intro:]] [Am] [F] [D]`.

## 14h. Playback strum defaults and sound (v2.14.0)
- `playback-schedule.js`: `defaultPattern(beats, style, custom)`, where style is simple (`D>DDD`), island (`DEFAULT_PATTERNS`) or custom (falls back to simple when the custom pattern is empty or unusable). `buildSchedule` options: `defaultStrum`, `customStrum`.
- Accents: `parsePattern` keeps `>`, and `patternSteps` turns the pattern into `{stroke, accent}` steps. If a bar has any accent, accented strokes get velocity 1 and the others 0.6 × their usual level; otherwise the first stroke is 1, as before. Strum events carry `accent`.
- `playback-audio.js`: `UkePlayer.setSound('standard'|'hollow')`. Hollow adds peaking filters at 220/480/1100 Hz, a −4 dB high shelf, a 0.12 s convolver "body" impulse at 30% wet, a smoother excitation, extra decay and a wider strum spread. The pluck cache is keyed by sound and note.
- Config: `playback.default_strum` (simple), `playback.custom_strum` (D>-DU-UDU), `playback.sound` (standard; global only).

## 14i. Karaoke view (v2.15.0)
- `src/karaoke.js`: `buildKaraoke(ir, schedule, { startLine })` returns lines (`heading` | `words` with pieces `{chord, text, start, end}`). It mirrors `buildSchedule`'s slots (one per chord, plus one per `[]` while a chord is playing), applies the same startLine filter, and zips them with `schedule.bars`. Each chord unit's time is split across its pieces by text length (minimum weight 2). Chordless pieces (pickups, chordless lines) join the previous unit. `pieceProgress(piece, t)` gives 0..1.
- `index.html`: the `#karaoke` overlay (fixed, full window). `playSong({ karaoke: true })` calls `karaokeStart(ir, schedule, startLine)`, and the `karaokeTick` rAF loop reads `player.position()` (the schedule clock, count-in included). The current line is scrolled to 35% of the height. Text size is `playback.karaoke_size` (16–48, default 26).
- ChordPro import: `applyImportedMeta` no longer sets `song.tempo`; tempo goes into the notes line.

## 14j. Settings layout, strum strip, notes on close (v2.16.0)
- Settings (`#settingsPanel`) is now fixed full-window, with a sticky header (title, tabs, Close). `#settingsNav` is built from the visible pane's `.settings-group` h3s (`buildSettingsNav`); `updateSettingsScroll` highlights the current section and shows `#settingsTop`; Esc closes. Group ids are `set-*`. Standard print colours: `#style-text-color` / `#style-chord-color` / `#styleBlackButton` write `--text-color` / `--chord-color` in the stylesheet's first `:root`.
- The UI no longer shows the dead settings (`rhythm.placement`, `rhythm.align`, `diagrams.max_per_row`, `export.default_format`); they are still in DEFAULT_CONFIG, harmless.
- Schedule bars carry `pattern`. Karaoke `updateStrip(t, schedule)` draws the count-in beats, then the current bar's steps (from `bar.pattern`, `>` = accent, beat numbers with "&" for 8ths) and lights `floor((t - bar.time) / stepLength)`.
- Notes pending: the renderer reports `setNotesPending` (IPC `editor:setNotesPending`). `handleWindowClose` sends `flush-and-close` when notes are pending (also after Discard). `confirmLoseChanges` flushes notes first.

## 14k. Tablature model (v2.17.0, karaoke note cursor v2.18.0)

Full description: **TABLATURE.md**. Karaoke tab lines carry `steps: [{ time, pitches, marks: [{ row, col, len }] }]`; `karaokeRender` wraps each note in a `.k-mark` span, and `karaokeTick` lights the current step and shows its pitches in the strip (`updateStrip` leaves tab bars to it).

- The song text stays the master copy (```tab blocks); `src/tab.js` reads it into a model whenever needed:
  - `parseTab(text, { instrument, firstLine })` returns `{ systems, items, notes, warnings }`.
  - Each note is `{ system, column, string, line, label, fret, text, technique, midi, pitch }`, where column is the character position.
  - String names pick the tuning (`TUNINGS`: soprano A E C G, baritone E B G D, guitar e B G D A E). Partial systems map by name.
- Other functions:
  - `writeTab`
  - `tidyTab` (capitalise names, add missing strings, even up lengths and closing bars)
  - `transposeTab` (same string if fret 0–15, else the lowest-fret string, else an octave shift; widens columns for two-digit frets)
  - `wrapTab` (split at bar lines common to all strings)
  - `tabTiming` (the median note gap = half a beat, gaps scaled and rounded to quarter beats)
  - `tabBars`
  - `findTabRuns` / `isStringLine` (strict for paste detection, lenient inside blocks)
- Wiring:
  - parser (tab warnings);
  - `transposeIR` (tab nodes, needs `options.instrument`; `tab: false` skips);
  - renderer-html (`renderTabHtml`: `.tab-string` / `.tab-fret`, `wrapTab` when `maxLineChars`);
  - chord-sheet (`fenceRawTab`; report `tabs`, `tabLegends`, `tabWarnings`);
  - playback-schedule (a tab slot plus hold slots; picked events `tabNote`, notes indexed in diagram order);
  - karaoke (`kind: 'tab'` line; bar count via `tabBars`, kept identical to the schedule);
  - codemirror-ukemusic (`createTabOvertype`: inputHandler plus Backspace inside ```tab string lines);
  - index.html (`insertTabBlock`, base `.tab-fret` CSS in `buildPreviewDocument`, stage overrides).

## 14l. Instruments, capo, strum library (v3.0.0)
Full description: **INSTRUMENTS.md** (users and developers).

- `src/instruments.js` holds the profiles:
  - ukulele, id `soprano`;
  - baritone, id `baritone`;
  - guitar, id `guitar`.
  It also provides `instrument(id)` and `INSTRUMENTS`.
- Chord libraries: `chords.json`, `chords-baritone.json` and `chords-guitar.json`, built by `tools/build-chord-library.js`. Guitar comes from chords-db `guitar.json` (muted strings allowed, root in the bass preferred). All three are in `package.json` → `extraResources`.
- Diagrams: `diagram-svg.js` handles any number of strings and `left_handed`. `chord-library.normalizeChordDefinition` keeps up to 12 strings.
- Export names: `song-library.exportFileName(title, { instrument, transpose, capo }, ext)` gives `Title (+2, capo 3)_gtr.ext`; `instrument: null` means no code (lyrics).
- Capo:
  - `src/capo.js` (`rankCapos`, `suggestCapo`, `shapeDifficulty`);
  - `song.capo` in song.ini is written only when > 0;
  - in the renderer, `songCapo()`; display and exports use `transpose − capo`; `buildSchedule({ capo })` raises the notes;
  - the `#capoSelect` and `#capoDialog` controls.
- Tab across instruments:
  - `tab.convertTab` and `blankTab`;
  - `transposeIR` converts tab nodes to `options.instrument` even at 0 semitones;
  - the parser no longer warns about guitar tab;
  - chord-sheet reports `tabInstruments`.
- Sounds: `SOUNDS` table in `playback-audio.js` (`standard`, `hollow`, `steel`, `nylon`); `playback.guitar_sound`.
- Strums:
  - `src/strums.js` (`STRUMS`, `strum`, `strumsFor`, `arrows`);
  - `defaultPattern` accepts library ids; song-library validates them;
  - the `#strumDialog` (Hear / Add to song / Make default) and the `#strumLibraryOptions` optgroup in the default-strum select.

## 14m. Guess the key, Song menu (v3.1.0)
- `keys.rankKeys(chordNames)` returns `[{ key, score, inKey, outside, starts, ends, first, last }]` for all 12 tonics, best first (ties go to the lower tonic). `keys.keyConfidence(ranked)` returns 'high' / 'medium' / 'low'. `detectKey` = `rankKeys()[0].key`. The preload exposes `keys.rank` and `keys.confidence`.
- `main.js` has a **Song** menu: `guess-key` (Ctrl+K), `suggest-capo`, `strum-library`, `insert-tab`.
- `index.html`: `openKeyDialog()` works on the chords as written (original key). It also shows the key after `state.transpose`, and the capo shape key. `#keyUse` sets `song.key`.

## 14n. Library, ribbon, matched panes (v4.0.0)
- **Layout** (`index.html`): `header.header` holds `.appbar` (`#songTitle`, `#savedBadge`, `#nowPlaying`; no buttons: `#saveButton` is on File, `#playButton`/`#stopButton` on Play, `#settingsToggleButton` on the Settings tab; the library opens from File → Close, menu `library`, or `window.ukemusicShowLibrary()` in tests) and `nav.ribbon` with `.ribbon-tab[data-ribbon]` buttons and `.ribbon-panel[data-ribbon-panel]` panels (song = the **File** tab / write / thissong / play / settings). Colours: `--tabs-blue` (tab strip), `--edit-green` (`.editor-tabs`, `.pane-head`), then `#ribbonHint`.
  - Every control kept its old id; the old `.toolbar`/`.songbar` are gone. `newButton` and `openButton` are gone (New/Open live on the library; the menu still has them). New ids: `closeSongButton` (`closeSong()`: confirm, scratch example, clear `last_song`, `showLibrary()`; menu `file-close`, Ctrl+W), `fileSaveButton`, `importButton`, `guessKeyButton`, `convertLinesButton`, `undoButton`, `redoButton`, `songSettingsButton`, `songStrumSelect`, `tapTempoButton`, `playTabPlay`, `playTabStop`, `playTempoInput` (second `song.tempo` control), `tempoSlower`/`tempoFaster`, `karaokeSlower`/`karaokeFaster`/`karaokeTempo`. `setSongTempo(n)` sets `#tempoInput` and fires change; `carryOnAtNewTempo()` restarts playback at `playingLine` with `playSong({ karaoke, startLine, resume: true })` (resume = no count-in), `playSoundSelect`, `playGuitarSoundSelect`, `playCountIn`, `playFollow`, `playFromCursor`.
  - Buttons get icons from `data-icon` (the `ICONS` table of SVG paths).
  - `showRibbon(name)` switches tabs (remembered in localStorage, try/catch). `revealElement(el)` / `window.ukemusicReveal(selector)` shows the tab holding an element (and leaves the library); the e2e harness calls it before every click/fill/select.
  - Hint line: `mouseover`/`focusin` on the header shows the nearest `[title]`.
  - `refreshRibbon()` (called from `populateSettingsForm` and each render) fills the song strum select (override of `playback.default_strum`, only strums for the song's time), shows the right Sound select for the instrument, and writes `#songInfoLabel` in the status bar.
- **Library** (`#library`, a fixed full-window section): `showLibrary()`, `hideLibrary()`, `refreshLibrary()`, `renderLibraryList()`, `openFromLibrary(folder)`, `pasteNewSong()` (`openConvertDialog({ mode: 'paste', newSong: true })`).
  - `fromLibrary(action)` closes the library when the action opened a document: `setDocumentContent` bumps `state.docSerial` (and hides the library itself).
  - Menu actions that work on the song leave the library first.
  - Startup: reopen the last song (or the example) behind, then `showLibrary()` unless `library.start_screen = last_song`.
- **Song list** (`src/song-library.js`): `listSongs` adds `key` (song.ini key, or `detectKey` on `chordsInText(content)`), `instrument` (song.ini override or null) and `starter` (notes contain "Starter song: ").
- **Starter songs** (`src/starters.js`): `STARTERS` (title, year, credit, settings, tip, content), `addStarterSongs(songsFolder)` (skips titles that exist), IPC `songs:addStarters`. Added once, when the library first sees a songs folder; then `library.starters_added = true`.
- **Config**: `library.start_screen` ('library' | 'last_song'), `library.starters_added`.
- **Matched panes**: the CodeMirror manager has `goToLine(n)` and `topLine()` (preload `editorGoToLine`, `editorTopLine`).
  - The `.cm-scroller` scroll event → `syncPreviewToEditor()` (rAF): finds the preview `.line-group[data-line]` around the editor's top line and interpolates between them. It is skipped while playback is following lines.
  - `highlightCursorLine()` adds `.cursor-line`. A click on a preview line calls `editorGoToLine`.
  - Preview-only CSS is in `PREVIEW_CSS`.
- `NEW_SONG_TEMPLATE` (= `SAMPLE_SONG`) is a short example song.
- Tests: `test/starters.test.js`; e2e phase `library`.
- Sound `sampled` (`src/playback-audio.js`): `SAMPLES` lists [midi, file, cents] from the FreePats SFZ; `loadSamples()` fetches and decodes them once (relative to index.html, so it works from the asar too). `sampleFor(midi)` picks the nearest recording and its `playbackRate`. If the samples fail to load it falls back to the plucked string. `play()` and `renderOffline()` wait for the load. Default `playback.sound` is now `sampled`.
- Karaoke: `buildKaraoke` makes a piece `{ chord: '|', bar: true }` for each `[]`, and the words after it share that bar's time (a chord's pieces are split into one segment per bar). Lines with chords but no words get `instrumental: true`; `karaokeRender` gives them `.k-instrumental` (chords inline at word size).

## 14o. Low G, setlists, practice, chord shapes, artist/tags (v4.1.0)
- **Low G**: profile `lowg` in `src/instruments.js` (strings 55 60 64 69, code `uke`, library `chords.json`, `sameShapesAs: 'soprano'`); `sameShapes(a, b)`.
  - `tab.tuningFor` tries the song's own instrument first, so `A E C G` tab reads as low G in a low-G song.
  - `convertTab` treats soprano and low G as the same, keeping the fingering.
- **Chord shapes** (`src/shapes.js`):
  - `findShapes(chord, instrument)` searches four-fret windows 0–12, checks with `shapeProblem` (same note rules as the library builder), ranks with `difficulty` and picks varied shapes;
  - `parseFrets` and `fretsText`; `parseShapeSetting` and `formatShapeSetting` (song.ini `shapes.<instrument>`);
  - `withShapes(library, map)` overlays a song's shapes, marked `custom`, so `.chord-diagram.custom-shape` shows them;
  - `parseDefine` and `formatDefine` for ChordPro.
  - index.html:
    - `chordLibraryFor(instrument, config)` is used by `renderOptions`, playback and the strum preview;
    - `songShapes` reads the shapes, and `shapesKey` makes low G share `soprano`'s;
    - `#shapeDialog` is the picker (`openShapeDialog`, `setSongShape`, `playChordOnce`); a click on a preview `.chord-diagram[data-chord]` opens it.
- **Setlists** (`src/setlists.js`): `<songs>/Setlists/<name>.txt`, one title per line, plus `<name>.pdf`.
  - IPC: `setlists:list`, `setlists:validateName`, `setlists:write` (rename via `oldName`), `setlists:delete` (asks first), `setlists:exportPdf`.
  - `main.js` `renderPdf(html, pageSize, printStyle)` is shared with `song:exportPdf`. The title "Setlists" is reserved for songs.
  - index.html: library tabs `#libTabSongs`/`#libTabSetlists`; `refreshSetlists`, `renderSetlistEditor`, `changeSetlist`; File → `#addToSetlistButton` (`#setlistAddDialog`).
  - `songbookHtml(setlist, { contents, newPage, printStyle })` renders each song from its folder with its own settings (`mergeConfig(state.config, song.settings)`). `maxLineChars(printStyle, { ignoreSongFont })`. `window.ukemusicSongbookHtml(name)` is for tests.
- **Practice**: `buildSchedule` and `buildKaraoke` take `endLine`.
  - `playSong` reads `practiceSettings()` (`#loopSection`, `#practiceSpeed`, `#speedUp`) and `sectionRangeAt(ir, line)`.
  - It loops in `onEnd` unless `state.userStopped` (set by Stop, karaoke Close, strum dialog close, tempo restarts).
  - `karaokeRender(..., endLine)` shows only the section.
- **Artist and tags**: song.ini `song.artist`, `song.tags` (normalised by `normalizeTags`); `listSongs` returns them.
  - Library: `renderLibraryList` searches every word across title/artist/tags/key/instrument; `librarySort` sorts by column (kept in localStorage); tag chips set the search.
  - ChordPro `{artist}` is saved on import. Exports show `.song-artist`.
- **Fix** (`playback-audio.js` `strum`): tab events leave strings undefined (holes become `undefined` through the context bridge); they're skipped now. They used to give NaN buffers.

## 14p. Strum info boxes, time changes (v4.2.0)
- `src/strum-box.js`:
  - `strumTime(text)` reads `{3/4 …}`; `strumSteps`; `strumCounts(n, beats)` gives 1 & 2 &, 1 e & a, triplets, or null; `strumName` matches the strum library; `timeLabel` (6 → 6/8);
  - `renderStrum(text, ctx)` for the styles comic, clean, compact and plain;
  - `strumCss()` holds the CSS for every style. It's added in `buildPreviewDocument`, so it reaches the preview, exports, PDFs and songbooks, and into the app window for the strum library cards.
- `renderer-html.js` `renderStrumNode(node, options, state)`: `state.strum` tracks the time in force and the box count (the tempo shows in the first box; `time-change` marks a change). Options: `strumStyle`, `beatsPerBar`, `tempo` (from `renderOptions`). The renderer's default is `plain`, so unit tests and old callers are unchanged.
- Settings: `rhythm.style` (default `comic`, can be set per song; validated in `pickSongSettings`); `rhythm.notation` now only applies to the plain style.
- Playback: `buildSchedule` tracks `beats` per slot (a `{n/m …}` changes it), and each bar has `beats` and its own length; the count-in uses the first bar's time. `buildKaraoke` mirrors this for tab bar counts. The karaoke strip uses `bar.beats`.
- ChordPro `STRUM_RE` allows a leading time and `>` accents.

## 14q. Song details (v4.3.0)
- song.ini facts: `song.artist`, `song.year` (number; `normalizeYear` reads "c. 1848"), `song.writer`, `song.album`, `song.source`, `song.difficulty` (beginner/intermediate/advanced), `song.tags`. They're normalised in `pickSongSettings` and returned by `listSongs`.
- index.html:
  - the `#tabDetails` / `#detailsPane` form uses `data-config-path … data-scope="song"` fields, so the generic binder saves them;
  - `#detailsCapo` calls `setCapo`, and `#detailsKey` is filled from `#song-key` in `updateKeySetting`;
  - `showTab('details')`; `state.tab` is 'song', 'notes' or 'details', and the scroll sync and line highlight only run on 'song';
  - `#detailsFields` is disabled until the song is saved;
  - `creditText(config)` gives "Artist, year" for exports and songbooks.
- `starters.fillStarterInfo` (IPC `songs:fillStarterInfo`) runs once (`library.starters_info`).
- `createSong` notes: the title, then History.

## 14r. View/Export tabs, keys, rename (v4.4.0)
- Ribbon:
  - `data-ribbon` song (File), write, thissong, view, export, play, settings.
  - View: `setLookSetting(changes)` writes to the song's override if it has one, else to the global config; `changeTextSize` (song `font` override); `refreshViewTab` is called from `refreshRibbon`.
  - Export: `quickExport(formats)` uses `config.export` (print_style, pdf_page_size, all_versions; the selects use `data-config-path`).
- `src/rekey.js`: `rewriteText(text, semitones, { key, instrument })` changes [chords] (not [[labels]], [], [*…]) and tab blocks; `rekeySettings(settings, semitones, { chords, key })` shifts the versions, adds the old key as a version, sets transpose to 0 and moves a set key. In index.html, `makeThisTheKey()` (`#rekeyButton`, enabled when transposed).
- `song-library.renameSong(folder, title)` (case-only renames go via a temporary name) appends "Renamed from" to the notes. IPC `song:rename` also calls `setlists.renameSongInSetlists`. In index.html, `renameCurrentSong()`.
- `listSongs` returns `versions: [{ semitones, name, key }]`. The library draws `.library-row.key-row` rows (don't use `.version-row`: that class belongs to the version dialog). `openFromLibrary(folder, shift)`.
- Setlist lines `Title | +5` (`setlists.parseEntry` / `formatEntry`; preload `setlistEntry`). index.html: `entryOf`, `songOf`, `entryLabel`, `keyNameFor`. Songbooks use the entry's shift (0 = original).

## 14s. Song shorthand, layouts, writing guide (v4.5.0)
- `src/song-syntax.js` holds the shorthand; the parser uses it so later stages see ordinary nodes with extra fields:
  - chord: `bars` (`[C x3]`), `grid` + `gridBar`, `share` + `part` (two chords in a bar), `mark` ('%' on a repeated split bar's first copy), `hidden` (its other copies), `stopped` (after an inline `{stop}`).
  - bar: `grid` + `gridBar` + `mark: '%'` (% after a one-chord bar = one more bar of it, like `[]`).
  - `repeat` node `{ count }` before the linebreak of a line ending `(x2)`.
  - rhythm: `strumName`, `recall` ({A} used again: content is the resolved pattern), `stop`, `inlineStop`, `unknownStrum`.
  - `chordLabel(node)` is how a chord is printed ("C×3", "%", "C stop"): use it for widths in any renderer.
  - `expandRepeats(ir)` copies repeated lines in (copies get `pass`), used by `buildSchedule` and `buildKaraoke`.
- Playback: a bar can be a share of a bar (`bars[].share`); its strokes are its share of the pattern, or one per beat if the pattern doesn't divide. Alternating patterns are split on `|` (`strumParts`); the turn restarts at each new pattern. `{stop}` gives the next chord pattern 'D' then '-' for its other bars.
- Karaoke lines are keyed by line + pass; grid lines have `grid: true` and pieces with `newBar` (index.html draws `.k-gridbar`).
- Renderer: `renderGridLine`, `renderGroupInline` (layout 'inline'), `renderGroupChordsOnly` (layout 'chords'), `addRepeatMark`, the strum key (`renderStrumLegend`). `sheetCss()` is added to `strumCss` in preload, so it's in every preview and export whatever the user stylesheet. Print line-splitting only applies to layout 'lines'.
- `strum-box.renderStrum` ctx: `strumName`, `recall`, `stop`; parts split on `|`.
- `rekey.rewriteText` also moves bar lines and `[C x3]`. `codemirror-ukemusic` marks them.
- Guide: `WRITING.md` (in `build.files`), turned into HTML by `src/guide.js` (`writingGuide()`, a small Markdown reader); `#guideButton` / F1 opens `#guideDialog`. Keep the quick-reference table's examples valid: a unit test parses each one.

## 14t. Short chords and N.C. (v4.6.0)
- `parseChordToken` reads `Name[:beats][ x bars]` and `N.C.`/`NC` (`noChord`). Chord nodes get `beats` and `noChord`. Bar-line chords get `beats`, or `restOf: { used, count }` when others in the bar have beats.
- `playback-schedule.songSlots(ir, options)` walks the song once: it tracks the position in the bar, works out each chord's length (beats; plain = to the end of the bar; x3; share; restOf), and splits at bar lines. It returns `{ nodes, slots, warnings }`, with `slot.node` = index into `nodes` (repeats expanded). `buildSchedule` lays the slots out; `buildKaraoke` counts each node's slots from the same plan.
- Each slot plays its pattern from the start, cut to the slot's length (`bars[].share` < 1 for short ones). Rest slots: `bars[].rest`, a `mute` event (`Player.mute` damps every string).
- `noChord` is skipped by transposeIR, songChords, diagrams and the key/diagram chord lists in index.html.

## 14u. Practice window (v4.7.0)
- `src/training.js`: `barLines`, `strumExercise`, `bluesChart` / `bluesExercise` (BLUES_KEYS), `changeExercise`, `shuffleShape(chord, library, instrument)` (raise the highest string sounding the chord's 5th by 2 frets), `applyShuffle(schedule, shapes)` (strums on beats 2 and 4 get the shuffle notes), `addClicks(schedule)` (a click every beat, accent on bar starts), `changeTips`, `partnersFor`. Exposed in preload as `window.ukemusic.training`.
- index.html `#practice` overlay (z-index 55, above the library). `prExercise()` turns the controls into `{ pattern, beats, bars, chart?, shapes?, from?, to? }`, played as `{pattern}` + bar lines through the usual `buildSchedule` and `player`. `prChanged()` restarts from the current bar while playing; `prTick()` (requestAnimationFrame) draws chord, diagrams, strokes, beats, grid and counters from `player.position()`.
- `UkePlayer.setVolume(0–1.5)`.
- Entry points: `#practiceButton` (Play tab), `#libPractice` (library), `window.ukemusicPractice()`.

## 14v. Finger exercises (v4.8.0)
- `src/finger-exercises.js`: `PATTERNS` (1234, 1324, 1423, 4321, warmup), `spiderNotes({ patternId, strings, startFret, rounds, upAndBack, moveUp })` → `[{ string, fret, finger, round, position, back }]`, `spiderTab(notes, names)` → `{ text, cells }` (highest string on top), `spiderSchedule(notes, { tuning, tempo, notesPerBeat, sound: notes|click|off|demo, click, countIn })` → a player schedule (single-note 'strum' events, or silent 'cue' events, plus `step` and `noteCount`), `describeNote`, `stringNames`. Exposed as `window.ukemusic.fingers`.
- index.html Practice mode 'spider': `prSpiderExercise`, `prFretboard` (an SVG drawn once per exercise; the hand box and dots move by transform), `prDrawSpider(ex, i)` (dots, tab cells, caption), the spider branches in `prStart` (`fromNote`, `demo`), `prChanged` and `prTick`. "Show me" = `prStart({ demo: true })`: one round, notes on, ≤70 bpm.
- 4.8.1: the fretboard SVG also has the hand (`.palm`, four `.finger` paths moved with CSS `d` transitions, `.knuckle`s) inside the sliding `.hand` group, and the `.picker` arrow (translateY to the string). `#prLegend` is the key; `#prHelpDialog` (`prHelp()`) is the help, opened by itself once (localStorage `ukemusic.practiceHelpSeen`).

## 14w. Karaoke chord shapes (v4.9.0)
- `.karaoke-main` holds `#karaokeLines` and `aside#karaokeShapes`. `drawKaraokeShapes(index)` (called from `updateStrip` with the current bar index, and from `karaokeStart` with -1) shows the chord now and the next two different playable chords from `schedule.bars`, using `karaokeView.library` (the song's instrument library with its custom shapes). The `#karaokeShapesToggle` setting is in localStorage `ukemusic.karaokeShapes`.

## 14x. Play band (v4.10.0)
- `#playBand` (row 2 of `.preview-panel`; `#preview` is pinned to row 3) is shown by `startPlayBand(ir, schedule, startLine, endLine)` when `playSong` runs without karaoke, and hidden by `stopPlayBand()` (from `setPlayingUi(false)`). `playBandTick()` draws the chord (`pbStrip`/`pbLight`), the shapes (`drawShapes(holder, view, index)`, shared with karaoke) and the sung fill: the karaoke timing (`buildKaraoke`) gives each line's pieces; the share of letters sung is set as `--sung` on the preview's `.line-group`, and PREVIEW_CSS draws it as a gradient behind `.lyrics` / `.inline-line`.
- `#karaokeButton` is labelled "Play along".

## 14y. Tabs tidy-up (v4.11.0)
- `#tabDetails` is labelled Info (ids unchanged). `openSong` always calls `showTab('song')`.
- Info no longer has capo/instrument (`#detailsCapo`, `#detailsInstrument` removed).
- This song: `details.rib-menu#keyMenu` holds `#saveVersionButton`, `#removeVersionButton`, `#rekeyButton`. `revealElement` opens a `.rib-menu`, and clicking an item or outside closes it.
- `#songSettingsButton` is on the Settings tab.
- Export (4.11; changed in 4.13, see 14za): `#exportNowButton` → `quickExport(...)`. The PDF/Web/Lyrics/ChordPro buttons are gone.

## 14z. Practice section (v4.12.0)
- `src/practice-catalog.js`: `CATEGORIES` (7), `EXERCISES` (`{ id, cat, level, title, aim, mode, set: { controlId: value }, create? }`; modes spider, drill, change, oneminute, strum, blues, notes, metronome, noodle), `DEFAULT_ROUTINES`, `PROGRESSIONS` + `progressionChords(id, key)`, `planText(bars)` (`[{ chords, pattern }]` → song text with a `{pattern}` line wherever it changes), `LADDER`/`strumPlan`/`applyDynamics` (soft/loud bars), `metronomeSchedule` (click events may carry `level`; `UkePlayer.click` uses it), `tapTempo`, `drillChords`, `NOODLE_SETS`/`chordTones`/`safeNotes`/`qaPhrase`, `RHYTHM_IDEAS`, `melodySongText`. Preload: `window.ukemusic.practiceLib`.
- `src/note-exercises.js`: the single-note engine. `placeNotes(pitches, tuning)` (lowest fret, never the re-entrant G for low notes), `scaleNotes` (+ `sequence`), `pickingNotes` (chord `shape` held, right hand `rh` p/i/m/a), `singleStringNotes`, `alternatingNotes`, `melodyNotes` (MELODIES), `callResponseNotes` (phases listen/you/answer, `hidden`/`audible`). Notes have the same shape as `spiderNotes`, so `prDrawSpider` and `spiderSchedule` play them. Preload: `window.ukemusic.notesLib`.
- `src/practice-progress.js`: practice.json in the songs folder (`readProgress`/`writeProgress`), `logSession`, `logClean` (+5 bpm), `logScore` (last 30), `bestScore`, `streak`, `todaySeconds`, `formatMinutes`. Preload: `window.ukemusic.practiceProgress` (`logClean` returns `{ data, next }`).
- `src/finger-exercises.js`: `spiderNotes` also takes `hop` (string hopping) and `moveDown` (stretching).
- index.html: `#practice` has `#prHome` (the menu: `#prCats`, `#prCards` `.pr-card[data-ex]`, `#prRoutines`) and `.practice-body` (the player). `prOpen(exId)` → `prShowMode(mode)` then applies the preset (a strum not in the library goes into "Type your own") and the last tempo. Sections show by `data-for` (space-separated modes), `data-not`, and `data-kind`/`data-not-kind` (the Notes kind). `prExercise()` returns `{ kind: 'chords', barList }` (played via `planText` → `buildSchedule`), `{ kind: 'notes', notes }`, `{ kind: 'metro' }` or `{ kind: 'oneminute' }`. Noodling draws `.safe` dots in the fretboard's `safe-layer` (`prDrawNoodle`); Q&A phrases are added by `prAddQuestions`.
- Timer/progress: `pr.session` counts while playing; logged on stop/back/close. `#prClean` → `prMarkClean`. Routines: `pr.routine` (`prRoutineStart/Step/Tick/Next/End`), each step for its minutes of playing, then next. One-minute changes: `prOneMinuteStart/Count/Stop`, `prDrawScores`. `window.ukemusicPracticeState` is `pr` (tests set `minuteMs`).
- Esc: player → menu → close. Help sections `data-help`: spider, notes, strum, blues, change, drill, oneminute, noodle, metronome, routine, all.

## 14za. v4.13.0: export, rich text, tab styles, library, stylesheet
- `runExport({ formats, allVersions })` writes sheet/lyrics PDFs and web pages in both `PRINT_STYLES` (standard, stage); `styledName()` adds " (stage)" before the extension. `export.print_style` is no longer used for song exports (the songbook still has its own style choice).
- `#exportNowButton` → `openExportDialog()` with every format ticked (the dialog no longer remembers `export.formats`; no Print style row). Also the menu (File → Export…, action 'export') and `window.ukemusicExportDialog` (tests). `#exportButton`, `#exportMakes`, `#exportStyleQuick`, `quickExport`, `refreshExportMakes`, `exportFormats` are gone.
- Rich text: `src/rich-text.js` (`scanMarkers`, `styledHtml`, `lineCodes`, `insertCodes`, `nodeCodes`). The parser drops paired `**` `*` `__` markers (and `\*` `\_` escapes) from the words, so offsets count only visible letters, and puts `styles` (one number per letter: 1 bold, 2 italic, 4 underline) on lyric nodes that have any. renderer-html (lines: codes padded with `insertCodes`; table: codes sliced per column; inline), renderer-lyrics (`tidyWords`) and line-wrap (codes carried into split lines) use them. The editor: `richMarks()` in codemirror-ukemusic (classes `cm-rich-b/i/u`, `cm-rich-marker`), `toggleMarker()` on Mod-B/I/U and `execCommand('bold'|'italic'|'underline')` (#boldButton etc.). guide.js renders `*em*` and `<u>`.
- Tab: renderTabHtml wraps dashes in `.tab-dash`. Config `tablature.frets` (chord|bold|plain), `.size` (same|smaller|larger), `.box`, `.faint`, `.in_print`; `tabStyleCss(config)` is added to the preview and export CSS; `withoutTab(ir)` for PDFs when `in_print` is false. Stage CSS makes `.tab-fret` 900.
- `#convertLinesButton` is on the File tab ("Bring in" group), labelled "Process Import".
- Library: `.library-actions` is a 4-column grid (2 below 900px); `#libOpenFolder` is a `.lib-folder-button` in `.library-songs-head`.
- `newFile()` sets `song.beats_per_bar = 4` and `playback.default_strum = island` on the new song's settings.
- `#cssDialog`: `openStylesheetInEditor()` (button, menu 'edit-stylesheet', `window.ukemusicStylesheet`) reads style.css into `#cssText`; Save → `persistStylesheet()` + `scheduleRender()`. `#cssExternal` uses `openExternal()`.

## 14zb. About (v4.14.0)
- `src/about.js`: `ACKNOWLEDGEMENTS` (groups of `{ name, by, what, licence, url?, only? }`, `only` = 'desktop' | 'web'), `acknowledgements(edition)`, `aboutHtml({ version, edition })`. Preload: `aboutHtml`, `appVersion`.
- index.html `#aboutDialog`, `openAbout()` (`#aboutButton` on the Settings tab, menu action 'about', `window.ukemusicAbout`). main.js: Help → About ukemusic sends 'about'; `setWindowOpenHandler` opens http(s) links in the browser.
- Keep `ACKNOWLEDGEMENTS` and THIRD_PARTY_NOTICES.md in step when adding sounds, data or packages.

## 14zc. Looks in style.css; Songs for the web (v4.15.0)
- default-style.css: `--stage-font/--stage-size/--stage-color` in the first `:root`; sections at the end: Tab (`[data-tab-frets|size|box|faint]`), export title, Stage (`[data-style="stage"]`). `buildPreviewDocument(markup, css, theme, title, attrs)`; `docAttrs(config, { stage })` gives the attributes. `stageCss()`/`tabStyleCss()` are gone; `stageSettings()` reads the variables. Settings → Export stage font/size write the variables (`setCssVariable`). View → Look (`general.look`) puts `data-style="stage"` on the preview.
- `src/stylesheet-upgrade.js` `upgradeStylesheet(user, default, { font, size })`: run by main.js at start (adds the variables and the sections from "/* ── Tab" on, once; keeps style.css.before-4.15).
- `src/web-songs.js`: `buildWebSongs`, `readWebSongs`, `songId` (same ids as the web). main.js 'web:exportSongs' (save dialog); preload `exportWebSongs`, `readWebSongs`; `#libWebSongs` in the library.
- Web (web/app.html): play and practice only; "Update songs" (`#updateInput`) replaces the db's songs from that file; per-device prefs in localStorage `ukeweb.prefs`.

## 15. Version History

| Version | Changes |
|---------|---------|
| 2.5.0 | Initial release. Parser, HTML/Markdown renderers, Electron UI, CodeMirror, live preview, diagrams, tablature, INI config, editable stylesheet. |
| 2.5.5 | Layout dropdown moved to General settings, font labels clarified. |
| 2.6.0 | Transpose, strum notation conversion, table layout, export buttons, font architecture overhaul, 8 bug fixes, Electron ^41.0.2. |
| 4.23.0 | progressions.js rewritten around `songBlocks` (headings + blank lines), `cycle`/`cycleKey` (parts grouped by repeating unit), behaviour naming (chorusLike = same opening words), `route`, `parts[]` (letter, name, times, lines, chordLines, linesTimes, chordsText, alsoIn, patterns); guessed key prefers first/last chord (passed key with .guessed is re-guessed). Dialog shows route + parts (`.pt-content`). |
| 4.24.0 | progressions.js: `songBlocks` lines carry `segments` [{chord,text,held}] and `line`; `INFORMAL_LABEL` turns "Bridge (x2):" words into headings; a heading-only block carries its label over a blank line. Naming: `wordsAlike` (Jaccard ≥0.5, then ≥0.35 within a part) → `repeatsWords`; a part is Chorus if chorusLike or all its worded blocks repeat; a Verse part sharing chords with repeating blocks gets per-block `ownName` 'Chorus' when no other chorus part exists; ≥2 once-heard long middle parts → Verse; short before first long → Intro; short middle → Link; Intro/Ending/Link/Instrumental not numbered. Route uses each block's own heading. Parts gain `example` {lines of segments with numeral, more}, `occurrences` [{index,line,words}]; route steps `words`; sections `line`, `labelled`. `addLabels(text, result)` inserts [[Name]] before unlabelled blocks (preload exposes it). Dialog: `.pt-route`, `.pt-sung`, `.pt-where-list` (click → editorGoToLine), `#patternsLabels`. Tests: test/v424.test.js, e2e phase `v424`. |
| 4.25.0 | Libraries: `src/libraries.js` (library.ini [library] name/description/author/licence/created; `listLibraries`, `createLibrary`, `copySong` {move, keepBoth → {clash}}, `licenceCheck`, `exportPack`/`readPack`/`importPack` {parent | into}; packs = zip with library.ini, songs/<Title>/(-song.txt, song.ini, links.txt[, notes.txt]), Setlists/*.txt; zip-slip safe). `src/zip.js` (writeZip/readZip, crc32, deflate via zlib). Config `library.libraries` = 'a\|b' (current = songs_folder, previous kept on switch). IPC `libraries:*`; preload `libraries`, `libraryList`, `pathDirname/Basename`. UI: `#libSwitch` menu (`openLibraryMenu`, `.lib-menu`), `#libraryDialog` (new/edit), `#packDialog`, `#packOpenDialog`, row `.lib-copy` (`openCopyMenu`), `#libHeading`/`#libAbout`; File → Library submenu (ids lib-share, lib-about greyed by `setMenuState({librarySongs, library})`). Song fact `song.licence`. `export.section_names` and `playback.swing` added to SONG_OVERRIDE_PATHS (were dropped on save); section names now per song only (Settings field removed, global forced to show, Export ribbon writes song.ini). Tests: test/v425.test.js, e2e `v425`. |
| 4.26.0 | parser STRUCTURE_RE allows whitespace around a heading-only line. Section names: global `export.section_names` back in Settings (`#export-section_names`) and in This song overrides; Export ribbon `#exportSections` has `default` (deletes the song value; label shows the global). Tests: test/v426.test.js, e2e v417 additions. |
| 4.27.0 | `src/chordpro-fields.js` (FIELDS with `link` paths, parseFields/formatFields/headerLines/valueOf/beatsFromTime); chordpro.txt per song (`songs.readChordPro/writeChordPro`, readSong `.chordPro`, IPC song:read/writeChordPro, packs include it). Import `chordProToUkemusic` returns `kept` (all meta/meta:/x_ fields + ignored directive lines + # lines); `applyImportedMeta(meta, kept)` merges into chordpro.txt (or `pendingImport.kept` until Save), subtitle→artist, tempo, capo. Export `ukemusicToChordPro(ir, { …linked, kept, keyLabel })`: linked values win. UI `#tabChordPro` / `#chordProPane` (`renderChordProTab`, `CP_LINKS`, `mergeChordPro`). Tests: test/v427.test.js, e2e `v427`. |
| 4.28.0 | Stage: `.inline-line` uses `var(--stage-inline-font, "Segoe UI", Arial…)`, line-height 1.45, slimmer `.ichord` (style-sets STAGE; `upgradeStage428` in stylesheet-upgrade.js rewrites only the exact 4.27 lines in styles/stage.css at startup). `renderPdf` (main.js): Stage + `export.stage_fit` (default true) → prints, counts real pages, tries 14px, then halves between to find the biggest size with the fewest pages (sets `--stage-size` on <html>, recomputes keep-together). Setting `#export-stage_fit`. Tests: test/v428.test.js, e2e `v428`. |
| 4.29.0 | `src/stage-formats.js`: FORMATS clear/brackets (layout table), compact (inline), heavy (song layout, no layer); `formatsCss()` scoped to `html[data-stage-format]` and appended to the Stage css in `docCss(stage)` and songbooks; `charsAcross`; `collapseRepeats(text, sections)` → one-line cue `[[Name]] — as before[, twice]` (identical words+chords, ≥2 lines). index.html: `stageFormatId/Layout`, `stageOnce`, `stageText`, `stageRenderOptions` (sheetDocument, songbookHtml, preview in Stage look); docAttrs adds data-stage-format. Config `export.stage_format` (clear), `export.stage_once` (true); both song overrides. Ribbon `#exportStageFormat`; Settings `#export-stage_format`, `#export-stage_once`. Fit minimum 16px. 4.28 Stage css undone by `undoStage428`. Tests: test/v429.test.js, e2e `v429` (v428 phase removed). |
| 4.30.0 | `export.stage_chorus` ('full' default | 'once') replaces 4.29's `export.stage_once` (dropped; song override path renamed). `collapseRepeats` only shortens blocks whose section is `labelled` (a heading in the song). Settings: new `#set-stage` section (Stage copies) holding font, size, format, `#export-stage_chorus`, fit, gig folder. e2e `v429` covers 4.30. |
| 4.31.0 | Review fixes B1–B9. Editor theme in a CodeMirror `Compartment` (`setTheme` no-op when unchanged; never `setState`); `loadValue` (fresh state = fresh history) used by `setDocumentContent` via `setEditorValue(text, { fresh: true })`. `src/safe-write.js` (`writeFileSafe` temp+rename with busy retry, `retryBusy`, `explain`) used for song, song.ini, notes, links, setlists, chordpro.txt, config.ini (+ .bak), styles, JSON. `saveSong(file, content, { allowEmpty })`: EMPTYSAVE guard, keeps previous text in `<song>/.history/<Title> YYYY-MM-DD HHMM.txt` (20); `songHistory`; IPC song:history, song:readHistory (path checked), dialog:ask. `readSongSettings` returns null only on ENOENT, otherwise throws; `writeSongSettings` merges over the existing file (unknown keys kept, known paths replaced). `normalizeValue` keeps TEXT_KEYS as strings. Renderer: `saveFile` wraps `saveFileInner` (toast + Save as new on a moved folder; asks before an empty save); `loadSong` toasts and doesn't open on read errors; config read separately, `state.configReadFailed` stops `persistConfig`. `renameBusy`, `releaseSongFiles()` before rename/archive/move; copySong skips .history; move falls back to copy only on EXDEV. Log filter for sandboxed_renderer noise. File → Earlier versions (`#historyDialog`, menu `song-history`). Tests: test/v431.test.js, e2e `v431`. |
| 4.32.0 | Parser `INFORMAL_LABEL_RE`: a part name + ':' at a line's start followed by chords, a bar line or nothing becomes a structure node (as written, e.g. "Bridge (x2):"). `src/print-notes.js` (`shorthandUsed`, `shorthandKeyHtml`) appended by `sheetDocument`; `.shorthand-key` in EXPORT_CSS. Stage: `.section` landmark CSS in stage-formats; `export.stage_diagrams` ('song'|'none', song override) applied in `stageRenderOptions`; renderPdf keep-together limit 0.35 page for Stage. exports-map: `staleReason` (song|name|app|look), `namedFor`, `songTitle`; `listExports(folder, { app, looks })`; files get `reason`/`why`. Renderer: `lookFingerprint(printStyle)`, `exportCurrent()`; export details carry app/kind/look; Exports tab explains reasons; rename toast offers `exports:delete { onlyOldName }`. Tests: test/v432.test.js, e2e `v432`. |
| 4.33.0 | Review U1–U9. Renamed actions (menu: Paste from Website…, Tidy Chords Above Words, Edit Style…, Strum Patterns…; menus 'Song'→'Write', 'Playback'→'Play'; ribbon: Close song, Tidy chords above words, Strum patterns…, Guess the key…); archive icon. `setLookSetting` always writes the song when one is open; `refreshViewTab` marks `.rib-own` / `.has-own`. Export dialog: `sheet_pdf` visible, others in `<details id="exportMore">`; default ticked = usual_formats or ['sheet_pdf']. `appendNoteLine` replaces today's last 'Exported' line. Library rows: `rowMenuButton` (.lib-more, .row-menu with .rm-setlist/.rm-copy/.rm-archive). Play options in `#voiceMenu` (Options ▾). Labels: editor tab 'Words & chords', Look 'Song sheet/Stage copy'. e2e helper `rowAction(row, which)`. Tests: test/v433.test.js, e2e `v433`. |
| 4.33.1 | Public repo prep: no copyrighted lyrics in tests/docs (Oh! Susanna, Clementine, invented words); `.gitignore` keeps mysongs/exports/.history/logs/REVIEW.md out; MIT LICENSE; `site/` (website), `web/make.js` (builds web/out: index.html, sounds as WAV, public-domain-songs.json), `.github/workflows` test.yml, web.yml (Pages: site at /, web player at /app/), release.yml (installers on each GitHub release; `build.publish: null`). Web player: starter songs when the browser has none (`loadStarters`, `showStarterMode`); audio unlocked on every tap (`unlockAudio`), wake lock not awaited; player.play() gives up after 1.5 s if the context won't run (`audio-locked`). Free Practice button (`.practice-cta`, `#libPractice` in `.library-heading`). |
| 4.34.0 | Songbook marks in the song format (`song-syntax.parseChordToken`): `[C↓]`/`[Cv]`/`[C↓↑]` → chord with `marks`, `strokes` ('DU'), `stopped`; `[x]`/`[mute↓↓]` → noChord with `muted` n, `beats` n, `written`; `[.]`/`[G…]` hold (no node); `[Bm7.Am7]` → `pair` (two chord nodes, `share` 1/n, `part`); `[|]`/`[/]` bar; `[x2]` at line end = repeat (REPEAT_RE); `fullChordName` (Gs4→Gsus4, Dma7→Dmaj7). `chordLabel` shows marks/written. Playback: `strokes` as the stopped slot's pattern; muted rests push `chuck` events. rekey keeps marks/written names/pairs. Parser: `{harmony}`…`{lead}` (VOICE_RE) → lyric `harmony: true` + italic style bit 2; the line emits no nodes. ChordPro: import keeps marks; `songbookToken` for the rest ([Riff 1] → label); `{start_of_x_*}`/any start_of_ → heading; `{start_of_strum}` boxes → `strumBox()` patterns (named boxes recalled after matching headings); `{x_voice}` → {harmony}/{lead}; `{tag}` → meta.tags; `{meta: spotify|youtube URL}` → meta.links; `{define-baritone}`/`{define-guitar}` → define.instrument. Export: `[C][*×3]`, `[Em][*2 beats]`, `[*stop][C]`, marks as written, `{x_voice}`; import reads them back (round trip lossless; `{comment: Stop: one strum, let it ring}` → `{stop}`). `src/chordpro-import.js`: `importSettings(meta, instrument)` (used by applyImportedMeta via `chordProImportSettings`), `importFolder(source, songsFolder)` → songs (licence personal, source, links, chordpro.txt) + a setlist per subfolder; IPC `libraries:importChordPro`; menu `lib-import-cho` + library menu item. chord-library `powerChord()` for X5 (GCEA/DGBE/EADGBE, lower of two shapes). Diagrams: `diagrams.skip_common` + `diagrams.common_chords` (renderer `chordKey`/`chordSet`, enharmonic), View 'Hide common' (`#viewSkipCommon`), web `#commonBtn`. Tests: test/v434.test.js, e2e `v434`. |
| 4.35.0 | Session screen. `src/session-view.js` (pure): `blocks(ir)` (blank line / heading-only line starts a block), `sessionHtml(ir, {mode:'over'\|'inline'})` → `<section class="blk">` blocks; 'over' builds words (`.wd` nowrap) of chord units `.u` (inline-block: `.c` chord above `.w` letters) so lines wrap at any space; `sessionChords`, `sessionSong(shown, {title, sub, folder, library, common, leftHanded})` → `{title, sub, folder, diagrams:[{name, common, svg}], html:{over, inline}}`; `SESSION_CSS` (em only). `src/session-fit.js` (UMD `UkeSessionFit`): `fit({box, lyrics, strip, html, minPx, maxPx, modes})` binary-searches the font size for 1–3 CSS columns (`break-inside: avoid`), biggest wins (another column only for ≥1.5px), else pages at minPx (`page()` = translateX by `_stride`); `sizeStrip` sizes diagrams (side strip, or a row on tall screens). `src/session-screen.js` (UMD `UkeSessionScreen.create(root, {css, onState, onClose, closeButton})` → `show/key/layout/check/destroy`): header, columns, strip (diagram viewBox cropped to `0 4 100 108`, own name hidden, CSS vars for the diagram colours), page dots, keys (→ ← PgUp/Dn Space Home End + − M D C Esc), tap thirds. Desktop: `session.html` feeds it over IPC; main `session:open` (window fullscreen on a second display when there is one; reused), `session:key`/`session:state`/`session:close`, `session:check` (hidden 1920×1080 window, `?check=1`, replies `session:checked`). index.html: `sessionSong()` (stage_chorus once, capo, key), `#sessionButton` (Play tab), `#setlistSession`, `#sessionBar` (laptop strip when external, capture keydown forwards keys), `checkSessionFit()` (library menu). Web: `#sessionBtn`, `#sessionView` overlay, songs as listed (lazy), build.js inlines session-fit + session-screen at `/*SESSION_JS*/`. Tests: test/v435.test.js (incl. a fake-layout fit), e2e `v435`. |
| 4.36.0 | playback-audio `sampleFor`: `BORROW = {67: 69, 71: 73}` (G4→A4, B4→C#5; those recordings are ~12 dB down at 1 s, measured). Web player: `#timeSel` (S().beats_per_bar; a time other than the song's picks the first library strum that fits, the song's own clears both), `#strumSel` (S().strum; `played(text)` drops whole-line strum lines and inserts the chosen pattern after --START MUSIC--, used by the sheet, stage, play and session), `#feelSel` (S().feel → scheduleOptions.swing), `writtenStrum()` labels the song's own or the default (preload `defaultStrumPattern`). ChordPro download time 6/8. PD songs: Amazing Grace {D>DD}, Wild Rover/Scarborough {D>-DUDU}, House of the Rising Sun 6/8 at 60 {D>DDD>DD}. ChordPro: feel-only lines export as `{comment: Feel: swing}` and import back (were `{comment: Strum }` → a heading). Docs: CHORDPRO.md; `web/docs.js` (run by web/make.js) writes site/guide.html, chordpro.html, changes.html from the .md files with `markdownToHtml(md, {href, nested})` (guide.js; the app's defaults unchanged), git-ignored; `tools/release-notes.js` + release.yml `notes` job (softprops `body_path`, `append_body`). package.json `repository`. Tests: test/v436.test.js. |
| 4.37.0 | Web player settings row: Key, Capo, Plays, Strum, Text + `#moreBtn` (More/Less, `look.more` remembered); the rest in `#moreTools`. Under 720px `[data-wide]` tools move into `#moreFirst` and More sits beside the title (`placeTools`, matchMedia). No sideways scrolling. |
| 4.38.0 | chord-sheet.js: `isBarLine` (bar lines never merged, not offered for Tidy); `markedChords` (Tidy reads `Dm↓:2`, `Dmvv:2`, chains `F:1G:1` at one column); same-column chords keep their order; words templates (`isTemplateLine`, `fillTemplate`: dots = letters, chords at their letter, filled from the words line below; `findChordLines` reports a template with words under it). playback-schedule: marked strums spread over the chord's own length (`spreadOver`). song-syntax `gridNodes`: bar-line chords keep marks/strokes/stopped. index.html `askForTitle({allowReplace})` → `#titleReplace` "Replace the words in …" → saveFile writes into the existing song + history line. Tests: test/v436.test.js. |
| 4.42.0 | Web Learn. web/app.html: `#learnBtn` → `#learnDialog` (`#learnStage`, `#learnPlay`, quiz/sheet/patterns/circle buttons), `#quizDialog`, `#learnSheetDialog` (iframe srcdoc, print, download), `#learnInfoDialog`; `learnSong()` (key = songKey transposed by transpose − capo); `__playSong({ learn })` keeps the learn options on line taps and tempo changes. web/k_js.js: `karaokeStart(…, learn)`, `learnMode`/`learnNumeral`/`learnStripName`/`learnChordEl`, shapes hidden, summary toast on close, `__k.learnOpts()`. k_css learn rules; play bar wraps under 600px. Tests: test/v442.test.js; web checked in a browser (Playwright on web/out). |
| 4.44.0 | Pick tab. src/picking.js: `PATTERNS` (up, up8, upback, pinch, travis: `four`/`three`/`six` steps of eighths in finger roles p/P/i/m/a, '-' rest, '+' together), `patternFor`, `stringNames` (re-entrant string lower case), `roleStrings` (4 strings: a finger to a string, p=0 P=1 i=1 m=2 a=3; guitar: p = root on the lower strings, P = D (or G), i/m/a top three), `tokenStrings`, `pickText`, `fingerText`. playback-schedule: `options.pick` → picked events (`picked`, `strings`; marked strums stay strums; shorter chords play the first steps; swing as strums); bars get `pick`, `pickText`, `pickSteps` (strip), `pickNotes` (tab) and `src` (index of the bar's node in the IR, first pass only: survives the preload bridge). Song setting `playback.pick` (validated). src/pick-sheet.js: `pickSheetHtml` (pattern table, chord boxes via diagram-svg, `songLines` + `lineBars`: per bar a box with chord, tab rows and words, widened to fit the words; the song's own tab as written), written by the learnSheet IPC as "(pick)". index.html: ribbon tab `pick` (`#pickPattern`, `#pickPlayButton`, `#pickKaraokeButton`, `#pickSheetButton`, `#learnPickButton` Tab in steps…, `#pickHelpButton` → `#pickHelpDialog`), `refreshPickTab`, `songPick()`, `writePickSheet(pattern, transpose)`, export format `pick_sheet`; `playSong({ pick })`; strips draw `bar.pickSteps`. web: `prefs().pick`, `#strumSel` optgroup, `#pickDialog` (patterns, Strum it again, Pick sheet, tab steps), `#pickHelpDialog`. Tests: test/v444.test.js, e2e phase v444. First note: `song.first_note` (song fact, `picking.normalizeNote`), `picking.noteMidi(note, transpose)` / `noteName`; `buildSchedule({ firstNote })` adds a `cue` event at time 0 when there's a count-in; `#detailsFirstNote`, `#pickFirstNoteButton`; 'First note' in pick and learn sheet facts. Public Domain Songs: Ode to Joy, Brahms' Lullaby; first notes and arrangement links on four songs. The tune: src/melody.js (`melodyLine`, `parseMelody` (note names relative to the previous note, or ABC; at/len in counts, pickup when the first bar is short; warnings), `songMelody(ir)` -> Map(line -> tune), lines borrowing the tune of an earlier line with the same chords, `transposeMelodyLine` (rekey), `hasMelody`); parser makes `melody` nodes (no linebreak, no room on the sheet); buildSchedule `tune`/`tuneShift` (tune events on voice 8, velocity 0.55, events sorted) and pick `melody` (chord melody: `picking.placeNote`, `bassUnder`; bars get `pickupNotes`); song setting `playback.tune`; pick sheet pickup bar and rows of at most 96 characters; `#pickTune`. Write out: src/pick-song.js `writePickedSong(text, ir, schedule, { instrument, beats, compound, words, chordNames })` (runs per line and pass, boxes from pick-sheet `lineBars`, full bars at a uniform cell width, systems of at most 78 characters, pickups overlaid at the end of the previous run's last bar or in a lead-in bar; {melody} and strum lines dropped except a time); bars carry `pass`; index.html `#pickWriteButton` → `#pickWriteDialog` (`openPickWrite`, `pickedSongFor(pattern, transpose)`: text rewritten by transpose − capo, settings without pick/tune, tags + picked, notes). ```tab 4/4: parser `TAB_START_RE` sets `node.barBeats`; tab.js `barTiming`, `tabBarBeats`, `tabTiming(model, { barBeats })`, `tabBars(text, beats, { barBeats })`; schedule and karaoke pass it; every ```tab regex accepts the time. {pick} lines: parser `PICK_RE` → `pick` nodes (`content`, `pickName`); `picking.resolvePick(spec, instrument)` → { id } | { custom: tokens ('s2' string tokens or fingers), label, kind } | { off } | { error }, `pickTokens(pick, beats, compound)`, `tokenStrings` reads 's<n>'; songSlots sets `slot.pick` from options.pick and {pick} lines (named kept per song, errors as warnings); buildSchedule picks per slot (bars get `pickLabel`). index.html `#pickChangeMenu` (`fillPickChangeMenu`, `insertPickLine`), `#pickWriteLineButton` (writePickedSong with `only`: one line in place; its {melody} dropped and moved above the next line that borrowed it); `#pickStopButton`. pick-sheet `pick` lines (`.pchange`) and the patterns-used note. ChordPro: `{pick}`/`{melody}` export as `x_ukemusic_pick`/`x_ukemusic_melody(_abc)` (and back), `x_ukemusic_tab_time` before a 4/4 tab, `# ukemusic:` note lines (`ownDirectivesNote`, skipped on import); ABC: melody.js `keySignature`, `parseAbcTune` (M:, L:, K: with modes, accidentals per bar, ties, (3 triplets, > <), `notesToMelodyText`, `tuneToAbc`; export option `export.chordpro_abc` (info.abc, `tuneShift` = semitones − capo for the x_ lines, `tuneSound` = semitones for ABC; blocks per section with an unborrowed tune); import `{start_of_abc}` -> placeholders resolved by `matchAbcTunes` (line bars via buildSchedule; pickup to the first line; capo subtracted; else kept on the ChordPro tab; report.tunes, folder report.tunes). The tune as notation: src/notation-svg.js (`barsOf` (notes split at bar lines and into note values, tied; triplets), `systemSvg` (treble clef, key and time signatures, ledger lines, stems, flags, beams per beat, ties, chords above at their place), `tuneStripHtml` (each unborrowed tune once; rows `data-line`, `data-also` = lines borrowing it), `lineStaves` (Map line -> staff), `tuneCss` (in `sheetCss`); key guessed from the notes when none or only guessed from chords); glyphs in src/music-glyphs.js (Bravura, OFL). renderHtml `options.tune = { notation: strip|lines|off, shift, key, keyGuessed }` (default strip; Stage off); line-groups now take their line number from the words, not a {melody}/{pick} line before them. Setting `export.tune_notation` (song.ini, `#viewTune`, `#export-tune_notation`); notes carry `data-line`/`data-at` (counts), lit with `.now` by `tuneLight` in the play band (and the web tick). Web: `#tuneSel`, `look.tune`, `tuneOptions()`. e2e v444d. |
| 4.45.0 | Web player edits and keeps songs. src/song-files.js (pure, browser-safe): `songFromText(name, text)` (ukemusic / ChordPro via chordProToUkemusic + chordpro-import `importSettings` / chord sheet via convertChordSheet / plain words, wrapped in the music markers), `readZip` (DecompressionStream deflate-raw), `settingsFromIni`, `songsFromFiles([{ name, text | bytes }])` (song folders = a `-song.txt` with song.ini and notes.txt; loose song files; backups; skips __MACOSX, .history, exports, learn), `planImport(current, incoming)` → { add, update: [{ song, current, what, editedHere }], same, missing } by songId(title), comparing words, notes and the song facts present in what came in. web-songs: entries keep `edited` / `updated`. preload: `songFiles`, `webSongs.{build, read, id}`, `editorInsert(text, back)` (codemirror-ukemusic `insertText`), `planWebImport` / `applyWebImport`. web/app.html: IndexedDB store (`idb`, db 'ukemusic', store 'songs', localStorage songs migrated; `navigator.storage.persist()`), `store.save(song, { edited })`, `adoptStarters()`, `createSong`, New song dialog, Add songs from files (`#updateInput` multiple, no accept filter: iOS greys out unknown types) → `showImportPlan` (`#updateList`, `#updateEdited`, `#updateRemove` for backups), `#backupBtn`, `saveFile()` (claude downloads → share sheet on touch → download), `#editView` (`openEditor`, `closeEditor`, `flushEdit` on pagehide/visibilitychange, Words/Details/Notes tabs, `[data-ins]` buttons keep focus). main.js: `web:planImport` (only songs marked edited are offered; `newerHere`), `web:applyImport` (createSong + notes; saveSong keeps history; writeSongSettings merged; appendNoteLine). index.html: `#libPhone` → `#phoneDialog`. Tests: test/v445.test.js, e2e v445; web: a Playwright script against web/out/index.html. Web app: web/icons/ (from build/icon.png, opaque; maskable), web/build.js adds the manifest link, apple-touch-icon and the service worker registration (https or localhost only) to out/index.html (not the claude.ai copy) and writes out/manifest.webmanifest; web/make.js step 5 writes out/sw.js from web/sw-template.js: precache of index, manifest, icons, sounds and the starter songs, versioned by package version + sha1 of them; navigation and .json network-first (4 s) with the copy as fallback; others cache-first; Google Fonts stale-while-revalidate. web/pages.js `PHONE_PAGE` → site/phone.html (gitignored like the other built pages); footer link. |
| 4.46.0 | Chord shapes drill Order (practice-catalog `drillChords(set, count, rand, { order })`, `#prDrillOrder`; Learn's shapes stay mixed). The words being sung coloured word by word (`sungWords` / `clearSung` in index.html and web/app.html: words wrapped in `span.w` the first time a line plays; `.w.sung`). |
| 4.47.0 | Songs in Dropbox from the web player. src/cloud-sync.js (pure): `songFolders(entries, root)` (song folders = `<root>/<Folder>/<…>-song.txt`, the first by name, title = folder; skips Archived songs, Setlists, exports, dot folders and anything deeper), `revsOf`, `songHash` (text + notes + stable JSON settings, FNV), `iniText` (desktop header, settings_format 2), `songToFiles`, `filesToSong` (song-files `settingsFromIni`), `planSync({ local, remote, deleted })` → pull / push / conflict / match / removeLocal / recreate / archive / newLocal, `archivePath`. Songs carry `cloud: { folder, revs, hash, parts }` (per-file hashes, so only changed files go) and `cloudSkip`; tombstones in `cloudConf.deleted`. web/app.html Cloud: `DROPBOX_APP_KEY` (or the key typed in the dialog), localStorage `ukeweb.cloud` (appKey, refresh, access, expires, root, askedNew, lastSync, deleted), PKCE (`cloudSignIn` redirect, or `withCode` with no redirect_uri for iOS standalone; `cloudReturn` on ?code&state), `cloudAccess` refresh, `dbxList` (list_folder recursive + continue), `dbxDownload` (Dropbox-API-Result rev), `dbxUpload` (mode update rev / add / overwrite, strict_conflict), `dbxMove` (move_v2 autorename); `pullSong`, `pushSong` (rename = move folder + song file, then overwrite), `cloudSync` (asks once about songs only here; skips the song being edited; conflict = Dropbox's kept as the song + a copy "… (changed on this device)" pushed; deleted here → Archived songs), `cloudSoon` from `store.save(…, { edited: true })`, online and visibility; `store.remove(id, { cloud })` tombstones. `#cloudBtn`, `#cloudState`, `#cloudDialog` (connect, browse folders, Sync now, Change folder, Disconnect). Only on the website (not the claude.ai copy). Titles can't have \\ / : * ? " < > |. Tests: test/v447.test.js; a Playwright script with a stand-in Dropbox (routes for oauth2/token, authorize, list_folder, download, upload with revs and 409s, move_v2). |
| 4.48.0 | progressions.js: PATTERNS + Eight Days a Week, Garage-rock riff, Pachelbel's Canon, Salty Dog, Minor four, Creep, Minor rock (i–VI–VII), Watchtower; `corePc(core, minor)`; `morePatterns(cores, found, { minor })`: a run of ≥4 chords each a fourth up ("Round the circle", unless a named pattern shares three steps of it) and the part as one loop (`cycle`: ≥2 times, unit 2–8: a named pattern that is the unit gets "Here it's the whole part, round N times." in its hint, else "One loop"); `findPatterns(cores, { minor })` appends them; learn.js `partPatterns(rows, key)` marks them on the chord map (start/end from the squashed sequence). Tests: test/v448.test.js. |
| 4.49.1 | Key-change learn sheets. progressions `openingKey(ir)` (a keychange before the first chord = the song's key; songKeyGuess returns it; analyse uses it over a chosen key; not in keyChanges); `analysis.chords` per key (`inKey`; the lead chord's role "leads into A, the new key"); first summary line per key. learn.js: chordMap skips tab-only bars, parts carry `moved: [{ key, names, swaps }]`; learnSheetHtml groups shapes by `inKey` and prints `.moved`; `openingIr` limits circleSvg/circleNotes to the opening key, with a change note. Callers pass `inKey` in shapes. Test in v449. |
| 4.49.0 | Key changes. parser `KEY_RE` → `keychange` nodes ({key: A}; no linebreak, no room); renderer-html `.key-change` mark (before a heading: the section is closed first); transposeIR, rekey `rewriteText`, ChordPro export (`{key: X}` in the own-lines block) and import (a `{key}` after the music has started stays as a line) move it; karaoke heading "Key change: A". progressions: songBlocks skips melody/pick/keychange nodes (`silent` lines aren't blank lines); `beforeKeyChange(ir)` for the key guess (analyse and songKeyGuess); `keyAt(line)` numbers block lines and chords (chords carry `inKey` when not the song's key); `guessKeyChange(blocks)` (first split where the opening fits its own key ≥75%, the rest fits another ≥90% and the opening key ≤ that −30%; a guessed song key becomes the opening key; a chosen key must match it); `keyMove`, `leadsInto` (V or II of the new key); analysis `keyChanges: [{ line, key, from, name, move, detected? }]` and summary lines. learn.js chordMap numbers bars with the written changes. Learn/pick sheet facts "Key: G major, then A major (Verse 3)" (index.html, web/app.html). Docs: WRITING.md Key changes, CHORDPRO.md. Tests: test/v449.test.js. |
| 4.43.0 | Fingerstyle. src/learn.js: `tabBarShapes` (bars from the '\|' columns; per bar `pattern` as string numbers and `pick` as string names, g C E A with a re-entrant string in lower case, same column joined by +; shape = best chord whose frets match ≥ 0.7), `pickingSummary` (`chordal` only when every bar has a shape, else a tune: shapes cleared), `isChordal`, `barText` ("Hold C, pick g-C-E-A"), `passageText`, `tabStepText` 'chords' leaves a tune as written, `tabStepText(text, 'open' or 'chords')` (keeps line count), `fadePlan` fades tab nodes, `learnSheetHtml({ picking })` (each passage once, ×N). index.html: `#learnPickButton` → `#learnPickDialog` (4 steps; `playSong({ textTransform, speed, label })`, kept on line clicks via `karaokeView.step`), karaoke tab branch `.k-pick` when fading; "The changes…" → "Changes…". web: `#learnPickBtn` → `#pickDialog`, `__playSong({ step })`, k_js tab fading. Tests: test/v443.test.js, e2e phase v443. |
| 4.41.0 | Audit fixes. keys `rankKeys(names, { starts })`: home rule (first == last == most played, or most part-starts == first chord and ≥85% of the most played) lifts that key to the top (`homeBy`). progressions `partStarts(ir)`, `songKeyGuess(ir)` (used by songKey, Info, session/songbook, song-library `songKeyName`, web app), `roleOf(n, key)` (ROLES_MAJOR/ROLES_MINOR), PATTERNS + II–V–I, `firstAgain` (bookend verse), one-pattern summary. learn: `outsideWhy(chord, key, seq)`, circleNotes by numerals then geometry, minor V as family; `partPatterns` rotations once, ≤3-step no wrap, song order; chordMap part `name` from route names, `wordsEach` same/mostly/some/new (worded times only), `like` {how start/more/again/join/one, text} by chord sequence; `wordsText`; sheet RANK by mode, `.dg` 96px diagram box, any viewBox cropped. changeTip barre wording. Status bar `timeLabel`. Tests: test/v441.test.js, e2e `v441`. |
| 4.40.1–2 | Learn uses the app's key (`learnKey(shift)` = `keyAfter` as non-guessed, passed to `progressions.analyse`; also Chord patterns, now on the transposed IR, and the status bar). Circle turned so home is at the top (`rot`), ringed, numerals round it. Chord map: rows carry `words` (cue), parts carry `marks` (`partPatterns(rows)`: PATTERNS located bar by bar, may wrap to the part's start), `wordsEach` ('same'/'new'), `like` ({how:'start'|'more'|'again'|'one', letter, bars}, only against parts heard as often); sheet shades marked bars, tells each pattern once. |
| 4.40.0 | Learn stage 2. `src/learn.js`: `circlePlace`/`keyFamily`/`circleMoves`/`circleNotes`/`circleSvg(ir, key, {size})` (OUTER/INNER rings, pos = pc·7 mod 12, minors by relative major); `quizSteps`/`quizQuestions(ir, max)`/`quizOptions(step, songChords, key, seed)` (no same-root distractors); trouble spots `addTrouble`/`placeTrouble` (re-found by words)/`removeTrouble`, `learnSheetHtml` gains `circle`, `circleNotes`, `trouble`. song-library `readLearn`; main `song:learnRead`/`song:learnWrite`; preload `learnRead`/`learnWrite`. index.html: `#learnCircleButton`→`#learnCircleDialog`, `#learnQuizButton`→`#learnQuizDialog` (`quiz` state, `quizPlay`), `#learnTroubleButton`→`#learnTroubleDialog` (`troubleCache`, `learnLoadTrouble`/`learnSaveTrouble`/`learnAddTrouble`, file `learn/trouble-spots.json`), karaoke `#karaokeTrouble` (+ T key, learn mode only), `.k-trouble` lines; `playSong({ loop: true })` loops a range without the Loop checkbox. Tests: test/v440.test.js, e2e `v440`. |
| 4.39.0 | Learn. `src/learn.js` (pure): `fingerMoves`/`changeTip`/`songChanges(ir, library, {tuningName})` (per finger: stay/slide/move/add/lift from the shape's `fingers`; score move 3, slide 1.5, add 1, lift 0.5, barre +2, stay −0.5); `barsOf(schedule)` (bars from the schedule's chord slots by time); `chordMap(ir, schedule, analysis)` (each part's longest occurrence, rows per line ≤6 bars, numerals); `fadePlan(ir, analysis, stage)` → plain `{lines, fallback}` ('repeats'/'numbers'/'none'); `numberedIR`; `keyLegend`; `learnSheetHtml`. song-library `writeLearn` (`learn/`, LEARN_DIR, reserved title); libraries copy skips `learn`. main `song:learnSheet` (HTML + `renderPdf`). index.html: ribbon tab `#ribbonTabLearn` (`#learnStage`, `#learnPlayButton`, `#learnChangesButton` → `#learnChangesDialog`, `#learnDrillButton`, `#learnNumbers` → `state.learnNumbers` in `renderPreviewNow`, `#learnKey`/`#learnKeyButton`, `#learnSheetButton`, `#learnPatternsButton`); karaoke learn mode: `playSong({ learn: { stage, transpose?, legend? } })` (kept on line clicks), `karaokeView.learn` {plan, key, needed}, `learnChordEl` (? → click reveals, recorded), shapes hidden, strip shows ?/numeral, summary toast on close; `practiseChange(exId, from, to)` / `practiseShapes(chords)` (window.ukemusicPractiseChange/Shapes). Tests: test/v439.test.js, e2e `v439`. |
| 4.22.0 | src/exports-map.js (`listExports` groups/outOfDate/made, `recordExports`, `madeText`); IPC exports:list/record/delete/open/show/readText/copyTo, dialog:chooseFolder, setlists:folderPdf, shell:openFolder; main window plugins:true (PDF preview). Exports tab `#exportsPane` (`renderExportsTab`, `previewExport`, `fileUrl`). runExport → `exportRecording` + history line; gig folder copy in writePdf (`export.gig_folder`, `gig_copy`); `export.usual_formats` (#exportMakeUsual); `makeSongbook({ folder })` + `songbookHtml numberFrom`. Playback: `#playFromStartButton`, `#karaokeRestart`, `.k-line[data-line]` click, preview click while playing; playSong stops a running play first. e2e v422, v422play. |
| 4.21.0 | Progressions: src/progressions.js (`numeral`, `analyse` → key/chords/sections(lines, letter, patterns)/letters/shape/summary, `analysisText`), Write `#patternsButton`, `#patternsDialog`, menu 'chord-patterns'. Archive: song-library `archiveSong/listArchived/restoreSong` (ARCHIVE_DIR 'Archived songs'), IPC song:archive/listArchived/restore (song:trash now = delete for good), `#libArchiveToggle/#libArchiveList`. `exportEverySong` via `openExportDialog({ everySong })`, `#libExportAll`. Renderer `showFeel` (off). e2e v421. |
| 4.20.0 | Home: `#libNew` button only, `#libPractice`/`#libSettingsButton` in the bar, settings z-index 47 (toast 70), Esc closing settings doesn't also leave the library; delete: `.lib-delete`, File `#deleteSongButton`, IPC song:trash (shell.trashItem; tests: UKEMUSIC_TEST_TRASH). Menu: item ids `song-*`, `menu:state` → `setMenuState`, renderer `updateMenuState()`. Voice: src/voice-cues.js (`voiceCues`, `spokenChord`), `startVoice/stopVoice` (speechSynthesis, polled from player.position()), playback.voice_count/sections/chords, Play `#voiceMenu`. e2e v420. |
| 4.19.0 | Stage style: `style-sets.STAGE`/`stageCss`, styles/stage.css (not in the set list), IPC styles:readStage/writeStage/restoreStage, `state.stageCss`, `docCss(stage)` (no song font on Stage); Look labels Song/Stage; cssDialog `cssTarget`. Exports: versions ORIGINAL_FOLDER='Song', Stage copies → 'Stage', `migrateExportFolders` (song:migrateExports). Sets: +modern, +night, `:root[data-theme]` colour pins; builtin.json hash refresh. Links: src/links.js, links.txt, `song:writeLinks`, Links tab. Setlists: pool removed, `.lib-add` + menu, `library.last_setlist`. Play: #practiceButton removed, Karaoke label. e2e v419. |
| 4.18.0 | Swing: `song-syntax` FEELS/takeFeel/feelFor (node.feel, node.feelOnly); `songSlots` slot.feel + slot.compound; buildSchedule swings pairs (perBeat 2 or 4, simple time), bars get unit/pulse/feel; `playback.swing` ('auto' default; missing option = straight); Play `#playFeel`, Settings `playback-swing`, song override. 6/8: `isCompound` → unit = beat/3, count-in soft clicks (`level`), karaoke tab + training clicks use bar.unit/pulse; strum box `♩. = N`. WRITING.md Swing section. e2e v418. |
| 4.17.0 | `export.section_names` show/small/hide (song-overridable) → `data-sections` via `sectionsAttr()` in docAttrs + lyricsDocument; renderers mark heading-only sections `section-cue`; CSS "Section names" part in style sets (`upgradeSectionNames`); Export ribbon `#exportSections`; e2e phase v417. |
| 4.16.2 | Boxes back to `--strum-size: calc(mono * 1.15)`; plain `.rhythm` / table rhythm row = `calc(mono * var(--plain-strum-scale, 1.2))` bold text-colour; `upgradeStrumScale` now converts 4.16.0/4.16.1 sets to this (drops `--strum-scale`); View `#viewStrumSize` = Plain strums. |
| 4.16.1 | `#ribbonClose` = File → Close, `#ribbonHide` chevron collapses; `--strum-scale` in :root + `upgradeStrumScale` run on every styles/*.css at start; View `#viewStrumSize`; library visible from load (`state.starting` stops setDocumentContent hiding it), hidden at start only for start_screen=last_song. |
| 4.16.0 | Style sets: `src/style-sets.js` (built-ins = default-style.css + vars + extra), files in `<config>/styles/<id>.css`, `general.style_set`; old style.css → styles/mine.css (`upgradeStylesheet416`); IPC styles:list/copy/restore/delete/folder; stylesheet:read/write use the active set. `--strum-size`; diagram SVG part classes + `--diagram-*`; preview header colour; ribbon × (`nav.ribbon.collapsed`); `#tabMenu`. e2e phase v416. |
| 4.15.1 | Tempo/time set on This song only; Info shows `#detailsPlay` text + `#detailsPlayChange`; Info key renamed "Written in" (`#detailsKey`); `#song-key` removed from settings dialog. |
| 4.15.0 | Stage, tab options and export title in style.css (View → Look); style.css upgraded; Songs for the web… file; web is play + practice with Update songs. |
| 4.14.0 | Help → About with acknowledgements (sounds, chord shapes, software, fonts, public-domain music), desktop and web. |
| 4.13.0 | Export now opens the export list with everything ticked; PDFs and web pages in Standard and Stage; bold/italic/underline in the words; tab styles (View → Tab, Tab in PDFs); Chords into words → File tab, "Process Import"; library cards in one row; new songs 4/4 + Island; stylesheet editor in the app. |
| 4.12.0 | Practice section: a menu of 39 exercises in 7 categories with difficulty badges; scales, picking, melodies, call and response; one-minute changes, shape drill, progressions, rhythm ladder, soft/loud, metronome with tap tempo; noodling over backings; timer, practice.json progress, clean +5 bpm, streak, routines. |
| 4.11.0 | Song/Info/Notes, open on Song; Info vs This song split; one-row This song (Keys ▾ menu); Export now + Choose; Chords into words; Suggest key. |
| 4.10.0 | Play in the editor: band with chord, strum strip and next shapes; the sung line fills in; Play / Play along. |
| 4.9.0 | Karaoke shows chord shapes: now, next and then (toggle with Shapes). |
| 4.8.1 | Finger exercises: blue next note, a key, a drawn fretting hand, a pluck arrow, How this works help. |
| 4.8.0 | Finger exercises (spider walk: 1-2-3-4, 1-3-2-4, 1-4-2-3, 4-3-2-1, warm-up) with animated fretboard, tab, Show me demo and sound options. |
| 4.7.0 | Practice window: strum trainer, 12-bar blues (keys, 7ths, quick change, turnaround, shuffle), chord-change trainer with tips and a change counter; visual metronome, click, volume. |
| 4.6.0 | Chords shorter than a bar `[Em:2]` (a plain chord after fills the bar); every chord starts the strum afresh (Island on 2 beats = D-DU); `[N.C.]` pauses; beats and N.C. in bar lines. |
| 4.5.0 | Shorthand: `[C x3]`, bar lines with `%` and shared bars, `(x2)` repeats; named strums, alternating strums, `{stop}`; Inline and Chords-only layouts; varied chucks; How to write guide (WRITING.md). |
| 4.4.0 | View and Export tabs; Rename; make this the song's key (rewrite the text); saved keys listed in the library and usable in setlists; Artist column. |
| 4.3.0 | Details tab: artist, year, written by, album, source, tags, difficulty, key, capo, tempo, time, instrument as fields; library search across them; ChordPro composer/album/year. |
| 4.2.0 | Strum info boxes (styles: bold box, light box, one line, plain) with time, name, arrows, letters and count; time changes within a song `{3/4 …}` in playback and karaoke. |
| 4.1.0 | Low-G ukulele; setlists with songbook PDF; practice loops (section, speed, speed-up); choose chord shapes (incl. ChordPro {define}); artist and tags with library search and sort; tab playback fix. |
| 4.0.0 | New layout: library home screen with starter songs, app bar + ribbon tabs with hint line, preview follows the editor (scroll, cursor line, click to go), tap tempo, per-song strum on the ribbon. |
| 3.2.0 | Strum library: country, rock, blues, funk patterns; style field and filter. |
| 3.1.0 | Song menu: Guess the Key pop-up (ranked keys with reasons and confidence), capo, strums, insert tab. |
| 3.0.0 | Baritone and guitar alongside ukulele: instrument profiles, guitar chord library, 6-string and left-handed diagrams, export codes _uke/_bar/_gtr, capo with suggestions, tab conversion between instruments, steel/nylon sounds, strum library. |
| 2.18.0 | Karaoke lights tab notes as they play; TABLATURE.md. |
| 2.17.0 | Tablature: paste importer, checks, bold frets, transposition, Insert tab, overtype, tab playback and karaoke. |
| 2.16.0 | Full-window settings with section list and plain-English labels, print colour pickers; karaoke strum strip; notes saved on close. |
| 2.15.0 | Karaoke view; ChordPro tempo noted in notes instead of applied; splitter and editor wrap fixes. |
| 2.14.0 | Default strum setting (Simple / Island / Custom, per song too), `>` accents, Hollow body sound. |
| 2.13.0 | Inline `[[labels]]`; global defaults vs per-song custom settings (incl. per-song fonts) with song.ini migration; table-layout strum fix. |
| 2.12.0 | Print styles (Standard / Stage), line splitting for print, export-complete message. |
| 2.11.1 | Fix chords running together on instrumental lines; smarter PDF page breaks. |
| 2.11.0 | ChordPro import/export; key-aware chord spelling with key detection and Song key setting. |
| 2.10.0 | 540-chord libraries (soprano + baritone) from chords-db with note-checked fingerings; shared chord-name rules; more chord spellings recognised. |
| 2.9.0 | Chord-sheet conversion (paste / convert / import), chord-line warnings, uneven-pattern warning, import-history fix. |
| 2.8.0 | Transposed versions (chord X becomes Y), notes.txt, lyrics-only export, PDF export, Export dialog, strum playback with line highlight, highlighter crash fix. |
| 2.7.0 | Song library (songs folder, folder per song, `-song.txt`, song.ini, exports folder), baritone diagrams, light export theme, error logging, B7 and diagram-height fixes, Markdown export transpose/arrows fix, close-crash fix. |

---

## 16. Quick Reference for Common Tasks

### Adding a new chord to the library
Edit `src/chords.json`. Format:
```json
{ "chord": "Dadd9", "frets": [2,2,0,0], "fingers": [1,2,0,0], "barre": null, "base_fret": 1 }
```

### Adding a new annotation type
1. Add regex in `src/parser.js`
2. Add node type handling in `parseLineContent()` or at the line level
3. Add rendering in both `src/renderer-html.js` and `src/renderer-markdown.js`
4. Add highlighting rule in `src/codemirror-ukemusic.js`
5. Add tests in all relevant test files

### Changing the theme
The theme is controlled by `data-theme` attribute on the preview root element. Values: "light", "dark", "auto". CSS custom properties under `[data-theme="dark"]` and `@media (prefers-color-scheme: dark)` inside `[data-theme="auto"]` provide dark mode values.

### Adding a new config option
1. Add default in `DEFAULT_CONFIG` in `main.js`
2. Add UI control in the Settings panel in `index.html` with `data-config-path` attribute
3. Wire it into the render pipeline in `index.html`'s `renderPreview()` function
4. Use the value in the appropriate renderer

---

*End of handover document.*
