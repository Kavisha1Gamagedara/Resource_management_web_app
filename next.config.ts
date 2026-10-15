import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Disable Next.js dev indicator toolbar (N-shaped button in bottom-left corner) */
  devIndicators: false,
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
