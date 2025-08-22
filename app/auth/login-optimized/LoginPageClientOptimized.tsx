'use client';

import { lazy, Suspense } from 'react';
import Link from 'next/link';

// Lazy load heavy components
const LoginFormOptimized = lazy(() => import('./LoginFormOptimized'));

// Lazy load i18n only when needed
const useTranslation = () => {
  // Simple fallback translations without loading the entire i18n system
  return {
    t: (key: string, fallback: string) => fallback
  };
};

export default function LoginPageClientOptimized() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        {t('auth.login.title', 'Welcome Back')}
      </h1>
      <Suspense fallback={<FormSkeleton />}>
        <LoginFormOptimized 
          title={t('auth.login.formTitle', 'Sign In')}
          description={t('auth.login.formDescription', 'Enter your credentials to access your account')}
          showRememberMe={true}
          footer={
            <div className="text-center text-sm w-full">
              <div className="mt-2">
                <Link href="/auth/reset-password" className="text-primary hover:underline">
                  {t('auth.login.forgotPassword', 'Forgot your password?')}
                </Link>
              </div>
              <div className="mt-2">
                <Link href="/auth/passwordless" className="text-primary hover:underline">
                  {t('auth.login.magicLink', 'Send me a magic link')}
                </Link>
              </div>
              <div className="mt-4">
                {t('auth.login.noAccount', "Don't have an account?")}{' '}
                <Link href="/auth/register" className="text-primary font-medium hover:underline">
                  {t('auth.login.signUp', 'Sign up')}
                </Link>
              </div>
            </div>
          }
        />
      </Suspense>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-100 rounded"></div>
      <div className="h-10 bg-gray-100 rounded"></div>
      <div className="h-10 bg-gray-100 rounded"></div>
    </div>
  );
}