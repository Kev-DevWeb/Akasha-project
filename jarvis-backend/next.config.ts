import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite que las API routes soporten respuestas de audio en streaming
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Headers de seguridad para el endpoint de Jarvis
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Jarvis-Secret",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
