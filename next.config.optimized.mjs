/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Experimental optimizations
  experimental: {
    // Optimize package imports
    optimizePackageImports: [
      '@radix-ui/react-slot',
      'lucide-react',
      'class-variance-authority',
      'clsx',
      'tailwind-merge',
      'react-i18next',
      'i18next',
      '@supabase/supabase-js',
      'zod',
      'zustand'
    ],
    
    // Better module resolution
    externalDir: true,
  },
  
  // Optimize production builds
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Module resolution optimizations
  modularizeImports: {
    // UI components
    '@/ui/primitives': {
      transform: '@/ui/primitives/{{member}}',
    },
    '@/ui/styled': {
      transform: '@/ui/styled/{{kebabCase member}}',
    },
    '@/ui/headless': {
      transform: '@/ui/headless/{{kebabCase member}}',
    },
    // Core modules
    '@/core/common': {
      transform: '@/core/common/{{member}}',
      preventFullImport: true,
    },
    '@/core/auth': {
      transform: '@/core/auth/{{member}}',
      preventFullImport: true,
    },
    // Lib utilities
    '@/lib/utils': {
      transform: '@/lib/utils/{{member}}',
      preventFullImport: true,
    },
    '@/lib': {
      transform: '@/lib/{{member}}',
    },
    // Services
    '@/services': {
      transform: '@/services/{{member}}',
    },
    // Adapters
    '@/adapters': {
      transform: '@/adapters/{{member}}',
    },
    // Icons
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      preventFullImport: true,
    },
  },
  
  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize chunk splitting in development
    if (dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Split vendor code
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Split common modules
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Split UI components
            ui: {
              name: 'ui',
              test: /[\\/]src[\\/]ui[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Split core modules
            core: {
              name: 'core',
              test: /[\\/]src[\\/]core[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
        // Better module IDs in development
        moduleIds: 'deterministic',
        // Runtime chunk
        runtimeChunk: {
          name: 'runtime',
        },
      };
    }
    
    // Module resolution optimizations
    config.resolve = {
      ...config.resolve,
      // Prefer ES modules
      mainFields: ['module', 'main'],
      // Cache module resolution
      cache: true,
      // Skip unnecessary extensions
      extensions: ['.tsx', '.ts', '.jsx', '.js'],
    };
    
    // Add module aliases for direct imports
    config.resolve.alias = {
      ...config.resolve.alias,
      // Direct imports for heavy modules
      '@/core/common/errors': '@/core/common/errors',
      '@/core/common/user-types': '@/core/common/user-types',
      '@/core/common/error-codes': '@/core/common/error-codes',
      '@/lib/utils/cn': '@/lib/utils/cn',
    };
    
    // Ignore certain modules in development
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/dist/**',
          '**/coverage/**',
          '**/.git/**',
        ],
      };
    }
    
    return config;
  },
  
  // Transpile packages if needed
  transpilePackages: [
    // Add any packages that need transpilation
  ],
  
  // Output optimizations
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Development optimizations
  onDemandEntries: {
    // Period (in ms) where the page is kept in the buffer
    maxInactiveAge: 60 * 1000,
    // Number of pages kept simultaneously in the buffer
    pagesBufferLength: 5,
  },
  
  // Disable some checks in development for speed
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;