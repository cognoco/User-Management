import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/database/supabase';
import { sanitizePII } from '@/lib/utils/pii';
import compliance from '../../config/compliance.config';

interface AuditLogOptions {
  excludePaths?: string[];
  excludeMethods?: string[];
  sensitiveFields?: string[];
  logBody?: boolean;
  logQuery?: boolean;
  logHeaders?: boolean;
  customFields?: (req: NextApiRequest) => Record<string, any>;
}

interface AuditLogEntry {
  timestamp: string;
  method: string | undefined;
  path: string | undefined;
  user_id: string | undefined;
  ip_address: string | string[] | undefined;
  user_agent: string | undefined;
  status_code: number;
  response_time: number;
  query_params?: Record<string, any>;
  request_body?: Record<string, any>;
  headers?: Record<string, any>;
  error?: string;
}

const defaultOptions: Required<AuditLogOptions> = {
  excludePaths: ['/api/health', '/api/metrics'],
  excludeMethods: ['OPTIONS'],
  sensitiveFields: ['password', 'token', 'secret', 'apiKey', 'credit_card'],
  logBody: true,
  logQuery: true,
  logHeaders: false,
  customFields: () => ({}),
};

export function auditLog(options: AuditLogOptions = {}) {
  const opts: Required<AuditLogOptions> = { ...defaultOptions, ...options };

  return async function auditLogMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) {
    const startTime = Date.now();
    let responded = false;

    try {
      // Skip excluded paths and methods
      if (
        opts.excludePaths.some(path => req.url?.startsWith(path)) ||
        opts.excludeMethods.includes(req.method || '')
      ) {
        return next();
      }

      // Prepare base log entry
      const logEntry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.url,
        user_id: (req as any).user?.id,
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent'],
        status_code: res.statusCode,
        response_time: 0,
        ...opts.customFields(req),
      };

      // Add request data if enabled
      if (opts.logQuery && req.query) {
        logEntry.query_params = sanitizeData(req.query, opts.sensitiveFields);
      }

      if (opts.logBody && req.body) {
        logEntry.request_body = sanitizeData(req.body, opts.sensitiveFields);
      }

      if (opts.logHeaders) {
        logEntry.headers = sanitizeData(req.headers, opts.sensitiveFields);
      }

      // Proxy the response methods to capture the status code
      const originalEnd = res.end;
      const originalJson = res.json;

      res.end = function(chunk?: any, encoding?: any, callback?: any) {
        if (!responded) {
          responded = true;
          logEntry.status_code = res.statusCode;
          logEntry.response_time = Date.now() - startTime;
          saveAuditLog(logEntry);
        }
        return originalEnd.call(this, chunk, encoding, callback);
      };

      res.json = function(data: any) {
        if (!responded) {
          responded = true;
          logEntry.status_code = res.statusCode;
          logEntry.response_time = Date.now() - startTime;
          saveAuditLog(logEntry);
        }
        return originalJson.call(this, data);
      };

      await next();

      // If response hasn't been sent yet, log it now
      if (!responded) {
        logEntry.status_code = res.statusCode;
        logEntry.response_time = Date.now() - startTime;
        await saveAuditLog(logEntry);
      }
    } catch (error) {
      console.error('Audit log middleware error:', error);
      if (!responded) {
        const logEntry: AuditLogEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          path: req.url,
          user_id: (req as any).user?.id,
          ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          status_code: 500,
          response_time: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          user_agent: req.headers['user-agent'] || 'unknown',
        };
        await saveAuditLog(logEntry);
      }
      next();
    }
  };
}

function sanitizeData(data: any, sensitiveFields: string[]): any {
  return sanitizePII(data, [...sensitiveFields, ...compliance.piiFields]);
}

async function saveAuditLog(logEntry: AuditLogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([logEntry as any]);

    if (error) {
      console.error('Error saving audit log:', error);
    }
  } catch (error) {
    console.error('Error saving audit log:', error);
  }
} 