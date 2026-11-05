import { EMPRESA } from "@/data/empresa";
import { PRODUCTOS } from "@/data/productos";
import { SITIO } from "@/data/sitio";
import { PENDIENTE } from "@/data/tipos";
import { openingHoursSpec } from "@/lib/horarios";

/**
 * Datos estructurados de la página: la organización, el negocio local y
 * los productos del catálogo con precio real.
 *
 * Se generan desde `src/data` (RNF-04: nunca datos de ejemplo). Solo entran
 * al JSON-LD los productos que tienen al menos una presentación con precio
 * definido: un precio pendiente no se anuncia como si existiera.
 *
 * El nodo `CafeOrCoffeeShop` es el que Google cruza con la ficha de
 * Google Business: nombre, teléfono, dirección y horario deben coincidir
 * con lo que está publicado ahí.
 */
export default function DatosEstructurados() {
  const productos: Record<string, unknown>[] = [];

  for (const producto of PRODUCTOS) {
    const conPrecio = producto.presentaciones.filter(
      (presentacion) => !presentacion.precioPendiente && presentacion.precio > 0
    );

    if (conPrecio.length === 0) {
      continue;
    }

    const entrada: Record<string, unknown> = {
      "@type": "Product",
      name: producto.nombre,
      description: producto.descripcionCorta,
      category: producto.categoria,
      brand: { "@type": "Brand", name: EMPRESA.marca },
      offers: {
        "@type": "Offer",
        priceCurrency: "MXN",
        price: Math.min(...conPrecio.map((presentacion) => presentacion.precio)),
        availability: "https://schema.org/InStock",
        url: SITIO.url,
      },
    };

    if (producto.foto !== PENDIENTE) {
      entrada.image = `${SITIO.url}${producto.foto}`;
    }

    productos.push(entrada);
  }

  const grafo = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITIO.url}/#organizacion`,
        name: EMPRESA.marca,
        url: SITIO.url,
        description:
          "Café de altura, quesos artesanales y miel pura por volumen para empresas, oficinas y escuelas.",
        email: EMPRESA.correoNegocios,
        privacyPolicy: `${SITIO.url}/privacidad`,
        termsOfService: `${SITIO.url}/terminos`,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "sales",
          // El canal de cotización es WhatsApp: el número vive en `empresa.ts`
          // y aquí solo cambia de formato para schema.org.
          telephone: `+${EMPRESA.whatsapp}`,
        },
      },
      {
        // El negocio físico, con el NAP (nombre, dirección, teléfono) tal
        // como aparece en la ficha de Google Business. La dirección va
        // solo con lo que Google muestra (ciudad, estado, C.P., país):
        // no se inventa calle que no esté confirmada.
        "@type": "CafeOrCoffeeShop",
        "@id": `${SITIO.url}/#local`,
        name: EMPRESA.marca,
        url: SITIO.url,
        image: `${SITIO.url}/images/og-cafeto.jpg`,
        telephone: EMPRESA.telefono !== PENDIENTE ? `+${EMPRESA.telefono}` : undefined,
        email: EMPRESA.correoNegocios,
        parentOrganization: { "@id": `${SITIO.url}/#organizacion` },
        address:
          EMPRESA.direccion !== PENDIENTE
            ? {
                "@type": "PostalAddress",
                addressLocality: EMPRESA.direccion.ciudad,
                addressRegion: EMPRESA.direccion.estado,
                postalCode: EMPRESA.direccion.cp,
                addressCountry: EMPRESA.direccion.pais,
              }
            : undefined,
        ...(EMPRESA.horarios !== PENDIENTE
          ? { openingHoursSpecification: openingHoursSpec(EMPRESA.horarios) }
          : {}),
      },
      ...productos,
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(grafo).replace(/</g, "\\u003c"),
      }}
    />
  );
}