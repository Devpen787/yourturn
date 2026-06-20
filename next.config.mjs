/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@hashgraph/hedera-wallet-connect",
    "@reown/appkit",
    "@walletconnect/universal-provider",
  ],
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
