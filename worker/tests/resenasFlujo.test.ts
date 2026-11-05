import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { generarInvitacion, moderarResena } from "../lib/admin";
import { crearResenaAtomica, listarResenasAprobadas, validarInvitacion } from "../lib/db";
import { crearVenta, cancelarVenta, resumenInicio } from "../lib/ventas";
import { rutasPublicas } from "../rutas/publico";
import { rutasAdmin } from "../rutas/admin";
import { esquemaCrearResena } from "../lib/validar";

const OPINION = { calificacion: 1, nombrePublico: "Ana M.", comentario: "El empaque puede mejorar mucho.", consentimientoVersion: "2026-10-30" };
beforeEach(async () => {
  await env.DB.batch(["resenas", "invitaciones", "pedido_items", "pedidos", "auditoria", "limites_resenas"].map((tabla) => env.DB.prepare(`DELETE FROM ${tabla}`)));
});
async function preparar() {
  const venta = await crearVenta(env, { vendidoEn: "2026-10-23", estadoEntrega: "entregado", estadoPago: "pendiente", canal: "whatsapp", items: [{ nombreProducto: "Café", nombrePresentacion: "250 g", cantidad: 1, precioUnitarioCentavos: 10000 }], actor: "admin@test" });
  if (!venta.ok) throw new Error("Venta no creada");
  const invitacion = await generarInvitacion(env, { pedidoId: venta.id, actor: "admin@test", ttlDias: "90" });
  if (!invitacion.ok) throw new Error("Invitación no creada");
  return { venta: venta.id, ...invitacion.invitacion };
}
async function enviar(token: string, extra: Record<string, unknown> = {}) {
  const url = new URL("https://cafeto.test/api/resenas");
  return rutasPublicas(new Request(url, { method: "POST", headers: { "Content-Type": "application/json", Origin: url.origin }, body: JSON.stringify({ token, ...OPINION, aceptaPublicacion: true, ...extra }) }), env, url);
}
describe("reseñas por compra entregada", () => {
  it("devuelve desde el servidor el enlace nuevo sin guardarlo en claro", async () => {
    const invitacion = await preparar();
    await env.DB.prepare("UPDATE invitaciones SET revocada_en = ? WHERE id = ?").bind(new Date().toISOString(), invitacion.id).run();
    const url = new URL(`https://cafeto.test/api/admin/pedidos/${invitacion.venta}/invitacion`);
    const respuesta = await rutasAdmin(new Request(url, { method: "POST" }), { ...env, ACCESS_DEV_BYPASS: "1" }, url);
    expect(respuesta?.status).toBe(201);
    const enlace = await respuesta!.json() as { url: string; token: string };
    expect(enlace.url).toBe(`https://cafeto.test/resena/${enlace.token}`);
    const fila = await env.DB.prepare("SELECT creada_por, token_hash FROM invitaciones WHERE revocada_en IS NULL").first<{ creada_por: string; token_hash: string }>();
    expect(fila?.creada_por).toBe("dev@local");
    expect(fila?.token_hash).not.toBe(enlace.token);
  });
  it("invita aunque no esté pagada, visita sin consumir y guarda consentimiento", async () => {
    const invitacion = await preparar();
    expect((await validarInvitacion(env, invitacion.token)).valida).toBe(true);
    expect((await validarInvitacion(env, invitacion.token)).valida).toBe(true);
    const r = await enviar(invitacion.token);
    expect(r?.status).toBe(201);
    const fila = await env.DB.prepare("SELECT identificacion, consentimiento_version, consentimiento_en, estado, autor_google_sub FROM resenas").first();
    expect(fila).toMatchObject({ identificacion: "invitado", consentimiento_version: "2026-10-30", estado: "pendiente", autor_google_sub: null });
    expect(fila?.consentimiento_en).toBeTruthy();
    expect((await resumenInicio(env, "2026-10-01", "2026-10-31")).resenasPendientes).toBe(1);
    expect((await enviar(invitacion.token))?.status).toBe(409);
    expect(await generarInvitacion(env, { pedidoId: invitacion.venta, actor: "admin@test" })).toMatchObject({ ok: false, motivo: "ya_resenado" });
  });
  it("renueva invalidando el anterior y no ofrece enlaces para una venta cancelada", async () => {
    const invitacion = await preparar();
    await env.DB.prepare("UPDATE invitaciones SET expira_en = '2000-01-01' WHERE id = ?").bind(invitacion.id).run();
    const nueva = await generarInvitacion(env, { pedidoId: invitacion.venta, actor: "admin@test" });
    expect(nueva.ok).toBe(true);
    expect((await validarInvitacion(env, invitacion.token)).valida).toBe(false);
    await cancelarVenta(env, { id: invitacion.venta, actor: "admin@test" });
    if (!nueva.ok) throw new Error("No renovada");
    expect((await enviar(nueva.invitacion.token))?.status).toBe(409);
    expect(await generarInvitacion(env, { pedidoId: invitacion.venta, actor: "admin@test" })).toMatchObject({ ok: false, motivo: "no_entregado" });
  });
  it("publica una estrella, oculta con motivo y republica sin editar el texto", async () => {
    const invitacion = await preparar();
    const creada = await crearResenaAtomica(env, { token: invitacion.token, ...OPINION });
    if (!creada.id) throw new Error("No creada");
    expect((await moderarResena(env, { id: creada.id, estado: "aprobada", actor: "a" })).ok).toBe(true);
    expect((await listarResenasAprobadas(env)).promedio).toBe(1);
    expect(await moderarResena(env, { id: creada.id, estado: "rechazada", actor: "b" })).toMatchObject({ ok: false, motivo: "motivo_requerido" });
    expect((await moderarResena(env, { id: creada.id, estado: "rechazada", actor: "b", motivo: "Datos personales" })).ok).toBe(true);
    expect((await listarResenasAprobadas(env)).total).toBe(0);
    expect((await moderarResena(env, { id: creada.id, estado: "aprobada", actor: "c" })).ok).toBe(true);
    expect((await listarResenasAprobadas(env)).filas[0]).toMatchObject({ comentario: OPINION.comentario, calificacion: 1, verificada: 1 });
    await cancelarVenta(env, { id: invitacion.venta, actor: "admin@test" });
    expect((await listarResenasAprobadas(env)).filas[0]).toMatchObject({ verificada: 0, calificacion: 1 });
    expect((await listarResenasAprobadas(env)).total).toBe(1);
  });
  it("exige consentimiento y respeta los límites sin interpretar HTML", async () => {
    const invitacion = await preparar();
    expect((await enviar(invitacion.token, { aceptaPublicacion: false }))?.status).toBe(400);
    expect((await enviar(invitacion.token, { comentario: "corto" }))?.status).toBe(400);
    expect((await enviar(invitacion.token, { comentario: "x".repeat(2001) }))?.status).toBe(400);
    expect(esquemaCrearResena.safeParse({ token: invitacion.token, ...OPINION, aceptaPublicacion: true, comentario: "<script>alert(1)</script>" }).success).toBe(true);
    // El contrato conserva texto. React lo escapa; no se transforma en HTML.
    expect((await enviar(invitacion.token, { comentario: "<script>alert(1)</script>" }))?.status).toBe(201);
    expect((await listarResenasAprobadas(env)).total).toBe(0);
  });
  it("rechaza CSRF y aplica un límite persistente de solicitudes", async () => {
    const url = new URL("https://cafeto.test/api/resenas/validar");
    const origen = await rutasPublicas(new Request(url, { method: "POST", headers: { Origin: "https://ajeno.test" } }), env, url);
    expect(origen?.status).toBe(403);
    await env.DB.prepare("INSERT INTO limites_resenas (clave, intentos, expira_en) VALUES ('anterior', 1, 0)").run();
    const { permitirResenas } = await import("../lib/limitesResenas");
    const request = new Request(url);
    expect(await permitirResenas(request, env.DB, "prueba", 1)).toBe(true);
    expect(await permitirResenas(request, env.DB, "prueba", 1)).toBe(false);
    expect(await env.DB.prepare("SELECT clave FROM limites_resenas WHERE clave = 'anterior'").first()).toBeNull();
  });
  it("no expone datos internos y desactiva caché pública tras moderar", async () => {
    const invitacion = await preparar();
    const creada = await crearResenaAtomica(env, { token: invitacion.token, ...OPINION, googleSub: "id-privado" });
    await moderarResena(env, { id: creada.id!, estado: "aprobada", actor: "moderador" });
    const url = new URL("https://cafeto.test/api/resenas");
    const respuesta = await rutasPublicas(new Request(url), env, url);
    expect(respuesta?.headers.get("Cache-Control")).toBe("no-store");
    const cuerpo = await respuesta!.json() as { resenas: object[] };
    expect(Object.keys(cuerpo.resenas[0]!).sort()).toEqual(["id", "calificacion", "comentario", "nombrePublico", "verificada", "creadaEn"].sort());
  });
  it("mantiene el flujo sin Google si faltan credenciales y rechaza tokens falsos", async () => {
    const url = new URL("https://cafeto.test/api/resenas/config?identidad=1");
    const config = await rutasPublicas(new Request(url), { ...env, GOOGLE_CLIENT_ID: "" }, url);
    expect(await config?.json()).toMatchObject({ googleClientId: null });
    const invitacion = await preparar();
    expect((await enviar(invitacion.token, { googleCredential: "token-falso-sin-firma" }))?.status).toBe(401);
    expect((await validarInvitacion(env, invitacion.token)).valida).toBe(true);
    expect((await enviar(invitacion.token))?.status).toBe(201);
  });
});
