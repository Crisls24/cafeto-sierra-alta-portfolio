import { z } from "zod";
import type { Env } from "../tipos";

const https = z.string().url().refine((valor) => new URL(valor).protocol === "https:");
const esquemaLugar = z.object({
  rating: z.number().min(1).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().default(0),
  reviews: z.array(z.object({
    name: z.string(),
    rating: z.number().int().min(1).max(5),
    originalText: z.object({ text: z.string() }).optional(),
    text: z.object({ text: z.string() }).optional(),
    publishTime: z.string(),
    googleMapsUri: https.optional(),
    authorAttribution: z.object({
      displayName: z.string().min(1),
      uri: https.optional(),
      photoUri: https.optional(),
    }),
  })).max(5).default([]),
});

/** Se consulta en vivo; no se guarda contenido de Places en D1 ni cachés. */
export async function consultarResenasGoogle(env: Env, consultar: typeof fetch = fetch) {
  if (!env.GOOGLE_PLACES_API_KEY || !env.GOOGLE_PLACE_ID) return null;
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(env.GOOGLE_PLACE_ID)}`);
  url.searchParams.set("languageCode", "es");
  const respuesta = await consultar(url, {
    headers: {
      "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!respuesta.ok) throw new Error("Places no disponible");
  const lugar = esquemaLugar.parse(await respuesta.json());
  return {
    promedio: lugar.rating ?? 0,
    total: lugar.userRatingCount,
    resenas: lugar.reviews.map((resena) => ({
      id: resena.name,
      calificacion: resena.rating,
      comentario: resena.originalText?.text ?? resena.text?.text ?? "",
      creadaEn: resena.publishTime,
      enlace: resena.googleMapsUri ?? null,
      nombrePublico: resena.authorAttribution.displayName,
      perfil: resena.authorAttribution.uri ?? null,
      foto: resena.authorAttribution.photoUri ?? null,
    })),
  };
}
