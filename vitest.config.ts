import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    clearMocks: true,
    restoreMocks: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
          'src/cli.ts',
          'src/types/**',
          'src/commands/webhooks/listen.ts',
          'src/lib/browser.ts',
          'src/commands/**/index.ts',
          'src/commands/ui.ts',
          'src/mcp/server.ts', // MCP server integration — requires stdio transport, tested via MCP protocol
        ],
      thresholds: {
        lines: 69,
        functions: 60,
        branches: 62,
        statements: 69,
      },
    },
  },
});
