import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Links to routes that do not exist fail the typecheck.
  typedRoutes: true,
};

export default nextConfig;
