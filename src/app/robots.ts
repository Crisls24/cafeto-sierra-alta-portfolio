import type { MetadataRoute } from "next";

import { SITIO } from "@/data/sitio";

// Con `output: "export"` las rutas de metadata deben declararse estáticas.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",

        // El panel de moderación es interno y está detrás de Cloudflare
        // Access; aunque el borde ya pide sesión, no se pide indexar.
        disallow: ["/"],
      },
    ],
    sitemap: `${SITIO.url}/sitemap.xml`,
  };
}
