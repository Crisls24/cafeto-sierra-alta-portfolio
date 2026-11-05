import { z } from "zod";

import type { EstadoPanel } from "../data/resenas";

/**
 * Cliente del panel de moderación.
 *
 * Todas las rutas viven bajo `/api/admin/` y exigen una sesión de Cloudflare
 * Access; cualquiera de ellas puede responder 401, y el panel lo distingue
 * para pedir reautenticarse en lugar de inventar un error de red. Los
 * esquemas de aquí son el contrato del Worker (`worker/lib/admin.ts`)
 * duplicado a propósito en runtime, igual que en `src/lib/resenas.ts`.
 */

export const esquemaResenaAdmin = z.object({
  id: z.string().min(1),
  identificacion: z.enum(["invitado", "google"]), verificada: z.boolean(),
  publicadaEn: z.string().nullable(), consentimientoVersion: z.string().nullable(), consentimientoEn: z.string().nullable(),
  calificacion: z.number().int().min(1).max(5),
  comentario: z.string(),
  nombrePublico: z.string().min(1),
  estado: z.enum(["pendiente", "aprobada", "rechazada"]),
  motivoRechazo: z.string().nullable(),
  creadaEn: z.string().min(1),
  moderadaEn: z.string().nullable(),
  moderadoPor: z.string().nullable(),
  canal: z.string(),
  pedidoId: z.string().min(1),
  folio: z.number().int().nullable(),
  vendidoEn: z.string().min(10),
  itemsResumen: z.string(),
  estadoEntrega: z.enum(["por_preparar", "listo", "entregado", "cancelado"]),
});

export const esquemaResumenPanel = z.object({
  pendientes: z.number().int().min(0),
  aprobadas: z.number().int().min(0),
  rechazadas: z.number().int().min(0),
});

export const esquemaEstadoInvitacion = z.enum([
  "activa",
  "usada",
  "revocada",
  "expirada",
]);

export const esquemaInvitacionPedido = z.object({
  id: z.string().min(1),
  estado: esquemaEstadoInvitacion,
  creadaEn: z.string().min(1),
  expiraEn: z.string().min(1),
});

export const esquemaPedidoAdmin = z.object({
  id: z.string().min(1),
  canal: z.string(),
  referencia: z.string().nullable(),
  entregado: z.boolean(),
  entregadoEn: z.string().nullable(),
  creadoEn: z.string().min(1),
  invitacion: esquemaInvitacionPedido.nullable(),
  resenaEstado: z.enum(["pendiente", "aprobada", "rechazada"]).nullable(),
});

export const esquemaInvitacionGenerada = z.object({
  ok: z.literal(true),
  id: z.string().min(1),
  token: z.string().min(20),
  url: z.string().url(),
  expiraEn: z.string().min(1),
});

export type ResenaAdmin = z.infer<typeof esquemaResenaAdmin>;
export type ResumenPanel = z.infer<typeof esquemaResumenPanel>;
export type EstadoInvitacion = z.infer<typeof esquemaEstadoInvitacion>;
export type PedidoAdmin = z.infer<typeof esquemaPedidoAdmin>;
export type InvitacionGenerada = z.infer<typeof esquemaInvitacionGenerada>;

export type ResultadoPanel<T> =
  | { ok: true; datos: T }
  | { ok: false; noAutorizado: boolean; codigo?: string };

async function pedir<T>(
  url: string,
  esquema: z.ZodType<T>,
  init?: RequestInit
): Promise<ResultadoPanel<T>> {
  try {
    const respuesta = await fetch(url, {
      ...init,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...init?.headers },
    });
    if (respuesta.status === 401) return { ok: false, noAutorizado: true };
    if (!respuesta.ok) {
      // El Worker manda `{ error, codigo }`; el panel usa el código para
      // distinguir, por ejemplo, "ya existe una invitación activa".
      let codigo: string | undefined;
      try {
        const cuerpo = (await respuesta.json()) as { codigo?: unknown };
        if (typeof cuerpo.codigo === "string") codigo = cuerpo.codigo;
      } catch {
        // Sin cuerpo JSON válido no hay código; se trata como error genérico.
      }
      return { ok: false, noAutorizado: false, codigo };
    }
    return { ok: true, datos: esquema.parse(await respuesta.json()) };
  } catch {
    return { ok: false, noAutorizado: false };
  }
}

export function leerResumenPanel(): Promise<ResultadoPanel<ResumenPanel>> {
  return pedir("/api/admin/resumen", esquemaResumenPanel);
}

export function leerResenasPanel(
  estado: EstadoPanel, pedidoId?: string
): Promise<ResultadoPanel<ResenaAdmin[]>> {
  // El Worker responde `{ resenas: [...] }` (worker/rutas/admin.ts), igual
  // que `/resumen` responde su objeto: la lista siempre va envuelta.
  const esquema = z.object({ resenas: z.array(esquemaResenaAdmin) });
  return pedir(`/api/admin/resenas?estado=${encodeURIComponent(estado)}${pedidoId ? `&venta=${encodeURIComponent(pedidoId)}` : ""}`, esquema).then(
    (resultado) =>
      resultado.ok
        ? { ok: true, datos: resultado.datos.resenas }
        : resultado
  );
}

/**
 * Envía la decisión al Worker. Para rechazar va el motivo en el cuerpo;
 * aprobar no necesita cuerpo.
 */
export async function decidirResena(
  id: string,
  accion: "aprobada" | "rechazada",
  motivo?: string
): Promise<ResultadoPanel<{ ok: true }>> {
  const esquema = z.object({ ok: z.literal(true) });
  const url = `/api/admin/resenas/${encodeURIComponent(id)}/${accion === "aprobada" ? "aprobar" : "rechazar"}`;
  const cuerpo = accion === "rechazada" ? { motivo: motivo ?? "" } : undefined;
  return pedir(url, esquema, {
    method: "POST",
    headers: cuerpo ? { "Content-Type": "application/json" } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
}

/**
 * Oculta una reseña con motivo interno, sin borrarla.
 */
export function despublicarResena(id: string, motivo: string): Promise<ResultadoPanel<{ ok: true }>> {
  const esquema = z.object({ ok: z.literal(true) });
  return pedir(`/api/admin/resenas/${encodeURIComponent(id)}/despublicar`, esquema, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ motivo }),
  });
}

/* --- Pedidos e invitaciones --- */

export function listarPedidosPanel(): Promise<ResultadoPanel<PedidoAdmin[]>> {
  const esquema = z.object({ pedidos: z.array(esquemaPedidoAdmin) });
  return pedir("/api/admin/pedidos", esquema).then((resultado) =>
    resultado.ok ? { ok: true, datos: resultado.datos.pedidos } : resultado
  );
}

export function crearPedido(
  canal: string,
  referencia?: string
): Promise<ResultadoPanel<{ ok: true; id: string }>> {
  const esquema = z.object({ ok: z.literal(true), id: z.string().min(1) });
  const cuerpo = { canal, referencia: referencia?.trim() || undefined };
  return pedir("/api/admin/pedidos", esquema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
}

export function entregarPedido(id: string): Promise<ResultadoPanel<{ ok: true; id: string }>> {
  const esquema = z.object({ ok: z.literal(true), id: z.string().min(1) });
  return pedir(`/api/admin/pedidos/${encodeURIComponent(id)}/entregar`, esquema, {
    method: "POST",
  });
}

/**
 * Genera la invitación. Si ya existe una activa, el Worker responde 409 con
 * código `invitacion_activa` y sin token: el panel ofrece revocar y generar
 * de nuevo. El token solo llega en el resultado exitoso.
 */
export function generarInvitacion(
  pedidoId: string
): Promise<ResultadoPanel<InvitacionGenerada>> {
  return pedir(
    `/api/admin/pedidos/${encodeURIComponent(pedidoId)}/invitacion`,
    esquemaInvitacionGenerada,
    { method: "POST" }
  );
}

export function revocarInvitacion(
  id: string
): Promise<ResultadoPanel<{ ok: true; id: string }>> {
  const esquema = z.object({ ok: z.literal(true), id: z.string().min(1) });
  return pedir(`/api/admin/invitaciones/${encodeURIComponent(id)}/revocar`, esquema, {
    method: "POST",
  });
}

/** Ruta pública del formulario de reseña para un token. */
export function urlInvitacion(token: string): string {
  return `${typeof window !== "undefined" ? window.location.origin : ""}/resena/${encodeURIComponent(token)}`;
}

/** Fecha y hora legibles; vacío si el dato no es una fecha válida. */
export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(fecha);
}
