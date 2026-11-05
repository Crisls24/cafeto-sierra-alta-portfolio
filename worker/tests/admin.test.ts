import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { crearResenaAtomica } from "../lib/db";
import {
  listarResenasAdmin,
  moderarResena,
  resumenAdmin,
} from "../lib/admin";
import { generarToken, hashToken } from "../lib/tokens";

/**
 * Reglas del panel de moderación contra D1 real.
 *
 * El guardián de Cloudflare Access se prueba aparte (rutas → 401 sin
 * credencial). Aquí se prueba lo que hace el panel una vez autenticado:
 * contar, listar y cambiar el estado de una reseña de forma atómica.
 */

const DATOS = {
  calificacion: 4,
  comentario: "Queso cremoso y muy buen precio por volumen.",
  nombrePublico: "Laura P.",
};

function futuro(horas = 24): string {
  return new Date(Date.now() + horas * 3600_000).toISOString();
}

async function limpiar(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM resenas"),
    env.DB.prepare("DELETE FROM invitaciones"),
    env.DB.prepare("DELETE FROM pedidos"),
    env.DB.prepare("DELETE FROM auditoria"),
  ]);
}

async function sembrarResena(opciones: {
  id?: string;
  estado?: "aprobada" | "rechazada";
  motivo?: string | null;
  moderadaPor?: string | null;
} = {}): Promise<string> {
  const pedidoId = `ped-${crypto.randomUUID().slice(0, 8)}`;
  await env.DB.prepare(
    "INSERT INTO pedidos (id, folio, canal, vendido_en, entregado, entregado_en, estado_entrega) VALUES (?, (SELECT COALESCE(MAX(folio), 0) + 1 FROM pedidos), 'whatsapp', ?, 1, ?, 'entregado')"
  )
    .bind(pedidoId, new Date().toISOString().slice(0, 10), new Date().toISOString())
    .run();

  const token = generarToken();
  const hash = await hashToken(token);
  await env.DB.prepare(
    "INSERT INTO invitaciones (id, pedido_id, token_hash, expira_en, revocada_en) VALUES (?, ?, ?, ?, NULL)"
  )
    .bind(crypto.randomUUID(), pedidoId, hash, futuro())
    .run();

  const creada = await crearResenaAtomica(env, { token, ...DATOS });
  if (!creada.ok || !creada.id) throw new Error("No se sembró la reseña.");

  if (opciones.estado) {
    await moderarResena(env, {
      id: creada.id,
      estado: opciones.estado,
      actor: opciones.moderadaPor ?? "admin@pruebas",
      motivo: opciones.motivo ?? (opciones.estado === "rechazada" ? "Spam de prueba" : null),
    });
  }

  return creada.id;
}

beforeEach(limpiar);

describe("panel de moderación: conteo y listado", () => {
  it("empieza en cero y cuenta por estado", async () => {
    expect(await resumenAdmin(env)).toEqual({
      pendientes: 0,
      aprobadas: 0,
      rechazadas: 0,
    });

    await sembrarResena();
    await sembrarResena({ estado: "aprobada" });
    await sembrarResena({ estado: "rechazada", motivo: "Spam" });

    expect(await resumenAdmin(env)).toEqual({
      pendientes: 1,
      aprobadas: 1,
      rechazadas: 1,
    });
  });

  it("lista reseñas con el canal y el pedido de origen", async () => {
    await sembrarResena();

    const resenas = await listarResenasAdmin(env);
    expect(resenas).toHaveLength(1);
    expect(resenas[0]).toMatchObject({
      calificacion: DATOS.calificacion,
      nombrePublico: DATOS.nombrePublico,
      estado: "pendiente",
      motivoRechazo: null,
      moderadaEn: null,
      moderadoPor: null,
      canal: "whatsapp",
    });
    const primera = resenas[0];
    expect(primera).toBeDefined();
    expect(primera?.pedidoId).toMatch(/^ped-/);
  });

  it("filtra por estado", async () => {
    await sembrarResena();
    await sembrarResena({ estado: "aprobada" });
    await sembrarResena({ estado: "rechazada" });

    expect(await listarResenasAdmin(env, "pendiente")).toHaveLength(1);
    expect(await listarResenasAdmin(env, "aprobada")).toHaveLength(1);
    expect(await listarResenasAdmin(env, "rechazada")).toHaveLength(1);
    expect(await listarResenasAdmin(env)).toHaveLength(3);
  });
});

describe("panel de moderación: aprobar y rechazar", () => {
  it("aprueba una reseña pendiente y deja auditoría", async () => {
    const id = await sembrarResena();

    const resultado = await moderarResena(env, {
      id,
      estado: "aprobada",
      actor: "socios@cafeto",
    });

    expect(resultado).toEqual({ ok: true });
    const fila = await env.DB.prepare(
      "SELECT estado, moderado_por, motivo_rechazo FROM resenas WHERE id = ?"
    )
      .bind(id)
      .first<{
        estado: string;
        moderado_por: string;
        motivo_rechazo: string | null;
      }>();
    expect(fila).toMatchObject({ estado: "aprobada", moderado_por: "socios@cafeto" });
    expect(fila?.motivo_rechazo).toBeNull();

    const auditoria = await env.DB.prepare(
      "SELECT accion, actor FROM auditoria WHERE entidad = 'resena' AND entidad_id = ?"
    )
      .bind(id)
      .first<{ accion: string; actor: string }>();
    expect(auditoria).toMatchObject({ accion: "aprobar", actor: "socios@cafeto" });
  });

  it("rechaza con motivo y lo conserva", async () => {
    const id = await sembrarResena();

    const resultado = await moderarResena(env, {
      id,
      estado: "rechazada",
      actor: "socios@cafeto",
      motivo: "Menciona datos personales.",
    });

    expect(resultado.ok).toBe(true);
    const fila = await env.DB.prepare(
      "SELECT estado, motivo_rechazo, moderada_en FROM resenas WHERE id = ?"
    )
      .bind(id)
      .first<{ estado: string; motivo_rechazo: string; moderada_en: string }>();
    expect(fila?.estado).toBe("rechazada");
    expect(fila?.motivo_rechazo).toBe("Menciona datos personales.");
    expect(fila?.moderada_en).toBeTruthy();
  });

  it("no permite moderar dos veces la misma reseña", async () => {
    const id = await sembrarResena();
    await moderarResena(env, { id, estado: "aprobada", actor: "socio-a" });

    const segunda = await moderarResena(env, {
      id,
      estado: "aprobada",
      actor: "socio-b",
      motivo: "Intento tardío.",
    });

    expect(segunda.ok).toBe(false);
    expect(segunda.motivo).toBe("ya_estaba");

    const fila = await env.DB.prepare(
      "SELECT estado, moderado_por FROM resenas WHERE id = ?"
    )
      .bind(id)
      .first<{ estado: string; moderado_por: string }>();
    expect(fila?.estado).toBe("aprobada");
    expect(fila?.moderado_por).toBe("socio-a");
  });

  it("informa que la reseña no existe", async () => {
    const resultado = await moderarResena(env, {
      id: crypto.randomUUID(),
      estado: "aprobada",
      actor: "socios@cafeto",
    });
    expect(resultado).toEqual({ ok: false, motivo: "no_existe" });
  });

  it("deja la reseña perdida fuera de la lista pública y metida en la admin", async () => {
    const id = await sembrarResena({ estado: "rechazada" });

    const publicas = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM resenas WHERE estado = 'aprobada'"
    ).first<{ n: number }>();
    expect(publicas?.n).toBe(0);

    const admin = await listarResenasAdmin(env, "rechazada");
    const primera = admin[0];
    expect(primera).toBeDefined();
    expect(primera?.id).toBe(id);
  });
});