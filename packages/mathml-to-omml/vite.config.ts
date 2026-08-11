import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, type UserConfig } from "vite-plus";
import pkg from "./package.json";

// https://vitejs.dev/config/
export default defineConfig(
  () =>
    ({
      run: {
        tasks: {
          build: {
            command: "tsc && vp build",
            input: [
              { auto: true },
              { pattern: "!**/*.tsbuildinfo", base: "workspace" },
            ],
            output: ["dist/**", "!dist/*.tsbuildinfo"],
          },
        },
      },
      plugins: [webpackStats() as any],
      build: {
        sourcemap: true,
        lib: {
          entry: {
            "blocknote-mathml-to-omml": path.resolve(__dirname, "src/index.ts"),
          },
          name: "blocknote-mathml-to-omml",
          formats: ["es", "cjs"],
          fileName: (format, entryName) =>
            format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
        },
        rollupOptions: {
          // make sure to externalize deps that shouldn't be bundled
          // into your library
          external: (source) => {
            if (
              Object.keys({
                ...((pkg as any).dependencies || {}),
                ...((pkg as any).peerDependencies || {}),
                ...pkg.devDependencies,
              }).some((dep) => source === dep || source.startsWith(dep + "/"))
            ) {
              return true;
            }
            return source.startsWith("node:");
          },
          output: {
            globals: {},
          },
        },
      },
    }) as UserConfig,
);
