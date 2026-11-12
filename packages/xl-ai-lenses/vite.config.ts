import react from "@vitejs/plugin-react";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, loadEnv, type UserConfig } from "vite-plus";
import pkg from "./package.json";
import { buildCacheInputs } from "../../scripts/build-cache-inputs.js";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: {
          build: {
            command:
              "tsc --project tsconfig.json --composite false --incremental false --rootDir . && vp build",
            cache: {
              input: [
                ...buildCacheInputs("packages/xl-ai-lenses"),
                { pattern: "!**/*.tsbuildinfo", base: "workspace" },
              ],
              // `types/**` must be declared too: a cache replay that restores only
              // dist/ leaves consumers without declarations (tsc is skipped).
              output: ["dist/**", "types/**", "!dist/*.tsbuildinfo"],
            },
          },
        },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        environment: "jsdom",
        setupFiles: ["./vitestSetup.ts"],
        // The live tests read the model and the API keys from the
        // environment. Loading it during a build fingerprints unrelated
        // per-run CI variables and prevents reuse.
        env:
          conf.command === "build"
            ? undefined
            : loadEnv(conf.mode, __dirname, ""),
      },
      plugins: [react(), webpackStats()],
      // used so that vitest resolves the BlockNote packages from the sources instead of the built version
      resolve: {
        alias:
          conf.command === "build"
            ? ({} as Record<string, string>)
            : ({
                // load live from sources with live reload working
                "@blocknote/core": path.resolve(__dirname, "../core/src/"),
                "@blocknote/react": path.resolve(__dirname, "../react/src/"),
                // The text lens entry points are not files at the root of
                // `src/`. The first alias that matches wins: these come
                // before the alias of `@blocknote/xl-ai`.
                "@blocknote/xl-ai/text-lens/yjs": path.resolve(
                  __dirname,
                  "../xl-ai/src/api/v2/yjs/index.ts",
                ),
                "@blocknote/xl-ai/text-lens": path.resolve(
                  __dirname,
                  "../xl-ai/src/api/v2/index.ts",
                ),
                "@blocknote/xl-ai": path.resolve(__dirname, "../xl-ai/src/"),
                "@blocknote/xl-multi-column": path.resolve(
                  __dirname,
                  "../xl-multi-column/src/",
                ),
                "@shared": path.resolve(__dirname, "../../shared/"),
              } as Record<string, string>),
      },
      build: {
        sourcemap: false,
        lib: {
          entry: {
            "blocknote-xl-ai-lenses": path.resolve(__dirname, "src/index.ts"),
            server: path.resolve(__dirname, "src/server.ts"),
            yjs14: path.resolve(__dirname, "src/yjs14.ts"),
            "yjs14-server": path.resolve(__dirname, "src/yjs14-server.ts"),
          },
          name: "blocknote-xl-ai-lenses",
          cssFileName: "style",
          formats: ["es"],
          fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
          // make sure to externalize deps that shouldn't be bundled
          // into your library
          external: (source) => {
            // Bundle react-icons into the output (tree-shaken) so consumers
            // don't need to install it as a peer/runtime dependency.
            const bundledDeps = ["react-icons"];
            if (
              bundledDeps.some(
                (dep) => source === dep || source.startsWith(dep + "/"),
              )
            ) {
              return false;
            }
            if (
              Object.keys({
                ...pkg.dependencies,
                ...((pkg as any).peerDependencies || {}),
                ...pkg.devDependencies,
              }).some((dep) => source === dep || source.startsWith(dep + "/"))
            ) {
              return true;
            }
            return (
              source.startsWith("react/") ||
              source.startsWith("react-dom/") ||
              source.startsWith("prosemirror-") ||
              source.startsWith("@tiptap/") ||
              source.startsWith("@blocknote/") ||
              source.startsWith("node:")
            );
          },
        },
      },
    }) as UserConfig,
);
