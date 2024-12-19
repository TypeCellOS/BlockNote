import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite";

export default defineConfig((conf) => ({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitestSetup.ts"],
  },
  plugins: [webpackStats() as any],
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
          } as Record<string, string>),
  },
  server: {
    fs: {
      allow: ["../../shared"],
    },
  },
  build: {
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "blocknote-xl-odt-exporter",
      fileName: "blocknote-xl-odt-exporter",
    },
    rollupOptions: {
      external: (source: string) =>
        source.startsWith("@blocknote/") ||
        source === "react" ||
        source === "adm-zip" ||
        source === "jsx-xml",
      output: {
        globals: {},
        interop: "compat",
      },
    },
  },
}));
