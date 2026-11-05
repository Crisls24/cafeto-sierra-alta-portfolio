// Usamos null explícitamente para marcar que sabemos que falta el dato.
// No usamos undefined porque undefined significa que el campo no existe.
export const PENDIENTE = null;

export type CategoriaProducto = "cafe" | "queso" | "miel";

/* --- Guía de preparación del café -------------------------------------
   No cuelgan de Producto porque describen el café entero y no una sola
   bolsa del catálogo.

   Los tres procesos (lavado, honey, natural) no viven aquí: son
   productos del catálogo, cada uno con su descripción. El panel de
   preparación que se abre al presionar uno se arma con lo de abajo. */

export type NivelMolienda = "grano-entero" | "fino" | "medio" | "grueso";
export type NivelTueste = "claro" | "medio" | "oscuro";

export interface Molienda {
  id: NivelMolienda;
  nombre: string;
  textura: string;
  /** Recomendación de la marca. PENDIENTE cuando el texto no la trae. */
  idealPara: string | typeof PENDIENTE;
  /** Nota de preparación asociada a esa molienda. */
  nota: string | typeof PENDIENTE;
  orden: number;
}

export interface Tueste {
  id: NivelTueste;
  nombre: string;
  descripcion: string;
  /** Métodos para los que la marca recomienda este tueste. */
  idealPara: string | typeof PENDIENTE;
  orden: number;
}

export interface MetodoPreparacion {
  id: string;
  nombre: string;
  utensilios: string;
  molienda: NivelMolienda;
  /** Café por litro o por taza. PENDIENTE cuando el texto no lo declara. */
  proporcion: string | typeof PENDIENTE;
  preparacion: string;
  /** Con la presentación más pequeña del café. */
  rinde: string;
  /**
   * Las cifras de rinde llegaron de la marca, pero dependen del molino y
   * de la práctica. Mientras no se confirmen con una prueba real se
   * muestran como orientativas (docs, sec:contenido).
   */
  rindeVerificado: boolean;
  orden: number;
}

export interface NotaGuia {
  titulo: string;
  texto: string;
  orden: number;
}

export interface GuiaCafe {
  notaTaza: string;
  moliendas: Molienda[];
  tuestes: Tueste[];
  metodos: MetodoPreparacion[];
  notas: NotaGuia[];
}

export interface Presentacion {
  nombre: string;
  precio: number;
  precioPendiente: boolean;
  orden: number;
  /** Foto del empaque para esta presentación, si está disponible. */
  foto?: string;
  /**
   * Cuántas tazas rinde el formato, orientativo. Solo lo trae el café: es la
   * cifra que convierte un precio por bolsa en un costo por taza para quien
   * decide la compra, y por eso se muestra junto al selector de presentación.
   */
  rendimiento?: string;
}

/**
 * Cómo se puede pedir el café molido.
 *
 * El catálogo no ofrece los cuatro niveles de molienda de la guía de
 * preparación: esos son niveles de recomendación para un método, no formatos
 * que el cliente elige al comprar. Lo que el comprador configura en la tarjeta
 * es si lo quiere entero o molido, que es una decisión de formato, no de
 * técnica. Son dos vocabularios distintos y por eso viven en tipos distintos.
 */
export type MoliendaCafe = "grano-entero" | "molido";
export type TuesteCafe = "claro" | "medio" | "oscuro";

export interface OpcionTuesteCafe {
  id: TuesteCafe;
  nombre: string;
  fotoGrano: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaProducto;
  descripcionCorta: string;
  /** Frase corta de notas de sabor, 3 a 5 palabras. Va bajo el título. */
  perfil: string | typeof PENDIENTE;
  foto: string | typeof PENDIENTE;
  /** Foto del grano que acompaña al empaque en el catálogo, si está disponible. */
  fotoGrano?: string;
  /** Aclaración visible del tueste cuando se muestra la foto del grano. */
  etiquetaGrano?: string;
  /** Tuestes que el comprador puede elegir para esta variedad. */
  tuestes?: OpcionTuesteCafe[];
  orden: number;
  activo: boolean;
  presentaciones: Presentacion[];
  /**
   * Solo el café lo tiene. Vacío o ausente significa que la marca todavía no
   * confirmó si se vende molido, y la tarjeta esconde el control entero: es
   * preferible no ofrecer una molienda que la marca no maneja a prometer una
   * que no puede cumplir.
   */
  moliendas?: MoliendaCafe[];
}

/**
 * Una situación de uso, no un segmento de mercado.
 *
 * La sección 04 no clasifica al comprador por tamaño, rubro ni actividad: no
 * inventa oficinas ni restaurantes que la marca no ha declarado. Clasifica por
 * **el momento** en que se sirve el producto ---la jornada, la visita, la
 * reunión---, porque eso es lo que el visitante ya reconoce de su propia
 * operación y lo que la marca puede resolver con lo que tiene.
 *
 * Cada bloque dice el **pilar estratégico** que resuelve, no una frase de
 * hospitalidad: el comprador de Recursos Humanos o Compras tiene que leer en
 * una línea qué gana su operación. Por eso el titular nombra el beneficio
 * (desempeño, anfitrionía, catering) y la descripción lo aterriza. Nombrar el
 * café, el queso o la miel ya no es repetir el catálogo: es la prueba de que el
 * beneficio existe. Tampoco hay botón por bloque: quien quiera escribir lo hace
 * desde el catálogo o el botón flotante.
 */
export interface Situacion {
  id: string;
  /** Dos dígitos con los que se imprime el bloque: `01`, `02`, `03`. */
  numero: string;
  /** Encabezado de segmento ("Para tu equipo"). Reservado para el bloque. */
  titulo: string;
  /** Pilar estratégico: la frase principal que se imprime. */
  bajada: string;
  /** Aterriza el pilar en un beneficio concreto. */
  descripcion?: string;
  /** PENDIENTE mientras la marca no entregue la fotografía del momento. */
  foto: string | typeof PENDIENTE;
  /** Describe la escena. Se escribe aunque la foto no exista todavía. */
  alt: string;
  orden: number;
}

/**
 * Un pilar del compromiso social.
 *
 * No lleva cifra ni porcentaje a propósito: la marca todavía no ha
 * entregado datos de impacto y la sección comunica el compromiso sin
 * inventarlos. El `id` sirve de ancla estable para mapear el icono lineal
 * en el componente, sin meter JSX en la capa de datos.
 */
export interface PilarCompromiso {
  id: string;
  titulo: string;
  descripcion: string;
}

/**
 * El bloque editorial de compromiso social y origen.
 *
 * No es un producto ni una situación de uso: es la pieza que cierra el
 * recorrido con lo que hay detrás del catálogo. Vive en `data/` para que
 * el texto y la fotografía se cambien sin abrir el componente.
 */
export interface CompromisoSocial {
  /** Titular editorial. Puede traer un salto de línea y este se respeta. */
  titulo: string;
  cuerpo: string;
  /** Tres pilares del compromiso, sin cifras inventadas. */
  pilares: PilarCompromiso[];
  /** foto panorámica de origen. PENDIENTE mientras no exista. */
  foto: string | typeof PENDIENTE;
  /** Describe la escena. Se escribe aunque la foto no exista todavía. */
  alt: string;
}

export interface Zona {
  nombre: string;
  tipo: string;
  texto: string;
  confirmada: boolean;
}

/**
 * Un día de la semana con su horario.
 *
 * `dia` usa los nombres en español tal como se escriben en schema.org
 * (Monday…Sunday en inglés aquí se traducen al generar el JSON-LD).
 * `abre` y `cierra` van en formato 24 h `HH:MM`; un día cerrado deja
 * ambos campos vacíos y marca `cerrado: true`.
 */
export interface HorarioDia {
  dia:
    | "lunes"
    | "martes"
    | "miércoles"
    | "jueves"
    | "viernes"
    | "sábado"
    | "domingo";
  /** Apertura en formato `HH:MM`. Vacío si el día está cerrado. */
  abre: string;
  /** Cierre en formato `HH:MM`. Vacío si el día está cerrado. */
  cierra: string;
  cerrado?: boolean;
}

/**
 * Dirección visible del negocio para datos estructurados y el pie.
 *
 * Solo lo que se muestra públicamente (ciudad, estado, C.P., país), que
 * es además lo que aparece en la ficha de Google Business. No sustituye
 * a `domicilioLegal`, que es el domicilio fiscal completo.
 */
export interface DireccionVisible {
  ciudad: string;
  estado: string;
  cp: string;
  /** Código de país ISO 3166-1 alfa-2. */
  pais: string;
}

export interface ConfigEmpresa {
  marca: string;
  telefono: string | typeof PENDIENTE;
  whatsapp: string | typeof PENDIENTE;
  correoNegocios: string | typeof PENDIENTE;
  razonSocial: string | typeof PENDIENTE;
  rfc: string | typeof PENDIENTE;
  /** Domicilio fiscal completo. Solo lo muestra el Aviso de Privacidad. */
  domicilioLegal: string | typeof PENDIENTE;
  /** Ubicación general y breve (ciudad, estado, C.P.) para el pie. */
  ubicacion: string | typeof PENDIENTE;
  /** Dirección del negocio en partes, para JSON-LD y el pie. */
  direccion: DireccionVisible | typeof PENDIENTE;
  horarios: HorarioDia[] | typeof PENDIENTE;
  zonas: Zona[];
  pedidoMinimo: string | typeof PENDIENTE;
  barraConfianza: string[];
}

/**
 * Un bloque de un documento legal (Aviso de Privacidad o Términos).
 *
 * Es prosa, no diseño: cada bloque es un apartado con su título, uno o más
 * párrafos y, cuando aplica, una lista. El componente que lo pinta no decide
 * nada del contenido, solo lo recorre.
 */
export interface BloqueLegal {
  id: string;
  titulo: string;
  parrafos: string[];
  lista?: string[];
  enlaces?: { texto: string; url: string }[];
}

/**
 * Un documento legal completo, listo para pintarse.
 *
 * `vigencia` es la fecha visible de última actualización; `resumen` es la
 * entradilla. Vive en `data/` porque es contenido, no presentación.
 */
export interface DocumentoLegal {
  titulo: string;
  resumen: string;
  vigencia: string;
  secciones: BloqueLegal[];
}
