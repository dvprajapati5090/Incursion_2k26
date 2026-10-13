import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["integration/**/*.test.js"],
    coverage: {
      provider: "v8",
      allowExternal: true,
      reporter: ["text", "html"],
      include: ["../engine/src/**/*.js", "../server/src/modules/import/**/*.js"],
      reportsDirectory: "coverage",
    },
  },
});
