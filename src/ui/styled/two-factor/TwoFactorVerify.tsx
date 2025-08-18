'use client';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Card } from '@/ui/primitives/card';
import { TwoFactorVerify as HeadlessTwoFactorVerify } from '@/ui/headless/two-factor/TwoFactorVerify';

export function TwoFactorVerify({ onSuccess }: { onSuccess?: () => void }): React.ReactElement {
  return (
    <HeadlessTwoFactorVerify onSuccess={onSuccess}>
      {({ code: value, setCode: setValue, submit, loading, error }) => (
        <Card className="p-4 space-y-4 w-full max-w-sm">
          <Input
            placeholder="000000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={6}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button onClick={submit} disabled={loading || value.length !== 6} className="w-full">
            Verify
          </Button>
        </Card>
      )}
    </HeadlessTwoFactorVerify>
  );
}

export default TwoFactorVerify;
