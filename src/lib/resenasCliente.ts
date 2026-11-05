import { z } from "zod";

import { MOTIVOS_INVITACION_INVALIDA } from "../data/resenas";

/**
 * Cliente del formulario público de reseña.
 *
 * Habla con las dos rutas públicas del Worker (`worker/rutas/publico.ts`):
 * `POST /api/resenas/validar` para comprobar el token del enlace y
 * `POST /api/resenas` para enviar la reseña. Los esquemas duplican el
 * contrato del Worker (`worker/lib/db.ts`, `worker/lib/validar.ts`) a
 * propósito, igual que en `src/lib/resenas.ts`: un cambio de forma se
 * detecta en runtime y no deja un formulario roto en pantalla.
 */

/** Resultado de validar el token (`validarInvitacion`). */
export const esquemaValidarInvitacion = z.object({
  valida: z.boolean(),
  motivo: z.string().min(1),
});

export type MotivoInvitacionInvalida = keyof typeof MOTIVOS_INVITACION_INVALIDA;

export type ResultadoValidacionToken =
  | { ok: true; valida: true }
  | { ok: true; valida: false; motivo: MotivoInvitacionInvalida }
  | { ok: false };

const esquemaResenaCreada = z.object({
  ok: z.literal(true),
  id: z.string().min(1),
  estado: z.literal("pendiente"),
});

export type ResultadoEnvioResena =
  | { ok: true }
  | { ok: false; motivo: "ya_resenado" | "invalida" | "red" | "google" | "limite"; detalle?: MotivoInvitacionInvalida };

/** Comprueba el token antes de mostrar el formulario. */
export async function validarTokenInvitacion(
  token: string
): Promise<ResultadoValidacionToken> {
  try {
    const respuesta = await fetch("/api/resenas/validar", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!respuesta.ok) return { ok: false };
    const datos = esquemaValidarInvitacion.parse(await respuesta.json());
    if (datos.valida) return { ok: true, valida: true };
    return { ok: true, valida: false, motivo: normalizarMotivo(datos.motivo) };
  } catch {
    return { ok: false };
  }
}

export interface EntradaResena {
  token: string;
  calificacion: number;
  comentario: string;
  nombrePublico: string;
  aceptaPublicacion: true;
  consentimientoVersion: "2026-10-30";
  googleCredential?: string;
}

/** Envía la reseña. El Worker la guarda como `pendiente` para moderación. */
export async function enviarResena(
  entrada: EntradaResena
): Promise<ResultadoEnvioResena> {
  try {
    const respuesta = await fetch("/api/resenas", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(entrada),
    });
    if (respuesta.status === 201) {
      esquemaResenaCreada.parse(await respuesta.json());
      return { ok: true };
    }
    if (respuesta.status === 401) return { ok: false, motivo: "google" };
    if (respuesta.status === 429) return { ok: false, motivo: "limite" };
    if (respuesta.status === 409) {
      let codigo = "";
      try {
        const cuerpo = (await respuesta.json()) as { codigo?: unknown };
        if (typeof cuerpo.codigo === "string") codigo = cuerpo.codigo;
      } catch {
        // Sin cuerpo JSON válido se trata como enlace inválido.
      }
      return { ok: false, motivo: codigo === "ya_resenado" ? "ya_resenado" : "invalida", detalle: normalizarMotivo(codigo) };
    }
    return { ok: false, motivo: "red" };
  } catch {
    return { ok: false, motivo: "red" };
  }
}

/** Cualquier motivo no reconocido cae en el texto genérico. */
function normalizarMotivo(motivo: string): MotivoInvitacionInvalida {
  return motivo in MOTIVOS_INVITACION_INVALIDA
    ? (motivo as MotivoInvitacionInvalida)
    : "generico";
}
