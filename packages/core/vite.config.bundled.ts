import * as path from "path";
import { defineConfig } from "vite-plus";

// import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    outDir: "../../release-tmp",
    minify: false,
    sourcemap: false,
    lib: {
      formats: ["es"],
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "blocknote",
      fileName: "blocknote.bundled",
    },
    rollupOptions: {
      // external: Object.keys(pkg.dependencies),
    },
  },
});
