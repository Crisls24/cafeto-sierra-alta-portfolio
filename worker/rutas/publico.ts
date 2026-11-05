import { z } from "zod";
import { generarToken } from "../lib/tokens";
import { cookieNonce, nonceGoogle, verificarGoogle } from "../lib/google";
import { permitirResenas } from "../lib/limitesResenas";
import { consultarResenasGoogle } from "../lib/resenasGoogle";
import { crearResenaAtomica, listarResenasAprobadas, validarInvitacion } from "../lib/db";
import { leerJson } from "../lib/peticion";
import { error, json } from "../lib/respuestas";
import { verificarTurnstile } from "../lib/turnstile";
import { esquemaCrearResena, esquemaToken, validar } from "../lib/validar";
import type { Env, FilaResenaAprobada, RespuestaPublica } from "../tipos";

/**
 * Rutas públicas. Devuelve `null` si ninguna coincide, y el router decide.
 * Ninguna de estas rutas toca datos que no sean de reseñas aprobadas o del
 * token que trae el visitante.
 */
export async function rutasPublicas(
  request: Request,
  env: Env,
  url: URL
): Promise<Response | null> {
  if (url.pathname.startsWith("/api/resenas") && request.method === "POST") {
    const origen = request.headers.get("Origin");
    if (origen && origen !== url.origin) return error("Origen no permitido.", 403, "origen");
    if (!await permitirResenas(request, env.DB, url.pathname, url.pathname === "/api/resenas" ? 10 : 60)) return error("Demasiados intentos. Intenta más tarde.", 429, "limite");
  }
  if (url.pathname === "/api/resenas/config") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    const perfil = env.GOOGLE_BUSINESS_PROFILE_URL;
    const datos = { googleClientId: env.GOOGLE_CLIENT_ID || null, googlePerfil: perfil && /^https:\/\//.test(perfil) ? perfil : null, googleResenasDisponibles: Boolean(env.GOOGLE_PLACES_API_KEY && env.GOOGLE_PLACE_ID) };
    if (!env.GOOGLE_CLIENT_ID || url.searchParams.get("identidad") !== "1") return json(datos);
    // Reutilizarlo evita invalidar una identificación al abrir otra pestaña.
    const existente = nonceGoogle(request);
    const nonce = existente && /^[A-Za-z0-9_-]{43}$/.test(existente) ? existente : generarToken();
    return json({ ...datos, nonce }, 200, { "Set-Cookie": cookieNonce(request, nonce) });
  }
  if (url.pathname === "/api/resenas/google-maps") {
    if (request.method !== "GET") return error("Método no permitido.", 405, "metodo");
    if (!env.GOOGLE_PLACES_API_KEY || !env.GOOGLE_PLACE_ID) return error("Reseñas de Google no configuradas.", 503, "no_configurado");
    if (!await permitirResenas(request, env.DB, "google-maps", 10)) return error("Demasiados intentos. Intenta más tarde.", 429, "limite");
    try {
      return json(await consultarResenasGoogle(env));
    } catch {
      return error("No se pudieron consultar las reseñas de Google.", 503, "temporal");
    }
  }
  if (url.pathname === "/api/resenas/google") {
    if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
    const cuerpo = z.object({ credential: z.string().min(10).max(8192) }).safeParse(await leerJson(request));
    if (!cuerpo.success || !env.GOOGLE_CLIENT_ID) return error("Google no está disponible.", 400, "google");
    try {
      const identidad = await verificarGoogle(cuerpo.data.credential, env.GOOGLE_CLIENT_ID, nonceGoogle(request));
      return json({ nombre: identidad.nombre });
    } catch { return error("No se pudo verificar Google. Puedes continuar sin cuenta.", 401, "google"); }
  }
  if (url.pathname === "/api/resenas") {
    if (request.method === "GET") return listarAprobadas(env);
    if (request.method === "POST") return recibirResena(request, env);
    return error("Método no permitido.", 405, "metodo");
  }

  if (url.pathname === "/api/resenas/validar") {
    if (request.method !== "POST") return error("Método no permitido.", 405, "metodo");
    return validarToken(request, env);
  }

  return null;
}

async function listarAprobadas(env: Env): Promise<Response> {
  const { filas, total, promedio } = await listarResenasAprobadas(env);

  const respuesta: RespuestaPublica = {
    resenas: filas.map((fila: FilaResenaAprobada) => ({
      id: fila.id,
      calificacion: fila.calificacion,
      comentario: fila.comentario,
      nombrePublico: fila.nombre_publico,
      verificada: Boolean(fila.verificada),
      creadaEn: fila.creada_en,
    })),
    resumen: { promedio, total },
  };

  // Cada lectura refleja la moderación actual; no quedan opiniones ocultas en caché.
  return json(respuesta, 200, { "cache-control": "no-store" });
}

async function validarToken(request: Request, env: Env): Promise<Response> {
  const cuerpo = await leerJson(request);
  if (cuerpo === null) return error("Cuerpo inválido.", 400, "cuerpo");

  const parseo = validar(esquemaToken, cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");

  const resultado = await validarInvitacion(env, parseo.datos.token);
  return json(resultado, 200);
}

async function recibirResena(request: Request, env: Env): Promise<Response> {
  const cuerpo = await leerJson(request);
  if (cuerpo === null) return error("Cuerpo inválido.", 400, "cuerpo");

  const parseo = validar(esquemaCrearResena, cuerpo);
  if (!parseo.ok) return error(parseo.mensaje, 400, "validacion");

  const { datos } = parseo;

  // Captcha opcional: solo cuando hay secreto configurado.
  if (env.TURNSTILE_SECRET) {
    const ip = request.headers.get("CF-Connecting-IP");
    const humana = await verificarTurnstile(
      env.TURNSTILE_SECRET,
      datos.turnstileToken,
      ip
    );
    if (!humana) return error("No se pudo verificar que seas una persona.", 400, "captcha");
  }

  const invitacion = await validarInvitacion(env, datos.token);
  if (!invitacion.valida) return error("La invitación no está disponible.", 409, invitacion.motivo === "usada" ? "ya_resenado" : invitacion.motivo);
  let googleSub: string | undefined;
  if (datos.googleCredential) {
    try {
      googleSub = (await verificarGoogle(datos.googleCredential, env.GOOGLE_CLIENT_ID ?? "", nonceGoogle(request))).sub;
    } catch { return error("Google no pudo verificarse. Continúa sin cuenta o inténtalo de nuevo.", 401, "google"); }
  }
  const resultado = await crearResenaAtomica(env, {
    token: datos.token,
    calificacion: datos.calificacion,
    comentario: datos.comentario,
    nombrePublico: datos.nombrePublico,
    googleSub, consentimientoVersion: datos.consentimientoVersion,
  });

  if (!resultado.ok) {
    if (resultado.error) return error("No se pudo guardar. Inténtalo de nuevo.", 503, "temporal");
    const mensaje =
      resultado.motivo === "ya_resenado"
        ? "Este pedido ya tiene una reseña."
        : "La invitación no es válida o ya caducó.";
    return error(mensaje, 409, resultado.motivo ?? "invalido");
  }

  return json(
    {
      ok: true,
      id: resultado.id,
      estado: "pendiente",
      mensaje: "Tu opinión se recibió y será revisada antes de publicarse.",
    },
    201,
    datos.googleCredential ? { "Set-Cookie": cookieNonce(request, "", 0) } : undefined
  );
}
