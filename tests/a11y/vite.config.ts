import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import {
  readAriaSnapshot,
  startReader,
  pressKey,
  readTranscript,
  stopReader,
} from "./commands.js";

const reader = process.env.BLOCKNOTE_SCREEN_READER;
if (reader !== "voiceover" && reader !== "nvda") {
  throw new Error("Unknown screen reader");
}
if (
  (reader === "voiceover" && process.platform !== "darwin") ||
  (reader === "nvda" && process.platform !== "win32")
) {
  throw new Error("VoiceOver requires macOS; NVDA requires Windows.");
}

export default defineConfig({
  root: fileURLToPath(new URL("../", import.meta.url)),
  publicDir: fileURLToPath(new URL("../public", import.meta.url)),
  resolve: {
    alias: {
      "@root": fileURLToPath(new URL("../../", import.meta.url)),
      "@blocknote/core": fileURLToPath(
        new URL("../../packages/core/src", import.meta.url),
      ),
      "@blocknote/react": fileURLToPath(
        new URL("../../packages/react/src", import.meta.url),
      ),
      "@blocknote/mantine": fileURLToPath(
        new URL("../../packages/mantine/src", import.meta.url),
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    name: "a11y",
    setupFiles: [fileURLToPath(new URL("./setup.ts", import.meta.url))],
    include: ["../packages/*/src/**/*.screen-reader.test.ts"],
    testTimeout: 300_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    retry: 0,
    // Missing baselines fail unless explicitly generated with --update.
    update: false,
    reporters: [
      "verbose",
      ["html", { outputDir: `playwright-report/a11y/${reader}` }],
    ],
    attachmentsDir: `.vitest/attachments/a11y/${reader}`,
    resolveSnapshotPath: (path, extension) =>
      `${path}-snapshots/screen-reader/${reader}${extension}`,
    browser: {
      enabled: true,
      headless: false,
      screenshotFailures: false,
      locators: { testIdAttribute: "data-id" },
      provider: playwright({
        contextOptions: {
          viewport: { width: 1280, height: 900 },
          locale: "en-US",
          colorScheme: "light",
        },
      }),
      instances: [
        {
          browser: reader === "voiceover" ? "webkit" : "chromium",
          name: reader,
        },
      ],
      commands: {
        readAriaSnapshot,
        startReader,
        pressKey,
        readTranscript,
        stopReader,
      },
    },
  },
});
