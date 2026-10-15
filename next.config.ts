import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Next 16's new Cache Components mode requires every dynamic data access
  // (searchParams, cookies(), DB calls, etc.) to be wrapped in its own
  // <Suspense> boundary to prerender. This app is auth/DB-driven on nearly
  // every route with no caching story yet, so that tradeoff isn't worth it
  // right now — revisit per-route once there's something worth caching.
  cacheComponents: false,
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
