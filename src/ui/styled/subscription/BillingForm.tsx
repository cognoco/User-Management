import React from 'react';
import { BillingForm as HeadlessBillingForm, type BillingFormProps } from '@/ui/headless/subscription/BillingForm';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Alert } from '@/ui/primitives/alert';

export type StyledBillingFormProps = Omit<BillingFormProps, 'render'>;

export function BillingForm(props: StyledBillingFormProps): React.ReactElement {
  return (
    <HeadlessBillingForm
      {...props}
      render={({ paymentMethods, isSubmitting, submit, error }) => (
        <div className="space-y-4">
          {error && <Alert variant="destructive">{error}</Alert>}
          <Input placeholder="Payment method id" id="pm" />
          <Button disabled={isSubmitting} onClick={() => submit('pm')}>Submit</Button>
          {paymentMethods.length > 0 && (
            <ul className="list-disc pl-4 text-sm">
              {paymentMethods.map((p) => (
                <li key={p.id}>{p.id}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    />
  );
}
