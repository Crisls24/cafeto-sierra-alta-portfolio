import { z } from "zod";

import {
  crearPedido,
  despublicarResena,
  entregarPedido,
  generarInvitacion,
  listarPedidosAdmin,
  listarResenasAdmin,
  moderarResena,
  revocarInvitacion,
  resumenAdmin,
} from "../lib/admin";
import { verificarAcceso } from "../lib/acceso";
import { leerJson } from "../lib/peticion";
import { error, json } from "../lib/respuestas";
import { esquemaCrearPedido, validar } from "../lib/validar";
import { rutasAdminVentas } from "./adminVentas";
import type { Env, EstadoResena } from "../tipos";

/**
 * Rutas administrativas. Todas viven bajo /api/admin/ y todas exigen una
 * credencial de Cloudflare Access verificada en el servidor (firma, emisor y
 * audiencia). El panel nunca decide si alguien es administrador: lo decide
 * Access y lo confirma este guardián.
 */

const esquemaEstado = z.enum(["pendiente", "aprobada", "rechazada"]);
const esquemaMotivo = z.object({
  motivo: z.string().trim().min(1).max(300),
});

/** Un uuid (o id) razonable; evita consultar con basura. */
const ID_VALIDO = /^[0-9a-fA-F-]{8,64}$/;

export async function rutasAdmin(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (!pathname.startsWith("/api/admin/")) return null;
  url.pathname = pathname;

  const acceso = await verificarAcceso(request, env);
  if (!acceso.ok) return error(acceso.motivo, 401, "no_autorizado");

  if (url.pathname === "/api/admin/salud") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    return json({ ok: true, actor: acceso.actor });
  }

  const ventas = await rutasAdminVentas(request, env, url, acceso.actor);
  if (ventas) return ventas;

  if (url.pathname === "/api/admin/resumen") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    return json(await resumenAdmin(env));
  }

  if (url.pathname === "/api/admin/resenas") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    return listar(request, env, url);
  }

  if (url.pathname === "/api/admin/pedidos") {
    if (request.method === "GET") return json({ pedidos: await listarPedidosAdmin(env) });
    if (request.method === "POST") return crear(request, env, acceso.actor);
    return error("Método no permitido.", 405, "metodo");
  }

  // ["", "api", "admin", "pedidos", "<id>", "<accion>"]
  const partesPedido = url.pathname.split("/");
  if (partesPedido.length === 6 && partesPedido[3] === "pedidos") {
    const id = partesPedido[4]!;
    const accion = partesPedido[5];
    if (!ID_VALIDO.test(id)) {
      return error("Identificador de pedido inválido.", 400, "validacion");
    }
    if (accion === "entregar") {
      if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
      return entregar(env, id, acceso.actor);
    }
    if (accion === "invitacion") {
      if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
      return invitar(request, env, id, acceso.actor);
    }
  }

  // ["", "api", "admin", "invitaciones", "<id>", "revocar"]
  const partesInvitacion = url.pathname.split("/");
  if (
    partesInvitacion.length === 6 &&
    partesInvitacion[3] === "invitaciones" &&
    partesInvitacion[5] === "revocar"
  ) {
    if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
    const id = partesInvitacion[4]!;
    if (!ID_VALIDO.test(id)) {
      return error("Identificador de invitación inválido.", 400, "validacion");
    }
    return revocar(env, id, acceso.actor);
  }

  const partes = url.pathname.split("/");
  // ["", "api", "admin", "resenas", "<id>", "<accion>"]
  if (partes.length === 6 && partes[3] === "resenas") {
    const id = partes[4]!;
    const accion = partes[5];
    if (accion === "aprobar" || accion === "rechazar") {
      if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
      return moderar(request, env, url, id, accion, acceso.actor);
    }
    if (accion === "despublicar") {
      if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
      return despublicar(request, env, id, acceso.actor);
    }
  }

  return null;
}

async function listar(request: Request, env: Env, url: URL): Promise<Response> {
  const bruto = url.searchParams.get("estado");
  let estado: EstadoResena | undefined;
  if (bruto !== null) {
    const parseo = validar(esquemaEstado, bruto);
    if (!parseo.ok) return error("Estado de reseña inválido.", 400, "validacion");
    estado = parseo.datos;
  }
    const venta = url.searchParams.get("venta") ?? undefined;
  if (venta && !ID_VALIDO.test(venta)) return error("Venta inválida.", 400, "validacion");
  return json({ resenas: await listarResenasAdmin(env, estado, venta) });
}

async function moderar(
  request: Request,
  env: Env,
  url: URL,
  id: string,
  accion: "aprobar" | "rechazar",
  actor: string
): Promise<Response> {
  if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) {
    return error("Identificador de reseña inválido.", 400, "validacion");
  }
  let motivo: string | null = null;
  if (accion === "rechazar") {
    const parseo = validar(esquemaMotivo, await leerJson(request));
    if (!parseo.ok) return error("Indica un motivo interno para ocultar.", 400, "validacion");
    motivo = parseo.datos.motivo;
  }

  const resultado = await moderarResena(env, {
    id,
    estado: accion === "aprobar" ? "aprobada" : "rechazada",
    actor,
    motivo,
  });

  if (!resultado.ok) {
    if (resultado.motivo === "no_existe") {
      return error("La reseña no existe.", 404, "no_encontrado");
    }
    return error("La reseña ya fue moderada.", 409, "ya_estaba");
  }

  return json({ ok: true, id, estado: accion === "aprobar" ? "aprobada" : "rechazada" });
}

/* --- Pedidos e invitaciones --- */

async function crear(
  request: Request,
  env: Env,
  actor: string
): Promise<Response> {
  const cuerpo = await leerJson(request);
  const parseo = validar(
    esquemaCrearPedido,
    cuerpo === null ? {} : cuerpo
  );
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");

  const { canal, referencia } = parseo.datos;
  const resultado = await crearPedido(env, { canal, referencia, actor });
  return json({ ok: true, id: resultado.id }, 201);
}

async function entregar(
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const resultado = await entregarPedido(env, { id, actor });
  if (!resultado.ok) {
    if (resultado.motivo === "no_existe") {
      return error("El pedido no existe.", 404, "no_encontrado");
    }
    return error("El pedido ya estaba entregado.", 409, "ya_entregado");
  }
  return json({ ok: true, id });
}

async function invitar(
  request: Request,
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const resultado = await generarInvitacion(env, { pedidoId: id, actor });
  if (!resultado.ok) {
    if (resultado.motivo === "no_existe") {
      return error("El pedido no existe.", 404, "no_encontrado");
    }
    if (resultado.motivo === "no_entregado") {
      return error(
        "El pedido debe estar entregado para generar una invitación.",
        409,
        "no_entregado"
      );
    }
    // Ya hay una invitación activa: no se expone ningún token; el panel
    // ofrece revocar y generar una nueva.
    return error(
      "Ya existe una invitación activa para este pedido.",
      409,
      "invitacion_activa"
    );
  }

  const { id: invitacionId, token, expiraEn } = resultado.invitacion;
  return json({ ok: true, id: invitacionId, token, expiraEn, url: new URL(`/resena/${encodeURIComponent(token)}`, request.url).href }, 201);
}

async function revocar(
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const resultado = await revocarInvitacion(env, { id, actor });
  if (!resultado.ok) {
    if (resultado.motivo === "no_existe") {
      return error("La invitación no existe.", 404, "no_encontrado");
    }
    return error("La invitación ya no está activa.", 409, "ya_cerrada");
  }
  return json({ ok: true, id });
}

async function despublicar(
  request: Request,
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  if (!ID_VALIDO.test(id)) {
    return error("Identificador de reseña inválido.", 400, "validacion");
  }
  const parseo = validar(esquemaMotivo, await leerJson(request));
  if (!parseo.ok) return error("Indica un motivo interno para ocultar.", 400, "validacion");
  const resultado = await despublicarResena(env, { id, actor, motivo: parseo.datos.motivo });
  if (!resultado.ok) {
    if (resultado.motivo === "no_existe") {
      return error("La reseña no existe.", 404, "no_encontrado");
    }
    return error("La reseña no está publicada.", 409, "ya_estaba");
  }
  return json({ ok: true, id, estado: "rechazada" });
}