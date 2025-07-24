import type { NextConfig } from "next"
import withBundleAnalyzer from "@next/bundle-analyzer"

const nextConfig: NextConfig = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})({
  output: "standalone",
  experimental: {
    optimizePackageImports: ["@phosphor-icons/react"],
  },
  serverExternalPackages: ["shiki", "vscode-oniguruma"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  eslint: {
    // @todo: remove before going live
    ignoreDuringBuilds: true,
  },
})

export default nextConfig
