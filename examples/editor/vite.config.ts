import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // link: ['vite-react-ts-components'],
  },
  resolve: {
    alias: {
      // '@blocknote/core': '/@linked/vite-react-ts-components/index.ts',
      "@blocknote/core": path.resolve(
        require.resolve("../../packages/core/src/index.ts")
      ),
    },
  },
});
