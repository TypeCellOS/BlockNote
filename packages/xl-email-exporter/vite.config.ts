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
        tasks: { build: libraryBuildTask("packages/xl-email-exporter") },
      },
      test: {
        // Preserve Vitest 4 mock history during the toolchain upgrade.
        clearMocks: false,
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
        setupFiles: ["../../tests/vitestSetup.node-fixtures.ts"],
        // assetsInclude: [
        //   "**/*.woff",
        //   "**/*.woff2",
        //   "**/*.ttf",
        //   "**/*.otf",
        // ], // Add other font extensions if needed
      },
      plugins: [typescriptBuild()],
      // used so that vitest resolves the core package from the sources instead of the built version
      resolve: {
        alias:
          conf.command === "build"
            ? ({} as Record<string, string>)
            : ({
                // load live from sources with live reload working
                "@blocknote/core": path.resolve(__dirname, "../core/src/"),
                "@blocknote/react": path.resolve(__dirname, "../react/src/"),
              } as Record<string, string>),
      },
      build: {
        // assetsInclude: ["**/*.woff", "**/*.woff2", "**/*.ttf", "**/*.otf"], // Add other font extensions if needed
        sourcemap: false,
        lib: {
          formats: ["es"],
          entry: path.resolve(__dirname, "src/index.ts"),
          name: "blocknote-xl-email-exporter",
          fileName: "blocknote-xl-email-exporter",
        },
        rollupOptions: {
          // make sure to externalize deps that shouldn't be bundled
          // into your library
          external: (source) => {
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
