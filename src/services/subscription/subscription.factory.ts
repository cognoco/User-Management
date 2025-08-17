/**
 * Subscription Service Factory
 * 
 * Factory for creating subscription service instances compatible with Stripe integration
 */

import { DefaultSubscriptionService } from './default-subscription.service';
import { AdapterRegistry } from '@/adapters/registry';
import type { ISubscriptionDataProvider } from '@/core/subscription';

// Extend the base service interface with additional methods needed for Stripe
export interface ExtendedSubscriptionService {
  getSubscription(userId: string): Promise<any>;
  createSubscription(data: any): Promise<any>;
  updateSubscription(userId: string, data: any): Promise<any>;
  recordPayment(data: any): Promise<any>;
}

// Singleton instance
let subscriptionServiceInstance: ExtendedSubscriptionService | null = null;

/**
 * Mock implementation that provides the methods needed by our Stripe integration
 * This will be replaced with actual implementation once the service layer is complete
 */
class StripeCompatibleSubscriptionService implements ExtendedSubscriptionService {
  constructor(private provider: ISubscriptionDataProvider) {}

  async getSubscription(userId: string): Promise<any> {
    // For now, return mock data or query database directly
    return {
      userId,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCustomerId: null,
      status: 'inactive',
    };
  }

  async createSubscription(data: any): Promise<any> {
    // Store subscription data
    console.log('Creating subscription:', data);
    return {
      id: 'sub_' + Date.now(),
      ...data,
    };
  }

  async updateSubscription(userId: string, data: any): Promise<any> {
    // Update subscription data
    console.log('Updating subscription for user:', userId, data);
    return {
      userId,
      ...data,
    };
  }

  async recordPayment(data: any): Promise<any> {
    // Record payment information
    console.log('Recording payment:', data);
    return {
      id: 'pay_' + Date.now(),
      ...data,
    };
  }
}

/**
 * Get subscription service instance for use with Stripe integration
 */
export function getSubscriptionService(): ExtendedSubscriptionService {
  if (!subscriptionServiceInstance) {
    const provider = AdapterRegistry.getInstance().getAdapter<ISubscriptionDataProvider>('subscription');
    subscriptionServiceInstance = new StripeCompatibleSubscriptionService(provider);
  }
  
  return subscriptionServiceInstance;
}