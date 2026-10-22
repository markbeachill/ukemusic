// Safe writes (4.31): a file is written to a temporary file next to it and then swapped in, so
// a crash or a full disk half-way through never leaves a song, its settings or config.ini cut
// short. Windows can briefly lock a file (OneDrive, antivirus, a PDF viewer): the swap is
// retried a few times before giving up.
const fs = require('fs');
const path = require('path');

const BUSY = new Set(['EPERM', 'EBUSY', 'EACCES']);

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Run fn, retrying a few times while Windows says the file or folder is busy */
function retryBusy(fn, { tries = 6, wait = 120 } = {}) {
  let lastError = null;
  for (let i = 0; i < tries; i += 1) {
    try {
      return fn();
    } catch (error) {
      lastError = error;
      if (!BUSY.has(error.code)) throw error;
      sleepSync(wait * (i + 1));
    }
  }
  throw lastError;
}

/** Write a whole file safely (string or Buffer); returns the path */
function writeFileSafe(file, data, encoding = 'utf8') {
  const dir = path.dirname(file);
  const temp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.tmp`);
  fs.writeFileSync(temp, data, Buffer.isBuffer(data) ? undefined : encoding);
  try {
    retryBusy(() => fs.renameSync(temp, file));
  } catch (error) {
    // Some sync tools hold a file open so it can't be replaced: write it in place instead
    // (the data is complete on disk already, in the temporary file, if that fails too)
    try {
      fs.writeFileSync(file, data, Buffer.isBuffer(data) ? undefined : encoding);
      fs.rmSync(temp, { force: true });
    } catch (_e) {
      throw error;
    }
  }
  return file;
}

/** A friendlier message for the errors people actually meet */
function explain(error, what = 'the file') {
  const code = error && error.code;
  if (code === 'ENOENT') return `${what} isn't where it was: its folder may have been moved, renamed or deleted.`;
  if (BUSY.has(code)) return `${what} is in use by another program (a PDF viewer, Explorer, OneDrive or antivirus). Close it and try again.`;
  if (code === 'ENOSPC') return 'The disk is full.';
  if (code === 'EROFS') return `${what} is on a disk that can't be written to.`;
  return String((error && error.message) || error);
}

module.exports = { writeFileSafe, retryBusy, explain };
