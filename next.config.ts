import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingIncludes: {
    "/api/shards/*/icon": [
      "./public/shardIcons/**/*.png",
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
