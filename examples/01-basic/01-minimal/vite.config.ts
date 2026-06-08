// AUTO-GENERATED FILE, DO NOT EDIT DIRECTLY
import react from "@vitejs/plugin-react";
import * as fs from "fs";
import * as path from "path";
import { defineConfig } from "vite";
// import eslintPlugin from "vite-plugin-eslint";
// https://vitejs.dev/config/
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
            // Comment out the lines below to load a built version of blocknote
            // or, keep as is to load live from sources with live reload working
            "@blocknote/core": path.resolve(
              __dirname,
              "../../../packages/core/src/"
            ),
            "@blocknote/react": path.resolve(
              __dirname,
              "../../../packages/react/src/"
            ),
            // mantine pulls in @blocknote/core too; alias it to src so the demo
            // doesn't load a stale built packages/core/dist alongside the live
            // source (dual-package hazard that loaded the pre-fix getBlockFromPos).
            "@blocknote/mantine": path.resolve(
              __dirname,
              "../../../packages/mantine/src/"
            ),
          } as any),
  },
}));
