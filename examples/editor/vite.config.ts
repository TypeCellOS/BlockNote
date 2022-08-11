import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig } from "vite";
// import eslintPlugin from "vite-plugin-eslint";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // link: ['vite-react-ts-components'],
  },
  resolve: {
    alias: {
      // Comment out the line below to load a built version of blocknote
      // or, keep as is to load live from sources with live reload working
      "@blocknote/core": path.resolve(__dirname, "../../packages/core/src/"),
    },
  },
});
