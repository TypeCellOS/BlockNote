import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { configDefaults, defineConfig, type UserConfig } from "vite-plus";

// https://vitejs.dev/config/
export default defineConfig(
  (conf) =>
    ({
      run: {
        tasks: {
          build: {
            command: "tsc && vp build",
            input: [
              { auto: true },
              { pattern: "!**/*.tsbuildinfo", base: "workspace" },
            ],
            // `types/**` must be declared too: a cache replay that restores only
            // dist/ leaves consumers without declarations (tsc is skipped).
            output: ["dist/**", "types/**", "!dist/*.tsbuildinfo"],
          },
        },
      },
      test: {
        environment: "node",
        // `.browser.test` files need a real browser; the tests package's
        // browser suite runs them.
        exclude: [...configDefaults.exclude, "**/*.browser.test.*"],
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
            "blocknote-xl-typst-exporter": path.resolve(
              __dirname,
              "src/index.ts",
            ),
          },
          name: "blocknote-xl-typst-exporter",
          formats: ["es", "cjs"],
          fileName: (format, entryName) =>
            format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
        },
        rollupOptions: {
          external: (source) =>
            source.startsWith("@blocknote/") ||
            source.startsWith("@myriaddreamin/") ||
            source === "@cantoo/pdf-lib" ||
            source.startsWith("node:"),
          output: { globals: {} },
        },
      },
    }) as UserConfig,
);
