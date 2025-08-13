'use client'; // Required for hooks
import '@/lib/i18n';

import { useTranslation } from 'react-i18next';
import Link from 'next/link'; // Use next/link
import { Button } from '@/ui/primitives/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { Hero } from '@/ui/styled/layout/Hero';
import { Features, FeatureItem } from '@/ui/styled/layout/Features';
import { Shield, UserCircle, KeyRound } from 'lucide-react';

// Replaces the previous placeholder HomePage
export default function HomePage() { 
  const { t } = useTranslation(); // Assuming i18n setup works
  
  // React 19 compatibility - Use a primitive selector
  const isAuthenticated = useAuth().isAuthenticated;

  // Feature grid for this app
  const features: FeatureItem[] = [
    {
      name: t('home.feature.auth.title', 'Authentication'),
      description: t('home.feature.auth.description', 'Secure user authentication with email/password, social login, and two-factor authentication.'),
      icon: KeyRound,
      href: '/auth/login',
    },
    {
      name: t('home.feature.profile.title', 'Profile Management'),
      description: t('home.feature.profile.description', 'Customizable user profiles with avatar support and privacy settings.'),
      icon: UserCircle,
      href: '/account/profile',
    },
    {
      name: t('home.feature.rbac.title', 'Role-Based Access'),
      description: t('home.feature.rbac.description', 'Flexible role and permission system for controlling user access.'),
      icon: Shield,
      href: '/settings',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16">
      <Hero
        title={t('home.title', 'Welcome to User Management')}
        description={t('home.description', 'A powerful and flexible user management system that can be integrated into any application.')}
      >
        {isAuthenticated ? (
          <>
            <Link href="/account/profile">
              <Button>{t('home.viewProfile', 'View Profile')}</Button>
            </Link>
            <Link href="/settings">
              <Button variant="outline">{t('home.settings', 'Settings')}</Button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/auth/register">
              <Button>{t('home.getStarted', 'Get Started')}</Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline">{t('home.signIn', 'Sign In')}</Button>
            </Link>
          </>
        )}
      </Hero>
      <Features
        features={features}
        title={t('home.featuresTitle', 'Key Features')}
        description={t('home.featuresDescription', 'Explore the core capabilities of our user management system.')}
        className="mt-24"
      />
    </div>
  );
} 