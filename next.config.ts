import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "pg", "exceljs"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
