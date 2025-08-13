export default function HomePage() { 
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-4">Welcome to User Management</h1>
      <p className="text-lg mb-8">A powerful and flexible user management system that can be integrated into any application.</p>
      
      <div className="space-y-4">
        <a href="/test" className="block text-blue-600 hover:text-blue-800">
          Go to Test Page
        </a>
        <p className="text-sm text-gray-600">
          If you can see this page, the basic Next.js setup is working!
        </p>
      </div>
    </div>
  );
} 