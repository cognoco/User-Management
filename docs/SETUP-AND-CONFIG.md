# Setup, Configuration & Deployment Guide

**Last Updated:** 2025-08-16  
**Status:** Consolidated Guide

## Table of Contents
1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [Configuration](#configuration)
4. [Authentication Setup](#authentication-setup)
5. [Database Setup](#database-setup)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Node.js 18+
- pnpm 8+
- PostgreSQL 15+ (via Supabase)
- Git

### Installation

```bash
# Clone repository
git clone <repository-url>
cd user-management-reorganized

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Setup database
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

### Verify Installation
- Open http://localhost:3000
- Check health endpoint: http://localhost:3000/api/health
- Run tests: `pnpm test`

---

## Environment Setup

### Required Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Stripe (if using subscriptions)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Email (SendGrid/Resend)
EMAIL_SERVER_HOST=smtp.sendgrid.net
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER=apikey
EMAIL_SERVER_PASSWORD=your-api-key
EMAIL_FROM=noreply@example.com

# Security
NEXTAUTH_SECRET=generate-random-secret
CSRF_SECRET=generate-random-secret
```

### Development vs Production

**Development (.env.local)**
```bash
NODE_ENV=development
NEXT_PUBLIC_ENABLE_DEBUG=true
NEXT_PUBLIC_MOCK_AUTH=false
```

**Production (.env.production)**
```bash
NODE_ENV=production
NEXT_PUBLIC_ENABLE_DEBUG=false
DATABASE_POOL_MAX=20
```

---

## Configuration

### Main Configuration File

`userManagement.config.ts`:

```typescript
export const config = {
  // Application
  app: {
    name: 'User Management',
    url: process.env.NEXT_PUBLIC_APP_URL,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
  },
  
  // Features
  features: {
    registration: true,
    socialLogin: true,
    mfa: true,
    teams: true,
    subscriptions: true,
    dataExport: true,
  },
  
  // Authentication
  auth: {
    sessionMaxAge: 30 * 24 * 60 * 60, // 30 days
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60, // 15 minutes
  },
  
  // Database
  database: {
    provider: 'supabase', // or 'prisma', 'mock'
    poolMax: 20,
    poolMin: 5,
    connectionTimeout: 60000,
  },
  
  // Email
  email: {
    provider: 'sendgrid', // or 'resend', 'smtp'
    from: process.env.EMAIL_FROM,
  },
  
  // Storage
  storage: {
    provider: 'supabase', // or 's3', 'local'
    avatarMaxSize: 2 * 1024 * 1024, // 2MB
    allowedFormats: ['image/jpeg', 'image/png'],
  },
};
```

### Feature Flags

Control features at runtime:

```typescript
// config/features.ts
export const featureFlags = {
  // Core features
  ENABLE_REGISTRATION: true,
  ENABLE_PASSWORD_RESET: true,
  ENABLE_EMAIL_VERIFICATION: true,
  
  // Advanced features
  ENABLE_SSO: true,
  ENABLE_MFA: true,
  ENABLE_WEBHOOKS: false,
  ENABLE_API_KEYS: false,
  
  // Experimental
  ENABLE_WEBAUTHN: false,
  ENABLE_MAGIC_LINKS: false,
};
```

---

## Authentication Setup

### Supabase Auth Configuration

1. **Enable Authentication Providers**
   - Email/Password
   - Google OAuth
   - GitHub OAuth
   - Microsoft (optional)

2. **Configure JWT Settings**
   ```sql
   -- In Supabase SQL Editor
   ALTER DATABASE postgres 
   SET "app.jwt_secret" TO 'your-jwt-secret';
   
   -- Set JWT expiry
   ALTER DATABASE postgres 
   SET "app.jwt_exp" TO 3600;
   ```

3. **Setup Email Templates**
   - Confirmation email
   - Password reset
   - Magic link
   - Invitation

### OAuth Setup

**Google OAuth:**
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Add redirect URL: `https://yourproject.supabase.co/auth/v1/callback`

**GitHub OAuth:**
1. Create OAuth App in GitHub Settings
2. Set Authorization callback URL
3. Copy Client ID and Secret to Supabase

### MFA Configuration

```typescript
// Enable MFA for user
await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Authenticator App'
});

// Verify MFA code
await supabase.auth.mfa.verify({
  factorId,
  code: userInput
});
```

---

## Database Setup

### Supabase Setup

1. **Create Project**
   ```bash
   npx supabase init
   npx supabase start
   ```

2. **Run Migrations**
   ```bash
   npx supabase migration up
   ```

3. **Enable Row Level Security**
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
   ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
   ```

4. **Create Indexes**
   ```sql
   CREATE INDEX idx_profiles_user_id ON profiles(user_id);
   CREATE INDEX idx_team_members_user_id ON team_members(user_id);
   CREATE INDEX idx_team_members_team_id ON team_members(team_id);
   ```

### Prisma Setup (Alternative)

```bash
# Initialize Prisma
npx prisma init

# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npx prisma db seed
```

---

## Deployment

### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
RUN npm ci --production
EXPOSE 3000
CMD ["npm", "start"]
```

### Production Checklist

- [ ] Environment variables set
- [ ] Database migrations run
- [ ] SSL certificates configured
- [ ] CDN configured for assets
- [ ] Monitoring enabled (Sentry)
- [ ] Logging configured
- [ ] Backup strategy in place
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Security headers set

---

## Troubleshooting

### Common Issues

**Build Fails**
```bash
# Clear cache
rm -rf .next node_modules
pnpm install
pnpm build
```

**Database Connection Issues**
```bash
# Check connection
npx supabase status

# Reset database
npx supabase db reset
```

**Authentication Issues**
- Verify JWT secret matches
- Check session cookies
- Verify redirect URLs
- Check CORS settings

**TypeScript Errors**
```bash
# Regenerate types
pnpm generate:types

# Check for issues
npx tsc --noEmit
```

### Debug Mode

Enable debug logging:
```typescript
// Set in .env.local
NEXT_PUBLIC_ENABLE_DEBUG=true
DEBUG=app:*

// In code
if (process.env.NEXT_PUBLIC_ENABLE_DEBUG) {
  console.log('Debug info:', data);
}
```

### Performance Issues

1. Check database queries
2. Enable query logging
3. Review bundle size
4. Check for memory leaks
5. Profile with Chrome DevTools

---

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error logs
- Check system health
- Review security alerts

**Weekly:**
- Update dependencies
- Run security audit
- Backup database
- Review performance metrics

**Monthly:**
- Update documentation
- Review and rotate secrets
- Audit user permissions
- Clean up old sessions

### Monitoring

```typescript
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: checkDatabase(),
    services: checkServices(),
  });
});
```

---

*This guide consolidates all setup, configuration, and deployment documentation. For specific feature setup, see the feature documentation.*