'use client';
import React from 'react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { TwoFactorStatus as HeadlessTwoFactorStatus } from '@/ui/headless/two-factor/TwoFactorStatus';

interface StyledTwoFactorStatusProps {
  isEnabled: boolean;
  lastUsed?: Date;
  error: Error | null;
  onDisable: () => Promise<void>;
}

export function TwoFactorStatus(props: StyledTwoFactorStatusProps): React.ReactElement {
  return (
    <HeadlessTwoFactorStatus {...props}>
      {({
        isEnabled,
        lastUsed,
        error,
        disableButtonProps,
        viewBackupCodesButtonProps,
        regenerateBackupCodesButtonProps
      }) => (
        <Card className="w-full space-y-4 p-4">
          <CardHeader>
            <CardTitle>Two-Factor Authentication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <p className="text-sm">
              {isEnabled ? 'Two-factor authentication is enabled.' : 'Two-factor authentication is disabled.'}
            </p>
            {lastUsed && (
              <p className="text-sm text-muted-foreground">
                Last used: {format(lastUsed, 'PPpp')}
              </p>
            )}
            {isEnabled && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="destructive" {...disableButtonProps}>
                  Disable
                </Button>
                <Button variant="outline" {...viewBackupCodesButtonProps}>
                  View Codes
                </Button>
                <Button variant="outline" {...regenerateBackupCodesButtonProps}>
                  Regenerate Codes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </HeadlessTwoFactorStatus>
  );
}

export default TwoFactorStatus;
