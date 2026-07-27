import path from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  plugins: [
    {
      name: "csv-as-string",
      load(id) {
        if (id.endsWith(".csv")) {
          return `export default ${JSON.stringify(readFileSync(id, "utf8"))};`;
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
