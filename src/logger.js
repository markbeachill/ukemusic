// ukemusic error logger (main process only).
// Dev (npm start):  <project>/logs/ukemusic.log
// Packaged build:   the platform log folder (app.getPath('logs'))
const fs = require('fs');
const path = require('path');

const MAX_BYTES = 1024 * 1024; // roll over to ukemusic.old.log above 1 MB

let logFile = null;

function init(app) {
  const dir = app.isPackaged ? app.getPath('logs') : path.join(__dirname, '..', 'logs');
  try {
    fs.mkdirSync(dir, { recursive: true });
    logFile = path.join(dir, 'ukemusic.log');
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_BYTES) {
      fs.renameSync(logFile, path.join(dir, 'ukemusic.old.log'));
    }
  } catch (err) {
    logFile = null;
    console.error('[logger] could not open log file:', err);
  }
  return logFile;
}

function formatDetail(detail) {
  if (detail === undefined || detail === null || detail === '') return '';
  if (detail instanceof Error) return `\n    ${(detail.stack || String(detail)).replace(/\n/g, '\n    ')}`;
  if (typeof detail === 'string') return `\n    ${detail.replace(/\n/g, '\n    ')}`;
  try {
    return `\n    ${JSON.stringify(detail)}`;
  } catch (_err) {
    return `\n    ${String(detail)}`;
  }
}

function write(level, source, message, detail) {
  const line = `${new Date().toISOString()} [${String(level).toUpperCase()}] [${source}] ${message}${formatDetail(detail)}\n`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  out(line.trimEnd());
  if (!logFile) return;
  try {
    fs.appendFileSync(logFile, line, 'utf8'); // sync so nothing is lost on a crash
  } catch (_err) {
    // Never let logging itself take the app down
  }
}

module.exports = {
  init,
  getLogFile: () => logFile,
  info: (source, message, detail) => write('info', source, message, detail),
  warn: (source, message, detail) => write('warn', source, message, detail),
  error: (source, message, detail) => write('error', source, message, detail)
};
