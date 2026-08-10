import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  outputFileTracingIncludes: {
    "/api/shards/*/icon": [
      "./reference/SkyShards-master/public/shardIcons/**/*.png",
    ],
  },
  poweredByHeader: false,
};

export default nextConfig;
