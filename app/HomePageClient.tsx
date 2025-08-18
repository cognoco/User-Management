'use client';
import '@/lib/i18n';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { Button } from '@/ui/primitives/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { Hero } from '@/ui/styled/layout/Hero';
import { Features, FeatureItem } from '@/ui/styled/layout/Features';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Badge } from '@/ui/primitives/badge';
import { 
  Shield, 
  UserCircle, 
  KeyRound, 
  Lock, 
  CreditCard, 
  Building2, 
  Users, 
  Globe, 
  ShieldCheck,
  Settings,
  FileText,
  Mail,
  Key,
  UserCog,
  Receipt
} from 'lucide-react';

export default function HomePageClient() { 
  const { t } = useTranslation();
  
  // React 19 compatibility - Use a primitive selector
  const isAuthenticated = useAuth().isAuthenticated;

  // Main features grid
  const mainFeatures: FeatureItem[] = [
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
      name: t('home.feature.privacy.title', 'Privacy Controls'),
      description: t('home.feature.privacy.description', 'Granular privacy settings with GDPR compliance and data management.'),
      icon: Lock,
      href: '/account/privacy',
    },
    {
      name: t('home.feature.billing.title', 'Billing & Invoices'),
      description: t('home.feature.billing.description', 'Stripe-powered subscription management with invoice history and payment methods.'),
      icon: CreditCard,
      href: '/account/billing',
    },
    {
      name: t('home.feature.organizations.title', 'Organizations'),
      description: t('home.feature.organizations.description', 'Complete organization management with teams, domains, and SSO configuration.'),
      icon: Building2,
      href: '/organizations',
    },
    {
      name: t('home.feature.rbac.title', 'Role-Based Access'),
      description: t('home.feature.rbac.description', 'Flexible role and permission system for controlling user access.'),
      icon: Shield,
      href: '/settings',
    },
  ];

  // Organization-specific features
  const orgFeatures = [
    {
      title: 'Domain Verification',
      description: 'Verify organization domains via DNS, CNAME, Email, or File upload',
      icon: Globe,
      href: '/organizations/[orgId]/domains',
      badge: 'New'
    },
    {
      title: 'SSO Configuration',
      description: 'Configure SAML, OIDC, Google, Microsoft, Okta, and Auth0 providers',
      icon: ShieldCheck,
      href: '/organizations/[orgId]/sso',
      badge: 'Enterprise'
    },
    {
      title: 'Seat Management',
      description: 'Manage team members, allocate seats, and handle invitations',
      icon: Users,
      href: '/organizations/[orgId]/members',
      badge: 'Teams'
    },
    {
      title: 'Organization Settings',
      description: 'Comprehensive settings for organization profiles and policies',
      icon: Settings,
      href: '/organizations/[orgId]/settings',
      badge: 'Admin'
    }
  ];

  // Auth & Security features
  const authFeatures = [
    {
      title: 'Password Reset',
      description: 'Secure password reset flow with email verification',
      icon: Key,
      href: '/auth/forgot-password'
    },
    {
      title: 'Email Verification',
      description: 'Automated email verification with resend functionality',
      icon: Mail,
      href: '/auth/verify-email'
    },
    {
      title: 'MFA Setup',
      description: 'Two-factor authentication for enhanced security',
      icon: ShieldCheck,
      href: '/account/security'
    }
  ];

  // User Account features
  const accountFeatures = [
    {
      title: 'Privacy Settings',
      description: 'Control profile visibility, data sharing, and GDPR preferences',
      icon: Lock,
      href: '/account/privacy'
    },
    {
      title: 'Invoice History',
      description: 'View, download, and manage billing invoices',
      icon: Receipt,
      href: '/account/billing'
    },
    {
      title: 'Profile Management',
      description: 'Update personal information and preferences',
      icon: UserCog,
      href: '/account/profile'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <Hero
          title={t('home.title', 'User Management System')}
          description={t('home.description', 'A complete, production-ready user management solution with authentication, organizations, billing, and privacy controls.')}
        >
          {isAuthenticated ? (
            <div className="flex gap-4 flex-wrap justify-center">
              <Link href="/dashboard">
                <Button size="lg">{t('home.dashboard', 'Dashboard')}</Button>
              </Link>
              <Link href="/account/profile">
                <Button size="lg" variant="outline">{t('home.viewProfile', 'View Profile')}</Button>
              </Link>
              <Link href="/organizations">
                <Button size="lg" variant="outline">{t('home.organizations', 'Organizations')}</Button>
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 flex-wrap justify-center">
              <Link href="/auth/register">
                <Button size="lg">{t('home.getStarted', 'Get Started')}</Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline">{t('home.signIn', 'Sign In')}</Button>
              </Link>
              <Link href="/auth/forgot-password">
                <Button size="lg" variant="ghost">{t('home.forgotPassword', 'Forgot Password?')}</Button>
              </Link>
            </div>
          )}
        </Hero>

        {/* Main Features Grid */}
        <Features
          features={mainFeatures}
          title={t('home.featuresTitle', 'Core Features')}
          description={t('home.featuresDescription', 'Everything you need for complete user management in one integrated system.')}
          className="mt-24"
        />

        {/* Organization Features Section */}
        <section className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Organization Management</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful tools for managing teams, domains, SSO, and organizational settings
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {orgFeatures.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <feature.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{feature.title}</CardTitle>
                    </div>
                    {feature.badge && (
                      <Badge variant="secondary">{feature.badge}</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-2">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAuthenticated ? (
                    <Link href={feature.href.replace('[orgId]', 'demo')}>
                      <Button variant="ghost" className="w-full">
                        View Feature →
                      </Button>
                    </Link>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">Sign in to access</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Auth & Security Section */}
        <section className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Authentication & Security</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Robust security features to protect user accounts and data
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {authFeatures.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={feature.href}>
                    <Button variant="outline" size="sm" className="w-full">
                      Learn More
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* User Account Section */}
        <section className="mt-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-4">User Account Features</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Complete control over personal data, privacy, and billing
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {accountFeatures.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <feature.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAuthenticated ? (
                    <Link href={feature.href}>
                      <Button variant="outline" size="sm" className="w-full">
                        Access Feature
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="ghost" size="sm" className="w-full" disabled>
                      Sign In Required
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Status Indicators */}
        <section className="mt-24 border-t pt-12">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold tracking-tight mb-4">Implementation Status</h3>
            <p className="text-muted-foreground">Track the progress of our feature development</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">100%</div>
              <div className="text-sm text-muted-foreground">Core Auth</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">100%</div>
              <div className="text-sm text-muted-foreground">UI Components</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">85%</div>
              <div className="text-sm text-muted-foreground">Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">75%</div>
              <div className="text-sm text-muted-foreground">Billing</div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mt-24 text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-12 pb-12">
              <h2 className="text-2xl font-bold mb-4">
                {isAuthenticated ? 'Explore All Features' : 'Ready to Get Started?'}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                {isAuthenticated 
                  ? 'Access your dashboard to manage your profile, organizations, and settings.'
                  : 'Join now to experience the full power of our user management system.'}
              </p>
              {isAuthenticated ? (
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link href="/dashboard">
                    <Button size="lg">Go to Dashboard</Button>
                  </Link>
                  <Link href="/organizations">
                    <Button size="lg" variant="outline">Manage Organizations</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex gap-4 justify-center flex-wrap">
                  <Link href="/auth/register">
                    <Button size="lg">Create Account</Button>
                  </Link>
                  <Link href="/auth/login">
                    <Button size="lg" variant="outline">Sign In</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}