import { useState } from 'react';
import { SecuritySettings as HeadlessSecuritySettings } from '@/ui/headless/profile/SecuritySettings';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Switch } from '../../../components/ui/switch';
import { Shield, Smartphone, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';

export function SecuritySettings(): React.ReactElement {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <HeadlessSecuritySettings
      render={({ mfaEnabled, toggleMfa, loading }) => (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                </div>
                <Switch
                  checked={mfaEnabled}
                  onCheckedChange={toggleMfa}
                  disabled={loading}
                  aria-label="Toggle two-factor authentication"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Email Verification</p>
                    <p className="text-sm text-muted-foreground">
                      Verify your email address
                    </p>
                  </div>
                </div>
                <Button variant="default" disabled>
                  Verify Email
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Smartphone className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Phone Verification</p>
                    <p className="text-sm text-muted-foreground">
                      Verify your phone number
                    </p>
                  </div>
                </div>
                <Button variant="default" disabled>
                  Verify Phone
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delete Account</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete Account
              </Button>
            </CardContent>
          </Card>

          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Account</DialogTitle>
                <DialogDescription>
                  This action cannot be undone. This will permanently delete
                  your account and remove your data from our servers.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    // Handle account deletion
                    setShowDeleteDialog(false);
                  }}
                >
                  Delete Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    />
  );
}