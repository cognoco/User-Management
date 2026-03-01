'use client';

import { useEffect, useState } from 'react';
import { useCompanyProfileStore } from '@/lib/stores/companyProfileStore';
import { CompanyAddress } from '@/types/company';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { Plus } from 'lucide-react';
import { AddressCard } from '@/ui/styled/company/AddressCard';
import { AddressDialog, AddressFormData } from '@/ui/styled/company/AddressDialog';
import { Skeleton } from '@/ui/primitives/skeleton';

export default function CompanyAddressesPage() {
  const { addresses, isLoading, error, fetchProfile, addAddress, updateAddress, deleteAddress } = useCompanyProfileStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<CompanyAddress | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleAddClick = () => {
    setSelectedAddress(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (address: CompanyAddress) => {
    setSelectedAddress(address);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = async (addressId: string) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      await deleteAddress(addressId);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAddress(null);
  };

  const handleAddressSave = async (data: AddressFormData) => {
    if (selectedAddress) {
      await updateAddress(selectedAddress.id, {
        street_line1: data.street,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        country: data.country,
        is_primary: data.isPrimary ?? false,
      });
    } else {
      await addAddress({
        id: '', // server assigns
        company_id: '', // server assigns
        type: 'billing',
        street_line1: data.street,
        city: data.city,
        state: data.state,
        postal_code: data.postalCode,
        country: data.country,
        is_primary: data.isPrimary ?? false,
        validated: false,
        created_at: '',
        updated_at: '',
      });
    }
    handleDialogClose();
  };

  // Convert CompanyAddress (snake_case) to AddressFormData (camelCase) for the dialog
  const selectedAddressFormData: AddressFormData | undefined = selectedAddress
    ? {
        street: selectedAddress.street_line1,
        city: selectedAddress.city,
        state: selectedAddress.state ?? '',
        postalCode: selectedAddress.postal_code,
        country: selectedAddress.country,
        isPrimary: selectedAddress.is_primary,
      }
    : undefined;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Company Addresses</CardTitle>
          <Button onClick={handleAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            Add Address
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : addresses?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No addresses added yet. Click the button above to add your first address.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addresses?.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={() => handleEditClick(address)}
                  onDelete={() => handleDeleteClick(address.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddressDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleAddressSave}
        initialData={selectedAddressFormData}
        title={selectedAddress ? 'Edit Address' : 'Add Address'}
      />
    </div>
  );
} 