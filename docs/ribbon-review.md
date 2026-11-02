# Review: the desktop ribbon

Reviewed 2 November 2026 against ukemusic 4.52.0 with the uncommitted "Tidier ribbon buttons" changes, from the UI review pictures (`npm run ui-review -- desktop`) and the ribbon at 1440 and 1120 pixels wide.

Findings 1 (folding instead of wrapping) and 4 (labels and alignment) have been done, with the Accompaniment tab renamed Picking; see CHANGELOG.md (Unreleased).

## Overall assessment

The ribbon holds a great deal, and the recent tidy-up helped: shorter labels, one height for every tab, captions under groups. What's left is mostly about **where things live** and **how the ribbon copes with a smaller window**. A player who knows what they want can find it; a new player sees nine tabs of similar weight and the same actions in several places.

| Criterion | Assessment |
| --- | --- |
| Logical | Tabs mix tasks (Play, Learn) with properties (Song, Display) and one panel opener (Settings). Key and tempo controls appear on three tabs. |
| Clear | Most labels are plain. Unlabelled dropdowns ("At the top", "Chords first time", "None: strummed") rely on their current value to explain themselves. |
| Consistent | Buttons, checkboxes and dropdowns sit at different heights; dialog buttons have an ellipsis on some and not others; disabled buttons don't say why. |
| Effective | Fine at 1440 wide. At 1120 groups wrap into a second row and, because every tab now takes the tallest tab's height, some tabs show a large empty band. |

## Findings and recommendations

### 1. High: at smaller window sizes the ribbon wraps and takes a third of the screen

At 1120 pixels wide (a common laptop window), Display, Play and Learn wrap their groups onto a second row. The ribbon grows from about 220 to about 300 pixels, and since all tabs share the tallest height, Accompaniment shows a large empty area. Display already runs off the edge at 1440 ("Chords ab…").

Recommend the usual ribbon approach: **groups shrink rather than wrap**. As the window narrows, a group first drops its button labels to icons with tooltips, then collapses into one button with a ▾ menu holding its controls (for example Display's "Sheet and tab" becomes one "Sheet ▾" button). Fix the height at one row of large buttons. Keep "Hide the tools" (the ˅ at the right) and remember the choice.

*Acceptance:* at 1120 and 1440 wide every tab is one row of the same height, with nothing cut off.

### 2. High: the same actions live in several places

- **Playing:** Play/Pause, Stop and Play from section are in the top bar; Play, Stop, Restart and Karaoke are again on the Play tab; Play, Stop and Karaoke again on Accompaniment; Learn starts play with "Play with fewer chords". Three Stop buttons can be on screen at once, and the top bar says "Play" on some screens and "Play / Pause" on others.
- **Key:** the song's key is on Song (Original (in C), − +, Keys ▾), the Play tab has "Original key / full speed", and Learn has "Key G" with "Play in new key".
- **Tempo:** on Song (Tempo) and on Play (− 120 + and Tap tempo).

Recommend **one transport**: keep Play/Pause, Stop and Play from section in the top bar only, always visible and always worded the same, and take Play/Stop off the Play and Accompaniment tabs. The tabs then hold what changes *how* it plays (Karaoke, Group screen, tempo, loop, sound, picking pattern). Keep the key and capo on one tab (Song), and make Learn's "Play in new key" a choice there or a clearly temporary "practise in…" control that says it doesn't change the song.

*Acceptance:* each action has one home; a second entry point, where kept, has exactly the same name and look.

### 3. High: tabs mix "things to do" with "settings of the song"

Nine tabs: File, Write, Song, Display, Export, Play, Learn, Accompaniment, Settings. "Song" (key, capo, instrument, tempo, time) is hard to tell from "File" and "Display" when everything is about the song, and **Settings is not a set of tools** but a button that opens a panel.

Recommend:
- **Settings** as a gear button at the right end of the tab bar (beside Hide the tools), not a tab. Its ribbon contents ("This song's settings…", About) move to the gear menu and Help.
- Rename **Song** to say what's in it, e.g. **Key & time** (key, capo, instrument, tempo, time signature, strum).
- Fold **Export** into **File** (Office's pattern: File holds Save, Export, Print), or keep Export but move "Exports folder" and "Every saved key" into the Export dialog, leaving one big **Export…** button and the Stage format.
- Order the tabs by the life of a song: **File · Write · Key & time · Display · Play · Learn · Accompaniment**, with the gear at the end.

*Acceptance:* seven or eight tabs, each named for what the player wants to do; no tab that only opens something else.

### 4. Medium: unlabelled dropdowns and mixed control heights

Several dropdowns have no label and show only their value: Display "At the top" (diagrams), Learn "Chords first time", Accompaniment "None: strummed", Play "Real ukulele" and "Auto feel". Controls also sit at different heights: dropdowns with labels above (Song, Export), dropdowns at the top with labels below the group (Display), checkboxes at the top (Play, Learn).

Recommend one pattern for every group: **a short label above each dropdown** ("Diagrams", "Chord help", "Pattern", "Sound", "Feel"), large buttons with the icon above the label, and small controls stacked in at most two rows. Group captions underneath stay as they are.

### 5. Medium: some buttons show as greyed with no reason

"Stop" is grey when nothing plays (expected), but "Tab in steps…" is grey on songs without tab, with nothing to say why. A player can't tell whether it's broken.

Recommend a tooltip on every disabled control saying what it needs ("For songs with a tab block: add one with Write → Insert tab"), or hide controls that can never apply to this song.

### 6. Medium: dialog buttons and menus aren't marked consistently

Some buttons that open a window end with "…" (Changes…, Tab in steps…, Suggest…, Edit style…) and some don't (Patterns, Circle of fifths, Versions, Rename, Pick sheet). Some buttons are menus (Keys ▾, Options ▾, Tab look ▾, Choose picking ▾, Write out ▾).

Recommend: **"…" on every button that opens a window**, **▾ on every button that opens a menu**, nothing on buttons that act straight away. It tells the player what will happen before they click.

### 7. Medium: the hint line costs a row on every tab

The line under the ribbon ("Point at a button to see what it does", or a tab's summary) takes about 30 pixels on every tab. The new per-tab summaries help newcomers, but experienced players don't need them.

Recommend tooltips (with the same text) as the main help, and the hint line only until the player has used the ribbon for a while, or as an option (Settings → App appearance → "Show hints under the tools").

### 8. Lower: keyboard use

The ribbon is mouse-first. Recommend key tips as in Office: **Alt** shows a letter on each tab, then on each button (Alt, P, K for Play → Karaoke), and **Ctrl+F1** to hide or show the tools. Make sure Tab/arrow keys move along a tab's buttons and that every dropdown has an accessible name (the 4.5x changes started this).

### 9. Lower: small wording points

- "Practise trouble spots" and "Play with fewer chords" are long for a ribbon: "Trouble spots" and "From memory" (with the chord-help choice beside it) fit better and match the web player's Learn menu.
- "Original key / full speed" reads as two things: "Reset key & speed".
- "Save new" → "Save as new"; "Paste from web" → "Paste from website" (it's a short word to add, and clearer).
- File's group caption "This song" now clashes with the renamed Song tab.

## Suggested order

1. Group shrinking and a one-row ribbon (finding 1): it affects every tab and every laptop user.
2. One transport and one home for key and tempo (finding 2).
3. Settings as a gear, Song renamed, Export folded in (finding 3).
4. Labels and alignment, disabled reasons, … and ▾ (findings 4–6).
5. Hint line, key tips and wording (findings 7–9).

After each step, run `npm run ui-review -- desktop` and compare with this review's pictures in Compare apps.
