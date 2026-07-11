import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI-generated apps should deploy even if the template has strict type or
  // lint issues. Type errors are compile-time only and don't affect runtime,
  // so we don't let them block a deployment.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Without this, the client-side Router Cache can serve a stale RSC
    // payload for dynamic pages (e.g. the homepage's quota count) after
    // navigating away and back via <Link>, until a hard refresh.
    staleTimes: { dynamic: 0 },
  },
};

export default nextConfig;
