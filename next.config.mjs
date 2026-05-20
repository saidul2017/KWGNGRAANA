/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output mandiri agar Docker image ramping (~150 MB vs ~700 MB).
  // Hasilnya di .next/standalone/server.js — jalankan dengan `node server.js`.
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client"],
  },
};

export default nextConfig;
