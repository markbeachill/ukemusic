# ukemusic · Practise this song

Two reviews of ukemusic v4.99.19, compiled for product analysis and possible follow-up work. Repository links are relative to this file in `docs/`.

## 1. How the feature works and what would work better

**Keep the editable practice plans and make a real passage from the song the default starting point.** The best flow is to play a short passage, work on whatever makes it difficult, then play it again in context. The current drills are useful, especially for beginners and club leaders. They would work better as help you can reach from the song.

### Current behaviour

**Practise this song** typically gives you about 12 minutes of chord shapes, two estimated hard changes, a strum exercise and a chord-sequence exercise. It then offers **Play from memory**. On desktop it can add marked trouble spots. A player or club leader can edit the plan, print it on the learn sheet and share it with the song.

Two problems were reproduced with a small test song:

- **A section step loses the song’s timing.** `Section Chorus` turns the chorus into a chord list. It collapses repeated chords and feeds the result into an exercise that gives each chord one bar. If the tricky part is fitting two changes in one bar or holding a chord for the right length, the drill changes the thing you need to learn.
- **A trouble spot can point to the wrong change.** A marked F in a chorus followed G. The plan suggested C → F because that was the first approach to F elsewhere in the song. The app already has the marked line, so it can work from that passage. [Song practice logic](../src/song-practice.js)

The timer gives a session structure, but it advances without knowing whether the player can play the passage. In a small study of advanced pianists, accurate practice attempts were associated with better next-day performance, while total practice time wasn’t. That supports letting players judge when a passage is ready, with the timer there to help them budget. [Duke, Simmons and Cash, 2009](https://doi.org/10.1177/0022429408328851)

### Approaches considered

| Approach | Best use |
| --- | --- |
| The current guided plan | A beginner wants help with individual skills, or a club leader wants everyone to follow the same sequence. |
| A simple section loop | The player knows where they get stuck and wants to repeat it immediately. |
| A passage loop with drills on demand | Best default for song practice. The player hears and plays the song straight away, with a way to isolate a chord change or strum when needed. |

One proposed flow is for **Learn → Practise this song** to open on the last marked trouble spot or, for a new song, the first playable section. Show the words and chords, give a count-in, and loop the passage at a comfortable speed using the song’s own timing and strum. Offer **Again**, **Slower** and **That was clean**. After a clean pass, suggest playing a little faster or including the line before and after. Finish with **Play the song with chords**, with **Play from memory** alongside it for players who are ready.

Start by reusing both apps’ section playback for `Section` steps and matching trouble spots to the change at the marked line. That improves existing custom plans as well as the proposed default flow. Then offer the existing shapes, changes and strum drills from that passage, so the player can work on the problem and immediately try it again in the song.

**Verification.** The review traced the shared planner and both apps’ entry points, reproduced both issues against the planner, and ran `npm test` successfully. The proposed flow has not been tested with players.

## 2. Detailed UI review

**The guided session makes sense, but it feels like a series of Free Practice exercises rather than one lesson for the song.** Most exercises tell you what to do once you’re in them. It’s harder to see which step you’re on, why you’re doing it, and how to change the plan. Editing is workable if you know the text format, but it’s cumbersome for ordinary changes, especially on a phone.

### Starting and following a plan

The entry is easy to find. On desktop it has a named button under Learn, and on the phone it has its own card. Both start the plan immediately. A short preview could show **5 steps · about 12 minutes**, with **Start**, **Start at a step** and **Edit plan**. It should show the plan that will actually run, including any custom steps.

| Step | What’s clear | Suggested change |
| --- | --- | --- |
| The shapes | The large diagram, count-in and instruction make it clear what to play. | Call it **Practise the chord shapes** and keep general exercise settings collapsed when launching from a song. |
| Hard changes | The current and next chord diagrams show what your fingers need to do. | Put **Am → G7** in the main heading. In the phone test, both changes were headed **Chord switching**, and the line identifying the pair and countdown was clipped. |
| The strum | The moving beat and strum symbols help once it’s running. | Show **Listen → Muted → One chord → With changes** throughout the step and highlight the current phase. The general instruction about four steady bars doesn’t say when to listen or join in. |
| The chords in order | The beat and next chord are easy to follow. | Call the current exercise **Strum the chord sequence**. If a step is called **Play the chorus**, show the chorus and preserve its actual timing. |
| Finish | The completion card is visible and **Play from memory** works. | Offer **Play with chords** as well. Make **Repeat this step** return to the finish screen after one step. The current selector restarts at the selected step and continues through the rest. |

The running header is the biggest layout problem. The desktop screenshot clips parts of it. At iPhone width, just **164 px** were available for the song name, step number, step name and time together. Give **Step 2 of 5 · Am → G7** its own line and put the countdown beside it. **Pause**, **Next step** and **End plan** would clarify which actions affect the exercise and which affect the session. Offer first-time help inline or on demand. Three separate help dialogs interrupted the first run through five steps. [Desktop practice screen](../site/img/song-practice.webp)

### Editing the plan

The desktop’s live preview beside the chord sheet is worth keeping. It’s the clearest part of the editor, and it cannot be edited directly. On the phone, editing requires turning on all features and going through **Edit → Practice**. **Add step** offered 60 choices for Amazing Grace, then inserted a line into the text. Changing two minutes to one, moving a step, or deleting one all require editing that text. **Keep this plan** sits beside a workflow that saves automatically, so it’s unclear whether it needs to be pressed. [Desktop plan editor](../site/img/guide/desktop-R14.jpg)

**Use one plan screen with editable rows.** Tap a row to change its exercise, time, tempo or note. Give it **Move up**, **Move down** and **Remove** actions. In **Add step**, show choices from the song first and put the full catalogue behind **More exercises**. Keep **Edit as text** for club leaders and anyone who wants to paste or customise a whole plan. The existing **My routine** editor provides a pattern for the row controls.

A smaller change would be to keep the text editor and add a preview before starting. That would improve the launch, but ordinary editing would still be awkward. A **Practise a section** shortcut could also start a quick loop from the song sheet. For the existing guided plan, fix the running header first and then make the plan preview editable.

**Verification.** The review used existing desktop captures and walked through all five steps, adding a step and opening karaoke from the finish screen, in Chromium at iPhone size. It advanced with **Next** without waiting out the timers. `npm test` passed.

## Handoff for further analysis

These reviews cover two related decisions. The first asks what practice should sound and feel like. The second asks how players should start, follow and edit a guided plan. The proposed passage-first default and the proposed plan preview are two possible entry points to reconcile. A practical design is to offer a quick passage loop from the song sheet and a preview for the full guided plan. Decide whether both need to appear under **Practise this song**.

| Area | Evidence or starting point |
| --- | --- |
| Passage fidelity | Compare `sectionSequence()` and `resolvePlan()` with actual song playback. Check repeated chords, multiple changes in a bar, count-in and the section’s written strum. [Planner](../src/song-practice.js) · [Playback scheduling](../src/playback-schedule.js) |
| Trouble spots | Test the same destination chord approached from different chords in different sections. Check that the marked passage determines the change. [Planner](../src/song-practice.js) |
| Running plan | Keep the current task, step number and countdown readable together at phone width. Check that pause, skip, repeat and end have distinct results. [Shared practice markup](../web/pr_markup.html) · [Shared practice styles](../web/pr_css.css) · [Shared practice logic](../web/pr_js.js) |
| Editing | Try changing duration and tempo, moving and removing a step, adding a section, and reopening the song. Any editor design should preserve existing plain-text plans, song sharing, and learn-sheet output. [Desktop app](../index.html) · [Web player](../web/app.html) |
| Existing tests and guidance | Check current behaviour against the latest checkout before recommending changes. Follow the project guidance for shared desktop and web practice code and UI review. [Project guide](../AGENTS.md) · [Plan tests](../test/v49917.test.js) · [Plan transfer tests](../test/v49919.test.js) |

The reviewed behaviour is specific to v4.99.19. The design recommendations are proposals for evaluation.
