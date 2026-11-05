import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import { validarDatosEnDisco } from "../lib/validarDatos.server";
import { SITIO } from "../data/sitio";
import AvisoDemostracion from "../componentes/AvisoDemostracion";

// Las dos familias del sistema de diseño. next/font las descarga en la compilación
// y las sirve desde el propio dominio, así que quien visita la página no
// hace ninguna petición a un tercero (RNF-01).
//
// Fraunces es variable: los ejes SOFT y WONK son los que le dan el
// carácter del sistema, y se piden con `axes`. No se fija `weight` porque
// una fuente variable cubre el rango entero por sí sola.
//
// El sello de origen del catálogo va en itálica, así que `italic` se pide
// como estilo real. Sin esto el navegador sintetiza una oblicua, y una
// serif de display inclinada de mentira se ve peor que una derecha.
const titulos = Fraunces({
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK"],
  style: ["normal", "italic"],
  variable: "--fuente-titulos",
});

const cuerpo = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--fuente-cuerpo",
});

// Provisional. El copy definitivo se escribe con lo que enseñen los
// primeros contactos reales (ver README, Contenido pendiente).
//
// `metadataBase` hace que cualquier URL relativa (canonical, Open Graph) se
// resuelva contra el dominio real del despliegue. Sin eso, los enlaces
// canónicos apuntarían a localhost.
export const metadata: Metadata = {
  metadataBase: new URL(SITIO.url),
  title: {
    default: "Cafeto Sierra Alta — Café de altura en Pachuca, Hidalgo",
    template: "%s — Cafeto Sierra Alta",
  },
  description:
    "Café de altura, quesos artesanales y miel pura en Pachuca de Soto, Hidalgo. Mayoreo para empresas, oficinas y escuelas. Cotiza directo por WhatsApp.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: SITIO.url,
    siteName: "Cafeto Sierra Alta",
    title: "Cafeto Sierra Alta — Café de altura en Pachuca, Hidalgo",
    description:
      "Café de altura, quesos artesanales y miel pura en Pachuca de Soto, Hidalgo. Mayoreo para empresas, oficinas y escuelas. Cotiza directo por WhatsApp.",
    images: [
      {
        url: "/images/og-cafeto.jpg",
        width: 1200,
        height: 630,
        alt: "Café de altura Cafeto Sierra Alta",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cafeto Sierra Alta — Café de altura en Pachuca, Hidalgo",
    description:
      "Café de altura, quesos artesanales y miel pura en Pachuca de Soto, Hidalgo. Mayoreo para empresas, oficinas y escuelas.",
    images: ["/images/og-cafeto.jpg"],
  },
  robots: {
    index: false,
    follow: false,
  },
  // Verificación de propiedad en Google Search Console (método "Etiqueta
  // HTML"). Next la emite como `<meta name="google-site-verification">` en
  // todas las páginas del sitio.

};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El layout es un componente de servidor, así que esta comprobación corre
  // en cada compilación y en cada render del servidor, nunca en el
  // navegador. Las validaciones puras de `data/productos.ts` ya corrieron al
  // importar ese módulo; aquí se comprueba lo único que depende del disco:
  // que cada `foto` exista en `public/`.
  validarDatosEnDisco();

  // Cascarón desnudo: el encabezado público, el JSON-LD de la marca y el
  // noscript de las animaciones los pone el layout del grupo `(publico)`,
  // que cubre la página de venta. Las páginas internas (`/admin`) no heredan
  // el encabezado de venta.
  return (
    <html lang="es-MX" className={`${titulos.variable} ${cuerpo.variable}`}>
      <body><AvisoDemostracion />{children}</body>
    </html>
  );
}
