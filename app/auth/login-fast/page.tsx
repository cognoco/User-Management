'use client';

import Link from 'next/link';
import LoginFormOptimized from '@/ui/styled/auth/LoginFormOptimized';

export default function LoginFastPage() {
  return (
    <div className="container max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        Welcome Back
      </h1>
      <LoginFormOptimized 
        title="Sign In"
        description="Enter your credentials to access your account"
        showRememberMe={true}
        footer={
          <div className="text-center text-sm">
            <div className="mt-2">
              <Link href="/auth/reset-password" className="text-primary hover:underline">
                Forgot your password?
              </Link>
            </div>
            <div className="mt-4">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
}