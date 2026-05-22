import * as path from "path";
import { defineConfig, type UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser/providers/playwright";
import { playwrightMouse } from "./src/end-to-end/commands/playwrightMouse.js";

// e2e tests mount example `App` components, which import the `@blocknote/*`
// packages. We deliberately resolve those to their BUILT `dist` (the default
// package resolution — no source aliases) rather than to source: it matches
// what the old e2e suite tested (the built playground preview) and keeps the
// browser dep graph small enough to optimize quickly. Run a package build
// before the suite so `dist` is current.
const aliases: Record<string, string> = {
  "@shared": path.resolve(__dirname, "../shared"),
  // Lets e2e tests mount example apps via `@examples/<group>/<name>/src/App`.
  "@examples": path.resolve(__dirname, "../examples"),
};

// https://vitejs.dev/config/
export default defineConfig(
  () =>
    ({
      test: {
        name: "e2e",
        // e2e tests are `.tsx` (they mount example `App` components via JSX).
        // Note: discovery only matches the recursive `**/*.test.tsx` glob, and
        // files must live in a subdirectory (not directly under `end-to-end/`).
        include: ["./src/end-to-end/**/*.test.tsx"],
        setupFiles: ["./vitestSetup.browser.ts"],
        browser: {
          enabled: true,
          provider: playwright({
            launchOptions: {
              args: ["--no-sandbox", "--disable-setuid-sandbox"],
            },
          }),
          headless: !!process.env.CI,
          commands: { playwrightMouse },
          instances: [
            { browser: "chromium" },
            { browser: "firefox" },
            { browser: "webkit" },
          ],
        },
      },
      resolve: {
        alias: aliases,
      },
      // `fsevents` is a Mac-only native Node addon pulled in transitively by the
      // watcher; it must never be bundled into the browser graph.
      optimizeDeps: {
        exclude: ["fsevents"],
      },
    }) as UserConfig,
);
