import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // @ts-ignore - Next.js turbopack type might be incomplete in NextConfig
  turbopack: {
    root: process.cwd(),
  }
};

export default nextConfig;
