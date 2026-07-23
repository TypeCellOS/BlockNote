import { readdirSync } from "fs";
import * as path from "path";
import { webpackStats } from "rollup-plugin-webpack-stats";
import { defineConfig } from "vite-plus";
import pkg from "./package.json";

const emojiLocaleFiles = readdirSync(
  path.resolve(__dirname, "src/emoji-data/i18n/locales"),
).filter((f) => f.endsWith(".ts") && f !== "index.ts");

const perEmojiLocaleEntries = Object.fromEntries(
  emojiLocaleFiles.map((f) => {
    const name = f.replace(".ts", "");
    return [
      `emoji-data/locales/${name}`,
      path.resolve(__dirname, `src/emoji-data/i18n/locales/${f}`),
    ];
  }),
);

const frimousseFiles = readdirSync(
  path.resolve(__dirname, "src/emoji-data/frimousse"),
).filter(
  (f) =>
    f.endsWith(".ts") &&
    f !== "index.ts" &&
    f !== "types.ts" &&
    f !== "loadFrimousseData.ts" &&
    f !== "seed.ts",
);

const perFrimousseEntries = Object.fromEntries(
  frimousseFiles.map((f) => {
    const name = f.replace(".ts", "");
    return [
      `emoji-data/frimousse/${name}`,
      path.resolve(__dirname, `src/emoji-data/frimousse/${f}`),
    ];
  }),
);

// https://vitejs.dev/config/
export default defineConfig({
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
  },
  plugins: [webpackStats()],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        blocknote: path.resolve(__dirname, "src/index.ts"),
        comments: path.resolve(__dirname, "src/comments/index.ts"),
        blocks: path.resolve(__dirname, "src/blocks/index.ts"),
        locales: path.resolve(__dirname, "src/i18n/index.ts"),
        extensions: path.resolve(__dirname, "src/extensions/index.ts"),
        yjs: path.resolve(__dirname, "src/yjs/index.ts"),
        y: path.resolve(__dirname, "src/y/index.ts"),
        "emoji-data": path.resolve(__dirname, "src/emoji-data/index.ts"),
        "emoji-data/frimousse": path.resolve(
          __dirname,
          "src/emoji-data/frimousse/index.ts",
        ),
        "emoji-data/frimousse/types": path.resolve(
          __dirname,
          "src/emoji-data/frimousse/types.ts",
        ),
        "emoji-data/frimousse/loadFrimousseData": path.resolve(
          __dirname,
          "src/emoji-data/frimousse/loadFrimousseData.ts",
        ),
        "emoji-data/frimousse/seed": path.resolve(
          __dirname,
          "src/emoji-data/frimousse/seed.ts",
        ),
        ...perFrimousseEntries,
        "emoji-data/locales": path.resolve(
          __dirname,
          "src/emoji-data/i18n/index.ts",
        ),
        ...perEmojiLocaleEntries,
      },
      name: "blocknote",
      cssFileName: "style",
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
            ...pkg.dependencies,
            ...((pkg as any).peerDependencies || {}),
            ...pkg.devDependencies,
          }).some((dep) => source === dep || source.startsWith(dep + "/"))
        ) {
          return true;
        }
        return (
          source.startsWith("react/") ||
          source.startsWith("react-dom/") ||
          source.startsWith("prosemirror-") ||
          source.startsWith("@tiptap/") ||
          source.startsWith("@blocknote/") ||
          source.startsWith("@shikijs/") ||
          source.startsWith("node:")
        );
      },
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {},
      },
    },
  },
});
