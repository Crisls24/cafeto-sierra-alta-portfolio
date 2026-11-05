import { z } from "zod";

import {
  actualizarVenta,
  cambiarEstadoEntrega,
  cancelarVenta,
  crearVenta,
  entregarVenta,
  listarProductos,
  listarVentas,
  listarVentasPaginadas,
  obtenerVenta,
  registrarPago,
  resumenInicio,
  type FiltrosVenta,
  type MotivoVenta,
} from "../lib/ventas";
import { leerJson } from "../lib/peticion";
import { error, json } from "../lib/respuestas";
import {
  esquemaActualizarVenta,
  esquemaCambiarEntrega,
  esquemaCanal,
  esquemaCrearVenta,
  esquemaEntregarVenta,
  esquemaEstadoEntrega,
  esquemaEstadoPago,
  esquemaEstadoResenaVenta,
  esquemaFecha,
  esquemaLimiteVentas,
  esquemaRegistrarPago,
  validar,
} from "../lib/validar";
import type { Env } from "../tipos";

const ID_VALIDO = /^[A-Za-z0-9_-]{3,64}$/;

const esquemaTextoFiltro = z.string().trim().min(1).max(120);

function motivoVenta(motivo: MotivoVenta): Response {
  switch (motivo) {
    case "no_existe":
      return error("La venta no existe.", 404, "no_encontrado");
    case "no_editable":
      return error("La venta ya no se puede editar.", 409, "no_editable");
    case "ya_entregado":
      return error("La venta ya estaba entregada.", 409, "ya_entregado");
    case "ya_cancelada":
      return error("La venta ya estaba cancelada.", 409, "ya_cancelada");
    case "producto_no_existe":
      return error(
        "El producto o la presentación no está disponible.",
        400,
        "producto_no_existe"
      );
    case "precio_catalogo":
      return error("En una venta normal se usa el precio del catálogo. Actualiza la presentación seleccionada.", 409, "precio_catalogo");
    case "precio_pendiente":
      return error("Esta presentación aún no tiene precio en el catálogo.", 400, "precio_pendiente");
    case "molienda_no_aplica":
      return error(
        "La molienda solo aplica al café.",
        400,
        "molienda_no_aplica"
      );
  }
}

function leerFiltros(
  url: URL
): { ok: true; datos: FiltrosVenta } | { ok: false; mensaje: string } {
  const datos: FiltrosVenta = {};

  const desde = url.searchParams.get("desde");
  if (desde !== null) {
    const parseo = validar(esquemaFecha, desde);
    if (!parseo.ok) return { ok: false, mensaje: "Fecha inicial inválida." };
    datos.desde = parseo.datos;
  }

  const hasta = url.searchParams.get("hasta");
  if (hasta !== null) {
    const parseo = validar(esquemaFecha, hasta);
    if (!parseo.ok) return { ok: false, mensaje: "Fecha final inválida." };
    datos.hasta = parseo.datos;
  }

  if (datos.desde && datos.hasta && datos.desde > datos.hasta) {
    return { ok: false, mensaje: "El periodo está al revés." };
  }

  const canal = url.searchParams.get("canal");
  if (canal !== null) {
    const parseo = validar(esquemaCanal, canal);
    if (!parseo.ok) return { ok: false, mensaje: "Canal inválido." };
    datos.canal = parseo.datos;
  }

  const entrega = url.searchParams.get("entrega");
  if (entrega === "por_entregar") {
    datos.entrega = "por_entregar";
  } else if (entrega !== null) {
    const parseo = validar(esquemaEstadoEntrega, entrega);
    if (!parseo.ok) return { ok: false, mensaje: "Estado de entrega inválido." };
    datos.entrega = parseo.datos;
  }

  const pago = url.searchParams.get("pago");
  if (pago !== null) {
    const parseo = validar(esquemaEstadoPago, pago);
    if (!parseo.ok) return { ok: false, mensaje: "Estado de pago inválido." };
    datos.pago = parseo.datos;
  }

  const resena = url.searchParams.get("resena");
  if (resena !== null) {
    const parseo = validar(esquemaEstadoResenaVenta, resena);
    if (!parseo.ok) return { ok: false, mensaje: "Estado de reseña inválido." };
    datos.resena = parseo.datos;
  }

  const producto = url.searchParams.get("producto");
  if (producto !== null) {
    const parseo = validar(esquemaTextoFiltro, producto);
    if (!parseo.ok) return { ok: false, mensaje: "Producto inválido." };
    datos.producto = parseo.datos;
  }

  const q = url.searchParams.get("q");
  if (q !== null) {
    const parseo = validar(esquemaTextoFiltro, q);
    if (!parseo.ok) return { ok: false, mensaje: "Búsqueda inválida." };
    datos.q = parseo.datos;
  }

  const limite = url.searchParams.get("limite");
  if (limite !== null) {
    const parseo = validar(esquemaLimiteVentas, limite);
    if (!parseo.ok) return { ok: false, mensaje: "Límite inválido." };
    datos.limite = parseo.datos;
  }

  const pagina = url.searchParams.get("pagina");
  if (pagina !== null) {
    const parseo = z.coerce.number().int().min(1).max(1_000_000).safeParse(pagina);
    if (!parseo.success) return { ok: false, mensaje: "Página inválida." };
    datos.pagina = parseo.data;
  }
  if (url.searchParams.get("excluirCanceladas") === "1") datos.excluirCanceladas = true;
  return { ok: true, datos };
}

function rango(url: URL): { ok: true; desde: string; hasta: string } | { ok: false; mensaje: string } {
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");
  if (desde === null || hasta === null) {
    return { ok: false, mensaje: "Indica el periodo (desde y hasta)." };
  }
  const inicio = validar(esquemaFecha, desde);
  if (!inicio.ok) return { ok: false, mensaje: "Fecha inicial inválida." };
  const fin = validar(esquemaFecha, hasta);
  if (!fin.ok) return { ok: false, mensaje: "Fecha final inválida." };
  if (inicio.datos > fin.datos) {
    return { ok: false, mensaje: "El periodo está al revés." };
  }
  return { ok: true, desde: inicio.datos, hasta: fin.datos };
}

export async function rutasAdminVentas(
  request: Request,
  env: Env,
  url: URL,
  actor: string
): Promise<Response | null> {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  url.pathname = pathname;
  if (url.pathname === "/api/admin/inicio") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    const periodo = rango(url);
    if (!periodo.ok) return error(periodo.mensaje, 400, "validacion");
    return json(await resumenInicio(env, periodo.desde, periodo.hasta));
  }

  if (url.pathname === "/api/admin/productos") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    return json({ productos: await listarProductos(env) });
  }

  if (url.pathname === "/api/admin/ventas") {
    if (request.method === "GET") {
      const filtros = leerFiltros(url);
      if (!filtros.ok) return error(filtros.mensaje, 400, "validacion");
      if (url.searchParams.get("paginado") === "1") return json(await listarVentasPaginadas(env, filtros.datos));
      return json({ ventas: await listarVentas(env, filtros.datos) });
    }
    if (request.method === "POST") return crear(request, env, actor);
    return error("Método no permitido.", 405, "metodo");
  }

  const partes = url.pathname.split("/");
  if (partes.length < 5 || partes[3] !== "ventas") return null;

  const id = partes[4]!;
  if (!ID_VALIDO.test(id)) {
    return error("Identificador de venta inválido.", 400, "validacion");
  }

  if (partes.length === 5) {
    if (request.method === "GET") {
      const venta = await obtenerVenta(env, id);
      if (!venta) return error("La venta no existe.", 404, "no_encontrado");
      return json({ venta });
    }
    if (request.method === "PATCH") return actualizar(request, env, id, actor);
    return error("Método no permitido.", 405, "metodo");
  }

  if (partes.length === 6) {
    const accion = partes[5];
    switch (accion) {
      case "estado":
        if (request.method !== "POST") {
          return error("Método no permitido.", 405, "metodo");
        }
        return cambiarEstado(request, env, id, actor);
      case "entregar":
        if (request.method !== "POST") {
          return error("Método no permitido.", 405, "metodo");
        }
        return entregar(request, env, id, actor);
      case "pago":
        if (request.method !== "POST") {
          return error("Método no permitido.", 405, "metodo");
        }
        return pagar(request, env, id, actor);
      case "cancelar":
        if (request.method !== "POST") {
          return error("Método no permitido.", 405, "metodo");
        }
        return cancelar(env, id, actor);
      default:
        return null;
    }
  }

  return null;
}

async function crear(
  request: Request,
  env: Env,
  actor: string
): Promise<Response> {
  const cuerpo = await leerJson(request);
  if (cuerpo === null) {
    return error("El cuerpo debe ser JSON válido.", 400, "validacion");
  }
  const parseo = validar(esquemaCrearVenta, cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");
  if (parseo.datos.items.some(i => !i.productoId || !i.presentacionId)) return motivoVenta("producto_no_existe");

  const resultado = await crearVenta(env, { ...parseo.datos, actor });
  if (!resultado.ok) return motivoVenta(resultado.motivo);
  return json({ ok: true, id: resultado.id }, 201);
}

async function actualizar(
  request: Request,
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const cuerpo = await leerJson(request);
  if (cuerpo === null) {
    return error("El cuerpo debe ser JSON válido.", 400, "validacion");
  }
  const parseo = validar(esquemaActualizarVenta, cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");
  if (parseo.datos.items?.some(i => !i.productoId || !i.presentacionId)) return motivoVenta("producto_no_existe");

  const resultado = await actualizarVenta(env, {
    ...parseo.datos,
    id,
    actor,
  });
  if (!resultado.ok) return motivoVenta(resultado.motivo);
  return json({ ok: true, id });
}

async function cambiarEstado(
  request: Request,
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const cuerpo = await leerJson(request);
  if (cuerpo === null) {
    return error("El cuerpo debe ser JSON válido.", 400, "validacion");
  }
  const parseo = validar(esquemaCambiarEntrega, cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");

  const resultado = await cambiarEstadoEntrega(env, {
    id,
    estado: parseo.datos.estado,
    actor,
  });
  if (!resultado.ok) return motivoVenta(resultado.motivo);
  return json({ ok: true, id, estado: parseo.datos.estado });
}

async function entregar(
  request: Request,
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const cuerpo = await leerJson(request);
  const parseo = validar(esquemaEntregarVenta, cuerpo === null ? {} : cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");

  const resultado = await entregarVenta(env, {
    id,
    actor,
    entregadoEn: parseo.datos.entregadoEn ?? null,
  });
  if (!resultado.ok) return motivoVenta(resultado.motivo);
  return json({ ok: true, id, estado: "entregado" });
}

async function pagar(
  request: Request,
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const cuerpo = await leerJson(request);
  if (cuerpo === null) {
    return error("El cuerpo debe ser JSON válido.", 400, "validacion");
  }
  const parseo = validar(esquemaRegistrarPago, cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");

  const resultado = await registrarPago(env, {
    id,
    estado: parseo.datos.estado,
    actor,
    pagadoEn: parseo.datos.pagadoEn ?? null,
  });
  if (!resultado.ok) return motivoVenta(resultado.motivo);
  return json({ ok: true, id, estado: parseo.datos.estado });
}

async function cancelar(
  env: Env,
  id: string,
  actor: string
): Promise<Response> {
  const resultado = await cancelarVenta(env, { id, actor });
  if (!resultado.ok) return motivoVenta(resultado.motivo);
  return json({ ok: true, id, estado: "cancelado" });
}
