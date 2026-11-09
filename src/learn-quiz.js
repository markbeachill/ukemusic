// "Next chord?" (4.39; one copy since 4.75): the song's chord changes one at a time; pick the chord
// that comes next, and hear each answer. The questions and the choices come from src/learn.js
// (quizQuestions, quizOptions); this is the screen, shared by the desktop app and the web player.
//
//   const quiz = UkeLearnQuiz.create({ els, learn, play, onMiss, onAgain, showLine, context, missedNote })
//     els        { progress, body, before, after, from, options, result, next, hear }: the dialog's parts
//     learn      window.ukemusic.learn
//     play       (chords) => …   play these chords, one after the other (the app's player)
//     onMiss     (question) => …  a wrong answer (the desktop keeps it as a trouble spot)
//     onAgain    () => …          "Again" at the end: start a new round
//     showLine   show the question's line number ("line 12")
//     context    letters of the words either side of the change
//     missedNote (n) => …  what the end says about the n missed
//   quiz.start({ list, chords, key })   list from learn.quizQuestions; chords: the song's chords
//   quiz.state                         { list, i, score, answered, … }
(function (root) {
  function create({ els, learn, play, onMiss = null, onAgain = () => {}, showLine = false, context = 40, missedNote = (n) => ` Practise the ${n === 1 ? 'one' : 'ones'} you missed, then try again.` }) {
    const quiz = { list: [], i: 0, score: 0, answered: false, chords: [], key: null };
    const doc = els.options.ownerDocument;

    function show() {
      const q = quiz.list[quiz.i];
      if (!q) {
        els.body.hidden = true;
        els.hear.hidden = true;
        const missed = quiz.list.length - quiz.score;
        els.progress.textContent = `${quiz.score} out of ${quiz.list.length}.${missed ? missedNote(missed) : ' You know where it goes.'}`;
        els.next.textContent = 'Again';
        els.next.disabled = false;
        return;
      }
      els.body.hidden = false;
      els.hear.hidden = false;
      els.progress.textContent = `Change ${quiz.i + 1} of ${quiz.list.length}${showLine ? ` · line ${q.line}` : ''} · ${quiz.score} right so far`;
      els.before.textContent = q.before ? `${q.before.length > context ? '…' : ''}${q.before.slice(-context)}` : '';
      els.after.textContent = q.after ? `${q.after.slice(0, context)}${q.after.length > context ? '…' : ''}` : '';
      els.from.textContent = q.from;
      els.result.textContent = '';
      els.next.textContent = quiz.i + 1 < quiz.list.length ? 'Next' : 'Finish';
      els.next.disabled = true;
      quiz.answered = false;
      els.options.replaceChildren();
      for (const chord of learn.quizOptions(q, quiz.chords, quiz.key, quiz.i + 1)) {
        const cell = doc.createElement('div');
        cell.className = 'lq-opt';
        const pick = Object.assign(doc.createElement('button'), { type: 'button', textContent: chord, className: 'lq-pick' });
        pick.dataset.chord = chord;
        pick.addEventListener('click', () => answer(chord));
        const hear = Object.assign(doc.createElement('button'), { type: 'button', textContent: `▶ ${q.from} → ${chord}`, className: 'lq-hear' });
        hear.title = 'Hear it: does it sound right?';
        hear.addEventListener('click', () => play([q.from, chord]));
        cell.append(pick, hear);
        els.options.appendChild(cell);
      }
    }
    async function answer(chord) {
      if (quiz.answered) return;
      quiz.answered = true;
      const q = quiz.list[quiz.i];
      const right = chord === q.to;
      if (right) quiz.score += 1;
      for (const b of els.options.querySelectorAll('.lq-pick')) {
        if (b.dataset.chord === q.to) b.classList.add('right');
        else if (b.dataset.chord === chord) b.classList.add('wrong');
      }
      els.result.textContent = right ? `Yes: ${q.from} → ${q.to}.` : `It's ${q.to}: ${q.from} → ${q.to}.`;
      els.next.disabled = false;
      if (!right && onMiss) await onMiss(q);
      play([q.from, q.to]);
    }
    function start({ list, chords = [], key = null }) {
      Object.assign(quiz, { list, i: 0, score: 0, answered: false, chords, key });
      els.next.textContent = 'Next';
      show();
    }
    els.next.addEventListener('click', () => {
      if (quiz.i >= quiz.list.length) { onAgain(); return; }
      quiz.i += 1;
      show();
    });
    els.hear.addEventListener('click', () => {
      const q = quiz.list[quiz.i];
      if (q) play(quiz.answered ? [q.from, q.to] : [q.from]);
    });
    return { start, show, answer, state: quiz };
  }

  const api = { create };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UkeLearnQuiz = api;
}(typeof window !== 'undefined' ? window : globalThis));
