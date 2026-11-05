import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { generarToken, hashToken } from "../lib/tokens";

/**
 * Pruebas de integración de rutas.
 *
 * Enrutan por el `fetch` real del Worker (SELF), que es lo que comprueba que
 * /api/* llegue al Worker y no a los assets. La protección del panel no se
 * prueba con una cabecera inventada: se comprueba que sin una credencial de
 * Access verificable la respuesta es 401.
 */

const ORIGEN = "https://cafeto.test";

async function limpiar(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM resenas"),
    env.DB.prepare("DELETE FROM invitaciones"),
    env.DB.prepare("DELETE FROM pedidos"),
  ]);
}

async function pedidoEntregadoConInvitacion(id: string): Promise<string> {
  const token = generarToken();
  const ahora = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO pedidos (id, folio, canal, vendido_en, entregado, entregado_en, estado_entrega) VALUES (?, (SELECT COALESCE(MAX(folio), 0) + 1 FROM pedidos), 'whatsapp', ?, 1, ?, 'entregado')"
  )
    .bind(id, ahora.slice(0, 10), ahora)
    .run();
  await env.DB.prepare(
    "INSERT INTO invitaciones (id, pedido_id, token_hash, expira_en) VALUES (?, ?, ?, ?)"
  )
    .bind(
      crypto.randomUUID(),
      id,
      await hashToken(token),
      new Date(Date.now() + 86_400_000).toISOString()
    )
    .run();
  return token;
}

beforeEach(limpiar);

describe("rutas públicas", () => {
  it("GET /api/resenas devuelve lista vacía sin reseñas aprobadas", async () => {
    const respuesta = await SELF.fetch(`${ORIGEN}/api/resenas`);
    expect(respuesta.status).toBe(200);
    const cuerpo = (await respuesta.json()) as {
      resenas: unknown[];
      resumen: { promedio: number; total: number };
    };
    expect(cuerpo.resenas).toEqual([]);
    expect(cuerpo.resumen).toEqual({ promedio: 0, total: 0 });
  });

  it("POST /api/resenas con token válido crea una reseña pendiente", async () => {
    const token = await pedidoEntregadoConInvitacion("ped-r1");

    const respuesta = await SELF.fetch(`${ORIGEN}/api/resenas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        aceptaPublicacion: true, consentimientoVersion: "2026-10-30",
        calificacion: 5,
        comentario: "Muy buen café.",
        nombrePublico: "Ana",
      }),
    });

    expect(respuesta.status).toBe(201);
    // No aparece todavía en la lista pública: sigue pendiente de moderación.
    const lista = await SELF.fetch(`${ORIGEN}/api/resenas`);
    const cuerpo = (await lista.json()) as { resenas: unknown[] };
    expect(cuerpo.resenas).toEqual([]);
  });

  it("POST /api/resenas con token inválido responde 409 y no escribe", async () => {
    const respuesta = await SELF.fetch(`${ORIGEN}/api/resenas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: "token-que-no-existe-de-ninguna-manera",
        aceptaPublicacion: true, consentimientoVersion: "2026-10-30",
        calificacion: 4,
        comentario: "Comentario de prueba.",
        nombrePublico: "Luis",
      }),
    });
    expect(respuesta.status).toBe(409);
    const fila = await env.DB.prepare("SELECT COUNT(*) AS n FROM resenas").first<{
      n: number;
    }>();
    expect(fila?.n).toBe(0);
  });

  it("rechaza calificaciones fuera de rango", async () => {
    const token = await pedidoEntregadoConInvitacion("ped-r2");
    const respuesta = await SELF.fetch(`${ORIGEN}/api/resenas`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token,
        aceptaPublicacion: true, consentimientoVersion: "2026-10-30",
        calificacion: 9,
        comentario: "Comentario de prueba.",
        nombrePublico: "Luis",
      }),
    });
    expect(respuesta.status).toBe(400);
  });
});

describe("rutas administrativas", () => {
  it("sin credencial de Access responde 401 aunque haya cabecera inventada", async () => {
    const inventada = await SELF.fetch(`${ORIGEN}/api/admin/salud`, {
      headers: { "Cf-Access-Jwt-Assertion": "no-es-un-jwt-valido" },
    });
    expect(inventada.status).toBe(401);

    const sinCabecera = await SELF.fetch(`${ORIGEN}/api/admin/salud`);
    expect(sinCabecera.status).toBe(401);
  });

  it("un recurso inexistente bajo /api responde 404", async () => {
    const respuesta = await SELF.fetch(`${ORIGEN}/api/no-existe`);
    expect(respuesta.status).toBe(404);
  });

  it("las rutas administrativas exigen credencial", async () => {
    const solicitudes: Array<[string, RequestInit]> = [
      ["/api/admin/pedidos", { method: "GET" }],
      ["/api/admin/pedidos", { method: "POST" }],
      ["/api/admin/pedidos/ped-12345678/entregar", { method: "POST" }],
      ["/api/admin/pedidos/ped-12345678/invitacion", { method: "POST" }],
      ["/api/admin/invitaciones/inv-12345678/revocar", { method: "POST" }],
      ["/api/admin/resenas/res-12345678/despublicar", { method: "POST" }],
      [
        "/api/admin/inicio?desde=2026-10-01&hasta=2026-10-31",
        { method: "GET" },
      ],
      ["/api/admin/productos", { method: "GET" }],
      ["/api/admin/ventas", { method: "GET" }],
      ["/api/admin/ventas", { method: "POST" }],
      ["/api/admin/ventas/venta-12345678", { method: "GET" }],
      ["/api/admin/ventas/venta-12345678", { method: "PATCH" }],
      ["/api/admin/ventas/venta-12345678/estado", { method: "POST" }],
      ["/api/admin/ventas/venta-12345678/entregar", { method: "POST" }],
      ["/api/admin/ventas/venta-12345678/pago", { method: "POST" }],
      ["/api/admin/ventas/venta-12345678/cancelar", { method: "POST" }],
    ];
    for (const [ruta, init] of solicitudes) {
      const respuesta = await SELF.fetch(`${ORIGEN}${ruta}`, init);
      expect(respuesta.status).toBe(401);
    }
  });
});
