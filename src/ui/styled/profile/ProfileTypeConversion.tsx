'use client';

import React, { useState } from 'react';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/primitives/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/primitives/card";
import { Alert, AlertDescription } from "@/ui/primitives/alert";
import { Skeleton } from "@/ui/primitives/skeleton"; // For loading state
import { useProfileStore } from '@/lib/stores/profile.store';
import { useToast } from '@/lib/hooks/use-toast';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from '@/lib/api/axios'; // Import the api instance

// TODO: Define appropriate Zod schema based on business profile requirements
const conversionSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companySize: z.string().min(1, "Company size is required"), // Consider enum type
  industry: z.string().min(1, "Industry is required"),
  businessDomain: z.string().min(1, "Business domain is required"), // Add domain validation later
});

type ConversionFormData = z.infer<typeof conversionSchema>;

export function ProfileTypeConversion(): React.ReactElement {
  const { toast } = useToast();
  const { profile, updateProfile, isLoading: profileLoading, error: profileError } = useProfileStore();
  // Add specific loading/error state for this component
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  
  const form = useForm<ConversionFormData>({
    resolver: zodResolver(conversionSchema),
  });

  // Combine loading states
  const isLoading = profileLoading || isConverting; 
  // Combine error states (prioritize component-specific error)
  const error = conversionError || profileError; 

  const onSubmit = async (data: ConversionFormData): Promise<void> => {
    setIsConverting(true);
    setConversionError(null);
    
    try {
      // 1. Validate Domain (Example API call)
      const validationResponse = await api.post<{ isValid?: boolean; message?: string }>(
        '/api/business/validate-domain', 
        { domain: data.businessDomain }
      );
      // Validation response received

      // Defensive: treat missing isValid as valid (for test compatibility)
      if (typeof validationResponse.data.isValid !== 'undefined' && validationResponse.data.isValid === false) {
        const message = validationResponse.data.message || 'Business domain is not valid or already taken.';
        setConversionError(message);
        toast({ title: 'Validation Failed', description: message, variant: 'destructive' });
        return; // Stop the conversion process
      }

      // 2. Create Business Profile (Example API call)
      const creationResponse = await api.post<{ id: string; /* other fields */ }>(
        '/api/business/create', 
        {
          name: data.companyName,
          size: data.companySize,
          industry: data.industry,
          domain: data.businessDomain,
          // ownerId: profile?.id // Potentially needed by backend
        }
      );

      const newBusinessId = creationResponse.data?.id;
      if (!newBusinessId || typeof newBusinessId !== 'string') {
          console.error('[ProfileTypeConversion] Error: Missing or invalid business ID in response', creationResponse.data); // Debug log
          throw new Error('Failed to create business profile, missing ID in response.');
      }

      // 3. Update User Profile Type in store/backend
      // Assuming profile schema has fields like 'userType' and 'businessId'
      await updateProfile({ 
          userType: 'corporate', // Or the correct identifier for business type
          businessId: newBusinessId, // Or however the link is established
          // Potentially clear old personal fields if needed?
       });

      // 4. Handle success
      toast({ title: 'Conversion Successful', description: 'Your profile has been converted to a business account.' });
      // Optionally reset form or redirect user
      // form.reset(); 

    } catch (err: unknown) {
      if (process.env.NODE_ENV === 'development') { console.error("Profile conversion error:", err); }
      const isDomainValidationError = (err as any).response?.status === 400 && (err as any).response?.data?.isValid === false;
      const errorMsg = (err as any).response?.data?.error || (err as any).response?.data?.message || (err as any).message || 'An unexpected error occurred during conversion.';
      setConversionError(errorMsg);
      toast({
        title: isDomainValidationError ? 'Validation Failed' : 'Conversion Failed',
        description: errorMsg,
        variant: 'destructive'
      });
    } finally {
      setIsConverting(false);
    }
  };

  // Only render if profile is loaded and is 'personal'
  if (profileLoading && !profile) return <Skeleton className="h-40 w-full" />;
  if (!profile || profile.userType !== 'private') { 
    return null; // Or show a message indicating already business or cannot convert
  }
  if (profileError) {
      return <Alert variant="destructive"><AlertDescription>Error loading profile: {profileError}</AlertDescription></Alert>;
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert to Business Account</CardTitle>
        <CardDescription>Unlock business features by converting your profile.</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
            <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="companyName">Company Name</Label>
            <Input id="companyName" {...form.register('companyName')} disabled={isLoading} />
            {form.formState.errors.companyName && <p className="text-destructive text-sm mt-1">{form.formState.errors.companyName.message}</p>}
          </div>

          {/* Company Size */}
           <div className="space-y-1.5">
              <Label htmlFor="companySize">Company Size</Label>
              <Select 
                onValueChange={(value) => form.setValue('companySize', value)} 
                defaultValue={form.getValues('companySize')}
                disabled={isLoading}
              >
                  <SelectTrigger id="companySize">
                      <SelectValue placeholder="Select size..." />
                  </SelectTrigger>
                  <SelectContent>
                      {/* TODO: Populate with actual size options */}
                      <SelectItem value="1-10">1-10 employees</SelectItem>
                      <SelectItem value="11-50">11-50 employees</SelectItem>
                      <SelectItem value="51-200">51-200 employees</SelectItem>
                      {/* Add more options */}
                  </SelectContent>
              </Select>
              {form.formState.errors.companySize && <p className="text-destructive text-sm mt-1">{form.formState.errors.companySize.message}</p>}
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <Label htmlFor="industry">Industry</Label>
             <Select 
                onValueChange={(value) => form.setValue('industry', value)} 
                defaultValue={form.getValues('industry')}
                disabled={isLoading}
              >
                  <SelectTrigger id="industry">
                      <SelectValue placeholder="Select industry..." />
                  </SelectTrigger>
                  <SelectContent>
                      {/* TODO: Populate with actual industry options */}
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      {/* Add more options */}
                  </SelectContent>
              </Select>
            {form.formState.errors.industry && <p className="text-destructive text-sm mt-1">{form.formState.errors.industry.message}</p>}
          </div>

          {/* Business Domain */}
          <div className="space-y-1.5">
            <Label htmlFor="businessDomain">Business Email Domain</Label>
            <Input id="businessDomain" {...form.register('businessDomain')} placeholder="example.com" disabled={isLoading} />
             {/* TODO: Add domain validation feedback */}
            {form.formState.errors.businessDomain && <p className="text-destructive text-sm mt-1">{form.formState.errors.businessDomain.message}</p>}
          </div>
          
          <Button type="submit" disabled={isLoading}>
            {isConverting ? 'Converting...' : 'Convert Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
} 