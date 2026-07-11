import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "10.84.160.6",
    "100.66.62.113",
    "*.local"
  ]
};

export default nextConfig;
