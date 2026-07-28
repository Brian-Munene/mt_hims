import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  turbopack: {
    root: path.resolve(__dirname),
  },
  // lightningcss/@tailwindcss ship native binaries whose dynamic require() fallback
  // breaks when bundled into a server chunk — keep them external instead.
  serverExternalPackages: ["lightningcss", "@tailwindcss/node", "@tailwindcss/postcss"],
};

export default nextConfig;
