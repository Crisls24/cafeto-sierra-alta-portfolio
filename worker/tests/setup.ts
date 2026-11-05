import { applyD1Migrations, env } from "cloudflare:test";
import { beforeAll } from "vitest";

/**
 * Aplica la migración versionada de `migrations/` a la D1 de prueba antes de
 * cada suite. `TEST_MIGRATIONS` lo inyecta `vitest.config.ts` con
 * `readD1Migrations`.
 */
beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});
