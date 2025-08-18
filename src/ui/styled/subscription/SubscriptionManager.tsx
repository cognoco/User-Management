import { SubscriptionManager as HeadlessSubscriptionManager, type SubscriptionManagerProps } from '@/ui/headless/subscription/SubscriptionManager';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert } from '@/ui/primitives/alert';

export type StyledSubscriptionManagerProps = Omit<SubscriptionManagerProps, 'render'>;

export function SubscriptionManager(props: StyledSubscriptionManagerProps): React.ReactElement {
  return (
    <HeadlessSubscriptionManager
      {...props}
      render={({ subscription, isLoading, error, cancel, refresh }) => {
        if (isLoading) return <div>Loading...</div>;
        if (error) return <Alert variant="destructive">{error}</Alert>;
        return (
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription ? (
                <>
                  <p className="text-sm">Plan: {subscription.planId}</p>
                  <Button onClick={cancel}>Cancel</Button>
                </>
              ) : (
                <Button onClick={refresh}>Refresh</Button>
              )}
            </CardContent>
          </Card>
        );
      }}
    />
  );
}
