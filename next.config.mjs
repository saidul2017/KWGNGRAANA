/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output mandiri agar Docker image ramping (~150 MB vs ~700 MB).
  // Hasilnya di .next/standalone/server.js — jalankan dengan `node server.js`.
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client"],
  },
  // Security headers also set via middleware, but we can add some here as backup
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
