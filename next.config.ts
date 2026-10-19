import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/results/*/pdf": ["./src/app/globals.css", "./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
