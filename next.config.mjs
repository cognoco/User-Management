import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['nodemailer'],
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
      
      // Replace nodemailer with an empty module in client bundles
      config.resolve.alias = {
        ...config.resolve.alias,
        nodemailer: require.resolve('./src/lib/email/nodemailer-stub.js'),
      };
    }
    
    return config;
  },
  // Your existing configuration here
};

export default nextConfig;
