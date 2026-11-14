import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // gera uma pasta enxuta com só o necessário para rodar (usada na imagem Docker)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
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
