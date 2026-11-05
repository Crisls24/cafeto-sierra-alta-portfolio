import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const clavesGoogle = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
export const COOKIE_NONCE_GOOGLE = "cafeto_google_nonce";

export function nonceGoogle(request: Request) {
  return request.headers.get("Cookie")?.split(";").map((p) => p.trim()).find((p) => p.startsWith(`${COOKIE_NONCE_GOOGLE}=`))?.slice(COOKIE_NONCE_GOOGLE.length + 1);
}
export function cookieNonce(request: Request, nonce: string, segundos = 900) {
  return `${COOKIE_NONCE_GOOGLE}=${nonce}; Path=/api/resenas; HttpOnly; SameSite=Strict; Max-Age=${segundos}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
/** No guarda correo, foto ni access tokens, y nunca concede permisos de Access. */
export async function verificarGoogle(credential: string, audiencia: string, nonce: string | undefined, claves: JWTVerifyGetKey = clavesGoogle) {
  if (!audiencia || !nonce) throw new Error("Identidad no disponible");
  const { payload } = await jwtVerify(credential, claves, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: audiencia, algorithms: ["RS256"], requiredClaims: ["sub", "exp", "iat", "nonce"], maxTokenAge: "1h",
  });
  if (payload.nonce !== nonce || !payload.sub) throw new Error("Nonce inválido");
  return { sub: payload.sub, nombre: typeof payload.name === "string" ? payload.name.slice(0, 60) : "" };
}
