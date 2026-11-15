import { resolve } from "node:path";
import { configDefaults, defineConfig } from "vite-plus";
import { buildCacheInputs } from "../../scripts/build-cache-inputs.js";
import pkg from "./package.json";

export default defineConfig({
  run: {
    tasks: {
      build: {
        command:
          "tsc --project tsconfig.json --composite false --incremental false --rootDir . && vp build",
        cache: {
          // Track declarations explicitly too: the compiler subprocess's automatic
          // read tracking alone can otherwise replay stale type outputs.
          input: [...buildCacheInputs("packages/embeds"), "src/**"],
          output: ["dist/**", "types/**"],
        },
      },
    },
  },
  test: { exclude: [...configDefaults.exclude, "**/*.browser.test.*"] },
  build: {
    lib: {
      entry: {
        "blocknote-embeds": resolve(import.meta.dirname, "src/index.ts"),
        oembed: resolve(import.meta.dirname, "src/oembed.ts"),
        "docx-exporter": resolve(
          import.meta.dirname,
          "src/docx-exporter/index.ts",
        ),
        "typst-exporter": resolve(
          import.meta.dirname,
          "src/typst-exporter/index.ts",
        ),
        "odt-exporter": resolve(
          import.meta.dirname,
          "src/odt-exporter/index.ts",
        ),
        "email-exporter": resolve(
          import.meta.dirname,
          "src/email-exporter/index.tsx",
        ),
        "pdf-exporter": resolve(
          import.meta.dirname,
          "src/pdf-exporter/index.tsx",
        ),
        "providers/youtube": resolve(
          import.meta.dirname,
          "src/providers/youtube.tsx",
        ),
        "providers/bluesky": resolve(
          import.meta.dirname,
          "src/providers/bluesky.tsx",
        ),
        "providers/oembed": resolve(
          import.meta.dirname,
          "src/providers/oembed.tsx",
        ),
      },
      formats: ["es"],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external(source) {
        return Object.keys({
          ...pkg.dependencies,
          ...pkg.peerDependencies,
        }).some(
          (dependency) =>
            source === dependency || source.startsWith(`${dependency}/`),
        );
      },
    },
  },
});
