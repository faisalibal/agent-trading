/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow reading files from parent directory (logs, .env)
  experimental: {
    serverComponentsExternalPackages: ['ccxt'],
  },
};

export default nextConfig;
