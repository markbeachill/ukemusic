# Interface review: working inside a song

Reviewed 30 October 2026 against ukemusic 4.50.0, commit 62cebb1.

Implementation: v4.51.0 addresses these findings. The web edition adds the compact overview/player, scoped settings and reset, recoverable serialized saving, accurate shared archive wording, passage navigation, accompaniment selection separate from playback, print/PDF, queue preview, editing help and accessible overlays. Desktop retains its existing writing workflow while adding a compact transport, section playback, shared pause/resume state, clearer labels and written-versus-fallback accompaniment information. The ribbon remains available and collapsible; it has not been replaced with a new navigation system.

Validation includes the full automated suite, save-failure/retry and concurrent-save regression tests, audio pause/resume tests, desktop script checks, and interactive web/desktop checks. Physical-phone keyboard behaviour and live Dropbox changes to other members' devices still require real-device/shared-folder testing.

## Overall assessment

The interface supports a substantial set of useful musical tasks. Its basic vocabulary—song sheet, Edit, Play, Learn, key and capo—is understandable. The main problem is the organisation and explanation of those capabilities: the user needs too much prior knowledge about where a feature lives, what a control changes, and whether that change is personal, shared or global.

| Criterion | Assessment |
| --- | --- |
| Logical | The main activities make sense. Settings and advanced features cross several different groups, and some entry points do not match the user's likely task. |
| Clear | Core buttons are clear. Several short labels, icons and setting scopes need more explanation at the point of use. |
| Consistent | Similar settings and actions behave differently across screens and editions. Playback navigation and song-versus-device settings are the most consequential examples. |
| Effective | Capable for experienced users. Phone space, resuming playback and finding the right tool make common tasks harder than necessary. |

## Scope

I inspected the published web player at normal desktop width and at 390 × 844, using Amazing Grace and Danny Boy. I inspected the song sheet, More settings, editing and its preview/details tabs, Learn, Pick, Karaoke and Download. I opened play-along and closed it afterwards. I also launched the desktop app, opened Amazing Grace, and visually inspected the editor/preview workspace and the File, Play and This song ribbon controls, alongside the relevant source.

Storage failures and Dropbox deletion were inspected in code; I did not induce a save failure or delete a song. Native playback, exports, physical-phone keyboard behaviour and audio latency were not exhaustively tested. No song text or application code was changed. Opening Edit adopts the starter collection into local browser storage as part of the existing application behaviour.

## What works well

- The song sheet is the main content, with obvious access to editing and playing. The desktop editor/preview arrangement is appropriate for writing.
- Key, capo and tempo are directly adjustable. Current/next chord shapes and rhythm cues are useful during playback.
- Words & chords, Details and Notes form an understandable editing structure on the web.
- Learn's choices have short explanations of their purpose. Picking includes examples adapted to the song's time signature.
- Download choices explain their contents, including whether they use the original song text or the currently displayed key. That level of explanation should be used elsewhere.
- The desktop has a useful distinction between the song's written facts and how it is played, including an explanatory note in Info. The distinction needs to be more obvious in control names and shared across the web edition.

## Findings and recommendations

### 1. High usability priority: the opening view can hide the actual song

On the phone, Amazing Grace opens with the header, key/capo controls, chord diagrams, tune notation and strum information above the lyrics. A large fixed player occupies the bottom. No lyrics are visible in the initial viewport. Danny Boy also puts diagrams and strum information ahead of the verse, although the absence of notation makes the effect less pronounced on desktop.

The interface gives supporting material the first opportunity to use the screen, even when the user's immediate task is to sing or play a familiar song.

Make the first verse easy to reach immediately. Put the full chord collection, tune and strum explanation in a compact, collapsible song overview; retain quick ways to expand them. When stopped, keep the player compact rather than displaying all current/next chord diagrams continuously. During playback, show the live information that helps the player follow along. Provide a visible Jump to section control.

Acceptance: a normal phone can show the title, essential transport and the opening lyrics together without first scrolling through all the supporting material.

Evidence: live phone and desktop screenshots; web/app.html:385, 410, 415.

### 2. High: the effect and storage scope of changes are insufficiently visible

The web song toolbar changes personal choices held on this device. Edit → Details changes the song's own facts and can sync through Dropbox. Display settings such as layout and text size apply across songs on the device. These controls can look equally permanent and equally song-specific.

For example, a player might slow a song using the player, then expect that tempo to arrive on another device. Changing the tempo in Details has a different purpose and effect. The distinction is useful, but should not require knowing the implementation or remembering a note on the library screen.

Group controls under explicit scope labels: Playing choices on this device, Song details saved with the song, and Display preferences for all songs. Offer Reset playing choices to the song's settings. Make the original key, sounding key and capo chord shapes understandable together. A compact summary such as Sounds in C · Capo 2 · Play Bb shapes would explain the capo relationship more clearly than a single unqualified Key value.

The desktop already exposes more of the written-versus-played distinction, but several global settings remain explained mainly through tooltips. Use the same concepts and terminology in both editions.

The desktop also needs to distinguish a fallback from an override. In the inspected song, This song → Strum showed Default: Simple while the preview displayed the song's explicit Island pattern. Both are valid states, but the visible Strum label does not explain that this setting applies only where the written song supplies no pattern. Show As written: Island separately from Default for unmarked passages, and make a deliberate override a clearly named action.

Evidence: web/app.html:1352–1396, 1490–1515, 1722–1779; desktop index.html:1887–1961, 2448–2454.

### 3. High: deletion text understates the effect of Dropbox sharing

The editor says that a deleted song is still on the desktop, and the confirmation asks about deleting it from this device. For a Dropbox-linked song, removal queues it for archiving in the shared songs folder at the next sync. Other members can be affected.

Make the action and confirmation depend on the actual storage mode. For a linked song, explain that it will be archived in the shared Dropbox folder and that the change reaches other devices. Provide a clear recovery route. Keep local removal clearly distinct from a shared archive action.

This is a source-confirmed wording problem; I did not execute a deletion.

Evidence: web/app.html:473, 764–776, 1589–1605.

### 4. High: save failure feedback can disappear when Done is pressed

The editor has useful Saving / Saved / Not saved feedback. However, flushEdit clears the dirty flag before attempting storage and does not return success to closeEditor. Done closes the editor even after the save reports failure. A user can leave the warning behind without resolving it, and a later flush may have no dirty change to retry.

Keep unsaved state until storage succeeds. On failure, keep the warning visible and provide Retry and Save a local copy. Done should preserve or explicitly resolve the unsaved state. Explain autosave visibly when entering Edit, especially for a shared song; a tooltip on Done is insufficient on touch screens.

This is a code finding, not a deliberately reproduced storage failure.

Evidence: web/app.html:1428–1441, 1541–1552.

### 5. Medium: playback needs clearer control of position

In the normal web song view, Stop followed by Play starts at the beginning. Tapping a sheet line jumps only while playback is already active. Karaoke offers a different interaction and a separate From the start action. It is awkward to stop, work on a passage, and resume exactly where intended.

Provide consistent Play/Pause/Resume, an explicit Restart, and Play from here while stopped. A section selector or simple progress control would make long songs easier to navigate. Apply the same interaction rules in normal playback, Karaoke and learning modes where possible. Keep a clearly named Stop if stopping and pausing have different intended effects.

Evidence: web/app.html:2011–2035; web/k_markup.html; web/k_js.js.

### 6. Medium: feature placement does not consistently follow the task

On the web, a player finds the picking workflow under Learn, or chooses picking inside a selector labelled Strum. The desktop has its own Pick tab, with playback controls duplicated from Play. The desktop also has nine top ribbon tabs, a separate editor tab row, and settings that appear in several locations.

The capabilities are legitimate; finding them should require fewer guesses. Put strumming and picking together under an Accompaniment choice in the playing controls. Keep Learn focused on learning the current song. Make song details and playing settings easy to distinguish, and give display preferences one recognisable home. Keep File/export and advanced configuration available through secondary menus. Consolidate duplicate controls so they share the same state, wording and explanation. The native app already offers ribbon collapse; retain it and make the compact state easy to use when playing rather than writing.

Avoid a wholesale redesign as the first step: retain familiar entry points while making the primary route clear.

Evidence: live Learn/Pick screens; web/app.html:390, 540, 1705, 2177–2234; index.html:1798–1808, 2129–2320.

### 7. Medium: selecting a setting and starting a mode are mixed together

Choosing a pattern in the Pick dialog saves the choice, closes the dialog and starts Karaoke. Choosing a pattern in the Strum selector changes the accompaniment in place. A user comparing patterns may not expect the first route to change screens and start playing immediately.

Separate selection from an explicit Play / Hear example action, or label the combined action clearly as Play in Karaoke. Keep the selected pattern, current mode and return path visible. The user should be able to preview a pattern briefly and continue comparing choices without repeatedly reopening the workflow.

Evidence: web/app.html:1773–1778, 2186–2204.

### 8. Medium: labels and icons need a consistent vocabulary

Examples include Plays for instrument, Strum containing picked accompaniment, Time for time signature, Info on desktop versus Details on the web, Standard versus Song sheet, Stage versus Stage copy, and Session as an unexplained standalone word. The phone truncates even a short song title when Edit, More and Download compete for space.

Use Instrument, Accompaniment and Time signature where those are the actual meanings. Prefer Details consistently for metadata. Make the purpose of Karaoke and Session discoverable with short visible descriptions such as Follow-along lyrics and Group screen. Use a consistent label for song display styles across editions. Give the title more room, potentially by moving less frequent actions into a labelled menu.

Touch users should not need hover tooltips to understand the primary choices. The bar-line insertion button also needs an accessible action name rather than just the | character.

Evidence: live screens; web/app.html:374–405, 450–455; index.html ribbon and View controls.

### 9. Medium: large overlays need the same accessibility treatment as Free Practice

While Karaoke is active, the accessibility tree still exposes the underlying song screen and focus remains on its launching control. The overlay has a dialog role, but lacks the background isolation and focus handling recently added to Free Practice. Changing appearance and playback state should also be clear to keyboard and screen-reader users.

Move focus into overlays, keep background controls out of the active interaction, restore focus on close, and ensure navigation actions work by keyboard. Review tab semantics and labels across editor tabs, icon buttons and clickable lyric lines. Preserve the reduced-motion behaviour already used for following the song.

Evidence: live accessibility tree; web/k_markup.html:1; web/k_js.js opening/closing functions; web/app.html playback line-click handler.

### 10. Smaller workflow gaps

- More contains playback, musical and visual settings in one large phone panel. Separate Playing settings and Display; a sheet or drawer would avoid pushing the song far below the controls.
- Session uses the current library list/search result as its song order. Show which list it will use before entering the group screen, rather than relying on the user to remember the library filter.
- Editing insertion buttons are useful on touch devices. Explain what each inserts through optional, focused help, and keep the user's editing position when switching to and from Preview. This review did not assess a physical phone keyboard.
- The web download menu explains formats well but has no direct Print / Save PDF action for the main chord sheet. A direct print route would improve the common take-this-to-rehearsal workflow.
- Song key, capo, accompaniment and tempo changes need an obvious return-to-original action. Repeated minus/plus presses are a poor substitute for resetting a group of personal playing choices.

## Suggested sequence

1. Correct the shared-deletion wording and make save failures recoverable.
2. Label the scope of settings and provide a reset for personal playing choices.
3. Compact the idle phone player and song overview so lyrics appear promptly.
4. Make playback navigation consistent and expose Play from here while stopped.
5. Put accompaniment choices together, simplify More and align terminology across editions.
6. Apply overlay focus handling consistently; improve section navigation, printing and contextual help.

The primary design rule should be: the user can see what they are doing, what will change, and where they will return, without leaving the song to work it out.
