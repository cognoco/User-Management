# Day 4: Business Features & Stripe Integration

## Goal
Implement business registration, company profiles, and complete Stripe payment integration.

## Morning (4 hours): Business Features

### 1. Business Service (1 hour)
```typescript
// src/lib/services/business.service.ts
import { createClient } from '@/lib/supabase/server'

export interface CompanyData {
  name: string
  industry: string
  size: string
  website?: string
  tax_id?: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
}

export class BusinessService {
  async createCompany(userId: string, data: CompanyData) {
    const supabase = await createClient()
    
    // Create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        ...data,
        owner_id: userId,
      })
      .select()
      .single()

    if (companyError) throw companyError

    // Update user profile to business type
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        account_type: 'business',
        company_id: company.id 
      })
      .eq('id', userId)

    if (profileError) throw profileError

    return company
  }

  async updateCompany(companyId: string, data: Partial<CompanyData>) {
    const supabase = await createClient()
    
    const { data: updated, error } = await supabase
      .from('companies')
      .update(data)
      .eq('id', companyId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  async verifyDomain(companyId: string, domain: string) {
    const supabase = await createClient()
    
    // Create TXT record for verification
    const verificationToken = `pump-verify-${crypto.randomUUID()}`
    
    const { data, error } = await supabase
      .from('domain_verifications')
      .insert({
        company_id: companyId,
        domain,
        verification_token: verificationToken,
        status: 'pending',
      })
      .select()
      .single()

    if (error) throw error
    
    return {
      domain,
      txtRecord: `_pump-verification.${domain}`,
      txtValue: verificationToken,
    }
  }

  async checkDomainVerification(verificationId: string) {
    // In production, would check DNS records
    // For MVP, manual verification or auto-approve
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('domain_verifications')
      .update({ 
        status: 'verified',
        verified_at: new Date().toISOString()
      })
      .eq('id', verificationId)

    if (error) throw error
    return true
  }
}
```

### 2. Business Registration Flow (1.5 hours)
```typescript
// src/app/dashboard/business/register/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const businessSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  industry: z.string().min(1, 'Industry is required'),
  size: z.string().min(1, 'Company size is required'),
  website: z.string().url().optional().or(z.literal('')),
  tax_id: z.string().optional(),
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
})

export default function BusinessRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const form = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      country: 'US',
    }
  })

  async function onSubmit(data) {
    setLoading(true)
    
    try {
      const response = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/dashboard/business')
      }
    } catch (error) {
      console.error('Error creating company:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Register Your Business</CardTitle>
          <CardDescription>
            Convert to a business account to access team features and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="technology">Technology</SelectItem>
                            <SelectItem value="finance">Finance</SelectItem>
                            <SelectItem value="healthcare">Healthcare</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1-10">1-10 employees</SelectItem>
                            <SelectItem value="11-50">11-50 employees</SelectItem>
                            <SelectItem value="51-200">51-200 employees</SelectItem>
                            <SelectItem value="201-500">201-500 employees</SelectItem>
                            <SelectItem value="500+">500+ employees</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  
                  <Button type="button" onClick={() => setStep(2)}>
                    Next
                  </Button>
                </>
              )}
              
              {step === 2 && (
                <>
                  {/* Address fields */}
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Business Account'}
                  </Button>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3. Company Dashboard (1.5 hours)
```typescript
// src/app/dashboard/business/page.tsx
// Company overview
// Domain verification
// Team management link
// Billing overview
```

## Afternoon (4 hours): Stripe Integration

### 1. Stripe Service (1 hour)
```typescript
// src/lib/services/stripe.service.ts
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export class StripeService {
  async createCustomer(userId: string, email: string, name?: string) {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    })

    // Save to database
    const supabase = await createClient()
    await supabase
      .from('stripe_customers')
      .insert({
        user_id: userId,
        stripe_customer_id: customer.id,
      })

    return customer
  }

  async createCheckoutSession(
    customerId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 14,
      },
    })

    return session
  }

  async createPortalSession(customerId: string, returnUrl: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })

    return session
  }

  async handleWebhook(signature: string, rawBody: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!
    
    let event: Stripe.Event
    
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      )
    } catch (err) {
      throw new Error(`Webhook signature verification failed`)
    }

    const supabase = await createClient()

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session
        
        // Update subscription in database
        await supabase
          .from('subscriptions')
          .insert({
            user_id: session.metadata?.userId,
            stripe_subscription_id: session.subscription,
            status: 'active',
            current_period_end: new Date(session.expires_at * 1000),
          })
        break

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription
        
        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
    }

    return { received: true }
  }
}
```

### 2. Billing Page (1.5 hours)
```typescript
// src/app/dashboard/billing/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect('/auth/login')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const plans = [
    {
      name: 'Starter',
      price: '$9/month',
      priceId: 'price_starter',
      features: ['5 team members', 'Basic support', '10GB storage'],
    },
    {
      name: 'Professional',
      price: '$29/month',
      priceId: 'price_professional',
      features: ['Unlimited members', 'Priority support', '100GB storage', 'Advanced features'],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      priceId: null,
      features: ['Custom limits', 'Dedicated support', 'Unlimited storage', 'Custom features'],
    },
  ]

  return (
    <div className="container max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Billing & Subscription</h1>
      
      {subscription ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
            <CardDescription>
              Status: {subscription.status}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}</p>
            <form action="/api/billing/portal" method="POST" className="mt-4">
              <Button type="submit">Manage Subscription</Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.name}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="text-2xl font-bold">
                  {plan.price}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <span className="mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.priceId ? (
                  <form action="/api/billing/checkout" method="POST">
                    <input type="hidden" name="priceId" value={plan.priceId} />
                    <Button type="submit" className="w-full">
                      Start Free Trial
                    </Button>
                  </form>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Contact Sales
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 3. Billing API Routes (1 hour)
```typescript
// src/app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StripeService } from '@/lib/services/stripe.service'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const priceId = formData.get('priceId') as string
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.redirect('/auth/login')
  }

  const stripeService = new StripeService()
  
  // Get or create Stripe customer
  let { data: customer } = await supabase
    .from('stripe_customers')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single()

  if (!customer) {
    const stripeCustomer = await stripeService.createCustomer(
      user.id,
      user.email!
    )
    customer = { stripe_customer_id: stripeCustomer.id }
  }

  // Create checkout session
  const session = await stripeService.createCheckoutSession(
    customer.stripe_customer_id,
    priceId,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
    `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`
  )

  return NextResponse.redirect(session.url!)
}

// src/app/api/billing/portal/route.ts
// Create portal session

// src/app/api/webhooks/stripe/route.ts
// Handle Stripe webhooks
```

### 4. Webhook Handler (30 min)
```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { StripeService } from '@/lib/services/stripe.service'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!
  
  const stripeService = new StripeService()
  
  try {
    await stripeService.handleWebhook(signature, body)
    return NextResponse.json({ received: true })
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    )
  }
}
```

## Testing Checklist

### Business Features
- [ ] Register business account
- [ ] View company profile
- [ ] Edit company details
- [ ] Domain verification flow

### Stripe Integration
- [ ] View pricing plans
- [ ] Start checkout session
- [ ] Redirect to Stripe Checkout
- [ ] Complete test payment
- [ ] Return to success page
- [ ] Subscription created in database
- [ ] Access customer portal
- [ ] Webhook receives events
- [ ] Subscription updates handled

## End of Day 4 Deliverables

1. **Business Features**
   - Company registration
   - Company management
   - Domain verification

2. **Complete Billing**
   - Stripe Checkout integration
   - Customer portal access
   - Webhook handling
   - Subscription management

3. **Production Ready**
   - Secure payment flow
   - Proper error handling
   - Database consistency