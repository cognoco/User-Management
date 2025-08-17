/**
 * Subscription Domain Models
 * 
 * Hybrid subscription model supporting both private users and corporate accounts
 * - Private users: subscription tied to user_id
 * - Corporate users: subscription tied to organization_id
 */

import { UserType } from '@/core/common/user-types';

// Re-export existing types for backward compatibility
export {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionPeriod,
  subscriptionPlanSchema,
  userSubscriptionSchema,
  isSubscriptionUpsertPayload,
} from '@/types/subscription';

export type {
  SubscriptionPlan,
  UserSubscription,
  SubscriptionQuery,
  SubscriptionUpsertPayload,
} from '@/types/subscription';

/**
 * Subscription ownership type - NEW
 * Determines whether subscription is owned by user or organization
 */
export enum SubscriptionType {
  USER = 'user',                // Private user subscription
  ORGANIZATION = 'organization'  // Corporate/organization subscription
}

/**
 * Extended subscription model supporting hybrid ownership
 */
export interface HybridSubscription {
  id: string;
  
  // Ownership - exactly one should be set based on subscription_type
  user_id?: string;              // Set for private users
  organization_id?: string;       // Set for corporate users
  subscription_type: SubscriptionType;
  
  // Stripe integration
  customer_id?: string;
  subscription_id?: string;
  stripe_subscription_id?: string;
  
  // Plan and status
  plan: string;
  plan_id?: string;
  status: string;
  
  // Billing periods
  current_period_start?: Date;
  current_period_end?: Date;
  cancel_at_period_end: boolean;
  trial_end?: Date;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Helper type to determine subscription owner
 */
export type SubscriptionOwner = 
  | { type: 'user'; id: string }
  | { type: 'organization'; id: string };

/**
 * Subscription creation payload for hybrid model
 */
export interface CreateHybridSubscriptionPayload {
  subscription_type: SubscriptionType;
  owner_id: string;  // Either user_id or organization_id based on type
  plan: string;
  trial_days?: number;
}

/**
 * Helper class for subscription logic
 */
export class SubscriptionHelper {
  /**
   * Get the owner of a subscription
   */
  static getOwner(subscription: HybridSubscription): SubscriptionOwner {
    if (subscription.subscription_type === SubscriptionType.USER) {
      if (!subscription.user_id) {
        throw new Error('User subscription missing user_id');
      }
      return { type: 'user', id: subscription.user_id };
    } else {
      if (!subscription.organization_id) {
        throw new Error('Organization subscription missing organization_id');
      }
      return { type: 'organization', id: subscription.organization_id };
    }
  }
  
  /**
   * Create subscription data based on user type
   */
  static createSubscriptionData(
    userType: UserType,
    userId: string,
    organizationId?: string,
    plan: string = 'free'
  ): Partial<HybridSubscription> {
    if (userType === UserType.PRIVATE) {
      return {
        subscription_type: SubscriptionType.USER,
        user_id: userId,
        organization_id: undefined,
        plan,
        status: 'incomplete'
      };
    } else {
      if (!organizationId) {
        throw new Error('Organization ID required for corporate users');
      }
      return {
        subscription_type: SubscriptionType.ORGANIZATION,
        organization_id: organizationId,
        user_id: undefined,
        plan,
        status: 'incomplete'
      };
    }
  }
}
