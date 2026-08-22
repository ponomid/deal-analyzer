import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Expose map key to the browser for Static Maps (referrer-restricted keys work client-side).
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "",
  },
};

export default nextConfig;
