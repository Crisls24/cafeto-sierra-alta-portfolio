/**
 * Identidad pública del sitio para SEO y datos estructurados.
 *
 * No es diseño ni catálogo: es la URL canónica del despliegue en Cloudflare
 * Pages. La usan los metadatos de `layout.tsx`, `sitemap.ts`, `robots.ts` y
 * los datos estructurados, para que la copia del dominio viva en un solo
 * lugar.
 */
export const SITIO = {
  url: "http://localhost:8788",
  nombre: "Cafeto Sierra Alta",
} as const;