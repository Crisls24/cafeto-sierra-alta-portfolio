/**
 * Vocabulario y textos de Ventas.
 *
 * La venta es la unidad de trabajo del panel: productos, pago, entrega y
 * reseña cuelgan de ella. Los valores de estado viven aquí para que la UI no
 * invente etiquetas ni muestre los identificadores técnicos del Worker.
 */

export const CANALES_VENTA = [
  "whatsapp",
  "instagram",
  "facebook",
  "presencial",
  "correo",
  "otro",
] as const;
export type CanalVenta = (typeof CANALES_VENTA)[number];

export const ETIQUETAS_CANAL: Record<CanalVenta, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
  presencial: "Presencial",
  correo: "Correo",
  otro: "Otro",
};

export const ESTADOS_ENTREGA = [
  "por_preparar",
  "listo",
  "entregado",
  "cancelado",
] as const;
export type EstadoEntrega = (typeof ESTADOS_ENTREGA)[number];

export const ETIQUETAS_ENTREGA: Record<EstadoEntrega, string> = {
  por_preparar: "Por preparar",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export const ESTADOS_PAGO = ["pendiente", "pagado"] as const;
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export const ETIQUETAS_PAGO: Record<EstadoPago, string> = {
  pendiente: "Pendiente",
  pagado: "Pagado",
};

export const MOLIENDAS = ["grano-entero", "molido"] as const;
export type MoliendaVenta = (typeof MOLIENDAS)[number];

export const ETIQUETAS_MOLIENDA: Record<MoliendaVenta, string> = {
  "grano-entero": "Grano entero",
  molido: "Molido",
};

export const ESTADOS_RESENA_VENTA = [
  "sin_solicitar",
  "activa",
  "pendiente",
  "publicada",
  "rechazada",
  "revocada",
  "expirada",
] as const;
export type EstadoResenaVenta = (typeof ESTADOS_RESENA_VENTA)[number];

export const ETIQUETAS_RESENA_VENTA: Record<EstadoResenaVenta, string> = {
  sin_solicitar: "Sin solicitar",
  activa: "Invitación activa",
  pendiente: "Pendiente de moderar",
  publicada: "Publicada",
  rechazada: "Oculta",
  revocada: "Invitación revocada",
  expirada: "Invitación vencida",
};

export const TEXTOS_VENTAS = {
  titulo: "Ventas",
  subtitulo:
    "Consulta tus ventas y da seguimiento a pagos y entregas.",
  registrar: "Registrar venta",
  cargando: "Cargando ventas…",
  error: "No pudimos cargar las ventas. Inténtalo de nuevo.",
  noAutorizado:
    "Este panel requiere acceso con la cuenta de Cafeto Sierra Alta (Cloudflare Access).",
  reintentar: "Reintentar",
  buscar: "Buscar",
  buscarPlaceholder: "Buscar por folio, nota o producto…",
  entrega: "Entrega",
  pago: "Pago",
  canal: "Canal",
  todas: "Todas",
  todos: "Todos",
  porCobrar: "Por cobrar",
  porEntregar: "Por entregar",
  alcanceConteos: "Conteos de toda la búsqueda y el canal, antes de filtrar entrega y pago.",
  fueraFiltros: "La venta se guardó y queda fuera de los filtros activos.",
  anterior: "Anterior",
  siguiente: "Siguiente",
  pagina: "Página",
  fechaCanal: "Fecha / Canal",
  folio: "Folio",
  productos: "Productos",
  verDetalle: "Ver detalle de venta",
  precioPendiente: "Precio pendiente",
  sinVentas: "Todavía no hay ventas registradas.",
  sinResultados: "No hay ventas que coincidan con la búsqueda.",
  sinDetalle: "Sin detalle de productos",
  columnas: {
    folio: "Venta",
    fecha: "Fecha",
    detalle: "Detalle",
    total: "Total",
  },
  detalle: {
    titulo: "Venta",
    productos: "Productos",
    nota: "Nota",
    sinNota: "Sin nota.",
    entrega: "Entrega",
    pago: "Pago",
    fechaEntrega: "Fecha de entrega",
    resena: "Reseña",
    enlaceTitulo: "Enlace para la reseña",
    enlaceAviso:
      "Este enlace se muestra una sola vez. Cópialo antes de cerrar; si se pierde, revócalo y genera otro.",
    enlaceNoDisponible:
      "Por seguridad, el enlace de una invitación activa no se puede recuperar.",
    sinSolicitud: "Aún no se ha solicitado reseña.",
    resenaPendiente: "La reseña está pendiente de moderación.",
    resenaPublicada: "La reseña está publicada.",
    resenaRechazada: "La reseña está oculta.",
    confirmarCancelacion: "¿Cancelar esta venta?",
    avisoCancelacion: "La venta quedará cancelada y se revocarán sus invitaciones activas.",
    vendedora: "Venta a vendedora",
    fechaAproximada: "Fecha aproximada",
    desglosePendiente: "Total registrado; desglose de precios pendiente.",
    envio: "Paquetería incluida en el total",
    ventaHistorica: "Esta venta histórica no tiene detalle de productos ni importe registrado.",
    procesando: "Actualizando venta…",
  },
  acciones: {
    cerrar: "Cerrar",
    editar: "Editar",
    listo: "Marcar como listo",
    entregado: "Marcar como entregado",
    pagar: "Registrar pago",
    solicitarResena: "Solicitar reseña",
    revocarYGenerar: "Revocar y generar nuevo",
    copiar: "Copiar enlace",
    abrir: "Abrir enlace",
    cancelar: "Cancelar venta",
    confirmarCancelar: "Sí, cancelar la venta",
    volver: "Volver",
    revisarResenas: "Revisar en Reseñas",
  },
  avisos: {
    listo: "La venta quedó marcada como lista.",
    entregado: "La venta quedó marcada como entregada.",
    pagado: "El pago quedó registrado.",
    resenaSolicitada:
      "Solicitud de reseña generada. Copia el enlace antes de cerrar.",
    resenaRevocada:
      "Invitación revocada. Genera un enlace nuevo cuando lo necesites.",
    cancelada: "La venta quedó cancelada.",
    error: "No se pudo completar la acción. Inténtalo de nuevo.",
    invitacionActiva:
      "Ya existe una invitación activa. Por seguridad no se puede recuperar el enlace; revócala para generar uno nuevo.",
    copiado: "Enlace copiado.",
    copiadoError: "No se pudo copiar. Selecciona el enlace y cópialo manualmente.",
  },
  formulario: {
    titulo: "Registrar venta",
    tituloEdicion: "Editar venta",
    subtitulo:
      "Completa los datos de la venta.",
    fechaVenta: "Fecha de venta",
    nota: "Nota",
    notaPlaceholder: "Ej.: cliente pidió molienda para prensa francesa.",
    productos: "Productos",
    producto: "Producto",
    presentacion: "Presentación",
    molienda: "Molienda",
    cantidad: "Cantidad",
    precioUnitario: "Precio unitario",
    ventaVendedora: "Venta a vendedora",
    porPaqueteria: "Envío por paquetería",
    importeEnvio: "Envío cobrado al cliente",
    ayudaEnvio: "Se suma al total de los productos.",
    errorEnvio: "Indica el importe del envío, con un máximo de dos decimales y sin valores negativos.",
    ayudaVendedora: "Actívalo para capturar un precio libre por producto.",
    ayudaPrecio: "Puedes cambiar el precio para esta venta.",
    ayudaPrecioNormal: "Precio automático; se conserva en el registro de la venta.",
    errorPrecioCatalogo: "En una venta normal se usa el precio del catálogo.",
    errorPrecioPendiente: "Esta presentación aún no tiene precio en el catálogo.",
    precioHabitual: "Precio habitual",
    subtotal: "Subtotal",
    agregarProducto: "Agregar otro",
    agregarNota: "Agregar nota",
    descartar: "Hay cambios sin guardar. ¿Quieres descartarlos y cerrar?",
    elegirCanal: "Elegir canal",
    quitarProducto: "Quitar producto",
    elegirProducto: "Elegir producto",
    elegirPresentacion: "Elegir presentación",
    entrega: "Entrega",
    pago: "Pago",
    fechaEntrega: "Fecha de entrega",
    total: "Total",
    guardar: "Guardar venta",
    guardando: "Guardando…",
    guardarCambios: "Guardar cambios",
    cancelar: "Cancelar",
    cargandoProductos: "Cargando productos…",
    errorProductos: "No pudimos cargar los productos.",
    errorLineas: "Agrega al menos un producto.",
    errorProducto: "Elige el producto y la presentación en cada línea.",
    errorCantidad: "Escribe una cantidad entera entre 1 y 10,000.",
    errorPrecio: "Escribe un precio entre $0 y $1,000,000, con un máximo de dos decimales.",
    errorCanal: "Elige un canal válido.",
    errorEntrega: "Selecciona el estado de entrega.",
    errorPago: "Selecciona Pendiente o Pagado.",
    errorElegirProducto: "Elige un producto.",
    errorElegirPresentacion: "Elige una presentación.",
    errorMolienda: "Elige una molienda válida para el café.",
    errorMaximoLineas: "Puedes registrar hasta 50 productos por venta.",
    errorNota: "La nota debe tener un máximo de 120 caracteres.",
    errorResumen: "Revisa los campos señalados antes de guardar.",
    errorFecha: "Indica la fecha de venta.",
    errorFechaEntrega: "Indica la fecha de entrega.",
    errorGuardar: "No se pudo guardar la venta. Revisa los datos e inténtalo de nuevo.",
    errorProductoNoDisponible:
      "Ese producto ya no está disponible. Elige otro o actualiza la página.",
    avisoCreada: "Venta registrada.",
    avisoEditada: "Venta actualizada.",
  },
} as const;
