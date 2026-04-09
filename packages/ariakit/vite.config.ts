import react from "@vitejs/plugin-react";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";
import pkg from "./package.json";
// import eslintPlugin from "vite-plugin-eslint";

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
            // Vite 8's postcss-import can't resolve bare package specifiers in CSS @import
            "@blocknote/react/style.css": path.resolve(
              __dirname,
              "../react/dist/style.css"
            ),
          } as Record<string, string>)
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
        "blocknote-ariakit": path.resolve(__dirname, "src/index.tsx"),
      },
      name: "blocknote-ariakit",
      cssFileName: "style",
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
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
}));
