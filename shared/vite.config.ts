import { defineConfig } from "vite-plus";
import { buildCacheInputs } from "../scripts/build-cache-inputs.js";

export default defineConfig({
  run: {
    tasks: {
      build: {
        // Emit only this package; vp orders dependencies. Build mode would
        // rewrite shared declarations concurrently. Keep existing output paths.
        command:
          "tsc --project tsconfig.json --declaration --composite false --incremental false --rootDir .",
        input: [
          ...buildCacheInputs("shared"),
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
