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
