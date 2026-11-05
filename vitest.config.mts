import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

/**
 * Pruebas del Worker contra D1 real (workerd + SQLite local).
 *
 * Se usa el pool de Cloudflare para que la atomicidad se pruebe en el mismo
 * motor que producción, no en un mock. Las migraciones de `migrations/` se
 * cargan y se aplican en el arranque de cada suite (ver worker/tests/setup.ts).
 *
 * El archivo es `.mts` porque esta config importa un paquete ESM puro
 * (`@cloudflare/vitest-pool-workers`); en `.ts` Vitest la empaqueta como CJS
 * y el require falla.
 */
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            ACCESS_DEV_BYPASS: "0",
          },
        },
      }),
    ],
    test: {
      include: ["worker/**/*.test.ts"],
      setupFiles: ["./worker/tests/setup.ts"],
    },
  };
});
