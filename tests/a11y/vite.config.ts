import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
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
if (reader && reader !== "voiceover" && reader !== "nvda") {
  throw new Error("Unknown screen reader");
}
if (
  (reader === "voiceover" && process.platform !== "darwin") ||
  (reader === "nvda" && process.platform !== "win32")
) {
  throw new Error("VoiceOver requires macOS; NVDA requires Windows.");
}
if (!reader && process.platform !== "linux") {
  throw new Error("Run browser-only a11y tests in Docker with vp run a11y.");
}

export default defineConfig({
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
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
    include: [
      reader
        ? "../packages/*/src/**/*.screen-reader.test.ts"
        : "../packages/*/src/**/*.{a11y,axe}.test.ts",
    ],
    testTimeout: reader ? 300_000 : 120_000,
    hookTimeout: 30_000,
    fileParallelism: false,
    retry: 0,
    // Missing baselines fail unless explicitly generated with --update.
    update: false,
    reporters: [
      "verbose",
      ["html", { outputDir: `playwright-report/a11y/${reader ?? "browser"}` }],
    ],
    attachmentsDir: `test-results/a11y/${reader ?? "browser"}`,
    resolveSnapshotPath: (path, extension) =>
      reader
        ? `${path}-snapshots/screen-reader/${reader}${extension}`
        : `${path}-snapshots/aria/browser${extension}`,
    browser: {
      enabled: true,
      headless: !reader,
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
          name: reader ?? "a11y-browser",
        },
      ],
      commands: {
        readAriaSnapshot,
        startReader,
        pressKey,
        readTranscript,
        stopReader,
      },
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: { allowedMismatchedPixels: 10 },
          resolveScreenshotPath: ({
            root,
            testFileDirectory,
            testFileName,
            arg,
            ext,
            browserName,
            platform,
          }) =>
            resolve(
              root,
              testFileDirectory,
              `${testFileName}-snapshots/visual/${arg}-${browserName}-${platform}${ext}`,
            ),
        },
      },
    },
  },
});
