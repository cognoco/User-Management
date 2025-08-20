# Day 2: Core Authentication Implementation

## Goal
Build complete authentication flow with email service integration.

## Morning (4 hours): Authentication Pages & Components

### 1. Copy and Adapt UI Components (30 min)
```bash
# Copy from old project
cp -r ../user-management-reorganized/src/components/ui/* src/components/ui/
cp ../user-management-reorganized/src/lib/utils.ts src/lib/
```

### 2. Create Auth Layout (30 min)
```typescript
// src/app/auth/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
```

### 3. Build Login Page (1 hour)
```typescript
// src/app/auth/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: LoginFormData) {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (result.success) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(result.error || 'Login failed')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-gray-500">Enter your credentials to access your account</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="you@example.com" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between">
            <Link 
              href="/auth/forgot-password" 
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <Link href="/auth/register" className="text-blue-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}
```

### 4. Build Registration Page (1 hour)
```typescript
// src/app/auth/register/page.tsx
// Similar structure to login with additional fields:
// - firstName, lastName
// - acceptTerms checkbox
// - Password confirmation
```

### 5. Build Password Reset Page (1 hour)
```typescript
// src/app/auth/forgot-password/page.tsx
// Email input only
// Sends reset link

// src/app/auth/reset-password/page.tsx  
// New password form with token validation
```

## Afternoon (4 hours): API Routes & Services

### 1. Setup Email Service (30 min)
```typescript
// src/lib/email/email.service.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

export interface IEmailService {
  sendVerificationEmail(to: string, token: string): Promise<void>
  sendPasswordResetEmail(to: string, token: string): Promise<void>
  sendWelcomeEmail(to: string, name: string): Promise<void>
}

export class EmailService implements IEmailService {
  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`
    
    await resend.emails.send({
      from: 'noreply@yourapp.com',
      to,
      subject: 'Verify your email',
      html: `
        <p>Click the link below to verify your email:</p>
        <a href="${verifyUrl}">Verify Email</a>
      `
    })
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`
    
    await resend.emails.send({
      from: 'noreply@yourapp.com',
      to,
      subject: 'Reset your password',
      html: `
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
      `
    })
  }

  async sendWelcomeEmail(to: string, name: string) {
    await resend.emails.send({
      from: 'noreply@yourapp.com',
      to,
      subject: 'Welcome to Our App!',
      html: `
        <h1>Welcome, ${name}!</h1>
        <p>Thank you for signing up.</p>
      `
    })
  }
}
```

### 2. Create Auth Service (1 hour)
```typescript
// src/lib/services/auth.service.ts
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { EmailService } from '@/lib/email/email.service'

export class AuthService {
  private emailService = new EmailService()

  async login(email: string, password: string) {
    const supabase = await createClient()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  async register(data: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) {
    const supabase = createServiceClient()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm for MVP
      user_metadata: {
        first_name: data.firstName,
        last_name: data.lastName,
      }
    })

    if (authError) throw authError

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
      })

    if (profileError) throw profileError

    // Send welcome email
    await this.emailService.sendWelcomeEmail(
      data.email, 
      data.firstName
    )

    return authData
  }

  async logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }

  async resetPassword(email: string) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })

    if (error) throw error
  }

  async updatePassword(newPassword: string) {
    const supabase = await createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error
  }
}
```

### 3. Create API Routes (1.5 hours)
```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '@/lib/services/auth.service'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    const authService = new AuthService()
    const data = await authService.login(email, password)
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    )
  }
}

// src/app/api/auth/register/route.ts
// Similar structure for registration

// src/app/api/auth/logout/route.ts
// Handle logout

// src/app/api/auth/forgot-password/route.ts
// Send reset email

// src/app/api/auth/reset-password/route.ts
// Update password with token
```

### 4. Create Protected Dashboard (1 hour)
```typescript
// src/app/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {profile?.first_name || user.email}!</p>
      
      <form action="/api/auth/logout" method="POST">
        <button type="submit" className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
          Logout
        </button>
      </form>
    </div>
  )
}
```

## Testing Checklist

### Authentication Flow
- [ ] Can register new user
- [ ] Receive welcome email
- [ ] Can login with credentials
- [ ] Redirected to dashboard after login
- [ ] Cannot access dashboard without login
- [ ] Can logout successfully
- [ ] Can request password reset
- [ ] Receive reset email
- [ ] Can update password with token

### Edge Cases
- [ ] Duplicate email registration blocked
- [ ] Invalid credentials show error
- [ ] Required fields validated
- [ ] Email format validated
- [ ] Password strength validated

## End of Day 2 Deliverables

1. **Working Authentication**
   - Login/Register/Logout
   - Password reset flow
   - Email notifications

2. **Protected Routes**
   - Middleware protection
   - Dashboard access control
   - Auth redirects

3. **Clean Architecture**
   - Auth service abstraction
   - Email service integration
   - Proper error handling