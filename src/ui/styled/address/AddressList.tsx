import React from 'react';
import { AddressList as HeadlessAddressList } from '@/ui/headless/address/AddressList';
import type { AddressListProps } from '@/ui/headless/address/AddressList';

export function StyledAddressList(props: AddressListProps): React.ReactElement {
  return (
    <div className="space-y-4">
      <HeadlessAddressList
        {...props}
        renderItem={(address, { onEdit, onDelete, onSetDefault }) => (
          <div className="border p-4 rounded-lg">
            <div className="font-medium">{address.fullName}</div>
            <div>{address.street1}</div>
            <div>{address.city}, {address.state} {address.postalCode}</div>
            <div>{address.country}</div>
            <div className="mt-2 space-x-2">
              <button onClick={() => onEdit(address)} className="text-blue-500">Edit</button>
              <button onClick={() => onDelete(address.id)} className="text-red-500">Delete</button>
              {!address.isDefault && (
                <button onClick={() => onSetDefault(address.id)} className="text-green-500">Set Default</button>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
