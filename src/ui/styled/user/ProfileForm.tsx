'use client';

import React from 'react';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Textarea } from '@/ui/primitives/textarea';
import { Switch } from '@/ui/primitives/switch';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { useToast } from '@/lib/hooks/use-toast';
import { Edit2, XCircle, Save } from 'lucide-react';
import HeadlessProfileForm from '@/ui/headless/user/ProfileForm';

const ProfileDisplayField = ({ label, value }: { label: string; value: string | null | undefined }): React.ReactElement | null => {
    if (!value) return null;
    return (
        <div className="mb-4">
            <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
            <p className="text-base mt-1">{value}</p>
        </div>
    );
};

/**
 * Styled ProfileForm component that uses the headless ProfileForm component
 * This component only contains UI elements and styling, with all business logic in the headless component
 */
export function ProfileForm(): React.ReactElement {
  const { toast } = useToast();

  return (
    <HeadlessProfileForm>
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
        const handlePrivacyChangeWithToast = async (checked: boolean): Promise<void> => {
          try {
            const response = await handlePrivacyChange(checked);
            toast({ 
              title: "Success", 
              description: response.message || "Privacy settings updated successfully" 
            });
          } catch (err: unknown) {
            toast({
              variant: "destructive",
              title: "Error",
              description: err.message || "Failed to update privacy settings"
            });
          }
        };

        return (
          <div className="space-y-6">
            {profile?.error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{profile.error}</AlertDescription>
              </Alert>
            )}

            {!isEditing ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Profile Information</h3>
                  <Button onClick={handleEditToggle} variant="outline" size="sm">
                    <Edit2 className="mr-2 h-4 w-4" /> Edit Profile
                  </Button>
                </div>

                <div className="grid gap-4">
                  <ProfileDisplayField label="Email" value={userEmail} />
                  <ProfileDisplayField label="Bio" value={profile?.bio} />
                  <ProfileDisplayField label="Phone Number" value={profile?.phone_number} />
                  <ProfileDisplayField label="Gender" value={profile?.gender} />
                  <ProfileDisplayField label="Address" value={profile?.address} />
                  <ProfileDisplayField label="City" value={profile?.city} />
                  <ProfileDisplayField label="State / Province" value={profile?.state} />
                  <ProfileDisplayField label="Postal Code" value={profile?.postal_code} />
                  <ProfileDisplayField label="Country" value={profile?.country} />
                  <ProfileDisplayField label="Website" value={profile?.website} />
                  
                  <div className="flex items-center justify-between space-x-2 pt-4 border-t mt-4">
                    <div>
                      <Label htmlFor="is_public_display" className="font-medium">Profile Visibility</Label>
                      <p className="text-sm text-muted-foreground">
                        {profile?.is_public ? 'Your profile is public' : 'Your profile is private'}
                      </p>
                    </div>
                    <Switch 
                      id="is_public_display" 
                      checked={profile?.is_public ?? true}
                      onCheckedChange={handlePrivacyChangeWithToast}
                      disabled={isPrivacyLoading}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Edit Profile</h3>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea 
                    id="bio" 
                    {...register('bio')} 
                    placeholder="Tell us about yourself" 
                    disabled={isLoading} 
                    className="min-h-[100px]"
                  />
                  {errors.bio && <p className="text-destructive text-sm mt-1">{errors.bio.message}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <Input 
                    id="phone_number" 
                    type="tel" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    {...register('phone_number')} 
                    disabled={isLoading} 
                  />
                  {errors.phone_number && <p className="text-destructive text-sm mt-1" role="alert">{errors.phone_number.message}</p>}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <Input id="gender" {...register('gender')} disabled={isLoading} />
                  {errors.gender && <p className="text-destructive text-sm mt-1">{errors.gender.message}</p>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register('address')} disabled={isLoading} />
                    {errors.address && <p className="text-destructive text-sm mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" {...register('city')} disabled={isLoading} />
                    {errors.city && <p className="text-destructive text-sm mt-1">{errors.city.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">State / Province</Label>
                    <Input id="state" {...register('state')} disabled={isLoading} />
                    {errors.state && <p className="text-destructive text-sm mt-1">{errors.state.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="postal_code">Postal Code</Label>
                    <Input id="postal_code" {...register('postal_code')} disabled={isLoading} />
                    {errors.postal_code && <p className="text-destructive text-sm mt-1">{errors.postal_code.message}</p>}
                  </div>
                  <div className="space-y-1.5 col-span-full sm:col-span-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" {...register('country')} disabled={isLoading} />
                    {errors.country && <p className="text-destructive text-sm mt-1">{errors.country.message}</p>}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" type="url" {...register('website')} placeholder="https://example.com" disabled={isLoading} />
                  {errors.website && <p className="text-destructive text-sm mt-1">{errors.website.message}</p>}
                </div>

                <div className="flex items-center justify-between space-x-2 pt-4 border-t mt-4">
                  <div>
                    <Label htmlFor="is_public" className="font-medium">Make Profile Public</Label>
                    <p className="text-sm text-muted-foreground">Allow others to view your profile details.</p>
                  </div>
                  <Switch 
                    id="is_public" 
                    checked={watch('is_public') ?? true}
                    onCheckedChange={handlePrivacyChangeWithToast}
                    disabled={isLoading || isPrivacyLoading}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleEditToggle} disabled={isLoading}>
                    <XCircle className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button type="submit" className="gap-1" disabled={isLoading || !isDirty}>
                    <Save className="mr-2 h-4 w-4" /> {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        );
      }}
    </HeadlessProfileForm>
  );
}
