import { error, noEncontrado } from "./lib/respuestas";
import { rutasAdmin } from "./rutas/admin";
import { rutasPublicas } from "./rutas/publico";
import type { Env } from "./tipos";

/**
 * Punto de entrada del Worker.
 *
 * `run_worker_first: ["/api/*", "/resena/*"]` (wrangler.jsonc) manda aquí
 * las llamadas a la API y las reseñas por token. El resto lo sirven los
 * Static Assets directamente. Aun así se deja el respaldo a
 * `env.ASSETS.fetch` para no romper nada si un asset no coincide.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";

    if (url.pathname.startsWith("/api/")) {
      try {
        const admin = await rutasAdmin(request, env, url);
        if (admin) return admin;

        const publica = await rutasPublicas(request, env, url);
        if (publica) return publica;

        return noEncontrado();
      } catch {
        // Nunca se filtran detalles del error al cliente.
        return error("Error interno del servidor.", 500, "interno");
      }
    }

    // El formulario de reseña vive en `/resena/<token>`, pero el sitio es un
    // export estático: el token no se conoce en el build, así que no hay un
    // asset por token. Se sirve siempre la misma página y el componente lee
    // el token del path en el navegador. La URL no cambia.
    //
    // Se pide `/resena/` (con diagonal): pedir `/resena` hace que los Static
    // Assets respondan 307 hacia `/resena/` y el navegador pierde el token del
    // path. `/resena/` se sirve directo y la URL original no cambia.
    if (url.pathname.startsWith("/resena/")) {
      const asset = await env.ASSETS.fetch(new Request(new URL("/resena/", url.origin), request));
      const respuesta = new Response(asset.body, asset);
      // Google recibe el origen autorizado, nunca el path con la invitación.
      respuesta.headers.set("Referrer-Policy", "origin");
      respuesta.headers.set("Cache-Control", "no-store");
      respuesta.headers.set("X-Robots-Tag", "noindex, nofollow");
      return respuesta;
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
