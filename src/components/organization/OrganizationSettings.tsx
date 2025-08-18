import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Textarea } from '@/ui/primitives/textarea';
import { Badge } from '@/ui/primitives/badge';
import { Switch } from '@/ui/primitives/switch';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Separator } from '@/ui/primitives/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/primitives/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/primitives/dialog';
import {
  Building2,
  Globe,
  Shield,
  Bell,
  CreditCard,
  Users,
  Settings,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download,
  Copy,
  ExternalLink,
  Info,
  Lock,
  Unlock,
  Calendar,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

export interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  industry?: string;
  size?: string;
  founded?: Date;
  taxId?: string;
  settings: {
    allowPublicProfile: boolean;
    allowMemberInvites: boolean;
    requireTwoFactor: boolean;
    sessionTimeout: number;
    ipWhitelist?: string[];
    allowedDomains?: string[];
    defaultRole: string;
    dataRetention: number;
    auditLogRetention: number;
    notificationPreferences: {
      newMember: boolean;
      memberRemoved: boolean;
      billingUpdates: boolean;
      securityAlerts: boolean;
      weeklyReports: boolean;
    };
  };
  billing?: {
    plan: string;
    status: string;
    nextBillingDate?: Date;
    paymentMethod?: string;
  };
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    memberCount: number;
    storageUsed: number;
    storageLimit: number;
  };
}

interface OrganizationSettingsProps {
  organization: OrganizationData;
  onSave: (updates: Partial<OrganizationData>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onExportData?: () => Promise<void>;
  onUploadLogo?: (file: File) => Promise<string>;
  canDelete?: boolean;
  canEditBilling?: boolean;
  isOwner?: boolean;
}

export function OrganizationSettings({
  organization,
  onSave,
  onDelete,
  onExportData,
  onUploadLogo,
  canDelete = false,
  canEditBilling = false,
  isOwner = false,
}: OrganizationSettingsProps): React.ReactElement {
  const [orgData, setOrgData] = useState<OrganizationData>(organization);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(orgData);
      setSuccess('Organization settings updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!onDelete || deleteConfirmText !== organization.name) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      await onDelete();
      setSuccess('Organization deleted successfully');
      setShowDeleteConfirm(false);
    } catch (err) {
      setError('Failed to delete organization. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file || !onUploadLogo) return;

    setUploadingLogo(true);
    setError(null);
    try {
      const logoUrl = await onUploadLogo(file);
      setOrgData({ ...orgData, logo: logoUrl });
      setSuccess('Logo uploaded successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to upload logo. Please try again.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const updateSettings = <K extends keyof OrganizationData['settings']>(
    key: K,
    value: OrganizationData['settings'][K]
  ): void => {
    setOrgData({
      ...orgData,
      settings: { ...orgData.settings, [key]: value },
    });
  };

  const updateNotificationPreference = (
    key: keyof OrganizationData['settings']['notificationPreferences'],
    value: boolean
  ): void => {
    setOrgData({
      ...orgData,
      settings: {
        ...orgData.settings,
        notificationPreferences: {
          ...orgData.settings.notificationPreferences,
          [key]: value,
        },
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Settings
              </CardTitle>
              <CardDescription>
                Manage your organization's profile and preferences
              </CardDescription>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                {onExportData && (
                  <Button variant="outline" onClick={onExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                )}
                {!isEditing ? (
                  <Button onClick={() => setIsEditing(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Settings
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setOrgData(organization);
                      setIsEditing(false);
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="general" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              {/* Organization Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Organization Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={orgData.name}
                      onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="org-slug">URL Slug</Label>
                    <Input
                      id="org-slug"
                      value={orgData.slug}
                      onChange={(e) => setOrgData({ ...orgData, slug: e.target.value })}
                      disabled={!isEditing}
                    />
                    <p className="text-xs text-muted-foreground">
                      yourapp.com/org/{orgData.slug}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-description">Description</Label>
                  <Textarea
                    id="org-description"
                    value={orgData.description || ''}
                    onChange={(e) => setOrgData({ ...orgData, description: e.target.value })}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org-website"
                        value={orgData.website || ''}
                        onChange={(e) => setOrgData({ ...orgData, website: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="org-email">Contact Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org-email"
                        type="email"
                        value={orgData.email || ''}
                        onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="contact@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="org-phone"
                        value={orgData.phone || ''}
                        onChange={(e) => setOrgData({ ...orgData, phone: e.target.value })}
                        disabled={!isEditing}
                        className="pl-10"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="org-industry">Industry</Label>
                    <Select
                      value={orgData.industry || ''}
                      onValueChange={(value) => setOrgData({ ...orgData, industry: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="org-industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center gap-4">
                    {orgData.logo ? (
                      <img
                        src={orgData.logo}
                        alt="Organization logo"
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    {isEditing && onUploadLogo && (
                      <div>
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? (
                            'Uploading...'
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logo
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Company Size */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Company Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-size">Company Size</Label>
                    <Select
                      value={orgData.size || ''}
                      onValueChange={(value) => setOrgData({ ...orgData, size: value })}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="org-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-500">201-500 employees</SelectItem>
                        <SelectItem value="501-1000">501-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="org-taxid">Tax ID</Label>
                    <Input
                      id="org-taxid"
                      value={orgData.taxId || ''}
                      onChange={(e) => setOrgData({ ...orgData, taxId: e.target.value })}
                      disabled={!isEditing}
                      placeholder="XX-XXXXXXX"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Security Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="require-2fa">Require Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        All members must enable 2FA to access the organization
                      </p>
                    </div>
                    <Switch
                      id="require-2fa"
                      checked={orgData.settings.requireTwoFactor}
                      onCheckedChange={(checked) => updateSettings('requireTwoFactor', checked)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Select
                      value={orgData.settings.sessionTimeout.toString()}
                      onValueChange={(value) => updateSettings('sessionTimeout', parseInt(value))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="session-timeout">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                        <SelectItem value="480">8 hours</SelectItem>
                        <SelectItem value="1440">24 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="default-role">Default Member Role</Label>
                    <Select
                      value={orgData.settings.defaultRole}
                      onValueChange={(value) => updateSettings('defaultRole', value)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="default-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-invites">Allow Member Invites</Label>
                      <p className="text-sm text-muted-foreground">
                        Members can invite others to join the organization
                      </p>
                    </div>
                    <Switch
                      id="allow-invites"
                      checked={orgData.settings.allowMemberInvites}
                      onCheckedChange={(checked) => updateSettings('allowMemberInvites', checked)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Data Retention</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="data-retention">Data Retention (days)</Label>
                    <Input
                      id="data-retention"
                      type="number"
                      value={orgData.settings.dataRetention}
                      onChange={(e) => updateSettings('dataRetention', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min="30"
                      max="3650"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="audit-retention">Audit Log Retention (days)</Label>
                    <Input
                      id="audit-retention"
                      type="number"
                      value={orgData.settings.auditLogRetention}
                      onChange={(e) => updateSettings('auditLogRetention', parseInt(e.target.value))}
                      disabled={!isEditing}
                      min="30"
                      max="3650"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <p className="text-sm text-muted-foreground">
                  Choose which notifications to receive for organization events
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-new-member">New Member Joined</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when new members join
                      </p>
                    </div>
                    <Switch
                      id="notify-new-member"
                      checked={orgData.settings.notificationPreferences.newMember}
                      onCheckedChange={(checked) => updateNotificationPreference('newMember', checked)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-member-removed">Member Removed</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when members are removed
                      </p>
                    </div>
                    <Switch
                      id="notify-member-removed"
                      checked={orgData.settings.notificationPreferences.memberRemoved}
                      onCheckedChange={(checked) => updateNotificationPreference('memberRemoved', checked)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-billing">Billing Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive billing and subscription notifications
                      </p>
                    </div>
                    <Switch
                      id="notify-billing"
                      checked={orgData.settings.notificationPreferences.billingUpdates}
                      onCheckedChange={(checked) => updateNotificationPreference('billingUpdates', checked)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-security">Security Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important security notifications
                      </p>
                    </div>
                    <Switch
                      id="notify-security"
                      checked={orgData.settings.notificationPreferences.securityAlerts}
                      onCheckedChange={(checked) => updateNotificationPreference('securityAlerts', checked)}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="notify-reports">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly usage and activity reports
                      </p>
                    </div>
                    <Switch
                      id="notify-reports"
                      checked={orgData.settings.notificationPreferences.weeklyReports}
                      onCheckedChange={(checked) => updateNotificationPreference('weeklyReports', checked)}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6">
              {/* Billing Information */}
              {orgData.billing && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Billing Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="font-medium">{orgData.billing.plan}</p>
                          <Badge variant={orgData.billing.status === 'active' ? 'default' : 'secondary'}>
                            {orgData.billing.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {orgData.billing.nextBillingDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Next Billing Date</p>
                          <p className="font-medium mt-1">
                            {new Date(orgData.billing.nextBillingDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>

                    {canEditBilling && (
                      <Button variant="outline" className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Manage Billing
                      </Button>
                    )}
                  </div>
                  
                  <Separator />
                </>
              )}

              {/* Usage Information */}
              {orgData.metadata && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Usage Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Members</p>
                        <p className="text-2xl font-bold">{orgData.metadata.memberCount}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Storage Used</p>
                        <p className="text-2xl font-bold">
                          {Math.round(orgData.metadata.storageUsed / 1024 / 1024 / 1024)} GB
                        </p>
                        <p className="text-sm text-muted-foreground">
                          of {Math.round(orgData.metadata.storageLimit / 1024 / 1024 / 1024)} GB
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Organization ID</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">{orgData.id}</code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(orgData.id)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p>{new Date(orgData.metadata.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Updated</p>
                        <p>{new Date(orgData.metadata.updatedAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                </>
              )}

              {/* Danger Zone */}
              {canDelete && isOwner && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-destructive">Danger Zone</h3>
                  
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                      Deleting your organization is permanent and cannot be undone. All data will be lost.
                    </AlertDescription>
                  </Alert>

                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Organization
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are about to permanently delete <strong>{organization.name}</strong> and all associated data.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">
                Type <strong>{organization.name}</strong> to confirm
              </Label>
              <Input
                id="delete-confirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={organization.name}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteConfirmText !== organization.name || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}