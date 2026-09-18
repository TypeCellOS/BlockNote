import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: "tsc",
        input: [
          { auto: true },
          // Auto-detection tracks the conventional src/ layout, but this
          // package's sources live at the package root (api/, util/,
          // testDocument*.ts, ...) - without listing them, edits here never
          // change the input hash, and cache hits restore stale dist
          // artifacts over fresh builds.
          "api/**",
          "assets/**",
          "util/**",
          "*.ts",
          "tsconfig.json",
          { pattern: "!**/*.tsbuildinfo", base: "workspace" },
        ],
        // Without declared outputs the cache can't restore `dist/` on a
        // cache hit, leaving consumers type-checking against missing or
        // stale declarations.
        output: ["dist/**", "!dist/**/*.tsbuildinfo"],
      },
    },
  },
});
