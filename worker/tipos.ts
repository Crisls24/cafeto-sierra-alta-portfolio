/**
 * Tipos compartidos del Worker.
 *
 * `Env` refleja los bindings declarados en `wrangler.jsonc`. Si un binding
 * se renombra allí y no aquí (o al contrario), el tipo deja de compilar: es
 * la misma regla del resto del proyecto, un error de nombre debe romper la
 * compilación y no la pantalla.
 */
export interface Env {
  /** Base D1 del sistema de reseñas. */
  DB: D1Database;
  /** Assets estáticos del export de Next. */
  ASSETS: Fetcher;
  /** Dominio del equipo de Cloudflare Access, sin protocolo. */
  ACCESS_TEAM_DOMAIN: string;
  /** Audiencia (Application Audience) de la Access app del panel. */
  ACCESS_AUD: string;
  /** TEMPORAL: bandera de prueba local para saltar Access en `wrangler dev`. */
  ACCESS_DEV_BYPASS?: string;
  /** Caducidad de las invitaciones, en días. */
  TOKEN_TTL_DIAS: string;
  /** Secreto de Turnstile. Opcional hasta que se configure el captcha. */
  TURNSTILE_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_BUSINESS_PROFILE_URL?: string;
  /** Secreto exclusivo del Worker; nunca se entrega al navegador. */
  GOOGLE_PLACES_API_KEY?: string;
  GOOGLE_PLACE_ID?: string;
}

export type EstadoResena = "pendiente" | "aprobada" | "rechazada";

/** Canal de origen de un pedido. Debe coincidir con el CHECK de la migración. */
export type CanalPedido =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "presencial"
  | "correo"
  | "otro";

export type EstadoEntrega = "por_preparar" | "listo" | "entregado" | "cancelado";

export type EstadoPago = "pendiente" | "pagado";

export type MoliendaVenta = "grano-entero" | "molido";

export type EstadoResenaVenta =
  | "sin_solicitar"
  | "activa"
  | "pendiente"
  | "publicada"
  | "rechazada"
  | "revocada"
  | "expirada";

/** Reseña pública: solo los campos que pueden salir del servidor. */
export interface ResenaPublica {
  id: string;
  calificacion: number;
  comentario: string;
  nombrePublico: string;
  verificada: boolean;
  creadaEn: string;
}

export interface ResumenResenas {
  promedio: number;
  total: number;
}

export interface RespuestaPublica {
  resenas: ResenaPublica[];
  resumen: ResumenResenas;
}

/**
 * Fila tal como la devuelve D1 en la consulta de aprobadas.
 * Va en `snake_case` porque los alias de la consulta SQL son los que manda
 * el driver; la traducción a la forma pública ocurre en un solo lugar.
 */
export interface FilaResenaAprobada {
  verificada: number;
  id: string;
  calificacion: number;
  comentario: string;
  nombre_publico: string;
  creada_en: string;
}

/* --- Adelante: admin (solo detrás del guardián de Access). --- */

/** Reseña completa para el panel de moderación. */
export interface ResenaAdmin {
  identificacion: "invitado" | "google";
  verificada: boolean;
  publicadaEn: string | null;
  consentimientoVersion: string | null;
  consentimientoEn: string | null;
  id: string;
  calificacion: number;
  comentario: string;
  nombrePublico: string;
  estado: EstadoResena;
  motivoRechazo: string | null;
  creadaEn: string;
  moderadaEn: string | null;
  moderadoPor: string | null;
  /** Canal del pedido que originó la reseña; solo se muestra en el panel interno. */
  canal: string;
  pedidoId: string;
  /** Contexto legible de la venta de origen; nunca se expone al público. */
  folio: number | null;
  vendidoEn: string;
  itemsResumen: string;
  estadoEntrega: EstadoEntrega;
}

export interface ResumenAdmin {
  pendientes: number;
  aprobadas: number;
  rechazadas: number;
}

/** Fila de la consulta admin (join con pedidos). Nunca sale al público. */
export interface FilaResenaAdmin {
  identificacion: "invitado" | "google";
  verificada: number;
  publicada_en: string | null;
  consentimiento_version: string | null;
  consentimiento_en: string | null;
  id: string;
  calificacion: number;
  comentario: string;
  nombre_publico: string;
  estado: string;
  motivo_rechazo: string | null;
  creada_en: string;
  moderada_en: string | null;
  moderado_por: string | null;
  canal: string;
  pedido_id: string;
  folio: number | null;
  vendido_en: string | null;
  estado_entrega: string;
}

/* --- Pedidos e invitaciones (solo detrás del guardián de Access). --- */

/**
 * Estado de la invitación de un pedido, tal como lo ve el panel.
 *
 * No es una columna: se deriva de `usada_en` / `revocada_en` / `expira_en`,
 * en ese orden de prioridad. Un pedido sin fila de invitación no tiene
 * estado propio; el panel muestra "sin invitación".
 */
export type EstadoInvitacion =
  | "activa"
  | "usada"
  | "revocada"
  | "expirada";

/** Fila cruda de la invitación unida al pedido, tal como la devuelve D1. */
export interface FilaInvitacionAdmin {
  id: string;
  usada_en: string | null;
  revocada_en: string | null;
  expira_en: string;
  creada_en: string;
}

/**
 * Pedido tal como lo ve el panel. Sin datos personales: el esquema no los
 * guarda a propósito. `invitacion` es la invitación vigente más reciente,
 * si existe; `resenaEstado` permite pintar la columna "Reseña" de la tabla.
 */
export interface PedidoAdmin {
  id: string;
  canal: string;
  referencia: string | null;
  entregado: boolean;
  entregadoEn: string | null;
  creadoEn: string;
  invitacion: {
    id: string;
    estado: EstadoInvitacion;
    creadaEn: string;
    expiraEn: string;
  } | null;
  resenaEstado: EstadoResena | null;
}

/** Fila de `SELECT ... FROM pedidos` con los agregados de invitación/reseña. */
export interface FilaPedidoAdmin {
  id: string;
  canal: string;
  referencia: string | null;
  entregado: number;
  entregado_en: string | null;
  creado_en: string;
  invitacion_id: string | null;
  invitacion_usada_en: string | null;
  invitacion_revocada_en: string | null;
  invitacion_expira_en: string | null;
  invitacion_creada_en: string | null;
  resena_estado: string | null;
}

/**
 * Resultado de generar una invitación. El token solo viaja aquí, una vez:
 * en D1 únicamente queda su hash, así que pierde el enlace quien no lo copie
 * en este momento.
 */
export interface InvitacionGenerada {
  id: string;
  pedidoId: string;
  token: string;
  expiraEn: string;
}

/* --- Administración comercial --- */

export interface PresentacionAdmin {
  id: string;
  nombre: string;
  precioCentavos: number | null;
  costoCentavos: number | null;
  activo: boolean;
  orden: number;
}

export interface ProductoAdmin {
  id: string;
  nombre: string;
  categoria: string;
  activo: boolean;
  orden: number;
  presentaciones: PresentacionAdmin[];
}

export interface ItemVentaAdmin {
  id: string;
  productoId: string | null;
  presentacionId: string | null;
  nombreProducto: string;
  nombrePresentacion: string;
  molienda: MoliendaVenta | null;
  cantidad: number;
  precioUnitarioCentavos: number | null;
  costoUnitarioCentavos: number | null;
  subtotalCentavos: number | null;
  costoSubtotalCentavos: number | null;
}

export interface VentaAdmin {
  porPaqueteria: boolean;
  ventaVendedora: boolean;
  fechaAproximada: boolean;
  totalReportadoCentavos: number | null;
  envioCentavos: number;
  id: string;
  folio: number | null;
  canal: CanalPedido;
  referencia: string | null;
  vendidoEn: string;
  estadoEntrega: EstadoEntrega;
  entregadoEn: string | null;
  estadoPago: EstadoPago;
  pagadoEn: string | null;
  canceladoEn: string | null;
  creadoEn: string;
  actualizadoEn: string;
  items: ItemVentaAdmin[];
  itemsResumen: string;
  totalCentavos: number;
  costoEstimadoCentavos: number;
  costosCompletos: boolean;
  legado: boolean;
  invitacion: {
    id: string;
    estado: EstadoInvitacion;
    creadaEn: string;
    expiraEn: string;
  } | null;
  resenaEstado: EstadoResenaVenta;
}

export interface ResumenInicio {
  ventasPorDia: { fecha: string; totalCentavos: number }[];
  cobrosPendientes: number;
  porEntregar: number;
  entregados: number;
  periodo: { desde: string; hasta: string };
  cantidadVentas: number;
  ventasCentavos: number;
  cobradoCentavos: number;
  porCobrarCentavos: number;
  costoEstimadoCentavos: number;
  gananciaEstimadaCentavos: number;
  gastosMensuales: { concepto: string; tipo: "equipo" | "operativo"; importeCentavos: number | null }[] | null;
  ventasConCosto: number;
  ventasSinCosto: number;
  ventasLegado: number;
  resenasPendientes: number;
  recientes: VentaAdmin[];
}

export interface FilaVentaAdmin {
  costo_envio_centavos: number | null;
  por_paqueteria: number;
  venta_vendedora: number;
  fecha_aproximada: number;
  total_reportado_centavos: number | null;
  envio_centavos: number;
  id: string;
  folio: number | null;
  canal: string;
  referencia: string | null;
  vendido_en: string | null;
  estado_entrega: string;
  entregado_en: string | null;
  estado_pago: string;
  pagado_en: string | null;
  cancelado_en: string | null;
  creado_en: string;
  actualizado_en: string;
  invitacion_id: string | null;
  invitacion_usada_en: string | null;
  invitacion_revocada_en: string | null;
  invitacion_expira_en: string | null;
  invitacion_creada_en: string | null;
  resena_estado: string | null;
}

export interface FilaItemVenta {
  id: string;
  pedido_id: string;
  producto_id: string | null;
  presentacion_id: string | null;
  nombre_producto: string;
  nombre_presentacion: string;
  molienda: string | null;
  cantidad: number;
  precio_unitario_centavos: number | null;
  costo_unitario_centavos: number | null;
  orden: number;
}
