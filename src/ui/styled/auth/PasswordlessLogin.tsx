'use client';

import { useState } from 'react';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { api } from '@/lib/api/axios';

export function PasswordlessLogin(): React.ReactElement {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setStatus('idle');
    try {
      await api.post('/api/auth/passwordless', { email });
      setStatus('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send magic link');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-md mx-auto">
      {status === 'success' && (
        <Alert>
          <AlertDescription>
            A login link has been sent to your email if an account exists.
          </AlertDescription>
        </Alert>
      )}
      {status === 'error' && error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSendLink} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-ml">Email</Label>
          <Input
            id="email-ml"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Sending...' : 'Send Magic Link'}
        </Button>
      </form>
    </div>
  );
}
