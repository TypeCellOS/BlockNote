import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vitest/config";
import pkg from "./package.json";
// import eslintPlugin from "vite-plugin-eslint";



// https://vitejs.dev/config/
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
  },
  plugins: [webpackStats()],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        blocknote: path.resolve(__dirname, "src/index.ts"),
        comments: path.resolve(__dirname, "src/comments/index.ts"),
        blocks: path.resolve(__dirname, "src/blocks/index.ts"),
        locales: path.resolve(__dirname, "src/i18n/index.ts"),
        extensions: path.resolve(__dirname, "src/extensions/index.ts"),
        yjs: path.resolve(__dirname, "src/yjs/index.ts"),
      },
      name: "blocknote",
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
        globals: {},
        interop: "compat", // https://rollupjs.org/migration/#changed-defaults
      },
    },
  },
});
