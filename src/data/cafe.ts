/** Contenido público de las rutas de café. No promete cobertura, descuentos ni mínimos sin confirmar. */
export interface PaginaCafeData {
  ruta: string;
  etiqueta: string;
  titulo: string;
  descripcion: string;
  introduccion: string;
  foto: string;
  alt: string;
  bloques: { titulo: string; parrafos: string[]; puntos?: string[] }[];
  preguntas: { pregunta: string; respuesta: string }[];
  mostrarCatalogo?: boolean;
}

export const TEXTOS_CAFE = {
  inicio: "Inicio",
  explorar: "Conoce nuestro café",
  bajada: "Del origen a tu taza: compara perfiles, prepara tu compra y encuentra el café para tu equipo.",
  relacionados: "Sigue explorando",
  preguntas: "Preguntas frecuentes",
  catalogo: "Compara los cafés del catálogo",
  cotizar: "Consultar por WhatsApp",
  verCatalogo: "Elegir presentación, molienda y tueste",
  contacto: "¿Preparamos tu pedido?",
  contactoDetalle: "Confirma disponibilidad, cantidad y entrega directamente con nosotros antes de cerrar tu compra.",
  portada: "Café de altura en Pachuca, Hidalgo",
} as const;

export const PAGINAS_CAFE = {
  altura: {
    ruta: "/cafe-de-altura/",
    etiqueta: "Café de altura",
    titulo: "Café de altura de la Sierra Hidalguense en Pachuca",
    descripcion: "Conoce el café de altura de Cafeto Sierra Alta en Pachuca: procesos lavado, honey y natural, en grano o molido. Compara perfiles y elige tu café.",
    introduccion: "Nuestro café viene de la Sierra Hidalguense. En Cafeto Sierra Alta puedes comparar tres procesos —lavado, honey y natural— y elegir el perfil que prefieres para tu taza, tu equipo o tus reuniones.",
    foto: "/images/slide-01.webp",
    alt: "Cultivo de café en la Sierra Hidalguense",
    bloques: [
      {
        titulo: "El origen también se reconoce en la taza",
        parrafos: [
          "En la sierra, el clima fresco acompaña una maduración lenta del fruto. Después de la cosecha, el proceso y el tueste también influyen en el sabor: compartir un origen no significa que todos los cafés sepan igual.",
          "Por eso nuestro catálogo describe el perfil de cada proceso. Puedes empezar por las notas que más disfrutas, comparar y ajustar tu elección en el siguiente pedido.",
        ],
      },
      {
        titulo: "Tres procesos para comparar",
        parrafos: ["El lavado tiene un perfil cítrico, floral y limpio; el honey, notas de caramelo y fruta madura; el natural, frutos rojos y un final largo. Son perfiles del catálogo, no sabores añadidos."],
        puntos: [
          "Lavado: si buscas una taza limpia y delicada.",
          "Honey: si prefieres un perfil dulce y redondo.",
          "Natural: si disfrutas una taza intensa y afrutada.",
        ],
      },
      {
        titulo: "Del grano a la preparación",
        parrafos: [
          "El proceso es una elección; la molienda y el tueste son otras. Si tienes molino, puedes pedir grano entero. Si necesitas café molido, cuéntanos qué cafetera usas para orientar tu pedido.",
          "Consulta las presentaciones y precios vigentes en las tarjetas del catálogo. La cantidad disponible y las condiciones de entrega en Pachuca se confirman al cotizar.",
        ],
      },
    ],
    preguntas: [
      { pregunta: "¿El café honey contiene miel?", respuesta: "El nombre honey identifica un proceso del café. No significa que el producto lleve miel añadida." },
      { pregunta: "¿Puedo pedir café en grano o molido?", respuesta: "Sí. Los tres procesos del catálogo permiten elegir grano entero o molido, además del nivel de tueste. Indica tu método de preparación al cotizar." },
    ],
    mostrarCatalogo: true,
  },
  mayoreo: {
    ruta: "/cafe-por-mayoreo/",
    etiqueta: "Compras para tu organización",
    titulo: "Café por mayoreo para empresas y oficinas en Pachuca",
    descripcion: "Organiza tu compra de café por mayoreo en Pachuca. Elige proceso, molienda y tueste para oficinas, empresas y escuelas; solicita una cotización por volumen.",
    introduccion: "Una compra de café para el equipo empieza por saber cuánto se consume y cómo se prepara. Te ayudamos a reunir esos datos y cotizar el café de altura de Cafeto Sierra Alta para tu organización.",
    foto: "/images/bolsas-cafe-renew.webp",
    alt: "Bolsas de café de Cafeto Sierra Alta para organizar un pedido",
    bloques: [
      {
        titulo: "Calcula tu consumo antes de comprar",
        parrafos: [
          "Anota cuántas personas toman café, cuántas preparaciones hacen durante la jornada y cuántos días quieres cubrir. Una semana de consumo real ayuda más que calcular solo por el tamaño del equipo.",
          "Si ya preparan café, registra cuántos gramos usan y cuántas bolsas terminan por semana. Si van a empezar, comparte el número de tazas previsto y la cafetera que usarán; el rendimiento depende de la receta y del tamaño de cada taza.",
        ],
      },
      {
        titulo: "Qué incluir en tu solicitud de cotización",
        parrafos: ["Con estos datos podemos revisar el pedido sin adivinar las necesidades de tu oficina, empresa o escuela:"],
        puntos: [
          "Cantidad de café o consumo estimado y periodo que quieres cubrir.",
          "Proceso preferido: lavado, honey o natural; también puedes pedir orientación.",
          "Grano entero o molido, cafetera utilizada y tueste preferido.",
          "Ubicación y fecha en que necesitas recibir el pedido.",
          "Datos de facturación, si necesitas factura.",
        ],
      },
      {
        titulo: "Precio por volumen y entrega: confírmalos al cotizar",
        parrafos: [
          "El catálogo muestra los precios de las presentaciones disponibles. La cotización por volumen se confirma según tu pedido; no hay una tabla pública de descuentos ni un mínimo de compra confirmado.",
          "Estamos en Pachuca de Soto, Hidalgo. Comparte tu ubicación para confirmar cobertura, costo y fecha de entrega. La facturación electrónica está disponible; solicita los requisitos al hacer tu pedido.",
        ],
      },
    ],
    preguntas: [
      { pregunta: "¿Cuál es el pedido mínimo de mayoreo?", respuesta: "El mínimo se confirma directamente al cotizar. Indica la cantidad que necesitas y el periodo de consumo para revisar tu solicitud." },
      { pregunta: "¿Tienen entregas en mi zona?", respuesta: "Comparte tu ubicación y fecha deseada por WhatsApp. La cobertura, el costo y la fecha se confirman antes de cerrar el pedido." },
    ],
  },
  guia: {
    ruta: "/como-elegir-cafe/",
    etiqueta: "Guía de compra",
    titulo: "Cómo elegir café: proceso, tueste y molienda",
    descripcion: "Aprende a elegir entre café lavado, honey y natural, grano o molido y niveles de tueste. Una guía práctica para comprar café para casa o la oficina.",
    introduccion: "Para elegir café conviene separar tres decisiones: qué perfil te gusta, cómo lo vas a preparar y cuánto vas a consumir. Esta guía te ayuda a traducirlas en un pedido concreto.",
    foto: "/images/molienda-cafe.webp",
    alt: "Molino y preparación de café",
    bloques: [
      {
        titulo: "1. Empieza por el perfil de sabor",
        parrafos: [
          "El proceso y el tueste no son lo mismo. Lavado, honey y natural describen formas de procesar el fruto después de la cosecha; claro, medio y oscuro son opciones de tueste.",
          "En nuestro catálogo, el lavado destaca por sus notas cítricas y florales; el honey, por caramelo y fruta madura; el natural, por frutos rojos y un final largo. Usa esas descripciones como punto de partida y compara cuál disfrutas más.",
        ],
      },
      {
        titulo: "2. Elige entre grano entero y café molido",
        parrafos: [
          "El grano entero te permite moler la cantidad que vas a preparar y ajustar la molienda con tu equipo. Si no tienes molino, el café molido es una alternativa práctica: indica la cafetera que utilizas al hacer tu pedido.",
          "Una prensa francesa, una cafetera de filtro y una máquina de espresso no preparan el café de la misma manera. No basta con decir «molido»: explicar tu método ayuda a elegir una molienda adecuada y evita tratar todos los equipos como si fueran iguales.",
        ],
      },
      {
        titulo: "3. Considera el tueste y la cantidad",
        parrafos: [
          "El catálogo permite elegir tueste claro, medio u oscuro. Si todavía no tienes una preferencia, comenta cómo tomas el café —solo o con leche— y qué perfil buscas. Un tueste más oscuro no es, por sí solo, una garantía de mayor calidad.",
          "Compra pensando en tu ritmo de consumo. Consulta los formatos del catálogo y guarda el café bien cerrado, protegido de humedad, luz y calor. Para una oficina, medir el consumo semanal te ayuda a planear el siguiente pedido.",
        ],
      },
      {
        titulo: "Tu selección, lista para cotizar",
        parrafos: ["Entra al catálogo y selecciona proceso, presentación, molienda y tueste. El botón de cotización prepara un mensaje con lo que elegiste; puedes revisarlo antes de enviarlo por WhatsApp. Si aún tienes dudas, dinos qué cafetera usas y qué sabores prefieres."],
      },
    ],
    preguntas: [
      { pregunta: "¿Qué diferencia hay entre proceso y tueste?", respuesta: "El proceso corresponde al tratamiento del fruto después de la cosecha. El tueste transforma el grano mediante calor. Puedes elegir ambos por separado en el catálogo." },
      { pregunta: "¿Cuál de los tres cafés es mejor?", respuesta: "Depende del perfil que disfrutes y de cómo lo prepares. Compara las notas descritas en el catálogo y elige según tu gusto; no hay un proceso que sea mejor para todas las personas." },
    ],
  },
} satisfies Record<string, PaginaCafeData>;
