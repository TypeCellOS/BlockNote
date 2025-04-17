import * as path from "path";
import { defineConfig } from "vite";
import eslintPlugin from "vite-plugin-eslint";

// https://vitejs.dev/config/
export default defineConfig((conf) => ({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
    include: ["./src/unit/**/*.test.ts"],
  },
  resolve: {
    alias:
      conf.command === "build"
        ? ({} as Record<string, string>)
        : ({
            // load live from sources with live reload working
            "@blocknote/core": path.resolve(__dirname, "../packages/core/src/"),
            "@blocknote/react": path.resolve(
              __dirname,
              "../packages/react/src/"
            ),
          } as Record<string, string>),
  },
}));
