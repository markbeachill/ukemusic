        // ── Karaoke view ────────────────────────────────────────
        // Words on screen, several lines at once; the current line is lit and a line under
        // each chord's words lengthens as its bar plays. Timing comes from src/karaoke.js.
        const karaokeEl = document.getElementById('karaoke');
        const karaokeLines = document.getElementById('karaokeLines');
        const karaokeChord = document.getElementById('karaokeChord');
        const karaokeSteps = document.getElementById('karaokeSteps');
        const karaokeView = { lines: [], current: -1, raf: null, schedule: null, startLine: 0, stripKey: null, stripCells: [] };

        // The strum strip: during the count-in the beats 1 2 3 4; then, for every bar, the
        // chord and its strokes (↓ ↑ ✕, · for a rest), with the one being played lit.
        const STROKE_SYMBOLS = { D: '↓', U: '↑', X: '✕', '-': '·' };
        function stripSteps(pattern, beatsPerBar) {
          const steps = [];
          for (const ch of String(pattern || '')) {
            if (ch === '>') {
              if (steps.length) steps[steps.length - 1].accent = true;
            } else {
              steps.push({ stroke: ch, accent: false });
            }
          }
          const perBeat = steps.length / beatsPerBar;
          steps.forEach((step, i) => {
            if (Number.isInteger(perBeat) && perBeat > 0 && i % perBeat === 0) step.num = String(i / perBeat + 1);
            else if (perBeat === 2) step.num = '&'; // the "and" between beats
            else step.num = perBeat < 1 ? String(i + 1) : '';
          });
          return steps;
        }
        function drawStrip(key, chordText, counting, steps) {
          if (karaokeView.stripKey === key) return;
          karaokeView.stripKey = key;
          karaokeChord.textContent = chordText;
          karaokeChord.classList.toggle('counting', counting);
          karaokeSteps.textContent = '';
          karaokeView.stripCells = steps.map((step) => {
            const cell = document.createElement('span');
            cell.className = `k-step${step.accent ? ' accent' : ''}${step.stroke === '-' ? ' rest' : ''}`;
            const sym = document.createElement('span');
            sym.className = 'sym';
            sym.textContent = step.symbol || STROKE_SYMBOLS[step.stroke] || step.stroke;
            const num = document.createElement('span');
            num.className = 'num';
            num.textContent = step.num || '';
            cell.append(sym, num);
            karaokeSteps.appendChild(cell);
            return cell;
          });
        }
        function lightStrip(index) {
          karaokeView.stripCells.forEach((cell, i) => {
            cell.classList.toggle('on', i === index);
            cell.classList.toggle('past', i < index);
          });
        }
        // Chord shapes in the karaoke bar: the chord now and the next two different chords
        function karaokeShapesOn() {
          try { return localStorage.getItem('ukemusic.karaokeShapes') !== '0'; } catch (_err) { return true; }
        }
        function drawKaraokeShapes(index) {
          const holder = document.getElementById('karaokeShapes');
          holder.hidden = !karaokeShapesOn() || Boolean(karaokeView.learn); // from memory: no shapes to give it away
          if (karaokeView.learn) return;
          if (holder.hidden) return;
          drawShapes(holder, karaokeView, index);
        }
        /** The chord now and the next two different ones, as diagrams, into `holder`.
         *  view: { schedule, library, shapesKey } (karaokeView, or the Play band's) */
        function drawShapes(holder, view, index) {
          const bars = view.schedule?.bars || [];
          if (!bars.length) return;
          const playable = (b) => b && !b.tab && !b.rest;
          const from = Math.max(0, index);
          const now = bars[from];
          const list = [now && now.tab ? 'Tab' : (now && now.rest ? 'N.C.' : now?.chord)];
          for (let i = from + 1; i < bars.length && list.length < 3; i += 1) {
            const name = bars[i].chord;
            if (playable(bars[i]) && name !== list[list.length - 1]) list.push(name);
          }
          const key = `${index < 0 ? 'first:' : ''}${list.join('|')}`;
          if (view.shapesKey === key) return;
          view.shapesKey = key;
          const left = effectiveConfig()?.diagrams?.left_handed;
          holder.replaceChildren(...list.filter(Boolean).map((name, k) => {
            const fig = document.createElement('figure');
            fig.className = `k-shape ${k === 0 ? 'now' : 'later'}`;
            const cap = document.createElement('figcaption');
            cap.textContent = k === 0 ? (index < 0 ? 'first' : 'now') : (k === 1 ? 'next' : 'then');
            fig.appendChild(cap);
            const definition = name === 'Tab' || name === 'N.C.' ? null : window.ukemusic.chordDefinition(view.library, name);
            if (definition) {
              fig.insertAdjacentHTML('beforeend', window.ukemusic.diagramSvg({ ...definition, name }, { left_handed: left, show_fingers: true }));
            } else {
              const label = document.createElement('div');
              label.className = 'k-shape-name';
              label.textContent = name;
              fig.appendChild(label);
            }
            return fig;
          }));
        }
        document.getElementById('karaokeShapesToggle').addEventListener('click', (event) => {
          const on = !karaokeShapesOn();
          try { localStorage.setItem('ukemusic.karaokeShapes', on ? '1' : '0'); } catch (_err) { /* session only */ }
          event.currentTarget.setAttribute('aria-pressed', String(on));
          karaokeView.shapesKey = null;
          const holder = document.getElementById('karaokeShapes');
          holder.hidden = !on;
          if (on) drawKaraokeShapes(karaokeView.shapesIndex ?? -1);
        });

        function updateStrip(t, schedule) {
          const beat = 60 / schedule.tempo;
          if (t < schedule.countInDuration) {
            const steps = Array.from({ length: schedule.beatsPerBar }, (_, i) => ({ stroke: '', symbol: String(i + 1), num: '', accent: i === 0 }));
            drawStrip('count', 'Count-in', true, steps);
            lightStrip(Math.floor(t / beat));
            return;
          }
          const bars = schedule.bars;
          let index = -1;
          for (let i = 0; i < bars.length && bars[i].time <= t; i += 1) index = i;
          karaokeView.shapesIndex = index;
          drawKaraokeShapes(index);
          const bar = bars[index];
          if (!bar) return;
          if (bar.tab) {
            // During tab the strip shows the notes being picked (set in karaokeTick)
            if (!String(karaokeView.stripKey).startsWith('tab')) drawStrip(`bar${index}`, 'Tab', false, []);
            return;
          }
          if (bar.rest) {
            drawStrip(`bar${index}`, 'N.C.', false, []);
            return;
          }
          const steps = stripSteps(bar.pattern, bar.beats || schedule.beatsPerBar);
          drawStrip(`bar${index}`, learnStripName(bar), false, steps);
          // a chord shorter than a bar (share < 1) plays the start of the pattern at the usual speed
          const barTime = bar.duration / (bar.share || 1);
          lightStrip(Math.min(steps.length - 1, Math.floor((t - bar.time) / (barTime / steps.length))));
        }
        function clearStrip() {
          karaokeView.stripKey = null;
          karaokeView.stripCells = [];
          karaokeChord.textContent = '';
          karaokeSteps.textContent = '';
        }

        // ── Learn: playing from memory (as the desktop app, 4.39) ──
        // karaokeView.learn: { opts: { stage }, plan (src/learn.js fadePlan), key, needed: Map }
        function learnMode(line) {
          const L = karaokeView.learn;
          if (!L) return 'show';
          return L.plan.lines[line] || L.plan.fallback;
        }
        function learnNumeral(chord) {
          const L = karaokeView.learn;
          return L && L.key ? window.ukemusic.learn.numeral(chord, L.key) : '?';
        }
        function learnStripName(bar) {
          const mode = learnMode(bar.line);
          return mode === 'show' ? bar.chord : mode === 'number' ? learnNumeral(bar.chord) : '?';
        }
        function learnChordEl(chordEl, chord, line) {
          const mode = learnMode(line);
          if (mode === 'show' || !chord) return;
          if (mode === 'number') { chordEl.textContent = learnNumeral(chord); chordEl.classList.add('k-number'); return; }
          chordEl.textContent = '?';
          chordEl.classList.add('k-hidden');
          chordEl.title = 'Tap to see the chord';
          chordEl.addEventListener('click', (event) => {
            event.stopPropagation(); // not "play from here"
            chordEl.textContent = chord;
            chordEl.classList.remove('k-hidden');
            chordEl.classList.add('k-revealed');
            if (karaokeView.learn) karaokeView.learn.needed.set(`${line}:${chord}`, { line, chord });
          }, { once: true });
        }

        function karaokeSize() {
          return Math.max(16, Math.min(48, Number(state.config?.playback?.karaoke_size) || 26));
        }

        function karaokeRender(ir, schedule, startLine, endLine = 0) {
          const built = window.ukemusic.buildKaraoke(ir, schedule, { startLine, endLine });
          // Looping a section: show just that section
          const lines = endLine ? built.lines.filter((l) => l.line >= startLine && l.line <= endLine) : built.lines;
          karaokeLines.textContent = '';
          karaokeLines.style.setProperty('--k-size', `${karaokeSize()}px`);
          karaokeView.lines = [];
          for (const line of lines) {
            const el = document.createElement('div');
            if (line.kind === 'heading') {
              el.className = 'k-heading';
              el.textContent = line.label;
              karaokeLines.appendChild(el);
              continue;
            }
            if (line.kind === 'tab') {
              // Tab shows as written, in the editor's fixed-width font, with one progress line
              el.className = 'k-line k-tab';
              if (line.line) { el.dataset.line = String(line.line); el.title = 'Click to play from here'; }
              const span = document.createElement('span');
              span.className = 'k-piece';
              const pre = document.createElement('pre');
              // Each note gets its own span so it can light up when it's played
              const byRow = new Map();
              (line.steps || []).forEach((step, stepIndex) => {
                for (const mark of step.marks) {
                  if (!byRow.has(mark.row)) byRow.set(mark.row, []);
                  byRow.get(mark.row).push({ ...mark, stepIndex });
                }
              });
              const tabMarks = [];
              line.text.split('\n').forEach((rowText, row) => {
                if (row > 0) pre.appendChild(document.createTextNode('\n'));
                const marks = (byRow.get(row) || []).sort((a, b) => a.col - b.col);
                let at = 0;
                for (const mark of marks) {
                  if (mark.col > at) pre.appendChild(document.createTextNode(rowText.slice(at, mark.col)));
                  const note = document.createElement('span');
                  note.className = 'k-mark';
                  note.textContent = rowText.slice(mark.col, mark.col + mark.len);
                  pre.appendChild(note);
                  tabMarks.push({ stepIndex: mark.stepIndex, el: note });
                  at = mark.col + mark.len;
                }
                if (at < rowText.length) pre.appendChild(document.createTextNode(rowText.slice(at)));
              });
              const bar = document.createElement('span');
              bar.className = 'k-progress';
              span.append(pre, bar);
              el.appendChild(span);
              karaokeLines.appendChild(el);
              karaokeView.lines.push({ line, el, pieces: [{ piece: line.pieces[0], span, bar, done: false }], played: line.start === null && line.line < startLine, tabMarks, tabStep: -2 });
              continue;
            }
            // Chords with no words (an instrumental): the chords read along the line like words,
            // after the label, each with its own progress line
            el.className = line.instrumental ? 'k-line k-instrumental' : 'k-line';
            if (line.line) { el.dataset.line = String(line.line); el.title = 'Click to play from here'; }
            if (line.label) {
              const label = document.createElement('span');
              label.className = 'k-label';
              label.textContent = line.label;
              el.appendChild(label);
            }
            if (line.grid) el.classList.add('k-grid');
            if (line.pass) el.dataset.pass = line.pass;
            const pieces = line.pieces.map((piece) => {
              if (line.grid && piece.newBar) {
                // a bar line: "|" before each bar
                const sep = document.createElement('span');
                sep.className = 'k-gridbar';
                sep.textContent = '|';
                el.appendChild(sep);
              }
              const span = document.createElement('span');
              span.className = 'k-piece';
              const chord = document.createElement('span');
              chord.className = piece.bar ? 'k-chord k-bar' : 'k-chord';
              chord.textContent = piece.chord || ' ';
              if (karaokeView.learn && piece.chord && !piece.bar) learnChordEl(chord, piece.chord, line.line);
              // Words that start before the line's first chord: the chord still playing, faintly (4.29)
              if (!piece.chord && piece.carried && piece.text.trim() && learnMode(line.line) === 'show') {
                chord.textContent = `(${piece.carried})`;
                chord.classList.add('k-carried');
                chord.title = `${piece.carried} is still playing from the line before`;
              }
              const text = document.createElement('span');
              text.className = 'k-text';
              text.textContent = piece.text.replace(/\s+$/, ' ') || ' ';
              if (!piece.text.trim()) span.classList.add('chord-only');
              if (piece.bar) span.classList.add('bar-piece');
              const bar = document.createElement('span');
              bar.className = 'k-progress';
              span.append(chord, text, bar);
              el.appendChild(span);
              return { piece, span, bar, done: false };
            });
            if (line.grid) {
              const sep = document.createElement('span');
              sep.className = 'k-gridbar';
              sep.textContent = '|';
              el.appendChild(sep);
            }
            karaokeLines.appendChild(el);
            karaokeView.lines.push({ line, el, pieces, played: line.start === null && line.line < startLine });
          }
          for (const entry of karaokeView.lines) if (entry.played) entry.el.classList.add('past');
        }

        function karaokeTick() {
          if (karaokeEl.hidden) return;
          const t = player && player.playing ? player.position() : null;
          const schedule = karaokeView.schedule;
          if (t !== null && schedule) {
            updateStrip(t, schedule);
            // Current line = the last line that has started
            let current = -1;
            karaokeView.lines.forEach((entry, i) => {
              if (entry.line.start !== null && entry.line.start <= t) current = i;
            });
            if (current !== karaokeView.current) {
              karaokeView.current = current;
              karaokeView.lines.forEach((entry, i) => {
                entry.el.classList.toggle('current', i === current);
                entry.el.classList.toggle('past', i < current || entry.played);
              });
              const el = current >= 0 ? karaokeView.lines[current].el : null;
              if (el) karaokeLines.scrollTo({ top: el.offsetTop - karaokeLines.clientHeight * 0.35 });
            }
            // Tab: light the note(s) being played, and name them in the strip
            const currentEntry = karaokeView.lines[current];
            if (currentEntry && currentEntry.tabMarks) {
              let step = -1;
              (currentEntry.line.steps || []).forEach((s, i) => { if (s.time !== null && s.time <= t) step = i; });
              if (step !== currentEntry.tabStep) {
                currentEntry.tabStep = step;
                for (const mark of currentEntry.tabMarks) {
                  mark.el.classList.toggle('on', mark.stepIndex === step);
                  mark.el.classList.toggle('played', mark.stepIndex < step);
                }
                if (step >= 0) {
                  karaokeChord.textContent = currentEntry.line.steps[step].pitches.join(' ');
                  karaokeChord.classList.remove('counting');
                  karaokeView.stripKey = `tab${current}:${step}`;
                }
              }
            }
            // The lengthening line under each piece of the current and previous line
            for (const i of [current - 1, current]) {
              const entry = karaokeView.lines[i];
              if (!entry) continue;
              for (const p of entry.pieces) {
                const progress = window.ukemusic.pieceProgress(p.piece, t);
                p.bar.style.width = `${(progress * 100).toFixed(1)}%`;
                if (progress >= 1 && !p.done) {
                  p.done = true;
                  p.span.classList.add('done');
                }
              }
            }
          }
          karaokeView.raf = window.requestAnimationFrame(karaokeTick);
        }

        function karaokeStart(ir, schedule, startLine, endLine = 0, learn = null) {
          karaokeView.schedule = schedule;
          // from memory: which lines show their chords, as numbers, or hidden (kept on a line tap)
          const keep = karaokeView.learn && learn && karaokeView.learn.opts === learn ? karaokeView.learn.needed : null;
          if (learn) {
            const analysis = window.ukemusic.progressions.analyse(ir, { key: learn.key });
            karaokeView.learn = { opts: learn, plan: window.ukemusic.learn.fadePlan(ir, analysis, learn.stage), key: learn.key, needed: keep || new Map() };
          } else karaokeView.learn = null;
          karaokeView.library = chordLibraryFor(songInstrument(effectiveConfig()).id);
          karaokeView.shapesKey = null;
          karaokeView.shapesIndex = -1;
          document.getElementById('karaokeShapesToggle').setAttribute('aria-pressed', String(karaokeShapesOn()));
          drawKaraokeShapes(-1);
          karaokeView.current = -1;
          clearStrip();
          document.getElementById('karaokeTitle').textContent = state.song?.title || 'New song';
          const stageText = { repeats: 'chords the first time only', numbers: 'chords as numbers', none: 'no chords' };
          document.getElementById('karaokeInfo').textContent =
            `${keyLabel(state.transpose)}${songCapo() ? ` · capo ${songCapo()}` : ''}${karaokeView.learn ? ` · From memory: ${stageText[karaokeView.learn.opts.stage] || ''}` : ''}`;
          karaokeRender(ir, schedule, startLine, endLine);
          karaokeEl.hidden = false;
          karaokeLines.scrollTop = 0;
          document.getElementById('karaokePlay').disabled = true;
          document.getElementById('karaokeStop').disabled = false;
          if (!karaokeView.raf) karaokeView.raf = window.requestAnimationFrame(karaokeTick);
        }

        function karaokeStopped() {
          clearStrip();
          document.getElementById('karaokePlay').disabled = false;
          document.getElementById('karaokeStop').disabled = true;
        }

        function karaokeClose() {
          state.userStopped = true;
          if (player && player.playing) player.stop();
          karaokeEl.hidden = true;
          // how playing from memory went
          if (karaokeView.learn) {
            const needed = [...karaokeView.learn.needed.values()];
            setStatusMessage(needed.length ? `From memory: you looked at ${needed.map((n) => n.chord).join(', ')}. Practise those, then try again.` : 'From memory: you didn\'t need to look at any chords.');
            karaokeView.learn = null;
          }
          if (karaokeView.raf) window.cancelAnimationFrame(karaokeView.raf);
          karaokeView.raf = null;
          focusEditor();
        }

        async function karaokeResize(step) {
          state.config.playback = state.config.playback || {};
          state.config.playback.karaoke_size = Math.max(16, Math.min(48, karaokeSize() + step));
          karaokeLines.style.setProperty('--k-size', `${karaokeSize()}px`);
          karaokeView.current = -1; // re-centre the current line
          try {
            await persistConfig();
          } catch (error) {
            window.ukemusicLogError('Could not save karaoke text size', error);
          }
        }

        document.getElementById('karaokeButton').addEventListener('click', () => playSong({ karaoke: true }));
        document.getElementById('karaokePlay').addEventListener('click', () => playSong({ karaoke: true, startLine: 0 }));
        document.getElementById('karaokeRestart').addEventListener('click', () => playSong({ karaoke: true, startLine: 0, fromStart: true }));
        // Click a line in karaoke to play from there (4.22)
        document.getElementById('karaokeLines').addEventListener('click', (event) => {
          const line = event.target.closest('[data-line]');
          if (!line) return;
          playSong({ karaoke: true, startLine: Number(line.dataset.line) });
        });
        document.getElementById('karaokeStop').addEventListener('click', () => stopPlayback());
        document.getElementById('karaokeClose').addEventListener('click', karaokeClose);
        document.getElementById('karaokeSmaller').addEventListener('click', () => karaokeResize(-2));
        document.getElementById('karaokeBigger').addEventListener('click', () => karaokeResize(2));
        window.addEventListener('keydown', (event) => {
          if (karaokeEl.hidden) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            karaokeClose();
          } else if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault();
            if (player && player.playing) stopPlayback();
            else playSong({ karaoke: true });
          }
        });

        window.__k = { learnOpts: () => (karaokeView.learn ? karaokeView.learn.opts : null), start: karaokeStart, stopped: karaokeStopped, close: karaokeClose, view: karaokeView };
