import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Native / heavy packages must not be bundled by Turbopack
  serverExternalPackages: ["better-sqlite3", "pg", "exceljs"],
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
