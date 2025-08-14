import { Metadata } from 'next';
import HomePageClient from './HomePageClient';

export const metadata: Metadata = {
  title: 'User Management - Secure Authentication System',
  description: 'Secure, scalable, and user-friendly authentication and user management solution.',
};

export default function HomePage() {
  return <HomePageClient />;
}