/**
 * Tokens de invitación.
 *
 * El token que viaja en la URL se genera con `crypto.getRandomValues` (32
 * bytes, 256 bits) y se codifica en base64url para que sea seguro en una
 * URL. Lo único que se guarda en D1 es su SHA-256: si la base se filtra, un
 * hash no permite reconstruir el enlace.
 */

const BYTES_TOKEN = 32;

function aBase64Url(bytes: Uint8Array): string {
  let binario = "";
  for (const byte of bytes) {
    binario += String.fromCharCode(byte);
  }
  return btoa(binario).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Genera un token nuevo, impredecible y seguro para URL. */
export function generarToken(): string {
  const bytes = new Uint8Array(BYTES_TOKEN);
  crypto.getRandomValues(bytes);
  return aBase64Url(bytes);
}

/**
 * Hash determinista del token. Se usa tanto al guardar (al crear la
 * invitación) como al buscar (al validar o consumir), de modo que la cadena
 * original nunca toca la base.
 */
export async function hashToken(token: string): Promise<string> {
  const datos = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
