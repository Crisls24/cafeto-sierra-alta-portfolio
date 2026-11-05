import type { Metadata } from "next";
import type { PaginaCafeData } from "@/data/cafe";
import { SITIO } from "@/data/sitio";

export function metadataCafe(pagina: PaginaCafeData): Metadata {
  return {
    title: pagina.titulo,
    description: pagina.descripcion,
    alternates: { canonical: pagina.ruta },
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: SITIO.nombre,
      url: `${SITIO.url}${pagina.ruta}`,
      title: pagina.titulo,
      description: pagina.descripcion,
      images: [{ url: "/images/og-cafeto.jpg", width: 1200, height: 630, alt: SITIO.nombre }],
    },
    twitter: {
      card: "summary_large_image",
      title: pagina.titulo,
      description: pagina.descripcion,
      images: ["/images/og-cafeto.jpg"],
    },
  };
}
