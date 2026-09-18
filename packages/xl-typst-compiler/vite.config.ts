import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, type UserConfig } from "vite-plus";

// https://vitejs.dev/config/
export default defineConfig(
  () =>
    ({
      run: {
        tasks: {
          build: {
            // ensure-wasm builds pkg/ from rust/ when missing or stale
            // (content-hashed; see scripts/ensure-wasm.mjs) - so every
            // consumer of this task, including the Vercel builds, gets the
            // wasm without a separate step. Requires a Rust toolchain
            // locally (pinned in rust/rust-toolchain.toml).
            command: "node scripts/ensure-wasm.mjs && tsc && vp build",
            input: [
              { auto: true },
              { pattern: "!**/*.tsbuildinfo", base: "workspace" },
              { pattern: "rust/**", base: "workspace" },
              { pattern: "!rust/target/**", base: "workspace" },
            ],
            // `types/**` must be declared too: a cache replay that restores
            // only dist/ leaves consumers without declarations. pkg/** is
            // produced by ensure-wasm and replayed with the rest.
            output: ["dist/**", "types/**", "pkg/**", "!dist/*.tsbuildinfo"],
          },
        },
      },
      test: {
        environment: "node",
        testTimeout: 30000,
      },
      plugins: [webpackStats() as any],
      build: {
        sourcemap: true,
        lib: {
          entry: {
            "blocknote-xl-typst-compiler": path.resolve(
              __dirname,
              "src/index.ts",
            ),
          },
          name: "blocknote-xl-typst-compiler",
          formats: ["es", "cjs"],
          fileName: (format, entryName) =>
            format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
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
