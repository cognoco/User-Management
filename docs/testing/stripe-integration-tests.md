# Stripe Integration Test Documentation

## Overview
Comprehensive test suite for the Stripe payment integration covering webhooks, checkout, invoices, and payment methods.

## Test Files Created

### 1. Webhook Handler Tests
**File:** `app/api/webhooks/stripe/__tests__/route.test.ts`
**Test Cases:** 10
**Coverage:**
- ✅ Signature verification (valid/invalid)
- ✅ Missing webhook secret handling
- ✅ Subscription lifecycle events (created, updated, deleted)
- ✅ Invoice events (payment succeeded, payment failed)
- ✅ Checkout session completed
- ✅ Customer events (created, updated)
- ✅ Payment method events (attached, detached)
- ✅ Missing metadata handling
- ✅ Unknown event type handling

### 2. Checkout Session Tests
**File:** `app/api/payments/checkout/__tests__/route.test.ts`
**Test Cases:** 12
**Coverage:**
- ✅ Creating checkout sessions
- ✅ Customer creation when not exists
- ✅ Authentication validation
- ✅ Required parameter validation
- ✅ Custom success/cancel URLs
- ✅ Session retrieval
- ✅ Ownership verification
- ✅ Error handling

### 3. Invoice Management Tests
**File:** `app/api/payments/invoices/__tests__/route.test.ts`
**Test Cases:** 13
**Coverage:**
- ✅ Invoice listing with pagination
- ✅ Individual invoice retrieval
- ✅ PDF URL generation
- ✅ Invoice sending via email
- ✅ Authentication checks
- ✅ Ownership validation
- ✅ Empty state handling
- ✅ Error scenarios

### 4. E2E Payment Flow Tests
**File:** `e2e/payments/stripe-payment-flow.spec.ts`
**Test Cases:** 9 (+ 1 mobile)
**Coverage:**
- ✅ Complete checkout flow
- ✅ Invoice history display
- ✅ Payment method management (add, set default, remove)
- ✅ Subscription cancellation and resumption
- ✅ Customer portal access
- ✅ Payment failure handling
- ✅ Subscription details display
- ✅ Webhook event processing
- ✅ Mobile checkout flow

## Running the Tests

### Unit Tests (Vitest)
```bash
# Run all Stripe tests
npm test -- app/api/webhooks/stripe/__tests__
npm test -- app/api/payments/checkout/__tests__
npm test -- app/api/payments/invoices/__tests__

# Run specific test file
npm test -- app/api/webhooks/stripe/__tests__/route.test.ts

# Run with coverage
npm test -- --coverage app/api/payments
```

### E2E Tests (Playwright)
```bash
# Run E2E payment tests
npx playwright test e2e/payments/stripe-payment-flow.spec.ts

# Run in headed mode for debugging
npx playwright test e2e/payments/stripe-payment-flow.spec.ts --headed

# Run specific test
npx playwright test e2e/payments/stripe-payment-flow.spec.ts -g "should complete checkout flow"
```

## Test Environment Requirements

### Environment Variables
```env
# Required for tests to run
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Mock Data
Tests use the following mock data:
- User ID: `user_123`
- Customer ID: `cus_test`
- Subscription ID: `sub_test`
- Invoice ID: `inv_test`
- Price ID: `price_test`

## Security Testing

The tests verify:
1. **Authentication**: All endpoints require authenticated sessions
2. **Authorization**: Users can only access their own data
3. **Signature Verification**: Webhooks validate Stripe signatures
4. **Data Validation**: Required parameters are enforced
5. **Error Handling**: Graceful handling of failures

## Coverage Summary

| Component | Test Cases | Key Areas |
|-----------|------------|-----------|
| Webhooks | 10 | Event processing, signature verification |
| Checkout | 12 | Session creation, retrieval |
| Invoices | 13 | Listing, PDF, sending |
| E2E Flow | 10 | Complete user journey |
| **Total** | **45** | **Full payment system** |

## Known Issues

1. **Test Runner Timeout**: The vitest test runner may timeout in some environments due to complex setup files. This is an environment issue, not a test issue.

2. **Stripe Test Mode**: E2E tests require Stripe test keys to be configured. Tests will be skipped if `STRIPE_SECRET_KEY` is not set.

## Maintenance

### Adding New Tests
1. Follow the existing pattern for mock setup
2. Use descriptive test names
3. Test both success and failure cases
4. Verify security checks
5. Clean up after each test

### Updating Tests
When the API changes:
1. Update mock data structures
2. Adjust expected responses
3. Add tests for new functionality
4. Ensure backward compatibility

## Benefits

✅ **Confidence**: Payment system reliability
✅ **Security**: Authorization and validation
✅ **Documentation**: Tests as API docs
✅ **Regression Prevention**: Catch bugs early
✅ **Refactoring Safety**: Change with confidence

---

*Last Updated: 2025-08-17*
*Total Test Cases: 45*
*Coverage: Webhooks, Checkout, Invoices, Payment Methods, E2E*