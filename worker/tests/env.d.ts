import type { Env as EnvWorker } from "../tipos";

// `env` de `cloudflare:test` está tipado como `Cloudflare.Env`, un interfaz
// vacío que workers-types deja para aumentar. Aquí se le añaden los mismos
// bindings del Worker (para no duplicar la definición) y el binding de
// migraciones que inyecta vitest.config.ts, que solo existe en pruebas.
declare global {
  namespace Cloudflare {
    interface Env extends EnvWorker {
      TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    }
  }
}
