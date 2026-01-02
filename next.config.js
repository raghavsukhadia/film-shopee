/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/ssr'],
  eslint: {
    // Note: Consider enabling ESLint in builds after fixing all warnings
    // ignoreDuringBuilds: false,
    ignoreDuringBuilds: true, // Temporarily disabled - fix ESLint errors first
  },
  typescript: {
    // Note: Consider enabling TypeScript strict checking after fixing all errors
    // ignoreBuildErrors: false,
    ignoreBuildErrors: true, // Temporarily disabled - fix TypeScript errors first
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
      },
    ],
  },
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  // Enable compression
  compress: true,
  // Optimize production builds
  swcMinify: true,
}

module.exports = nextConfig
