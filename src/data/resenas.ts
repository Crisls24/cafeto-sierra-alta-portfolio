/**
 * Contrato público del sistema de reseñas y textos de la sección.
 *
 * Los campos de una reseña pública vienen del Worker (`worker/tipos.ts`) y
 * de `GET /api/resenas`. Aquí viven los nombres exactos para que un error
 * de nombre sea un fallo de compilación y no un hueco en pantalla; la forma
 * se valida además en runtime al leer el API (ver `src/lib/resenas.ts`).
 *
 * El texto de la sección no se escribe dentro del componente: vive aquí, en
 * la capa de datos, como en el resto del sitio.
 */

/** La escala de una reseña es siempre de 1 a 5, igual que en el Worker. */
export const MAX_CALIFICACION = 5;

export const TEXTOS_RESENAS = {
  titulo: "Historias de quienes nos eligen",
  cargando: "Cargando reseñas…",
  verificada: "Compra verificada",
  deCinco: `de ${MAX_CALIFICACION}`,
  resumenCantidadSingular: "reseña en Cafeto",
  resumenCantidadPlural: "reseñas en Cafeto",
  vacioMensaje:
    "Próximamente compartiremos experiencias de nuestros clientes.",
} as const;

/* --- Panel de moderación (interno, protegido por Access). --- */

/** Los tres estados en el orden en que se muestran las pestañas. */
export const ESTADOS_PANEL = ["pendiente", "aprobada", "rechazada"] as const;
export type EstadoPanel = (typeof ESTADOS_PANEL)[number];

/** Nombre de cada estado tal como se lee del Worker (`worker/tipos.ts`). */
export const NOMBRES_ESTADO_PANEL: Record<EstadoPanel, string> = {
  pendiente: "Pendiente",
  aprobada: "Publicada",
  rechazada: "Oculta",
};

/**
 * De estado a la llave del resumen del Worker (`ResumenAdmin`), que cuenta
 * con plural: `{ pendientes, aprobadas, rechazadas }`.
 */
export const CLAVE_RESUMEN_POR_ESTADO: Record<
  EstadoPanel,
  "pendientes" | "aprobadas" | "rechazadas"
> = {
  pendiente: "pendientes",
  aprobada: "aprobadas",
  rechazada: "rechazadas",
};

/** Canal del pedido a una etiqueta legible para el panel interno. */
export const ETIQUETAS_CANAL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  presencial: "Presencial",
  correo: "Correo",
  otro: "Otro",
};

/** Canales que se pueden elegir al registrar un pedido (CHECK de la migración). */
export const CANALES_PEDIDO = [
  "whatsapp",
  "instagram",
  "facebook",
  "presencial",
  "correo",
  "otro",
] as const;
export type CanalPedido = (typeof CANALES_PEDIDO)[number];

/** Nombre de cada estado de invitación derivado por el Worker. */
export const ETIQUETAS_INVITACION: Record<
  "activa" | "usada" | "revocada" | "expirada",
  string
> = {
  activa: "Invitación activa",
  usada: "Invitación usada",
  revocada: "Invitación revocada",
  expirada: "Invitación expirada",
};

export const TEXTOS_PANEL = {
  titulo: "Reseñas",
  subtitulo:
    "Modera las reseñas que llegan de ventas entregadas. Los pedidos ya no se gestionan desde esta pantalla.",
  volverAlSitio: "Volver al sitio",
  cargando: "Cargando reseñas…",
  errorRed: "No pudimos conectar con el panel. Inténtalo de nuevo.",
  vacia: {
    pendiente: "No hay reseñas pendientes de revisar.",
    aprobada: "Todavía no hay reseñas publicadas.",
    rechazada: "No hay reseñas ocultas.",
  },
  pestañas: {
    aria: "Estados de reseña",
    contador: "en esta lista",
    pendiente: "Pendientes",
    aprobada: "Publicadas",
    rechazada: "Ocultas",
  },
  resena: {
    estrellaDe: "de 5 estrellas",
    publicadaEn: "Publicada el",
    motivo: "Motivo interno",
  },
  acciones: {
    publicar: "Publicar",
    rechazar: "Ocultar",
    ocultar: "Ocultar del sitio",
    confirmarRechazo: "Confirmar ocultación",
    cancelar: "Cancelar",
    reintentar: "Reintentar",
    volver: "Volver",
  },
  rechazo: {
    titulo: "Ocultar reseña",
    subtitulo: "Indica un motivo breve para dejarlo registrado.",
    etiqueta: "Motivo",
  },
  errores: {
    lista: "No pudimos cargar las reseñas. Inténtalo de nuevo.",
    accion: "No se pudo completar la acción. Inténtalo de nuevo.",
    motivoRequerido: "Indica un motivo interno: spam, contenido ofensivo o datos personales. Una opinión negativa no es motivo para ocultar.",
    noAutorizado:
      "Este panel requiere acceso con la cuenta de Cafeto Sierra Alta (Cloudflare Access).",
  },
  avisos: {
    publicada: "Reseña publicada.",
    rechazada: "Reseña oculta.",
    oculta: "Reseña oculta del sitio.",
  },
} as const;

/* --- Formulario público de reseña (/resena/<token>). --- */

/** Motivos por los que una invitación no sirve, tal como los manda el Worker
 * (`worker/lib/db.ts`, `validarInvitacion`). */
export const MOTIVOS_INVITACION_INVALIDA = {
  no_existe: "Este enlace no corresponde a una invitación válida.",
  revocada: "Esta invitación fue revocada. Pide a Cafeto un enlace nuevo.",
  usada: "Ya recibimos una reseña con esta invitación.",
  no_entregado: "La compra dejó de ser elegible para esta invitación.",
  expirada: "Este enlace ya venció. Pide a Cafeto un enlace nuevo.",
  generico: "Este enlace no está disponible.",
} as const;

export const TEXTOS_FORMULARIO_RESENA = {
  titulo: "Tu reseña en Cafeto",
  subtitulo: "Cuéntanos cómo fue tu experiencia con Cafeto Sierra Alta.",
  marcaCafeto: "Cafeto", marcaSierra: "Sierra Alta",
  volver: "Inicio", inicioAria: "Cafeto Sierra Alta, inicio",
  foto: "/images/remlazo-portada.webp",
  bienvenida: "¿Cómo fue tu experiencia?",
  bienvenidaDetalle: "Gracias por elegir Cafeto.",
  recomendado: "Recomendado",
  googleAyuda: "Tu nombre se completa automáticamente.",
  sinCuenta: "Continuar sin cuenta",
  separador: "o",
  destino: "Tu reseña se comparte en Cafeto.",
  formularioTitulo: "Tu reseña",
  conGoogle: "Con Google", invitado: "Sin cuenta", cambiar: "Cambiar",
  privacidad: "Privacidad", terminos: "Términos",
  cargando: "Abriendo tu invitación…",
  nombreLabel: "Nombre público",
  nombrePlaceholder: "Tu nombre o tus iniciales",
  calificacionLabel: "Tu calificación",
  seleccion: ["Muy mala", "Mala", "Regular", "Buena", "Excelente"] as const,
  estrellas: ["1 estrella", "2 estrellas", "3 estrellas", "4 estrellas", "5 estrellas"] as const,
  comentarioLabel: "Tu experiencia",
  comentarioPlaceholder: "¿Qué te gustó? ¿Qué podríamos mejorar?",
  comentarioLimite: "caracteres",
  enviar: "Enviar reseña", enviando: "Enviando…",
  errorNombre: "Escribe al menos 2 caracteres.",
  errorCalificacion: "Elige una calificación.",
  errorComentario: "Escribe al menos 10 caracteres.",
  errorEnvio: "No pudimos enviar tu reseña. Inténtalo de nuevo.",
  graciasTitulo: "Gracias por tu reseña.",
  graciasMensaje: "La recibimos. La revisaremos antes de publicarla.",
  volverAlSitio: "Volver a Cafeto",
  invalidoTitulo: "Este enlace no está disponible",
} as const;

/* --- Pedidos e invitaciones (panel). --- */export const TEXTOS_PEDIDOS = {
  seccion: "Pedidos",
  subtitulo:
    "Registra el pedido, márcalo como entregado y genera el enlace de reseña. El enlace se muestra una sola vez.",
  nuevoPedido: "Nuevo pedido",
  cargando: "Cargando pedidos…",
  vacio: "Todavía no hay pedidos registrados.",
  reintentar: "Reintentar",
  errorRed: "No pudimos cargar los pedidos. Inténtalo de nuevo.",
  columnas: {
    pedido: "Pedido",
    canal: "Canal",
    creado: "Registrado",
    estado: "Estado",
    resena: "Reseña",
    accion: "Acción",
  },
  entregado: "Entregado",
  noEntregado: "No entregado",
  // Estados de la columna Reseña (derivan de `resenaEstado`).
  sinResena: "Sin reseña",
  resenaPendiente: "Pendiente",
  resenaPublicada: "Publicada",
  resenaRechazada: "Rechazada",
  // Acciones.
  marcarEntregado: "Marcar entregado",
  generarEnlace: "Generar enlace",
  copiarEnlace: "Copiar enlace",
  abrirEnlace: "Abrir enlace",
  revocarYGenerar: "Revocar y generar nuevo",
  copiado: "Enlace copiado.",
  copiadoError: "No se pudo copiar. Selecciona el enlace y cópialo manualmente.",
  // Alta de pedido.
  formTitulo: "Registrar pedido",
  formCanal: "Canal",
  formReferencia: "Referencia interna (opcional)",
  formReferenciaPlaceholder: "Ej.: folio, lote, nota interna.",
  formCrear: "Registrar",
  formCancelar: "Cancelar",
  avisoCreado: "Pedido registrado.",
  avisoEntregado: "Pedido marcado como entregado.",
  avisoInvitacion: "Invitación generada. Copia el enlace ahora: no se podrá recuperar.",
  avisoRevocado: "Invitación revocada. Genera un enlace nuevo.",
  avisoError: "No se pudo completar la acción. Recarga el panel.",
  // Mensaje de la invitación recién generada.
  enlaceUnaVez:
    "Este enlace se muestra una sola vez. Cópialo antes de cerrar; si lo pierdes, revócalo y genera otro.",
  expira: "Vence",
  invitacionActivaNota:
    "Ya existe una invitación activa para este pedido. Por seguridad no se puede recuperar el enlace; revócala para generar uno nuevo.",
} as const;
export const CONSENTIMIENTO_RESENA_VERSION = "2026-10-30" as const;
export const TEXTOS_IDENTIDAD_RESENA = {
  consentimiento: "Acepto publicar mi nombre y reseña según el",
  privacidad: "aviso de privacidad", errorConsentimiento: "Confirma la autorización de publicación.",
  avisoModeracion: "Tu reseña se revisará antes de publicarse.",
  limite: "Demasiados intentos. Espera unos minutos antes de volver a enviar.",
  google: "Continuar con Google", preparando: "Preparando Google…", conectado: "Identidad de Google verificada. Puedes elegir tu nombre público.",
  sinCuentaAyuda: "Puedes escribir tu reseña sin iniciar sesión.",
  verificandoGoogle: "Verificando tu cuenta…",
  sinCuenta: "Continuar sin cuenta", errorGoogle: "Google no está disponible. Puedes continuar sin cuenta.",
  aclaracionGoogle: "Opcional. Verifica tu identidad; tu reseña se comparte en Cafeto, no en Google Maps.",
  tituloGoogle: "Reseñas en Google", enlaceGoogle: "Ver perfil en Google",
  verificadaAyuda: "Enviada mediante una invitación vinculada a una compra. El enlace no acredita por sí solo la identidad del comprador.",
  detalle: "Ver reseña", metodo: "Identificación", invitado: "Sin cuenta", politicaModeracion: "Moderamos spam, contenido ofensivo y datos personales. Las opiniones negativas siguen el mismo proceso.",
  renovacion: "Se invalidará el enlace anterior y se generará uno nuevo. ¿Continuar?",
  renovar: "Renovar enlace", regenerar: "Generar otro enlace", enlaceUnaVez: "El enlace solo se muestra al generarlo. Para volver a copiarlo se debe regenerar; el anterior dejará de funcionar.",
  vence: "Vence", reintentar: "Reintentar", todas: "Todas las reseñas",
};

export const TEXTOS_RESENAS_GOOGLE = {
  titulo: "También nos recomiendan en Google",
  descripcion: "Conoce las experiencias compartidas en el perfil de nuestro negocio.",
  verPerfil: "Ver todas en Google Maps",
  cargar: "Mostrar reseñas de Google",
  cargando: "Consultando las reseñas de Google…",
  error: "No pudimos cargar las opiniones aquí. Puedes consultarlas en Google Maps.",
  vacio: "Aún no hay opiniones disponibles para mostrar aquí.",
  seleccion: "Google muestra hasta cinco opiniones, ordenadas por relevancia. La calificación y el total corresponden al perfil completo.",
  origen: "Google Maps",
  opinion: "Ver opinión original",
  opiniones: "opiniones en Google",
  calificacion: "Calificación en Google",
} as const;
