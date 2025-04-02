import react from "@vitejs/plugin-react";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import pkg from "./package.json";
// import eslintPlugin from "vite-plugin-eslint";

const deps = Object.keys(pkg.dependencies);

// https://vitejs.dev/config/
export default defineConfig((conf) => ({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
  },
  plugins: [react(), webpackStats()],
  // used so that vitest resolves the core package from the sources instead of the built version
  resolve: {
    alias:
      conf.command === "build"
        ? ({
            "@shared": path.resolve(__dirname, "../../shared/"),
          } as Record<string, string>)
        : ({
            // load live from sources with live reload working
            "@blocknote/core": path.resolve(__dirname, "../core/src/"),
            "@blocknote/mantine": path.resolve(__dirname, "../mantine/src/"),
            "@blocknote/react": path.resolve(__dirname, "../react/src/"),
            "@shared": path.resolve(__dirname, "../../shared/"),
          } as Record<string, string>),
  },
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "blocknote-xl-ai",
      fileName: "blocknote-xl-ai",
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: (source: string) => {
        if (deps.includes(source)) {
          return true;
        }
        return (
          source.startsWith("prosemirror-") ||
          source.startsWith("@shikijs/lang") ||
          source.startsWith("@shikijs/theme")
        );
      },
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
        interop: "compat", // https://rollupjs.org/migration/#changed-defaults
      },
    },
  },
}));
