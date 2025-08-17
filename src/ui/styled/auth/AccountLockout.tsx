'use client';

import { Alert, AlertTitle, AlertDescription } from '@/ui/primitives/alert';

export function AccountLockout(): React.ReactElement {
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>Account Locked</AlertTitle>
      <AlertDescription>
        Your account has been temporarily locked due to too many failed login attempts. Please try again later or contact support.
      </AlertDescription>
    </Alert>
  );
}
