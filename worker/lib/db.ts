import { hashToken } from "./tokens";

/**
 * Acceso a D1. Todas las consultas usan parámetros ligados (`?`), nunca
 * interpolación de cadenas: es la defensa contra inyección SQL.
 */

export interface ResultadoConsumo {
  ok: boolean;
  id?: string;
  motivo?: "invitacion_invalida" | "ya_resenado";
  error?: boolean;
}

interface Agregado {
  total: number;
  promedio: number;
}

/** Reseñas aprobadas + promedio real calculado solo con esas filas. */
export async function listarResenasAprobadas(env: EnvLike) {
  const resultados = await env.DB.batch([
    env.DB.prepare(
      `SELECT COUNT(*) AS total, COALESCE(AVG(calificacion), 0) AS promedio
       FROM resenas WHERE estado = 'aprobada'`
    ),
    env.DB.prepare(
      `SELECT r.id, r.calificacion, r.comentario, r.nombre_publico, r.creada_en,
         CASE WHEN i.pedido_id = r.pedido_id AND i.usada_en IS NOT NULL
           AND p.estado_entrega != 'cancelado' THEN 1 ELSE 0 END AS verificada
       FROM resenas r JOIN invitaciones i ON i.id = r.invitacion_id
       JOIN pedidos p ON p.id = r.pedido_id WHERE r.estado = 'aprobada'
       ORDER BY r.creada_en DESC LIMIT 50`
    ),
  ]);

  const agregado = resultados[0];
  const lista = resultados[1];
  if (!agregado || !lista) return { total: 0, promedio: 0, filas: [] };

  const fila = (agregado.results?.[0] ?? { total: 0, promedio: 0 }) as Agregado;
  const filas = (lista.results ?? []) as FilaResenaAprobadaLike[];

  return {
    total: fila.total ?? 0,
    promedio: Number((fila.promedio ?? 0).toFixed(1)),
    filas,
  };
}

/**
 * Comprueba una invitación sin consumirla. Abrir la página no gasta el
 * enlace: solo la entrega de la reseña lo consume.
 */
export async function validarInvitacion(env: EnvLike, token: string) {
  const hash = await hashToken(token);
  const fila = await env.DB.prepare(
    `SELECT i.usada_en, i.revocada_en, i.expira_en, p.entregado, p.estado_entrega, r.id AS resena_id
     FROM invitaciones i JOIN pedidos p ON p.id = i.pedido_id LEFT JOIN resenas r ON r.pedido_id = p.id
     WHERE i.token_hash = ?`
  )
    .bind(hash)
    .first<{
      resena_id: string | null;
      usada_en: string | null;
      revocada_en: string | null;
      expira_en: string;
      entregado: number | null;
      estado_entrega: string | null;
    }>();

  if (!fila) return { valida: false as const, motivo: "no_existe" as const };
  if (fila.revocada_en) return { valida: false as const, motivo: "revocada" as const };
  if (fila.usada_en || fila.resena_id) return { valida: false as const, motivo: "usada" as const };
  if (fila.estado_entrega === "cancelado" || (fila.estado_entrega !== "entregado" && !fila.entregado)) {
    return { valida: false as const, motivo: "no_entregado" as const };
  }
  if (fila.expira_en <= new Date().toISOString())
    return { valida: false as const, motivo: "expirada" as const };

  return { valida: true as const, motivo: "ok" as const };
}

/**
 * Consume la invitación e inserta la reseña en una sola transacción.
 *
 * La inserción selecciona la fila de la invitación usando el mismo valor de
 * `usada_en` que acaba de escribir el UPDATE. Si la invitación no era válida,
 * el UPDATE afecta 0 filas y la inserción no selecciona nada: no hay reseña.
 * Si el pedido ya tenía reseña, el índice UNIQUE(pedido_id) hace fallar el
 * lote y la transacción revierte también el consumo: no queda estado parcial.
 */
export async function crearResenaAtomica(
  env: EnvLike,
  datos: {
    token: string;
    calificacion: number;
    comentario: string;
    nombrePublico: string;
    googleSub?: string;
    consentimientoVersion?: string;
  }
): Promise<ResultadoConsumo> {
  const id = crypto.randomUUID();
  const ahora = new Date().toISOString();
  const hash = await hashToken(datos.token);

  const consumo = env.DB.prepare(
    `UPDATE invitaciones SET usada_en = ?, consumo_id = ?
     WHERE token_hash = ?
       AND usada_en IS NULL
       AND revocada_en IS NULL
       AND expira_en > ?
       AND pedido_id IN (SELECT id FROM pedidos WHERE estado_entrega != 'cancelado' AND (entregado = 1 OR estado_entrega = 'entregado'))`
  ).bind(ahora, id, hash, ahora);

  const insercion = env.DB.prepare(
    `INSERT INTO resenas
       (id, pedido_id, invitacion_id, calificacion, comentario, nombre_publico, estado, creada_en, identificacion, autor_google_sub, consentimiento_version, consentimiento_en)
     SELECT ?, i.pedido_id, i.id, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?
     FROM invitaciones i
     WHERE i.token_hash = ? AND i.consumo_id = ?`
  ).bind(id, datos.calificacion, datos.comentario, datos.nombrePublico, ahora, datos.googleSub ? "google" : "invitado", datos.googleSub ?? null, datos.consentimientoVersion ?? null, datos.consentimientoVersion ? ahora : null, hash, id);

  let consumidas: number;
  let insertadas: number;
  try {
    const resultados = await env.DB.batch([consumo, insercion]);
    consumidas = resultados[0]?.meta.changes ?? 0;
    insertadas = resultados[1]?.meta.changes ?? 0;
  } catch (error) {
    if (!/UNIQUE constraint failed/i.test(String(error))) return { ok: false, error: true };
    // Choque con UNIQUE(pedido_id): el pedido ya tenía reseña.
    return { ok: false, motivo: "ya_resenado" };
  }

  if (consumidas === 0) return { ok: false, motivo: "invitacion_invalida" };
  if (insertadas === 0) return { ok: false, motivo: "ya_resenado" };
  return { ok: true, id };
}

/* --- Tipos internos mínimos para no acoplar a los tipos del Worker. --- */

interface EnvLike {
  DB: D1Database;
}

interface FilaResenaAprobadaLike {
  id: string;
  calificacion: number;
  comentario: string;
  nombre_publico: string;
  creada_en: string;
  verificada: number;
}
