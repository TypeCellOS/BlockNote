import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, type UserConfig } from "vite-plus";
import { buildCacheInputs } from "../../scripts/build-cache-inputs.js";

// https://vitejs.dev/config/
export default defineConfig(
  () =>
    ({
      run: {
        tasks: {
          "build:wasm": {
            command: "node scripts/ensure-wasm.mjs --force",
            cache: false,
          },
          build: {
            // ensure-wasm restores or builds pkg/ when missing or stale
            // (content-hashed; see scripts/ensure-wasm.mjs) - so every
            // consumer of this task, including the Vercel builds, gets the
            // wasm without a separate step. Rust is needed locally only on
            // a cache miss (pinned in rust/rust-toolchain.toml).
            command:
              "node scripts/ensure-wasm.mjs && tsc --project tsconfig.json --composite false --incremental false --rootDir . && vp build",
            cache: {
              env: [
                "BLOCKNOTE_TYPST_CACHE_DIR",
                "BLOCKNOTE_TYPST_DOWNLOAD",
                "BLOCKNOTE_TYPST_SOURCE_ONLY",
                "XDG_CACHE_HOME",
              ],
              input: [
                ...buildCacheInputs("packages/xl-typst-compiler"),
                { pattern: "!**/*.tsbuildinfo", base: "workspace" },
                "rust/Cargo.toml",
                "rust/Cargo.lock",
                "rust/rust-toolchain.toml",
                "rust/src/**",
                "!rust/target/**",
              ],
              // `types/**` must be declared too: a cache replay that restores
              // only dist/ leaves consumers without declarations. pkg/** is
              // produced by ensure-wasm and replayed with the rest.
              output: ["dist/**", "types/**", "pkg/**", "!dist/*.tsbuildinfo"],
            },
          },
        },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        environment: "node",
        testTimeout: 30000,
      },
      plugins: [webpackStats() as any],
      build: {
        sourcemap: false,
        lib: {
          entry: {
            "blocknote-xl-typst-compiler": path.resolve(
              __dirname,
              "src/index.ts",
            ),
          },
          name: "blocknote-xl-typst-compiler",
          formats: ["es"],
          fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
          // The wasm-bindgen glue (self-referenced as .../pkg) ships as
          // files next to dist/, not bundled: the glue locates the .wasm
          // relative to its own URL, which bundling would break.
          external: (source) =>
            source.startsWith("@blocknote/") || source.startsWith("node:"),
          output: { globals: {} },
        },
      },
    }) as UserConfig,
);
