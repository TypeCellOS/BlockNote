import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import * as commands from "../commands/transport/index.js";
import { screenReaderCommand } from "../commands/screen-reader/transport.js";

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
  root: fileURLToPath(new URL("../../", import.meta.url)),
  publicDir: fileURLToPath(new URL("../../public", import.meta.url)),
  resolve: {
    alias: {
      "@blocknote/core": fileURLToPath(
        new URL("../../../packages/core/src", import.meta.url),
      ),
      "@blocknote/react": fileURLToPath(
        new URL("../../../packages/react/src", import.meta.url),
      ),
      "@blocknote/mantine": fileURLToPath(
        new URL("../../../packages/mantine/src", import.meta.url),
      ),
    },
    dedupe: ["react", "react-dom", "vitest-browser-react"],
  },
  test: {
    name: "screen-reader",
    setupFiles: [
      fileURLToPath(new URL("../../vitestSetup.browser.ts", import.meta.url)),
      fileURLToPath(
        new URL("../../vitestSetup.screen-reader.ts", import.meta.url),
      ),
    ],
    include: ["../packages/*/src/**/*.screen-reader.test.ts"],
    testTimeout: 300_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    retry: 0,
    // Missing baselines fail unless explicitly generated with --update.
    update: false,
    reporters: [
      "verbose",
      ["html", { outputDir: `playwright-report/screen-reader/${reader}` }],
    ],
    attachmentsDir: `.vitest/attachments/screen-reader/${reader}`,
    resolveSnapshotPath: (path, extension) =>
      `${path}-snapshots/screen-reader/${reader}${extension}`,
    browser: {
      enabled: true,
      viewport: { width: 1280, height: 720 },
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
      commands: { ...commands, screenReaderCommand },
    },
  },
});
