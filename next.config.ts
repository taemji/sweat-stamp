import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Character images are pre-sized WebP files from scripts/build-character-assets.mjs.
    unoptimized: true,
  },
};

export default nextConfig;
