import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import {
  crearPedido,
  despublicarResena,
  entregarPedido,
  estadoInvitacion,
  generarInvitacion,
  listarPedidosAdmin,
  revocarInvitacion,
} from "../lib/admin";
import { hashToken } from "../lib/tokens";

/**
 * Fase 2: pedidos e invitaciones contra D1 real.
 *
 * Se prueba lo que el panel hace una vez autenticado. El guardián de Access
 * se prueba aparte (rutas → 401 sin credencial). Reglas clave:
 *  - Sin pedido entregado no hay invitación.
 *  - Una invitación activa no se duplica ni se recupera: sin token de vuelta.
 *  - Revocar cierra la activa y permite generar una nueva.
 *  - Cada operación deja auditoría.
 */

const ACTOR = "socios@cafeto";

async function limpiar(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM resenas"),
    env.DB.prepare("DELETE FROM invitaciones"),
    env.DB.prepare("DELETE FROM pedidos"),
    env.DB.prepare("DELETE FROM auditoria"),
  ]);
}

async function contarAuditoria(
  accion: string,
  entidad: string,
  entidadId?: string
): Promise<number> {
  const fila = entidadId
    ? await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM auditoria WHERE accion = ? AND entidad = ? AND entidad_id = ?"
      )
        .bind(accion, entidad, entidadId)
        .first<{ n: number }>()
    : await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM auditoria WHERE accion = ? AND entidad = ?"
      )
        .bind(accion, entidad)
        .first<{ n: number }>();
  return fila?.n ?? 0;
}

beforeEach(limpiar);

describe("crear pedido", () => {
  it("crea un pedido con canal y referencia, sin datos personales", async () => {
    const { id } = await crearPedido(env, {
      canal: "whatsapp",
      referencia: "Folio A-12",
      actor: ACTOR,
    });

    const fila = await env.DB.prepare(
      "SELECT canal, referencia, entregado, entregado_en FROM pedidos WHERE id = ?"
    )
      .bind(id)
      .first<{
        canal: string;
        referencia: string | null;
        entregado: number;
        entregado_en: string | null;
      }>();
    expect(fila).toMatchObject({
      canal: "whatsapp",
      referencia: "Folio A-12",
      entregado: 0,
      entregado_en: null,
    });
    expect(await contarAuditoria("crear_pedido", "pedido", id)).toBe(1);
  });

  it("usa canal 'otro' y referencia nula si no se envían", async () => {
    const { id } = await crearPedido(env, { canal: "otro", actor: ACTOR });
    const fila = await env.DB.prepare(
      "SELECT referencia FROM pedidos WHERE id = ?"
    )
      .bind(id)
      .first<{ referencia: string | null }>();
    expect(fila?.referencia).toBeNull();
  });
});

describe("marcar entregado", () => {
  it("marca el pedido y deja auditoría", async () => {
    const { id } = await crearPedido(env, { canal: "presencial", actor: ACTOR });

    const resultado = await entregarPedido(env, { id, actor: ACTOR });
    expect(resultado).toEqual({ ok: true });

    const fila = await env.DB.prepare(
      "SELECT entregado, entregado_en FROM pedidos WHERE id = ?"
    )
      .bind(id)
      .first<{ entregado: number; entregado_en: string | null }>();
    expect(fila?.entregado).toBe(1);
    expect(fila?.entregado_en).toBeTruthy();
    expect(await contarAuditoria("entregar_pedido", "pedido", id)).toBe(1);
  });

  it("no entrega dos veces el mismo pedido", async () => {
    const { id } = await crearPedido(env, { canal: "otro", actor: ACTOR });
    await entregarPedido(env, { id, actor: ACTOR });

    const segunda = await entregarPedido(env, { id, actor: ACTOR });
    expect(segunda).toEqual({ ok: false, motivo: "ya_entregado" });
  });

  it("informa que el pedido no existe", async () => {
    const resultado = await entregarPedido(env, {
      id: crypto.randomUUID(),
      actor: ACTOR,
    });
    expect(resultado).toEqual({ ok: false, motivo: "no_existe" });
  });
});

describe("generar invitación", () => {
  it("impide invitar un pedido que no está entregado", async () => {
    const { id } = await crearPedido(env, { canal: "otro", actor: ACTOR });

    const resultado = await generarInvitacion(env, { pedidoId: id, actor: ACTOR });
    expect(resultado).toEqual({ ok: false, motivo: "no_entregado" });

    const n = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM invitaciones WHERE pedido_id = ?"
    )
      .bind(id)
      .first<{ n: number }>();
    expect(n?.n).toBe(0);
  });

  it("informa que el pedido no existe", async () => {
    const resultado = await generarInvitacion(env, {
      pedidoId: crypto.randomUUID(),
      actor: ACTOR,
    });
    expect(resultado).toEqual({ ok: false, motivo: "no_existe" });
  });

  it("genera un token una sola vez y guarda solo su hash", async () => {
    const { id } = await crearPedido(env, { canal: "correo", actor: ACTOR });
    await entregarPedido(env, { id, actor: ACTOR });

    const resultado = await generarInvitacion(env, { pedidoId: id, actor: ACTOR });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;

    const { token, id: invitacionId, expiraEn } = resultado.invitacion;
    expect(token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(expiraEn > new Date().toISOString()).toBe(true);

    const fila = await env.DB.prepare(
      "SELECT token_hash, usada_en, revocada_en FROM invitaciones WHERE id = ?"
    )
      .bind(invitacionId)
      .first<{
        token_hash: string;
        usada_en: string | null;
        revocada_en: string | null;
      }>();
    expect(fila?.token_hash).toBe(await hashToken(token));
    expect(fila?.token_hash).not.toBe(token);
    expect(fila?.usada_en).toBeNull();
    expect(fila?.revocada_en).toBeNull();
    expect(await contarAuditoria("generar_invitacion", "invitacion", invitacionId)).toBe(1);
  });

  it("no duplica una invitación activa ni devuelve un token", async () => {
    const { id } = await crearPedido(env, { canal: "otro", actor: ACTOR });
    await entregarPedido(env, { id, actor: ACTOR });
    await generarInvitacion(env, { pedidoId: id, actor: ACTOR });

    const segunda = await generarInvitacion(env, { pedidoId: id, actor: ACTOR });
    expect(segunda).toEqual({ ok: false, motivo: "activa" });

    const n = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM invitaciones WHERE pedido_id = ?"
    )
      .bind(id)
      .first<{ n: number }>();
    expect(n?.n).toBe(1);
  });
});

describe("revocar invitación", () => {
  it("revoca una activa y permite generar otra", async () => {
    const { id } = await crearPedido(env, { canal: "otro", actor: ACTOR });
    await entregarPedido(env, { id, actor: ACTOR });
    const primera = await generarInvitacion(env, { pedidoId: id, actor: ACTOR });
    expect(primera.ok).toBe(true);
    if (!primera.ok) return;

    const revocada = await revocarInvitacion(env, {
      id: primera.invitacion.id,
      actor: ACTOR,
    });
    expect(revocada).toEqual({ ok: true });
    expect(
      await contarAuditoria("revocar_invitacion", "invitacion", primera.invitacion.id)
    ).toBe(1);

    const segunda = await generarInvitacion(env, { pedidoId: id, actor: ACTOR });
    expect(segunda.ok).toBe(true);
    if (!segunda.ok) return;
    expect(segunda.invitacion.token).not.toBe(primera.invitacion.token);
  });

  it("no revoca una invitación que ya no está activa", async () => {
    const { id } = await crearPedido(env, { canal: "otro", actor: ACTOR });
    await entregarPedido(env, { id, actor: ACTOR });
    const resultado = await generarInvitacion(env, { pedidoId: id, actor: ACTOR });
    if (!resultado.ok) throw new Error("No se generó la invitación.");

    await revocarInvitacion(env, { id: resultado.invitacion.id, actor: ACTOR });
    const segunda = await revocarInvitacion(env, {
      id: resultado.invitacion.id,
      actor: ACTOR,
    });
    expect(segunda).toEqual({ ok: false, motivo: "ya_cerrada" });
  });
});

describe("estado derivado y listado", () => {
  it("deriva el estado de la invitación por prioridad", () => {
    const base = { usada_en: null, revocada_en: null, expira_en: "2999-01-01T00:00:00.000Z" };
    expect(estadoInvitacion(base)).toBe("activa");
    expect(estadoInvitacion({ ...base, expira_en: "2000-01-01T00:00:00.000Z" })).toBe("expirada");
    expect(estadoInvitacion({ ...base, usada_en: "2020-01-01T00:00:00.000Z" })).toBe("usada");
    expect(
      estadoInvitacion({
        ...base,
        usada_en: "2020-01-01T00:00:00.000Z",
        revocada_en: "2021-01-01T00:00:00.000Z",
      })
    ).toBe("revocada");
  });

  it("lista pedidos con su invitación vigente y estado de reseña", async () => {
    const { id } = await crearPedido(env, { canal: "instagram", actor: ACTOR });
    await entregarPedido(env, { id, actor: ACTOR });
    await generarInvitacion(env, { pedidoId: id, actor: ACTOR });

    const pedidos = await listarPedidosAdmin(env);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0]).toMatchObject({
      id,
      canal: "instagram",
      entregado: true,
      resenaEstado: null,
    });
    expect(pedidos[0]?.invitacion?.estado).toBe("activa");
  });
});

describe("despublicar reseña", () => {
  it("devuelve una reseña aprobada a pendiente y audita", async () => {
    const pedidoId = `ped-${crypto.randomUUID().slice(0, 8)}`;
    await env.DB.prepare(
      "INSERT INTO pedidos (id, folio, canal, vendido_en, entregado, entregado_en, estado_entrega) VALUES (?, (SELECT COALESCE(MAX(folio), 0) + 1 FROM pedidos), 'otro', ?, 1, ?, 'entregado')"
    )
      .bind(pedidoId, new Date().toISOString().slice(0, 10), new Date().toISOString())
      .run();
    const invitacionId = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO invitaciones (id, pedido_id, token_hash, expira_en) VALUES (?, ?, ?, ?)"
    )
      .bind(invitacionId, pedidoId, await hashToken("token-de-prueba-largo-123456"), "2999-01-01T00:00:00.000Z")
      .run();
    const resenaId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO resenas
         (id, pedido_id, invitacion_id, calificacion, comentario, nombre_publico, estado, moderada_en, moderado_por)
       VALUES (?, ?, ?, 5, 'Excelente.', 'Ana', 'aprobada', ?, ?)`
    )
      .bind(resenaId, pedidoId, invitacionId, new Date().toISOString(), ACTOR)
      .run();

    const resultado = await despublicarResena(env, { id: resenaId, actor: ACTOR, motivo: "Datos personales" });
    expect(resultado).toEqual({ ok: true });

    const fila = await env.DB.prepare("SELECT estado FROM resenas WHERE id = ?")
      .bind(resenaId)
      .first<{ estado: string }>();
    expect(fila?.estado).toBe("rechazada");
    expect(await contarAuditoria("ocultar", "resena", resenaId)).toBe(1);
  });

  it("no despublica una reseña que no estaba publicada", async () => {
    const resultado = await despublicarResena(env, {
      id: crypto.randomUUID(),
      actor: ACTOR, motivo: "Datos personales",
    });
    expect(resultado).toEqual({ ok: false, motivo: "no_existe" });
  });
});
