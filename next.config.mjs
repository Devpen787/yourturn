/** @type {import('next').NextConfig} */
const nextConfig = {
  // Avoid bundling @hashgraph/sdk (pulls pino/diagnostics_channel incompatible with Node 18 during build)
  experimental: {
    serverComponentsExternalPackages: ["@hashgraph/sdk"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("@hashgraph/sdk");
    }
    return config;
  },
};

export default nextConfig;
