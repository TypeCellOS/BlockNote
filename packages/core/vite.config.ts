import * as path from "path";
import { defineConfig } from "vite";
import pkg from "./package.json";
// import eslintPlugin from "vite-plugin-eslint";

const deps = Object.keys(pkg.dependencies);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "blocknote",
      fileName: "blocknote",
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: (source: string) => {
        if (deps.includes(source)) {
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
      },
    },
  },
});
