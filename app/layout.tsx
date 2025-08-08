import type { Metadata, Viewport } from 'next';
import RootLayoutClient from './RootLayoutClient';
import './globals.css';
import { initializeErrorSystem, initializeMonitoringSystem } from '@/lib/monitoring';
// Temporarily disable top-level initialization to avoid potential dev-server deadlocks.
// Client-side error system is initialized in `RootLayoutClient`.
// initializeErrorSystem();
// initializeMonitoringSystem();

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover'
};

export const metadata: Metadata = {
  title: 'User Management',
  description: 'User Management Module',
  generator: 'Next.js',
  keywords: ['user management', 'authentication'],
  authors: [{ name: 'Your Company' }],
  openGraph: {
    type: 'website',
    siteName: 'User Management',
    title: 'User Management System',
    description: 'Advanced user management system',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'User Management',
    description: 'Advanced user management system',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="antialiased">
      <head />
      <body className="font-sans">
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
