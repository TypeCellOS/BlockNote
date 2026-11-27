import react from "@vitejs/plugin-react";
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
        tasks: { build: libraryBuildTask("packages/mantine") },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
        setupFiles: ["../../tests/vitestSetup.node-fixtures.ts"],
      },
      plugins: [typescriptBuild(), react()],
      // used so that vitest resolves the core package from the sources instead of the built version
      resolve: {
        alias:
          conf.command === "build"
            ? ({
                // Vite 8's postcss-import can't resolve bare package specifiers in CSS @import
                "@blocknote/react/style.css": path.resolve(
                  __dirname,
                  "../react/dist/style.css",
                ),
              } as Record<string, string>)
            : ({
                // load live from sources with live reload working
                "@blocknote/core": path.resolve(__dirname, "../core/src/"),
                "@blocknote/react": path.resolve(__dirname, "../react/src/"),
              } as Record<string, string>),
      },
      build: {
        sourcemap: false,
        lib: {
          entry: {
            "blocknote-mantine": path.resolve(__dirname, "src/index.tsx"),
          },
          name: "blocknote-mantine",
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
              source.startsWith("@shikijs/") ||
              source.startsWith("node:")
            );
          },
        },
      },
    }) as UserConfig,
);
