import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, type UserConfig } from "vite-plus";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: {
          build: {
            command: "tsgo && vp build",
            input: [
              { auto: true },
              { pattern: "!**/*.tsbuildinfo", base: "workspace" },
            ],
            output: ["dist/**", "!dist/*.tsbuildinfo"],
          },
        },
      },
      test: {
        environment: "jsdom",
        setupFiles: ["./vitestSetup.ts"],
        testTimeout: 15000,
      },
      plugins: [webpackStats() as any],
      // resolve workspace packages from sources (live reload) in dev/test
      resolve: {
        alias:
          conf.command === "build"
            ? ({
                "@shared": path.resolve(__dirname, "../../shared/"),
              } as Record<string, string>)
            : ({
                "@shared": path.resolve(__dirname, "../../shared/"),
                "@blocknote/core": path.resolve(__dirname, "../core/src/"),
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
          entry: {
            "blocknote-xl-pdf-renderer-2": path.resolve(
              __dirname,
              "src/index.ts",
            ),
          },
          name: "blocknote-xl-pdf-renderer-2",
          formats: ["es", "cjs"],
          fileName: (format, entryName) =>
            format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
        },
        rollupOptions: {
          external: (source) =>
            source.startsWith("@blocknote/") ||
            source.startsWith("@myriaddreamin/") ||
            source === "pdf-lib" ||
            source.startsWith("node:"),
          output: { globals: {} },
        },
      },
    }) as UserConfig,
);
