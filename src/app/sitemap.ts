import type { MetadataRoute } from "next";

import { SITIO } from "@/data/sitio";
import { PAGINAS_CAFE } from "@/data/cafe";

// Con `output: "export"` las rutas de metadata deben declararse estáticas.
export const dynamic = "force-static";

/**
 * Portada, rutas de café y páginas legales. No incluye admin, API ni reseñas
 * privadas. Se omite lastModified: un build no implica un cambio editorial.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITIO.url,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...Object.values(PAGINAS_CAFE).map((pagina) => ({
      url: `${SITIO.url}${pagina.ruta}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${SITIO.url}/privacidad`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITIO.url}/terminos`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
