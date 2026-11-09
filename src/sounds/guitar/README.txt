Nylon-string guitar (FreePats "Spanish classical guitar")
---------------------------------------------------------

Version 2019-06-18

Recorded from a Spanish classical guitar (2008) by roberto@zenvoid.org for the FreePats project,
with an AKG Perception 120 microphone, and processed with free software tools.
https://freepats.zenvoid.org/Guitar/acoustic-guitar.html
https://github.com/freepats/spanish-classical-guitar (commit 6f4eb1b, 2022-07-22)

Published under the terms of Creative Commons CC0 public domain dedication (LICENSE.txt):
https://creativecommons.org/publicdomain/zero/1.0/

What ukemusic uses (4.72): 18 of the set's 48 notes, from E2 (the guitar's low E) to C6, every
two or three semitones; each note in between is one of these played a little faster or slower.
The guitar uses them, and so does the baritone ukulele (nylon strings, the guitar's top four).

Changed from the originals (by ffmpeg):
 - the quiet before each note trimmed to 3 ms, so a strum's strings come exactly in turn
 - cut to at most 4 s, with a 0.6 s fade at the end (the app damps a string at its next strum)
 - 44.1 kHz, 16-bit, mono FLAC

Tuning, measured from each recording (autocorrelation over 0.2-1.4 s): all within 11 cents of
the note; the app corrects each by its own amount (src/playback-audio.js). A3 and C4 die away much
sooner than their neighbours (about -43 dB after 2 s, against -20 to -28 dB), so their notes
borrow G3 and D4, retuned.
