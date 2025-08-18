'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/primitives/dialog';
import { Button } from '@/ui/primitives/button';
import { SessionTimeout as HeadlessSessionTimeout } from '@/ui/headless/session/SessionTimeout';

interface SessionTimeoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionTimeout({ isOpen, onClose }: SessionTimeoutProps): React.ReactElement {
  return (
    <HeadlessSessionTimeout
      isOpen={isOpen}
      onClose={onClose}
      render={({ handleLogout, isOpen, onClose }) => (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Session Expired</DialogTitle>
            </DialogHeader>
            <p className="py-4">Your session has expired due to inactivity. Please log in again.</p>
            <DialogFooter>
              <Button onClick={handleLogout}>Log In Again</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    />
  );
}
