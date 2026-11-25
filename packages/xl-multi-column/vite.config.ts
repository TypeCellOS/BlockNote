import * as path from "path";
import { configDefaults, defineConfig, type UserConfig } from "vite-plus";
import pkg from "./package.json";
import { libraryBuildTask } from "../../scripts/build-cache-inputs.js";
import { typescriptBuild } from "../../scripts/vite-typescript-build.js";
// import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: { build: libraryBuildTask("packages/xl-multi-column") },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        // Reuse the editor module graph within each worker.
        isolate: false,
        setupFiles: [
          "./vitestSetup.ts",
          "../../tests/vitestSetup.node-fixtures.ts",
        ],
        // `.browser.test` files need a real browser; the tests package's
        // browser suite runs them.
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
      },
      plugins: [typescriptBuild()],
      resolve: {
        alias:
          conf.command === "build"
            ? ({} as Record<string, string>)
            : ({
                // load live from sources with live reload working
                "@blocknote/core": path.resolve(__dirname, "../core/src/"),
              } as Record<string, string>),
      },
      build: {
        sourcemap: false,
        lib: {
          entry: {
            "blocknote-xl-multi-column": path.resolve(
              __dirname,
              "src/index.ts",
            ),
          },
          name: "blocknote-xl-multi-column",
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
              source.startsWith("@shikijs/") ||
              source.startsWith("node:")
            );
          },
        },
      },
    }) as UserConfig,
);
