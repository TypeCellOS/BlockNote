import react from "@vitejs/plugin-react";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, loadEnv } from "vite";
import pkg from "./package.json";
// import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig((conf) => ({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
    // https://vitest.dev/guide/features.html#environment-variables
    env: loadEnv(conf.mode, __dirname, ""),
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
      entry: {
        "blocknote-xl-ai": path.resolve(__dirname, "src/index.ts"),
        locales: path.resolve(__dirname, "src/i18n/locales/index.ts"),
        server: path.resolve(__dirname, "src/server.ts"),
      },
      name: "blocknote-xl-ai",
      formats: ["es", "cjs"],
      fileName: (format, entryName) =>
        format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
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
          }).includes(source)
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
