import * as path from "path";
import { configDefaults, defineConfig } from "vite-plus";
import pkg from "./package.json";
import { libraryBuildTask } from "../../scripts/build-cache-inputs.js";
import { typescriptBuild } from "../../scripts/vite-typescript-build.js";

// https://vitejs.dev/config/
export default defineConfig({
  run: {
    tasks: { build: libraryBuildTask("packages/core") },
  },
  test: {
    // Preserve Vitest 4 mock history during the toolchain upgrade.
    clearMocks: false,
    // Reuse the editor module graph within each worker.
    isolate: false,
    // Shared fixtures and colocated tests must use the same core module instance.
    alias: { "@blocknote/core": path.resolve(__dirname, "src/") },
    setupFiles: [
      "./vitestSetup.ts",
      "../../tests/vitestSetup.node-fixtures.ts",
    ],
    // `.browser.test` files need a real browser; the tests package's browser
    // suite runs them.
    exclude: [
      ...configDefaults.exclude,
      "**/*.browser.test.*",
      "**/*.screen-reader.test.ts",
    ],
  },
  plugins: [typescriptBuild()],
  build: {
    sourcemap: false,
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
      },
      name: "blocknote",
      cssFileName: "style",
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
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
    },
  },
});
