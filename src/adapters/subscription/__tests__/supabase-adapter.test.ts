import { describe, it, expect, beforeEach } from 'vitest';
import { SupabaseSubscriptionProvider } from '../supabase/supabase-subscription.provider';
import { setTableMockData, resetSupabaseMock } from '@/tests/mocks/supabase';

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321';
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key';

const subRecord = {
  id: 'sub-1',
  user_id: 'user-1',
  plan_id: 'plan-1',
  status: 'active',
  start_date: '2024-01-01T00:00:00Z',
};

const planRecord = { id: 'plan-1', name: 'Pro', tier: 'premium', price: 10, period: 'monthly', features: [], is_public: true, is_active: true, trial_days: 0 };

describe('SupabaseSubscriptionProvider', () => {
  beforeEach(() => {
    resetSupabaseMock();
    setTableMockData('subscriptions', { data: [subRecord], error: null });
    setTableMockData('subscription_plans', { data: [planRecord], error: null });
  });

  it('retrieves a user subscription', async () => {
    const provider = new SupabaseSubscriptionProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const result = await provider.getUserSubscription('user-1');
    expect(result?.id).toBe('sub-1');
    expect(result?.planId).toBe('plan-1');
  });

  it('lists plans', async () => {
    const provider = new SupabaseSubscriptionProvider(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const plans = await provider.getPlans();
    expect(plans[0]?.id).toBe('plan-1');
  });
});
