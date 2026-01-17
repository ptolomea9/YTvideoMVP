import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qjkgsiqcqkkuhawuqvve.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // Fix for multiple lockfiles - use this project's root
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
