/**
 * Styled Account Settings Component
 * 
 * This component provides a default styled implementation of the headless AccountSettings.
 * It uses the headless component for behavior and adds UI rendering with Shadcn UI components.
 */

import React from 'react';
import { AccountSettings as HeadlessAccountSettings, AccountSettingsProps } from '../../headless/profile/AccountSettings';
import { Input } from '@/ui/primitives/input';
import { Button } from '@/ui/primitives/button';
import { Label } from '@/ui/primitives/label';
import { Switch } from '@/ui/primitives/switch';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Separator } from '@/ui/primitives/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/ui/primitives/dialog';
import { ExclamationTriangleIcon, CheckCircledIcon, TrashIcon } from '@radix-ui/react-icons';

export interface StyledAccountSettingsProps extends Omit<AccountSettingsProps, 'render'> {
  /**
   * Optional title for the account settings
   */
  title?: string;
  
  /**
   * Optional description for the account settings
   */
  description?: string;
  
  /**
   * Optional footer content
   */
  footer?: React.ReactNode;
  
  /**
   * Optional className for styling
   */
  className?: string;
}

export function AccountSettings({
  title = 'Account Settings',
  description = 'Manage your account settings and preferences',
  footer,
  className,
  ...headlessProps
}: StyledAccountSettingsProps): React.ReactElement {
  return (
    <HeadlessAccountSettings
      {...headlessProps}
      render={({
        handlePasswordChange,
        handleDeleteAccount,
        handlePrivacySettingsChange,
        handleSecuritySettingsChange,
        passwordForm,
        updatePasswordForm,
        deleteAccountConfirmation,
        updateDeleteConfirmation,
        privacySettings,
        securitySettings,
        isSubmitting,
        isSuccess,
        errors,
        touched,
        handleBlur,
        sessions,
        handleSessionLogout,
        connectedAccounts,
        handleDisconnectAccount,
        handleConnectAccount,
        exportData,
        isExporting
      }) => (
        <Card className={className}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess && (
              <Alert className="mb-6 bg-green-50 border-green-200">
                <CheckCircledIcon className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Settings updated successfully
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
              
              {/* Password Tab */}
              <TabsContent value="password" className="space-y-4 pt-4">
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => updatePasswordForm('currentPassword', e.target.value)}
                      onBlur={() => handleBlur('currentPassword')}
                      disabled={isSubmitting}
                      aria-invalid={touched.currentPassword && !!errors.currentPassword}
                      className={touched.currentPassword && errors.currentPassword ? 'border-red-500' : ''}
                    />
                    {touched.currentPassword && errors.currentPassword && (
                      <p className="text-sm text-red-500">{errors.currentPassword}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => updatePasswordForm('newPassword', e.target.value)}
                      onBlur={() => handleBlur('newPassword')}
                      disabled={isSubmitting}
                      aria-invalid={touched.newPassword && !!errors.newPassword}
                      className={touched.newPassword && errors.newPassword ? 'border-red-500' : ''}
                    />
                    {touched.newPassword && errors.newPassword && (
                      <p className="text-sm text-red-500">{errors.newPassword}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => updatePasswordForm('confirmPassword', e.target.value)}
                      onBlur={() => handleBlur('confirmPassword')}
                      disabled={isSubmitting}
                      aria-invalid={touched.confirmPassword && !!errors.confirmPassword}
                      className={touched.confirmPassword && errors.confirmPassword ? 'border-red-500' : ''}
                    />
                    {touched.confirmPassword && errors.confirmPassword && (
                      <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>
                  
                  {errors.passwordForm && (
                    <Alert variant="destructive">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{errors.passwordForm}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Updating...' : 'Update Password'}
                    </Button>
                  </div>
                </form>
                
                <Separator className="my-6" />
                
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Connected Accounts</h3>
                    <p className="text-sm text-gray-500">
                      Manage your connected third-party accounts
                    </p>
                  </div>
                  
                  <div className="space-y-4">
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
                          onClick={() => handleDisconnectAccount(account.id)}
                          disabled={isSubmitting}
                        >
                          Disconnect
                        </Button>
                      </div>
                    ))}
                    
                    {connectedAccounts.length === 0 && (
                      <p className="text-sm text-gray-500">No connected accounts</p>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConnectAccount('google')}
                        disabled={isSubmitting || connectedAccounts.some(a => a.provider === 'google')}
                      >
                        Connect Google
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConnectAccount('github')}
                        disabled={isSubmitting || connectedAccounts.some(a => a.provider === 'github')}
                      >
                        Connect GitHub
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConnectAccount('microsoft')}
                        disabled={isSubmitting || connectedAccounts.some(a => a.provider === 'microsoft')}
                      >
                        Connect Microsoft
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-6" />
                
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
                    <p className="text-sm text-gray-500">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  
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
                          This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                          <p className="text-sm font-medium">
                            To confirm, please type &quot;DELETE&quot; in the field below:
                          </p>
                        <Input
                          value={deleteAccountConfirmation}
                          onChange={(e) => updateDeleteConfirmation(e.target.value)}
                          placeholder="DELETE"
                          className="font-mono"
                        />
                      </div>
                      
                      <DialogFooter>
                        <Button 
                          variant="destructive" 
                          onClick={handleDeleteAccount}
                          disabled={isSubmitting || deleteAccountConfirmation !== 'DELETE'}
                        >
                          {isSubmitting ? 'Deleting...' : 'Permanently Delete Account'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  
                  <Button 
                    variant="outline" 
                    onClick={exportData}
                    disabled={isExporting}
                    className="mt-2"
                  >
                    {isExporting ? 'Exporting...' : 'Export My Data'}
                  </Button>
                </div>
              </TabsContent>
              
              {/* Privacy Tab */}
              <TabsContent value="privacy" className="space-y-4 pt-4">
                <form onSubmit={handlePrivacySettingsChange} className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="profileVisibility">Profile Visibility</Label>
                        <p className="text-sm text-gray-500">
                          Control who can see your profile information
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="profileVisibility" className="sr-only">
                          Profile Visibility
                        </Label>
                        <Switch
                          id="profileVisibility"
                          checked={privacySettings.profileVisibility === 'public'}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('privacySettings.profileVisibility', checked ? 'public' : 'private')
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {privacySettings.profileVisibility === 'public' ? 'Public' : 'Private'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="activityTracking">Activity Tracking</Label>
                        <p className="text-sm text-gray-500">
                          Allow us to collect usage data to improve your experience
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="activityTracking" className="sr-only">
                          Activity Tracking
                        </Label>
                        <Switch
                          id="activityTracking"
                          checked={privacySettings.activityTracking}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('privacySettings.activityTracking', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {privacySettings.activityTracking ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="communicationEmails">Communication Emails</Label>
                        <p className="text-sm text-gray-500">
                          Receive emails about product updates and announcements
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="communicationEmails" className="sr-only">
                          Communication Emails
                        </Label>
                        <Switch
                          id="communicationEmails"
                          checked={privacySettings.communicationEmails}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('privacySettings.communicationEmails', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {privacySettings.communicationEmails ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketingEmails">Marketing Emails</Label>
                        <p className="text-sm text-gray-500">
                          Receive emails about promotions and marketing campaigns
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="marketingEmails" className="sr-only">
                          Marketing Emails
                        </Label>
                        <Switch
                          id="marketingEmails"
                          checked={privacySettings.marketingEmails}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('privacySettings.marketingEmails', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {privacySettings.marketingEmails ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {errors.privacyForm && (
                    <Alert variant="destructive">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{errors.privacyForm}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Privacy Settings'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4 pt-4">
                <form onSubmit={handleSecuritySettingsChange} className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                        <p className="text-sm text-gray-500">
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="twoFactorAuth" className="sr-only">
                          Two-Factor Authentication
                        </Label>
                        <Switch
                          id="twoFactorAuth"
                          checked={securitySettings.twoFactorEnabled}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('securitySettings.twoFactorEnabled', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="loginNotifications">Login Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive notifications when someone logs into your account
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="loginNotifications" className="sr-only">
                          Login Notifications
                        </Label>
                        <Switch
                          id="loginNotifications"
                          checked={securitySettings.loginNotifications}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('securitySettings.loginNotifications', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {securitySettings.loginNotifications ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="deviceManagement">Device Management</Label>
                        <p className="text-sm text-gray-500">
                          Track and manage devices that have accessed your account
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="deviceManagement" className="sr-only">
                          Device Management
                        </Label>
                        <Switch
                          id="deviceManagement"
                          checked={securitySettings.deviceManagement}
                          onCheckedChange={(checked) => 
                            updatePasswordForm('securitySettings.deviceManagement', checked)
                          }
                          disabled={isSubmitting}
                        />
                        <span className="text-sm">
                          {securitySettings.deviceManagement ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {errors.securityForm && (
                    <Alert variant="destructive">
                      <ExclamationTriangleIcon className="h-4 w-4" />
                      <AlertDescription>{errors.securityForm}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Security Settings'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              {/* Sessions Tab */}
              <TabsContent value="sessions" className="space-y-4 pt-4">
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                    <h3 className="text-lg font-medium">Active Sessions</h3>
                    <p className="text-sm text-gray-500">
                      Manage your active sessions across devices
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100">
                            {session.deviceType === 'mobile' && <span>📱</span>}
                            {session.deviceType === 'tablet' && <span>📱</span>}
                            {session.deviceType === 'desktop' && <span>💻</span>}
                            {session.deviceType === 'other' && <span>🖥️</span>}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium">{session.browser} on {session.os}</p>
                              {session.current && (
                                <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 space-x-4">
                              <span>IP: {session.ip}</span>
                              <span>Last active: {session.lastActive}</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Location: {session.location}
                            </p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSessionLogout(session.id)}
                          disabled={isSubmitting || session.current}
                        >
                          {session.current ? 'Current Session' : 'Logout'}
                        </Button>
                      </div>
                    ))}
                    
                    {sessions.length === 0 && (
                      <p className="text-sm text-gray-500">No active sessions</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="destructive" 
                      onClick={() => sessions.filter(s => !s.current).forEach(s => handleSessionLogout(s.id))}
                      disabled={isSubmitting || sessions.filter(s => !s.current).length === 0}
                    >
                      Logout All Other Sessions
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          
          {footer && <CardFooter>{footer}</CardFooter>}
        </Card>
      )}
    />
  );
}
