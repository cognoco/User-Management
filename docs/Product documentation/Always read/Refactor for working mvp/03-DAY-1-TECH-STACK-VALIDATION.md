# Day 1: Technology Stack Validation & Setup

## Goal
Validate that all technologies work together with a simple proof of concept:
- Frontend page → API route → Middleware → Supabase → Response

## Morning (4 hours): Project Setup & Configuration

### 1. Create Fresh Next.js Project (30 min)
```bash
# Create new project
npx create-next-app@latest pump-mvp \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

cd pump-mvp

# Install core dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install zustand react-hook-form zod @hookform/resolvers
npm install clsx tailwind-merge lucide-react
npm install resend stripe @stripe/stripe-js

# Dev dependencies
npm install -D @types/node
```

### 2. Copy Essential Files (30 min)
```bash
# From old project, copy:
cp ../user-management-reorganized/.env .env.local
cp ../user-management-reorganized/tailwind.config.js .
cp ../user-management-reorganized/postcss.config.js .
cp -r ../user-management-reorganized/supabase .
```

### 3. Setup Supabase Client (1 hour)
```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// src/lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js'

export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### 4. Create Middleware (30 min)
```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect logged-in users away from auth pages
  if (request.nextUrl.pathname.startsWith('/auth/') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 5. Setup Project Structure (1 hour)
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── test/
│   │       └── page.tsx
│   ├── api/
│   │   ├── health/
│   │   │   └── route.ts
│   │   └── auth/
│   │       └── test/
│   │           └── route.ts
│   └── dashboard/
│       └── page.tsx
├── components/
│   └── ui/
│       └── button.tsx (copy from old project)
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── service.ts
│   ├── services/
│   │   └── auth.service.ts
│   └── utils.ts
├── types/
│   └── index.ts
└── middleware.ts
```

## Afternoon (4 hours): Proof of Concept Implementation

### 1. Create Test Page (30 min)
```typescript
// src/app/auth/test/page.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'test@example.com',
          action: 'validate' 
        }),
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Tech Stack Test</h1>
      
      <div className="space-y-4">
        <Button onClick={testConnection} disabled={loading}>
          {loading ? 'Testing...' : 'Test Full Stack'}
        </Button>
        
        {result && (
          <pre className="bg-gray-100 p-4 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
```

### 2. Create Test API Route (30 min)
```typescript
// src/app/api/auth/test/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AuthService } from '@/lib/services/auth.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, action } = body
    
    // Test 1: Supabase connection
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser()
    
    // Test 2: Service layer
    const authService = new AuthService()
    const validation = await authService.validateEmail(email)
    
    // Test 3: Database query
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tests: {
        request: { email, action },
        auth: { 
          connected: true, 
          user: authData?.user?.email || null 
        },
        service: { 
          validation,
          working: true 
        },
        database: { 
          connected: !error,
          error: error?.message || null
        }
      }
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
```

### 3. Create Basic Auth Service (1 hour)
```typescript
// src/lib/services/auth.service.ts
import { createClient } from '@/lib/supabase/server'

export interface IAuthService {
  validateEmail(email: string): Promise<boolean>
  checkUserExists(email: string): Promise<boolean>
}

export class AuthService implements IAuthService {
  async validateEmail(email: string): Promise<boolean> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  async checkUserExists(email: string): Promise<boolean> {
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    
    return !!data
  }
}
```

### 4. Create Health Check Endpoint (30 min)
```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Check Supabase connection
    const supabase = await createClient()
    const { error } = await supabase.from('profiles').select('id').limit(1)
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        api: 'operational',
        database: error ? 'error' : 'operational',
        auth: 'operational'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    )
  }
}
```

### 5. Test Everything (1.5 hours)

#### Manual Testing Checklist:
- [ ] Server starts in <5 seconds
- [ ] Health check returns success: http://localhost:3000/api/health
- [ ] Test page loads: http://localhost:3000/auth/test
- [ ] Button click triggers API call
- [ ] API returns all test results
- [ ] Middleware redirects work
- [ ] No console errors
- [ ] No TypeScript errors

#### Create Simple E2E Test:
```typescript
// e2e/stack-validation.spec.ts
import { test, expect } from '@playwright/test'

test('tech stack validation', async ({ page }) => {
  // Test health endpoint
  const health = await page.request.get('/api/health')
  expect(health.ok()).toBeTruthy()
  
  // Test page loads
  await page.goto('/auth/test')
  await expect(page.getByText('Tech Stack Test')).toBeVisible()
  
  // Test API interaction
  await page.getByRole('button', { name: 'Test Full Stack' }).click()
  await expect(page.locator('pre')).toContainText('success')
})
```

## Success Criteria for Day 1

### Must Have (Critical):
- ✅ Next.js server starts in <5 seconds
- ✅ Supabase connection works
- ✅ API routes respond
- ✅ Middleware executes
- ✅ Client can call API
- ✅ No build errors

### Should Have (Important):
- ✅ TypeScript strict mode works
- ✅ Tailwind styles apply
- ✅ UI component renders
- ✅ Service pattern works
- ✅ Environment variables load

### Nice to Have (Bonus):
- ✅ E2E test passes
- ✅ Hot reload works
- ✅ No console warnings

## Troubleshooting Guide

### If Supabase connection fails:
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test with curl
curl https://[your-project].supabase.co/rest/v1/profiles \
  -H "apikey: [your-anon-key]"
```

### If TypeScript errors:
```bash
# Reset TypeScript
rm -rf node_modules .next
npm install
npm run dev
```

### If Middleware doesn't work:
```typescript
// Add logging to middleware
console.log('Middleware executing for:', request.nextUrl.pathname)
```

## End of Day 1 Deliverables

1. **Working Application**
   - Tech stack validated
   - All layers connected
   - No performance issues

2. **Code Structure**
   - Clean architecture established
   - Service pattern proven
   - TypeScript configured

3. **Documentation**
   - This plan executed
   - Issues documented
   - Ready for Day 2

## Next: Day 2 - Core Authentication
With the tech stack proven, we'll build:
- Login page and API
- Registration page and API  
- Password reset flow
- Email service integration