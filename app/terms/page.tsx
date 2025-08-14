import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions - User Management',
  description: 'Terms and Conditions for using our User Management system',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
      
      <div className="prose prose-gray max-w-none">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing and using this User Management System, you accept and agree to be bound by the terms and provision of this agreement.
        </p>

        <h2>2. Use License</h2>
        <p>
          Permission is granted to temporarily access the User Management System for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <ul>
          <li>modify or copy the materials</li>
          <li>use the materials for any commercial purpose or for any public display (commercial or non-commercial)</li>
          <li>attempt to decompile or reverse engineer any software contained in the system</li>
          <li>remove any copyright or other proprietary notations from the materials</li>
        </ul>

        <h2>3. Disclaimer</h2>
        <p>
          The materials in this User Management System are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </p>

        <h2>4. Limitations</h2>
        <p>
          In no event shall the Company or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this system.
        </p>

        <h2>5. Privacy Policy</h2>
        <p>
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the system, to understand our practices.
        </p>

        <h2>6. Contact Information</h2>
        <p>
          If you have any questions about these Terms and Conditions, please contact us at support@example.com.
        </p>

        <p className="text-sm text-gray-600 mt-8">
          Last updated: {new Date().toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}