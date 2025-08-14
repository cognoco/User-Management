import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - User Management',
  description: 'Privacy Policy for our User Management system',
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      
      <div className="prose prose-gray max-w-none">
        <h2>Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as when you create an account, update your profile, or contact us for support.
        </p>

        <h3>Personal Information</h3>
        <ul>
          <li>Name and contact information</li>
          <li>Email address</li>
          <li>Profile information</li>
          <li>Authentication credentials</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <ul>
          <li>Log data (IP address, browser type, pages visited)</li>
          <li>Device information</li>
          <li>Usage analytics</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, maintain, and improve our services</li>
          <li>Process transactions and send related information</li>
          <li>Send technical notices and support messages</li>
          <li>Respond to comments and questions</li>
          <li>Monitor and analyze usage and trends</li>
        </ul>

        <h2>Information Sharing</h2>
        <p>
          We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
        </p>

        <h2>Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </p>

        <h2>Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Update or correct your information</li>
          <li>Delete your account and associated data</li>
          <li>Export your data</li>
        </ul>

        <h2>Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at privacy@example.com.
        </p>

        <p className="text-sm text-gray-600 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}