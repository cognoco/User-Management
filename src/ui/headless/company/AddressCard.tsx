import { CompanyAddress } from '@/types/company';
import React from 'react';

export interface AddressCardProps {
  address: CompanyAddress;
  onEdit?: (address: CompanyAddress) => void;
  onDelete?: (address: CompanyAddress) => void;
  render: (props: { address: CompanyAddress; onEdit: () => void; onDelete: () => void }) => React.ReactNode;
}

export function AddressCard({ address, onEdit, onDelete, render }: AddressCardProps) {
  const handleEdit = (): void => onEdit?.(address);
  const handleDelete = (): void => onDelete?.(address);
  return <>{render({ address, onEdit: handleEdit, onDelete: handleDelete })}</>;
}
