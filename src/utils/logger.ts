type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMetadata = Record<string, unknown>;

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
const minimumPriority = priorities[configuredLevel] ?? priorities.info;

function write(level: LogLevel, message: string, metadata: LogMetadata = {}): void {
  if (priorities[level] < minimumPriority) return;

  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata,
  });

  if (level === 'error') {
    console.error(entry);
  } else if (level === 'warn') {
    console.warn(entry);
  } else {
    console.log(entry);
  }
}

const logger = {
  debug: (message: string, metadata?: LogMetadata) => write('debug', message, metadata),
  info: (message: string, metadata?: LogMetadata) => write('info', message, metadata),
  warn: (message: string, metadata?: LogMetadata) => write('warn', message, metadata),
  error: (message: string, metadata?: LogMetadata) => write('error', message, metadata),
};

export default logger;
