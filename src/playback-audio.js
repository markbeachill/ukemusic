// Ukulele-like playback with the Web Audio API (runs in the app window, loaded by index.html).
//
// Sound: Karplus–Strong plucked string — a burst of softened noise fed through a short
// delay loop — which gives a convincing nylon-string pluck without any sample files.
// Sounds (Settings → Playback): each is a set of settings in SOUNDS below.
//   standard  the plain plucked string (ukulele)
//   hollow    the same strings through a small wooden body: resonances around 220 Hz (the
//             air in the body), 480 Hz and 1.1 kHz (the top), a very short body echo, a softer
//             nylon pluck that loses its brightness sooner, and a slightly slower strum
//   steel     guitar with steel strings: a brighter pick, longer ring, a bigger body (~110 Hz)
//   nylon     classical guitar: soft pluck, warm big body, gentle strum
//   sampled   a real tenor ukulele: recorded notes (FreePats "Ukulele", CC0, in
//             src/sounds/ukulele), one every two semitones from C4 to C6, each played back a
//             little faster or slower for the notes in between; the recorded "chuck" for X.
//             Notes outside the range (baritone) are pitched from the nearest recording.
// Timing: a look-ahead scheduler queues only the next ~0.2 s of strums at a time.
(function () {
  'use strict';

  const LOOKAHEAD = 0.2;     // seconds of audio scheduled ahead
  const TICK_MS = 50;        // how often the scheduler wakes
  const NOTE_SECONDS = 2.4;  // length of each rendered pluck
  // smooth: how soft the pluck is (0 bright … 1 soft); sustain: added to the string's loop gain
  // (more = rings longer); body: [Hz, dB, Q] resonances (null = none); modes: the body echo;
  // spread: seconds between strings in a strum
  const SOUNDS = {
    standard: { smooth: 0.55, sustain: 0, body: null, modes: null, lowpass: 5200, level: 0.9, spread: { down: 0.014, up: 0.010 } },
    hollow: {
      smooth: 0.72, sustain: -0.0007, lowpass: 4200, level: 0.75, spread: { down: 0.019, up: 0.014 },
      body: [[220, 7, 1.4], [480, 4, 1.8], [1100, 2, 2]], modes: [[220, 0.09], [480, 0.05], [1100, 0.025]]
    },
    steel: {
      smooth: 0.38, sustain: 0.0012, lowpass: 7500, level: 0.7, spread: { down: 0.012, up: 0.009 },
      body: [[110, 5, 1.2], [230, 3, 1.5], [2600, 3, 1.0]], modes: [[110, 0.14], [230, 0.07], [2600, 0.012]]
    },
    nylon: {
      smooth: 0.7, sustain: 0.0004, lowpass: 4500, level: 0.75, spread: { down: 0.02, up: 0.015 },
      body: [[100, 6, 1.3], [210, 4, 1.6], [900, 2, 2]], modes: [[100, 0.15], [210, 0.08], [900, 0.03]]
    },
    sampled: { sampled: true, smooth: 0.6, sustain: 0, body: null, modes: null, lowpass: 10000, level: 0.9, spread: { down: 0.016, up: 0.012 } }
  };
  // The recordings: [MIDI note, file, tuning correction in cents] (from the set's SFZ file)
  const SAMPLE_DIR = 'src/sounds/ukulele/';
  const SAMPLES = [
    [60, 'C4', -5], [62, 'D4', -8], [64, 'E4', -2], [66, 'Fs4', -11], [67, 'G4', -1], [69, 'A4', 0],
    [71, 'B4', 0], [73, 'Cs5', 0], [75, 'Ds5', 3], [77, 'F5', 4], [79, 'G5', 6], [81, 'A5', 8], [84, 'C6', 4]
  ];
  const BORROW = { 67: 69, 71: 73 }; // G4 -> A4, B4 -> C#5: G4 and B4 are ~12 dB down a second in
  let sampleLoad = null;   // one shared load: { notes: [{ midi, tune, buffer }], chuck }
  const soundOf = (name) => SOUNDS[name] || SOUNDS.standard;
  const SAMPLE_LEVEL = 0.25; // the recordings peak near full scale; this matches the plucked sound's loudness

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  class UkePlayer {
    constructor() {
      this.ctx = null;
      this.cache = new Map();
      this.voices = [];       // last sound on each string, so a new strum damps the old one
      this.timer = null;
      this.raf = null;
      this.playing = false;
      this.sound = 'standard';
      this.volume = 1;
    }

    /** Volume: 0 (silent) to 1.5 (louder than usual); 1 is the usual level. Takes effect at once. */
    setVolume(volume) {
      this.volume = Math.max(0, Math.min(1.5, Number(volume)));
      if (this.ctx && this.master) {
        this.master.gain.setTargetAtTime(soundOf(this.sound).level * this.volume, this.ctx.currentTime, 0.03);
      }
    }

    /** 'standard', 'hollow', 'steel', 'nylon' or 'sampled'. Takes effect from the next strum. */
    setSound(sound) {
      const next = SOUNDS[sound] ? sound : 'standard';
      if (next === 'sampled') this.loadSamples();
      if (next === this.sound) return;
      this.sound = next;
      this.cache = new Map();
      if (this.ctx) this.master = this.connectOutput(this.ctx);
    }

    // A short "knock" with the body's resonances, used as a tiny reverb for the hollow sound
    bodyImpulse(ctx) {
      const rate = ctx.sampleRate;
      const length = Math.floor(rate * 0.12);
      const buffer = ctx.createBuffer(1, length, rate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) {
        const t = i / rate;
        let v = (Math.random() * 2 - 1) * Math.exp(-t / 0.004) * 0.3;
        for (const [freq, decay] of soundOf(this.sound).modes) v += Math.sin(2 * Math.PI * freq * t) * Math.exp(-t / decay);
        data[i] = v * 0.25;
      }
      return buffer;
    }

    // master volume -> gentle low-pass (warmer) -> limiter -> speakers
    connectOutput(ctx) {
      const master = ctx.createGain();
      const sound = soundOf(this.sound);
      master.gain.value = sound.level * (this.volume ?? 1);
      const tone = ctx.createBiquadFilter();
      tone.type = 'lowpass';
      tone.frequency.value = sound.lowpass;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 6;
      tone.connect(limiter).connect(ctx.destination);
      if (!sound.body) {
        master.connect(tone);
        return master;
      }
      // master -> body resonances -> (dry + short body echo) -> tone -> limiter
      let node = master;
      for (const [freq, gainDb, q] of sound.body) {
        const peak = ctx.createBiquadFilter();
        peak.type = 'peaking';
        peak.frequency.value = freq;
        peak.gain.value = gainDb;
        peak.Q.value = q;
        node.connect(peak);
        node = peak;
      }
      const soften = ctx.createBiquadFilter();
      soften.type = 'highshelf';
      soften.frequency.value = 3500;
      soften.gain.value = -4;
      node.connect(soften);
      const body = ctx.createConvolver();
      body.normalize = true;
      body.buffer = this.bodyImpulse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.3;
      soften.connect(tone);
      soften.connect(body).connect(wet).connect(tone);
      return master;
    }

    /**
     * Load and decode the ukulele recordings (once). Resolves with the set, or null if they
     * couldn't be loaded, in which case the plucked-string sound is used instead.
     */
    loadSamples() {
      if (sampleLoad) return sampleLoad;
      const ctx = this.ensureContext();
      const decode = async (file) => {
        const response = await fetch(SAMPLE_DIR + file);
        if (!response.ok) throw new Error(`${file}: ${response.status}`);
        return ctx.decodeAudioData(await response.arrayBuffer());
      };
      sampleLoad = Promise.all([
        ...SAMPLES.map(([midi, name, tune]) => decode(`${name}.flac`).then((buffer) => ({ midi, tune, buffer }))),
        decode('chuck.wav')
      ]).then((loaded) => ({ notes: loaded.slice(0, -1), chuck: loaded[loaded.length - 1] }))
        .catch((error) => {
          console.warn('Ukulele samples could not be loaded; using the plucked-string sound', error);
          return null;
        });
      this.samples = null;
      sampleLoad.then((set) => { this.samples = set; });
      return sampleLoad;
    }

    // The recording nearest to a note, and how fast to play it to get that note
    sampleFor(midi) {
      const notes = this.samples && this.samples.notes;
      if (!notes || !notes.length) return null;
      let best = notes[0];
      for (const n of notes) if (Math.abs(n.midi - midi) < Math.abs(best.midi - midi)) best = n;
      // G4 and B4 die away much sooner than the rest (C and G sounded thin and short), so their
      // notes borrow the A4 and C#5 recordings, retuned by two semitones
      const borrow = BORROW[best.midi] && notes.find((n) => n.midi === BORROW[best.midi]);
      if (borrow) best = borrow;
      const cents = (midi - best.midi) * 100 + best.tune;
      return { buffer: best.buffer, rate: Math.pow(2, cents / 1200) };
    }

    ensureContext() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new Ctx();
        this.master = this.connectOutput(this.ctx);
      }
      return this.ctx;
    }

    /** Render a whole schedule silently to an AudioBuffer (for checks, or saving audio later). */
    async renderOffline(schedule, sampleRate = 44100) {
      if (soundOf(this.sound).sampled) this.samples = await this.loadSamples();
      const saved = { ctx: this.ctx, master: this.master, voices: this.voices, cache: this.cache };
      const ctx = new OfflineAudioContext(1, Math.ceil((schedule.duration + NOTE_SECONDS) * sampleRate), sampleRate);
      this.ctx = ctx;
      this.master = this.connectOutput(ctx);
      this.voices = [];
      this.cache = new Map();
      try {
        for (const event of schedule.events) {
          const at = 0.05 + event.time;
          if (event.kind === 'strum') this.strum(event, at);
          else if (event.kind === 'chuck') this.chuck(event, at);
          else if (event.kind === 'mute') this.mute(at);
          else if (event.kind === 'click') this.click(event, at);
        }
        return await ctx.startRendering();
      } finally {
        Object.assign(this, saved);
      }
    }

    // Render (once) a plucked note as an AudioBuffer
    pluckBuffer(midi) {
      const sound = soundOf(this.sound);
      const key = `${this.sound}:${midi}`;
      if (this.cache.has(key)) return this.cache.get(key);
      const ctx = this.ctx;
      const rate = ctx.sampleRate;
      // Loop delay must equal rate/frequency exactly. Averaging x[n-N] with x[n-N+1] gives a
      // delay of N - 0.5 samples; a first-order all-pass filter adds the remaining fraction
      // (kept between 0.1 and 1.1 for a stable, accurate filter) so every string is in tune.
      const delay = rate / midiToFreq(midi);
      const period = Math.max(2, Math.floor(delay + 0.5 - 0.1));
      const fraction = delay + 0.5 - period;
      const allpass = (1 - fraction) / (1 + fraction);
      const length = Math.floor(rate * NOTE_SECONDS);
      const buffer = ctx.createBuffer(1, length, rate);
      const out = buffer.getChannelData(0);
      const ring = new Float32Array(period);
      // Softened noise excitation = finger/nylon rather than a pick
      let smooth = 0;
      for (let i = 0; i < period; i += 1) {
        smooth = smooth * sound.smooth + (Math.random() * 2 - 1) * (1 - sound.smooth);
        ring[i] = smooth;
      }
      // Higher notes die away a little faster, like a real string
      const decay = Math.min(0.9992, 0.9965 - (midi - 55) * 0.00004 + sound.sustain); // per sound: rings longer or shorter
      let index = 0;
      let apIn = 0;
      let apOut = 0;
      for (let i = 0; i < length; i += 1) {
        const current = ring[index];
        const next = ring[(index + 1) % period];
        const averaged = decay * 0.5 * (current + next);
        const tuned = allpass * averaged + apIn - allpass * apOut;
        apIn = averaged;
        apOut = tuned;
        ring[index] = tuned;
        out[i] = current;
        index = (index + 1) % period;
      }
      // Fade the tail to avoid clicks
      const fade = Math.floor(rate * 0.05);
      for (let i = 0; i < fade; i += 1) out[length - 1 - i] *= i / fade;
      this.cache.set(key, buffer);
      return buffer;
    }

    damp(string, time) {
      const voice = this.voices[string];
      if (!voice) return;
      try {
        voice.gain.gain.cancelScheduledValues(time);
        voice.gain.gain.setTargetAtTime(0, time, 0.015);
        voice.source.stop(time + 0.12);
      } catch (_err) {
        // already stopped
      }
      this.voices[string] = null;
    }

    strum(event, at) {
      const ctx = this.ctx;
      // Tab notes leave strings out (empty or undefined once passed from the preload): skip them
      const order = Array.from(event.notes, (midi, string) => ({ midi, string })).filter(({ midi }) => Number.isFinite(midi));
      if (event.direction === 'up') order.reverse();
      const spread = soundOf(this.sound).spread[event.direction] || 0.012;
      order.forEach(({ midi, string }, i) => {
        const time = at + i * spread;
        this.damp(string, time);
        const source = ctx.createBufferSource();
        const sample = soundOf(this.sound).sampled ? this.sampleFor(midi) : null;
        if (sample) {
          source.buffer = sample.buffer;
          source.playbackRate.value = sample.rate;
        } else {
          source.buffer = this.pluckBuffer(midi);
        }
        const gain = ctx.createGain();
        // Up-strums catch the strings more lightly
        const level = (sample ? SAMPLE_LEVEL : 0.22) * event.velocity * (event.direction === 'up' ? 0.8 : 1);
        gain.gain.setValueAtTime(level, time);
        source.connect(gain).connect(this.master);
        source.start(time);
        this.voices[string] = { source, gain };
      });
    }

    // N.C. (no chord): stop the strings ringing
    mute(at) {
      for (let s = 0; s < this.voices.length; s += 1) this.damp(s, at);
    }

    chuck(event, at) {
      const ctx = this.ctx;
      for (let s = 0; s < this.voices.length; s += 1) this.damp(s, at);
      // No two chucks quite the same: a little louder or softer, a touch higher or lower in
      // pitch, a few milliseconds early or late (a run of identical ones sounds mechanical)
      const vary = (amount) => 1 + (Math.random() * 2 - 1) * amount;
      const when = Math.max(ctx.currentTime, at + (Math.random() * 2 - 1) * 0.006);
      if (soundOf(this.sound).sampled && this.samples && this.samples.chuck) {
        const source = ctx.createBufferSource();
        source.buffer = this.samples.chuck;
        source.playbackRate.value = vary(0.06);
        const gain = ctx.createGain();
        gain.gain.value = 0.45 * event.velocity * vary(0.15);
        source.connect(gain).connect(this.master);
        source.start(when);
        return;
      }
      // A short, dull percussive "chk"
      const length = Math.floor(ctx.sampleRate * 0.05);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1800 * vary(0.12);
      const gain = ctx.createGain();
      gain.gain.value = 0.35 * event.velocity * vary(0.15);
      source.connect(filter).connect(gain).connect(this.master);
      source.start(when);
    }

    click(event, at) {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      osc.frequency.value = event.accent ? 1500 : 1000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25 * (event.level ?? 1), at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
      osc.connect(gain).connect(this.master);
      osc.start(at);
      osc.stop(at + 0.06);
    }

    /**
     * Play a schedule from buildSchedule().
     *   callbacks.onBar(bar, index) — when each bar starts (index -1 during the count-in)
     *   callbacks.onEnd()           — when playback finishes or is stopped
     */
    async play(schedule, callbacks = {}) {
      this.stop();
      const ctx = this.ensureContext();
      if (ctx.state !== 'running') {
        // Some browsers (Safari) never resume sound that wasn't started by a tap: don't wait for ever
        await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 1500))]);
        if (ctx.state !== 'running') {
          const error = new Error('The sound didn\u2019t start. Tap Play again (and check the phone isn\u2019t on silent).');
          error.code = 'audio-locked';
          throw error;
        }
      }
      if (soundOf(this.sound).sampled) this.samples = await this.loadSamples();
      this.schedule = schedule;
      this.callbacks = callbacks;
      this.startTime = ctx.currentTime + 0.12;
      this.nextEvent = 0;
      this.currentBar = -2;
      this.voices = [];
      this.playing = true;

      const pump = () => {
        if (!this.playing) return;
        const horizon = ctx.currentTime + LOOKAHEAD;
        const events = this.schedule.events;
        while (this.nextEvent < events.length && this.startTime + events[this.nextEvent].time < horizon) {
          const event = events[this.nextEvent];
          const at = this.startTime + event.time;
          if (event.kind === 'strum') this.strum(event, at);
          else if (event.kind === 'chuck') this.chuck(event, at);
          else if (event.kind === 'mute') this.mute(at);
          else if (event.kind === 'click') this.click(event, at);
          this.nextEvent += 1;
        }
      };
      const follow = () => {
        if (!this.playing) return;
        const t = ctx.currentTime - this.startTime;
        const bars = this.schedule.bars;
        let index = -1;
        for (let i = 0; i < bars.length; i += 1) {
          if (bars[i].time <= t) index = i;
          else break;
        }
        if (index !== this.currentBar) {
          this.currentBar = index;
          if (this.callbacks.onBar) this.callbacks.onBar(index >= 0 ? bars[index] : null, index);
        }
        if (t >= this.schedule.duration + 0.3) {
          this.stop();
          return;
        }
        this.raf = window.requestAnimationFrame(follow);
      };
      pump();
      this.timer = window.setInterval(pump, TICK_MS);
      this.raf = window.requestAnimationFrame(follow);
    }

    stop() {
      const wasPlaying = this.playing;
      this.playing = false;
      if (this.timer) window.clearInterval(this.timer);
      if (this.raf) window.cancelAnimationFrame(this.raf);
      this.timer = null;
      this.raf = null;
      if (this.ctx) {
        const now = this.ctx.currentTime;
        for (let s = 0; s < this.voices.length; s += 1) this.damp(s, now);
      }
      if (wasPlaying && this.callbacks && this.callbacks.onEnd) this.callbacks.onEnd();
    }

    /** Seconds since the music (after the count-in) started, for tests and display. */
    position() {
      return this.ctx && this.playing ? this.ctx.currentTime - this.startTime : 0;
    }
  }

  window.UkePlayer = UkePlayer;
})();
