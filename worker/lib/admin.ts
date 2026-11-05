import type {
  FilaResenaAdmin,
  ResenaAdmin,
  ResumenAdmin,
  EstadoResena,
  FilaPedidoAdmin,
  PedidoAdmin,
  InvitacionGenerada,
} from "../tipos";
import { hoyLocal } from "./fechas";
import { estadoInvitacion } from "./invitaciones";
import { generarToken, hashToken } from "./tokens";

export { estadoInvitacion } from "./invitaciones";

/**
 * Acceso del panel de moderación a D1.
 *
 * Todo lo que hay aquí es interno: las filas traen el correo de quien moderó
 * y el pedido de origen, y por eso ninguna de estas funciones se llama desde
 * las rutas públicas. El guardián de Access vive en `rutas/admin.ts`.
 */

export type EstadoModeracion = "aprobada" | "rechazada";

export interface ResultadoModeracion {
  ok: boolean;
  motivo?: "no_existe" | "ya_estaba" | "motivo_requerido";
}

export interface ResultadoPedido {
  ok: boolean;
  motivo?: "no_existe" | "ya_entregado" | "no_entregado";
}

/** Días de vigencia por defecto de una invitación si el entorno no lo fija. */
const TTL_DIAS_DEFECTO = 90;
const TTL_DIAS_MIN = 1;
const TTL_DIAS_MAX = 365;

/** Fila de `SELECT estado AS e, COUNT(*) AS n ... GROUP BY estado`. */
interface FilaConteo {
  e: string;
  n: number;
}

/** Conteo por estado para la cabecera del panel. */
export async function resumenAdmin(env: EnvLike): Promise<ResumenAdmin> {
  const filas = await env.DB.prepare(
    "SELECT estado AS e, COUNT(*) AS n FROM resenas GROUP BY estado"
  ).all();
  const conteos = (filas.results ?? []) as unknown as FilaConteo[];

  const base: ResumenAdmin = { pendientes: 0, aprobadas: 0, rechazadas: 0 };
  for (const fila of conteos) {
    if (fila.e === "pendiente") base.pendientes += fila.n;
    if (fila.e === "aprobada") base.aprobadas += fila.n;
    if (fila.e === "rechazada") base.rechazadas += fila.n;
  }
  return base;
}

/**
 * Reseñas completas, opcionalmente filtradas por estado, de la más reciente
 * a la más antigua. Es la única consulta que une `resenas` con `pedidos`.
 *
 * Incluye el contexto mínimo de la venta para que moderación no tenga que
 * mostrar UUIDs: folio, fecha, entrega y resumen de productos.
 */
export async function listarResenasAdmin(
  env: EnvLike,
  estado?: EstadoResena, pedidoId?: string
): Promise<ResenaAdmin[]> {
  const conFiltro = estado !== undefined;
  const consulta = `
    SELECT r.id, r.calificacion, r.comentario, r.nombre_publico,
           r.estado, r.motivo_rechazo, r.creada_en,
           r.moderada_en, r.moderado_por, r.identificacion, r.publicada_en,
           r.consentimiento_version, r.consentimiento_en,
           CASE WHEN i.pedido_id = r.pedido_id AND i.usada_en IS NOT NULL AND p.estado_entrega != 'cancelado' THEN 1 ELSE 0 END AS verificada,
           p.canal, p.id AS pedido_id, p.folio,
           COALESCE(p.vendido_en, substr(p.creado_en, 1, 10)) AS vendido_en,
           p.estado_entrega
    FROM resenas r JOIN pedidos p ON p.id = r.pedido_id JOIN invitaciones i ON i.id = r.invitacion_id
    ${conFiltro ? "WHERE r.estado = ?" : "WHERE 1=1"} ${pedidoId ? "AND r.pedido_id = ?" : ""}
    ORDER BY r.creada_en DESC
    LIMIT 200`;
  const sentencia = env.DB.prepare(consulta).bind(...(conFiltro ? [estado!] : []), ...(pedidoId ? [pedidoId] : []));
  const filas = (await sentencia.all()).results ?? [];
  const detalles = filas as unknown as FilaResenaAdmin[];
  const resumenes = await resumenItemsPorPedido(
    env,
    detalles.map((fila) => fila.pedido_id)
  );

  return detalles.map((fila) => ({
    id: fila.id,
    identificacion: fila.identificacion,
    verificada: Boolean(fila.verificada),
    publicadaEn: fila.publicada_en,
    consentimientoVersion: fila.consentimiento_version,
    consentimientoEn: fila.consentimiento_en,
    calificacion: fila.calificacion,
    comentario: fila.comentario,
    nombrePublico: fila.nombre_publico,
    estado: fila.estado as EstadoResena,
    motivoRechazo: fila.motivo_rechazo,
    creadaEn: fila.creada_en,
    moderadaEn: fila.moderada_en,
    moderadoPor: fila.moderado_por,
    canal: fila.canal,
    pedidoId: fila.pedido_id,
    folio: fila.folio,
    vendidoEn: fila.vendido_en ?? fila.creada_en.slice(0, 10),
    itemsResumen: resumenes.get(fila.pedido_id) ?? "",
    estadoEntrega: fila.estado_entrega as ResenaAdmin["estadoEntrega"],
  }));
}

interface FilaResumenItems {
  pedido_id: string;
  cantidad: number;
  nombre_producto: string;
  nombre_presentacion: string;
  orden: number;
}

/** Resumen corto de productos por venta, sin caer en N+1. */
async function resumenItemsPorPedido(
  env: EnvLike,
  pedidoIds: string[]
): Promise<Map<string, string>> {
  const unicos = [...new Set(pedidoIds)];
  if (unicos.length === 0) return new Map();

  const lineas = new Map<string, FilaResumenItems[]>();
  for (let i = 0; i < unicos.length; i += 50) {
    const lote = unicos.slice(i, i + 50);
    const marcadores = lote.map(() => "?").join(",");
    const resultado = await env.DB.prepare(
      `SELECT pedido_id, cantidad, nombre_producto, nombre_presentacion, orden
       FROM pedido_items
       WHERE pedido_id IN (${marcadores})
       ORDER BY pedido_id, orden, creado_en`
    )
      .bind(...lote)
      .all();
    const filas = (resultado.results ?? []) as unknown as FilaResumenItems[];
    for (const fila of filas) {
      const actuales = lineas.get(fila.pedido_id) ?? [];
      actuales.push(fila);
      lineas.set(fila.pedido_id, actuales);
    }
  }

  const resumenes = new Map<string, string>();
  for (const [pedidoId, filas] of lineas) {
    const textos = filas.map(
      (fila) =>
        `${fila.cantidad} × ${fila.nombre_producto} · ${fila.nombre_presentacion}`
    );
    const visibles = textos.slice(0, 2).join(" · ");
    const resto = textos.length > 2 ? ` · +${textos.length - 2} más` : "";
    resumenes.set(pedidoId, visibles + resto);
  }
  return resumenes;
}

/**
 * Publica, oculta con motivo o republica sin modificar la opinión.
 * La decisión y su auditoría son atómicas; repetir el mismo estado no audita.
 */
export async function moderarResena(
  env: EnvLike,
  datos: {
    id: string;
    estado: EstadoModeracion;
    actor: string;
    motivo?: string | null;
  }
): Promise<ResultadoModeracion> {
  const ahora = new Date().toISOString();
  const motivo = datos.motivo?.trim() || null;
  if (datos.estado === "rechazada" && !motivo) return { ok: false, motivo: "motivo_requerido" };
  const evento = crypto.randomUUID();
  const resultados = await env.DB.batch([
    env.DB.prepare(`UPDATE resenas SET estado = ?, moderada_en = ?, moderado_por = ?, motivo_rechazo = ?, moderacion_id = ?,
      publicada_en = CASE WHEN ? = 'aprobada' THEN COALESCE(publicada_en, ?) ELSE publicada_en END
      WHERE id = ? AND estado != ?`).bind(datos.estado, ahora, datos.actor, datos.estado === "rechazada" ? motivo : null, evento, datos.estado, ahora, datos.id, datos.estado),
    env.DB.prepare(`INSERT INTO auditoria (id, actor, accion, entidad, entidad_id, detalle)
      SELECT ?, ?, ?, 'resena', id, ? FROM resenas WHERE id = ? AND moderacion_id = ?`)
      .bind(evento, datos.actor, datos.estado === "aprobada" ? "aprobar" : "ocultar", JSON.stringify({ motivo, estado: datos.estado }), datos.id, evento),
  ]);
  if (!resultados[0]?.meta.changes) {
    const existe = await env.DB.prepare("SELECT id FROM resenas WHERE id = ?").bind(datos.id).first();
    return { ok: false, motivo: existe ? "ya_estaba" : "no_existe" };
  }
  return { ok: true };
}

/* --- Pedidos e invitaciones --- */

/** Días de vigencia configurados, acotados a un rango sensato. */
function ttlDias(valor: string | undefined): number {
  const n = Number(valor);
  if (!valor || !Number.isFinite(n)) return TTL_DIAS_DEFECTO;
  return Math.min(TTL_DIAS_MAX, Math.max(TTL_DIAS_MIN, Math.trunc(n)));
}

/**
 * Crea un pedido sin datos personales y deja auditoría en el mismo lote.
 * `referencia` es una nota interna opcional (folio, lote), nunca del cliente.
 */
export async function crearPedido(
  env: EnvLike,
  datos: { canal: string; referencia?: string; actor: string }
): Promise<{ ok: true; id: string }> {
  const id = crypto.randomUUID();
  const referencia = datos.referencia?.trim() || null;

  const insercion = env.DB.prepare(
    `INSERT INTO pedidos (id, folio, canal, referencia, vendido_en, estado_entrega)
     VALUES (?, (SELECT COALESCE(MAX(folio), 0) + 1 FROM pedidos), ?, ?, ?, 'por_preparar')`
  ).bind(id, datos.canal, referencia, hoyLocal());

  const registra = env.DB.prepare(
    `INSERT INTO auditoria (id, actor, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, 'crear_pedido', 'pedido', ?, ?)`
  ).bind(
    crypto.randomUUID(),
    datos.actor,
    id,
    JSON.stringify({ canal: datos.canal, referencia })
  );

  await env.DB.batch([insercion, registra]);
  return { ok: true, id };
}

/**
 * Lista pedidos con el estado de su invitación vigente y de su reseña.
 * La invitación mostrada es la más reciente (por `creada_en`); las que ya no
 * aplican (revocadas, usadas, expiradas) siguen contando para el estado.
 */
export async function listarPedidosAdmin(env: EnvLike): Promise<PedidoAdmin[]> {
  const filas = await env.DB.prepare(
    `SELECT p.id, p.canal, p.referencia, p.entregado, p.entregado_en,
            p.creado_en,
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
     LEFT JOIN resenas r ON r.pedido_id = p.id
     ORDER BY p.creado_en DESC
     LIMIT 200`
  ).all();

  const filasCrudas = (filas.results ?? []) as unknown as FilaPedidoAdmin[];

  return filasCrudas.map((fila) => {
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
      canal: fila.canal,
      referencia: fila.referencia,
      entregado: fila.entregado === 1,
      entregadoEn: fila.entregado_en,
      creadoEn: fila.creado_en,
      invitacion,
      resenaEstado: (fila.resena_estado as EstadoResena | null) ?? null,
    };
  });
}

/**
 * Marca un pedido como entregado. Solo la primera vez: si ya estaba
 * entregado el UPDATE afecta 0 filas y se informa sin tocar nada. La
 * auditoría va en el mismo lote.
 */
export async function entregarPedido(
  env: EnvLike,
  datos: { id: string; actor: string }
): Promise<ResultadoPedido> {
  const ahora = new Date().toISOString();

  const actualiza = env.DB.prepare(
    `UPDATE pedidos
     SET entregado = 1, entregado_en = ?, estado_entrega = 'entregado', actualizado_en = ?
     WHERE id = ? AND entregado = 0`
  ).bind(ahora, ahora, datos.id);

  const registra = env.DB.prepare(
    `INSERT INTO auditoria (id, actor, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, 'entregar_pedido', 'pedido', ?, NULL)`
  ).bind(crypto.randomUUID(), datos.actor, datos.id);

  const resultados = await env.DB.batch([actualiza, registra]);
  const cambiadas = resultados[0]?.meta.changes ?? 0;

  if (cambiadas === 0) {
    const existe = await env.DB.prepare(
      "SELECT entregado, estado_entrega FROM pedidos WHERE id = ?"
    )
      .bind(datos.id)
      .first<{ entregado: number; estado_entrega: string }>();
    if (!existe) return { ok: false, motivo: "no_existe" };
    return { ok: false, motivo: "ya_entregado" };
  }

  return { ok: true };
}

/**
 * Genera la invitación de un pedido entregado.
 *
 * Reglas:
 *  - El pedido debe existir y estar entregado (`no_existe` / `no_entregado`).
 *  - Si ya hay una invitación ACTIVA, no se crea otra: se devuelve
 *    `{ ok: false, motivo: "activa" }` y NO se expone ningún token, porque
 *    el original solo vive en el hash. Para obtener un enlace nuevo hay que
 *    revocar y volver a generar.
 *
 * El token se devuelve únicamente aquí y no se guarda en texto plano.
 */
export async function generarInvitacion(
  env: EnvLike,
  datos: {
    pedidoId: string;
    actor: string;
    ttlDias?: string;
    ahora?: string;
  }
): Promise<
  | { ok: true; invitacion: InvitacionGenerada }
  | { ok: false; motivo: "no_existe" | "no_entregado" | "activa" | "ya_resenado" }
> {
  const ahora = datos.ahora ?? new Date().toISOString();

  const pedido = await env.DB.prepare(
    "SELECT entregado, estado_entrega FROM pedidos WHERE id = ?"
  )
    .bind(datos.pedidoId)
    .first<{ entregado: number; estado_entrega: string }>();
  if (!pedido) return { ok: false, motivo: "no_existe" };
  if (pedido.estado_entrega === "cancelado" || (pedido.entregado !== 1 && pedido.estado_entrega !== "entregado")) return { ok: false, motivo: "no_entregado" };

  const recibida = await env.DB.prepare("SELECT id FROM resenas WHERE pedido_id = ?").bind(datos.pedidoId).first();
  if (recibida) return { ok: false, motivo: "ya_resenado" };

  const activa = await env.DB.prepare(
    `SELECT id FROM invitaciones
     WHERE pedido_id = ?
       AND usada_en IS NULL
       AND revocada_en IS NULL
       AND expira_en > ?
     LIMIT 1`
  )
    .bind(datos.pedidoId, ahora)
    .first<{ id: string }>();
  if (activa) return { ok: false, motivo: "activa" };

  const id = crypto.randomUUID();
  const token = generarToken();
  const hash = await hashToken(token);
  const expiraEn = new Date(
    Date.parse(ahora) + ttlDias(datos.ttlDias ?? env.TOKEN_TTL_DIAS) * 86_400_000
  ).toISOString();

  const insercion = env.DB.prepare(
    `INSERT INTO invitaciones (id, pedido_id, token_hash, expira_en, creada_en, creada_por)
     SELECT ?, p.id, ?, ?, ?, ? FROM pedidos p WHERE p.id = ?
       AND p.estado_entrega != 'cancelado' AND (p.entregado = 1 OR p.estado_entrega = 'entregado')
       AND NOT EXISTS (SELECT 1 FROM resenas WHERE pedido_id = p.id)`
  ).bind(id, hash, expiraEn, ahora, datos.actor, datos.pedidoId);

  const registra = env.DB.prepare(
    `INSERT INTO auditoria (id, actor, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, 'generar_invitacion', 'invitacion', ?, ?)`
  ).bind(
    crypto.randomUUID(),
    datos.actor,
    id,
    JSON.stringify({ pedidoId: datos.pedidoId, expiraEn })
  );

  try {
    const resultado = await env.DB.batch([
      env.DB.prepare("UPDATE invitaciones SET revocada_en = ? WHERE pedido_id = ? AND usada_en IS NULL AND revocada_en IS NULL AND expira_en <= ?").bind(ahora, datos.pedidoId, ahora),
      insercion, registra,
    ]);
    if (!resultado[1]?.meta.changes) return { ok: false, motivo: "no_entregado" };
  } catch (error) {
    if (/UNIQUE constraint failed/i.test(String(error))) return { ok: false, motivo: "activa" };
    throw error;
  }

  return {
    ok: true,
    invitacion: { id, pedidoId: datos.pedidoId, token, expiraEn },
  };
}

/**
 * Revoca una invitación activa. Solo tiene efecto si sigue libre: si ya fue
 * usada o revocada, el UPDATE afecta 0 filas. Auditoría en el mismo lote.
 */
export async function revocarInvitacion(
  env: EnvLike,
  datos: { id: string; actor: string }
): Promise<{ ok: boolean; motivo?: "no_existe" | "ya_cerrada" }> {
  const ahora = new Date().toISOString();

  const actualiza = env.DB.prepare(
    `UPDATE invitaciones SET revocada_en = ?
     WHERE id = ? AND usada_en IS NULL AND revocada_en IS NULL`
  ).bind(ahora, datos.id);

  const registra = env.DB.prepare(
    `INSERT INTO auditoria (id, actor, accion, entidad, entidad_id, detalle)
     VALUES (?, ?, 'revocar_invitacion', 'invitacion', ?, NULL)`
  ).bind(crypto.randomUUID(), datos.actor, datos.id);

  const resultados = await env.DB.batch([actualiza, registra]);
  const cambiadas = resultados[0]?.meta.changes ?? 0;

  if (cambiadas === 0) {
    const existe = await env.DB.prepare(
      "SELECT 1 AS n FROM invitaciones WHERE id = ?"
    )
      .bind(datos.id)
      .first<{ n: number }>();
    return { ok: false, motivo: existe ? "ya_cerrada" : "no_existe" };
  }

  return { ok: true };
}

/**
 * Compatibilidad con el endpoint anterior: ocultar conserva la reseña y exige motivo.
 */
export async function despublicarResena(
  env: EnvLike,
  datos: { id: string; actor: string; motivo?: string }
): Promise<ResultadoModeracion> {
  return moderarResena(env, { ...datos, estado: "rechazada" });
}

/* --- Tipos internos mínimos para no acoplar a los tipos del Worker. --- */

interface EnvLike {
  DB: D1Database;
  TOKEN_TTL_DIAS?: string;
}
