import { z } from "zod";

const https = z.string().url().refine((valor) => new URL(valor).protocol === "https:");
const esquemaConfig = z.object({
  googleClientId: z.string().nullable(),
  googlePerfil: https.nullable(),
  googleResenasDisponibles: z.boolean(),
  nonce: z.string().optional(),
});
const esquemaResenas = z.object({
  promedio: z.number().min(0).max(5),
  total: z.number().int().nonnegative(),
  resenas: z.array(z.object({
    id: z.string(), calificacion: z.number().int().min(1).max(5),
    comentario: z.string(), creadaEn: z.string(), nombrePublico: z.string(),
    enlace: https.nullable(), perfil: https.nullable(), foto: https.nullable(),
  })),
});
export type ResenasDeGoogle = z.infer<typeof esquemaResenas>;

export async function leerConfigGoogle(identidad = false) {
  const respuesta = await fetch(`/api/resenas/config${identidad ? "?identidad=1" : ""}`, { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!respuesta.ok) throw new Error("Configuración no disponible");
  return esquemaConfig.parse(await respuesta.json());
}

export async function verificarIdentidadGoogle(credential: string) {
  const respuesta = await fetch("/api/resenas/google", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
    signal: AbortSignal.timeout(10000),
  });
  if (!respuesta.ok) throw new Error("Identidad no disponible");
  return z.object({ nombre: z.string() }).parse(await respuesta.json());
}

export async function leerResenasGoogle() {
  const respuesta = await fetch("/api/resenas/google-maps", { cache: "no-store", signal: AbortSignal.timeout(10000) });
  if (!respuesta.ok) throw new Error("Reseñas no disponibles");
  return esquemaResenas.parse(await respuesta.json());
}
