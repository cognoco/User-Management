'use client';

import React from 'react';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Textarea } from '@/ui/primitives/textarea';
import { Switch } from '@/ui/primitives/switch';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { useToast } from '@/lib/hooks/use-toast';
import ProfileFormHeadless from '@/ui/headless/user/ProfileForm';
import { Edit2, XCircle, Save } from 'lucide-react';

const ProfileDisplayField = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return (
    <div className="mb-4">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <p className="text-base mt-1">{value}</p>
    </div>
  );
};

export function ProfileForm(): React.ReactElement {
  const { toast } = useToast();

  return (
    <ProfileFormHeadless>
      {({
        profile,
        isLoading,
        isPrivacyLoading,
        isEditing,
        errors,
        isDirty,
        register,
        watch,
        handleSubmit,
        handleEditToggle,
        handlePrivacyChange,
        onSubmit,
        userEmail
      }) => {
        if (isLoading && !profile && !errors.form) {
          return <div className="text-center p-4">Loading profile...</div>;
        }
        if (errors.form && !profile) {
          return (
            <Alert variant="destructive">
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          );
        }
        if (!profile) {
          return <div className="text-center p-4">Could not load profile.</div>;
        }

        const displayName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Name not set';
        const combinedLoading = isLoading || isPrivacyLoading;

        const onPrivacyToggle = async (checked: boolean) => {
          try {
            const data = await handlePrivacyChange(checked);
            toast({ title: 'Success', description: data?.message });
          } catch (err: any) {
            const errorMsg = err?.response?.data?.error || 'Failed to update visibility.';
            toast({ title: 'Error', description: errorMsg, variant: 'destructive' });
          }
        };

        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Personal Information</h3>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={handleEditToggle} aria-label="Edit Profile">
                  <Edit2 className="mr-2 h-4 w-4" /> Edit
                </Button>
              )}
            </div>

            {isEditing && errors.form && (
              <Alert variant="destructive" className="mb-4" role="alert">
                <AlertTitle>Update Failed</AlertTitle>
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}

            {!isEditing && (
              <div className="space-y-3">
                <ProfileDisplayField label="Name" value={displayName} />
                <ProfileDisplayField label="Email" value={userEmail} />
                <ProfileDisplayField label="Bio" value={profile.bio} />
                <ProfileDisplayField label="Phone Number" value={profile.phone_number} />
                <ProfileDisplayField label="Gender" value={profile.gender} />
                <ProfileDisplayField
                  label="Address"
                  value={[profile.address, profile.city, profile.state, profile.postal_code, profile.country]
                    .filter(Boolean)
                    .join(', ')}
                />
                <ProfileDisplayField label="Website" value={profile.website} />
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Profile Visibility</Label>
                  <p className={`text-base mt-1 ${profile.is_public ? 'text-green-600' : 'text-amber-600'}`}>
                    {profile.is_public ? 'Public' : 'Private'}
                  </p>
                </div>
              </div>
            )}

            {isEditing && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="mb-4">
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-base mt-1">{displayName}</p>
                </div>
                <div className="mb-4">
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base mt-1">{userEmail || '-'}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" {...register('bio')} disabled={combinedLoading} rows={3} />
                  {errors.bio && <p className="text-destructive text-sm mt-1" role="alert">{errors.bio.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input
                    id="phone_number"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    {...register('phone_number')}
                    disabled={combinedLoading}
                  />
                  {errors.phone_number && (
                    <p className="text-destructive text-sm mt-1" role="alert">
                      {errors.phone_number.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <Input id="gender" {...register('gender')} disabled={combinedLoading} />
                  {errors.gender && <p className="text-destructive text-sm mt-1">{errors.gender.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register('address')} disabled={combinedLoading} />
                    {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register('city')} disabled={combinedLoading} />
                    {errors.city && <p className="text-destructive text-sm mt-1">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State / Province</Label>
                    <Input id="state" {...register('state')} disabled={combinedLoading} />
                    {errors.state && <p className="text-destructive text-sm mt-1">{errors.state.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input id="postal_code" {...register('postal_code')} disabled={combinedLoading} />
                    {errors.postal_code && (
                      <p className="text-destructive text-sm mt-1">{errors.postal_code.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 col-span-full sm:col-span-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" {...register('country')} disabled={combinedLoading} />
                    {errors.country && <p className="text-destructive text-sm mt-1">{errors.country.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" {...register('website')} placeholder="https://example.com" disabled={combinedLoading} />
                  {errors.website && <p className="text-destructive text-sm mt-1">{errors.website.message}</p>}
                </div>

                <div className="flex items-center justify-between space-x-2 pt-4 border-t mt-4">
                  <div>
                    <Label htmlFor="is_public" className="font-medium">Make Profile Public</Label>
                    <p className="text-sm text-muted-foreground">Allow others to view your profile details.</p>
                  </div>
                  <Switch id="is_public" checked={watch('is_public') ?? true} onCheckedChange={onPrivacyToggle} disabled={combinedLoading} />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleEditToggle} disabled={combinedLoading}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button type="submit" className="gap-1" disabled={combinedLoading || !isDirty}>
                    <Save className="mr-2 h-4 w-4" /> {combinedLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        );
      }}
    </ProfileFormHeadless>
  );
}

