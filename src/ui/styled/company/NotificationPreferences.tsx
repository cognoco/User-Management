'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/ui/primitives/card';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Switch } from '@/ui/primitives/switch';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Label } from '@/ui/primitives/label';
import { Badge } from '@/ui/primitives/badge';
import { Loader2, Bell, Mail, Plus, Trash, AlertCircle, Info } from 'lucide-react';
import { api } from '@/lib/api/axios';
import { useToast } from '@/lib/hooks/use-toast';
import {
  CompanyNotificationPreference,
  NotificationType,
  NotificationChannel
} from '@/types/company';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/ui/primitives/form';

interface NotificationPreferencesProps {
  companyId: string;
}

const emailSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
});

type EmailFormValues = z.infer<typeof emailSchema>;

export function CompanyNotificationPreferences({ companyId }: NotificationPreferencesProps) {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<CompanyNotificationPreference[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('domain-notifications');
  const [additionalEmails, setAdditionalEmails] = useState<{id: string, email: string}[]>([]);
  
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: ''
    }
  });

  useEffect(() => {
    fetchNotificationPreferences();
  }, [companyId, fetchNotificationPreferences]);

  const fetchNotificationPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/company/notifications/preferences`);
      setPreferences(response.data.preferences || []);
      
      // Extract additional emails from recipients
      const emails = response.data.preferences
        .flatMap((pref: CompanyNotificationPreference) => pref.recipients || [])
        .filter((recipient: any) => recipient.email && !recipient.is_admin)
        .map((recipient: any) => ({
          id: recipient.id,
          email: recipient.email
        }));
      
      setAdditionalEmails(emails);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to fetch notification preferences.';
      setError(errMsg);
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const updatePreference = async (
    preferenceId: string | undefined, 
    notificationType: NotificationType, 
    updates: Partial<CompanyNotificationPreference>
  ) => {
    setIsSaving(true);
    try {
      if (preferenceId) {
        // Update existing preference
        await api.patch(`/api/company/notifications/preferences/${preferenceId}`, updates);
      } else {
        // Create new preference
        await api.post(`/api/company/notifications/preferences`, {
          company_id: companyId,
          notification_type: notificationType,
          ...updates
        });
      }
      
      fetchNotificationPreferences();
      toast({ title: 'Success', description: 'Notification preferences updated successfully.' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to update preferences.';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleNotification = (
    preferenceId: string | undefined, 
    notificationType: NotificationType, 
    enabled: boolean
  ) => {
    updatePreference(preferenceId, notificationType, { enabled });
  };

  const handleChannelChange = (
    preferenceId: string | undefined, 
    notificationType: NotificationType, 
    channel: NotificationChannel
  ) => {
    updatePreference(preferenceId, notificationType, { channel });
  };

  const getPreferenceByType = (type: NotificationType) => {
    return preferences.find(pref => pref.notification_type === type);
  };

  const handleAddEmail = async (values: EmailFormValues) => {
    setIsSaving(true);
    try {
      await api.post('/api/company/notifications/recipients', {
        company_id: companyId,
        email: values.email,
        is_admin: false
      });
      
      emailForm.reset();
      fetchNotificationPreferences();
      toast({ title: 'Success', description: 'Email recipient added successfully.' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to add email recipient.';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEmail = async (id: string) => {
    if (!confirm('Are you sure you want to remove this email recipient?')) return;
    
    setIsSaving(true);
    try {
      await api.delete(`/api/company/notifications/recipients/${id}`);
      fetchNotificationPreferences();
      toast({ title: 'Success', description: 'Email recipient removed successfully.' });
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to remove email recipient.';
      toast({ title: 'Error', description: errMsg, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderNotificationSwitch = (type: NotificationType, label: string, description: string) => {
    const preference = getPreferenceByType(type);
    const enabled = preference?.enabled ?? false;
    
    return (
      <div className="flex items-start space-x-4 py-4 border-b">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Label htmlFor={`notification-${type}`} className="font-medium">
              {label}
            </Label>
            {type === 'security_alert' && (
              <Badge variant="secondary" className="text-xs">Required</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
        <div className="pt-1">
          <Switch 
            id={`notification-${type}`}
            checked={type === 'security_alert' ? true : enabled}
            onCheckedChange={(checked) => handleToggleNotification(preference?.id, type, checked)}
            disabled={type === 'security_alert' || isLoading || isSaving}
          />
        </div>
      </div>
    );
  };

  const renderChannelOptions = (type: NotificationType) => {
    const preference = getPreferenceByType(type);
    const enabled = preference?.enabled ?? false;
    const channel = preference?.channel ?? 'both';
    
    if (!enabled && type !== 'security_alert') return null;
    
    return (
      <div className="ml-6 mt-2 mb-4">
        <div className="text-sm text-muted-foreground mb-2">Notification Channel:</div>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id={`${type}-email`} 
              checked={channel === 'email'} 
              onChange={() => handleChannelChange(preference?.id, type, 'email')}
              disabled={isLoading || isSaving || type === 'security_alert'}
            />
            <Label htmlFor={`${type}-email`} className="text-sm cursor-pointer">
              <Mail className="h-4 w-4 inline mr-1" />
              Email only
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id={`${type}-in-app`} 
              checked={channel === 'in_app'} 
              onChange={() => handleChannelChange(preference?.id, type, 'in_app')}
              disabled={isLoading || isSaving || type === 'security_alert'}
            />
            <Label htmlFor={`${type}-in-app`} className="text-sm cursor-pointer">
              <Bell className="h-4 w-4 inline mr-1" />
              In-app only
            </Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input 
              type="radio" 
              id={`${type}-both`} 
              checked={channel === 'both' || type === 'security_alert'} 
              onChange={() => handleChannelChange(preference?.id, type, 'both')}
              disabled={isLoading || isSaving || type === 'security_alert'}
            />
            <Label htmlFor={`${type}-both`} className="text-sm cursor-pointer">
              <Bell className="h-4 w-4 inline mr-1" />
              <Mail className="h-4 w-4 inline mr-1" />
              Both
            </Label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Configure how and when you receive notifications for your company.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="domain-notifications" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="domain-notifications">Domain Notifications</TabsTrigger>
            <TabsTrigger value="email-recipients">Additional Recipients</TabsTrigger>
          </TabsList>
          
          <TabsContent value="domain-notifications">
            <div className="space-y-2">
              <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  Security alerts are always enabled and sent via both email and in-app notifications for your protection.
                </AlertDescription>
              </Alert>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1">
                  {renderNotificationSwitch(
                    'new_member_domain',
                    'New Member Joined via Domain',
                    'Receive notifications when new users register with an email matching your verified domains.'
                  )}
                  {renderChannelOptions('new_member_domain')}
                  
                  {renderNotificationSwitch(
                    'domain_verified',
                    'Domain Verification Success',
                    'Receive notifications when a domain is successfully verified.'
                  )}
                  {renderChannelOptions('domain_verified')}
                  
                  {renderNotificationSwitch(
                    'domain_verification_failed',
                    'Domain Verification Failed',
                    'Receive notifications when domain verification attempts fail.'
                  )}
                  {renderChannelOptions('domain_verification_failed')}
                  
                  {renderNotificationSwitch(
                    'security_alert',
                    'Security Alerts',
                    'Critical security notifications related to your company account and domains.'
                  )}
                  {renderChannelOptions('security_alert')}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="email-recipients">
            <div className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Additional Recipients</AlertTitle>
                <AlertDescription>
                  Add email addresses that should receive company notifications in addition to administrators.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-medium">Current Recipients</h3>
                {additionalEmails.length > 0 ? (
                  <div className="space-y-2">
                    {additionalEmails.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 border rounded-md">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span>{item.email}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleRemoveEmail(item.id)}
                          disabled={isLoading || isSaving}
                        >
                          <Trash className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 border rounded-md text-sm text-muted-foreground">
                    No additional recipients configured
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Add New Recipient</h3>
                <Form {...emailForm}>
                  <form onSubmit={emailForm.handleSubmit(handleAddEmail)} className="flex gap-2">
                    <FormField
                      control={emailForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              placeholder="email@example.com" 
                              {...field} 
                              disabled={isLoading || isSaving}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={isLoading || isSaving}
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                      Add Recipient
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 