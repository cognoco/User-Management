/**
 * Pure Subscription Service Factory
 */

import type { SubscriptionService } from '@/core/subscription/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { SubscriptionDataProvider } from '@/adapters/subscription/interfaces';
import { DefaultSubscriptionService } from './default-subscription.service';
import { AdapterRegistry } from '@/adapters/registry';

export interface SubscriptionServiceDependencies {
  adapterRegistry: AdapterRegistry;
  userService: UserService;
  provider?: SubscriptionDataProvider;
}

export function createSubscriptionService(deps: SubscriptionServiceDependencies): SubscriptionService {
  const { adapterRegistry, userService, provider } = deps;
  const subscriptionProvider = provider || adapterRegistry.getAdapter<SubscriptionDataProvider>('subscription');
  return new DefaultSubscriptionService(subscriptionProvider, userService);
}