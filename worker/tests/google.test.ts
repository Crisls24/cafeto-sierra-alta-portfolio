import { describe, expect, it } from "vitest";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { verificarGoogle } from "../lib/google";
import { env } from "cloudflare:test";
import { consultarResenasGoogle } from "../lib/resenasGoogle";
import { rutasPublicas } from "../rutas/publico";

describe("verificación criptográfica de Google (claves de prueba locales)", () => {
  it("valida firma, emisor, audiencia, caducidad y nonce sin guardar correo", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    const claves = createLocalJWKSet({ keys: [{ ...jwk, kid: "prueba", alg: "RS256" }] });
    const token = await new SignJWT({ nonce: "nonce-seguro", name: "Nombre", email: "privado@example.test" }).setProtectedHeader({ alg: "RS256", kid: "prueba" }).setSubject("sub-estable").setIssuer("https://accounts.google.com").setAudience("cliente").setIssuedAt().setExpirationTime("5m").sign(privateKey);
    expect(await verificarGoogle(token, "cliente", "nonce-seguro", claves)).toEqual({ sub: "sub-estable", nombre: "Nombre" });
    await expect(verificarGoogle(token, "otro", "nonce-seguro", claves)).rejects.toThrow();
    await expect(verificarGoogle(token, "cliente", "otro-nonce", claves)).rejects.toThrow();
    await expect(verificarGoogle(token, "cliente", undefined, claves)).rejects.toThrow();
    const otroEmisor = await new SignJWT({ nonce: "nonce-seguro" }).setProtectedHeader({ alg: "RS256", kid: "prueba" }).setSubject("sub-estable").setIssuer("https://ajeno.test").setAudience("cliente").setIssuedAt().setExpirationTime("5m").sign(privateKey);
    await expect(verificarGoogle(otroEmisor, "cliente", "nonce-seguro", claves)).rejects.toThrow();
    const otrasClaves = await generateKeyPair("RS256");
    const falsaFirma = await new SignJWT({ nonce: "nonce-seguro" }).setProtectedHeader({ alg: "RS256", kid: "prueba" }).setSubject("sub-estable").setIssuer("https://accounts.google.com").setAudience("cliente").setIssuedAt().setExpirationTime("5m").sign(otrasClaves.privateKey);
    await expect(verificarGoogle(falsaFirma, "cliente", "nonce-seguro", claves)).rejects.toThrow();
    const vencido = await new SignJWT({ nonce: "nonce-seguro" }).setProtectedHeader({ alg: "RS256", kid: "prueba" }).setSubject("sub-estable").setIssuer("https://accounts.google.com").setAudience("cliente").setIssuedAt().setExpirationTime(1).sign(privateKey);
    await expect(verificarGoogle(vencido, "cliente", "nonce-seguro", claves)).rejects.toThrow();
  });
});

describe("opiniones de Google Maps", () => {
  it("consulta únicamente el lugar configurado y conserva la atribución del autor", async () => {
    const datosEnv = { ...env, GOOGLE_PLACES_API_KEY: "clave-privada", GOOGLE_PLACE_ID: "lugar-real" };
    const consultar = (async (entrada: RequestInfo | URL, opciones?: RequestInit) => {
      expect(String(entrada)).toBe("https://places.googleapis.com/v1/places/lugar-real?languageCode=es");
      expect(opciones?.headers).toMatchObject({ "X-Goog-Api-Key": "clave-privada", "X-Goog-FieldMask": "rating,userRatingCount,reviews" });
      return Response.json({ rating: 4.5, userRatingCount: 12, reviews: [{
        name: "places/lugar-real/reviews/1", rating: 1,
        originalText: { text: "Opinión original" }, text: { text: "Traducción" },
        publishTime: "2026-11-03T12:00:00Z", googleMapsUri: "https://www.google.com/maps/reviews/1",
        authorAttribution: { displayName: "Autora", uri: "https://www.google.com/maps/contrib/1", photoUri: "https://lh3.googleusercontent.com/foto" },
      }] });
    }) as typeof fetch;
    const resultado = await consultarResenasGoogle(datosEnv, consultar);
    expect(resultado).toMatchObject({ promedio: 4.5, total: 12, resenas: [{ calificacion: 1, comentario: "Opinión original", nombrePublico: "Autora", perfil: "https://www.google.com/maps/contrib/1", foto: "https://lh3.googleusercontent.com/foto" }] });
    expect(JSON.stringify(resultado)).not.toContain("clave-privada");
  });

  it("tolera opiniones sin texto, foto ni enlace y un lugar sin opiniones", async () => {
    const datosEnv = { ...env, GOOGLE_PLACES_API_KEY: "clave", GOOGLE_PLACE_ID: "id" };
    const sinTexto = (async () => Response.json({ rating: 5, userRatingCount: 1, reviews: [{ name: "1", rating: 5, publishTime: "2026-11-03", authorAttribution: { displayName: "Autor" } }] })) as typeof fetch;
    expect(await consultarResenasGoogle(datosEnv, sinTexto)).toMatchObject({ resenas: [{ comentario: "", foto: null, perfil: null, enlace: null }] });
    expect(await consultarResenasGoogle(datosEnv, (async () => Response.json({})) as typeof fetch)).toEqual({ promedio: 0, total: 0, resenas: [] });
    await expect(consultarResenasGoogle(datosEnv, (async () => new Response("error", { status: 403 })) as typeof fetch)).rejects.toThrow();
  });

  it("no consulta Places sin configuración ni expone la clave en la configuración pública", async () => {
    expect(await consultarResenasGoogle({ ...env, GOOGLE_PLACES_API_KEY: "" })).toBeNull();
    const url = new URL("https://cafeto.test/api/resenas/config");
    const respuesta = await rutasPublicas(new Request(url), { ...env, GOOGLE_PLACES_API_KEY: "clave-privada", GOOGLE_PLACE_ID: "id" }, url);
    expect(respuesta?.headers.get("cache-control")).toBe("no-store");
    const datos = await respuesta!.json();
    expect(datos).toMatchObject({ googleResenasDisponibles: true });
    expect(JSON.stringify(datos)).not.toContain("clave-privada");
    const sinConfig = new URL("https://cafeto.test/api/resenas/google-maps");
    expect((await rutasPublicas(new Request(sinConfig), { ...env, GOOGLE_PLACES_API_KEY: "" }, sinConfig))?.status).toBe(503);
  });

  it("emite cookie privada al solicitar identidad y conserva el nonce entre pestañas", async () => {
    const url = new URL("https://cafeto.test/api/resenas/config?identidad=1");
    const datosEnv = { ...env, GOOGLE_CLIENT_ID: "cliente" };
    const primera = await rutasPublicas(new Request(url), datosEnv, url);
    const { nonce } = await primera!.json() as { nonce: string };
    expect(primera?.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict; Max-Age=900; Secure");
    const segunda = await rutasPublicas(new Request(url, { headers: { Cookie: `cafeto_google_nonce=${nonce}` } }), datosEnv, url);
    expect(await segunda!.json()).toMatchObject({ nonce });
  });
});
