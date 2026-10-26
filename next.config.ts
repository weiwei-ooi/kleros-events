import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Temporary: lets the Supabase SQL editor tab fetch the content script. Remove after loading.
  async headers() {
    return [{ source: "/seed/:path*", headers: [{ key: "Access-Control-Allow-Origin", value: "https://supabase.com" }] }];
  },
};

export default nextConfig;
