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
  // Path-only redirects live here rather than in a page that just calls
  // redirect(): an interrupted render trips React 19.2's dev Performance
  // tracks ("cannot have a negative time stamp"). Runs before proxy.ts, so
  // the auth check still applies at the destination.
  async redirects() {
    return [{ source: "/admin", destination: "/admin/view/users/", permanent: false }];
  },
};

export default nextConfig;
