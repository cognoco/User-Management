/**
 * Centralized logging utility with environment-aware log levels
 * and automatic sensitive data sanitization
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.logLevel = this.getLogLevelFromEnv();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getLogLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        return LogLevel.DEBUG;
      case 'INFO':
        return LogLevel.INFO;
      case 'WARN':
        return LogLevel.WARN;
      case 'ERROR':
        return LogLevel.ERROR;
      case 'CRITICAL':
        return LogLevel.CRITICAL;
      default:
        // Default to INFO in production, DEBUG in development
        return this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  /**
   * Sanitize sensitive data from logs
   * Removes or masks tokens, passwords, and other sensitive fields
   */
  private sanitize(data: any): any {
    if (!data) return data;

    // List of sensitive field names to sanitize
    const sensitiveFields = [
      'password',
      'token',
      'access_token',
      'refresh_token',
      'apiKey',
      'api_key',
      'secret',
      'authorization',
      'cookie',
      'session',
      'credit_card',
      'creditCard',
      'ssn',
      'social_security',
    ];

    if (typeof data === 'string') {
      // Check if string contains sensitive patterns
      sensitiveFields.forEach(field => {
        const regex = new RegExp(`(${field})[\\s]*[:=][\\s]*['"]?([^'"\\s]+)['"]?`, 'gi');
        data = data.replace(regex, `$1=***REDACTED***`);
      });
      return data;
    }

    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };
      
      Object.keys(sanitized).forEach(key => {
        const lowerKey = key.toLowerCase();
        
        // Check if key contains sensitive field names
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '***REDACTED***';
        } else if (typeof sanitized[key] === 'object') {
          // Recursively sanitize nested objects
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      });
      
      return sanitized;
    }

    return data;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private formatMessage(level: string, module: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const sanitizedContext = context ? this.sanitize(context) : undefined;
    
    if (this.isProduction) {
      // Structured logging for production
      return JSON.stringify({
        timestamp,
        level,
        module,
        message: this.sanitize(message),
        ...(sanitizedContext && { context: sanitizedContext }),
      });
    }
    
    // Human-readable format for development
    const contextStr = sanitizedContext ? ` | ${JSON.stringify(sanitizedContext)}` : '';
    return `[${timestamp}] [${level}] [${module}] ${this.sanitize(message)}${contextStr}`;
  }

  public debug(module: string, message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG) && !this.isProduction) {
      console.log(this.formatMessage('DEBUG', module, message, context));
    }
  }

  public info(module: string, message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('INFO', module, message, context));
    }
  }

  public warn(module: string, message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', module, message, context));
    }
  }

  public error(module: string, message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        ...(error && {
          error: {
            message: error.message,
            stack: this.isProduction ? undefined : error.stack,
          },
        }),
      };
      console.error(this.formatMessage('ERROR', module, message, errorContext));
    }
  }

  public critical(module: string, message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.CRITICAL)) {
      const errorContext = {
        ...context,
        ...(error && {
          error: {
            message: error.message,
            stack: error.stack, // Always include stack for critical errors
          },
        }),
      };
      console.error(this.formatMessage('CRITICAL', module, message, errorContext));
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenience functions
export const debug = (module: string, message: string, context?: LogContext) => 
  logger.debug(module, message, context);

export const info = (module: string, message: string, context?: LogContext) => 
  logger.info(module, message, context);

export const warn = (module: string, message: string, context?: LogContext) => 
  logger.warn(module, message, context);

export const error = (module: string, message: string, err?: Error, context?: LogContext) => 
  logger.error(module, message, err, context);

export const critical = (module: string, message: string, err?: Error, context?: LogContext) => 
  logger.critical(module, message, err, context);