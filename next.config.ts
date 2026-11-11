import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  devIndicators: false,
  poweredByHeader: false,
  // Minimal, layout-safe headers (no CSP: WebGL shaders, Lenis and next/font need no extra rules here).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
  // One canonical host: the bare domain sends visitors (and search engines) to www.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "matsuhub.com" }],
        destination: "https://www.matsuhub.com/:path*",
        permanent: true,
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
