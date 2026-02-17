import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useSubscriptionStore } from '../subscription.store';
import { api } from '../../api/axios';
import { SubscriptionTier, SubscriptionPeriod, SubscriptionStatus } from 'src/types/subscription';

// Mock axios api
vi.mock('../../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

// Add a global mock for useUserManagement at the top of the file
vi.mock('../../auth/UserManagementProvider', () => ({
  useUserManagement: () => ({
    subscription: {
      enabled: true,
      defaultTier: 'free',
      features: {
        premium_feature: {
          tier: 'premium',
          description: 'Premium feature',
        },
      },
    },
  }),
}));

describe('useSubscriptionStore', () => {
  const mockPlans = [
    {
      id: 'free-plan',
      name: 'Free',
      tier: SubscriptionTier.FREE,
      price: 0,
      period: SubscriptionPeriod.MONTHLY,
      features: ['basic_feature'],
      isPublic: true,
      trialDays: 0,
      metadata: {},
    },
    {
      id: 'premium-plan',
      name: 'Premium',
      tier: SubscriptionTier.PREMIUM,
      price: 10,
      period: SubscriptionPeriod.MONTHLY,
      features: ['premium_feature'],
      isPublic: true,
      trialDays: 0,
      metadata: {},
    },
  ];

  const mockSubscription = {
    id: 'sub-123',
    userId: 'user-123',
    planId: 'premium-plan',
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date().toISOString(),
    metadata: {},
  };

  const mockSubscriptionConfig = {
    enabled: true,
    defaultTier: 'free',
    features: {
      premium_feature: {
        tier: 'premium',
        description: 'Premium feature',
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useSubscriptionStore.setState({
      plans: [],
      userSubscription: null,
      error: null,
      isLoading: false,
      _subscriptionConfig: mockSubscriptionConfig as any,
    });
  });

  describe('fetchPlans', () => {
    it('should fetch and set subscription plans', async () => {
      (api.get as any).mockResolvedValueOnce({ data: mockPlans });

      await act(async () => {
        const result = await useSubscriptionStore.getState().fetchPlans();
        expect(result).toEqual(mockPlans);
      });

      const store = useSubscriptionStore.getState();
      expect(store.plans).toEqual(mockPlans);
      expect(store.error).toBeNull();
      expect(api.get).toHaveBeenCalledWith('/subscriptions/plans');
    });

    it('should handle fetch plans error', async () => {
      const error = new Error('Failed to fetch plans');
      (api.get as any).mockRejectedValueOnce(error);

      await act(async () => {
        const result = await useSubscriptionStore.getState().fetchPlans();
        expect(result).toEqual([]);
      });

      const store = useSubscriptionStore.getState();
      expect(store.error).toBe('Failed to fetch plans');
      expect(store.plans).toEqual([]);
    });
  });

  describe('fetchUserSubscription', () => {
    it('should fetch and set user subscription', async () => {
      (api.get as any).mockResolvedValueOnce({ data: mockSubscription });

      await act(async () => {
        const result = await useSubscriptionStore.getState().fetchUserSubscription('user-123');
        expect(result).toEqual(mockSubscription);
      });

      const store = useSubscriptionStore.getState();
      expect(store.userSubscription).toEqual(mockSubscription);
      expect(store.error).toBeNull();
      expect(api.get).toHaveBeenCalledWith('/subscriptions/users/user-123');
    });

    it('should handle 404 response gracefully', async () => {
      const error = { response: { status: 404 } };
      (api.get as any).mockRejectedValueOnce(error);

      await act(async () => {
        const result = await useSubscriptionStore.getState().fetchUserSubscription('user-123');
        expect(result).toBeNull();
      });

      const store = useSubscriptionStore.getState();
      expect(store.userSubscription).toBeNull();
      expect(store.error).toBeNull();
    });

    it('should handle fetch user subscription error', async () => {
      const error = new Error('Failed to fetch subscription');
      (api.get as any).mockRejectedValueOnce(error);

      await act(async () => {
        const result = await useSubscriptionStore.getState().fetchUserSubscription('user-123');
        expect(result).toBeNull();
      });

      const store = useSubscriptionStore.getState();
      expect(store.error).toBe('Failed to fetch subscription');
      expect(store.userSubscription).toBeNull();
    });
  });

  describe('isSubscribed', () => {
    it('should return false when no subscription exists', () => {
      const store = useSubscriptionStore.getState();
      expect(store.isSubscribed()).toBe(false);
    });

    it('should return true for active premium subscription', () => {
      const store = useSubscriptionStore.getState();
      store.plans = mockPlans;
      store.userSubscription = mockSubscription;
      expect(store.isSubscribed()).toBe(true);
    });

    it('should return false for free tier subscription', () => {
      const store = useSubscriptionStore.getState();
      store.plans = mockPlans;
      store.userSubscription = {
        ...mockSubscription,
        planId: 'free-plan',
      };
      expect(store.isSubscribed()).toBe(false);
    });
  });

  describe('hasFeature', () => {
    it('should return true for features available in user tier', () => {
      const store = useSubscriptionStore.getState();
      store.plans = mockPlans;
      store.userSubscription = mockSubscription;
      expect(store.hasFeature('premium_feature')).toBe(true);
    });

    it('should return false for features not available in user tier', () => {
      const store = useSubscriptionStore.getState();
      store.plans = mockPlans;
      store.userSubscription = {
        ...mockSubscription,
        planId: 'free-plan',
      };
      expect(store.hasFeature('premium_feature')).toBe(false);
    });

    it('should return true for unconfigured features', () => {
      const store = useSubscriptionStore.getState();
      store.plans = mockPlans;
      store.userSubscription = mockSubscription;
      expect(store.hasFeature('unconfigured_feature')).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    beforeEach(() => {
      (api.post as any).mockResolvedValue({});
      const store = useSubscriptionStore.getState();
      store.userSubscription = { ...mockSubscription } as any;
    });

    it('immediately cancels and clears subscription', async () => {
      await act(async () => {
        await useSubscriptionStore.getState().cancelSubscription('sub-123', true);
      });

      const store = useSubscriptionStore.getState();
      expect(api.post).toHaveBeenCalledWith('/subscriptions/sub-123/cancel', { immediate: true });
      expect(store.userSubscription).toBeNull();
      expect(store.error).toBeNull();
    });

    it('schedules cancellation at period end', async () => {
      const before = Date.now();
      await act(async () => {
        await useSubscriptionStore.getState().cancelSubscription('sub-123');
      });

      const store = useSubscriptionStore.getState();
      expect(api.post).toHaveBeenCalledWith('/subscriptions/sub-123/cancel', { immediate: false });
      expect(store.userSubscription?.status).toBe('canceled');
      expect(new Date(store.userSubscription!.canceledAt!).getTime()).toBeGreaterThanOrEqual(before);
    });
  });

  describe('updateSubscription', () => {
    it('updates subscription plan', async () => {
      const updated = { ...mockSubscription, planId: 'free-plan' };
      (api.put as any).mockResolvedValue({ data: updated });

      await act(async () => {
        const result = await useSubscriptionStore.getState().updateSubscription('sub-123', 'free-plan');
        expect(result).toEqual(updated);
      });

      const store = useSubscriptionStore.getState();
      expect(api.put).toHaveBeenCalledWith('/subscriptions/sub-123', { planId: 'free-plan' });
      expect(store.userSubscription).toEqual(updated);
    });

    it('handles update errors', async () => {
      (api.put as any).mockRejectedValue(new Error('fail'));
      await expect(
        act(async () => {
          await useSubscriptionStore.getState().updateSubscription('sub-123', 'free-plan');
        })
      ).rejects.toThrow('fail');

      expect(useSubscriptionStore.getState().error).toBe('fail');
    });
  });
}); 