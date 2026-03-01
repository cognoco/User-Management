/** Severity levels understood by the {@link ErrorLogger}. */
export type LogLevel = "debug" | "info" | "warn" | "error" | "critical";

export interface LogContext {
  user?: string;
  service?: string;
  action?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

export interface LogTransport {
  log(entry: LogEntry): void;
}

function sanitizeContext(context: LogContext): LogContext {
  const clone: LogContext = { ...context };
  if ("password" in clone) clone.password = "[REDACTED]";
  if ("token" in clone) clone.token = "[REDACTED]";
  if ("authorization" in clone) clone.authorization = "[REDACTED]";
  return clone;
}

export class ConsoleTransport implements LogTransport {
  log(entry: LogEntry) {
    const method =
      entry.level === "error" || entry.level === "critical"
        ? console.error
        : entry.level === "warn"
          ? console.warn
          : console.log;
    method(`[${entry.level.toUpperCase()}] ${entry.message}`, entry.context);
  }
}

export class FileTransport implements LogTransport {
  constructor(private filePath: string = "error.log") {}

  log(entry: LogEntry) {
    if (typeof window !== 'undefined') return; // no-op on client
    const line = JSON.stringify(entry) + "\n";
    try {
      const fs = require("fs");
      fs.appendFileSync(this.filePath, line, "utf8");
    } catch (err) {
      console.error("FileTransport failed", err);
    }
  }
}

export type ExternalLogger = (entry: LogEntry) => void;

export class ExternalTransport implements LogTransport {
  constructor(private send: ExternalLogger) {}

  log(entry: LogEntry) {
    try {
      this.send(entry);
    } catch (err) {
      console.error("ExternalTransport failed", err);
    }
  }
}

function defaultTransports(): LogTransport[] {
  const list: LogTransport[] = [];
  const { NODE_ENV, MONITORING_SERVICE } = process.env;
  if (NODE_ENV === "development") {
    list.push(new ConsoleTransport());
  }
  if (NODE_ENV === "production") {
    list.push(new FileTransport());
  }
  if (MONITORING_SERVICE) {
    list.push(new ExternalTransport(() => {}));
  }
  return list;
}

/** Lightweight buffered logger used by error handlers. */
export class ErrorLogger {
  private buffer: LogEntry[] = [];
  private transports: LogTransport[];
  private bufferSize: number;
  private sampling: Record<LogLevel, number>;

  constructor(
    transports: LogTransport[] = defaultTransports(),
    bufferSize = 5,
    sampling: Partial<Record<LogLevel, number>> = {},
  ) {
    this.transports = transports;
    this.bufferSize = bufferSize;
    this.sampling = {
      debug: 1,
      info: 1,
      warn: 1,
      error: 1,
      critical: 1,
      ...sampling,
    };
  }

  log(level: LogLevel, message: string, context: LogContext = {}) {
    const rate = this.sampling[level] ?? 1;
    if (rate < 1 && Math.random() > rate) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizeContext(context),
    };
    this.buffer.push(entry);
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  flush() {
    const entries = this.buffer.splice(0);
    for (const entry of entries) {
      for (const t of this.transports) {
        t.log(entry);
      }
    }
  }

  debug(msg: string, ctx?: LogContext) {
    this.log("debug", msg, ctx);
  }
  info(msg: string, ctx?: LogContext) {
    this.log("info", msg, ctx);
  }
  warn(msg: string, ctx?: LogContext) {
    this.log("warn", msg, ctx);
  }
  error(msg: string, ctx?: LogContext) {
    this.log("error", msg, ctx);
  }
  critical(msg: string, ctx?: LogContext) {
    this.log("critical", msg, ctx);
  }

  logServiceError(error: Error, context: LogContext = {}) {
    this.error(error.message, {
      ...context,
      stack: error.stack,
      type: "service",
    });
  }

  logApiError(error: Error, context: LogContext = {}) {
    this.warn(error.message, { ...context, stack: error.stack, type: "api" });
  }

  logClientError(error: Error, context: LogContext = {}) {
    this.warn(error.message, {
      ...context,
      stack: error.stack,
      type: "client",
    });
  }

  logSecurityEvent(message: string, context: LogContext = {}) {
    this.critical(message, { ...context, type: "security" });
  }
}

export const errorLogger = new ErrorLogger();
