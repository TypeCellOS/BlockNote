import * as path from "path";
import { defineConfig } from "vite";

// import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    outDir: "../../release-tmp",
    minify: false,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "blocknote",
      fileName: "blocknote.bundled",
    },
    rollupOptions: {
      // external: Object.keys(pkg.dependencies),
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          // react: "React",
          // "react-dom": "ReactDOM",
        },
      },
    },
  },
});
