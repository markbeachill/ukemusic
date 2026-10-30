# Free Practice review

Reviewed 30 October 2026 against ukemusic 4.49.1, commit b85c73b.

## Verdict

Free Practice is a useful collection for beginner and improving ukulele players. Its strongest features are visual demonstrations, chord-change practice, rhythm accompaniment and a route into improvisation. The library is broad enough that adding more exercises should be a lower priority than making existing exercises predictable, easier to follow while holding an instrument, and reliable over repeated visits.

Usefulness: good. Ease of use: mixed, particularly on phones. Completeness: broad coverage, with important gaps in progress storage, personalised routines, returning to familiar exercises and learning guidance. Removing the automatic help barrier and shortening the route back to regular exercises should be early usability priorities.

## Scope and evidence

I inspected the public GitHub Pages web player, opened representative warm-up, chord, rhythm, ear-training, improvisation and routine screens, started a warm-up demonstration and a one-minute timer, checked an approximately 390 × 844 phone viewport, and examined the implementation shared with the desktop app. I reproduced lost progress after reload, settings carrying between exercises, the clean-round button accepting a result before playback, and the three-note/four-note mismatch.

The desktop app was reviewed through its source, rather than launched. This was a product and implementation review, not an exhaustive test of every exercise or an assessment of audio quality, sound latency, real instrument detection, or performance on physical phones. No application changes were made.

The catalogue contains 39 exercise cards across six subject categories, plus two supplied routines. Many cards are useful presets of the same trainers; they are not 39 distinct learning systems.

The review also incorporates the user's experience of the automatic help pop-ups, particularly their breadth and difficulty closing on a phone, and the user's suggestion of recent or frequently used exercises. These are identified below as user feedback rather than additional device testing.

## Usefulness by area

| Area | Assessment | Most useful improvement |
| --- | --- | --- |
| Warm-ups and finger work | Useful demonstrations, fingering text, tab and string cues. The explanations help interpret the animated hand, but should be available on request for the exercise being used. | A shorter first exercise, optional focused help and a visible goal for a clean, relaxed round. |
| Chords and changes | One of the strongest areas: diagrams, changes between pairs, shape drills, progressions and blues. Desktop Learn can send a song's difficult changes into practice. | Count one-minute changes after the attempt, and preserve the chosen chord pair. |
| Strumming and rhythm | Strong range: simple strokes, island strum, muted strokes, dynamics, rhythm ladder and metronome. | Separate learning the rhythm on one chord from adding chord changes; keep the active pattern visible on a phone. |
| Fingerpicking | Useful finger assignments, patterns and alternate demonstration/play rounds. | Remember the player's chord sequence and pattern; give short checkpoints for even timing and tone. |
| Scales and melody | Useful scales, positions, sequences, tunes and introductory call-and-response. | Let players repeat the same ear-training phrase and choose phrase difficulty; add note-finding practice. |
| Noodling and creativity | A valuable addition: backing loops, chord-tone highlighting, rhythm ideas and question/answer. | Make limited-note labels accurate and explain how to turn a phrase into a finished musical idea. |
| Routines | The supplied five- and ten-minute sessions make the collection actionable. | Save the actual exercise settings, allow reordering and provide a clear session result. |

## Findings, in priority order

### 1. High: practice progress is lost when the public web player reloads

Reproduction: open Down-strums, press That was clean, return to the catalogue. The card displays a date and best tempo. Reload the page and return to the category: the card says Not tried yet.

The browser file system stores practice.json in a memory Map. Persistence is wired to the optional connected database branch, but there is no equivalent persistence for the ordinary GitHub Pages browser mode. This also affects custom routines and one-minute scores. Back up all songs exports song data, not practice progress.

This undermines daily routines and progress tracking. Persist progress in browser storage, restore it before opening practice, include it in an appropriate backup, and explain where it is stored. The web help currently describes a practice.json file in a songs folder, which does not describe the public browser experience.

Evidence: web/stubs/fs.js:2; web/app.html:2466; web/app.html:996; web/pr_markup.html:320.

### 2. High: leaving a one-minute drill does not consistently stop its timer

The one-minute exercise uses its own animation timer, separate from audio playback. All exercises calls prShowHome(), which stops the audio player and ends the practice session, but does not stop that separate timer. prOpen() has the same omission. Close Practice does explicitly stop it.

Consequently a timed attempt can finish after navigation and use the changed or cleared current exercise ID when saving its score. I exercised the navigation route; the eventual wrong-score write is a source-based finding, not a separately observed saved result.

Use a common stop-and-clean-up operation for Back, Escape, Close, changing exercises and routine transitions. Cancel abandoned attempts and keep their original exercise identity immutable until stopped.

Evidence: web/pr_js.js:159, 175, 1296, 1333, 1377. Corresponding navigation logic also appears in index.html:7817.

### 3. High usability priority: automatic instructions obstruct getting started

The first-time help opens a shared help dialog containing sections for all the trainers. Expanding the relevant section does not remove the other exercises' instructions from the dialog. The user reports that this is an unnecessary barrier to starting, especially on a phone, and that closing it is difficult. The useful instructional content should remain, but opening an exercise should lead directly to its playing screen.

Replace the automatic pop-up with a clearly labelled Help button on every exercise. Show only that exercise's instructions, rather than the whole practice manual or a generic trainer's instructions. Several exercises share a trainer, so the help should follow the exercise's identity and purpose, not just its underlying mode.

Keep the explanation short: what to do, what the picture means, how to start, and what a successful attempt looks like. Put optional detail below it. On a phone, keep a large, clearly labelled Close button visible without scrolling through the instructions; return focus to Help when dismissed. Preserve the player's settings and position. The existing Show me demonstration should remain a separate optional action.

Acceptance: opening any exercise, including a first visit or a routine step, never forces help to open. Help for Down-strums does not display instructions for blues, spider walks or routines. Both Help and Close are easy to reach on a phone.

Evidence: user feedback; shared dialog in web/pr_markup.html:253; automatic opening and mode-based section selection in web/pr_js.js:452–465.

### 4. Medium: returning players must repeatedly search a large catalogue

There are 39 exercise cards and no dedicated shortcut to the player's regular exercises. Categories help initial discovery, but returning to a familiar exercise still requires remembering its category and finding it among the cards. The user suggests showing the last three or the most commonly used exercises.

Start with a Recent exercises row at the top of the Free Practice home screen, above the categories, containing the last three distinct exercises actually started. Show the most recent first, avoid duplicates, and use the same recognisable names as the catalogue. Opening help or browsing a card should not displace an exercise that was practised. An exercise run as part of a routine can count too.

Each shortcut should reopen that exercise with its saved personal settings. Keep the full category catalogue available underneath. Hide the row until there is something to show, and persist it across visits using the same durable storage as practice progress. Recent use is a navigation aid, not a claim that the exercise was completed or mastered.

Recent three is the recommended first version: it reflects what the player is working on now and is easy to understand. Most used can overemphasise old habits and be slow to reflect a new practice goal. Consider a separate Favourites/pin option later if players want a stable set; do not add competing Recent and Most used panels initially.

Acceptance: starting A, B, C and then A shows A, C, B. Starting D then shows D, A, C. Reloading preserves that order. Merely viewing another exercise's instructions does not change it.

Evidence: user suggestion; catalogue navigation in web/pr_js.js:120–173. This is a proposed improvement, not an existing feature.

### 5. Medium: exercise behaviour depends on what was opened before

Reproduction: open Soft and loud, go back, open Down-strums. Soft and loud bars remains checked, and the dynamics guidance is still present. Down-strums sets some controls but does not reset the dynamics control.

Other controls are also shared, and presets only partially overwrite them. Beginners cannot tell whether they are using an exercise's intended setup or inherited choices. Meanwhile deliberate personal settings are not saved with each exercise for a future visit.

Give each exercise a complete initial setup, save personal settings per exercise, and offer Reset this exercise. Keep truly global choices, such as volume, separate.

Evidence: web/pr_js.js:175; src/practice-catalog.js, exercise presets.

### 6. Medium: the one-minute exercise needs hands the player is already using

The timer counts a clean change only when the player presses Space or Changed. That interrupts fretting or strumming unless someone else counts or the player has a suitable external control.

Keep the timer and diagrams, but allow an end-of-minute total to be entered. Retain live counting as an optional partner/foot-control mode. Explain whether each transition counts as one, or whether a return trip counts as one. The exercise should make the counting convention unmistakable.

Evidence: web/pr_markup.html:297; web/pr_js.js:1323.

### 7. Medium: the phone layout puts setup ahead of playing

At 390 × 844, settings occupy most of the top of the exercise. The stage below shows the chord diagrams, with rhythm information further down. Controls and stage have separate scroll areas, making it difficult to see the information needed to play together.

Use a compact playing view: show the current/next chord or note, the active rhythm and Start/Stop. Collapse settings behind an Edit settings button. Preserve access to tempo without requiring a long scroll.

Evidence: live viewport inspection; web/pr_css.css mobile rules; web/app.html practice styles.

### 8. Medium: a routine cannot save the work a player actually wants to do

Routine steps contain an exercise ID and minutes. The editor does not capture the chord pair, key, scale position, pattern, tempo or other settings. Opening a step reapplies its preset. A routine such as two minutes of G to D followed by F to Bb therefore cannot reliably be expressed as two personalised steps.

Save exercise settings with each step and make ordering editable. Handle one-minute drills explicitly: the editor accepts a number of minutes, but the timer always runs one minute before moving to the next step.

Evidence: web/pr_js.js:253, 310, 1296, 1349; src/practice-catalog.js:68.

### 9. Medium: recorded achievement lacks enough meaning

That was clean can be pressed before starting, and immediately records a clean round and best tempo. Progress is grouped by exercise card, although that card can run different chords, patterns, keys and note subdivisions. A best tempo is therefore not always a like-for-like comparison.

Self-assessment is appropriate; microphone scoring is not required. Explain what clean means for each activity, distinguish manually reported practice from a completed guided round, and save results with the exercise configuration. Make the tempo increase optional. Add a clear next action, such as repeat at the same speed or progress after several clean rounds.

Evidence: live clean-button reproduction; web/pr_js.js:441; src/practice-progress.js:35.

### 10. Smaller accuracy, access and completeness issues

- Three-note noodling actually selects Just four notes, with four pitch classes. Rename it or supply a three-note set. Reproduced in the live UI; src/practice-catalog.js:61, 213.
- Some descriptions promise any key, but progressions offer six keys and scale/ear training offers seven. Either provide all twelve or describe the available selection accurately. web/pr_js.js:365–374; src/practice-catalog.js:83.
- Make a melody creates backing chords and an empty tab block. It does not capture what the player improvised. The help explains this, but the card could be clearer; recording/replaying an idea would be a useful later enhancement. web/pr_js.js:1022.
- The catalogue supplies categories and difficulty badges, but no short beginner route, prerequisites, or clear graduation criteria. A Start here route would help more than another large group of cards.
- Ear training is a useful introduction, with a fixed major-pentatonic source and three-note phrases by default. Repeat this phrase, manual reveal, adjustable length and a simple self-check would make it more complete. src/note-exercises.js:187; web/pr_js.js:613.
- Practice takes its instrument from the song/configuration context rather than offering a visible instrument/tuning choice in the practice screen. Make that context explicit, especially for baritone and guitar players. web/pr_js.js:44.
- The accessibility tree still exposes the song library behind the practice overlay. The overlay is a div with a dialog role, and opening it does not explicitly move focus into it. Review focus entry, trapping and restoration, background inertness, labels for paired chord controls and routine fields, and announcements of changing cues. web/pr_markup.html:1; web/pr_js.js:1366.
- Chord diagrams honour left-handed configuration, but the animated fretboard uses a fixed left-to-right layout. Clarify the convention and provide consistent handedness support. web/pr_js.js:47, 799.

## Recommended sequence

1. Make progress durable and fix timer/navigation cleanup.
2. Remove automatic instruction pop-ups; provide optional exercise-specific Help with an always-visible Close control on phones.
3. Make presets predictable and save personal settings; add the last three practised exercises to the home screen, with durable history.
4. Add end-of-attempt counting and a compact phone playing view.
5. Save configured routine steps and add a short beginner route with explicit success criteria.
6. Correct labels, broaden key selection and improve accessibility.
7. Extend ear training and melody capture only after the existing daily-practice workflow is dependable.

## Release follow-through: 4.50.0

Implemented the core review recommendations: durable browser progress and separate practice backups; shared timer cancellation; optional exercise-specific help with a sticky close control; the last three started exercises; complete defaults and saved personal settings; manual end-of-minute score entry; a compact phone playing view; configurable and reorderable routine steps; contextual clean results with optional speed increases; a beginner starting route; all twelve keys; exactly three notes in three-note noodling; visible instrument and handedness controls; keyboard focus handling and readable mirrored fretboards.

Ear training now offers adjustable phrase length and repeat/new-phrase actions. Melody creation explicitly produces a template rather than promising to capture playing. Audio recording, a note-finding trainer and a larger ear-training curriculum remain later feature proposals, following the original recommendation to improve the existing workflow before adding more exercises.

Validation includes the full existing test suite, new 4.50 regression tests, opening all 39 exercise screens without a forced help dialog, phone and desktop viewport checks, a full one-minute attempt with a score retained after reload, and a routine recalling a personalised G-to-D exercise at 85 bpm. Physical-phone audio latency and musical performance detection were not assessed.
