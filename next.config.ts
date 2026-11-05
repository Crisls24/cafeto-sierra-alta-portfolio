import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export estático servido por Cloudflare Workers, sin servidor de Next.js.
  output: "export",
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  images: {
    // Con `output: "export"` no existe el optimizador en tiempo de petición.
    // Las imágenes se optimizan en el build con `scripts/optimizar-imagenes.mjs`
    // y se sirven tal cual desde `public/images`.
    unoptimized: true,
  },
};

export default nextConfig;
