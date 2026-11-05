/** Lectura segura del cuerpo JSON de una petición. */

const LIMITE_BYTES = 20_000;

/**
 * Lee el JSON solo si el tipo es correcto y no excede el límite. Devuelve
 * `null` cuando el cuerpo no es JSON válido o es demasiado grande; el
 * llamador responde 400 en ese caso.
 */
export async function leerJson(request: Request): Promise<unknown | null> {
  const tipo = request.headers.get("content-type") ?? "";
  if (!tipo.includes("application/json")) return null;

  const declarado = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declarado) && declarado > LIMITE_BYTES) return null;

  try {
    return await request.json();
  } catch {
    return null;
  }
}
