/**
 * Headless Subscription Badge
 *
 * Exposes subscription tier information with no UI.
 */
import { useSubscriptionStore } from '@/lib/stores/subscription.store';
import { SubscriptionTier } from '@/types/subscription';

export interface SubscriptionBadgeProps {
  children: (props: { tier: SubscriptionTier; trialDays: number | null; isSubscribed: boolean }) => React.ReactNode;
}

export function SubscriptionBadge({ children }: SubscriptionBadgeProps) {
  const { getTier, isSubscribed, getRemainingTrialDays } = useSubscriptionStore();
  const tier = getTier();
  const trialDays = getRemainingTrialDays();
  return <>{children({ tier, trialDays, isSubscribed: isSubscribed() })}</>;
}
