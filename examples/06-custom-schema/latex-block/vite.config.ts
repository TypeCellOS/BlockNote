import react from "@vitejs/plugin-react";
import * as fs from "fs";
import * as path from "path";
import { defineConfig } from "vite";

export default defineConfig((conf) => ({
  plugins: [react()],
  optimizeDeps: {},
  build: {
    sourcemap: true,
  },
  resolve: {
    alias:
      conf.command === "build" ||
      !fs.existsSync(path.resolve(__dirname, "../../../packages/core/src"))
        ? {}
        : ({
            "@blocknote/core": path.resolve(
              __dirname,
              "../../../packages/core/src/"
            ),
            "@blocknote/react": path.resolve(
              __dirname,
              "../../../packages/react/src/"
            ),
          } as any),
  },
}));
