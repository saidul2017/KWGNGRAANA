/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Output mandiri agar Docker image ramping (~150 MB vs ~700 MB).
  // Hasilnya di .next/standalone/server.js — jalankan dengan `node server.js`.
  output: "standalone",
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client"],
    // Aktifkan src/instrumentation.ts agar validasi SESSION_PASSWORD jalan
    // saat startup (fail-fast), bukan saat request pertama.
    instrumentationHook: true,
  },
};

export default nextConfig;
