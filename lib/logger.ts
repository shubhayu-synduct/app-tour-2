/**
 * Production-safe logging utility
 * Automatically disables console logs in production builds
 */

type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';

class Logger {
  private isDevelopment: boolean;
  private loggingEnabled: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    // Add an additional flag to completely disable logging
    // Set DISABLE_LOGGING=true in .env to completely disable all logs
    this.loggingEnabled = process.env.DISABLE_LOGGING !== 'true';
  }

  private shouldLog(): boolean {
    return this.isDevelopment && this.loggingEnabled;
  }

  log(...args: any[]): void {
    if (this.shouldLog()) {
      // console.log(...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog()) {
      // console.error(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog()) {
      // console.warn(...args);
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog()) {
      // console.info(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.shouldLog()) {
      // console.debug(...args);
    }
  }

  // Special method for API logging with structured format
  apiLog(operation: string, data?: any): void {
    if (this.shouldLog()) {
      // console.log(`[API] ${operation}`, data || '');
    }
  }

  // Special method for authentication logging
  authLog(operation: string, data?: any): void {
    if (this.shouldLog()) {
      // console.log(`[AUTH] ${operation}`, data || '');
    }
  }

  // Special method for Firebase logging
  firebaseLog(operation: string, data?: any): void {
    if (this.shouldLog()) {
      // console.log(`[FIREBASE] ${operation}`, data || '');
    }
  }
}

// Export a singleton instance
export const logger = new Logger();

// Export individual methods for easier migration
export const { log, error, warn, info, debug, apiLog, authLog, firebaseLog } = logger;