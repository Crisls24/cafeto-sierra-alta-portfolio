import { hashToken } from "./tokens";

/** Ventanas cortas con clave hash; nunca se guarda la IP ni un token de invitación. */
export async function permitirResenas(request: Request, db: D1Database, tipo: string, limite: number) {
  const ahora = Math.floor(Date.now() / 1000);
  const ventana = Math.floor(ahora / 600);
  const clave = await hashToken(`${tipo}:${ventana}:${request.headers.get("CF-Connecting-IP") ?? "local"}`);
  const resultados = await db.batch([
    db.prepare("DELETE FROM limites_resenas WHERE expira_en < ?").bind(ahora),
    db.prepare("INSERT INTO limites_resenas (clave, intentos, expira_en) VALUES (?, 1, ?) ON CONFLICT(clave) DO UPDATE SET intentos = intentos + 1 RETURNING intentos").bind(clave, (ventana + 1) * 600),
  ]);
  const fila = resultados[1]?.results[0] as { intentos: number } | undefined;
  return Number(fila?.intentos ?? limite + 1) <= limite;
}
