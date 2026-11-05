import type {
  CanalPedido,
  EstadoEntrega,
  EstadoPago,
  EstadoResenaVenta,
  FilaItemVenta,
  FilaVentaAdmin,
  ItemVentaAdmin,
  MoliendaVenta,
  ProductoAdmin,
  ResumenInicio,
  VentaAdmin,
} from "../tipos";
import type {
  EntradaActualizarVenta,
  EntradaCrearVenta,
  EntradaItemVenta,
} from "./validar";
import { fechaATimestamp, hoyLocal } from "./fechas";
import { estadoInvitacion } from "./invitaciones";

export type MotivoVenta =
  | "no_existe"
  | "no_editable"
  | "ya_entregado"
  | "ya_cancelada"
  | "producto_no_existe"
  | "precio_catalogo"
  | "precio_pendiente"
  | "molienda_no_aplica";

export type ResultadoVenta =
  | { ok: true; id: string }
  | { ok: false; motivo: MotivoVenta };

export interface FiltrosVenta {
  desde?: string;
  hasta?: string;
  canal?: CanalPedido;
  entrega?: EstadoEntrega | "por_entregar";
  pago?: EstadoPago;
  producto?: string;
  resena?: EstadoResenaVenta;
  q?: string;
  limite?: number;
  excluirCanceladas?: boolean;
  pagina?: number;
}

interface ItemPreparado {
  id: string;
  productoId: string | null;
  presentacionId: string | null;
  nombreProducto: string;
  nombrePresentacion: string;
  molienda: MoliendaVenta | null;
  cantidad: number;
  precioUnitarioCentavos: number;
  costoUnitarioCentavos: number | null;
  orden: number;
}

interface FilaReferencia {
  producto_id: string;
  producto: string;
  categoria: string;
  presentacion_id: string;
  presentacion: string;
  precio_centavos: number | null;
  costo_centavos: number | null;
}

interface FilaProductoPresentacion {
  producto_id: string;
  nombre: string;
  categoria: string;
  activo: number;
  orden: number;
  presentacion_id: string | null;
  presentacion_nombre: string | null;
  presentacion_precio: number | null;
  presentacion_costo: number | null;
  presentacion_activo: number | null;
  presentacion_orden: number | null;
}

interface FilaResumen {
  cantidad: number;
  ventas_centavos: number;
  cobrado_centavos: number;
  por_cobrar_centavos: number;
  ventas_con_costo: number;
  ventas_con_costo_centavos: number;
  ventas_sin_costo: number;
  ventas_legado: number;
  costo_centavos: number;
}

const SELECT_VENTA = `
  SELECT p.id, p.folio, p.canal, p.referencia, p.vendido_en,
         p.venta_vendedora, p.por_paqueteria, p.fecha_aproximada, p.total_reportado_centavos, p.envio_centavos, p.costo_envio_centavos,
         p.estado_entrega, p.entregado_en, p.estado_pago, p.pagado_en,
         p.cancelado_en, p.creado_en, p.actualizado_en,
         i.id AS invitacion_id, i.usada_en AS invitacion_usada_en,
         i.revocada_en AS invitacion_revocada_en,
         i.expira_en AS invitacion_expira_en,
         i.creada_en AS invitacion_creada_en,
         r.estado AS resena_estado
  FROM pedidos p
  LEFT JOIN invitaciones i ON i.id = (
    SELECT id FROM invitaciones
    WHERE pedido_id = p.id
    ORDER BY creada_en DESC LIMIT 1
  )
  LEFT JOIN resenas r ON r.pedido_id = p.id`;

function auditoria(
  env: EnvLike,
  actor: string,
  accion: string,
  entidadId: string,
  detalle: unknown
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO auditoria (id, actor, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, ?, 'pedido', ?, ?)`
  ).bind(
    crypto.randomUUID(),
    actor,
    accion,
    entidadId,
    detalle === null ? null : JSON.stringify(detalle)
  );
}

function insertarItem(
  env: EnvLike,
  pedidoId: string,
  item: ItemPreparado,
  ahora: string
): D1PreparedStatement {
  return env.DB.prepare(
    `INSERT INTO pedido_items
       (id, pedido_id, producto_id, presentacion_id, nombre_producto,
        nombre_presentacion, molienda, cantidad, precio_unitario_centavos,
        costo_unitario_centavos, orden, creado_en)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    item.id,
    pedidoId,
    item.productoId,
    item.presentacionId,
    item.nombreProducto,
    item.nombrePresentacion,
    item.molienda,
    item.cantidad,
    item.precioUnitarioCentavos,
    item.costoUnitarioCentavos,
    item.orden,
    ahora
  );
}

async function prepararItems(
  env: EnvLike,
  items: EntradaItemVenta[],
  ventaVendedora = false,
  originales: ItemVentaAdmin[] = []
): Promise<
  | { ok: true; items: ItemPreparado[] }
  | { ok: false; motivo: "producto_no_existe" | "molienda_no_aplica" | "precio_catalogo" | "precio_pendiente" }
> {
  const preparados: ItemPreparado[] = [];

  for (const [indice, item] of items.entries()) {
    const conCatalogo =
      item.productoId !== undefined && item.presentacionId !== undefined;

    if (conCatalogo) {
      const referencia = await env.DB.prepare(
        `SELECT p.id AS producto_id, p.nombre AS producto, p.categoria,
                pr.id AS presentacion_id, pr.nombre AS presentacion,
                pr.precio_centavos, pr.costo_centavos
         FROM presentaciones pr
         JOIN productos p ON p.id = pr.producto_id
         WHERE pr.id = ? AND pr.producto_id = ? AND pr.activo = 1 AND p.activo = 1`
      )
        .bind(item.presentacionId, item.productoId)
        .first<FilaReferencia>();

      if (!referencia) return { ok: false, motivo: "producto_no_existe" };
      if (referencia.categoria !== "cafe" && item.molienda) {
        return { ok: false, motivo: "molienda_no_aplica" };
      }
      if (!ventaVendedora) {
        const historico = originales.some(i => i.productoId === item.productoId && i.presentacionId === item.presentacionId && i.precioUnitarioCentavos === item.precioUnitarioCentavos);
        if (!historico && referencia.precio_centavos === null) return { ok: false, motivo: "precio_pendiente" };
        if (!historico && item.precioUnitarioCentavos !== referencia.precio_centavos) return { ok: false, motivo: "precio_catalogo" };
      }

      preparados.push({
        id: crypto.randomUUID(),
        productoId: referencia.producto_id,
        presentacionId: referencia.presentacion_id,
        nombreProducto: referencia.producto,
        nombrePresentacion: referencia.presentacion,
        molienda: item.molienda ?? null,
        cantidad: item.cantidad,
        precioUnitarioCentavos: item.precioUnitarioCentavos,
        costoUnitarioCentavos: (() => {
          const original = originales.find(i => i.productoId === item.productoId && i.presentacionId === item.presentacionId && i.precioUnitarioCentavos === item.precioUnitarioCentavos);
          return original ? original.costoUnitarioCentavos : referencia.costo_centavos ?? null;
        })(),
        orden: indice,
      });
      continue;
    }

    preparados.push({
      id: crypto.randomUUID(),
      productoId: null,
      presentacionId: null,
      nombreProducto: item.nombreProducto ?? "",
      nombrePresentacion: item.nombrePresentacion ?? "",
      molienda: item.molienda ?? null,
      cantidad: item.cantidad,
      precioUnitarioCentavos: item.precioUnitarioCentavos,
      costoUnitarioCentavos: item.costoUnitarioCentavos ?? null,
      orden: indice,
    });
  }

  return { ok: true, items: preparados };
}

function mapearItem(fila: FilaItemVenta): ItemVentaAdmin {
  const subtotalCentavos = fila.precio_unitario_centavos === null ? null : fila.cantidad * fila.precio_unitario_centavos;
  return {
    id: fila.id,
    productoId: fila.producto_id,
    presentacionId: fila.presentacion_id,
    nombreProducto: fila.nombre_producto,
    nombrePresentacion: fila.nombre_presentacion,
    molienda: (fila.molienda as MoliendaVenta | null) ?? null,
    cantidad: fila.cantidad,
    precioUnitarioCentavos: fila.precio_unitario_centavos,
    costoUnitarioCentavos: fila.costo_unitario_centavos,
    subtotalCentavos,
    costoSubtotalCentavos:
      fila.costo_unitario_centavos === null
        ? null
        : fila.cantidad * fila.costo_unitario_centavos,
  };
}

function estadoResenaVenta(fila: FilaVentaAdmin): EstadoResenaVenta {
  if (fila.resena_estado === "aprobada") return "publicada";
  if (fila.resena_estado === "pendiente") return "pendiente";
  if (fila.resena_estado === "rechazada") return "rechazada";
  if (!fila.invitacion_id || !fila.invitacion_expira_en) return "sin_solicitar";
  if (fila.invitacion_usada_en) return "sin_solicitar";

  const estado = estadoInvitacion({
    usada_en: fila.invitacion_usada_en,
    revocada_en: fila.invitacion_revocada_en,
    expira_en: fila.invitacion_expira_en,
  });
  if (estado === "activa") return "activa";
  if (estado === "revocada") return "revocada";
  if (estado === "expirada") return "expirada";
  return "sin_solicitar";
}

function mapearVenta(
  fila: FilaVentaAdmin,
  items: ItemVentaAdmin[]
): VentaAdmin {
  const totalCentavos = fila.total_reportado_centavos ?? items.reduce(
    (suma, item) => suma + (item.subtotalCentavos ?? 0),
    fila.envio_centavos
  );
  const costoEstimadoCentavos = items.reduce(
    (suma, item) => suma + (item.costoSubtotalCentavos ?? 0),
    fila.costo_envio_centavos ?? 0
  );
  const costosCompletos =
    (!fila.por_paqueteria || fila.costo_envio_centavos !== null) && items.length > 0 &&
    items.every((item) => item.costoUnitarioCentavos !== null);

  const resumen = items
    .slice(0, 2)
    .map(
      (item) =>
        `${item.cantidad} × ${item.nombreProducto} ${item.nombrePresentacion}`.trim()
    )
    .join(" · ");
  const extra = items.length > 2 ? ` · +${items.length - 2}` : "";

  const invitacion =
    fila.invitacion_id &&
    fila.invitacion_expira_en &&
    fila.invitacion_creada_en
      ? {
          id: fila.invitacion_id,
          estado: estadoInvitacion({
            usada_en: fila.invitacion_usada_en,
            revocada_en: fila.invitacion_revocada_en,
            expira_en: fila.invitacion_expira_en,
          }),
          creadaEn: fila.invitacion_creada_en,
          expiraEn: fila.invitacion_expira_en,
        }
      : null;

  return {
    id: fila.id,
    ventaVendedora: Boolean(fila.venta_vendedora),
    porPaqueteria: Boolean(fila.por_paqueteria),
    fechaAproximada: Boolean(fila.fecha_aproximada),
    totalReportadoCentavos: fila.total_reportado_centavos,
    envioCentavos: fila.envio_centavos,
    folio: fila.folio,
    canal: fila.canal as CanalPedido,
    referencia: fila.referencia,
    vendidoEn: fila.vendido_en ?? fila.creado_en.slice(0, 10),
    estadoEntrega: fila.estado_entrega as EstadoEntrega,
    entregadoEn: fila.entregado_en,
    estadoPago: fila.estado_pago as EstadoPago,
    pagadoEn: fila.pagado_en,
    canceladoEn: fila.cancelado_en,
    creadoEn: fila.creado_en,
    actualizadoEn: fila.actualizado_en,
    items,
    itemsResumen: `${resumen}${extra}`,
    totalCentavos,
    costoEstimadoCentavos,
    costosCompletos,
    legado: items.length === 0,
    invitacion,
    resenaEstado: estadoResenaVenta(fila),
  };
}

async function itemsPorPedido(
  env: EnvLike,
  ids: string[]
): Promise<Map<string, ItemVentaAdmin[]>> {
  const mapa = new Map<string, ItemVentaAdmin[]>();

  for (let inicio = 0; inicio < ids.length; inicio += 50) {
    const grupo = ids.slice(inicio, inicio + 50);
    const marcas = grupo.map(() => "?").join(",");
    const filas = await env.DB.prepare(
      `SELECT id, pedido_id, producto_id, presentacion_id, nombre_producto,
              nombre_presentacion, molienda, cantidad,
              precio_unitario_centavos, costo_unitario_centavos, orden
       FROM pedido_items
       WHERE pedido_id IN (${marcas})
       ORDER BY pedido_id, orden, creado_en`
    )
      .bind(...grupo)
      .all();

    for (const fila of (filas.results ?? []) as unknown as FilaItemVenta[]) {
      const lista = mapa.get(fila.pedido_id) ?? [];
      lista.push(mapearItem(fila));
      mapa.set(fila.pedido_id, lista);
    }
  }

  return mapa;
}

async function consultarVentas(
  env: EnvLike,
  condiciones: string[],
  valores: unknown[],
  limite: number,
  desplazamiento = 0
): Promise<VentaAdmin[]> {
  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(" AND ")}` : "";
  const filas = await env.DB.prepare(
    `${SELECT_VENTA}
     ${where}
     ORDER BY p.vendido_en DESC, p.creado_en DESC, p.id DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...valores, limite, desplazamiento)
    .all();

  const crudas = (filas.results ?? []) as unknown as FilaVentaAdmin[];
  const items = await itemsPorPedido(
    env,
    crudas.map((fila) => fila.id)
  );

  return crudas.map((fila) => mapearVenta(fila, items.get(fila.id) ?? []));
}

export async function crearVenta(
  env: EnvLike,
  datos: EntradaCrearVenta & { actor: string }
): Promise<ResultadoVenta> {
  const preparado = await prepararItems(env, datos.items, datos.ventaVendedora);
  if (!preparado.ok) return preparado;

  const id = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const entregado = datos.estadoEntrega === "entregado" ? 1 : 0;
  const entregadoEn =
    entregado === 1
      ? fechaATimestamp(datos.entregadoEn ?? datos.vendidoEn)
      : null;
  const pagadoEn =
    datos.estadoPago === "pagado"
      ? fechaATimestamp(datos.pagadoEn ?? datos.vendidoEn)
      : null;

  const insercion = env.DB.prepare(
    `INSERT INTO pedidos
       (id, folio, canal, referencia, vendido_en, estado_entrega, entregado,
        entregado_en, estado_pago, pagado_en, creado_en, actualizado_en, venta_vendedora, por_paqueteria, envio_centavos)
     VALUES (?, (SELECT COALESCE(MAX(folio), 0) + 1 FROM pedidos), ?, ?, ?, ?,
             ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    datos.canal,
    datos.referencia ?? null,
    datos.vendidoEn,
    datos.estadoEntrega,
    entregado,
    entregadoEn,
    datos.estadoPago,
    pagadoEn,
    ahora,
    ahora,
    datos.ventaVendedora ? 1 : 0,
    datos.porPaqueteria ? 1 : 0,
    datos.porPaqueteria ? datos.envioCentavos ?? 0 : 0
  );

  const registra = auditoria(env, datos.actor, "crear_venta", id, {
    canal: datos.canal,
    ventaVendedora: datos.ventaVendedora ?? false,
    porPaqueteria: datos.porPaqueteria ?? false,
    envioCentavos: datos.porPaqueteria ? datos.envioCentavos ?? 0 : 0,
    vendidoEn: datos.vendidoEn,
    estadoEntrega: datos.estadoEntrega,
    estadoPago: datos.estadoPago,
    items: preparado.items.length,
  });

  const sentencias = [
    insercion,
    ...preparado.items.map((item) => insertarItem(env, id, item, ahora)),
    registra,
  ];

  await env.DB.batch(sentencias);
  return { ok: true, id };
}

function condicionesVentas(filtros: FiltrosVenta) {
  const condiciones: string[] = [];
  const valores: unknown[] = [];
  const ahora = new Date().toISOString();

  if (filtros.desde) {
    condiciones.push("p.vendido_en >= ?");
    valores.push(filtros.desde);
  }
  if (filtros.hasta) {
    condiciones.push("p.vendido_en <= ?");
    valores.push(filtros.hasta);
  }
  if (filtros.canal) {
    condiciones.push("p.canal = ?");
    valores.push(filtros.canal);
  }
  if (filtros.entrega === "por_entregar") {
    condiciones.push("p.estado_entrega IN ('por_preparar', 'listo')");
  } else if (filtros.entrega) {
    condiciones.push("p.estado_entrega = ?");
    valores.push(filtros.entrega);
  }
  if (filtros.pago) {
    condiciones.push("p.estado_pago = ?");
    valores.push(filtros.pago);
  }
  if (filtros.excluirCanceladas) {
    condiciones.push("p.estado_entrega != 'cancelado'");
  }
  if (filtros.producto) {
    condiciones.push(
      `EXISTS (SELECT 1 FROM pedido_items pi
               WHERE pi.pedido_id = p.id AND pi.producto_id = ?)`
    );
    valores.push(filtros.producto);
  }
  if (filtros.q) {
    const patron = `%${filtros.q}%`;
    condiciones.push(
      `(p.referencia LIKE ? OR CAST(p.folio AS TEXT) LIKE ?
        OR EXISTS (SELECT 1 FROM pedido_items pi
                   WHERE pi.pedido_id = p.id AND pi.nombre_producto LIKE ?))`
    );
    valores.push(patron, patron, patron);
  }

  switch (filtros.resena) {
    case "sin_solicitar":
      condiciones.push("i.id IS NULL");
      break;
    case "activa":
      condiciones.push(
        `r.estado IS NULL AND i.id IS NOT NULL AND i.usada_en IS NULL
         AND i.revocada_en IS NULL AND i.expira_en > ?`
      );
      valores.push(ahora);
      break;
    case "pendiente":
      condiciones.push("r.estado = 'pendiente'");
      break;
    case "publicada":
      condiciones.push("r.estado = 'aprobada'");
      break;
    case "rechazada":
      condiciones.push("r.estado = 'rechazada'");
      break;
    case "revocada":
      condiciones.push(
        "r.estado IS NULL AND i.id IS NOT NULL AND i.revocada_en IS NOT NULL"
      );
      break;
    case "expirada":
      condiciones.push(
        `r.estado IS NULL AND i.id IS NOT NULL AND i.usada_en IS NULL
         AND i.revocada_en IS NULL AND i.expira_en <= ?`
      );
      valores.push(ahora);
      break;
    default:
      break;
  }

  return { condiciones, valores };
}

export async function listarVentas(env: EnvLike, filtros: FiltrosVenta = {}): Promise<VentaAdmin[]> {
  const { condiciones, valores } = condicionesVentas(filtros);
  const limite = Math.min(200, Math.max(1, Math.trunc(filtros.limite ?? 200)));
  return consultarVentas(env, condiciones, valores, limite, ((filtros.pagina ?? 1) - 1) * limite);
}

export async function listarVentasPaginadas(env: EnvLike, filtros: FiltrosVenta) {
  const seleccion = condicionesVentas(filtros);
  const where = seleccion.condiciones.length ? `WHERE ${seleccion.condiciones.join(" AND ")}` : "";
  const fila = await env.DB.prepare(`SELECT COUNT(*) AS total FROM (${SELECT_VENTA} ${where})`)
    .bind(...seleccion.valores).first<{ total: number }>();
  // El alcance de los accesos rápidos es búsqueda + canal; incluye todos los resultados.
  const base = condicionesVentas({ q: filtros.q, canal: filtros.canal });
  const whereBase = base.condiciones.length ? `WHERE ${base.condiciones.join(" AND ")}` : "";
  const conteos = await env.DB.prepare(
    `SELECT COUNT(*) AS todas,
       COUNT(CASE WHEN estado_pago = 'pendiente' AND estado_entrega != 'cancelado' THEN 1 END) AS porCobrar,
       COUNT(CASE WHEN estado_entrega IN ('por_preparar', 'listo') THEN 1 END) AS porEntregar
     FROM (${SELECT_VENTA} ${whereBase})`
  ).bind(...base.valores).first<{ todas: number; porCobrar: number; porEntregar: number }>();
  const limite = Math.min(200, Math.max(1, Math.trunc(filtros.limite ?? 20)));
  const total = fila?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / limite));
  const pagina = Math.min(filtros.pagina ?? 1, paginas);
  return {
    ventas: await consultarVentas(env, seleccion.condiciones, seleccion.valores, limite, (pagina - 1) * limite),
    total, pagina, paginas,
    conteos: conteos ?? { todas: 0, porCobrar: 0, porEntregar: 0 },
  };
}

export async function obtenerVenta(
  env: EnvLike,
  id: string
): Promise<VentaAdmin | null> {
  const ventas = await consultarVentas(env, ["p.id = ?"], [id], 1);
  return ventas[0] ?? null;
}

export async function actualizarVenta(
  env: EnvLike,
  datos: EntradaActualizarVenta & { id: string; actor: string }
): Promise<ResultadoVenta> {
  const actual = await obtenerVenta(env, datos.id);
  if (!actual) return { ok: false, motivo: "no_existe" };
  if (actual.totalReportadoCentavos !== null && (datos.porPaqueteria !== undefined || datos.envioCentavos !== undefined || datos.items !== undefined || datos.vendidoEn !== undefined || datos.canal !== undefined || datos.referencia !== undefined || datos.ventaVendedora !== undefined)) return { ok: false, motivo: "no_editable" };
  if (actual.estadoEntrega === "cancelado") {
    return { ok: false, motivo: "no_editable" };
  }
  if (actual.estadoEntrega === "entregado") {
    if (
      datos.porPaqueteria !== undefined ||
      datos.envioCentavos !== undefined ||
      datos.ventaVendedora !== undefined ||
      datos.items !== undefined ||
      datos.vendidoEn !== undefined ||
      datos.canal !== undefined ||
      datos.referencia !== undefined
    ) {
      return { ok: false, motivo: "no_editable" };
    }
  }

  let preparado: { ok: true; items: ItemPreparado[] } | null = null;
  if (actual.ventaVendedora && datos.ventaVendedora === false && datos.items === undefined) return { ok: false, motivo: "precio_catalogo" };
  if (datos.items !== undefined) {
    const resultado = await prepararItems(env, datos.items, datos.ventaVendedora ?? actual.ventaVendedora, actual.ventaVendedora ? [] : actual.items);
    if (!resultado.ok) return resultado;
    preparado = resultado;
  }

  const campos: string[] = [];
  const valores: unknown[] = [];

  if (datos.porPaqueteria !== undefined || datos.envioCentavos !== undefined) {
    const paqueteria = datos.porPaqueteria ?? actual.porPaqueteria;
    campos.push("por_paqueteria = ?", "envio_centavos = ?");
    valores.push(paqueteria ? 1 : 0, paqueteria ? datos.envioCentavos ?? actual.envioCentavos : 0);
  }
  if (datos.ventaVendedora !== undefined) {
    campos.push("venta_vendedora = ?");
    valores.push(datos.ventaVendedora ? 1 : 0);
  }
  if (datos.vendidoEn !== undefined) {
    campos.push("vendido_en = ?");
    valores.push(datos.vendidoEn);
  }
  if (datos.canal !== undefined) {
    campos.push("canal = ?");
    valores.push(datos.canal);
  }
  if (datos.referencia !== undefined) {
    campos.push("referencia = ?");
    valores.push(datos.referencia);
  }
  if (datos.estadoPago !== undefined) {
    if (datos.estadoPago === "pagado") {
      const pagadoEn = datos.pagadoEn
        ? fechaATimestamp(datos.pagadoEn)
        : actual.pagadoEn ??
          fechaATimestamp(datos.vendidoEn ?? actual.vendidoEn);
      campos.push("estado_pago = 'pagado', pagado_en = ?");
      valores.push(pagadoEn);
    } else {
      campos.push("estado_pago = 'pendiente', pagado_en = NULL");
    }
  }

  const ahora = new Date().toISOString();
  campos.push("actualizado_en = ?");
  valores.push(ahora);

  const sentencias: D1PreparedStatement[] = [];
  if (preparado) {
    sentencias.push(
      env.DB.prepare("DELETE FROM pedido_items WHERE pedido_id = ?").bind(datos.id),
      ...preparado.items.map((item) => insertarItem(env, datos.id, item, ahora))
    );
  }

  sentencias.push(
    env.DB.prepare(
      `UPDATE pedidos SET ${campos.join(", ")} WHERE id = ?`
    ).bind(...valores, datos.id)
  );

  sentencias.push(
    auditoria(env, datos.actor, "actualizar_venta", datos.id, {
      campos: Object.keys(datos).filter(
        (campo) => !["id", "actor"].includes(campo)
      ),
      itemsReemplazados: preparado !== null,
    })
  );

  await env.DB.batch(sentencias);
  return { ok: true, id: datos.id };
}

export async function cambiarEstadoEntrega(
  env: EnvLike,
  datos: {
    id: string;
    estado: "por_preparar" | "listo";
    actor: string;
  }
): Promise<ResultadoVenta> {
  const actual = await env.DB.prepare(
    "SELECT estado_entrega FROM pedidos WHERE id = ?"
  )
    .bind(datos.id)
    .first<{ estado_entrega: string }>();
  if (!actual) return { ok: false, motivo: "no_existe" };
  if (actual.estado_entrega === "entregado") {
    return { ok: false, motivo: "no_editable" };
  }
  if (actual.estado_entrega === "cancelado") {
    return { ok: false, motivo: "no_editable" };
  }
  if (actual.estado_entrega === datos.estado) {
    return { ok: true, id: datos.id };
  }

  const ahora = new Date().toISOString();
  const resultados = await env.DB.batch([
    env.DB.prepare(
      `UPDATE pedidos
       SET estado_entrega = ?, entregado = 0, actualizado_en = ?
       WHERE id = ? AND estado_entrega IN ('por_preparar', 'listo')`
    ).bind(datos.estado, ahora, datos.id),
    auditoria(env, datos.actor, "cambiar_estado_entrega", datos.id, {
      estado: datos.estado,
    }),
  ]);

  if ((resultados[0]?.meta.changes ?? 0) === 0) {
    return { ok: false, motivo: "no_editable" };
  }
  return { ok: true, id: datos.id };
}

export async function entregarVenta(
  env: EnvLike,
  datos: {
    id: string;
    actor: string;
    entregadoEn?: string | null;
  }
): Promise<ResultadoVenta> {
  const actual = await env.DB.prepare(
    "SELECT estado_entrega FROM pedidos WHERE id = ?"
  )
    .bind(datos.id)
    .first<{ estado_entrega: string }>();
  if (!actual) return { ok: false, motivo: "no_existe" };
  if (actual.estado_entrega === "entregado") {
    return { ok: false, motivo: "ya_entregado" };
  }
  if (actual.estado_entrega === "cancelado") {
    return { ok: false, motivo: "no_editable" };
  }

  const ahora = new Date().toISOString();
  const entregadoEn = datos.entregadoEn
    ? fechaATimestamp(datos.entregadoEn)
    : ahora;

  const resultados = await env.DB.batch([
    env.DB.prepare(
      `UPDATE pedidos
       SET estado_entrega = 'entregado', entregado = 1, entregado_en = ?,
           actualizado_en = ?
       WHERE id = ? AND estado_entrega IN ('por_preparar', 'listo')`
    ).bind(entregadoEn, ahora, datos.id),
    auditoria(env, datos.actor, "entregar_venta", datos.id, { entregadoEn }),
  ]);

  if ((resultados[0]?.meta.changes ?? 0) === 0) {
    return { ok: false, motivo: "no_editable" };
  }
  return { ok: true, id: datos.id };
}

export async function registrarPago(
  env: EnvLike,
  datos: {
    id: string;
    estado: EstadoPago;
    actor: string;
    pagadoEn?: string | null;
  }
): Promise<ResultadoVenta> {
  const actual = await env.DB.prepare(
    "SELECT estado_entrega, estado_pago, pagado_en, vendido_en FROM pedidos WHERE id = ?"
  )
    .bind(datos.id)
    .first<{
      estado_entrega: string;
      estado_pago: string;
      pagado_en: string | null;
      vendido_en: string | null;
    }>();
  if (!actual) return { ok: false, motivo: "no_existe" };
  if (actual.estado_entrega === "cancelado") {
    return { ok: false, motivo: "no_editable" };
  }

  const ahora = new Date().toISOString();
  const pagadoEn =
    datos.estado === "pagado"
      ? datos.pagadoEn
        ? fechaATimestamp(datos.pagadoEn)
        : actual.pagado_en ??
          fechaATimestamp(actual.vendido_en ?? hoyLocal())
      : null;

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE pedidos
       SET estado_pago = ?, pagado_en = ?, actualizado_en = ?
       WHERE id = ?`
    ).bind(datos.estado, pagadoEn, ahora, datos.id),
    auditoria(env, datos.actor, "registrar_pago", datos.id, {
      estado: datos.estado,
    }),
  ]);

  return { ok: true, id: datos.id };
}

export async function cancelarVenta(
  env: EnvLike,
  datos: { id: string; actor: string }
): Promise<ResultadoVenta> {
  const actual = await env.DB.prepare(
    "SELECT estado_entrega FROM pedidos WHERE id = ?"
  )
    .bind(datos.id)
    .first<{ estado_entrega: string }>();
  if (!actual) return { ok: false, motivo: "no_existe" };
  if (actual.estado_entrega === "cancelado") {
    return { ok: false, motivo: "ya_cancelada" };
  }

  const ahora = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE pedidos
       SET estado_entrega = 'cancelado', entregado = 0, cancelado_en = ?,
           actualizado_en = ?
       WHERE id = ?`
    ).bind(ahora, ahora, datos.id),
    env.DB.prepare(
      `UPDATE invitaciones SET revocada_en = ?
       WHERE pedido_id = ? AND usada_en IS NULL AND revocada_en IS NULL`
    ).bind(ahora, datos.id),
    auditoria(env, datos.actor, "cancelar_venta", datos.id, null),
  ]);

  return { ok: true, id: datos.id };
}

export async function resumenInicio(
  env: EnvLike,
  desde: string,
  hasta: string
): Promise<ResumenInicio> {
  const fila = await env.DB.prepare(
    `WITH ventas AS (
       SELECT p.id, p.estado_pago,
         (SELECT COUNT(*) FROM pedido_items i WHERE i.pedido_id = p.id) AS items,
         COALESCE(p.total_reportado_centavos, (SELECT COALESCE(SUM(i.cantidad * i.precio_unitario_centavos), 0)
          FROM pedido_items i WHERE i.pedido_id = p.id) + p.envio_centavos) AS total,
         (SELECT COALESCE(SUM(i.cantidad * i.costo_unitario_centavos), 0)
          FROM pedido_items i
          WHERE i.pedido_id = p.id AND i.costo_unitario_centavos IS NOT NULL) + COALESCE(p.costo_envio_centavos, 0) AS costo,
         (SELECT COUNT(*) FROM pedido_items i
          WHERE i.pedido_id = p.id AND (i.costo_unitario_centavos IS NULL OR (p.por_paqueteria = 1 AND p.costo_envio_centavos IS NULL))) AS sin_costo
       FROM pedidos p
       WHERE p.estado_entrega != 'cancelado'
         AND p.vendido_en >= ? AND p.vendido_en <= ?
     )
     SELECT
       COUNT(*) AS cantidad,
       COALESCE(SUM(CASE WHEN items > 0 THEN total ELSE 0 END), 0) AS ventas_centavos,
       COALESCE(SUM(CASE WHEN items > 0 AND estado_pago = 'pagado'
                         THEN total ELSE 0 END), 0) AS cobrado_centavos,
       COALESCE(SUM(CASE WHEN items > 0 AND estado_pago = 'pendiente'
                         THEN total ELSE 0 END), 0) AS por_cobrar_centavos,
       COALESCE(SUM(CASE WHEN items > 0 AND sin_costo = 0
                         THEN 1 ELSE 0 END), 0) AS ventas_con_costo,
       COALESCE(SUM(CASE WHEN items > 0 AND sin_costo = 0
                         THEN total ELSE 0 END), 0) AS ventas_con_costo_centavos,
       COALESCE(SUM(CASE WHEN items > 0 AND sin_costo > 0
                         THEN 1 ELSE 0 END), 0) AS ventas_sin_costo,
       COALESCE(SUM(CASE WHEN items = 0 THEN 1 ELSE 0 END), 0) AS ventas_legado,
       COALESCE(SUM(CASE WHEN items > 0 AND sin_costo = 0
                         THEN costo ELSE 0 END), 0) AS costo_centavos
     FROM ventas`
  )
    .bind(desde, hasta)
    .first<FilaResumen>();

  const pendientes = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM resenas WHERE estado = 'pendiente'"
  ).first<{ n: number }>();

  const costoEstimadoCentavos = fila?.costo_centavos ?? 0;
  // Solo meses completos: los gastos no tienen día confirmado para una semana.
  const finMes = new Date(Date.UTC(Number(desde.slice(0,4)), Number(desde.slice(5,7)), 0)).toISOString().slice(0,10);
  const gastosMensuales = desde.endsWith("-01") && hasta === finMes
    ? (await env.DB.prepare("SELECT concepto, tipo, importe_centavos AS importeCentavos FROM gastos_mensuales WHERE periodo = ? ORDER BY tipo, concepto").bind(desde.slice(0,7)).all<{ concepto: string; tipo: "equipo" | "operativo"; importeCentavos: number | null }>()).results
    : null;

  // El día comercial ya se guarda como YYYY-MM-DD; no convertirlo a UTC.
  // Agregamos todos los pedidos del periodo, sin el límite de recientes.
  const diarios = await env.DB.prepare(
    `SELECT p.vendido_en AS fecha,
       SUM(COALESCE(p.total_reportado_centavos, (SELECT COALESCE(SUM(i.cantidad * i.precio_unitario_centavos), 0) FROM pedido_items i WHERE i.pedido_id = p.id) + p.envio_centavos)) AS totalCentavos
     FROM pedidos p
     WHERE p.estado_entrega != 'cancelado'
       AND p.vendido_en >= ? AND p.vendido_en <= ?
     GROUP BY p.vendido_en ORDER BY p.vendido_en`
  ).bind(desde, hasta).all<{ fecha: string; totalCentavos: number }>();
  const conteos = await env.DB.prepare(
    `SELECT
       COUNT(CASE WHEN estado_pago = 'pendiente' THEN 1 END) AS cobrosPendientes,
       COUNT(CASE WHEN estado_entrega IN ('por_preparar', 'listo') THEN 1 END) AS porEntregar,
       COUNT(CASE WHEN estado_entrega = 'entregado' THEN 1 END) AS entregados
     FROM pedidos WHERE estado_entrega != 'cancelado'
       AND vendido_en >= ? AND vendido_en <= ?`
  ).bind(desde, hasta).first<{ cobrosPendientes: number; porEntregar: number; entregados: number }>();
  const totales = new Map(diarios.results.map((dia) => [dia.fecha, dia.totalCentavos]));
  const ventasPorDia: ResumenInicio["ventasPorDia"] = [];
  const fin = hasta < hoyLocal() ? hasta : hoyLocal();
  // UTC solo como calendario para avanzar días; no transforma fechas de ventas.
  for (const dia = new Date(`${desde}T12:00:00Z`); dia.toISOString().slice(0, 10) <= fin; dia.setUTCDate(dia.getUTCDate() + 1)) {
    const fecha = dia.toISOString().slice(0, 10);
    ventasPorDia.push({ fecha, totalCentavos: totales.get(fecha) ?? 0 });
  }

  const recientes = await listarVentas(env, {
    desde,
    hasta,
    excluirCanceladas: true,
    limite: 5,
  });

  return {
    ventasPorDia,
    cobrosPendientes: conteos?.cobrosPendientes ?? 0,
    porEntregar: conteos?.porEntregar ?? 0,
    entregados: conteos?.entregados ?? 0,
    periodo: { desde, hasta },
    cantidadVentas: fila?.cantidad ?? 0,
    ventasCentavos: fila?.ventas_centavos ?? 0,
    cobradoCentavos: fila?.cobrado_centavos ?? 0,
    porCobrarCentavos: fila?.por_cobrar_centavos ?? 0,
    costoEstimadoCentavos,
    gastosMensuales,
    gananciaEstimadaCentavos:
      (fila?.ventas_con_costo_centavos ?? 0) - costoEstimadoCentavos,
    ventasConCosto: fila?.ventas_con_costo ?? 0,
    ventasSinCosto: fila?.ventas_sin_costo ?? 0,
    ventasLegado: fila?.ventas_legado ?? 0,
    resenasPendientes: pendientes?.n ?? 0,
    recientes,
  };
}

export async function listarProductos(env: EnvLike): Promise<ProductoAdmin[]> {
  const filas = await env.DB.prepare(
    `SELECT p.id AS producto_id, p.nombre, p.categoria, p.activo, p.orden,
            pr.id AS presentacion_id, pr.nombre AS presentacion_nombre,
            pr.precio_centavos AS presentacion_precio,
            pr.costo_centavos AS presentacion_costo,
            pr.activo AS presentacion_activo,
            pr.orden AS presentacion_orden
     FROM productos p
     LEFT JOIN presentaciones pr ON pr.producto_id = p.id
     ORDER BY p.orden, p.nombre, pr.orden, pr.nombre`
  ).all();

  const productos = new Map<string, ProductoAdmin>();
  for (const fila of (filas.results ?? []) as unknown as FilaProductoPresentacion[]) {
    let producto = productos.get(fila.producto_id);
    if (!producto) {
      producto = {
        id: fila.producto_id,
        nombre: fila.nombre,
        categoria: fila.categoria,
        activo: fila.activo === 1,
        orden: fila.orden,
        presentaciones: [],
      };
      productos.set(fila.producto_id, producto);
    }
    if (fila.presentacion_id && fila.presentacion_nombre) {
      producto.presentaciones.push({
        id: fila.presentacion_id,
        nombre: fila.presentacion_nombre,
        precioCentavos: fila.presentacion_precio,
        costoCentavos: fila.presentacion_costo,
        activo: fila.presentacion_activo === 1,
        orden: fila.presentacion_orden ?? 0,
      });
    }
  }

  return [...productos.values()];
}

interface EnvLike {
  DB: D1Database;
}
