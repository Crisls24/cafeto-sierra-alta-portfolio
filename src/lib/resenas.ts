import { z } from "zod";

import { TEXTOS_RESENAS } from "../data/resenas";

/**
 * Lectura y formatos del sistema de reseñas.
 *
 * El esquema es el contrato público del Worker (`worker/tipos.ts`,
 * `GET /api/resenas`) duplicado a propósito aquí, en la capa de cálculo:
 * así un cambio de forma del API se detecta en runtime al leer los datos y
 * no se pinta una tarjeta con campo roto. Los que se calculan (plurals,
 * fecha, iniciales) viven aquí y no en el componente.
 */

export const esquemaRespuestaResenas = z.object({
  resenas: z.array(
    z.object({
      id: z.string().min(1),
      calificacion: z.number().int().min(1).max(5),
      comentario: z.string(),
      nombrePublico: z.string().min(1),
      verificada: z.boolean(),
      creadaEn: z.string().min(1),
    })
  ),
  resumen: z.object({
    promedio: z.number().min(0).max(5),
    total: z.number().int().min(0),
  }),
});

export type RespuestaResenas = z.infer<typeof esquemaRespuestaResenas>;
export type ResenaPublica = RespuestaResenas["resenas"][number];
export type ResumenResenas = RespuestaResenas["resumen"];

export type ResultadoLectura =
  | { ok: true; datos: RespuestaResenas }
  | { ok: false };

/**
 * Lee las reseñas aprobadas y las valida contra el contrato antes de
 * entregarlas a la pantalla. Un cuerpo mal formado es un error de lectura,
 * no un render roto.
 */
export async function leerResenas(): Promise<ResultadoLectura> {
  try {
    const respuesta = await fetch("/api/resenas", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!respuesta.ok) return { ok: false };
    const datos = esquemaRespuestaResenas.parse(await respuesta.json());
    return { ok: true, datos };
  } catch {
    return { ok: false };
  }
}

/** "12 reseñas verificadas" con la forma correcta para 0, 1 y N. */
export function textoTotalVerificadas(total: number): string {
  const parte =
    total === 1
      ? TEXTOS_RESENAS.resumenCantidadSingular
      : TEXTOS_RESENAS.resumenCantidadPlural;
  return `${total} ${parte}`;
}

/** Iniciales del nombre mostrado: "Ana Martínez" → "AM". */
export function inicialesDe(nombre: string): string {
  const partes = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return partes.length > 0
    ? partes.map((parte) => parte.charAt(0).toUpperCase()).join("")
    : "—";
}

/** Fecha legible sin hora; vacío si el dato no es una fecha válida. */
export function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(fecha);
}