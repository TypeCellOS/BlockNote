import react from "@vitejs/plugin-react";
import * as path from "path";
import { defineConfig } from "vite";
import { playwright } from "@vitest/browser-playwright";

// Vitest browser mode config – runs tests in real Chromium via Playwright.
// Run with: pnpm test:browser (from /tests)
export default defineConfig((conf) => ({
  plugins: [react()],
  test: {
    include: ["./src/browser/**/*.test.ts", "./src/browser/**/*.test.tsx"],
    browser: {
      enabled: true,
      provider: playwright(),
      headless: true,
      instances: [{ browser: "chromium" }],
      // toMatchScreenshot defaults – be lenient since BlockNote renders
      // include things like blinking cursors / awareness markers.
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: {
            threshold: 0.2,
            allowedMismatchedPixelRatio: 0.02,
          },
        },
      },
    },
  },
  resolve: {
    alias:
      conf.command === "build"
        ? ({
            "@shared": path.resolve(__dirname, "../shared/"),
          } as Record<string, string>)
        : ({
            "@shared": path.resolve(__dirname, "../shared/"),
            // load live from sources with live reload working
            "@blocknote/core": path.resolve(__dirname, "../packages/core/src/"),
            "@blocknote/react": path.resolve(
              __dirname,
              "../packages/react/src/",
            ),
          } as Record<string, string>),
  },
}));
