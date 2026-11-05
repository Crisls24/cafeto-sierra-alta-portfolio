import { Situacion } from "./tipos";

/**
 * Los tres momentos en los que una organización sirve café, queso o miel.
 *
 * Antes esta lista clasificaba por segmento ---oficinas, restaurantes--- con
 * listas de inclusiones y un mensaje de WhatsApp por entrada. Se cambió por
 * indicación de la clienta dos veces:
 *
 * 1. Esos segmentos obligaban a inventar a qué negocios sirve la marca, y el
 *    visitante no se reconocía en ellos. Lo que sí reconoce es el momento: la
 *    jornada, la visita, la reunión.
 * 2. Y después se quitó el párrafo. El catálogo ya enseñó los productos y esta
 *    sección se reduce a un titular y una línea por bloque.
 *
 * 3. El titular pasó de frase de hospitalidad ("Una pausa de calidad cada día")
 *    a **beneficio para el comprador**: frases bonitas pero huecas no le dicen
 *    a quien decide la compra qué gana su operación. Cada bloque nombra el
 *    beneficio en lenguaje humano ---sin jerga de recursos humanos, que hacía
 *    parecer a Cafeto una solución de RH--- y lo aterriza en el producto: el
 *    tercero nombra café, quesos y miel a propósito, porque el surtido es la
 *    prueba del beneficio, no una repetición del catálogo.
 *
 * La fotografía carga el peso y es **de producto**, no una escena con personas
 * de banco de imágenes: una taza servida, el conjunto de las bolsas y el molino.
 * No se reciclan las fotos exactas del catálogo ni del carrusel (se usa el
 * conjunto de bolsas, no las bolsas individuales de una presentación) porque
 * repetir la misma imagen a unos scrolls de distancia se lee como un descuido.
 * `validarDatosEnDisco` avisa si una ruta está mal escrita.
 */
export const SITUACIONES: Situacion[] = [
  {
    id: "equipo",
    numero: "01",
    titulo: "PARA TU EQUIPO",
    bajada: "Bienestar para tu equipo",
    descripcion:
      "Café de altura para acompañar la jornada y hacer más agradables las pausas.",
    foto: "/images/taza-natural-medio-2.webp",
    alt: "Taza de café de altura recién servido",
    orden: 1,
  },
  {
    id: "visitas",
    numero: "02",
    titulo: "PARA TUS INVITADOS",
    bajada: "Una mejor experiencia para tus invitados",
    descripcion:
      "Café de especialidad en salas de juntas y reuniones que habla bien de tu empresa.",
    foto: "/images/bolsas-cafe-renew.webp",
    alt: "Bolsas de café de las variedades lavado, honey y natural",
    orden: 2,
  },
  {
    id: "reuniones",
    numero: "03",
    titulo: "PARA EVENTOS Y REGALOS",
    bajada: "Una mesa con identidad",
    descripcion:
      "Café, quesos de la sierra y miel para acompañar reuniones y recibir a tus invitados.",
    foto: "/images/molienda-cafe.webp",
    alt: "Molino y proceso de molienda del café al momento",
    orden: 3,
  },
];

// Validaciones
const idsSituaciones = new Set<string>();
const numerosSituaciones = new Set<string>();
for (const s of SITUACIONES) {
  if (idsSituaciones.has(s.id)) {
    throw new Error(`Error en situaciones: ID duplicado '${s.id}'.`);
  }
  if (numerosSituaciones.has(s.numero)) {
    throw new Error(`Error en situaciones: número duplicado '${s.numero}'.`);
  }
  idsSituaciones.add(s.id);
  numerosSituaciones.add(s.numero);
}