import { z } from "zod";

import type {
  CanalVenta,
  EstadoEntrega,
  EstadoPago,
  EstadoResenaVenta,
  MoliendaVenta,
} from "../data/ventas";

export type {
  CanalVenta,
  EstadoEntrega,
  EstadoPago,
  EstadoResenaVenta,
  MoliendaVenta,
};

export const esquemaItemVenta = z.object({
  id: z.string().min(1),
  productoId: z.string().nullable(),
  presentacionId: z.string().nullable(),
  nombreProducto: z.string().min(1),
  nombrePresentacion: z.string().min(1),
  molienda: z.enum(["grano-entero", "molido"]).nullable(),
  cantidad: z.number().int().min(1),
  precioUnitarioCentavos: z.number().int().min(0).nullable(),
  costoUnitarioCentavos: z.number().int().min(0).nullable(),
  subtotalCentavos: z.number().int().min(0).nullable(),
  costoSubtotalCentavos: z.number().int().min(0).nullable(),
});

export const esquemaInvitacionResumen = z.object({
  id: z.string().min(1),
  estado: z.enum(["activa", "usada", "revocada", "expirada"]),
  creadaEn: z.string().min(1),
  expiraEn: z.string().min(1),
});

export const esquemaVentaAdmin = z.object({
  porPaqueteria: z.boolean(),
  ventaVendedora: z.boolean(),
  fechaAproximada: z.boolean(),
  totalReportadoCentavos: z.number().int().min(0).nullable(),
  envioCentavos: z.number().int().min(0),
  id: z.string().min(1),
  folio: z.number().int().nullable(),
  canal: z.enum(["whatsapp", "instagram", "facebook", "presencial", "correo", "otro"]),
  referencia: z.string().nullable(),
  vendidoEn: z.string().min(10),
  estadoEntrega: z.enum(["por_preparar", "listo", "entregado", "cancelado"]),
  entregadoEn: z.string().nullable(),
  estadoPago: z.enum(["pendiente", "pagado"]),
  pagadoEn: z.string().nullable(),
  canceladoEn: z.string().nullable(),
  creadoEn: z.string().min(1),
  actualizadoEn: z.string().min(1),
  items: z.array(esquemaItemVenta),
  itemsResumen: z.string(),
  totalCentavos: z.number().int().min(0),
  costoEstimadoCentavos: z.number().int().min(0),
  costosCompletos: z.boolean(),
  legado: z.boolean(),
  invitacion: esquemaInvitacionResumen.nullable(),
  resenaEstado: z.enum([
    "sin_solicitar",
    "activa",
    "pendiente",
    "publicada",
    "rechazada",
    "revocada",
    "expirada",
  ]),
});

export const esquemaProductoAdmin = z.object({
  id: z.string().min(1),
  nombre: z.string().min(1),
  categoria: z.string().min(1),
  activo: z.boolean(),
  orden: z.number().int(),
  presentaciones: z.array(
    z.object({
      id: z.string().min(1),
      nombre: z.string().min(1),
      precioCentavos: z.number().int().min(0).nullable(),
      costoCentavos: z.number().int().min(0).nullable(),
      activo: z.boolean(),
      orden: z.number().int(),
    })
  ),
});

export const esquemaResumenInicio = z.object({
  ventasPorDia: z.array(z.object({ fecha: z.string().min(10), totalCentavos: z.number().int().min(0) })),
  cobrosPendientes: z.number().int().min(0),
  porEntregar: z.number().int().min(0),
  entregados: z.number().int().min(0),
  periodo: z.object({ desde: z.string().min(10), hasta: z.string().min(10) }),
  cantidadVentas: z.number().int().min(0),
  ventasCentavos: z.number().int().min(0),
  cobradoCentavos: z.number().int().min(0),
  porCobrarCentavos: z.number().int().min(0),
  costoEstimadoCentavos: z.number().int().min(0),
  gananciaEstimadaCentavos: z.number().int(),
  gastosMensuales: z.array(z.object({ concepto: z.string(), tipo: z.enum(["equipo", "operativo"]), importeCentavos: z.number().int().nonnegative().nullable() })).nullable(),
  ventasConCosto: z.number().int().min(0),
  ventasSinCosto: z.number().int().min(0),
  ventasLegado: z.number().int().min(0),
  resenasPendientes: z.number().int().min(0),
  recientes: z.array(esquemaVentaAdmin),
});

export type VentaAdmin = z.infer<typeof esquemaVentaAdmin>;
export type ItemVentaAdmin = z.infer<typeof esquemaItemVenta>;
export type ProductoAdmin = z.infer<typeof esquemaProductoAdmin>;
export type ResumenInicio = z.infer<typeof esquemaResumenInicio>;

export type ResultadoAdmin<T> =
  | { ok: true; datos: T }
  | { ok: false; noAutorizado: boolean; codigo?: string; mensaje?: string };

async function pedir<T>(
  url: string,
  esquema: z.ZodType<T>,
  init?: RequestInit
): Promise<ResultadoAdmin<T>> {
  try {
    const respuesta = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (respuesta.status === 401) return { ok: false, noAutorizado: true };
    if (!respuesta.ok) {
      let codigo: string | undefined;
      let mensaje: string | undefined;
      try {
        const cuerpo = (await respuesta.json()) as { codigo?: unknown; error?: unknown };
        if (typeof cuerpo.codigo === "string") codigo = cuerpo.codigo;
        if (typeof cuerpo.error === "string") mensaje = cuerpo.error;
      } catch {
        // ignore
      }
      return { ok: false, noAutorizado: false, codigo, mensaje };
    }
    return { ok: true, datos: esquema.parse(await respuesta.json()) };
  } catch {
    return { ok: false, noAutorizado: false };
  }
}

export function leerInicio(desde: string, hasta: string): Promise<ResultadoAdmin<ResumenInicio>> {
  return pedir(`/api/admin/inicio?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`, esquemaResumenInicio);
}

export function leerProductos(): Promise<ResultadoAdmin<ProductoAdmin[]>> {
  const esquema = z.object({ productos: z.array(esquemaProductoAdmin) });
  return pedir("/api/admin/productos", esquema).then((r) =>
    r.ok ? { ok: true, datos: r.datos.productos } : r
  );
}

export function leerVentas(filtros: Record<string, string> = {}): Promise<ResultadoAdmin<VentaAdmin[]>> {
  const esquema = z.object({ ventas: z.array(esquemaVentaAdmin) });
  const params = new URLSearchParams(filtros).toString();
  const url = params ? `/api/admin/ventas?${params}` : "/api/admin/ventas";
  return pedir(url, esquema).then((r) => (r.ok ? { ok: true, datos: r.datos.ventas } : r));
}

const esquemaPaginaVentas = z.object({
  ventas: z.array(esquemaVentaAdmin),
  total: z.number().int().min(0),
  pagina: z.number().int().min(1),
  paginas: z.number().int().min(1),
  conteos: z.object({ todas: z.number().int().min(0), porCobrar: z.number().int().min(0), porEntregar: z.number().int().min(0) }),
});
export type PaginaVentas = z.infer<typeof esquemaPaginaVentas>;
export function leerVentasPaginadas(filtros: Record<string, string> = {}): Promise<ResultadoAdmin<PaginaVentas>> {
  return pedir(`/api/admin/ventas?${new URLSearchParams({ ...filtros, paginado: "1" })}`, esquemaPaginaVentas);
}

export function obtenerVenta(id: string): Promise<ResultadoAdmin<VentaAdmin>> {
  const esquema = z.object({ venta: esquemaVentaAdmin });
  return pedir(`/api/admin/ventas/${encodeURIComponent(id)}`, esquema).then((r) =>
    r.ok ? { ok: true, datos: r.datos.venta } : r
  );
}

export function crearVenta(body: unknown): Promise<ResultadoAdmin<{ ok: true; id: string }>> {
  const esquema = z.object({ ok: z.literal(true), id: z.string().min(1) });
  return pedir("/api/admin/ventas", esquema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function actualizarVenta(id: string, body: unknown): Promise<ResultadoAdmin<{ ok: true; id: string }>> {
  const esquema = z.object({ ok: z.literal(true), id: z.string().min(1) });
  return pedir(`/api/admin/ventas/${encodeURIComponent(id)}`, esquema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function cambiarEstadoVenta(id: string, estado: "por_preparar" | "listo"): Promise<ResultadoAdmin<{ ok: true }>> {
  const esquema = z.object({ ok: z.literal(true) });
  return pedir(`/api/admin/ventas/${encodeURIComponent(id)}/estado`, esquema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
}

export function entregarVenta(id: string, entregadoEn?: string): Promise<ResultadoAdmin<{ ok: true }>> {
  const esquema = z.object({ ok: z.literal(true) });
  return pedir(`/api/admin/ventas/${encodeURIComponent(id)}/entregar`, esquema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(entregadoEn ? { entregadoEn } : {}),
  });
}

export function registrarPago(id: string, estado: "pendiente" | "pagado", pagadoEn?: string): Promise<ResultadoAdmin<{ ok: true }>> {
  const esquema = z.object({ ok: z.literal(true) });
  return pedir(`/api/admin/ventas/${encodeURIComponent(id)}/pago`, esquema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pagadoEn ? { estado, pagadoEn } : { estado }),
  });
}

export function cancelarVenta(id: string): Promise<ResultadoAdmin<{ ok: true }>> {
  const esquema = z.object({ ok: z.literal(true) });
  return pedir(`/api/admin/ventas/${encodeURIComponent(id)}/cancelar`, esquema, {
    method: "POST",
  });
}

export function centavosAPesos(c: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(c / 100);
}

/** Fecha visible. Acepta ISO completo o la fecha simple `YYYY-MM-DD`. */
export function fechaMX(valor: string): string {
  const simple = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  const fecha = simple
    ? new Date(
        Number(simple[1]),
        Number(simple[2]) - 1,
        Number(simple[3])
      )
    : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return valor;
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

export function folioVisible(folio: number | null): string {
  return folio === null ? "Venta sin folio" : `#${String(folio).padStart(4, "0")}`;
}

export {
  generarInvitacion as solicitarResena,
  revocarInvitacion,
  urlInvitacion,
} from "./resenasAdmin";
