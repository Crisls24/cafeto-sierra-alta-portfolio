import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { crearResenaAtomica, validarInvitacion } from "../lib/db";
import { generarToken, hashToken } from "../lib/tokens";

/**
 * Reglas de negocio del consumo de invitaciones y de la creación de reseñas.
 *
 * Se prueban contra D1 real. Los casos de concurrencia son el motivo de este
 * archivo: dos peticiones simultáneas no pueden reutilizar una invitación ni
 * dejar un estado a medias.
 */

const DATOS = {
  calificacion: 5,
  comentario: "Café excelente y llegó a tiempo.",
  nombrePublico: "María G.",
};

function futuro(horas = 24): string {
  return new Date(Date.now() + horas * 3600_000).toISOString();
}

function pasado(horas = 1): string {
  return new Date(Date.now() - horas * 3600_000).toISOString();
}

async function limpiar(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM resenas"),
    env.DB.prepare("DELETE FROM invitaciones"),
    env.DB.prepare("DELETE FROM pedidos"),
    env.DB.prepare("DELETE FROM auditoria"),
  ]);
}

async function crearPedido(id: string, entregado: boolean): Promise<void> {
  const ahora = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO pedidos (id, folio, canal, vendido_en, entregado, entregado_en, estado_entrega) VALUES (?, (SELECT COALESCE(MAX(folio), 0) + 1 FROM pedidos), 'whatsapp', ?, ?, ?, ?)"
  )
    .bind(
      id,
      ahora.slice(0, 10),
      entregado ? 1 : 0,
      entregado ? ahora : null,
      entregado ? "entregado" : "por_preparar"
    )
    .run();
}

async function crearInvitacion(opciones: {
  token: string;
  pedidoId: string;
  expiraEn?: string;
  revocadaEn?: string | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  const hash = await hashToken(opciones.token);
  await env.DB.prepare(
    "INSERT INTO invitaciones (id, pedido_id, token_hash, expira_en, revocada_en) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(id, opciones.pedidoId, hash, opciones.expiraEn ?? futuro(), opciones.revocadaEn ?? null)
    .run();
  return id;
}

async function contarResenas(): Promise<number> {
  const fila = await env.DB.prepare("SELECT COUNT(*) AS n FROM resenas").first<{ n: number }>();
  return fila?.n ?? 0;
}

async function contarConsumidas(): Promise<number> {
  const fila = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM invitaciones WHERE usada_en IS NOT NULL"
  ).first<{ n: number }>();
  return fila?.n ?? 0;
}

beforeEach(limpiar);

describe("consumo de invitación y creación de reseña", () => {
  it("crea una reseña pendiente y consume la invitación", async () => {
    await crearPedido("ped-1", true);
    const token = generarToken();
    await crearInvitacion({ token, pedidoId: "ped-1" });

    const resultado = await crearResenaAtomica(env, { token, ...DATOS });

    expect(resultado.ok).toBe(true);
    expect(await contarResenas()).toBe(1);
    expect(await contarConsumidas()).toBe(1);

    const fila = await env.DB.prepare("SELECT estado FROM resenas").first<{ estado: string }>();
    expect(fila?.estado).toBe("pendiente");
  });

  it("no crea reseña si el pedido no está entregado", async () => {
    await crearPedido("ped-2", false);
    const token = generarToken();
    const idInv = await crearInvitacion({ token, pedidoId: "ped-2" });

    const resultado = await crearResenaAtomica(env, { token, ...DATOS });

    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe("invitacion_invalida");
    expect(await contarResenas()).toBe(0);
    const fila = await env.DB.prepare("SELECT usada_en FROM invitaciones WHERE id = ?")
      .bind(idInv)
      .first<{ usada_en: string | null }>();
    expect(fila?.usada_en).toBeNull();
  });

  it("no crea reseña si la invitación caducó", async () => {
    await crearPedido("ped-3", true);
    const token = generarToken();
    const idInv = await crearInvitacion({ token, pedidoId: "ped-3", expiraEn: pasado() });

    const resultado = await crearResenaAtomica(env, { token, ...DATOS });

    expect(resultado.ok).toBe(false);
    expect(await contarResenas()).toBe(0);
    const fila = await env.DB.prepare("SELECT usada_en FROM invitaciones WHERE id = ?")
      .bind(idInv)
      .first<{ usada_en: string | null }>();
    expect(fila?.usada_en).toBeNull();
  });

  it("no crea reseña si la invitación fue revocada", async () => {
    await crearPedido("ped-4", true);
    const token = generarToken();
    await crearInvitacion({ token, pedidoId: "ped-4", revocadaEn: new Date().toISOString() });

    const resultado = await crearResenaAtomica(env, { token, ...DATOS });

    expect(resultado.ok).toBe(false);
    expect(await contarResenas()).toBe(0);
    expect(await contarConsumidas()).toBe(0);
  });

  it("rechaza un segundo envío con el mismo token", async () => {
    await crearPedido("ped-5", true);
    const token = generarToken();
    await crearInvitacion({ token, pedidoId: "ped-5" });

    const primero = await crearResenaAtomica(env, { token, ...DATOS });
    const segundo = await crearResenaAtomica(env, { token, ...DATOS });

    expect(primero.ok).toBe(true);
    expect(segundo.ok).toBe(false);
    expect(await contarResenas()).toBe(1);
  });

  it("valida el token sin consumirlo", async () => {
    await crearPedido("ped-6", true);
    const token = generarToken();
    await crearInvitacion({ token, pedidoId: "ped-6" });

    const primera = await validarInvitacion(env, token);
    const segunda = await validarInvitacion(env, token);

    expect(primera.valida).toBe(true);
    expect(segunda.valida).toBe(true);
    expect(await contarConsumidas()).toBe(0);
  });
});

describe("concurrencia", () => {
  it("con el mismo token, una sola petición gana", async () => {
    await crearPedido("ped-c1", true);
    const token = generarToken();
    await crearInvitacion({ token, pedidoId: "ped-c1" });

    const intentos = await Promise.all(
      Array.from({ length: 8 }, () => crearResenaAtomica(env, { token, ...DATOS }))
    );

    const exitosos = intentos.filter((r) => r.ok);
    expect(exitosos).toHaveLength(1);
    expect(await contarResenas()).toBe(1);
    expect(await contarConsumidas()).toBe(1);
  });

  it("impide dos invitaciones abiertas para la misma compra", async () => {
    await crearPedido("ped-c2", true);
    const tokenA = generarToken();
    await crearInvitacion({ token: tokenA, pedidoId: "ped-c2" });
    await expect(crearInvitacion({ token: generarToken(), pedidoId: "ped-c2" })).rejects.toThrow();
    expect((await crearResenaAtomica(env, { token: tokenA, ...DATOS })).ok).toBe(true);
    expect(await contarResenas()).toBe(1);
    expect(await contarConsumidas()).toBe(1);
  });
});
