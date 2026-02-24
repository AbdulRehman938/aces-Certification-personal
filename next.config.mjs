/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/employee',
        destination: '/applicant',
      },
      {
        source: '/employee/:path*',
        destination: '/applicant/:path*',
      },
    ];
  },
};

export default nextConfig;
