import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@blocknote/core",
    "@blocknote/react",
    "@blocknote/server-util",
  ],
};

export default nextConfig;
