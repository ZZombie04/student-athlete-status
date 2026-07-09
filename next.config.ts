import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native / heavy packages must not be bundled by Turbopack
  serverExternalPackages: ["better-sqlite3", "pg", "exceljs"],
};

export default nextConfig;
