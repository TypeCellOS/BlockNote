import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import pkg from "./package.json";
// import eslintPlugin from "vite-plugin-eslint";

const deps = Object.keys({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
  ...pkg.devDependencies,
});

// https://vitejs.dev/config/
export default defineConfig((conf) => ({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
  },
  plugins: [webpackStats()],
  resolve: {
    alias:
      conf.command === "build"
        ? ({
            "@shared": path.resolve(__dirname, "../../shared/"),
          } as Record<string, string>)
        : ({
            "@shared": path.resolve(__dirname, "../../shared/"),
            // load live from sources with live reload working
            "@blocknote/core": path.resolve(__dirname, "../core/src/"),
          } as Record<string, string>),
  },
  build: {
    sourcemap: true,
    lib: {
      entry: {
        "blocknote-xl-multi-column": path.resolve(__dirname, "src/index.ts"),
      },
      name: "blocknote-xl-multi-column",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: (source: string) => {
        if (deps.includes(source)) {
          return true;
        }

        if (source === "react/jsx-runtime") {
          return true;
        }

        if (source.startsWith("prosemirror-")) {
          return true;
        }

        return false;
      },
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
        interop: "compat", // https://rollupjs.org/migration/#changed-defaults
      },
    },
  },
}));
