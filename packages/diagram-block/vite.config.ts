import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, type UserConfig } from "vite-plus";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: {
          build: {
            command: "tsc && vp build",
            input: [
              { auto: true },
              { pattern: "!**/*.tsbuildinfo", base: "workspace" },
            ],
            output: ["dist/**", "!dist/*.tsbuildinfo"],
          },
        },
      },
      test: {
        setupFiles: ["./vitestSetup.ts"],
      },
      plugins: [webpackStats() as any],
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
        sourcemap: true,
        lib: {
          entry: {
            "blocknote-diagram-block": path.resolve(__dirname, "src/index.ts"),
          },
          name: "blocknote-diagram-block",
          formats: ["es", "cjs"],
          fileName: (format, entryName) =>
            format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
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
          output: {
            // Provide global variables to use in the UMD build
            // for externalized deps
            globals: {},
          },
        },
      },
    }) as UserConfig,
);
