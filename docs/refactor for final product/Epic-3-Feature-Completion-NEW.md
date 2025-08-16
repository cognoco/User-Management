# Epic 3: Feature Completion & Integration (NEW)

**Duration:** 2 weeks  
**Priority:** HIGH - Required for MVP completion  
**Epic Owner:** Full Stack Team  
**Status:** Ready to Start  
**Prerequisites:** Epic 0 complete, Epic 2 recommended  
**Created:** 2025-08-16

## Executive Summary

This epic focuses on completing the missing features identified in our gap analysis. While 85% of functionality exists, critical features like avatar upload, complete Stripe integration, and password reset need to be finished for production readiness.

## Features to Complete

### Priority 1: Critical Gaps (Week 1)

#### 1. Avatar Upload Implementation
**Current State:** UI exists but not wired  
**Required Work:** 3 days

```typescript
// Implementation needed in:
// src/services/profile/default-profile.service.ts
async updateAvatar(userId: string, file: File): Promise<string> {
  // Validate file
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Invalid file type');
  }
  if (file.size > 2 * 1024 * 1024) { // 2MB
    throw new Error('File too large');
  }
  
  // Upload to storage
  const fileName = `${userId}-${Date.now()}.${file.type.split('/')[1]}`;
  const { data, error } = await this.storage.upload('avatars', fileName, file);
  
  // Update profile
  await this.updateProfile(userId, { avatar_url: data.publicUrl });
  return data.publicUrl;
}
```

**Files to modify:**
- `/src/app/api/profile/avatar/route.ts` (create)
- `/src/services/profile/default-profile.service.ts`
- `/src/ui/styled/profile/AvatarUpload.tsx`
- `/src/hooks/profile/useAvatar.ts` (create)

#### 2. Stripe Integration Completion
**Current State:** Partial implementation  
**Required Work:** 4 days

**Missing Components:**
```typescript
// 1. Customer creation on registration
// src/services/auth/default-auth.service.ts
async register(data: RegisterInput) {
  const user = await this.createUser(data);
  
  // NEW: Create Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id }
  });
  
  // Store customer ID
  await this.updateUser(user.id, { 
    stripe_customer_id: customer.id 
  });
}

// 2. Webhook signature verification
// src/app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const signature = req.headers.get('stripe-signature');
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  // Process events...
}

// 3. Subscription management
// src/services/subscription/default-subscription.service.ts
async createCheckoutSession(userId: string, priceId: string) {
  const user = await this.getUser(userId);
  
  return stripe.checkout.sessions.create({
    customer: user.stripe_customer_id,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/subscription/success`,
    cancel_url: `${process.env.APP_URL}/subscription/cancel`,
  });
}
```

#### 3. Password Reset Flow
**Current State:** UI exists, backend incomplete  
**Required Work:** 2 days

```typescript
// src/services/auth/password-reset.ts
async requestPasswordReset(email: string) {
  const user = await this.findUserByEmail(email);
  if (!user) return; // Don't reveal if user exists
  
  const token = generateSecureToken();
  const expires = new Date(Date.now() + 3600000); // 1 hour
  
  await this.storeResetToken(user.id, token, expires);
  await this.sendResetEmail(user.email, token);
}

async resetPassword(token: string, newPassword: string) {
  const reset = await this.validateResetToken(token);
  if (!reset || reset.expires < new Date()) {
    throw new Error('Invalid or expired token');
  }
  
  await this.updatePassword(reset.userId, newPassword);
  await this.invalidateResetToken(token);
  await this.notifyPasswordChange(reset.userId);
}
```

### Priority 2: Enhancement Features (Week 2)

#### 4. Privacy Settings Storage
**Current State:** Types defined, not implemented  
**Required Work:** 1 day

```sql
-- Migration needed
ALTER TABLE profiles 
ADD COLUMN privacy_settings JSONB DEFAULT '{
  "profileVisibility": "private",
  "showEmail": false,
  "showPhone": false,
  "showLocation": false,
  "allowMessages": true,
  "allowTeamInvites": true
}'::jsonb;

CREATE INDEX idx_profiles_privacy ON profiles USING GIN(privacy_settings);
```

#### 5. Device Management
**Current State:** Not implemented  
**Required Work:** 3 days

```sql
-- New table needed
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  device_id TEXT NOT NULL,
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);
```

#### 6. Backup Codes Refactor
**Current State:** Stored in user metadata  
**Required Work:** 2 days

```sql
-- Dedicated table for better security
CREATE TABLE mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_backup_codes_user (user_id)
);
```

## Testing Requirements

### Unit Tests
Each feature must have:
- Service layer tests (>90% coverage)
- API route tests
- Component tests
- Hook tests

### Integration Tests
- Avatar upload with different file types
- Stripe webhook processing
- Password reset flow end-to-end
- Privacy settings enforcement

### E2E Tests
```typescript
// e2e/avatar-upload.spec.ts
test('user can upload avatar', async ({ page }) => {
  await loginUser(page);
  await page.goto('/settings/profile');
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-avatar.jpg');
  
  await expect(page.locator('.avatar-preview')).toBeVisible();
  await page.click('button:text("Save")');
  
  await expect(page.locator('.success-message')).toContainText('Avatar updated');
});
```

## API Specifications

### Avatar Upload
```typescript
POST /api/profile/avatar
Content-Type: multipart/form-data

Response:
{
  "avatarUrl": "https://storage.example.com/avatars/user-123.jpg",
  "message": "Avatar updated successfully"
}
```

### Stripe Webhooks
```typescript
POST /api/webhooks/stripe
Headers: 
  - Stripe-Signature: [signature]

Events to handle:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

## Success Criteria

### Must Have
- [ ] Avatar upload working with 2MB limit
- [ ] Stripe customer creation on registration
- [ ] Webhook signature verification
- [ ] Password reset email delivery
- [ ] Privacy settings persisted

### Should Have
- [ ] Device management UI
- [ ] Backup codes in dedicated table
- [ ] Proration for plan changes
- [ ] Failed payment retry logic

### Could Have
- [ ] Progressive image loading
- [ ] Multiple avatar history
- [ ] Advanced privacy controls
- [ ] Usage-based billing

## Dependencies

### External Services
- Stripe API access and webhook configuration
- Supabase Storage bucket setup
- Email service (SendGrid/Resend) configuration
- CDN for avatar delivery (optional)

### Internal Dependencies
- Epic 0 completion (build must work)
- Epic 2 recommended (database consistency)
- Design team approval for UI changes
- Security review for device management

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Stripe API changes | HIGH | Use latest SDK, version lock |
| File upload security | HIGH | Strict validation, virus scanning |
| Email delivery failure | MEDIUM | Retry logic, multiple providers |
| Storage costs | LOW | Implement quotas, compression |

## Definition of Done

### Feature Complete When:
- [ ] All code implemented and reviewed
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests implemented
- [ ] Documentation updated
- [ ] Security review passed
- [ ] Performance acceptable (<500ms)
- [ ] Deployed to staging
- [ ] Product owner approval

## Rollout Strategy

### Phase 1: Internal Testing
- Deploy to staging
- Internal team testing
- Fix identified issues

### Phase 2: Beta Users
- Enable for 10% of users
- Monitor metrics
- Gather feedback

### Phase 3: General Availability
- Enable for all users
- Marketing announcement
- Support documentation

---

*This epic completes the MVP feature set for production launch.*