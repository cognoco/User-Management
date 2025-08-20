# Technology Stack for MVP Rebuild

## Core Framework
- **Next.js 15.3.3** - App Router, Server Components, Server Actions
- **React 19** - Latest stable
- **TypeScript 5.2+** - Strict mode enabled

## Authentication & Database
- **Supabase** - Auth, Database, Realtime, Storage
  - `@supabase/supabase-js` 2.39.3
  - `@supabase/ssr` 0.6.1
- **Database**: PostgreSQL (via Supabase)
- **File Storage**: Supabase Storage (for avatars/logos)

## UI Framework
- **Tailwind CSS 3.4** - Utility-first CSS
- **Shadcn/UI** - Component library
- **Radix UI** - Headless components
- **Lucide React** - Icons

## State Management
- **Zustand 5.0.4** - Client state
- **React Hook Form 7.50** - Form management
- **Zod 3.24** - Schema validation

## Payments
- **Stripe** - Payments & subscriptions
  - `stripe` 18.0.0 (server)
  - `@stripe/stripe-js` 7.0.0 (client)

## Email Service
- **Resend** - Transactional emails
  - `resend` latest
  - Alternative: `@sendgrid/mail` if preferred

## Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Playwright** - E2E testing (simplified)
- **Vitest** - Unit testing (optional)

## Deployment
- **Vercel** - Hosting platform
- **GitHub Actions** - CI/CD

## Environment Variables Required
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Package.json Dependencies (Minimal)
```json
{
  "dependencies": {
    // Framework
    "next": "15.3.3",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    
    // Supabase
    "@supabase/supabase-js": "^2.39.3",
    "@supabase/ssr": "^0.6.1",
    
    // UI
    "@radix-ui/react-avatar": "^1.1.9",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.14",
    "@radix-ui/react-label": "^2.1.6",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-slot": "^1.2.2",
    "@radix-ui/react-toast": "^1.2.13",
    
    // Forms & Validation
    "react-hook-form": "^7.50.1",
    "@hookform/resolvers": "^5.0.1",
    "zod": "^3.24.4",
    
    // State
    "zustand": "^5.0.4",
    
    // Payments
    "stripe": "^18.0.0",
    "@stripe/stripe-js": "^7.0.0",
    
    // Email
    "resend": "^3.0.0",
    
    // Utils
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.2.0",
    "lucide-react": "^0.510.0",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.17.47",
    "@types/react": "^19.1.6",
    "@types/react-dom": "^19.1.6",
    "typescript": "^5.2.2",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "@playwright/test": "^1.52.0",
    "eslint": "^8.57.1",
    "eslint-config-next": "^15.3.2"
  }
}
```

## Architecture Principles (Simplified)

### 1. Three-Layer Architecture
```
Presentation → Business Logic → Data Access
(Pages/Components) → (Services) → (Providers)
```

### 2. Folder Structure
```
src/
  app/                 # Next.js App Router
  components/         # UI Components
  lib/               # Business Logic
    services/        # Business services
    providers/       # External integrations
    utils/          # Helpers
  types/            # TypeScript types
```

### 3. Service Pattern
```typescript
interface IService {
  // Contract
}

class Service implements IService {
  constructor(private provider: IProvider) {}
  // Business logic
}

class Provider implements IProvider {
  // External integration
}
```

## What We DON'T Include (Defer Post-MVP)
- ❌ Sentry/Error tracking (add later)
- ❌ Analytics (add later)
- ❌ Complex monitoring (add later)
- ❌ Redis caching (add later)
- ❌ WebSockets (unless needed)
- ❌ i18n (add later)
- ❌ Complex testing setup (keep simple)