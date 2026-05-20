const fs   = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const errorLogPath  = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');

const _write = (file, entry) => {
  try { fs.appendFileSync(file, entry + '\n'); } catch { /* non-fatal */ }
};

const logger = {
  error: (message, meta = {}) => {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      ...meta,
    });
    _write(errorLogPath, entry);
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ERROR] ${message}`, Object.keys(meta).length ? meta : '');
    }
  },

  warn: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WARN] ${message}`, Object.keys(meta).length ? meta : '');
    }
  },

  info: (message) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[INFO] ${message}`);
    }
  },

  // Morgan write stream for access logs
  accessStream: {
    write: (message) => _write(accessLogPath, message.trim()),
  },
};

module.exports = logger;
