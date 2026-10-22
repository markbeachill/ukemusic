# Third-party notices

ukemusic uses the following sounds, data, software and fonts. Help → About in the app lists them too.

## chords-db

Ukulele chord fingerings in `src/chords.json` and `src/chords-baritone.json` (other than the hand-checked shapes in `tools/hand-checked/`), and the guitar chord fingerings in `src/chords-guitar.json`, are derived from chords-db, https://github.com/tombatossals/chords-db, by David Rubert, used under the MIT licence:

```
MIT License

Copyright (c) 2016 David Rubert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## FreePats "Ukulele" samples

- Files: `src/sounds/ukulele/*` (13 note recordings and a muted strum, FLAC/WAV)
- Source: https://freepats.zenvoid.org/GuitarFamily/ukulele.html (version 2026-08-11), recorded by Mateusz Dąbrowski
- License: Creative Commons CC0 1.0 (public domain dedication); see `src/sounds/ukulele/LICENSE.txt`

## CodeMirror 6, Lezer, crelt, style-mod, w3c-keyname

The song editor uses @codemirror/state, @codemirror/view, @codemirror/commands and @codemirror/language (https://codemirror.net/), with @lezer/common, @lezer/highlight, crelt, style-mod and w3c-keyname, all by Marijn Haverbeke and others, under the MIT licence:

```
MIT License

Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## ini

Reading and writing settings files uses ini (https://github.com/npm/ini) under the ISC licence:

```
The ISC License

Copyright (c) Isaac Z. Schlueter and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR
IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

## Electron and electron-builder

The desktop app runs on Electron (https://www.electronjs.org/, MIT licence, which includes Chromium and Node.js under their own licences; Electron ships them in the installed app's LICENSES.chromium.html) and is packaged with electron-builder (MIT licence).

## The web version

The web version is packed with esbuild (MIT licence, by Evan Wallace) and uses the fonts Figtree (Erik Kennedy) and Courier Prime (Alan Dague-Greene), both under the SIL Open Font License 1.1, served by Google Fonts.

## Starter songs and practice tunes

The starter songs and the practice melodies are traditional or 19th-century songs in the public domain.
