import { Injectable } from '@nestjs/common';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMetadata = Record<string, unknown>;

const priorities: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

@Injectable()
export class Logger {
  private configuredLevel: LogLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
  private minimumPriority: number = priorities[this.configuredLevel] ?? priorities.info;

  private write(level: LogLevel, message: string, metadata: LogMetadata = {}): void {
    if (priorities[level] < this.minimumPriority) return;

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

  debug(message: string, metadata?: LogMetadata): void {
    this.write('debug', message, metadata);
  }

  info(message: string, metadata?: LogMetadata): void {
    this.write('info', message, metadata);
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write('warn', message, metadata);
  }

  error(message: string, metadata?: LogMetadata): void {
    this.write('error', message, metadata);
  }
}
