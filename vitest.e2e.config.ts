import { defineConfig } from "vitest/config";
import path from "node:path";

/** HTTP end-to-end tests against a running server: E2E_BASE_URL=http://localhost:3100 npm run test:e2e */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname), "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts") },
  },
  test: {
    environment: "node",
    env: { E2E_BASE_URL: process.env.E2E_BASE_URL ?? "http://localhost:3000" },
    setupFiles: ["tests/setup.ts"],
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 60_000,
    fileParallelism: false,
  },
});
