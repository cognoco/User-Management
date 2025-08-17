import React from 'react';
import { AddressForm as HeadlessAddressForm } from '@/ui/headless/address/AddressForm';
import type { AddressFormProps } from '@/ui/headless/address/AddressForm';

export function StyledAddressForm(props: AddressFormProps): React.ReactElement {
  return (
    <div className="max-w-md">
      <HeadlessAddressForm
        {...props}
        renderField={({ label, value, onChange }) => (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>
        )}
      />
    </div>
  );
}
