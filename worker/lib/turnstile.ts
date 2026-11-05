/**
 * Verificación de Turnstile (captcha de Cloudflare).
 *
 * Es opcional hasta que se configure `TURNSTILE_SECRET`. Cuando el secreto
 * existe, el token del formulario es obligatorio y se comprueba contra
 * Cloudflare. Sin secreto, el endpoint queda sin captcha y así se documenta:
 * la protección de frecuencia se resuelve aparte con reglas de rate limiting.
 */
export async function verificarTurnstile(
  secreto: string,
  token: string | undefined,
  ip: string | null
): Promise<boolean> {
  if (!token) return false;

  const cuerpo = new FormData();
  cuerpo.append("secret", secreto);
  cuerpo.append("response", token);
  if (ip) cuerpo.append("remoteip", ip);

  try {
    const respuesta = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: cuerpo }
    );
    if (!respuesta.ok) return false;
    const datos = (await respuesta.json()) as { success?: boolean };
    return datos.success === true;
  } catch {
    return false;
  }
}
