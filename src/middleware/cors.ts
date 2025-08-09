import { NextApiRequest, NextApiResponse } from 'next';
import { getServerConfig } from '@/lib/config.server';

interface CorsOptions {
  allowedOrigins?: string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  allowCredentials?: boolean;
  maxAge?: number;
  allowLocalhost?: boolean;
}

const defaultOptions: Required<CorsOptions> = {
  // Default allowed origins come from configuration
  allowedOrigins: getServerConfig().options.security.allowedOrigins.length
    ? getServerConfig().options.security.allowedOrigins
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:5178',
        'http://localhost:5179',
        'http://localhost:5180',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:4173',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
      ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
  allowLocalhost: true, // Allow any localhost origin in development
};

export function cors(options: CorsOptions = {}) {
  const opts = { ...defaultOptions, ...options };
  const isProduction = process.env.NODE_ENV === 'production';

  return async function corsMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) {
    try {
      // Get the origin from the request headers
      const origin = req.headers.origin;

      // In development, always allow any localhost or 127.0.0.1 origin
      const isLocalhostOrigin = origin && (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      );
      
      // Always allow localhost in development mode for easier testing
      if (origin && !isProduction && isLocalhostOrigin) {
        // Set permissive CORS headers for local development
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Headers', opts.allowedHeaders.join(', '));
        res.setHeader('Access-Control-Allow-Methods', opts.allowedMethods.join(', '));
        res.setHeader('Access-Control-Max-Age', String(opts.maxAge));
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.status(204).end();
          return;
        }
      } else {
        // For production or non-localhost origins, use the configured allowed origins
        const isAllowedOrigin = origin && (
          opts.allowedOrigins.includes('*') ||
          opts.allowedOrigins.includes(origin)
        );
        
        if (origin && isAllowedOrigin) {
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', origin);
          
          if (opts.allowCredentials) {
            res.setHeader('Access-Control-Allow-Credentials', 'true');
          }
  
          // Set allowed headers
          res.setHeader('Access-Control-Allow-Headers', opts.allowedHeaders.join(', '));
          
          // Set allowed methods
          res.setHeader('Access-Control-Allow-Methods', opts.allowedMethods.join(', '));
          
          // Set max age
          res.setHeader('Access-Control-Max-Age', String(opts.maxAge));
  
          // Handle preflight requests
          if (req.method === 'OPTIONS') {
            // End the request for preflight
            res.status(204).end();
            return;
          }
        }
      }

      await next();
    } catch (error) {
      console.error('CORS middleware error:', error);
      await next();
    }
  };
}