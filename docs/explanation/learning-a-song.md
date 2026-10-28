# How ukemusic helps you learn a song

*An explanation of the Learn tab: what it works out from a song, where the ideas come from, and how far they can be trusted.*

Mark Beachill · ukemusic 4.43 · October 2026

## Summary

ukemusic's **Learn** tab turns a song file into practice: playing from memory with the chords fading out, a quiz on what comes next, a list of trouble spots, and a one-page **learn sheet**. To do that, the app has to understand the song. It finds the key, numbers the chords, splits the song into parts, names the familiar chord patterns, places the chords on the circle of fifths, and ranks the chord changes by how hard they are for the fingers.

This paper explains each step. The music theory behind it is standard and well understood. The learning methods come from well-established research on memory. The way the two are joined up, and several of the rules the app uses, are our own rules of thumb. They have been checked by hand against eight songs but not tested on a large collection. They have not been tested with players either. The last section says plainly which parts are which.

## 1. Why a song needs analysing at all

A chord sheet tells you what to play, line by line, but it doesn't help you remember it. Experienced players rarely remember a song as a long list of chords. They remember it as a few patterns in a key ("it's a one–four–five, the chorus goes to the six"), the order of the parts ("verse, chorus, verse, chorus, middle, chorus twice"), and the places they tend to trip.

So the Learn tab tries to give a beginner the same view: the shape of the song, in numbers and patterns, so that there is less to learn and it sticks better. Everything below serves that aim.

## 2. Finding the key

Every later step depends on the key, because the numbers (I, IV, V…) are counted from it.

If you have set the song's key (**Info → Written in**), ukemusic uses that. Otherwise it guesses, in three stages:

1. **Fit to the scale.** For each of the twelve possible home notes, every chord in the song scores points if it belongs to that major scale (I, ii, iii, IV, V, vi, vii°, and V7), a few points if its root fits but its type doesn't (a "borrowed" chord), and loses a point if it doesn't fit at all. Repeated chords count each time.
2. **Where the song starts and ends.** The chord a song starts on, and even more the one it ends on, is usually home. These get extra weight. A major key and its relative minor use the same chords. Which of the two it is depends on whether the song comes home to the major or the minor chord.
3. **Where the parts start** (added in 4.41). Some songs live on a riff whose chords fit a different scale better than the song's real key. A funk riff on Dm, F and G fits C major best, but it is in D minor. Higher Ground is an example. So if most of the song's parts start on one chord, and the song itself starts on it, and it is played about as much as any other chord, that chord is taken as home.

The same guess is used everywhere in the app: the status bar, the library, Chord patterns, the learn sheet and the web player. That way they never disagree about a song's key.

**Where it comes from.** Working out a key from the notes is an old problem in music psychology and computing. The best-known method compares how often each note is played with listeners' sense of which notes belong to a key (Krumhansl, 1990). Later work refined it (Temperley, 1999). ukemusic only has chord names, not notes, so it uses a simpler chord-based version of the same idea. It scores fit to a scale, as those methods do, and adds the rules players use by ear: the home chord tends to start and end the song, and the parts tend to start on it too.

## 3. Numbering the chords and what they do

Once the key is known, each chord gets a **Roman numeral**: its step in the key, upper case for major chords and lower case for minor ones. In C, G7 is V7, Am is vi, and B♭ is ♭VII. This is Roman-numeral analysis, the standard way harmony has been taught for two centuries. Its great advantage for learning is that **a song in numbers is the same in every key**. If you know Stand by Me as I–vi–IV–V, you know it in C, G or D.

Each numeral then gets a short description of what that chord *does*, drawn from **functional harmony**: I is home, IV is away, V is tension that wants to go home, vi is "the sad home", ii "leads to five". Since 4.41 these depend on whether the key is major or minor. In A minor, F (VI) is "away, warm". In C, A major (VI) "leads to two", because it is the five of D minor. Chords from outside the key are explained one by one:

- **Borrowed:** Fm in C is "the sad four (iv), borrowed from C minor".
- **The five of another chord:** D7 in C is "the five of G: it leads to G".
- **A passing colour:** anything that is neither.

## 4. Finding the song's parts

The song is split into **blocks** at its `[[headings]]` and at blank lines. Blocks with the same chords, in the same order, are one **part**, and the parts are lettered A, B, C. The **words** then help name them:

- A part whose words come back each time is a **chorus**.
- The same chords with new words each time is a **verse**.
- A part played once, before the words start, is an **intro**.
- A part played once with words in the middle of the song is a **bridge**.
- Headings you've written always win.

Some special cases are handled:

- When the verse and the chorus share the same chords, the map says so ("Chorus and Verse").
- If the only words that come back are the first verse sung again at the end, they are not mistaken for a chorus.
- A part that is just the start of another is shown as such ("Refrain = the start of C"), and so is one made of two others ("= the start of B, then A").
- Whether a part keeps its words is reported as "the same words each time", "mostly the same", "new, with some coming back", or "new each time".

This is how the learn sheet can say "9 parts, but only 4 chord patterns to learn" and "learn the verse first: it comes 4 times".

**Where it comes from.** The idea is **chunking**: memory holds a few meaningful groups far better than many separate items (Miller, 1956). Experts see larger, more meaningful groups than novices do (Chase & Simon, 1973). Musicians who play from memory organise a piece by its sections and the landmarks within them (Chaffin & Imreh, 2002). The rules for spotting and naming parts, though, are ours.

## 5. Naming the familiar patterns

Each part's chords, in numbers, are compared with a list of well-known progressions:

- **Four-chord pop:** I–V–vi–IV.
- **The 50s / doo-wop:** I–vi–IV–V.
- **The three-chord trick**, **the Amen** (I–IV–I) and **home and away** (I–V–I).
- **Turnarounds:** ii–V–I and II7–V7–I.
- **Minor-key patterns:** the Andalusian descent, the minor folk progression.

A match is shaded on the chord map where it happens, numbered in song order, and explained once, with a song you may know. The same loop started in a different place (four-chord pop and its "sad" version starting on vi) is shown once, not twice.

A name helps only if you've met the pattern before. The point is that the second time you see "Four-chord pop" in another song, you already know a third of it.

## 6. The circle of fifths

The twelve major chords are arranged so each is a fifth from the next, with their relative minors inside. The learn sheet turns the circle so the song's **home chord is at the top**. Its closest chords, IV and V, are either side and its minors are inside. The chords the song uses are lit, and arrows show its most common moves.

The moves are described by their numbers first ("five to one: the strongest pull home"; "four to one, the Amen sound"). The circle is used only for the rest ("one step anticlockwise", "a jump"). In a minor key, the major five (E7 in A minor) is counted as part of the key's family, because that is how minor-key songs come home.

**Where it comes from.** The circle of fifths has been used to teach the relationships between keys and chords since the early eighteenth century. Its usefulness here is visual: most songs stay in a small neighbourhood of the circle, and most changes are a step round it.

## 7. Which changes are hardest

For every change in the song (C → G7, F → Fm…), ukemusic compares the two chord shapes finger by finger:

- Does each finger **stay** put, **slide** along its string, **move** to another string, **go down** or **lift**?
- Moving to a new string counts most, then a slide, a new finger and a lift.
- A barre adds to the score, and a finger that stays put lowers it.

The changes are ranked, and the hardest five are printed with plain instructions ("keep your ring finger where it is; put your index finger across the G C E strings at the 2nd fret"). Each comes with a drill in Free Practice.

**Where it comes from.** Practising a hard change on its own is standard teaching advice: drill the difficult transitions separately, then put them back in context. The scoring weights, though, are our own judgement and have not been measured against what players find hard.

## 8. Tab: shapes and picking patterns

Since 4.43, ukemusic also reads tab. Each bar is split off at its `|` and read two ways:

- **The shape.** The bar's fretted notes are compared with the shapes of the song's chords (and any chord written above the tab). If at least 70% of the notes sit in one shape (an open string counts when the shape leaves it open), the bar is "in" that shape. Only when every bar of a passage is in a shape is the passage read as picked chords. Otherwise it is a tune, and no shapes are named: half-labelling a tune would mislead more than it helps.
- **The picking pattern.** The strings in the order they are picked, by name as players say them (g C E A on a ukulele, with the high g in lower case), with notes picked together joined by +: "g-C-E-g+A".

That allows **part practice**: the tab is learned in layers. First the chords under it, strummed, so the fretting hand knows the changes. Then the picking pattern on open strings, so the picking hand learns it alone. Then both, slowly, and then in time. For a tune, step 1 plays its notes slowly instead. From memory fades the tab like the chords: "Hold C, pick g-C-E-A" in place of the tab, then nothing.

Teachers commonly describe fingerpicking as a chord held and a pattern picked, but tab never says which chord a bar sits on. Naming it automatically is our own addition. It only helps with one kind of tab, picked chords under a song, which is common for beginners. Much ukulele fingerstyle is melody, or melody over chords, and there the app says no more than "a tune".

**Where it comes from.** Teaching fingerpicking as "a chord shape held, a pattern picked" is standard for guitar and ukulele. Splitting a skill into parts and slowing it down is long-standing advice; research suggests it helps most when the parts can be practised on their own, as the two hands can here (Wightman & Lintern, 1985). The 70% threshold is our own and has been checked only on a few songs.

### Picking a strummed song

Since 4.44, any song can be picked instead of strummed (the **Pick** tab). The chord in each bar and its shape are already known, so the app only has to decide which string each finger picks. On a ukulele it follows the usual teaching, a finger to a string (thumb g, index C, middle E, ring A); on a guitar the thumb takes the chord's bass note, as guitar teachers advise. The five patterns are the standard ones, from one string a beat to the alternating thumb (Travis picking), which is the same part-practice idea: one new thing at a time.

This is picked **accompaniment**: the tune is left to the singer, as with strumming. Published picking for songs like House of the Rising Sun and Scarborough Fair is exactly this; we checked four songs against published ukulele arrangements. A picked **solo** ("chord melody", with the tune on the top strings and the chord under it) is different and needs the tune itself, which a chord sheet doesn't hold. To help the singer, a song can say its first note; it's sounded with the first click of the count-in.

A song can also carry its tune (`{melody}` lines, by note name). Then ukemusic can play the tune quietly while you learn, and make a simple chord melody: each tune note placed on the chord shape you're holding (its own fret if the shape has the note, otherwise the nearest fret, on the top strings first), with a chord note under it on beat 1. That's the first level of a published chord-melody arrangement; real arrangers also fill in harmony between tune notes and choose keys and positions by ear, which ukemusic doesn't attempt.

The pick sheet is laid out the way fingerstyle songbooks are: chord boxes for the left hand, then tab for the right, with the chord over the bar where it starts and the words under it. With picked chords the two say the same thing in two ways: hold the shape, and every fret number in the tab is already under a finger. Tab written in the song itself is always kept as written.

## 9. Turning the analysis into practice

The analysis feeds four ways of practising, each based on well-supported findings about memory:

- **From memory**, with chords shown only the first time each part comes, then as numbers, then not at all. Recalling something strengthens memory far more than reading it again: the **testing effect** (Roediger & Karpicke, 2006). The fading steps make recall gradually harder.
- **Next chord?**, a quiz on each change in the song, with the words either side. This is retrieval practice again, with feedback, and you can hear each choice.
- **Trouble spots**, collected from the chords you looked at while playing from memory, the quiz answers you missed, and the lines you marked. You then loop them slowly. Practice is most useful where the errors are.
- **The learn sheet's last advice**: come back in a day or two, then in a week. Spacing practice out over days beats doing it all at once: the **spacing effect** (Cepeda et al., 2006). Both this and retrieval practice are rated among the most effective study methods in a large review (Dunlosky et al., 2013).

## 10. How sound is it?

| Part | Basis | How far to trust it |
|---|---|---|
| Roman numerals, chord functions, circle of fifths | Standard music theory | Sound, once the key is right |
| Practising from memory, spacing, chunking | Well-established memory research | Sound principles; the way ukemusic applies them hasn't been tested with players |
| Key guessing | Chord-based version of published key-finding ideas, plus our own rules | Right on all 23 songs it was checked on after the 4.41 fixes, but that is a small test. Setting the key removes the guess |
| Splitting into parts, naming them, "mostly the same words" | Our own rules of thumb | Checked by hand on 8 songs; unusual layouts will confuse it |
| Named patterns | Common songwriting practice | Reliable for the patterns on the list; others go unnamed |
| Difficulty of changes | Our own scoring | Plausible, not measured |
| Tab as shapes and patterns | Standard fingerpicking teaching; our own 70% rule | Right on simple picked chords; anything else is treated as a tune, with no shapes named |

**Known limits.** ukemusic counts a chord written in the words as one bar unless you give it a length (`[C:2]`), so a chord map is only as accurate as the song file. A song that changes key part-way, or sits between two keys, will be numbered from one key throughout. Patterns not on the list get numbers but no name.

**How it was checked.** For version 4.41, learn sheets were made for eight songs and every statement was checked by hand against the song. Four were traditional songs: House of the Rising Sun, Danny Boy, It's a Long Way to Tipperary and Nobody's Fault but Mine. Four were songbook songs, chosen to test known patterns, a guessed key and a riff. Twenty-two problems were found and fixed. Each fix has an automated test (`test/v441.test.js`).

**What would test it properly.** A larger set of songs with their keys and sections marked by hand, to measure the key and part detection. And players: learning comparable songs with and without the learn sheet, and seeing which they can still play a week later.

## References

- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380.
- Chaffin, R., & Imreh, G. (2002). Practicing perfection: Piano performance as expert memory. *Psychological Science*, 13(4), 342–349.
- Chase, W. G., & Simon, H. A. (1973). Perception in chess. *Cognitive Psychology*, 4(1), 55–81.
- Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving students' learning with effective learning techniques. *Psychological Science in the Public Interest*, 14(1), 4–58.
- Wightman, D. C., & Lintern, G. (1985). Part-task training for tracking and manual control. *Human Factors*, 27(3), 267–283.
- Krumhansl, C. L. (1990). *Cognitive Foundations of Musical Pitch*. Oxford University Press.
- Miller, G. A. (1956). The magical number seven, plus or minus two. *Psychological Review*, 63(2), 81–97.
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning: Taking memory tests improves long-term retention. *Psychological Science*, 17(3), 249–255.
- Temperley, D. (1999). What's key for key? The Krumhansl–Schmuckler key-finding algorithm reconsidered. *Music Perception*, 17(1), 65–100.

*The code is in `src/learn.js`, `src/progressions.js` and `src/keys.js`. A shorter explanation is on the website: [How Learn works](how-learn-works.md).*
