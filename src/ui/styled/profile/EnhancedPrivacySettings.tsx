'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/primitives/card';
import { Switch } from '@/ui/primitives/switch';
import { Label } from '@/ui/primitives/label';
import { Button } from '@/ui/primitives/button';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { RadioGroup, RadioGroupItem } from '@/ui/primitives/radio-group';
import { Separator } from '@/ui/primitives/separator';
import { Badge } from '@/ui/primitives/badge';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Users, 
  Globe, 
  Building,
  MessageSquare,
  Search,
  Download,
  Info,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import type { PrivacySettings, ProfileFieldVisibility } from '@/services/profile/enhanced-profile.service';

interface EnhancedPrivacySettingsProps {
  userId: string;
  initialSettings?: PrivacySettings;
  onSettingsChange?: (settings: PrivacySettings) => void;
  showPreview?: boolean;
}

interface FieldConfig {
  field: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'personal' | 'contact' | 'professional' | 'social';
}

const fieldConfigs: FieldConfig[] = [
  {
    field: 'email',
    label: 'Email Address',
    description: 'Your email will be visible to selected users',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'contact'
  },
  {
    field: 'phone',
    label: 'Phone Number',
    description: 'Share your phone number with others',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'contact'
  },
  {
    field: 'location',
    label: 'Location',
    description: 'City and country information',
    icon: <Globe className="h-4 w-4" />,
    category: 'personal'
  },
  {
    field: 'birthDate',
    label: 'Date of Birth',
    description: 'Your birth date will be visible',
    icon: <Info className="h-4 w-4" />,
    category: 'personal'
  },
  {
    field: 'companyInfo',
    label: 'Company Information',
    description: 'Company name, position, and department',
    icon: <Building className="h-4 w-4" />,
    category: 'professional'
  }
];

export function EnhancedPrivacySettings({ 
  userId, 
  initialSettings,
  onSettingsChange,
  showPreview = true
}: EnhancedPrivacySettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<PrivacySettings>(initialSettings || {
    showEmail: false,
    showPhone: false,
    showLocation: false,
    showBirthDate: false,
    showCompanyInfo: true,
    profileVisibility: 'private',
    allowSearch: true,
    allowMessaging: false,
    dataExportEnabled: true
  });
  
  const [fieldVisibility, setFieldVisibility] = useState<ProfileFieldVisibility[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewMode, setPreviewMode] = useState<'public' | 'contacts' | 'organization'>('public');

  useEffect(() => {
    // Load current settings
    loadPrivacySettings();
  }, [userId]);

  const loadPrivacySettings = async () => {
    try {
      const response = await fetch(`/api/profile/privacy?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        setFieldVisibility(data.fieldVisibility || []);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const handleSettingChange = (key: keyof PrivacySettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setHasChanges(true);
    onSettingsChange?.(newSettings);
  };

  const handleFieldVisibilityChange = (field: string, visible: boolean, visibleTo: string) => {
    const newVisibility = [...fieldVisibility];
    const existingIndex = newVisibility.findIndex(f => f.field === field);
    
    const visibility: ProfileFieldVisibility = {
      field,
      visible,
      visibleTo: visibleTo as any
    };
    
    if (existingIndex >= 0) {
      newVisibility[existingIndex] = visibility;
    } else {
      newVisibility.push(visibility);
    }
    
    setFieldVisibility(newVisibility);
    setHasChanges(true);
  };

  const saveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/profile/privacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          settings,
          fieldVisibility
        })
      });
      
      if (response.ok) {
        toast({
          title: 'Privacy settings updated',
          description: 'Your privacy preferences have been saved successfully.'
        });
        setHasChanges(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save privacy settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const ProfileVisibilityCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Profile Visibility
        </CardTitle>
        <CardDescription>
          Control who can see your profile information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={settings.profileVisibility}
          onValueChange={(value) => handleSettingChange('profileVisibility', value)}
        >
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="public" id="public" />
            <div className="space-y-1">
              <Label htmlFor="public" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Public
              </Label>
              <p className="text-sm text-muted-foreground">
                Anyone can view your profile
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="contacts" id="contacts" />
            <div className="space-y-1">
              <Label htmlFor="contacts" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Contacts Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only your contacts can view your profile
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="organization" id="organization" />
            <div className="space-y-1">
              <Label htmlFor="organization" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Organization Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Only members of your organization can view your profile
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <RadioGroupItem value="private" id="private" />
            <div className="space-y-1">
              <Label htmlFor="private" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Private
              </Label>
              <p className="text-sm text-muted-foreground">
                Only you can view your full profile
              </p>
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );

  const FieldVisibilityCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Field-Level Privacy
        </CardTitle>
        <CardDescription>
          Choose which information to show on your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {['personal', 'contact', 'professional'].map(category => (
          <div key={category} className="space-y-4">
            <h3 className="text-sm font-medium capitalize">{category} Information</h3>
            <div className="space-y-3">
              {fieldConfigs
                .filter(config => config.category === category)
                .map(config => {
                  const fieldKey = `show${config.field.charAt(0).toUpperCase() + config.field.slice(1)}` as keyof PrivacySettings;
                  return (
                    <div key={config.field} className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Label className="flex items-center gap-2">
                          {config.icon}
                          {config.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {config.description}
                        </p>
                      </div>
                      <Switch
                        checked={settings[fieldKey] as boolean}
                        onCheckedChange={(checked) => handleSettingChange(fieldKey, checked)}
                      />
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const AdditionalSettingsCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Additional Privacy Settings
        </CardTitle>
        <CardDescription>
          Control search visibility and data access
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Allow Profile Search
            </Label>
            <p className="text-sm text-muted-foreground">
              Let others find you through search
            </p>
          </div>
          <Switch
            checked={settings.allowSearch}
            onCheckedChange={(checked) => handleSettingChange('allowSearch', checked)}
          />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Allow Direct Messages
            </Label>
            <p className="text-sm text-muted-foreground">
              Let others send you direct messages
            </p>
          </div>
          <Switch
            checked={settings.allowMessaging}
            onCheckedChange={(checked) => handleSettingChange('allowMessaging', checked)}
          />
        </div>
        
        <Separator />
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Data Export
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow exporting your profile data
            </p>
          </div>
          <Switch
            checked={settings.dataExportEnabled}
            onCheckedChange={(checked) => handleSettingChange('dataExportEnabled', checked)}
          />
        </div>
      </CardContent>
    </Card>
  );

  const PreviewCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Profile Preview
        </CardTitle>
        <CardDescription>
          See how your profile appears to others
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public">Public</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
            <TabsTrigger value="organization">Organization</TabsTrigger>
          </TabsList>
          
          <TabsContent value={previewMode} className="mt-4">
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Profile Picture</span>
                <Badge variant="secondary">Always Visible</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Display Name</span>
                <Badge variant="secondary">Always Visible</Badge>
              </div>
              
              {settings.showEmail && (
                <div className="flex items-center gap-2">
                  {settings.profileVisibility === 'public' || previewMode === settings.profileVisibility ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Email Address</span>
                </div>
              )}
              
              {settings.showPhone && (
                <div className="flex items-center gap-2">
                  {settings.profileVisibility === 'public' || previewMode === settings.profileVisibility ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Phone Number</span>
                </div>
              )}
              
              {settings.showLocation && (
                <div className="flex items-center gap-2">
                  {settings.profileVisibility === 'public' || previewMode === settings.profileVisibility ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Location</span>
                </div>
              )}
              
              {settings.showCompanyInfo && (
                <div className="flex items-center gap-2">
                  {settings.profileVisibility === 'public' || previewMode === settings.profileVisibility ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="text-sm">Company Information</span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {hasChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <ProfileVisibilityCard />
          <FieldVisibilityCard />
        </div>
        
        <div className="space-y-6">
          <AdditionalSettingsCard />
          {showPreview && <PreviewCard />}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => loadPrivacySettings()}
          disabled={!hasChanges || isLoading}
        >
          Reset
        </Button>
        <Button
          onClick={saveSettings}
          disabled={!hasChanges || isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}