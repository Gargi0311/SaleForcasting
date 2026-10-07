import type { NextConfig } from "next";

const API = process.env.API_URL ?? "http://127.0.0.1:8000";
const isDev = process.env.NODE_ENV !== "production";

// Dev: proxy /api to the FastAPI server.
// Build: static export to ./out, which FastAPI serves in production.
const config: NextConfig = isDev
  ? {
      async rewrites() {
        return [
          { source: "/api/:path*", destination: `${API}/api/:path*` },
          { source: "/docs", destination: `${API}/docs` },
          { source: "/openapi.json", destination: `${API}/openapi.json` },
        ];
      },
    }
  : { output: "export", images: { unoptimized: true } };

export default config;
