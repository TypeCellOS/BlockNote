// Discovers colocated tests and starts the fixture app; one worker owns OS focus.
import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const reader = process.env.BLOCKNOTE_SCREEN_READER;
if (
  !reader &&
  process.platform !== "linux" &&
  !process.argv.includes("--list")
) {
  throw new Error(
    "Run browser-only accessibility tests in Docker with vp run a11y.",
  );
}
if (reader !== undefined && reader !== "voiceover" && reader !== "nvda") {
  throw new Error(
    "BLOCKNOTE_SCREEN_READER must be voiceover or nvda (or unset for Docker browser tests).",
  );
}
if (
  (reader === "voiceover" && process.platform !== "darwin") ||
  (reader === "nvda" && process.platform !== "win32")
) {
  throw new Error("VoiceOver requires macOS; NVDA requires Windows.");
}

export default defineConfig({
  testDir: "../../packages",
  testMatch: "**/*.a11y.spec.ts",
  timeout: reader ? 300_000 : 120_000,
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/screen-reader/{arg}-{projectName}-{platform}{ext}",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      pathTemplate:
        "{testDir}/{testFilePath}-snapshots/visual/{arg}-{projectName}-{platform}{ext}",
    },
  },
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Baselines are created/changed only with an explicit --update-snapshots run.
  updateSnapshots: "none",
  outputDir: `../test-results/a11y/${reader ?? "browser"}`,
  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: `../playwright-report/a11y/${reader ?? "browser"}`,
        open: "never",
      },
    ],
  ],
  use: {
    baseURL: "http://127.0.0.1:5190",
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    colorScheme: "light",
    headless: !reader,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: reader
    ? [
        {
          name: reader,
          use: { browserName: reader === "voiceover" ? "webkit" : "chromium" },
        },
      ]
    : [{ name: "chromium-linux", use: { browserName: "chromium" } }],
  webServer: {
    command: "pnpm exec vp dev --config a11y/vite.config.ts",
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    url: "http://127.0.0.1:5190",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
