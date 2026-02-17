/**
 * Styled Account Settings Component
 *
 * This component provides a default styled implementation of account settings.
 * It accepts all necessary props directly and renders the full settings UI.
 */

import React from 'react';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Switch } from '@/ui/primitives/switch';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Separator } from '@/ui/primitives/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog';
import { ExclamationTriangleIcon, CheckCircledIcon, TrashIcon } from '@radix-ui/react-icons';

// ---------------------------------------------------------------------------
// Session / connected-account shapes
// ---------------------------------------------------------------------------
export interface AccountSession {
  id: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'other';
  current: boolean;
}

export interface ConnectedAccount {
  id: string;
  provider: 'google' | 'github' | 'microsoft' | string;
  name: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface StyledAccountSettingsProps {
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Optional className */
  className?: string;

  // Password change
  passwordForm?: { currentPassword: string; newPassword: string; confirmPassword: string };
  updatePasswordForm?: (field: string, value: string) => void;
  handlePasswordChange?: (e: React.FormEvent) => void;

  // Account deletion
  deleteAccountConfirmation?: string;
  updateDeleteConfirmation?: (value: string) => void;
  handleDeleteAccount?: () => void;

  // Privacy settings
  privacySettings?: {
    profileVisibility: 'public' | 'private';
    activityTracking: boolean;
    communicationEmails: boolean;
    marketingEmails: boolean;
  };
  handlePrivacySettingsChange?: (e: React.FormEvent) => void;
  updatePrivacySettings?: (field: string, value: any) => void;

  // Security settings
  securitySettings?: {
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    deviceManagement: boolean;
  };
  handleSecuritySettingsChange?: (e: React.FormEvent) => void;
  updateSecuritySettings?: (field: string, value: any) => void;

  // Sessions
  sessions?: AccountSession[];
  handleSessionLogout?: (sessionId: string) => void;
  logoutSession?: (sessionId: string) => void;

  // Connected accounts
  connectedAccounts?: ConnectedAccount[];
  handleDisconnectAccount?: (accountId: string) => void;
  disconnectAccount?: (accountId: string) => void;
  handleConnectAccount?: (provider: string) => void;
  connectAccount?: (provider: string) => void;

  // Data export
  exportData?: () => void;
  exportUserData?: () => void;
  isExporting?: boolean;

  // General state
  isLoading?: boolean;
  isSubmitting?: boolean;
  isSuccess?: boolean;
  error?: string;
  errors?: Record<string, string | undefined>;
  successMessage?: string;

  // Touched state (for inline validation)
  touched?: Record<string, boolean>;
  handleBlur?: (field: string) => void;
}

export function AccountSettings({
  title = 'Account Settings',
  description = 'Manage your account settings and preferences',
  footer,
  className,
  passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' },
  updatePasswordForm,
  handlePasswordChange,
  deleteAccountConfirmation = '',
  updateDeleteConfirmation,
  handleDeleteAccount,
  privacySettings = {
    profileVisibility: 'private',
    activityTracking: true,
    communicationEmails: true,
    marketingEmails: false,
  },
  handlePrivacySettingsChange,
  updatePrivacySettings,
  securitySettings = {
    twoFactorEnabled: false,
    loginNotifications: true,
    deviceManagement: false,
  },
  handleSecuritySettingsChange,
  updateSecuritySettings,
  sessions = [],
  handleSessionLogout,
  logoutSession,
  connectedAccounts = [],
  handleDisconnectAccount,
  disconnectAccount,
  handleConnectAccount,
  connectAccount,
  exportData,
  exportUserData,
  isExporting = false,
  isLoading = false,
  isSubmitting = false,
  isSuccess = false,
  errors = {},
  successMessage,
  touched = {},
  handleBlur,
}: StyledAccountSettingsProps) {
  const onDisconnect = handleDisconnectAccount ?? disconnectAccount ?? (() => {});
  const onConnect = handleConnectAccount ?? connectAccount ?? (() => {});
  const onSessionLogout = handleSessionLogout ?? logoutSession ?? (() => {});
  const onExport = exportData ?? exportUserData ?? (() => {});
  const onPrivacyChange = updatePrivacySettings ?? (() => {});
  const onSecurityChange = updateSecuritySettings ?? (() => {});
  const busy = isSubmitting || isLoading;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {(isSuccess || successMessage) && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircledIcon className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {successMessage || 'Settings updated successfully'}
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
          </TabsList>

          {/* ── Password Tab ── */}
          <TabsContent value="password" className="space-y-4 pt-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {['currentPassword', 'newPassword', 'confirmPassword'].map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>
                    {field === 'currentPassword'
                      ? 'Current Password'
                      : field === 'newPassword'
                      ? 'New Password'
                      : 'Confirm New Password'}
                  </Label>
                  <Input
                    id={field}
                    type="password"
                    value={(passwordForm as any)[field] ?? ''}
                    onChange={(e) => updatePasswordForm?.(field, e.target.value)}
                    onBlur={() => handleBlur?.(field)}
                    disabled={busy}
                    aria-invalid={touched[field] && !!errors[field]}
                    className={touched[field] && errors[field] ? 'border-red-500' : ''}
                  />
                  {touched[field] && errors[field] && (
                    <p className="text-sm text-red-500">{errors[field]}</p>
                  )}
                </div>
              ))}

              {errors.passwordForm && (
                <Alert variant="destructive">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <AlertDescription>{errors.passwordForm}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Updating…' : 'Update Password'}
                </Button>
              </div>
            </form>

            <Separator className="my-6" />

            {/* Connected Accounts */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Connected Accounts</h3>
              {connectedAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
                      {account.provider === 'google' && <span className="text-red-500">G</span>}
                      {account.provider === 'github' && <span className="text-gray-800">GH</span>}
                      {account.provider === 'microsoft' && <span className="text-blue-500">M</span>}
                    </div>
                    <div>
                      <p className="font-medium">{account.name}</p>
                      <p className="text-sm text-gray-500">{account.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDisconnect(account.id)}
                    disabled={busy}
                  >
                    Disconnect
                  </Button>
                </div>
              ))}
              {connectedAccounts.length === 0 && (
                <p className="text-sm text-gray-500">No connected accounts</p>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                {(['google', 'github', 'microsoft'] as const).map((provider) => (
                  <Button
                    key={provider}
                    variant="outline"
                    size="sm"
                    onClick={() => onConnect(provider)}
                    disabled={busy || connectedAccounts.some((a) => a.provider === provider)}
                  >
                    Connect{' '}
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="my-6" />

            {/* Danger Zone */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <TrashIcon className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-red-600">Delete Account</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. Type{' '}
                      <strong>DELETE</strong> to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Input
                      value={deleteAccountConfirmation}
                      onChange={(e) => updateDeleteConfirmation?.(e.target.value)}
                      placeholder="DELETE"
                      className="font-mono"
                    />
                  </div>
                  <DialogFooter>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={busy || deleteAccountConfirmation !== 'DELETE'}
                    >
                      {busy ? 'Deleting…' : 'Permanently Delete Account'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={onExport}
                disabled={isExporting}
                className="mt-2"
              >
                {isExporting ? 'Exporting…' : 'Export My Data'}
              </Button>
            </div>
          </TabsContent>

          {/* ── Privacy Tab ── */}
          <TabsContent value="privacy" className="space-y-4 pt-4">
            <form onSubmit={handlePrivacySettingsChange} className="space-y-4">
              {[
                {
                  id: 'profileVisibility',
                  label: 'Profile Visibility',
                  desc: 'Control who can see your profile information',
                  checked: privacySettings.profileVisibility === 'public',
                  trueLabel: 'Public',
                  falseLabel: 'Private',
                  onChange: (v: boolean) =>
                    onPrivacyChange('profileVisibility', v ? 'public' : 'private'),
                },
                {
                  id: 'activityTracking',
                  label: 'Activity Tracking',
                  desc: 'Allow usage data collection to improve your experience',
                  checked: privacySettings.activityTracking,
                  trueLabel: 'Enabled',
                  falseLabel: 'Disabled',
                  onChange: (v: boolean) => onPrivacyChange('activityTracking', v),
                },
                {
                  id: 'communicationEmails',
                  label: 'Communication Emails',
                  desc: 'Receive emails about product updates',
                  checked: privacySettings.communicationEmails,
                  trueLabel: 'Enabled',
                  falseLabel: 'Disabled',
                  onChange: (v: boolean) => onPrivacyChange('communicationEmails', v),
                },
                {
                  id: 'marketingEmails',
                  label: 'Marketing Emails',
                  desc: 'Receive promotional emails',
                  checked: privacySettings.marketingEmails,
                  trueLabel: 'Enabled',
                  falseLabel: 'Disabled',
                  onChange: (v: boolean) => onPrivacyChange('marketingEmails', v),
                },
              ].map(({ id, label, desc, checked, trueLabel, falseLabel, onChange }) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={id}>{label}</Label>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={id}
                      checked={checked}
                      onCheckedChange={onChange}
                      disabled={busy}
                    />
                    <span className="text-sm">{checked ? trueLabel : falseLabel}</span>
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save Privacy Settings'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ── Security Tab ── */}
          <TabsContent value="security" className="space-y-4 pt-4">
            <form onSubmit={handleSecuritySettingsChange} className="space-y-4">
              {[
                {
                  id: 'twoFactorEnabled',
                  label: 'Two-Factor Authentication',
                  desc: 'Add an extra layer of security',
                  checked: securitySettings.twoFactorEnabled,
                  onChange: (v: boolean) => onSecurityChange('twoFactorEnabled', v),
                },
                {
                  id: 'loginNotifications',
                  label: 'Login Notifications',
                  desc: 'Get notified on new sign-ins',
                  checked: securitySettings.loginNotifications,
                  onChange: (v: boolean) => onSecurityChange('loginNotifications', v),
                },
                {
                  id: 'deviceManagement',
                  label: 'Device Management',
                  desc: 'Track devices that have accessed your account',
                  checked: securitySettings.deviceManagement,
                  onChange: (v: boolean) => onSecurityChange('deviceManagement', v),
                },
              ].map(({ id, label, desc, checked, onChange }) => (
                <div key={id} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor={id}>{label}</Label>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={id}
                      checked={checked}
                      onCheckedChange={onChange}
                      disabled={busy}
                    />
                    <span className="text-sm">{checked ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save Security Settings'}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* ── Sessions Tab ── */}
          <TabsContent value="sessions" className="space-y-4 pt-4">
            <h3 className="text-lg font-medium">Active Sessions</h3>
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 border rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                    {session.deviceType === 'desktop' ? '💻' : '📱'}
                  </div>
                  <div>
                    <div className="flex items-center">
                      <p className="font-medium">
                        {session.browser} on {session.os}
                      </p>
                      {session.current && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      IP: {session.ip} · Last active: {session.lastActive}
                    </p>
                    <p className="text-xs text-gray-500">Location: {session.location}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSessionLogout(session.id)}
                  disabled={busy || session.current}
                >
                  {session.current ? 'Current Session' : 'Logout'}
                </Button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm text-gray-500">No active sessions</p>
            )}
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() =>
                  sessions
                    .filter((s) => !s.current)
                    .forEach((s) => onSessionLogout(s.id))
                }
                disabled={busy || sessions.filter((s) => !s.current).length === 0}
              >
                Logout All Other Sessions
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>

      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
