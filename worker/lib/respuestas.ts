/** Respuestas JSON uniformes del Worker. */

const CABECERAS = {
  "content-type": "application/json; charset=utf-8",
  // La API nunca debe cachearse salvo que se diga lo contrario explícitamente.
  "cache-control": "no-store",
} as const;

export function json(cuerpo: unknown, estado = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { ...CABECERAS, ...extra },
  });
}

export function error(mensaje: string, estado = 400, codigo?: string): Response {
  return json({ error: mensaje, ...(codigo ? { codigo } : {}) }, estado);
}

export function noEncontrado(): Response {
  return error("Recurso no encontrado.", 404, "no_encontrado");
}
