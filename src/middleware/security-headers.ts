import { NextApiRequest, NextApiResponse } from 'next';

interface SecurityHeadersOptions {
  contentSecurityPolicy?: boolean | {
    directives?: Partial<Record<string, string[]>>;
  };
  xFrameOptions?: boolean | string;
  xContentTypeOptions?: boolean;
  referrerPolicy?: boolean | string;
  strictTransportSecurity?: STSOptions;
  xXSSProtection?: boolean | string;
  xPermittedCrossDomainPolicies?: boolean | string;
  xDNSPrefetchControl?: boolean;
  expectCT?: CTOptions;
  /** Additional custom headers to include */
  additionalHeaders?: Record<string, string>;
  /** Custom error handler */
  onError?: (req: NextApiRequest, res: NextApiResponse, error: unknown) => void | Promise<void>;
}

interface STSOptions {
  enabled?: boolean;
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

interface CTOptions {
  enabled?: boolean;
  maxAge: number;
  enforce: boolean;
  reportUri?: string;
}

type CSPDirectives = Record<string, string[]>;

const defaultCSPDirectives: CSPDirectives = {
  'default-src': ["'self'"],
  'base-uri': ["'self'"],
  'font-src': ["'self'", 'https:', 'data:'],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'img-src': ["'self'", 'data:', 'https:'],
  'object-src': ["'none'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  'script-src-attr': ["'none'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'upgrade-insecure-requests': [],
};

const defaultOptions: Required<Omit<SecurityHeadersOptions, 'additionalHeaders' | 'onError'>> = {
  contentSecurityPolicy: {
    directives: defaultCSPDirectives,
  },
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  strictTransportSecurity: {
    enabled: true,
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  xXSSProtection: '1; mode=block',
  xPermittedCrossDomainPolicies: 'none',
  xDNSPrefetchControl: true,
  expectCT: {
    enabled: true,
    maxAge: 86400,
    enforce: true,
  },
};

export function securityHeaders(options: SecurityHeadersOptions = {}) {
  const { additionalHeaders, onError, ...rest } = options;
  const opts = { ...defaultOptions, ...rest };

  return async function securityHeadersMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next: () => Promise<void>
  ) {
    try {
      // X-DNS-Prefetch-Control
      if (opts.xDNSPrefetchControl) {
        res.setHeader('X-DNS-Prefetch-Control', 'on');
      }

      // Strict-Transport-Security
      /* c8 ignore next */
      if (opts.strictTransportSecurity?.enabled !== false) {
        const stsOptions = opts.strictTransportSecurity || defaultOptions.strictTransportSecurity;
        let stsHeader = `max-age=${stsOptions.maxAge}`;
        /* c8 ignore next */
        if (stsOptions.includeSubDomains) stsHeader += '; includeSubDomains';
        /* c8 ignore next */
        if (stsOptions.preload) stsHeader += '; preload';
        res.setHeader('Strict-Transport-Security', stsHeader);
      }

      // X-Frame-Options
      /* c8 ignore next */
      if (opts.xFrameOptions) {
        res.setHeader(
          'X-Frame-Options',
          typeof opts.xFrameOptions === 'string' ? opts.xFrameOptions : 'SAMEORIGIN'
        );
      }

      // X-Content-Type-Options
      /* c8 ignore next */
      if (opts.xContentTypeOptions) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      }

      // X-XSS-Protection
      /* c8 ignore next */
      if (opts.xXSSProtection) {
        res.setHeader(
          'X-XSS-Protection',
          typeof opts.xXSSProtection === 'string' ? opts.xXSSProtection : '1; mode=block'
        );
      }

      // Referrer-Policy
      /* c8 ignore next */
      if (opts.referrerPolicy) {
        res.setHeader(
          'Referrer-Policy',
          typeof opts.referrerPolicy === 'string'
            ? opts.referrerPolicy
            : 'strict-origin-when-cross-origin'
        );
      }

      // Content-Security-Policy
      /* c8 ignore next */
      if (opts.contentSecurityPolicy) {
        const csp = typeof opts.contentSecurityPolicy === 'object'
          ? {
              directives: {
                ...defaultCSPDirectives,
                ...(opts.contentSecurityPolicy.directives || {}),
              },
            }
          : { directives: defaultCSPDirectives };

        const cspHeader = Object.entries(csp.directives)
          .map(([key, values = []]) => `${key} ${values.join(' ')}`)
          .join('; ');

        res.setHeader('Content-Security-Policy', cspHeader);
      }

      // X-Permitted-Cross-Domain-Policies
      /* c8 ignore next */
      if (opts.xPermittedCrossDomainPolicies) {
        res.setHeader(
          'X-Permitted-Cross-Domain-Policies',
          typeof opts.xPermittedCrossDomainPolicies === 'string'
            ? opts.xPermittedCrossDomainPolicies
            : 'none'
        );
      }

      // Expect-CT
      /* c8 ignore next */
      if (opts.expectCT?.enabled !== false) {
        const ctOptions = opts.expectCT || defaultOptions.expectCT;
        let ctHeader = `max-age=${ctOptions.maxAge}`;
        if (ctOptions.enforce) ctHeader += ', enforce';
        if (ctOptions.reportUri) ctHeader += `, report-uri="${ctOptions.reportUri}"`;
        res.setHeader('Expect-CT', ctHeader);
      }

      /* c8 ignore next */
      if (additionalHeaders) {
        Object.entries(additionalHeaders).forEach(([key, value]) => {
          res.setHeader(key, value);
        });
      }

      await next();
    } catch (error) {
      console.error('Security headers middleware error:', error);
      /* c8 ignore next */
      if (onError) {
        await onError(req, res, error);
      }
      await next();
    }
  };
}
