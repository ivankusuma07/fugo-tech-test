import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '#shared': r('./shared') },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['tests/unit/**/*.test.ts'] },
      },
      {
        // Needs Postgres (docker compose up -d db). Uses a separate `fugo_test` database.
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          globalSetup: ['tests/support/setup-integration-db.ts'],
          setupFiles: ['tests/support/nitro-globals.ts'],
          fileParallelism: false,
        },
      },
      {
        // Builds and boots the real app, then talks HTTP to it.
        extends: true,
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          globalSetup: ['tests/support/setup-e2e-db.ts'],
          testTimeout: 30_000,
          hookTimeout: 240_000,
        },
      },
    ],
  },
})
