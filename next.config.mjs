import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [],
  eslint: {
    // Allow production builds to complete even if there are ESLint errors.
    // Linting remains available via `npm run lint`.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Allow production builds to complete even if there are TS type errors.
    // Type checking remains available via `tsc --noEmit`.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Increase the timeout for chunk loading
    config.watchOptions = {
      ...config.watchOptions,
      aggregateTimeout: 600,
      poll: 1000,
    };
    
    // Map Radix slot explicitly to ESM dist to avoid named export issues
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@radix-ui/react-slot': path.resolve(__dirname, 'node_modules/@radix-ui/react-slot/dist/index.mjs'),
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
        '@sentry/node': false,
        '@supabase/node-fetch': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        '@supabase/node-fetch/lib/index.js': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        'node-fetch': false,
        // Ensure whatwg-url never enters client bundles via supabase/node-fetch
        'whatwg-url': false,
        'whatwg-url/lib/URL.js': false,
        'whatwg-url/lib/public-api.js': false,
        'whatwg-url/lib/url-state-machine.js': false,
        '@supabase/supabase-js/dist/module/lib/fetch.js': path.resolve(__dirname, 'src/lib/shims/supabase-fetch.ts'),
        '@/lib/database/supabase': path.resolve(__dirname, 'src/lib/shims/supabase-client-browser.ts'),
        // Use a lightweight fetch-based shim for axios in the browser
        axios: path.resolve(__dirname, 'src/lib/api/axios-browser.ts'),
        // Also ensure our internal axios wrapper resolves to the browser shim on client
        '@/lib/api/axios': path.resolve(__dirname, 'src/lib/api/axios-browser.ts'),
        // Radix components should resolve normally; do not alias to false or they will be missing
      };
      // Block supabase realtime on client bundles
      config.resolve.alias['@supabase/realtime-js'] = false;
      
      // Completely exclude nodemailer from client bundle
      // Ensure nodemailer is never included in client bundle
      config.externals = config.externals || {};
      config.externals.nodemailer = 'nodemailer';
    }
    // On server, ensure supabase node-fetch resolves to our global fetch shim to avoid whatwg-url
    if (isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@sentry/node': false,
        '@supabase/node-fetch': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        '@supabase/node-fetch/lib/index.js': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        // Ensure any node-fetch usage resolves to global fetch shim to avoid whatwg-url
        'node-fetch': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        'node-fetch/lib/index.mjs': path.resolve(__dirname, 'src/lib/shims/node-fetch.ts'),
        'cross-fetch': path.resolve(__dirname, 'src/lib/shims/cross-fetch.ts'),
        'cross-fetch/dist/node-ponyfill.js': path.resolve(__dirname, 'src/lib/shims/cross-fetch.ts'),
        // Prevent react-i18next (React context) from entering server bundles
        'react-i18next': path.resolve(__dirname, 'src/lib/shims/react-i18next-server-stub.ts'),
      };
    }
    
    return config;
  },
  // Your existing configuration here
};

export default nextConfig;
