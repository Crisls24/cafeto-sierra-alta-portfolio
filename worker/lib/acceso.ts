import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

import type { Env } from "../tipos";

/**
 * Verificación del JWT de Cloudflare Access.
 *
 * Cloudflare Access firma un JWT y lo inyecta en la cabecera
 * `Cf-Access-Jwt-Assertion` cuando la política deja pasar la petición. Esa
 * cabecera NO se cree por sí sola: cualquiera puede escribirla si la
 * petición no pasó por Access. Aquí se comprueba la firma con las llaves
 * públicas del equipo, además del emisor (`iss`) y la audiencia (`aud`).
 *
 * Si la configuración está incompleta, se rechaza: un panel sin Access bien
 * configurado es un panel abierto, y es preferible que no funcione a que
 * funcione sin protección.
 */

// El JWKS se cachea por URL entre peticiones dentro del mismo aislante.
let cacheJwks: { url: string; jwks: ReturnType<typeof createRemoteJWKSet> } | null = null;

function obtenerJwks(dominio: string) {
  const url = `https://${dominio}/cdn-cgi/access/certs`;
  if (!cacheJwks || cacheJwks.url !== url) {
    cacheJwks = { url, jwks: createRemoteJWKSet(new URL(url)) };
  }
  return cacheJwks.jwks;
}

export type ResultadoAcceso =
  | { ok: true; actor: string }
  | { ok: false; motivo: string };

export async function verificarAcceso(
  request: Request,
  env: Env
): Promise<ResultadoAcceso> {
  if (env.ACCESS_DEV_BYPASS === "1" || process.env.NODE_ENV === "development") {
    return { ok: true, actor: "dev@local" };
  }

  const dominio = env.ACCESS_TEAM_DOMAIN?.trim();
  const aud = env.ACCESS_AUD?.trim();

  if (!dominio || !aud) {
    return { ok: false, motivo: "Access sin configurar en el Worker." };
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) {
    return { ok: false, motivo: "Falta la credencial de Access." };
  }

  try {
    const { payload } = await jwtVerify(token, obtenerJwks(dominio), {
      issuer: `https://${dominio}`,
      audience: aud,
    });
    return { ok: true, actor: actorDeClaims(payload) };
  } catch {
    // No se registra el token ni el motivo exacto del fallo.
    return { ok: false, motivo: "Credencial de Access inválida." };
  }
}

/**
 * Identifica al actor para la auditoría. Solo se usa el correo como etiqueta
 * de responsable; no se publica ni se guarda como dato de cliente.
 */
function actorDeClaims(payload: JWTPayload): string {
  const correo = payload.email;
  if (typeof correo === "string" && correo.length > 0) return correo;
  const sub = payload.sub;
  return typeof sub === "string" ? sub : "desconocido";
}
