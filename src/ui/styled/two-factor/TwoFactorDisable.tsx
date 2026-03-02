'use client';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Card } from '@/ui/primitives/card';
import { TwoFactorDisable as HeadlessTwoFactorDisable } from '@/ui/headless/two-factor/TwoFactorDisable';

export function TwoFactorDisable({ onSuccess, onCancel }: { onSuccess?: () => void; onCancel?: () => void }) {
  return (
    <HeadlessTwoFactorDisable onSuccess={onSuccess}>
      {({ code: value, setCode: setValue, submit, loading, error }) => (
        <Card className="p-4 space-y-4 w-full max-w-sm">
          <Input
            placeholder="000000"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={6}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={loading || value.length !== 6}>
              Disable
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
          </div>
        </Card>
      )}
    </HeadlessTwoFactorDisable>
  );
}

export default TwoFactorDisable;
