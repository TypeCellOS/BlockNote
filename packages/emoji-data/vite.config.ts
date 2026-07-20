import { readdirSync } from "fs";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig, type UserConfig } from "vite-plus";
import pkg from "./package.json";

const localeFiles = readdirSync(
  path.resolve(__dirname, "src/i18n/locales"),
).filter((f) => f.endsWith(".ts") && f !== "index.ts");

const perLocaleEntries = Object.fromEntries(
  localeFiles.map((f) => {
    const name = f.replace(".ts", "");
    return [
      `locales/${name}`,
      path.resolve(__dirname, `src/i18n/locales/${f}`),
    ];
  }),
);

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
      plugins: [webpackStats() as any],
      build: {
        sourcemap: true,
        lib: {
          entry: {
            "blocknote-emoji-data": path.resolve(__dirname, "src/index.ts"),
            locales: path.resolve(__dirname, "src/i18n/index.ts"),
            ...perLocaleEntries,
          },
          name: "blocknote-emoji-data",
          formats: ["es", "cjs"],
          fileName: (format, entryName) =>
            format === "es" ? `${entryName}.js` : `${entryName}.cjs`,
        },
        rollupOptions: {
          external: (source) => {
            if (
              Object.keys({
                ...pkg.dependencies,
                ...((pkg as any).peerDependencies || {}),
                ...pkg.devDependencies,
              }).some((dep) => source === dep || source.startsWith(dep + "/"))
            ) {
              return true;
            }
            return (
              source.startsWith("@blocknote/") || source.startsWith("node:")
            );
          },
          output: {
            globals: {},
          },
        },
      },
    }) as UserConfig,
);
