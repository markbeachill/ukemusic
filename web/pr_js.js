        // ── Practice: a menu of exercises, and one player for them all ──────────────
        // src/practice-catalog.js lists the exercises; each opens one of the trainers
        // (pr.mode) with its preset. Chord trainers (strum, blues, change, drill, noodle) play
        // song text through the usual playback; note trainers (spider, notes) play a note list
        // (src/finger-exercises.js, src/note-exercises.js) on the animated fretboard; the
        // metronome and one-minute changes have their own little engines. Progress (time, tempos,
        // clean rounds, scores, routines) is kept in practice.json in the songs folder.
        const practiceEl = document.getElementById('practice');
        const T = window.ukemusic.training;
        const F = window.ukemusic.fingers;
        const NL = window.ukemusic.notesLib;
        const PL = window.ukemusic.practiceLib;
        const PP = window.ukemusic.practiceProgress;
        const pr = { view: 'home', cat: 'warmup', mode: 'strum', exId: null, schedule: null, from: 0, raf: null, stopping: false, shown: {}, changesBase: 0, barBase: 0, tick: null, progress: null, session: null, routine: null };
        const $p = (id) => document.getElementById(id);
        const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
        const todayKey = () => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };
        const fmtClock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

        function escapeHtmlText(text) {
          return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }
        function prStrumOptions(select, preferred, { extra = [] } = {}) {
          const strums = window.ukemusic.strums;
          select.replaceChildren(...strums.map((s) => new Option(`${s.name} · ${s.pattern}${s.beats !== 4 ? ` (${s.beats}/4)` : ''}`, s.pattern)), ...extra.map(([v, l]) => new Option(l, v)));
          const pick = strums.find((s) => s.name === preferred || s.pattern === preferred);
          if (pick) select.value = pick.pattern;
        }
        function prChordSelects(rootSel, typeSel, chord) {
          if (!rootSel.options.length) {
            rootSel.replaceChildren(...T.ROOTS.map((r) => new Option(r, r)));
            typeSel.replaceChildren(...T.TYPES.map((t) => new Option(t.label, t.suffix)));
          }
          const m = String(chord).match(/^([A-G][#b]?)(.*)$/);
          if (m) {
            rootSel.value = T.ROOTS.includes(m[1]) ? m[1] : ({ Db: 'C#', 'D#': 'Eb', Gb: 'F#', 'G#': 'Ab', 'A#': 'Bb' }[m[1]] || 'C');
            typeSel.value = T.TYPES.some((t) => t.suffix === m[2]) ? m[2] : '';
          }
        }
        const prChordOf = (rootSel, typeSel) => `${rootSel.value}${typeSel.value}`;
        function prInstrument() { return songInstrument(effectiveConfig()).id; }
        function prLibrary() { return chordLibraryFor(prInstrument()); }
        function prTuning() { return window.ukemusic.instrument(prInstrument()).strings; }
        function prDiagram(name, frets = null, fingers = null) {
          const library = prLibrary();
          const definition = frets ? T.definitionFromFrets(frets, name, fingers) : window.ukemusic.chordDefinition(library, name);
          if (!definition) return `<div class="pr-note">No diagram for ${escapeHtmlText(name)} on this instrument.</div>`;
          return window.ukemusic.diagramSvg({ ...definition, name }, { left_handed: effectiveConfig()?.diagrams?.left_handed, show_fingers: true });
        }
        const chordList = (text) => String(text || '').split(/[\s,|]+/).filter((c) => c && window.ukemusic.parseSong(`[${c}]`, { useDelimiters: false }).some((n) => n.type === 'chord'));
        const strumBeats = (pattern) => (window.ukemusic.strums.find((s) => s.pattern === pattern)?.beats) || 4;

        // ── Progress (practice.json in the songs folder) ──
        function prLoadProgress() {
          try {
            pr.progress = PP.read(songsFolder());
          } catch (_err) {
            pr.progress = { version: 1, exercises: {}, days: {}, routines: PP.defaults() };
          }
          return pr.progress;
        }
        function prSaveProgress() {
          try {
            PP.write(songsFolder(), pr.progress);
          } catch (error) {
            window.ukemusicLogError('Could not save practice progress', error);
          }
        }
        function prRefreshToday() {
          if (!pr.progress) return;
          const today = todayKey();
          const secs = PP.todaySeconds(pr.progress, today) + (pr.session ? pr.session.seconds : 0);
          const streak = PP.streak(pr.progress, today);
          $p('prToday').textContent = `Today ${PP.formatMinutes(secs)}${streak > 1 ? ` · ${streak} days in a row` : ''}`;
        }
        // Time on an exercise counts while it plays; it's logged when it stops
        function prSessionStart() {
          if (!pr.exId) return;
          pr.session = pr.session && pr.session.exId === pr.exId ? pr.session : { exId: pr.exId, seconds: 0, since: null };
          pr.session.since = performance.now();
          pr.session.tempo = pr.mode === 'oneminute' ? null : prTempo();
        }
        function prSessionPause() {
          if (pr.session && pr.session.since) {
            pr.session.seconds += (performance.now() - pr.session.since) / 1000;
            pr.session.since = null;
          }
        }
        function prSessionSeconds() {
          if (!pr.session) return 0;
          return pr.session.seconds + (pr.session.since ? (performance.now() - pr.session.since) / 1000 : 0);
        }
        function prSessionEnd() {
          prSessionPause();
          if (pr.session && pr.session.seconds >= 5 && pr.progress) {
            pr.progress = PP.logSession(pr.progress, pr.session.exId, { date: todayKey(), seconds: pr.session.seconds, tempo: pr.session.tempo ? prTempo() : null });
            prSaveProgress();
          }
          pr.session = null;
          prRefreshToday();
        }
        setInterval(() => {
          if (practiceEl.hidden || pr.view !== 'player') return;
          const s = prSessionSeconds();
          $p('prTimer').textContent = `⏱ ${fmtClock(s)}`;
          if (pr.session && pr.session.since) prRefreshToday();
          prRoutineTick();
        }, 500);

        // ── The menu ──
        function prRenderHome() {
          prLoadProgress();
          prRefreshToday();
          $p('prCats').replaceChildren(...PL.CATEGORIES.map((c) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = `pr-cat${c.id === pr.cat ? ' active' : ''}`;
            b.dataset.cat = c.id;
            const count = c.id === 'routine' ? (pr.progress.routines || []).length : PL.EXERCISES.filter((e) => e.cat === c.id).length;
            b.innerHTML = `<span class="pr-cat-icon">${c.icon}</span><span>${escapeHtmlText(c.name)}</span><span class="pr-cat-count">${count}</span>`;
            b.addEventListener('click', () => { pr.cat = c.id; prRenderHome(); });
            return b;
          }));
          const cat = PL.CATEGORIES.find((c) => c.id === pr.cat) || PL.CATEGORIES[0];
          $p('prCatTitle').textContent = cat.name;
          $p('prCatAim').textContent = cat.aim;
          const routines = cat.id === 'routine';
          $p('prCards').hidden = routines;
          $p('prRoutines').hidden = !routines;
          if (routines) {
            prRenderRoutines();
            return;
          }
          $p('prCards').replaceChildren(...PL.EXERCISES.filter((e) => e.cat === cat.id).map((e) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'pr-card';
            card.dataset.ex = e.id;
            const p = pr.progress.exercises[e.id];
            const meta = [];
            if (p && p.last_date) meta.push(`last ${p.last_date.slice(5).split('-').reverse().join('/')}`);
            if (p && p.last_tempo) meta.push(`${p.last_tempo} bpm`);
            if (p && p.best_tempo) meta.push(`best ${p.best_tempo} bpm`);
            if (e.mode === 'oneminute') {
              const best = PP.bestScore(pr.progress, e.id, null);
              if (best !== null) meta.push(`best ${best} changes`);
            }
            if (p && p.seconds) meta.push(PP.formatMinutes(p.seconds));
            card.innerHTML = `<span class="pr-card-top"><strong>${escapeHtmlText(e.title)}</strong><span class="pr-badge ${e.level.toLowerCase()}">${e.level}</span></span>
              <span class="pr-card-aim">${escapeHtmlText(e.aim)}</span>
              <span class="pr-card-meta">${meta.length ? escapeHtmlText(meta.join(' · ')) : 'Not tried yet'}</span>`;
            card.addEventListener('click', () => prOpen(e.id));
            return card;
          }));
        }
        function prShowHome() {
          if (player && player.playing) prStop();
          prSessionEnd();
          pr.view = 'home';
          pr.exId = null;
          $p('prHome').hidden = false;
          practiceEl.querySelector('.practice-body').hidden = true;
          $p('prBack').hidden = true;
          $p('prLevel').hidden = true;
          $p('prTimer').hidden = true;
          $p('prClean').hidden = true;
          $p('prTitle').textContent = 'Practice';
          prRenderHome();
        }

        // Open an exercise: its trainer, with its preset (and your last tempo)
        function prOpen(exId, { keepGoing = false } = {}) {
          const e = PL.EXERCISES.find((x) => x.id === exId);
          if (!e) return;
          if (player && player.playing) prStop();
          prSessionEnd();
          prSetup();
          pr.view = 'player';
          pr.exId = e.id;
          pr.exDef = e;
          $p('prHome').hidden = true;
          practiceEl.querySelector('.practice-body').hidden = false;
          $p('prBack').hidden = false;
          $p('prTitle').textContent = e.title;
          $p('prLevel').textContent = e.level;
          $p('prLevel').className = `pr-level pr-badge ${e.level.toLowerCase()}`;
          $p('prLevel').hidden = false;
          $p('prTimer').hidden = false;
          $p('prTimer').textContent = '⏱ 0:00';
          $p('prClean').hidden = ['oneminute', 'metronome', 'noodle'].includes(e.mode);
          prShowMode(e.mode, { quiet: true });
          for (const [id, value] of Object.entries(e.set || {})) {
            const el = $p(id);
            if (!el) continue;
            if (el.type === 'checkbox') el.checked = Boolean(value);
            else if (el.tagName === 'SELECT' && ![...el.options].some((o) => o.value === String(value))) {
              if (id === 'prStrum') {
                el.value = 'own';
                $p('prStrumOwn').value = String(value);
              } else {
                el.appendChild(new Option(String(value), String(value)));
                el.value = String(value);
              }
            } else el.value = String(value);
          }
          if (e.set && e.set.prProgression !== undefined) prApplyProgression();
          const last = pr.progress?.exercises?.[e.id]?.last_tempo;
          if (last && e.mode !== 'oneminute') $p('prTempo').value = String(last);
          if (keepGoing && $p('prBars').querySelector('option[value="0"]')) $p('prBars').value = '0';
          $p('prNoodleSave').hidden = !e.create;
          pr.shown = {};
          pr.fret = null;
          prKindRows();
          prPreview();
          prHelpFirstTime(e.mode);
        }

        // ── Routines ──
        function prRenderRoutines() {
          const holder = $p('prRoutines');
          holder.replaceChildren();
          const routines = pr.progress.routines || [];
          routines.forEach((r, index) => {
            const minutes = r.steps.reduce((a, s) => a + Number(s.minutes || 0), 0);
            const card = document.createElement('div');
            card.className = 'pr-routine';
            card.innerHTML = `<div class="pr-routine-head"><strong>${escapeHtmlText(r.name)}</strong><span class="muted">${minutes} min</span></div>
              <ol>${r.steps.map((s) => `<li>${escapeHtmlText(PL.EXERCISES.find((e) => e.id === s.id)?.title || s.id)} <span class="muted">· ${s.minutes} min</span></li>`).join('')}</ol>`;
            const row = document.createElement('div');
            row.className = 'pr-routine-actions';
            const start = Object.assign(document.createElement('button'), { type: 'button', className: 'primary', textContent: '▶ Start' });
            start.dataset.routine = String(index);
            start.addEventListener('click', () => prRoutineStart(index));
            const edit = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Edit' });
            edit.addEventListener('click', () => prRoutineEdit(index));
            const del = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Delete' });
            del.addEventListener('click', () => {
              pr.progress.routines.splice(index, 1);
              prSaveProgress();
              prRenderHome();
            });
            row.append(start, edit, del);
            card.appendChild(row);
            holder.appendChild(card);
          });
          const add = Object.assign(document.createElement('button'), { type: 'button', className: 'pr-routine-add', textContent: '+ New routine' });
          add.addEventListener('click', () => prRoutineEdit(-1));
          holder.appendChild(add);
        }
        function prRoutineEdit(index) {
          const holder = $p('prRoutines');
          const routine = index >= 0 ? JSON.parse(JSON.stringify(pr.progress.routines[index])) : { name: 'My routine', steps: [{ id: 'spider-1234', minutes: 2 }] };
          const form = document.createElement('div');
          form.className = 'pr-routine pr-routine-edit';
          const draw = () => {
            form.innerHTML = '';
            const name = Object.assign(document.createElement('input'), { type: 'text', value: routine.name, className: 'pr-routine-name' });
            name.addEventListener('input', () => { routine.name = name.value; });
            form.appendChild(name);
            routine.steps.forEach((step, k) => {
              const line = document.createElement('div');
              line.className = 'pr-step';
              const sel = document.createElement('select');
              for (const c of PL.CATEGORIES.filter((x) => x.id !== 'routine')) {
                const group = document.createElement('optgroup');
                group.label = c.name;
                for (const e of PL.EXERCISES.filter((x) => x.cat === c.id)) group.appendChild(new Option(e.title, e.id));
                sel.appendChild(group);
              }
              sel.value = step.id;
              sel.addEventListener('change', () => { step.id = sel.value; });
              const mins = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: 30, value: step.minutes, className: 'pr-step-min' });
              mins.addEventListener('change', () => { step.minutes = Math.max(1, Math.min(30, Number(mins.value) || 1)); });
              const rm = Object.assign(document.createElement('button'), { type: 'button', textContent: '✕', title: 'Remove this step' });
              rm.addEventListener('click', () => { routine.steps.splice(k, 1); draw(); });
              line.append(sel, mins, Object.assign(document.createElement('span'), { textContent: 'min' }), rm);
              form.appendChild(line);
            });
            const actions = document.createElement('div');
            actions.className = 'pr-routine-actions';
            const addStep = Object.assign(document.createElement('button'), { type: 'button', textContent: '+ Add an exercise' });
            addStep.addEventListener('click', () => { routine.steps.push({ id: 'chord-change', minutes: 2 }); draw(); });
            const save = Object.assign(document.createElement('button'), { type: 'button', className: 'primary', textContent: 'Save routine' });
            save.addEventListener('click', () => {
              if (!routine.steps.length) return;
              routine.name = routine.name.trim() || 'My routine';
              if (index >= 0) pr.progress.routines[index] = routine;
              else pr.progress.routines.push(routine);
              prSaveProgress();
              prRenderHome();
            });
            const cancel = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Cancel' });
            cancel.addEventListener('click', () => prRenderHome());
            actions.append(addStep, save, cancel);
            form.appendChild(actions);
          };
          draw();
          holder.replaceChildren(form);
        }
        // A routine runs its exercises one after another, each for its minutes (counted while playing)
        function prRoutineStart(index) {
          const routine = (pr.progress.routines || [])[index];
          if (!routine || !routine.steps.length) return;
          pr.routine = { routine, step: 0 };
          prRoutineStep();
        }
        function prRoutineStep() {
          const r = pr.routine;
          if (!r) return;
          const step = r.routine.steps[r.step];
          if (!step) {
            prRoutineEnd(true);
            return;
          }
          prOpen(step.id, { keepGoing: true });
          r.started = false;
          $p('prRoutineBar').hidden = false;
          prRoutineTick();
          setTimeout(() => {
            if (pr.routine === r && pr.view === 'player') {
              r.started = true;
              if (pr.mode === 'oneminute') prOneMinuteStart();
              else prStart();
            }
          }, 600);
        }
        function prRoutineTick() {
          const r = pr.routine;
          if (!r) {
            $p('prRoutineBar').hidden = true;
            return;
          }
          const step = r.routine.steps[r.step];
          if (!step) return;
          const left = Math.max(0, step.minutes * 60 - prSessionSeconds());
          $p('prRoutineText').textContent = `${r.routine.name} · ${r.step + 1} of ${r.routine.steps.length} · ${fmtClock(left)} left`;
          if (r.started && left <= 0 && pr.mode !== 'oneminute') prRoutineNext();
        }
        function prRoutineNext() {
          const r = pr.routine;
          if (!r) return;
          if (player && player.playing) prStop();
          prSessionEnd();
          r.step += 1;
          prRoutineStep();
        }
        function prRoutineEnd(finished = false) {
          const r = pr.routine;
          pr.routine = null;
          $p('prRoutineBar').hidden = true;
          if (player && player.playing) prStop();
          prShowHome();
          if (finished && r) $p('prCatAim').textContent = `Routine finished: ${r.routine.name}. Well done!`;
        }

        // ── Setup (once) ──
        function prSetup() {
          if (pr.ready) return;
          pr.ready = true;
          prStrumOptions($p('prStrum'), 'Island (calypso)', { extra: [['ladder', 'Rhythm ladder: quarters → eighths → triplets → sixteenths → syncopation'], ['own', 'Type your own…']] });
          prStrumOptions($p('prBluesStrum'), 'Swing / shuffle');
          prStrumOptions($p('prChangeStrum'), 'Simple');
          prStrumOptions($p('prNoodleStrum'), 'Island (calypso)');
          $p('prProgression').replaceChildren(new Option('Your own chords', ''), ...PL.PROGRESSIONS.map((p) => new Option(p.name, p.id)));
          $p('prProgKey').replaceChildren(...PL.KEYS.map((k) => new Option(k, k)));
          $p('prNoodleBacking').replaceChildren(...PL.PROGRESSIONS.map((p) => new Option(p.name, p.id)), new Option('12-bar blues', 'blues'), new Option('One chord (a drone)', 'drone'));
          $p('prNoodleKey').replaceChildren(...PL.KEYS.map((k) => new Option(k, k)));
          $p('prNoodleNotes').replaceChildren(...Object.entries(PL.NOODLE_SETS).map(([id, s]) => new Option(s.name, id)));
          $p('prSpider').replaceChildren(...F.PATTERNS.map((p) => new Option(p.name, p.id)));
          $p('prScaleRoot').replaceChildren(...['C', 'D', 'E', 'F', 'G', 'A', 'Bb'].map((k) => new Option(k, k)));
          $p('prScale').replaceChildren(...Object.entries(NL.SCALES).map(([id, s]) => new Option(s.name, id)));
          $p('prPickPattern').replaceChildren(...NL.PICK_PATTERNS.map((p) => new Option(p.name, p.id)));
          $p('prMelody').replaceChildren(...NL.MELODIES.map((m) => new Option(m.name, m.id)));
          $p('prBluesKey').replaceChildren(...Object.keys(T.BLUES_KEYS).map((k) => new Option(`${k}  (${T.BLUES_KEYS[k].join(', ')})`, k)));
          prChordSelects($p('prToRoot'), $p('prToType'), 'F');
          prChordSelects($p('prFromRoot'), $p('prFromType'), 'C');
          const chips = (holder, input, sets) => holder.replaceChildren(...sets.map((set) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = set;
            b.addEventListener('click', () => { $p(input).value = set; if (input === 'prChords') $p('prProgression').value = ''; prChanged(); });
            return b;
          }));
          chips($p('prChordSets'), 'prChords', ['C Am F G', 'G C D', 'C F G7', 'A D E7', 'C G Am F', 'Am Dm E7']);
          chips($p('prDrillSets'), 'prDrillSet', ['C Am F G', 'G D Em C', 'C F G7', 'A D E7', 'Dm Bb C F', 'G7 C7 D7 A7']);
          $p('prShowMe').addEventListener('click', () => prStart({ demo: true }));
          $p('prProgression').addEventListener('change', prApplyProgression);
          $p('prProgKey').addEventListener('change', prApplyProgression);
          $p('prNotesKind').addEventListener('change', prKindRows);
          for (const el of practiceEl.querySelectorAll('.practice-controls select, .practice-controls input')) {
            if (el.id === 'prVolume') continue;
            el.addEventListener('change', prChanged);
          }
          $p('prVolume').addEventListener('input', () => {
            $p('prVolumeText').textContent = `${$p('prVolume').value}%`;
            if (player) player.setVolume(Number($p('prVolume').value) / 100);
          });
          $p('prSlower').addEventListener('click', () => { $p('prTempo').value = String(prTempo() - 5); prChanged(); });
          $p('prFaster').addEventListener('click', () => { $p('prTempo').value = String(prTempo() + 5); prChanged(); });
          $p('prStart').addEventListener('click', () => (pr.mode === 'oneminute' ? prOneMinuteStart() : prStart()));
          $p('prStop').addEventListener('click', () => (pr.mode === 'oneminute' ? prOneMinuteStop(false) : prStop()));
          $p('prCount').addEventListener('click', () => prOneMinuteCount());
          $p('prBack').addEventListener('click', () => { if (pr.routine) prRoutineEnd(); else prShowHome(); });
          $p('practiceClose').addEventListener('click', closePractice);
          $p('prHelpButton').addEventListener('click', () => prHelp());
          $p('prHelpButton2').addEventListener('click', () => prHelp());
          $p('prClean').addEventListener('click', prMarkClean);
          $p('prRoutineSkip').addEventListener('click', prRoutineNext);
          $p('prRoutineEnd').addEventListener('click', () => prRoutineEnd());
          $p('prNoodleSave').addEventListener('click', prNoodleSave);
          const taps = [];
          $p('prTap').addEventListener('click', () => {
            const now = performance.now();
            if (taps.length && now - taps[taps.length - 1] > 2500) taps.length = 0;
            taps.push(now);
            const bpm = PL.tapTempo(taps);
            if (bpm) {
              $p('prTempo').value = String(bpm);
              prChanged();
            }
          });
        }
        const prTempo = () => Math.max(40, Math.min(220, Number($p('prTempo').value) || 80));
        function prApplyProgression() {
          const id = $p('prProgression').value;
          if (!id) return;
          $p('prChords').value = PL.progressionChords(id, $p('prProgKey').value).join(' ');
          prChanged();
        }
        // Rows of the Notes section that belong to one kind (scale, picking…)
        function prKindRows() {
          const kind = $p('prNotesKind').value;
          for (const row of practiceEl.querySelectorAll('[data-kind]')) row.hidden = !row.dataset.kind.split(' ').includes(kind);
          for (const row of practiceEl.querySelectorAll('[data-not-kind]')) row.hidden = pr.mode === 'notes' && row.dataset.notKind.split(' ').includes(kind);
        }

        // "That was clean": log it, and go 5 bpm faster
        function prMarkClean() {
          if (!pr.exId || !pr.progress) return;
          const result = PP.logClean(pr.progress, pr.exId, { date: todayKey(), tempo: prTempo() });
          pr.progress = result.data;
          prSaveProgress();
          $p('prTempo').value = String(result.next);
          $p('prWhere').textContent = `Logged: clean at ${result.next - 5} bpm. Next: ${result.next} bpm.`;
          prChanged();
        }

        // ── Help ──
        function prHelp() {
          const key = pr.view === 'home' ? (pr.cat === 'routine' ? 'routine' : 'all') : pr.mode;
          for (const d of document.querySelectorAll('#prHelpDialog details')) d.open = d.dataset.help.split(' ').includes(key);
          const dialog = $p('prHelpDialog');
          if (!dialog.open) dialog.showModal();
        }
        function prHelpFirstTime(mode) {
          if (!['spider', 'notes', 'noodle'].includes(mode)) return;
          let seen = '';
          try { seen = localStorage.getItem('ukemusic.practiceHelpSeen') || ''; } catch (_err) { seen = 'spider notes noodle'; }
          const key = mode === 'notes' ? 'spider' : mode;
          if (seen.split(' ').includes(key) || (key === 'spider' && seen === '1')) return;
          try { localStorage.setItem('ukemusic.practiceHelpSeen', `${seen === '1' ? 'spider' : seen} ${key}`.trim()); } catch (_err) { /* fine */ }
          prHelp();
        }

        // ── Which controls and which parts of the stage each trainer uses ──
        const STAGE = {
          strum: ['shapes', 'steps', 'beats'], blues: ['shapes', 'steps', 'beats', 'grid'], change: ['shapes', 'steps', 'beats'],
          drill: ['shapes', 'steps', 'beats'], spider: ['fret', 'legend', 'finger', 'tab', 'beats'], notes: ['fret', 'legend', 'finger', 'tab', 'beats'],
          noodle: ['fret', 'legend', 'finger', 'steps', 'beats'], metronome: ['big', 'beats'], oneminute: ['shapes', 'big']
        };
        function prShowMode(mode, { quiet = false } = {}) {
          if (mode !== pr.mode && player && player.playing) prStop();
          pr.mode = mode;
          for (const sec of practiceEl.querySelectorAll('.pr-section[data-for]')) sec.hidden = !sec.dataset.for.split(' ').includes(mode);
          for (const row of practiceEl.querySelectorAll('[data-not]')) row.hidden = row.dataset.not.split(' ').includes(mode);
          const rounds = ['blues', 'spider', 'notes'].includes(mode);
          $p('prBarsLabel').textContent = mode === 'blues' ? 'Times round the 12 bars' : (rounds ? 'Times round' : 'Bars');
          const bars = $p('prBars');
          const keep = bars.value;
          bars.replaceChildren(...(rounds
            ? [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ...(mode !== 'blues' ? [['8', '8']] : []), ['0', 'Keep going']]
            : [['4', '4'], ['8', '8'], ['12', '12'], ['16', '16'], ['32', '32'], ['0', 'Keep going']]).map(([v, l]) => new Option(l, v)));
          bars.value = [...bars.options].some((o) => o.value === keep) ? keep : (rounds ? '2' : '8');
          const parts = STAGE[mode] || [];
          practiceEl.querySelector('.pr-shapes').hidden = !parts.includes('shapes');
          $p('prSteps').hidden = !parts.includes('steps');
          $p('prBeats').hidden = !parts.includes('beats');
          $p('prFret').hidden = !parts.includes('fret');
          $p('prFingerNow').hidden = !parts.includes('finger');
          $p('prTab').hidden = !parts.includes('tab');
          $p('prLegend').hidden = !parts.includes('legend');
          $p('prGrid').hidden = !parts.includes('grid');
          $p('prBig').hidden = !parts.includes('big');
          $p('prCount').hidden = mode !== 'oneminute';
          for (const span of practiceEl.querySelectorAll('[data-legend]')) span.hidden = span.dataset.legend !== (mode === 'noodle' ? 'noodle' : 'notes');
          $p('prNowCaption').textContent = mode === 'oneminute' ? 'From' : 'Now';
          $p('prNextCaption').textContent = mode === 'oneminute' ? 'To' : 'Next';
          pr.fret = null;
          if (!quiet) prPreview();
        }

        // ── Exercises: what the controls describe ──
        // Chord trainers: { kind: 'chords', barList: [{ chords, pattern, label?, level? }], beats, … }
        // Note trainers:  { kind: 'notes', notes, names, tuning, beats: 4, key, tip }
        function prExercise() {
          const count = Number($p('prBars').value);
          const endless = count === 0;
          const mode = pr.mode;
          if (mode === 'spider') return { ...prSpiderExercise(endless ? 16 : count), endless };
          if (mode === 'notes') return { ...prNotesExercise(endless ? 16 : count), endless };
          if (mode === 'metronome') return { kind: 'metro', beats: Number($p('prMetroBeats').value) || 4, endless: true };
          if (mode === 'oneminute') return { kind: 'oneminute', from: prChordOf($p('prFromRoot'), $p('prFromType')), to: prChordOf($p('prToRoot'), $p('prToType')), beats: 4 };
          if (mode === 'blues') {
            const chart = T.bluesChart({ key: $p('prBluesKey').value, sevenths: $p('prSevenths').checked, quickChange: $p('prQuick').checked, turnaround: $p('prTurn').checked });
            const rounds = endless ? 4 : count;
            const pattern = $p('prBluesStrum').value;
            const barList = [];
            for (let r = 0; r < rounds; r += 1) for (const c of chart) barList.push({ chords: [c], pattern });
            const shapes = {};
            if ($p('prShuffle').checked) {
              for (const c of new Set(chart)) {
                const shape = T.shuffleShape(c, prLibrary(), prInstrument());
                if (shape) shapes[c] = shape;
              }
            }
            return { kind: 'chords', pattern, beats: strumBeats(pattern), barList, chart, shapes, endless };
          }
          if (mode === 'change') {
            const to = prChordOf($p('prToRoot'), $p('prToType'));
            const from = prChordOf($p('prFromRoot'), $p('prFromType'));
            const n = endless ? 32 : Math.max(2, count);
            const half = $p('prEvery').value === 'half';
            const pattern = $p('prChangeStrum').value;
            const barList = Array.from({ length: n }, (_, i) => ({ chords: half ? [from, to] : [i % 2 ? to : from], pattern }));
            return { kind: 'chords', pattern, beats: strumBeats(pattern), barList, from, to, endless };
          }
          if (mode === 'drill') {
            const set = chordList($p('prDrillSet').value);
            const n = Math.max(1, Math.round((endless ? 32 : count) / 2));
            const picks = PL.drillChords(set.length ? set : T.EASY_CHORDS, n);
            const barList = [];
            for (const c of picks) {
              barList.push({ chords: ['N.C.'], pattern: 'D', label: 'form', target: c });
              barList.push({ chords: [c], pattern: 'D', label: 'strum', target: c });
            }
            return { kind: 'chords', pattern: 'D', beats: 4, barList, endless, drill: true };
          }
          if (mode === 'noodle') return prNoodleExercise(endless ? 32 : count, endless);
          // strum (and the rhythm ladder)
          let pattern = $p('prStrum').value;
          $p('prStrumOwnRow').hidden = pattern !== 'own';
          if (pattern === 'own') pattern = $p('prStrumOwn').value.trim() || 'D-DU-UDU';
          const list = chordList($p('prChords').value);
          const chords = list.length ? list : T.EASY_CHORDS;
          const dynamics = $p('prDynamics').checked;
          const barList = [];
          if (pattern === 'ladder') {
            const rounds = endless ? 4 : Math.max(1, Math.ceil(count / (PL.LADDER.length * 2)));
            for (let r = 0; r < rounds; r += 1) {
              for (const step of PL.LADDER) for (let b = 0; b < 2; b += 1) barList.push({ chords: [chords[barList.length % chords.length]], pattern: step.pattern, label: step.name });
            }
          } else {
            const n = endless ? 32 : count;
            for (let i = 0; i < n; i += 1) barList.push({ chords: [chords[i % chords.length]], pattern });
          }
          if (dynamics) barList.forEach((b, i) => { b.level = Math.floor(i / 2) % 2 ? 'loud' : 'soft'; });
          return { kind: 'chords', pattern: barList[0].pattern, beats: strumBeats(barList[0].pattern), barList, endless };
        }

        function prSpiderExercise(rounds) {
          const tuning = prTuning();
          const names = F.stringNames(tuning);
          const id = $p('prSpider').value || '1234';
          const opts = { patternId: id, strings: tuning.length, startFret: Number($p('prStartFret').value), rounds, upAndBack: $p('prUpBack').checked, moveUp: $p('prMoveUp').checked, moveDown: $p('prStretch').checked, hop: $p('prHop').checked };
          const notes = F.spiderNotes(opts);
          let tip = F.PATTERNS.find((p) => p.id === id)?.tip || '';
          if (opts.hop) tip = 'String hopping: the picking hand jumps over a string with every note. Look at the arrow on the right, and keep the fretting fingers close to the strings.';
          if (opts.moveDown) tip = 'Stretching: up the neck the frets are close together; each round comes a fret lower, so the stretch grows a little at a time. Never force it: if it hurts, stop at that fret.';
          return { kind: 'notes', notes, names, tuning, beats: 4, key: JSON.stringify(opts) + tuning.join(','), tip };
        }
        function prNotesExercise(rounds) {
          const tuning = prTuning();
          const names = F.stringNames(tuning);
          const kind = $p('prNotesKind').value;
          let notes = [];
          let tip = '';
          if (kind === 'scale') {
            notes = NL.scaleNotes({ root: $p('prScaleRoot').value, scale: $p('prScale').value, tuning, position: Number($p('prScalePos').value), rounds, upAndBack: $p('prScaleBack').checked, seq: Number($p('prSeq').value) });
            tip = 'One finger per fret in the box: say the note names as you play them, and you\'ll soon know where they are.';
          } else if (kind === 'picking') {
            const chords = chordList($p('prPickChords').value).map((name) => {
              const def = window.ukemusic.chordDefinition(prLibrary(), name);
              if (!def) return null;
              const base = Math.max(1, Number(def.base_fret) || 1);
              return { name, frets: def.frets.map((f) => (typeof f === 'number' && f > 0 ? f + base - 1 : f)), fingers: def.fingers || [] };
            }).filter(Boolean);
            notes = chords.length ? NL.pickingNotes({ chords, patternId: $p('prPickPattern').value, rounds, strings: tuning.length }) : [];
            tip = 'Hold the whole chord down with the left hand; the right hand picks one string at a time. Thumb (p) for the G string, index (i) C, middle (m) E, ring (a) A.';
          } else if (kind === 'single') {
            notes = NL.singleStringNotes({ strings: tuning.length, rounds });
            tip = 'Index and middle take turns (i m i m), plucking up into the palm. Keep the other fingers resting lightly.';
          } else if (kind === 'alternate') {
            notes = NL.alternatingNotes({ strings: tuning.length, rounds });
            tip = 'Index on one string, middle on the next: walk across the strings and back without looking.';
          } else if (kind === 'melody') {
            notes = NL.melodyNotes({ id: $p('prMelody').value, tuning, rounds });
            tip = 'One finger per fret: index on fret 1, middle on 2, ring on 3. Hum along: it helps your ear and your timing.';
          } else if (kind === 'ear') {
            notes = NL.callResponseNotes({ root: $p('prScaleRoot').value, scale: 'majorPent', tuning, phrases: Math.max(2, rounds * 2) });
            tip = 'Listen to the phrase (the fretboard hides it), play it back in the gap, then see and hear the answer. It always starts on the key note.';
          }
          const key = [kind, $p('prScaleRoot').value, $p('prScale').value, $p('prScalePos').value, $p('prSeq').value, $p('prPickPattern').value, $p('prPickChords').value, $p('prMelody').value, rounds, tuning.join(',')].join('|');
          return { kind: 'notes', notes, names, tuning, beats: 4, key, tip, ear: kind === 'ear', noLeftHand: kind === 'single' || kind === 'alternate' };
        }

        // Noodling: a backing (chord loop) with the notes that fit shown on the fretboard
        function prNoodleExercise(count, endless) {
          const key = $p('prNoodleKey').value;
          const backing = $p('prNoodleBacking').value;
          let chords;
          if (backing === 'blues') chords = T.bluesChart({ key: T.BLUES_KEYS[key] ? key : 'C', sevenths: true });
          else if (backing === 'drone') chords = [key];
          else chords = PL.progressionChords(backing, key);
          const pattern = $p('prNoodleStrum').value;
          const n = endless ? 32 : Math.max(count, chords.length);
          const qa = $p('prNoodleQA').checked;
          const rhythm = $p('prNoodleRhythm').checked;
          const barList = Array.from({ length: n }, (_, i) => ({
            chords: [chords[i % chords.length]],
            pattern,
            label: qa ? (Math.floor(i / 2) % 2 ? 'answer' : 'question') : null,
            idea: rhythm ? PL.RHYTHM_IDEAS[Math.floor(i / 2) % PL.RHYTHM_IDEAS.length] : null
          }));
          return { kind: 'chords', noodle: true, pattern, beats: strumBeats(pattern), barList, endless, key, set: $p('prNoodleNotes').value, qa, chords, backing };
        }

        // ── Before starting: show the first chords / the first note and the tips ──
        function prPreview() {
          if (player && player.playing && pr.schedule) return;
          if (pr.mode === 'oneminute' && pr.oneMinute && pr.oneMinute.running) return;
          const ex = prExercise();
          pr.ex = ex;
          pr.shown = {};
          if (ex.kind === 'notes') {
            pr.lastNote = null;
            pr.tabRound = null;
            if (ex.notes.length) prDrawSpider(ex, -1);
            prDrawBeats(4, -1);
            $p('prWhere').textContent = ex.notes.length ? 'Press Start, or Show me to watch and hear one slow round first.' : 'Nothing to play: check the chords.';
            prTips(ex);
            return;
          }
          if (ex.kind === 'metro') {
            prDrawBeats(ex.beats, -1);
            $p('prBigMain').textContent = `${prTempo()}`;
            $p('prBigSub').textContent = 'beats per minute · press Start';
            $p('prScores').replaceChildren();
            $p('prWhere').textContent = '';
            prTips(ex);
            return;
          }
          if (ex.kind === 'oneminute') {
            prShowChords(ex, ex.from, ex.to);
            $p('prBigMain').textContent = '1:00';
            $p('prBigSub').textContent = `${ex.from} → ${ex.to}: press Start, then tap Space (or the button) on every clean change`;
            $p('prCount').disabled = true;
            prDrawScores(ex);
            $p('prWhere').textContent = '';
            prTips(ex);
            return;
          }
          const first = ex.barList[0];
          if (ex.noodle) {
            prDrawNoodle(ex, first.chords[0], null);
            $p('prFingerNow').textContent = `Backing: ${ex.chords.join(' ')} · play any of the dots`;
          } else {
            prShowChords(ex, ex.drill ? first.target : first.chords[0], ex.drill ? '' : (first.chords[1] || ex.barList[1]?.chords[0] || ''));
          }
          pr.stepsKey = null;
          prDrawSteps(first.pattern, ex.beats, 1, -1);
          prDrawBeats(ex.beats, -1);
          $p('prWhere').textContent = 'Press Start.';
          prGrid(ex, -1);
          prTips(ex);
        }

        function prTips(ex) {
          const tips = [];
          const mode = pr.mode;
          if (mode === 'change' || mode === 'oneminute') {
            for (const t of T.changeTips(ex.from, ex.to, prLibrary(), prInstrument())) tips.push(t);
            const partners = T.partnersFor(ex.to).filter((c) => window.ukemusic.chordDefinition(prLibrary(), c));
            $p('prPartners').replaceChildren(...partners.map((c) => {
              const b = document.createElement('button');
              b.type = 'button';
              b.textContent = `from ${c}`;
              b.addEventListener('click', () => { prChordSelects($p('prFromRoot'), $p('prFromType'), c); prChanged(); });
              return b;
            }));
            if (!window.ukemusic.chordDefinition(prLibrary(), ex.to)) tips.unshift(`There's no ${ex.to} shape for this instrument: choose another chord.`);
            if (mode === 'oneminute') tips.push('Clean means every string rings: check before you count it. Try the same pair every day and watch the score climb.');
          }
          if (mode === 'blues' && $p('prShuffle').checked) tips.push('Shuffle: on beats 2 and 4, add the finger shown on the second diagram (two frets above the note it replaces), then lift it again.');
          if (ex.kind === 'notes') {
            if (ex.tip) tips.push(ex.tip);
            if (!ex.ear && $p('prSound').value === 'demo') tips.push('Sound: the notes play on the first round so you can hear it; on the next you play them yourself to the click, and so on.');
          }
          if (mode === 'strum') {
            tips.push('Keep your hand moving down and up all the time, like the arrows: only touch the strings on the strokes shown. A dot is a miss.');
            if ($p('prStrum').value === 'ladder') tips.push('The ladder: the hand moves faster each step but stays relaxed. Count out loud.');
            if ($p('prDynamics').checked) tips.push('Soft bars: brush the strings lightly near the neck. Loud bars: more arm, not a tighter grip.');
          }
          if (mode === 'drill') tips.push('In the silent bar, put the shape down; strum once on the next bar and listen: every string should ring. Lift off completely before the next one.');
          if (mode === 'metronome') tips.push('Play anything: a strum, a scale, a song. Aim to land exactly on the click, so it seems to disappear.');
          if (ex.noodle) {
            tips.push('Any dot fits the backing. The big orange dots are the chord\'s own notes: landing on one when the chord changes sounds strong. The key note has a ring.');
            if (ex.qa) tips.push('Question and answer: two bars the app plays a short phrase (lit on the fretboard); the next two bars are yours. Answer with something similar but different.');
            if ($p('prNoodleRhythm').checked) tips.push('Rhythm ideas: ta is one beat, ti-ti two half beats, ta-a two beats. Keep to a few notes and play with the rhythm.');
            if (pr.exDef && pr.exDef.create) tips.push('Found something you like? Save as a new song, then write it in the tab block, so you won\'t forget it.');
          }
          $p('prTips').innerHTML = tips.map((t) => `<p>${escapeHtmlText(t)}</p>`).join('');
        }

        // ── Chord display ──
        function prShowChords(ex, nowName, nextName, { caption = null } = {}) {
          const now = nowName || '';
          const next = nextName || '';
          if (caption !== null) $p('prNowCaption').textContent = caption;
          if (pr.shown.now !== now) {
            pr.shown.now = now;
            $p('prNowName').textContent = now || '–';
            const shape = ex.shapes && ex.shapes[now];
            if (shape) {
              $p('prNowDiagram').innerHTML = `<div>${prDiagram(now)}</div><div class="pr-shuffle">${prDiagram(`${now} +`, shape.frets, shape.fingers)}</div>`;
              const names = (window.ukemusic.instrument(prInstrument()).strings || []).map((m) => NOTE_NAMES[m % 12]);
              const fingerName = { 1: 'first', 2: 'second', 3: 'third', 4: 'little' }[shape.finger] || 'another';
              $p('prNowNote').textContent = `Beats 2 and 4: add your ${fingerName} finger on the ${names[shape.string] || ''} string, fret ${shape.to} (finger ${shape.finger} on the second diagram).`;
            } else {
              $p('prNowDiagram').innerHTML = now && now !== 'N.C.' ? prDiagram(now) : '';
              $p('prNowNote').textContent = ex.shapes && pr.mode === 'blues' && $p('prShuffle').checked ? 'No shuffle shape for this chord: play it as it is.' : '';
            }
          }
          if (pr.shown.next !== next) {
            pr.shown.next = next;
            $p('prNextName').textContent = next || '–';
            $p('prNextDiagram').innerHTML = next && next !== 'N.C.' ? prDiagram(next) : '';
          }
        }
        function prDrawSteps(pattern, beats, share, lit) {
          const steps = stripSteps(pattern, beats);
          const shown = steps.slice(0, Math.max(1, Math.round(steps.length * share)));
          const key = `${pattern}|${shown.length}`;
          if (pr.stepsKey !== key) {
            pr.stepsKey = key;
            $p('prSteps').replaceChildren(...shown.map((s) => {
              const cell = document.createElement('span');
              cell.className = `k-step${s.accent ? ' accent' : ''}${s.stroke === '-' ? ' rest' : ''}`;
              cell.innerHTML = `<span class="sym">${{ D: '↓', U: '↑', X: '✕', '-': '·' }[s.stroke] || s.stroke}</span><span class="num">${s.num || ''}</span>`;
              return cell;
            }));
          }
          [...$p('prSteps').children].forEach((c, i) => c.classList.toggle('on', i === lit));
        }
        function prDrawBeats(beats, lit) {
          if ($p('prBeats').children.length !== beats) {
            $p('prBeats').replaceChildren(...Array.from({ length: beats }, (_, i) => {
              const dot = document.createElement('span');
              if (i === 0) dot.className = 'one';
              return dot;
            }));
          }
          [...$p('prBeats').children].forEach((d, i) => d.classList.toggle('on', i === lit));
        }
        function prGrid(ex, lit) {
          const grid = $p('prGrid');
          grid.hidden = pr.mode !== 'blues';
          if (grid.hidden) return;
          if (grid.dataset.key !== ex.chart.join(' ')) {
            grid.dataset.key = ex.chart.join(' ');
            grid.replaceChildren(...ex.chart.map((c) => { const s = document.createElement('span'); s.textContent = c; return s; }));
          }
          [...grid.children].forEach((c, i) => c.classList.toggle('on', i === lit));
        }

        // ── The fretboard (note trainers and noodling) ──
        const SVGNS = 'http://www.w3.org/2000/svg';
        const svgEl = (tag, attrs = {}, parent = null) => {
          const el = document.createElementNS(SVGNS, tag);
          for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
          if (parent) parent.appendChild(el);
          return el;
        };
        // Drawn once per exercise; the hand box, the finger dots and the arrow move on it
        function prFretboard(ex) {
          const strings = ex.tuning.length;
          const maxFret = ex.notes && ex.notes.length ? Math.max(...ex.notes.map((n) => n.fret)) : 7;
          const frets = Math.max(8, maxFret + 1);
          const key = `${strings}:${frets}:${ex.names.join('')}:${ex.noodle ? 'n' : 'x'}`;
          if (pr.fret && pr.fret.key === key) return pr.fret;
          const W = 70;
          const X0 = 84;
          const Y0 = 132;   // room above the board for the hand
          const H = 34;
          const width = X0 + frets * W + 130;   // room on the right for the plucking hand
          const height = Y0 + (strings - 1) * H + 40;
          const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Fretboard' });
          svgEl('rect', { class: 'board', x: X0, y: Y0 - 14, width: frets * W, height: (strings - 1) * H + 28, rx: 4 }, svg);
          const yOf = (string) => Y0 + (strings - 1 - string) * H;   // highest string on top, as in tab
          const xOf = (fret) => (fret === 0 ? X0 - 22 : X0 + (fret - 0.5) * W);   // open strings just left of the nut
          for (const f of [3, 5, 7, 10, 12]) if (f <= frets) svgEl('circle', { class: 'inlay', cx: xOf(f), cy: Y0 + ((strings - 1) * H) / 2, r: 8 }, svg);
          for (let f = 1; f <= frets; f += 1) {
            svgEl('line', { class: 'fretwire', x1: X0 + f * W, y1: Y0 - 14, x2: X0 + f * W, y2: yOf(0) + 14 }, svg);
            const num = svgEl('text', { class: 'fretnum', x: xOf(f), y: height - 6 }, svg);
            num.textContent = f;
          }
          svgEl('line', { class: 'nut', x1: X0, y1: Y0 - 14, x2: X0, y2: yOf(0) + 14 }, svg);
          const plucks = [];
          for (let s = 0; s < strings; s += 1) {
            svgEl('line', { class: 'string', x1: X0 - 36, y1: yOf(s), x2: X0 + frets * W, y2: yOf(s), 'stroke-width': 1.4 + s * 0.15 }, svg);
            plucks.push(svgEl('line', { class: 'pluck', x1: X0 - 36, y1: yOf(s), x2: X0 + frets * W, y2: yOf(s) }, svg));
            const name = svgEl('text', { class: 'strname', x: X0 - 44, y: yOf(s) }, svg);
            name.textContent = ex.names[s];
          }
          const safe = svgEl('g', { class: 'safe-layer' }, svg);
          // The fretting hand, seen from the front as in tab: the fingers come over the edge of
          // the neck from above. The whole hand slides when the position moves up the neck;
          // each finger reaches down to its string when it's in use, and hovers when it isn't.
          const hand = svgEl('g', { class: 'hand' }, svg);
          svgEl('rect', { class: 'box', x: X0 + 3, y: Y0 - 18, width: 4 * W - 6, height: (strings - 1) * H + 34, rx: 10 }, hand);
          const knuckleY = Y0 - 62;
          svgEl('path', { class: 'palm', d: `M ${X0 + 4} ${knuckleY - 6} Q ${X0 + 2 * W} ${knuckleY - 40} ${X0 + 4 * W - 4} ${knuckleY - 6} L ${X0 + 4 * W - 4} ${knuckleY - 40} Q ${X0 + 2 * W} ${knuckleY - 76} ${X0 + 4} ${knuckleY - 40} Z` }, hand);
          const fingerEls = [];
          for (let f = 1; f <= 4; f += 1) {
            const x = X0 + (f - 0.5) * W;
            const finger = svgEl('path', { class: 'finger' }, hand);
            finger.style.d = `path("M ${x} ${knuckleY} L ${x} ${Y0 - 24}")`;
            svgEl('circle', { class: 'knuckle', cx: x, cy: knuckleY, r: 12 }, hand);
            const t = svgEl('text', { class: 'knuckle-num', x, y: knuckleY + 1 }, hand);
            t.textContent = `${f}`;
            fingerEls.push({ el: finger, x });
          }
          // The plucking hand, on the right: points at the string to pluck
          const pluckX = X0 + frets * W + 14;
          const picker = svgEl('g', { class: 'picker' }, svg);
          svgEl('path', { class: 'pick-arrow', d: `M ${pluckX} 0 l 16 -10 l 0 6 l 26 0 l 0 8 l -26 0 l 0 6 z` }, picker);
          const pickText = svgEl('text', { class: 'pick-text', x: pluckX + 48, y: 1 }, picker);
          pickText.textContent = 'pluck';
          const makeDot = (cls) => {
            const outer = svgEl('g', {}, svg);
            const inner = svgEl('g', { class: `dot ${cls}` }, outer);
            svgEl('circle', { cx: 0, cy: 0, r: 14 }, inner);
            const t = svgEl('text', { x: 0, y: 1 }, inner);
            return { outer, inner, text: t };
          };
          const held = Array.from({ length: Math.max(6, strings) }, () => makeDot('held'));
          const next = makeDot('next');
          const now = makeDot('now');
          $p('prFret').replaceChildren(svg);
          pr.noodleKey = null;
          pr.fret = { key, xOf, yOf, W, X0, Y0, hand, held, next, now, plucks, fingerEls, knuckleY, picker, pickText, safe };
          return pr.fret;
        }
        function prPlace(dot, note, fb, label = null) {
          if (!note) {
            dot.outer.setAttribute('visibility', 'hidden');
            return;
          }
          dot.outer.setAttribute('visibility', 'visible');
          dot.outer.setAttribute('transform', `translate(${fb.xOf(note.fret)} ${fb.yOf(note.string)})`);
          dot.text.textContent = label !== null ? label : (note.fret === 0 ? '0' : (note.finger || ''));
          dot.inner.classList.toggle('open', note.fret === 0);
        }
        function prFlash(fb, string) {
          const line = fb.plucks[string];
          if (!line) return;
          line.classList.remove('on');
          void line.getBBox();
          line.classList.add('on');
        }
        /** Show note i (and the next one); i = -1: before the start */
        function prDrawSpider(ex, i, { sounding = false } = {}) {
          const fb = prFretboard(ex);
          const note = ex.notes[Math.max(0, i)];
          const next = ex.notes[i + 1];
          if (!note) return;
          const withShape = Boolean(note.shape);
          const hidden = Boolean(note.hidden);
          fb.hand.style.display = withShape || ex.noLeftHand ? 'none' : '';
          fb.hand.style.transform = `translateX(${(Math.max(1, note.position) - 1) * fb.W}px)`;
          // what's held down: the chord shape (picking), or fingers still down on this string
          let held = [];
          if (withShape) {
            note.shape.forEach((fret, string) => {
              if (typeof fret === 'number' && fret > 0) held.push({ string, fret, finger: (note.shapeFingers && note.shapeFingers[string]) || '' });
            });
            held = held.filter((h) => !(i >= 0 && h.string === note.string));
          } else if (i >= 0 && !hidden) {
            for (let k = i - 1; k >= 0 && held.length < 3; k -= 1) {
              const n = ex.notes[k];
              if (n.string !== note.string || n.round !== note.round || n.back !== note.back) break;
              if (n.fret > 0 && n.fret < note.fret) held.push(n);
            }
          }
          fb.held.forEach((dot, k) => prPlace(dot, held[k], fb, held[k] ? String(held[k].finger || '') : null));
          if (!withShape) {
            const down = new Map();
            if (i >= 0 && !hidden && note.fret > 0) down.set(note.finger, note.string);
            for (const n of held) down.set(n.finger, n.string);
            fb.fingerEls.forEach(({ el, x }, k) => {
              const string = down.get(k + 1);
              const tip = string === undefined ? fb.Y0 - 24 : fb.yOf(string);
              el.style.d = `path("M ${x} ${fb.knuckleY} L ${x} ${tip}")`;
              el.classList.toggle('pressing', k + 1 === note.finger && i >= 0 && note.fret > 0);
            });
          }
          // the right hand points at the string to pluck
          const target = i >= 0 ? note : ex.notes[0];
          fb.picker.style.transform = `translateY(${fb.yOf(target.string)}px)`;
          fb.pickText.textContent = hidden ? 'listen' : `${target.rh ? `${target.rh} · ` : 'pluck '}${ex.names[target.string]}`;
          fb.picker.classList.toggle('waiting', i < 0);
          fb.picker.style.display = hidden ? 'none' : '';
          prPlace(fb.next, hidden || (next && next.hidden) ? null : (i >= 0 ? next : ex.notes[0]), fb);
          prPlace(fb.now, i >= 0 && !hidden ? note : null, fb);
          if (i >= 0 && pr.lastNote !== i) {
            pr.lastNote = i;
            fb.now.inner.classList.remove('now');
            void fb.now.inner.getBBox();
            fb.now.inner.classList.add('now');
            if (sounding && !hidden) prFlash(fb, note.string);
          }
          const first = ex.notes[0];
          const describe = (n) => {
            if (n.hidden) return n.phase === 'you' ? 'Your turn: play it back' : 'Listen…';
            const parts = [F.describeNote(n, ex.names)];
            if (n.chord) parts.unshift(`${n.chord} chord`);
            parts.push(`pluck the ${ex.names[n.string]} string${n.rh ? ` with your ${NL.FINGER_WORDS[n.rh]}` : ''}`);
            return parts.join(' · ');
          };
          $p('prFingerNow').textContent = i >= 0 ? describe(note) : `Start: ${describe(first)}`;
          // the tab: this round, the current note lit
          const round = note.round;
          if (pr.tabRound !== `${ex.key}:${round}`) {
            pr.tabRound = `${ex.key}:${round}`;
            const firstIndex = ex.notes.findIndex((n) => n.round === round);
            const roundNotes = ex.notes.filter((n) => n.round === round && !n.together);
            const tab = F.spiderTab(roundNotes, ex.names);
            pr.tabFirst = firstIndex;
            pr.tabMap = [];
            let k = -1;
            ex.notes.forEach((n, idx) => {
              if (n.round !== round) return;
              if (!n.together) k += 1;
              pr.tabMap[idx - firstIndex] = k;
            });
            const pre = $p('prTab');
            pre.textContent = '';
            const rows = tab.text.split('\n');
            const byRow = rows.map(() => []);
            tab.cells.forEach((c, n) => byRow[c.row].push({ ...c, n }));
            pr.tabCells = [];
            rows.forEach((rowText, r) => {
              if (r) pre.appendChild(document.createTextNode('\n'));
              let at = 0;
              for (const c of byRow[r]) {
                pre.appendChild(document.createTextNode(rowText.slice(at, c.col)));
                const span = document.createElement('span');
                span.className = 'cell';
                span.textContent = rowText.slice(c.col, c.col + c.len);
                pre.appendChild(span);
                pr.tabCells[c.n] = span;
                at = c.col + c.len;
              }
              pre.appendChild(document.createTextNode(rowText.slice(at)));
            });
          }
          const local = i >= 0 ? pr.tabMap[i - pr.tabFirst] : -1;
          (pr.tabCells || []).forEach((span, k) => {
            span.classList.toggle('on', k === local);
            span.classList.toggle('done', i >= 0 && k < local);
          });
          const on = pr.tabCells && pr.tabCells[local];
          if (on) {
            const pre = $p('prTab');
            const left = on.offsetLeft - pre.clientWidth / 2;
            if (Math.abs(pre.scrollLeft - left) > pre.clientWidth / 3) pre.scrollLeft = Math.max(0, left);
          }
        }

        // Noodling: the notes that fit, the chord's own notes bigger, the key note ringed
        function prDrawNoodle(ex, chord, playing) {
          const tuning = prTuning();
          const fb = prFretboard({ ...ex, tuning, names: F.stringNames(tuning), notes: [] });
          fb.hand.style.display = 'none';
          fb.picker.style.display = playing ? '' : 'none';
          const key = `${ex.key}|${ex.set}|${chord}`;
          if (pr.noodleKey !== key) {
            pr.noodleKey = key;
            const dots = PL.safeNotes({ key: ex.key, set: ex.set, tuning, frets: 7, chord });
            const tones = PL.chordTones(chord);
            fb.safe.replaceChildren();
            for (const d of dots) {
              const tone = tones.includes(d.pc);
              const g = svgEl('g', { class: `safe${tone ? ' tone' : ''}${d.root ? ' root' : ''}`, transform: `translate(${fb.xOf(d.fret)} ${fb.yOf(d.string)})` }, fb.safe);
              svgEl('circle', { cx: 0, cy: 0, r: tone ? 13 : 9 }, g);
              const t = svgEl('text', { x: 0, y: 1 }, g);
              t.textContent = NOTE_NAMES[d.pc];
            }
          }
          fb.held.forEach((dot) => prPlace(dot, null, fb));
          prPlace(fb.next, null, fb);
          prPlace(fb.now, playing, fb, playing ? NOTE_NAMES[(tuning[playing.string] + playing.fret) % 12] : null);
          if (playing) {
            fb.picker.style.transform = `translateY(${fb.yOf(playing.string)}px)`;
            fb.pickText.textContent = `listen · ${F.stringNames(tuning)[playing.string]}`;
          }
        }
        function prNoodleSave() {
          const ex = prExercise();
          const tuning = prTuning();
          const text = PL.melodySongText({ chords: ex.chords, pattern: ex.pattern, names: F.stringNames(tuning) });
          closePractice();
          confirmLoseChanges().then((okay) => {
            if (!okay) return;
            useScratchDocument(text, { suggestedTitle: `My melody in ${ex.key}`, markSaved: false });
            setStatusMessage('A new song with the backing chords and an empty tab block: write your melody in it, then Save.');
          });
        }

        // ── Playing ──
        function prSound() {
          const instrument = prInstrument();
          player.setSound(instrument === 'guitar'
            ? (state.config?.playback?.guitar_sound === 'nylon' ? 'nylon' : 'steel')
            : (['hollow', 'sampled'].includes(state.config?.playback?.sound) ? state.config.playback.sound : 'standard'));
          player.setVolume(Number($p('prVolume').value) / 100);
        }
        async function prStart({ fromBar = 0, fromNote = 0, demo = false, countIn = $p('prCountIn').checked } = {}) {
          if (!player) return;
          if (pr.mode === 'oneminute') return;
          if (player.playing) {
            pr.stopping = true;
            player.stop();
          }
          state.userStopped = true;
          let ex = prExercise();
          if (demo && ex.kind === 'notes') {
            const firstRound = ex.notes[0] ? ex.notes[0].round : 0;
            const notes = ex.notes.filter((n) => n.round === firstRound).map((n) => ({ ...n, audible: true, hidden: false }));
            ex = { ...ex, notes, demo: true };
          }
          if (pr.mode === 'change' && !window.ukemusic.chordDefinition(prLibrary(), ex.to)) {
            prTips(ex);
            return;
          }
          if (ex.kind === 'notes' && !ex.notes.length) return;
          pr.ex = ex;
          const instrument = prInstrument();
          let schedule;
          if (ex.kind === 'metro') {
            pr.from = 0;
            schedule = PL.metronomeSchedule({ tempo: prTempo(), beats: ex.beats, bars: 64, sub: Number($p('prMetroSub').value) || 1, accent: $p('prMetroAccent').checked });
          } else if (ex.kind === 'notes') {
            pr.from = Math.min(fromNote, ex.notes.length - 1);
            pr.lastNote = null;
            schedule = F.spiderSchedule(ex.notes.slice(pr.from), {
              tuning: ex.tuning,
              tempo: demo ? Math.min(prTempo(), 70) : prTempo(),
              notesPerBeat: demo ? 1 : Number($p('prPerBeat').value),
              sound: demo ? 'notes' : (ex.ear ? 'notes' : $p('prSound').value),
              click: $p('prClick').checked,
              countIn
            });
          } else {
            pr.from = fromBar;
            const text = PL.planText(ex.barList.slice(fromBar));
            const ir = window.ukemusic.parseSong(text, { useDelimiters: false });
            schedule = window.ukemusic.buildSchedule(ir, { library: prLibrary(), instrument, tempo: prTempo(), beatsPerBar: ex.beats, countIn, swing: state.config?.playback?.swing || 'auto' });
            if (Object.keys(ex.shapes || {}).length) schedule = { ...schedule, events: T.applyShuffle(schedule, ex.shapes, instrument) };
            const levels = ex.barList.slice(fromBar).map((b) => b.level || null);
            if (levels.some(Boolean)) schedule = { ...schedule, events: PL.applyDynamics(schedule, levels) };
            if (ex.noodle && ex.qa) schedule = prAddQuestions(schedule, ex, fromBar);
            if ($p('prClick').checked) schedule = { ...schedule, events: T.addClicks(schedule) };
          }
          pr.schedule = schedule;
          pr.stopping = false;
          prSound();
          $p('prStart').disabled = true;
          $p('prStop').disabled = false;
          prTips(ex);
          if (!demo) prSessionStart();
          cancelAnimationFrame(pr.raf);
          pr.raf = requestAnimationFrame(prTick);
          await player.play(schedule, {
            onEnd: () => {
              if (pr.stopping) return;            // restarting at a new tempo
              cancelAnimationFrame(pr.raf);
              if ((ex.endless || pr.routine) && !pr.userStopped && !demo) {
                if (ex.kind === 'chords') pr.barBase += ex.barList.length - fromBar;
                prStart({ fromBar: 0, countIn: false });
                return;
              }
              prEnded();
            }
          });
        }
        // Question and answer: in the question bars the app plays a phrase (single notes, louder
        // than the backing, which drops back)
        function prAddQuestions(schedule, ex, fromBar) {
          const tuning = prTuning();
          const beat = 60 / schedule.tempo;
          const events = schedule.events.map((e) => (e.kind === 'strum' && !e.tabNote ? { ...e, velocity: e.velocity * 0.55 } : e));
          pr.qaNotes = [];
          schedule.bars.forEach((bar, k) => {
            const b = ex.barList[fromBar + k];
            if (!b || b.label !== 'question' || ((fromBar + k) % 2)) return;
            const phrase = PL.qaPhrase({ key: ex.key, set: ex.set, tuning, length: 4 });
            const placed = NL.placeNotes(phrase, tuning, { position: 0 });
            placed.forEach((n, j) => {
              const notes = new Array(tuning.length);
              notes[n.string] = tuning[n.string] + n.fret;
              const time = bar.time + j * beat * (j < 3 ? 1 : 1);
              events.push({ time, kind: 'strum', direction: 'down', notes, velocity: 0.95, barIndex: k, tabNote: true, qa: true });
              pr.qaNotes.push({ time, string: n.string, fret: n.fret, until: time + beat * (j === placed.length - 1 ? 3 : 1) });
            });
          });
          events.sort((a, b) => a.time - b.time);
          return { ...schedule, events };
        }
        function prEnded() {
          prSessionPause();
          $p('prStart').disabled = false;
          $p('prStop').disabled = true;
          prDrawBeats(pr.ex && pr.ex.beats ? pr.ex.beats : 4, -1);
          [...$p('prSteps').children].forEach((c) => c.classList.remove('on'));
          if (!pr.userStopped) {
            $p('prWhere').textContent = pr.ex && pr.ex.demo
              ? 'That was the demo. Now you: press Start and play along.'
              : `Done: ${pr.lastWhere || ''}. Press Start to go again${pr.mode !== 'noodle' && pr.mode !== 'metronome' ? ', or "✓ That was clean" if it was' : ''}.`;
          }
          pr.userStopped = false;
          pr.barBase = 0;
          pr.changesBase = 0;
          pr.schedule = null;
          prRefreshToday();
        }
        function prStop() {
          pr.userStopped = true;
          if (player && player.playing) player.stop();
          else prEnded();
          $p('prWhere').textContent = 'Stopped. Press Start to go again.';
        }
        // A setting changed: carry on from where it is if playing, otherwise show it
        function prChanged() {
          if (pr.mode === 'oneminute') {
            if (!(pr.oneMinute && pr.oneMinute.running)) prPreview();
            return;
          }
          if (player && player.playing && pr.schedule && pr.ex) {
            if (pr.ex.demo) return;
            const t = player.position();
            clearTimeout(pr.tick);
            if (pr.ex.kind === 'notes') {
              const local = Math.max(0, Math.floor((t - pr.schedule.countInDuration) / pr.schedule.step));
              const at = pr.from + local;
              pr.tick = setTimeout(() => prStart({ fromNote: at, countIn: false }), 150);
              return;
            }
            if (pr.ex.kind === 'metro') {
              pr.tick = setTimeout(() => prStart({ countIn: false }), 150);
              return;
            }
            const beat = 60 / pr.schedule.tempo;
            const bar = Math.max(0, Math.floor((t - pr.schedule.countInDuration) / (beat * pr.ex.beats)));
            pr.changesBase += pr.changesNow || 0;
            pr.barBase += bar;
            pr.tick = setTimeout(() => prStart({ fromBar: Math.min(pr.from + bar, pr.ex.barList.length - 1), countIn: false }), 150);
            return;
          }
          pr.shown = {};
          prPreview();
        }

        function prTick() {
          const schedule = pr.schedule;
          if (!schedule) return;
          if (!player.playing) {
            // still starting (the sounds may be loading): look again next frame
            pr.raf = requestAnimationFrame(prTick);
            return;
          }
          const ex = pr.ex;
          const t = player.position();
          const beat = 60 / schedule.tempo;
          const barLen = beat * (ex.beats || 4);
          if (ex.kind === 'metro') {
            const n = Math.floor(t / beat + 1e-6);
            const inBar = n % ex.beats;
            prDrawBeats(ex.beats, inBar);
            $p('prBigMain').textContent = String(inBar + 1);
            $p('prBigMain').classList.toggle('one', inBar === 0);
            $p('prBigSub').textContent = `${schedule.tempo} bpm · bar ${Math.floor(n / ex.beats) + 1}`;
            pr.raf = requestAnimationFrame(prTick);
            return;
          }
          if (ex.kind === 'notes') {
            if (t < schedule.countInDuration) {
              prDrawBeats(4, Math.floor(t / beat));
              $p('prWhere').textContent = `Count-in… ${Math.floor(t / beat) + 1}`;
              prDrawSpider(ex, pr.from - 1);
            } else {
              const local = Math.min(schedule.noteCount - 1, Math.floor((t - schedule.countInDuration) / schedule.step + 1e-6));
              const i = pr.from + local;
              const note = ex.notes[i];
              const sound = ex.demo ? 'notes' : $p('prSound').value;
              const audible = typeof note.audible === 'boolean' ? note.audible : (sound === 'notes' || (sound === 'demo' && note.round % 2 === 0));
              prDrawSpider(ex, i, { sounding: audible });
              prDrawBeats(4, Math.floor(((t - schedule.countInDuration) % barLen) / beat));
              const rounds = ex.notes[ex.notes.length - 1].round + 1;
              let where;
              if (ex.ear) {
                where = `Phrase ${note.phrase + 1} · ${{ listen: 'listen', you: 'your turn: play it back', answer: 'the answer' }[note.phase]}`;
              } else {
                where = ex.demo ? 'Demo: watch and listen' : `Round ${note.round + 1}${ex.endless ? '' : ` of ${rounds}`}`;
                if (!ex.demo && sound === 'demo') where += note.round % 2 === 0 ? ' · listen and play along' : ' · your turn: you play the notes';
                if (!ex.demo && sound === 'click') where += ' · you play the notes';
                if (note.back) where += ' · coming back';
              }
              pr.lastWhere = where.split(' · ')[0];
              $p('prWhere').textContent = where;
            }
            pr.raf = requestAnimationFrame(prTick);
            return;
          }
          if (t < schedule.countInDuration) {
            prDrawBeats(ex.beats, Math.floor(t / beat));
            $p('prWhere').textContent = `Count-in… ${Math.floor(t / beat) + 1}`;
            const b = ex.barList[pr.from];
            if (ex.noodle) prDrawNoodle(ex, b.chords[0], null);
            else prShowChords(ex, ex.drill ? b.target : b.chords[0], ex.drill ? '' : (b.chords[1] || ex.barList[pr.from + 1]?.chords[0] || ''), ex.drill ? { caption: 'Get ready' } : {});
          } else {
            const music = t - schedule.countInDuration;
            const barNo = Math.floor(music / barLen);
            const beatNo = Math.floor((music % barLen) / beat);
            prDrawBeats(ex.beats, beatNo);
            let index = -1;
            schedule.bars.forEach((b, i) => { if (b.time <= t) index = i; });
            const slot = schedule.bars[index];
            const planBar = ex.barList[pr.from + barNo] || {};
            if (slot) {
              const next = schedule.bars[index + 1];
              if (ex.noodle) {
                const playing = (pr.qaNotes || []).find((q) => q.time <= t && t < q.until) || null;
                prDrawNoodle(ex, slot.chord, playing);
                const parts = [`${slot.chord}${next && next.chord !== slot.chord ? ` → ${next.chord}` : ''}`];
                if (planBar.label === 'question') parts.push('Question: listen');
                if (planBar.label === 'answer') parts.push('Your answer');
                if (planBar.idea) parts.push(`Rhythm: ${planBar.idea}`);
                $p('prFingerNow').textContent = parts.join(' · ');
              } else if (ex.drill) {
                const forming = planBar.label === 'form';
                prShowChords(ex, planBar.target, forming ? '' : (ex.barList[pr.from + barNo + 1]?.target || ''), { caption: forming ? 'Form it now' : 'Strum it' });
              } else {
                prShowChords(ex, slot.chord, next ? next.chord : '');
              }
              const stepLen = barLen / stripSteps(slot.pattern, ex.beats).length;
              prDrawSteps(slot.pattern, ex.beats, slot.share || 1, Math.floor((t - slot.time) / stepLen));
              let changes = 0;
              for (let i = 1; i <= index; i += 1) if (schedule.bars[i].chord !== schedule.bars[i - 1].chord) changes += 1;
              pr.changesNow = changes;
              const absolute = pr.barBase + barNo;
              const total = ex.endless ? '' : ` of ${ex.barList.length}`;
              let where;
              if (pr.mode === 'blues') {
                const n = pr.from + barNo;
                where = `Round ${Math.floor(n / 12) + 1}${ex.endless ? '' : ` of ${ex.barList.length / 12}`} · bar ${(n % 12) + 1} of 12`;
                prGrid(ex, n % 12);
              } else {
                where = `Bar ${absolute + 1}${total}`;
              }
              if (pr.mode === 'change') where += ` · changes: ${pr.changesBase + changes}`;
              if (planBar.label && pr.mode === 'strum') where += ` · ${planBar.label}`;
              if (planBar.level) where += ` · ${planBar.level === 'loud' ? 'LOUD' : 'soft'}`;
              pr.lastWhere = where;
              $p('prWhere').textContent = where;
            }
          }
          pr.raf = requestAnimationFrame(prTick);
        }

        // ── One-minute changes ──
        function prOneMinuteStart() {
          const ex = prExercise();
          if (!window.ukemusic.chordDefinition(prLibrary(), ex.to)) {
            prTips(ex);
            return;
          }
          pr.ex = ex;
          pr.oneMinute = { running: true, count: 0, ends: performance.now() + (pr.minuteMs || 60000), label: `${ex.from}>${ex.to}` };
          prSessionStart();
          $p('prStart').disabled = true;
          $p('prStop').disabled = false;
          $p('prCount').disabled = false;
          $p('prCount').focus();
          const tick = () => {
            const om = pr.oneMinute;
            if (!om || !om.running) return;
            const left = Math.max(0, om.ends - performance.now());
            $p('prBigMain').textContent = fmtClock(Math.ceil(left / 1000));
            $p('prBigSub').textContent = `${om.count} change${om.count === 1 ? '' : 's'}`;
            if (left <= 0) {
              prOneMinuteStop(true);
              return;
            }
            om.raf = requestAnimationFrame(tick);
          };
          tick();
        }
        function prOneMinuteCount() {
          const om = pr.oneMinute;
          if (!om || !om.running) return;
          om.count += 1;
          $p('prBigSub').textContent = `${om.count} change${om.count === 1 ? '' : 's'}`;
          const b = $p('prCount');
          b.classList.remove('bump');
          void b.offsetWidth;
          b.classList.add('bump');
        }
        function prOneMinuteStop(finished) {
          const om = pr.oneMinute;
          if (!om) return;
          om.running = false;
          cancelAnimationFrame(om.raf);
          prSessionPause();
          $p('prStart').disabled = false;
          $p('prStop').disabled = true;
          $p('prCount').disabled = true;
          if (finished) {
            const best = PP.bestScore(pr.progress, pr.exId, om.label);
            pr.progress = PP.logScore(pr.progress, pr.exId, { date: todayKey(), count: om.count, label: om.label });
            prSaveProgress();
            $p('prBigMain').textContent = String(om.count);
            $p('prBigSub').textContent = best === null ? 'changes: your first score for this pair' : (om.count > best ? `changes: a new best (was ${best})!` : `changes (best ${best})`);
            prDrawScores(pr.ex);
            if (pr.routine) setTimeout(() => prRoutineNext(), 2500);
          } else {
            $p('prBigSub').textContent = 'Stopped: not counted. Press Start for a full minute.';
          }
        }
        function prDrawScores(ex) {
          const label = `${ex.from}>${ex.to}`;
          const scores = ((pr.progress?.exercises?.[pr.exId || 'one-minute']?.scores) || []).filter((s) => s.label === label).slice(-12);
          const holder = $p('prScores');
          if (!scores.length) {
            holder.replaceChildren();
            return;
          }
          const max = Math.max(...scores.map((s) => s.count), 1);
          holder.innerHTML = `<div class="pr-scores-title">Your scores, ${escapeHtmlText(ex.from)} → ${escapeHtmlText(ex.to)}</div><div class="pr-bars">${scores.map((s) => `<span title="${escapeHtmlText(s.date)}: ${s.count}" style="height:${Math.max(6, Math.round((s.count / max) * 60))}px"><b>${s.count}</b></span>`).join('')}</div>`;
        }

        function openPractice(exId = null) {
          if (player && player.playing) stopPlayback();
          prSetup();
          const tempo = Number(effectiveConfig()?.song?.tempo);
          if (!pr.opened && tempo) $p('prTempo').value = String(Math.max(50, Math.min(120, tempo)));
          pr.opened = true;
          practiceEl.hidden = false;
          if (typeof exId === 'string' && PL.EXERCISES.some((e) => e.id === exId)) prOpen(exId);
          else prShowHome();
        }
        function closePractice() {
          if (pr.oneMinute && pr.oneMinute.running) prOneMinuteStop(false);
          if (player && player.playing) prStop();
          prSessionEnd();
          pr.routine = null;
          $p('prRoutineBar').hidden = true;
          practiceEl.hidden = true;
        }
        window.ukemusicPractice = openPractice;
        window.ukemusicPracticeState = pr;   // for the tests
        document.getElementById('practiceButton')?.addEventListener('click', () => openPractice()); // 4.19: Practice is on the songs screen
        document.getElementById('libPractice').addEventListener('click', () => openPractice());
        window.addEventListener('keydown', (event) => {
          if (practiceEl.hidden || document.querySelector('dialog[open]')) return;
          if (event.key === 'Escape') {
            event.preventDefault();
            if (pr.view === 'player') {
              if (pr.routine) prRoutineEnd();
              else prShowHome();
            } else {
              closePractice();
            }
          } else if ((event.key === ' ' || event.code === 'Space') && pr.view === 'player' && !/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) {
            event.preventDefault();
            if (pr.mode === 'oneminute') {
              if (pr.oneMinute && pr.oneMinute.running) prOneMinuteCount();
              else prOneMinuteStart();
              return;
            }
            if (player && player.playing) prStop();
            else prStart();
          }
        });

        // ── Song / Notes tabs ───────────────────────────────────
