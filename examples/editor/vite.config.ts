import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import * as path from "path";
import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // jsxRuntime: "classic", // TODO: would prefer to move to new jsxRuntime
    }),
    eslintPlugin(),
  ],
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
