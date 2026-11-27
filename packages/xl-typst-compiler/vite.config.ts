import * as path from "path";
import { configDefaults, defineConfig, type UserConfig } from "vite-plus";
import { libraryBuildTask } from "../../scripts/build-cache-inputs.js";
import { typescriptBuild } from "../../scripts/vite-typescript-build.js";

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
          build: libraryBuildTask("packages/xl-typst-compiler", [
            "ensure-wasm",
          ]),
          "ensure-wasm": {
            command: "node scripts/ensure-wasm.mjs",
            cache: {
              env: ["BLOCKNOTE_TYPST_DOWNLOAD", "BLOCKNOTE_TYPST_SOURCE_ONLY"],
              input: [
                // The verifier reads pkg/ and the download/Rust caches, but
                // none of that state should invalidate a verified WASM build.
                "scripts/{ensure-wasm,wasm-build,wasm-cache}.mjs",
                "package.json",
                { pattern: "pnpm-lock.yaml", base: "workspace" },
                "rust/Cargo.toml",
                "rust/Cargo.lock",
                "rust/rust-toolchain.toml",
                "rust/src/**",
              ],
              output: ["pkg/**"],
            },
          },
        },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
        setupFiles: ["../../tests/vitestSetup.node-fixtures.ts"],
        testTimeout: 30000,
      },
      plugins: [typescriptBuild()],
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
