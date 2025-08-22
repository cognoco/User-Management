import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load the client component
const LoginPageClient = dynamic(
  () => import('./LoginPageClientOptimized'),
  { 
    loading: () => <LoginSkeleton />
  }
);

export const metadata: Metadata = {
  title: 'Sign In - User Management',
  description: 'Sign in to your account',
};

// Simple loading skeleton
function LoginSkeleton() {
  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-8"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginPageClient />
    </Suspense>
  );
}