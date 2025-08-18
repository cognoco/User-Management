'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, AlertCircle, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface PasswordResetFlowProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type FlowStep = 'request' | 'verify' | 'reset' | 'success';

export function PasswordResetFlow({ onSuccess, onCancel }: PasswordResetFlowProps) {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<FlowStep>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  // Check for token in URL
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      setToken(urlToken);
      setStep('verify');
      validateToken(urlToken);
    }
  }, [searchParams]);

  // Validate token
  const validateToken = async (tokenToValidate: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/reset-password/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenToValidate })
      });

      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
        setEmail(data.email || '');
        setTokenExpiry(data.remainingTime || null);
        setStep('reset');
      } else {
        setTokenValid(false);
        setError(data.error || 'Invalid or expired token');
        setStep('request');
      }
    } catch (err) {
      setError('Failed to validate token');
      setStep('request');
    } finally {
      setLoading(false);
    }
  };

  // Request password reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(
          data.message || 'If an account exists with this email, you will receive password reset instructions.'
        );
        // Don't automatically move to next step to prevent email enumeration
      } else {
        setError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Reset password with token
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep('success');
        setSuccessMessage(data.message || 'Password reset successfully');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          } else {
            window.location.href = '/auth/login';
          }
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd: string): { strength: number; label: string; color: string } => {
    let strength = 0;
    
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;

    const percentage = (strength / 6) * 100;
    
    if (percentage < 33) return { strength: percentage, label: 'Weak', color: '#ef4444' };
    if (percentage < 66) return { strength: percentage, label: 'Fair', color: '#f59e0b' };
    return { strength: percentage, label: 'Strong', color: '#10b981' };
  };

  const passwordStrength = password ? getPasswordStrength(password) : null;

  // Format remaining time
  const formatRemainingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex-1 h-1 rounded ${step !== 'request' ? 'bg-purple-600' : 'bg-gray-300'}`} />
          <div className={`mx-2 flex-1 h-1 rounded ${step === 'reset' || step === 'success' ? 'bg-purple-600' : 'bg-gray-300'}`} />
          <div className={`flex-1 h-1 rounded ${step === 'success' ? 'bg-purple-600' : 'bg-gray-300'}`} />
        </div>
      </div>

      {/* Request Reset Step */}
      {step === 'request' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-gray-600">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="you@example.com"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-start space-x-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start space-x-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Login
            </button>
          </form>
        </div>
      )}

      {/* Reset Password Step */}
      {step === 'reset' && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Password</h2>
            <p className="mt-2 text-gray-600">
              {email && `Resetting password for ${email}`}
            </p>
            {tokenExpiry && (
              <p className="mt-1 text-sm text-orange-600">
                Link expires in {formatRemainingTime(tokenExpiry)}
              </p>
            )}
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter new password"
                  required
                  disabled={loading}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {passwordStrength && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Password strength:</span>
                    <span style={{ color: passwordStrength.color }} className="font-medium">
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${passwordStrength.strength}%`,
                        backgroundColor: passwordStrength.color
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="flex items-start space-x-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (password !== confirmPassword)}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resetting...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('request')}
              className="w-full py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Request New Link
            </button>
          </form>
        </div>
      )}

      {/* Success Step */}
      {step === 'success' && (
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Password Reset Successful!</h2>
            <p className="mt-2 text-gray-600">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/auth/login'}
              className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-4 focus:ring-purple-200 transition-colors"
            >
              Go to Login
            </button>
            
            <p className="text-sm text-gray-500">
              Redirecting to login page in a few seconds...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}