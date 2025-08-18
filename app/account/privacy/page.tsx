'use client';

import React from 'react';
import { PrivacySettings } from '@/components/profile/PrivacySettings';
import { useProfileStore } from '@/lib/stores/profile.store';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/ui/primitives/button';
import Link from 'next/link';

export default function PrivacyPage(): React.ReactElement {
  const { profile, updateProfile, isLoading } = useProfileStore();

  const handleSavePrivacySettings = async (settings: any): Promise<void> => {
    try {
      const response = await api.put('/api/profile/privacy/enhanced', { settings });
      
      // Update the profile store with new privacy settings
      if (profile) {
        updateProfile({
          ...profile,
          privacy_settings: settings,
        });
      }
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
      throw new Error('Failed to save privacy settings');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/account/profile">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Privacy Settings</h1>
            <p className="text-muted-foreground">Control your privacy and data sharing preferences</p>
          </div>
        </div>

        <PrivacySettings
          initialSettings={profile?.privacy_settings || {
            profileVisibility: 'organization',
            showEmail: false,
            showPhone: false,
            showLocation: true,
            showBio: true,
            showAvatar: true,
            showActivityStatus: true,
            allowDirectMessages: true,
            allowTeamInvites: true,
            searchEngineIndexing: false,
            dataSharing: {
              analytics: true,
              marketing: false,
              partners: false,
            },
          }}
          onSave={handleSavePrivacySettings}
        />
      </div>
    </div>
  );
}