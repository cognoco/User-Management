export interface ErrorReporterOptions {
  environment: string;
  release: string;
  serverName?: string;
  maxBreadcrumbs?: number;
}

import { v4 as uuidv4 } from 'uuid';
import { ApplicationError, createErrorFromUnknown } from '@/core/common/errors';
import { errorLogger } from '@/lib/monitoring/error-logger';
import { ErrorClusterer } from './error-clustering';

interface Breadcrumb {
  message: string;
  category: string;
  data?: Record<string, any>;
  timestamp: string;
}

interface ErrorPayload {
  id: string;
  error: ApplicationError;
  context: Record<string, any>;
  breadcrumbs: Breadcrumb[];
}

type Integration = (payload: ErrorPayload) => void | Promise<void>;

export class ErrorReporter {
  private static instance: ErrorReporter;
  private static clusterer = new ErrorClusterer();
  private initialized = false;
  private options: ErrorReporterOptions;
  private breadcrumbs: Breadcrumb[] = [];
  private integrations: Integration[] = [];
  private userContext: Record<string, any> = {};

  private constructor(options: ErrorReporterOptions) {
    this.options = { maxBreadcrumbs: 20, ...options };
  }

  public static getInstance(): ErrorReporter {
    if (!ErrorReporter.instance) {
      ErrorReporter.instance = new ErrorReporter({
        environment: process.env.NODE_ENV || 'development',
        release: process.env.VERSION || '0.0.0',
      });
    }
    return ErrorReporter.instance;
  }

  public static getClusters() {
    return this.clusterer.getClusters();
  }

  public initialize(): void {
    if (this.initialized) return;

    if (typeof window !== 'undefined') {
      this.initializeBrowserReporting();
    } else {
      this.initializeServerReporting();
    }

    this.initialized = true;
  }

  public setUserContext(context: Record<string, any>) {
    this.userContext = { ...context };
  }

  public addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    const breadcrumb: Breadcrumb = {
      message,
      category,
      data,
      timestamp: new Date().toISOString(),
    };
    this.breadcrumbs.push(breadcrumb);
    const max = this.options.maxBreadcrumbs ?? 20;
    if (this.breadcrumbs.length > max) {
      this.breadcrumbs.splice(0, this.breadcrumbs.length - max);
    }
  }

  public captureError(error: Error | ApplicationError, context: Record<string, any> = {}): string {
    const appError = createErrorFromUnknown(error);
    const id = uuidv4();
    const systemState = typeof process !== 'undefined' && typeof process.uptime === 'function' ? { uptime: process.uptime() } : {};
    const payload: ErrorPayload = {
      id,
      error: appError,
      context: {
        environment: this.options.environment,
        release: this.options.release,
        serverName: this.options.serverName,
        ...systemState,
        ...(this.userContext && { user: this.userContext }),
        ...context,
      },
      breadcrumbs: [...this.breadcrumbs],
    };

    for (const integration of this.integrations) {
      try {
        integration(payload);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Error reporting integration failed', e);
      }
    }

    ErrorReporter.clusterer.addError(appError);

    return id;
  }

  /* istanbul ignore next -- environment specific */
  private initializeBrowserReporting(): void {
    /* istanbul ignore next -- integration optional */
    if ((window as any).Sentry && process.env.NEXT_PUBLIC_SENTRY_DSN) {
      try {
        (window as any).Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: this.options.environment,
          release: this.options.release,
        });
        this.integrations.push(payload => {
          (window as any).Sentry.captureException(payload.error, { extra: payload });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Sentry initialization failed', err);
      }
    }

    /* istanbul ignore next -- runtime integration */
    if (process.env.NEXT_PUBLIC_ERROR_ENDPOINT) {
      this.integrations.push(payload => {
        fetch(process.env.NEXT_PUBLIC_ERROR_ENDPOINT!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      });
    }

    this.integrations.push(payload => {
      errorLogger.error(payload.error.message, {
        ...payload.context,
        breadcrumbs: payload.breadcrumbs,
        stack: payload.error.stack,
        id: payload.id,
      });
    });
  }

  /* istanbul ignore next -- environment specific */
  private async initializeServerReporting(): Promise<void> {
    /* istanbul ignore next -- integration optional */
    if (process.env.SENTRY_DSN) {
      try {
        // Wrap in runtime guard to avoid bundling if not present
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Sentry = require('@sentry/node');
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: this.options.environment,
          release: this.options.release,
          serverName: this.options.serverName,
        });
        this.integrations.push(payload => {
          Sentry.captureException(payload.error, { extra: payload });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Sentry initialization failed', err);
      }
    }

    /* istanbul ignore next -- runtime integration */
    if (process.env.ERROR_ENDPOINT) {
      this.integrations.push(payload => {
        fetch(process.env.ERROR_ENDPOINT!, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});
      });
    }

    this.integrations.push(payload => {
      errorLogger.error(payload.error.message, {
        ...payload.context,
        breadcrumbs: payload.breadcrumbs,
        stack: payload.error.stack,
        id: payload.id,
      });
    });
  }
}

export default ErrorReporter;
