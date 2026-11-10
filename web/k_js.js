// ── Karaoke view ────────────────────────────────────────
        // Words on screen, several lines at once; the current line is lit and a line under
        // each chord's words lengthens as its bar plays. Timing comes from src/karaoke.js.
        // 4.74: the web player runs this same code (web/k_js.js, k_css.css, k_markup.html are
        // copies, checked by tools/sync-karaoke.js). What only the desktop has, trouble spots,
        // is used only where it's there (karaokeTroubleSpots).
        const karaokeEl = document.getElementById('karaoke');
        const karaokeLines = document.getElementById('karaokeLines');
        const karaokeTroubleSpots = typeof learnAddTrouble === 'function';
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
          holder.hidden = !karaokeShapesOn() || Boolean(karaokeView.learn); // 4.39: no shapes when playing from memory
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
          // picked (4.44): the strings in order instead of the strokes
          const steps = bar.pickSteps
            ? stripSteps(bar.pickSteps.map((sym) => (sym === '·' ? '-' : 'P')).join(''), bar.beats || schedule.beatsPerBar).map((st, i) => ({ ...st, symbol: bar.pickSteps[i] }))
            : stripSteps(bar.pattern, bar.beats || schedule.beatsPerBar);
          const learnShown = learnMode(bar.line);
          drawStrip(`bar${index}`, learnShown === 'hide' ? '?' : (learnShown === 'number' ? learnNumeral(bar.chord) : bar.chord), false, steps);
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

        // 4.73: the words are sized to the screen, not in pixels: the same look on a phone, a laptop
        // or a TV, and bigger in full screen. A−/A+ make them relatively smaller or bigger (the
        // scale, saved); a size chosen in pixels before (karaoke_size; 26 was the usual) becomes a scale.
        function karaokeScale() {
          const pb = state.config?.playback || {};
          const scale = Number(pb.karaoke_scale) || (Number(pb.karaoke_size) ? Number(pb.karaoke_size) / 26 : 1);
          return Math.max(0.5, Math.min(2.5, scale));
        }
        function karaokeSize() {
          const box = karaokeLines.getBoundingClientRect();
          const W = box.width || window.innerWidth;
          const H = box.height || window.innerHeight;
          // about 30 letters' worth of width, or 10 lines of height, whichever is smaller
          return Math.round(Math.max(16, Math.min(160, Math.min(W / 30, H / 10) * karaokeScale())));
        }
        function applyKaraokeSize() {
          karaokeLines.style.setProperty('--k-size', `${karaokeSize()}px`);
          karaokeView.current = -1; // re-centre the current line
        }
        // the screen changes size (a window resized, full screen): the words follow
        new ResizeObserver(() => { if (!karaokeEl.hidden) applyKaraokeSize(); }).observe(karaokeLines);
        // 4.73: full screen (F, or the button): the browser bar and window frame go; the bar slides
        // away after a few seconds without the mouse moving. Not on an iPhone (no full screen there).
        const karaokeFullButton = document.getElementById('karaokeFull');
        const fullscreenOn = () => document.fullscreenElement || document.webkitFullscreenElement || null;
        if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) karaokeFullButton.hidden = true;
        function toggleKaraokeFull() {
          if (fullscreenOn()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
          const go = karaokeEl.requestFullscreen || karaokeEl.webkitRequestFullscreen;
          if (go) Promise.resolve(go.call(karaokeEl)).catch(() => {});
        }
        let karaokeIdleTimer = null;
        function karaokeAwake() {
          karaokeEl.classList.remove('k-idle');
          clearTimeout(karaokeIdleTimer);
          if (karaokeEl.classList.contains('k-full')) karaokeIdleTimer = setTimeout(() => karaokeEl.classList.add('k-idle'), 3000);
        }
        const onFullChange = () => {
          const full = fullscreenOn() === karaokeEl;
          karaokeEl.classList.toggle('k-full', full);
          karaokeFullButton.setAttribute('aria-label', full ? 'Leave full screen' : 'Full screen');
          karaokeFullButton.title = full ? 'Leave full screen (F or Esc)' : 'Full screen (F): the words as big as the screen allows; Esc to leave';
          karaokeFullButton.setAttribute('aria-pressed', String(full));
          karaokeAwake();
        };
        document.addEventListener('fullscreenchange', onFullChange);
        document.addEventListener('webkitfullscreenchange', onFullChange);
        karaokeFullButton.addEventListener('click', toggleKaraokeFull);
        for (const type of ['mousemove', 'pointerdown', 'keydown']) karaokeEl.addEventListener(type, karaokeAwake);

        // 4.39: what a chord shows when playing from memory: itself, its number, or "?"
        function learnMode(line) {
          const L = karaokeView.learn;
          if (!L) return 'show';
          return L.plan.lines[line] || L.plan.fallback;
        }
        function learnNumeral(chord) {
          const L = karaokeView.learn;
          const bare = String(chord || '').replace(/[↓↑]+.*$/, '').replace(/:.*$/, '').replace(/\s.*$/, '');
          return L && L.key ? window.ukemusic.learn.numeral(bare, L.key) : bare;
        }
        function learnInfo(ir) {
          const L = karaokeView.learn;
          if (!L) return '';
          const stage = { repeats: 'chords the first time only', numbers: 'chords as numbers', none: 'no chords' }[L.opts.stage] || '';
          let legend = '';
          if (L.opts.legend && L.key) {
            const chords = ir.filter((n) => n.type === 'chord' && !n.noChord && n.content).map((n) => n.content);
            legend = window.ukemusic.learn.keyLegend(chords, L.key, L.key).map((x) => `${x.numeral} = ${x.chord}`).join(' · ');
          }
          return ` · From memory: ${stage}${legend ? ` · ${legend}` : ''}`;
        }
        function learnChordEl(chordEl, chord, line) {
          const mode = learnMode(line);
          if (mode === 'show' || !chord) return;
          if (mode === 'number') {
            chordEl.textContent = learnNumeral(chord);
            chordEl.classList.add('k-number');
            return;
          }
          chordEl.textContent = '?';
          chordEl.classList.add('k-hidden');
          chordEl.title = 'Click to see the chord';
          chordEl.addEventListener('click', (event) => {
            event.stopPropagation(); // not "play from here"
            chordEl.textContent = chord;
            chordEl.classList.remove('k-hidden');
            chordEl.classList.add('k-revealed');
            const needed = karaokeView.learn?.needed;
            if (needed) needed.set(`${line}:${chord}`, { line, chord });
          }, { once: true });
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
              // 4.43: from memory, the tab fades too: each bar as its chord shape and the order the
              // strings are picked, then nothing (tap to see it)
              const tabMode = learnMode(line.line);
              const passage = karaokeView.learn && karaokeView.learn.picking ? karaokeView.learn.picking[line.line] : null;
              if (tabMode !== 'show' && karaokeView.learn) {
                const box = document.createElement('div');
                box.className = 'k-pick';
                const summary = passage ? window.ukemusic.learn.passageText(passage, '  ·  ') : 'Picking';
                if (tabMode === 'number') box.textContent = summary;
                else {
                  box.textContent = '? Picking, from memory';
                  box.classList.add('k-hidden');
                  box.title = 'Tap to see the shapes and the picking';
                  box.addEventListener('click', (event) => {
                    event.stopPropagation();
                    box.textContent = summary;
                    box.classList.remove('k-hidden');
                    box.classList.add('k-revealed');
                    karaokeView.learn.needed.set(`${line.line}:tab`, { line: line.line, chord: 'the picking' });
                  }, { once: true });
                }
                span.append(box, bar);
              } else span.append(pre, bar);
              el.appendChild(span);
              karaokeLines.appendChild(el);
              karaokeView.lines.push({ line, el, pieces: [{ piece: line.pieces[0], span, bar, done: false }], played: line.start === null && line.line < startLine, tabMarks: tabMode !== 'show' && karaokeView.learn ? [] : tabMarks, tabStep: -2 });
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
              if (!piece.chord && piece.carried && piece.text.trim() && learnMode(line.line) === 'show') { // (not when playing from memory: it would give the chord away)
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
            if (karaokeView.learn && karaokeTroubleSpots && learnTroubleLines().has(line.line)) el.classList.add('k-trouble');
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

        let releaseKaraokeFocus;
        function karaokeStart(ir, schedule, startLine, endLine = 0, learn = null) {
          karaokeView.schedule = schedule;
          // 4.39: playing from memory: which lines show their chords, as numbers, or hidden
          const keep = karaokeView.learn && learn && karaokeView.learn.opts === learn ? karaokeView.learn.needed : null;
          if (learn) {
            const shift = (Number.isFinite(learn.transpose) ? learn.transpose : state.transpose) - songCapo();
            const analysis = window.ukemusic.progressions.analyse(ir, { key: learn.key || learnKey(shift) }); // the web player passes the key
            karaokeView.learn = { opts: learn, plan: window.ukemusic.learn.fadePlan(ir, analysis, learn.stage), key: analysis.key, needed: keep || new Map() };
            // 4.43: the tab's bars as shapes and picking patterns, by line
            const instrumentId = songInstrument(effectiveConfig()).id;
            karaokeView.learn.picking = Object.fromEntries(window.ukemusic.learn.pickingSummary(ir, chordLibraryFor(instrumentId), { instrument: instrumentId }).map((x) => [x.line, x]));
          } else karaokeView.learn = null;
          karaokeView.library = chordLibraryFor(songInstrument(effectiveConfig()).id);
          karaokeView.shapesKey = null;
          karaokeView.shapesIndex = -1;
          document.getElementById('karaokeShapesToggle').setAttribute('aria-pressed', String(karaokeShapesOn()));
          drawKaraokeShapes(-1);
          karaokeView.current = -1;
          clearStrip();
          document.getElementById('karaokeTitle').textContent = state.song?.title || 'New song';
          document.getElementById('karaokeTrouble').hidden = !learn || !karaokeTroubleSpots;
          document.getElementById('karaokeInfo').textContent =
            `${learn && learn.legend && karaokeView.learn?.key ? `In ${karaokeView.learn.key.name}` : keyLabel(learn && Number.isFinite(learn.transpose) ? learn.transpose : state.transpose)}${songCapo() ? ` · capo ${songCapo()}` : ''}${learnInfo(ir)}`;
          karaokeRender(ir, schedule, startLine, endLine);
          const opening = karaokeEl.hidden;
          karaokeEl.hidden = false;
          if (opening) releaseKaraokeFocus = UkeSongUI.enterOverlay(karaokeEl);
          for (const line of karaokeLines.querySelectorAll('[data-line]')) { line.tabIndex = 0; line.setAttribute('role','button'); line.setAttribute('aria-label','Play from this line'); }
          karaokeLines.scrollTop = 0;
          document.getElementById('karaokePlay').disabled = false;
          document.getElementById('karaokePlay').textContent = 'Pause';
          document.getElementById('karaokeStop').disabled = false;
          if (!karaokeView.raf) karaokeView.raf = window.requestAnimationFrame(karaokeTick);
        }

        function karaokeStopped() {
          document.getElementById('karaokePlay').textContent = 'Play';
          clearStrip();
          document.getElementById('karaokePlay').disabled = false;
          document.getElementById('karaokeStop').disabled = true;
        }

        function karaokeClose() {
          state.userStopped = true;
          if (player && player.playing) player.stop();
          if (fullscreenOn() === karaokeEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          karaokeEl.hidden = true;
          // 4.39: how playing from memory went (4.40: the chords you needed are trouble spots)
          if (karaokeView.learn) {
            const needed = [...karaokeView.learn.needed.values()];
            if (needed.length && karaokeTroubleSpots) learnAddTrouble(needed.map((n) => ({ line: n.line, chord: n.chord, from: 'memory' })));
            showToast(needed.length ? `From memory: you looked at ${needed.length} chord${needed.length === 1 ? '' : 's'}` : 'From memory: you didn\'t need to look at a chord', {
              detail: needed.length ? `${needed.map((n) => `${n.chord} (line ${n.line})`).join(', ')}: ${karaokeTroubleSpots ? 'they\'re in your trouble spots (Learn → Practise trouble spots). Loop them' : 'practise those'}, then try again.` : 'Next: try it with fewer chords shown, or in another key.'
            });
            karaokeView.learn = null;
          }
          if (karaokeView.raf) window.cancelAnimationFrame(karaokeView.raf);
          karaokeView.raf = null;
          if (releaseKaraokeFocus) { releaseKaraokeFocus(); releaseKaraokeFocus = null; } else focusEditor();
        }

        async function karaokeResize(step) {
          state.config.playback = state.config.playback || {};
          state.config.playback.karaoke_scale = Math.round(Math.max(0.5, Math.min(2.5, karaokeScale() * (step > 0 ? 1.1 : 1 / 1.1))) * 100) / 100;
          applyKaraokeSize();
          try {
            await persistConfig();
          } catch (error) {
            window.ukemusicLogError('Could not save karaoke text size', error);
          }
        }

        document.getElementById('karaokeButton').addEventListener('click', () => playSong({ karaoke: true, learn: null }));
        async function toggleKaraokePlayback() {
          try {
            if (!player?.playing) { playSong({karaoke:true,startLine:0}); return; }
            if (player.paused) { await player.resume(); document.getElementById('karaokePlay').textContent = 'Pause'; }
            else { await player.pause(); document.getElementById('karaokePlay').textContent = 'Resume'; }
          } catch (error) { setStatusMessage(error.message); }
        }
        document.getElementById('karaokePlay').addEventListener('click', toggleKaraokePlayback);
        karaokeLines.addEventListener('keydown', event => {
          if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-line]')) { event.preventDefault(); event.stopPropagation(); event.target.click(); }
        });
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
            // 4.73: Esc leaves full screen first; again closes karaoke
            if (fullscreenOn() === karaokeEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
            else karaokeClose();
          } else if ((event.key === 'f' || event.key === 'F') && !event.ctrlKey && !event.metaKey && !event.altKey && !event.target.closest('input, select, textarea')) {
            event.preventDefault();
            if (!karaokeFullButton.hidden) toggleKaraokeFull();
          } else if ((event.key === ' ' || event.code === 'Space') && !event.target.closest('button, input, select')) {
            event.preventDefault();
            toggleKaraokePlayback();
          } else if ((event.key === 't' || event.key === 'T') && karaokeView.learn && karaokeTroubleSpots && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            karaokeMarkTrouble();
          }
        });
