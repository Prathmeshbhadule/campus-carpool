import EventEmitter from 'events';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Node events core module demonstration
class RequestLoggerEmitter extends EventEmitter {}
export const loggerEmitter = new RequestLoggerEmitter();

const logsDir = path.resolve(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
  } catch (e) {
    // Ignore error in read-only / restricted environments
  }
}

const accessLogStream = path.join(logsDir, 'access.log');

loggerEmitter.on('log', (logEntry) => {
  const line = `[${logEntry.timestamp}] ${logEntry.method} ${logEntry.url} ${logEntry.status} ${logEntry.duration}ms - ${logEntry.ip}\n`;
  try {
    fs.appendFileSync(accessLogStream, line);
  } catch (e) {
    // Non-blocking log persistence
  }
});

export const customLogger = (req, res, next) => {
  const startTime = Date.now();
  const { method, originalUrl } = req;
  const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const timestamp = new Date().toISOString();

    loggerEmitter.emit('log', {
      timestamp,
      method,
      url: originalUrl,
      status,
      duration,
      ip
    });

    // Console output with standard status coloring
    const statusPrefix = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    console.log(`${statusPrefix} [${method}] ${originalUrl} -> ${status} (${duration}ms)`);
  });

  next();
};
