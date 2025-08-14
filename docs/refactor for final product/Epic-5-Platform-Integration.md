# Epic 5: Platform Integration

**Duration:** 1.5 weeks  
**Priority:** Medium - Deployment model implementation  
**Epic Owner:** Platform & DevOps Team  
**Status:** Not Started  
**Prerequisites:** Epic 4 (SDK Creation) must be complete

## Executive Summary

Platform Integration implements the hybrid subdomain + SDK deployment model that enables the user management platform to be consumed both as a standalone service and as an integrated component. This epic creates the infrastructure and patterns that make the platform truly pluggable for enterprise customers.

**Key Insight:** We're building the deployment and integration infrastructure that transforms our platform from a development tool into a production-ready service.

## Problem Statement

Current single-app deployment limits scalability and integration options:
- **No subdomain deployment**: Cannot serve auth.customer.com patterns
- **No cross-domain authentication**: Users can't seamlessly move between host and platform
- **No iframe integration**: Embedded auth flows not supported
- **No monitoring integration**: Cannot track usage across deployments
- **No multi-tenant isolation**: All customers share single instance

## Objectives

### Primary Goal
Enable flexible deployment patterns:
- Subdomain deployments (auth.customer.com)
- Seamless cross-domain authentication flows
- Iframe and modal integration patterns
- Multi-tenant configuration management
- Comprehensive monitoring and analytics

### Secondary Goals
- Support multiple authentication strategies
- Enable custom domain configurations
- Provide deployment templates for major cloud providers
- Create monitoring and alerting infrastructure
- Build foundation for enterprise features

## Success Criteria

### Critical Success Factors
- [ ] 🌐 **Subdomain Deployment**: Platform deployable on customer subdomains
- [ ] 🔒 **Cross-Domain Auth**: Seamless authentication across domains
- [ ] 📱 **Iframe Integration**: Embedded auth flows work in host applications
- [ ] 📊 **Monitoring**: Comprehensive usage tracking and error monitoring
- [ ] ⚙️ **Multi-Tenant Config**: Customer-specific configurations supported
- [ ] 🚀 **Performance**: Integration adds <100ms latency to auth flows

### Quality Gates
1. Authentication works seamlessly between host.com and auth.host.com
2. Iframe integration works without security issues
3. Monitoring captures all critical metrics
4. Multi-tenant configurations are properly isolated
5. Deployment templates work on major cloud providers

## Target Integration Architecture

```
Production Deployment Models:

1. Subdomain Model (Recommended)
   ┌─────────────────┐    ┌─────────────────┐
   │   app.com       │    │  auth.app.com   │
   │                 │◄──►│                 │
   │ Host Application│    │ Pump Platform   │
   │ + SDK           │    │                 │
   └─────────────────┘    └─────────────────┘

2. Iframe Model (Alternative)
   ┌─────────────────────────────────────────┐
   │           app.com                       │
   │  ┌─────────────────────────────────────┐│
   │  │ <iframe src="auth.pump.io">         ││
   │  │                                     ││
   │  │    Embedded Pump Platform           ││
   │  │                                     ││
   │  └─────────────────────────────────────┘│
   └─────────────────────────────────────────┘

3. SDK-Only Model (Full Integration)
   ┌─────────────────────────────────────────┐
   │           app.com                       │
   │                                         │
   │  Host Application with Embedded SDK     │
   │  (UI components + API client)           │
   │                                         │
   └─────────────────────────────────────────┘
```

## Detailed Task Breakdown

### Task 5.1: Subdomain Deployment Infrastructure
**Owner:** DevOps & Platform Team  
**Duration:** 3 days  
**Priority:** Critical

#### Next.js Subdomain Configuration
```typescript
// apps/user-mgmt/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Enable cross-origin requests for auth flows
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS || '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          // Security headers
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
  
  async rewrites() {
    return [
      // Handle subdomain routing
      {
        source: '/api/:path*',
        destination: '/api/:path*',
        has: [
          {
            type: 'host',
            value: '(?<subdomain>.*)\\.pump\\.io',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### Docker Configuration for Multi-Tenant Deployment
```dockerfile
# Dockerfile.subdomain
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with subdomain support
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Kubernetes Deployment Template
```yaml
# k8s/pump-platform.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pump-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pump-platform
  template:
    metadata:
      labels:
        app: pump-platform
    spec:
      containers:
      - name: pump-platform
        image: pump/platform:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pump-secrets
              key: database-url
        - name: NEXTAUTH_SECRET
          valueFrom:
            secretKeyRef:
              name: pump-secrets
              key: nextauth-secret
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: pump-platform-service
spec:
  selector:
    app: pump-platform
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pump-platform-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - "*.pump.io"
    - "auth.example.com"
    secretName: pump-platform-tls
  rules:
  - host: auth.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: pump-platform-service
            port:
              number: 80
```

#### Infrastructure as Code (Terraform)
```hcl
# terraform/aws/main.tf
resource "aws_ecs_cluster" "pump_cluster" {
  name = "pump-platform"
  
  capacity_providers = ["FARGATE"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 100
  }
}

resource "aws_ecs_task_definition" "pump_platform" {
  family                   = "pump-platform"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn

  container_definitions = jsonencode([
    {
      name  = "pump-platform"
      image = "${aws_ecr_repository.pump_platform.repository_url}:latest"
      
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
        }
      ]
      
      environment = [
        {
          name  = "NODE_ENV"
          value = "production"
        }
      ]
      
      secrets = [
        {
          name      = "DATABASE_URL"
          valueFrom = aws_ssm_parameter.database_url.arn
        }
      ]
      
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = "/ecs/pump-platform"
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])
}

# Application Load Balancer for subdomain routing
resource "aws_lb" "pump_platform" {
  name               = "pump-platform-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids

  enable_deletion_protection = false
}

resource "aws_lb_listener" "pump_platform" {
  load_balancer_arn = aws_lb.pump_platform.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.ssl_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.pump_platform.arn
  }
}
```

#### Acceptance Criteria
- [ ] Platform deployable on customer subdomains
- [ ] Docker images optimized for production
- [ ] Kubernetes manifests work on major providers
- [ ] Infrastructure as Code templates provided
- [ ] SSL certificates auto-provisioned

---

### Task 5.2: Cross-Domain Authentication Implementation
**Owner:** Authentication Team  
**Duration:** 3 days  
**Priority:** Critical

#### Cross-Domain Session Sharing
```typescript
// apps/user-mgmt/src/lib/auth/cross-domain.ts
interface CrossDomainAuthConfig {
  parentDomain: string;
  authDomain: string;
  cookieDomain: string;
}

export class CrossDomainAuth {
  private config: CrossDomainAuthConfig;

  constructor(config: CrossDomainAuthConfig) {
    this.config = config;
  }

  async initiateAuthFlow(redirectUrl: string): Promise<string> {
    // Generate secure state parameter
    const state = this.generateSecureState();
    
    // Store redirect URL in secure session
    await this.storeAuthState(state, {
      redirectUrl,
      timestamp: Date.now(),
      origin: window.location.origin,
    });

    // Construct auth URL with state
    const authUrl = new URL('/auth/login', this.config.authDomain);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', redirectUrl);

    return authUrl.toString();
  }

  async handleAuthCallback(state: string, code: string): Promise<AuthResult> {
    // Verify state parameter
    const authState = await this.getAuthState(state);
    if (!authState || this.isStateExpired(authState)) {
      throw new Error('Invalid or expired auth state');
    }

    // Exchange code for tokens
    const tokens = await this.exchangeCodeForTokens(code);
    
    // Set cross-domain cookies
    await this.setCrossDomainCookies(tokens);

    // Return user data
    return {
      user: tokens.user,
      redirectUrl: authState.redirectUrl,
    };
  }

  private async setCrossDomainCookies(tokens: TokenPair): Promise<void> {
    // Set cookies on both domains
    const cookieOptions = {
      domain: this.config.cookieDomain,
      secure: true,
      httpOnly: true,
      sameSite: 'none' as const,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };

    // Set on auth domain
    await this.setCookie('pump_access_token', tokens.accessToken, cookieOptions);
    await this.setCookie('pump_refresh_token', tokens.refreshToken, cookieOptions);

    // Notify parent domain via postMessage
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'PUMP_AUTH_SUCCESS',
        tokens: {
          accessToken: tokens.accessToken,
          // Don't send refresh token via postMessage for security
        },
      }, this.config.parentDomain);
    }
  }

  private generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
```

#### PostMessage Communication
```typescript
// packages/pump-sdk/src/integration/iframe.ts
export class IframeAuthHandler {
  private iframe: HTMLIFrameElement | null = null;
  private authPromise: Promise<AuthResult> | null = null;

  async openAuthModal(config: AuthModalConfig): Promise<AuthResult> {
    if (this.authPromise) {
      return this.authPromise;
    }

    this.authPromise = this.createAuthFlow(config);
    
    try {
      return await this.authPromise;
    } finally {
      this.authPromise = null;
      this.cleanup();
    }
  }

  private async createAuthFlow(config: AuthModalConfig): Promise<AuthResult> {
    return new Promise((resolve, reject) => {
      // Create modal overlay
      const overlay = this.createModalOverlay();
      
      // Create iframe
      this.iframe = this.createAuthIframe(config.authUrl);
      overlay.appendChild(this.iframe);
      document.body.appendChild(overlay);

      // Listen for auth completion
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== config.authDomain) {
          return; // Ignore messages from other origins
        }

        switch (event.data.type) {
          case 'PUMP_AUTH_SUCCESS':
            window.removeEventListener('message', handleMessage);
            resolve({
              user: event.data.user,
              tokens: event.data.tokens,
            });
            break;

          case 'PUMP_AUTH_ERROR':
            window.removeEventListener('message', handleMessage);
            reject(new Error(event.data.error));
            break;

          case 'PUMP_AUTH_CANCEL':
            window.removeEventListener('message', handleMessage);
            reject(new Error('Authentication cancelled by user'));
            break;
        }
      };

      window.addEventListener('message', handleMessage);

      // Handle iframe load errors
      this.iframe.onerror = () => {
        window.removeEventListener('message', handleMessage);
        reject(new Error('Failed to load authentication iframe'));
      };
    });
  }

  private createModalOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.cleanup();
      }
    });

    return overlay;
  }

  private createAuthIframe(authUrl: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.src = authUrl;
    iframe.style.cssText = `
      width: 400px;
      height: 600px;
      border: none;
      border-radius: 8px;
      background: white;
    `;
    iframe.allow = 'camera; microphone; geolocation';
    
    return iframe;
  }

  private cleanup(): void {
    if (this.iframe) {
      const overlay = this.iframe.parentElement;
      if (overlay && overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
      this.iframe = null;
    }
  }
}
```

#### Security Configuration
```typescript
// apps/user-mgmt/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get origin from request
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  // Configure CORS for cross-domain auth
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  // Configure iframe embedding permissions
  if (request.nextUrl.pathname.startsWith('/auth/')) {
    const frameAncestors = getAllowedFrameAncestors();
    response.headers.set('Content-Security-Policy', 
      `frame-ancestors ${frameAncestors.join(' ')};`
    );
  }

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: response.headers });
  }

  return response;
}

function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  return allowedOrigins.includes(origin) || 
         allowedOrigins.includes('*') ||
         isSubdomainAllowed(origin);
}

function isSubdomainAllowed(origin: string): boolean {
  // Allow subdomains of customer domains
  const allowedDomains = process.env.ALLOWED_DOMAINS?.split(',') || [];
  const url = new URL(origin);
  
  return allowedDomains.some(domain => 
    url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  );
}

export const config = {
  matcher: ['/api/:path*', '/auth/:path*'],
};
```

#### Acceptance Criteria
- [ ] Cross-domain authentication works seamlessly
- [ ] Iframe integration is secure and functional
- [ ] PostMessage communication is implemented safely
- [ ] CORS configuration supports customer domains
- [ ] Security measures prevent common attacks

---

### Task 5.3: Monitoring & Analytics Integration
**Owner:** Monitoring Team  
**Duration:** 2 days  
**Priority:** High

#### Telemetry Collection
```typescript
// apps/user-mgmt/src/lib/telemetry/collector.ts
interface TelemetryEvent {
  event: string;
  userId?: string;
  sessionId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  domain?: string;
  integration: 'subdomain' | 'iframe' | 'sdk';
}

export class TelemetryCollector {
  private events: TelemetryEvent[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(private config: TelemetryConfig) {
    // Flush events every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000);
  }

  track(event: string, properties: Record<string, any> = {}): void {
    const telemetryEvent: TelemetryEvent = {
      event,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      properties: {
        ...properties,
        userAgent: navigator.userAgent,
        url: window.location.href,
        referrer: document.referrer,
      },
      timestamp: new Date(),
      domain: window.location.hostname,
      integration: this.detectIntegration(),
    };

    this.events.push(telemetryEvent);

    // Flush immediately for critical events
    if (this.isCriticalEvent(event)) {
      this.flush();
    }
  }

  // Auth-specific tracking
  trackAuthEvent(event: AuthEventType, details: AuthEventDetails): void {
    this.track(`auth_${event}`, {
      method: details.method, // 'email', 'oauth', 'sso'
      provider: details.provider, // 'google', 'github', etc.
      success: details.success,
      errorCode: details.errorCode,
      duration: details.duration,
    });
  }

  // User journey tracking
  trackUserJourney(step: string, details: Record<string, any> = {}): void {
    this.track('user_journey', {
      step,
      ...details,
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.track('performance', {
      metric,
      value,
      unit,
      ...this.getPerformanceContext(),
    });
  }

  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (error) {
      // Re-queue events on failure (with limit)
      if (this.events.length < 1000) {
        this.events.unshift(...eventsToSend);
      }
    }
  }

  private detectIntegration(): 'subdomain' | 'iframe' | 'sdk' {
    if (window.parent !== window) return 'iframe';
    if (window.location.hostname.includes('auth.')) return 'subdomain';
    return 'sdk';
  }

  private isCriticalEvent(event: string): boolean {
    const criticalEvents = [
      'auth_login_success',
      'auth_login_failed',
      'auth_register_success',
      'error_critical',
    ];
    return criticalEvents.includes(event);
  }

  private getPerformanceContext(): Record<string, any> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint: this.getFirstPaintTime(),
      connectionType: (navigator as any).connection?.effectiveType,
    };
  }

  private getFirstPaintTime(): number | undefined {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint?.startTime;
  }
}

// Global telemetry instance
export const telemetry = new TelemetryCollector({
  endpoint: '/api/telemetry',
  batchSize: 50,
  flushInterval: 30000,
});
```

#### Dashboard & Metrics
```typescript
// apps/user-mgmt/src/lib/monitoring/dashboard.ts
export interface DashboardMetrics {
  // Authentication metrics
  authMetrics: {
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    avgLoginTime: number;
    loginMethods: Record<string, number>;
  };

  // User activity metrics
  userMetrics: {
    activeUsers: number;
    newRegistrations: number;
    profileUpdates: number;
    passwordResets: number;
  };

  // Integration metrics
  integrationMetrics: {
    subdomainRequests: number;
    iframeLoads: number;
    sdkCalls: number;
    crossDomainAuths: number;
  };

  // Performance metrics
  performanceMetrics: {
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
    uptime: number;
  };

  // Error tracking
  errorMetrics: {
    totalErrors: number;
    criticalErrors: number;
    commonErrors: Array<{
      message: string;
      count: number;
      lastSeen: Date;
    }>;
  };
}

export class MetricsDashboard {
  async getMetrics(timeRange: TimeRange): Promise<DashboardMetrics> {
    const metrics = await Promise.all([
      this.getAuthMetrics(timeRange),
      this.getUserMetrics(timeRange),
      this.getIntegrationMetrics(timeRange),
      this.getPerformanceMetrics(timeRange),
      this.getErrorMetrics(timeRange),
    ]);

    return {
      authMetrics: metrics[0],
      userMetrics: metrics[1],
      integrationMetrics: metrics[2],
      performanceMetrics: metrics[3],
      errorMetrics: metrics[4],
    };
  }

  async generateReport(timeRange: TimeRange): Promise<UsageReport> {
    const metrics = await this.getMetrics(timeRange);
    
    return {
      summary: this.generateSummary(metrics),
      trends: await this.getTrends(timeRange),
      insights: await this.generateInsights(metrics),
      recommendations: this.generateRecommendations(metrics),
    };
  }

  private generateInsights(metrics: DashboardMetrics): Insight[] {
    const insights: Insight[] = [];

    // Login success rate insight
    const loginSuccessRate = 
      metrics.authMetrics.successfulLogins / metrics.authMetrics.totalLogins;
    
    if (loginSuccessRate < 0.9) {
      insights.push({
        type: 'warning',
        title: 'Low Login Success Rate',
        description: `Login success rate is ${(loginSuccessRate * 100).toFixed(1)}%. Consider reviewing error messages and UX.`,
        impact: 'high',
      });
    }

    // Performance insight
    if (metrics.performanceMetrics.avgResponseTime > 1000) {
      insights.push({
        type: 'warning',
        title: 'Slow Response Times',
        description: `Average response time is ${metrics.performanceMetrics.avgResponseTime}ms. Consider optimization.`,
        impact: 'medium',
      });
    }

    return insights;
  }
}
```

#### Error Tracking Integration
```typescript
// apps/user-mgmt/src/lib/monitoring/error-tracking.ts
import * as Sentry from '@sentry/nextjs';

export function initializeErrorTracking(): void {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    
    // Capture unhandled promise rejections
    captureUnhandledRejections: true,
    
    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive fields
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      // Remove sensitive request data
      if (event.request?.data) {
        const sensitiveFields = ['password', 'token', 'secret'];
        sensitiveFields.forEach(field => {
          if (event.request!.data[field]) {
            event.request!.data[field] = '[Filtered]';
          }
        });
      }
      
      return event;
    },

    // Set user context
    initialScope: (scope) => {
      scope.setTag('platform', 'pump-user-management');
      scope.setContext('deployment', {
        type: process.env.DEPLOYMENT_TYPE || 'unknown',
        domain: process.env.DOMAIN || 'unknown',
      });
      return scope;
    },
  });
}

// Custom error tracking for business logic
export function trackAuthError(error: Error, context: AuthErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'authentication');
    scope.setContext('auth_context', {
      method: context.method,
      step: context.step,
      userId: context.userId ? '[REDACTED]' : undefined,
    });
    
    Sentry.captureException(error);
  });
}

export function trackIntegrationError(error: Error, context: IntegrationErrorContext): void {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'integration');
    scope.setContext('integration_context', {
      type: context.integrationType,
      domain: context.domain,
      userAgent: context.userAgent,
    });
    
    Sentry.captureException(error);
  });
}
```

#### Acceptance Criteria
- [ ] Comprehensive telemetry collection implemented
- [ ] Dashboard shows real-time metrics
- [ ] Error tracking captures integration issues
- [ ] Performance monitoring tracks response times
- [ ] Usage analytics provide actionable insights

---

### Task 5.4: Multi-Tenant Configuration Management
**Owner:** Configuration Team  
**Duration:** 2 days  
**Priority:** Medium

#### Tenant Configuration System
```typescript
// apps/user-mgmt/src/lib/config/tenant.ts
export interface TenantConfig {
  id: string;
  domain: string;
  subdomain: string;
  
  // Branding configuration
  branding: {
    name: string;
    logo?: string;
    primaryColor?: string;
    favicon?: string;
  };
  
  // Authentication configuration
  auth: {
    enabledMethods: AuthMethod[];
    passwordPolicy: PasswordPolicy;
    sessionTimeout: number;
    enableMFA: boolean;
    enableSSO: boolean;
    ssoProviders: SSOProvider[];
  };
  
  // Feature flags
  features: {
    enableTeams: boolean;
    enableAuditLogs: boolean;
    enableAPIKeys: boolean;
    maxUsers?: number;
  };
  
  // Integration settings
  integration: {
    allowedOrigins: string[];
    webhookEndpoints: string[];
    corsSettings: CORSSettings;
  };
  
  // Billing configuration
  billing?: {
    plan: 'free' | 'pro' | 'enterprise';
    customerId: string;
    subscriptionId: string;
  };
}

export class TenantConfigManager {
  private cache = new Map<string, TenantConfig>();
  private cacheExpiry = new Map<string, number>();

  async getTenantConfig(domain: string): Promise<TenantConfig> {
    // Check cache first
    const cached = this.cache.get(domain);
    const expiry = this.cacheExpiry.get(domain);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Fetch from database
    const config = await this.fetchTenantConfig(domain);
    
    // Cache for 5 minutes
    this.cache.set(domain, config);
    this.cacheExpiry.set(domain, Date.now() + 5 * 60 * 1000);
    
    return config;
  }

  async updateTenantConfig(domain: string, updates: Partial<TenantConfig>): Promise<TenantConfig> {
    const currentConfig = await this.getTenantConfig(domain);
    const updatedConfig = this.mergeConfigs(currentConfig, updates);
    
    // Validate configuration
    await this.validateConfig(updatedConfig);
    
    // Save to database
    await this.saveTenantConfig(updatedConfig);
    
    // Invalidate cache
    this.cache.delete(domain);
    this.cacheExpiry.delete(domain);
    
    return updatedConfig;
  }

  private async fetchTenantConfig(domain: string): Promise<TenantConfig> {
    // Query database for tenant configuration
    const tenant = await db.tenant.findUnique({
      where: { domain },
      include: {
        authConfig: true,
        brandingConfig: true,
        featureFlags: true,
      },
    });

    if (!tenant) {
      throw new Error(`Tenant not found for domain: ${domain}`);
    }

    return this.mapDatabaseToConfig(tenant);
  }

  private async validateConfig(config: TenantConfig): Promise<void> {
    // Validate required fields
    if (!config.domain || !config.subdomain) {
      throw new Error('Domain and subdomain are required');
    }

    // Validate allowed origins
    config.integration.allowedOrigins.forEach(origin => {
      try {
        new URL(origin);
      } catch {
        throw new Error(`Invalid origin URL: ${origin}`);
      }
    });

    // Validate feature flags against billing plan
    if (config.billing?.plan === 'free') {
      if (config.features.enableTeams) {
        throw new Error('Teams feature requires Pro or Enterprise plan');
      }
      if (config.features.maxUsers && config.features.maxUsers > 5) {
        throw new Error('Free plan limited to 5 users');
      }
    }
  }

  private mergeConfigs(current: TenantConfig, updates: Partial<TenantConfig>): TenantConfig {
    return {
      ...current,
      ...updates,
      branding: { ...current.branding, ...updates.branding },
      auth: { ...current.auth, ...updates.auth },
      features: { ...current.features, ...updates.features },
      integration: { ...current.integration, ...updates.integration },
    };
  }
}
```

#### Runtime Configuration Injection
```typescript
// apps/user-mgmt/src/app/layout.tsx
import { getTenantConfig } from '@/lib/config/tenant';
import { TenantProvider } from '@/providers/TenantProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Extract domain from headers
  const domain = headers().get('host') || 'localhost';
  const tenantConfig = await getTenantConfig(domain);

  return (
    <html lang="en" data-theme={tenantConfig.branding.theme || 'default'}>
      <head>
        <title>{tenantConfig.branding.name} - User Management</title>
        <link rel="icon" href={tenantConfig.branding.favicon || '/favicon.ico'} />
        
        {/* Inject tenant-specific CSS variables */}
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary-color: ${tenantConfig.branding.primaryColor || '#3B82F6'};
              --brand-name: "${tenantConfig.branding.name}";
            }
          `
        }} />
      </head>
      <body>
        <TenantProvider config={tenantConfig}>
          {children}
        </TenantProvider>
      </body>
    </html>
  );
}
```

#### Configuration API
```typescript
// apps/user-mgmt/src/app/api/admin/tenant/config/route.ts
export async function GET(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const domain = url.searchParams.get('domain') || request.headers.get('host');
  
  if (!domain) {
    return NextResponse.json({ error: 'Domain required' }, { status: 400 });
  }

  try {
    const configManager = new TenantConfigManager();
    const config = await configManager.getTenantConfig(domain);
    
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tenant configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const session = await getServerSession();
  
  if (!session?.user?.roles?.includes('admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const updates = await request.json();
    const domain = request.headers.get('host');
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain required' }, { status: 400 });
    }

    const configManager = new TenantConfigManager();
    const updatedConfig = await configManager.updateTenantConfig(domain, updates);
    
    return NextResponse.json(updatedConfig);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to update configuration' },
      { status: 400 }
    );
  }
}
```

#### Acceptance Criteria
- [ ] Multi-tenant configuration system working
- [ ] Runtime configuration injection functional
- [ ] Admin API for configuration management
- [ ] Configuration validation prevents invalid states
- [ ] Caching optimizes performance

## Cloud Provider Templates

### AWS Deployment Template
```yaml
# aws/cloudformation-template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'Pump Platform - User Management System'

Parameters:
  DomainName:
    Type: String
    Description: 'Primary domain name (e.g., example.com)'
  
  DatabaseURL:
    Type: String
    Description: 'Database connection URL'
    NoEcho: true

Resources:
  # ECS Cluster for container orchestration
  PumpCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: pump-platform
      CapacityProviders: [FARGATE]

  # Application Load Balancer
  LoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: pump-platform-alb
      Scheme: internet-facing
      Type: application
      Subnets: [!Ref PublicSubnet1, !Ref PublicSubnet2]
      SecurityGroups: [!Ref ALBSecurityGroup]

  # SSL Certificate
  SSLCertificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: !Sub 'auth.${DomainName}'
      SubjectAlternativeNames:
        - !Sub '*.auth.${DomainName}'
      ValidationMethod: DNS

Outputs:
  LoadBalancerDNS:
    Description: 'Load Balancer DNS Name'
    Value: !GetAtt LoadBalancer.DNSName
    Export:
      Name: !Sub '${AWS::StackName}-LoadBalancerDNS'
```

### Google Cloud Deployment
```yaml
# gcp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pump-platform
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: pump-platform
  template:
    metadata:
      labels:
        app: pump-platform
    spec:
      containers:
      - name: pump-platform
        image: gcr.io/PROJECT_ID/pump-platform:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: pump-secrets
              key: database-url
        resources:
          requests:
            memory: 256Mi
            cpu: 100m
          limits:
            memory: 512Mi
            cpu: 500m
---
apiVersion: v1
kind: Service
metadata:
  name: pump-platform-service
spec:
  selector:
    app: pump-platform
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Security Considerations

### Cross-Origin Resource Sharing (CORS)
- Strict origin validation
- Credential-aware CORS headers
- Dynamic CORS configuration per tenant

### Content Security Policy (CSP)
- Frame ancestors configuration for iframe embedding
- Script source restrictions
- Style source limitations

### Token Security
- Secure token storage patterns
- Cross-domain token sharing protocols
- Token refresh mechanisms

## Performance Optimization

### Caching Strategy
- Tenant configuration caching
- CDN integration for static assets
- Browser caching for API responses

### Load Balancing
- Geographic load distribution
- Health check implementations
- Graceful failure handling

### Monitoring & Alerting
- Real-time performance metrics
- Error rate monitoring
- Capacity planning metrics

## Risk Assessment

### High Risk Items
1. **Cross-Domain Security**
   - Risk: Security vulnerabilities in cross-domain auth flows
   - Mitigation: Comprehensive security testing, CORS validation
   - Monitoring: Security audit logs, anomaly detection

2. **Multi-Tenant Isolation**
   - Risk: Data leakage between tenants
   - Mitigation: Strict tenant isolation, configuration validation
   - Testing: Tenant isolation tests

### Medium Risk Items
1. **Performance Impact**
   - Risk: Integration overhead affects user experience
   - Mitigation: Performance monitoring, optimization
   - Benchmarks: <100ms additional latency

2. **Configuration Complexity**
   - Risk: Complex configuration leads to errors
   - Mitigation: Validation, testing, documentation
   - Support: Configuration assistance tools

## Definition of Done

### Technical Completion
- [ ] Subdomain deployment working on major cloud providers
- [ ] Cross-domain authentication flows tested and secure
- [ ] Iframe integration works without security issues
- [ ] Monitoring captures all critical metrics
- [ ] Multi-tenant configuration system operational

### Quality Assurance
- [ ] Security testing passed for all integration methods
- [ ] Performance testing meets latency requirements
- [ ] Multi-tenant isolation verified
- [ ] Documentation complete for deployment
- [ ] Integration examples working

### User Acceptance
- [ ] Customers can deploy on their subdomains
- [ ] Integration adds minimal complexity
- [ ] Monitoring provides actionable insights
- [ ] Performance meets production requirements
- [ ] Ready for enterprise customer use

## Success Metrics

### Quantitative Measures
- **Integration Latency**: <100ms additional latency
- **Deployment Time**: <30 minutes from template to running
- **Uptime**: >99.9% availability
- **Security**: 0 critical security vulnerabilities

### Qualitative Measures
- **Deployment Experience**: Easy setup with provided templates
- **Integration Quality**: Seamless user experience across domains
- **Monitoring Effectiveness**: Clear visibility into system health
- **Customer Satisfaction**: Positive feedback on integration options

## Next Steps After Completion

1. **Epic 5 Retrospective**: Platform integration lessons learned
2. **Epic 6 Planning**: Documentation and launch preparation
3. **Enterprise Testing**: Real customer deployment testing
4. **Scale Optimization**: Performance optimization for high traffic

---

**Key Success Factor: This epic makes the platform truly enterprise-ready by enabling flexible deployment patterns that meet diverse customer infrastructure requirements.**