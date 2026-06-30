/** @type {import('next').NextConfig} */

// Applied to every route via the headers() hook below.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig = {
  poweredByHeader: false, // drop the X-Powered-By: Next.js header
  compress: true, // gzip responses
  // Type safety is enforced by tsc; lint is run separately (`npm run lint`) so a
  // style nit never blocks a production/deploy build.
  eslint: { ignoreDuringBuilds: true },
  experimental: { instrumentationHook: true }, // enable instrumentation.ts (live TxLINE autosync)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dexscreener.com" },
      { protocol: "https", hostname: "dd.dexscreener.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
