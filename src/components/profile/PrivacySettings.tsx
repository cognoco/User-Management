import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Switch } from '@/ui/primitives/switch';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Eye, EyeOff, Lock, Users, Globe, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/primitives/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';

export interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'organization';
  showEmail: boolean;
  showPhone: boolean;
  showLocation: boolean;
  showBio: boolean;
  showAvatar: boolean;
  showActivityStatus: boolean;
  allowDirectMessages: boolean;
  allowTeamInvites: boolean;
  searchEngineIndexing: boolean;
  dataSharing: {
    analytics: boolean;
    marketing: boolean;
    partners: boolean;
  };
}

interface PrivacySettingsProps {
  initialSettings?: PrivacySettings;
  onSave: (settings: PrivacySettings) => Promise<void>;
  onCancel?: () => void;
  showPreview?: boolean;
}

const defaultSettings: PrivacySettings = {
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
};

export function PrivacySettings({
  initialSettings = defaultSettings,
  onSave,
  onCancel,
  showPreview = true,
}: PrivacySettingsProps): React.ReactElement {
  const [settings, setSettings] = useState<PrivacySettings>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setHasChanges(JSON.stringify(settings) !== JSON.stringify(initialSettings));
  }, [settings, initialSettings]);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onSave(settings);
      setSaveMessage({ type: 'success', text: 'Privacy settings updated successfully' });
      setHasChanges(false);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to update privacy settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = (): void => {
    setSettings(initialSettings);
    setSaveMessage(null);
  };

  const updateSetting = <K extends keyof PrivacySettings>(
    key: K,
    value: PrivacySettings[K]
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateDataSharing = (key: keyof PrivacySettings['dataSharing'], value: boolean): void => {
    setSettings((prev) => ({
      ...prev,
      dataSharing: { ...prev.dataSharing, [key]: value },
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control who can see your information and how your data is used
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="visibility" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="visibility">Visibility</TabsTrigger>
              <TabsTrigger value="permissions">Permissions</TabsTrigger>
              <TabsTrigger value="data">Data & Privacy</TabsTrigger>
            </TabsList>

            <TabsContent value="visibility" className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <Select
                    value={settings.profileVisibility}
                    onValueChange={(value) =>
                      updateSetting('profileVisibility', value as PrivacySettings['profileVisibility'])
                    }
                  >
                    <SelectTrigger id="profile-visibility">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          <span>Public - Anyone can view</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="organization">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>Organization - Team members only</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          <span>Private - Only you</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Profile Information</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-email" className="flex items-center gap-2 cursor-pointer">
                        <span>Show Email Address</span>
                      </Label>
                      <Switch
                        id="show-email"
                        checked={settings.showEmail}
                        onCheckedChange={(checked) => updateSetting('showEmail', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-phone" className="flex items-center gap-2 cursor-pointer">
                        <span>Show Phone Number</span>
                      </Label>
                      <Switch
                        id="show-phone"
                        checked={settings.showPhone}
                        onCheckedChange={(checked) => updateSetting('showPhone', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-location" className="flex items-center gap-2 cursor-pointer">
                        <span>Show Location</span>
                      </Label>
                      <Switch
                        id="show-location"
                        checked={settings.showLocation}
                        onCheckedChange={(checked) => updateSetting('showLocation', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-bio" className="flex items-center gap-2 cursor-pointer">
                        <span>Show Bio</span>
                      </Label>
                      <Switch
                        id="show-bio"
                        checked={settings.showBio}
                        onCheckedChange={(checked) => updateSetting('showBio', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-avatar" className="flex items-center gap-2 cursor-pointer">
                        <span>Show Profile Picture</span>
                      </Label>
                      <Switch
                        id="show-avatar"
                        checked={settings.showAvatar}
                        onCheckedChange={(checked) => updateSetting('showAvatar', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-activity" className="flex items-center gap-2 cursor-pointer">
                        <span>Show Activity Status</span>
                      </Label>
                      <Switch
                        id="show-activity"
                        checked={settings.showActivityStatus}
                        onCheckedChange={(checked) => updateSetting('showActivityStatus', checked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Communication Preferences</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow-dm" className="cursor-pointer">
                        Allow Direct Messages
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Let other users send you direct messages
                      </p>
                    </div>
                    <Switch
                      id="allow-dm"
                      checked={settings.allowDirectMessages}
                      onCheckedChange={(checked) => updateSetting('allowDirectMessages', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="allow-invites" className="cursor-pointer">
                        Allow Team Invites
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Let organizations invite you to join their team
                      </p>
                    </div>
                    <Switch
                      id="allow-invites"
                      checked={settings.allowTeamInvites}
                      onCheckedChange={(checked) => updateSetting('allowTeamInvites', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Search & Indexing</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="search-indexing" className="cursor-pointer">
                      Search Engine Indexing
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow search engines to index your public profile
                    </p>
                  </div>
                  <Switch
                    id="search-indexing"
                    checked={settings.searchEngineIndexing}
                    onCheckedChange={(checked) => updateSetting('searchEngineIndexing', checked)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium">Data Sharing</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="share-analytics" className="cursor-pointer">
                        Analytics & Performance
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Help us improve by sharing usage data
                      </p>
                    </div>
                    <Switch
                      id="share-analytics"
                      checked={settings.dataSharing.analytics}
                      onCheckedChange={(checked) => updateDataSharing('analytics', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="share-marketing" className="cursor-pointer">
                        Marketing Communications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive product updates and offers
                      </p>
                    </div>
                    <Switch
                      id="share-marketing"
                      checked={settings.dataSharing.marketing}
                      onCheckedChange={(checked) => updateDataSharing('marketing', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="share-partners" className="cursor-pointer">
                        Partner Integration
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Share data with integrated partner services
                      </p>
                    </div>
                    <Switch
                      id="share-partners"
                      checked={settings.dataSharing.partners}
                      onCheckedChange={(checked) => updateDataSharing('partners', checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {saveMessage && (
            <Alert variant={saveMessage.type === 'error' ? 'destructive' : 'default'} className="mt-4">
              <AlertDescription>{saveMessage.text}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges || isSaving}>
              Reset Changes
            </Button>
            <div className="flex gap-2">
              {onCancel && (
                <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {settings.profileVisibility === 'public' ? (
                <Eye className="h-5 w-5" />
              ) : (
                <EyeOff className="h-5 w-5" />
              )}
              Profile Preview
            </CardTitle>
            <CardDescription>
              This is how your profile appears to {' '}
              {settings.profileVisibility === 'public'
                ? 'everyone'
                : settings.profileVisibility === 'organization'
                ? 'team members'
                : 'no one (private)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Email:</span>
                {settings.showEmail ? 'user@example.com' : <span className="text-muted-foreground">Hidden</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Phone:</span>
                {settings.showPhone ? '+1 234 567 8900' : <span className="text-muted-foreground">Hidden</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Location:</span>
                {settings.showLocation ? 'San Francisco, CA' : <span className="text-muted-foreground">Hidden</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Bio:</span>
                {settings.showBio ? 'Your bio text here...' : <span className="text-muted-foreground">Hidden</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Avatar:</span>
                {settings.showAvatar ? 'Profile picture visible' : <span className="text-muted-foreground">Hidden</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                {settings.showActivityStatus ? '🟢 Online' : <span className="text-muted-foreground">Hidden</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}