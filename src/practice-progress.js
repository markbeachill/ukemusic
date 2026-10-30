// Practice progress, kept in practice.json in the songs folder: time practised per exercise
// and per day, last and best tempo, "that was clean" marks, one-minute-change scores, and
// your routines. The app can't hear you, so "clean" is your own say-so.
// Pure functions (unit tested) plus read/write for the file.

const fs = require('fs');
const path = require('path');
const { DEFAULT_ROUTINES } = require('./practice-catalog');

const FILE = 'practice.json';

function emptyProgress() {
  return { version: 2, exercises: {}, days: {}, recent: [], preferences: {}, routines: JSON.parse(JSON.stringify(DEFAULT_ROUTINES)) };
}

function normalise(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid practice backup');
  const object = (x) => x && typeof x === 'object' && !Array.isArray(x);
  if (!object(data.exercises) || !object(data.days) || !Array.isArray(data.routines)) throw new Error('Invalid practice backup');
  return { ...emptyProgress(), ...data, version: 2,
    recent: [...new Set((Array.isArray(data.recent) ? data.recent : []).filter((x) => typeof x === 'string'))].slice(0, 3),
    preferences: object(data.preferences) ? data.preferences : {},
    routines: data.routines.filter((r) => r && typeof r.name === 'string' && Array.isArray(r.steps)).map((r) => ({ name: r.name, steps: r.steps.filter((s) => s && typeof s.id === 'string').map((s) => ({ id: s.id, minutes: s.id === 'one-minute' ? 1 : Math.max(1, Math.min(30, Number(s.minutes) || 1)), ...(object(s.settings) ? { settings: s.settings } : {}) })) })) };
}

function markStarted(data, id) {
  if (!id) return data;
  data.recent = [id, ...(data.recent || []).filter((x) => x !== id)].slice(0, 3);
  return data;
}

function entry(data, id) {
  data.exercises[id] = data.exercises[id] || { seconds: 0, sessions: 0, last_tempo: null, best_tempo: null, last_date: null, clean: 0, scores: [] };
  return data.exercises[id];
}

/** Time spent on an exercise (seconds), at a tempo, on a date ('2026-10-16') */
function logSession(data, id, { date, seconds, tempo = null }) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (!s) return data;
  const e = entry(data, id);
  e.seconds += s;
  e.sessions += 1;
  e.last_date = date;
  if (tempo) e.last_tempo = tempo;
  data.days[date] = (data.days[date] || 0) + s;
  return data;
}

/** "That was clean" at a tempo: the best tempo goes up; returns the tempo to try next (+5) */
function logClean(data, id, { date, tempo, context = '', settings = {} }) {
  const e = entry(data, id);
  e.clean += 1;
  e.last_date = date;
  e.last_tempo = tempo;
  e.best_tempo = Math.max(e.best_tempo || 0, tempo);
  if (context) {
    e.contexts = e.contexts || {};
    const result = e.contexts[context] || { clean: 0, best_tempo: 0 };
    e.contexts[context] = { clean: result.clean + 1, best_tempo: Math.max(result.best_tempo, tempo), date, settings };
    e.last_context = context;
  }
  return Math.min(220, tempo + 5);
}

/** A one-minute-changes score; the last 30 are kept */
function logScore(data, id, { date, count, label = '' }) {
  const e = entry(data, id);
  e.scores.push({ date, count, label });
  if (e.scores.length > 30) e.scores = e.scores.slice(-30);
  e.last_date = date;
  return data;
}

function bestScore(data, id, label = null) {
  const scores = (data.exercises[id]?.scores || []).filter((s) => label === null || s.label === label);
  return scores.length ? Math.max(...scores.map((s) => s.count)) : null;
}

/** Days in a row with some practice, counting back from today (or yesterday, if not yet today) */
function streak(data, today) {
  const day = new Date(`${today}T12:00:00Z`);
  const key = (d) => d.toISOString().slice(0, 10);
  if (!data.days[key(day)]) day.setUTCDate(day.getUTCDate() - 1);
  let count = 0;
  while (data.days[key(day)] > 0) {
    count += 1;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return count;
}

function todaySeconds(data, today) {
  return data.days[today] || 0;
}

/** "3 min", "1 h 5 min" */
function formatMinutes(seconds) {
  const m = Math.round(seconds / 60);
  if (seconds > 0 && m < 1) return 'under 1 min';
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

function progressFile(songsFolder) {
  return path.join(songsFolder, FILE);
}

function readProgress(songsFolder) {
  if (!songsFolder) return emptyProgress();
  try {
    const data = JSON.parse(fs.readFileSync(progressFile(songsFolder), 'utf8'));
    const base = emptyProgress();
    return normalise({ ...base, ...data, exercises: data.exercises || {}, days: data.days || {}, routines: Array.isArray(data.routines) ? data.routines : base.routines });
  } catch (_err) {
    return emptyProgress();
  }
}

function writeProgress(songsFolder, data) {
  if (!songsFolder) return false;
  fs.mkdirSync(songsFolder, { recursive: true });
  fs.writeFileSync(progressFile(songsFolder), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  return true;
}

module.exports = { emptyProgress, normalise, markStarted, logSession, logClean, logScore, bestScore, streak, todaySeconds, formatMinutes, readProgress, writeProgress, FILE };
