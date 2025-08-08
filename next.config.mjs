import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      '@supabase/node-fetch',
      '@supabase/realtime-js',
      'whatwg-url',
    ],
  },
  webpack: (config, { isServer }) => {
    // Increase the timeout for chunk loading
    config.watchOptions = {
      ...config.watchOptions,
      aggregateTimeout: 600,
      poll: 1000,
    };
    
    // Exclude server-only modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        tls: false,
        assert: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        querystring: false,
        url: false,
        util: false,
      };

      // Prevent bundling server-only packages into client builds
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        nodemailer: false,
        'form-data': false,
        asynckit: false,
        '@supabase/node-fetch': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        '@supabase/node-fetch/lib/index.js': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        'node-fetch': false,
        // Ensure whatwg-url never enters client bundles via supabase/node-fetch
        'whatwg-url': false,
        'whatwg-url/lib/URL.js': false,
        'whatwg-url/lib/public-api.js': false,
        'whatwg-url/lib/url-state-machine.js': false,
        '@supabase/supabase-js/dist/module/lib/fetch.js': path.resolve(__dirname, 'src/lib/shims/supabase-fetch.ts'),
        // Use a lightweight fetch-based shim for axios in the browser
        axios: path.resolve(__dirname, 'src/lib/api/axios-browser.ts'),
        // Also ensure our internal axios wrapper resolves to the browser shim on client
        '@/lib/api/axios': path.resolve(__dirname, 'src/lib/api/axios-browser.ts'),
        // Radix components should resolve normally; do not alias to false or they will be missing
      };
      
      // Completely exclude nodemailer from client bundle
      // Ensure nodemailer is never included in client bundle
      config.externals = config.externals || {};
      config.externals.nodemailer = 'nodemailer';
    }
    
    return config;
  },
  // Your existing configuration here
};

export default nextConfig;
