import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Automatic JSX runtime (imports from react/jsx-runtime) so components render in tests
  // without React needing to be in scope — and avoids the ESM-only @vitejs/plugin-react.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
