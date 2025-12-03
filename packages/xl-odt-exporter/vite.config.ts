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
  plugins: [webpackStats()],
  resolve: {
    alias:
      conf.command === "build"
        ? ({
            "@shared": path.resolve(__dirname, "../../shared/"),
          } as Record<string, string>)
        : ({
            "@shared": path.resolve(__dirname, "../../shared/"),
            "@blocknote/core": path.resolve(__dirname, "../core/src/"),
            "@blocknote/react": path.resolve(__dirname, "../react/src/"),
            "@blocknote/xl-multi-column": path.resolve(
              __dirname,
              "../xl-multi-column/src/",
            ),
          } as Record<string, string>),
  },
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "blocknote-xl-odt-exporter",
      fileName: "blocknote-xl-odt-exporter",
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
}));
