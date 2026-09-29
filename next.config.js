const { buildSecurityHeaders } = require("./security-headers");

// NODE_ENV is "development" under `next dev` and "production" under
// `next build` / `next start`. `headers()` is evaluated at build time for
// production (the result is baked into the routes manifest), so a
// production build always carries the production policy.
const isDev = process.env.NODE_ENV !== "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gofuturegrad.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Applies to every route — student app, admin dashboard, API routes.
        source: "/:path*",
        headers: buildSecurityHeaders(isDev),
      },
    ];
  },
};

module.exports = nextConfig;
