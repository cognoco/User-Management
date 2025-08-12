'use client'; // Required for hooks
import '@/lib/i18n/index';

import { useTranslation } from 'react-i18next';
import Link from 'next/link'; // Use next/link
import { Button } from '@/ui/primitives/button';
import { useAuthService } from '@/lib/context/AuthContext';
import { Hero } from '@/ui/styled/layout/Hero';
import { Features } from '@/ui/styled/layout/Features';
import type { FeatureItem } from '@/ui/headless/layout/Features';
import { Shield, UserCircle, KeyRound } from 'lucide-react';
import { useState, useEffect } from 'react';

// Replaces the previous placeholder HomePage
export default function HomePage() { 
  const { t } = useTranslation(); // Assuming i18n setup works
  
  // Use the auth service directly to avoid configuration complexity
  const authService = useAuthService();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const user = await authService.getCurrentUser();
        setIsAuthenticated(!!user);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [authService]);

  console.log('HomePage render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

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

  const handleTestClick = () => {
    console.log('Test button clicked!');
    alert('Test button works!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16">
      {/* Test button to verify button functionality */}
      <div className="mb-8 text-center">
        <Button onClick={handleTestClick} className="mb-4">
          Test Button (Click me!)
        </Button>
        <p className="text-sm text-gray-600">If this button works, the issue is with the Link components</p>
        <p className="text-sm text-gray-600">Auth status: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}</p>
      </div>

      <Hero
        title={t('home.title', 'Welcome to User Management')}
        description={t('home.description', 'A powerful and flexible user management system that can be integrated into any application.')}
      >
        {isAuthenticated ? (
          <>
            <Button asChild>
              <Link href="/account/profile">{t('home.viewProfile', 'View Profile')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/settings">{t('home.settings', 'Settings')}</Link>
            </Button>
          </>
        ) : (
          <>
            <Button asChild>
              <Link href="/auth/register">{t('home.getStarted', 'Get Started')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/auth/login">{t('home.signIn', 'Sign In')}</Link>
            </Button>
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