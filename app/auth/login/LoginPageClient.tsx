'use client'; // Required for hooks like useTranslation
import '@/lib/i18n';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import LoginForm from '@/ui/styled/auth/LoginForm';

export default function LoginPageClient() {
  const { t } = useTranslation();

  return (
    <div className="container max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        {t('auth.login.title', 'Welcome Back')}
      </h1>
      <LoginForm 
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
    </div>
  );
}