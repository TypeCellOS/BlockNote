import * as path from "path";
import { configDefaults, defineConfig, type UserConfig } from "vite-plus";
import { libraryBuildTask } from "../../scripts/build-cache-inputs.js";
import { typescriptBuild } from "../../scripts/vite-typescript-build.js";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: { build: libraryBuildTask("packages/xl-typst-exporter") },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        setupFiles: ["../../tests/vitestSetup.node-fixtures.ts"],
        // `.browser.test` files need a real browser; the tests package's
        // browser suite runs them.
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
        testTimeout: 15000,
      },
      plugins: [typescriptBuild()],
      // resolve workspace packages from sources (live reload) in dev/test
      resolve: {
        alias:
          conf.command === "build"
            ? ({} as Record<string, string>)
            : ({
                "@blocknote/core": path.resolve(__dirname, "../core/src/"),
                "@blocknote/xl-multi-column": path.resolve(
                  __dirname,
                  "../xl-multi-column/src/",
                ),
              } as Record<string, string>),
      },
      build: {
        sourcemap: false,
        lib: {
          entry: {
            "blocknote-xl-typst-exporter": path.resolve(
              __dirname,
              "src/index.ts",
            ),
          },
          name: "blocknote-xl-typst-exporter",
          formats: ["es"],
          fileName: (_format, entryName) => `${entryName}.js`,
        },
        rollupOptions: {
          external: (source) =>
            source.startsWith("@blocknote/") || source.startsWith("node:"),
          output: { globals: {} },
        },
      },
    }) as UserConfig,
);
