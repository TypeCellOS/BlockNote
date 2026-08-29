import { defineConfig } from "vite-plus";

/**
 * Real-device suite (BrowserStack). Not part of the workspace projects on
 * purpose: it costs device minutes and needs credentials, so it only runs via
 * `pnpm run test:device` (locally or from the device-tests workflow).
 */
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ["**/*.device.test.ts"],
    globalSetup: ["./lib/tunnel.ts"],
    // Real-device sessions are slow to create and drive.
    testTimeout: 240_000,
    hookTimeout: 180_000,
    teardownTimeout: 60_000,
    // One retry absorbs genuine device flake (session allocation, tunnel
    // hiccups) without hiding real regressions.
    retry: 1,
    // Serial keeps BrowserStack parallel-session usage predictable; raise via
    // maxConcurrency/fileParallelism once the matrix outgrows the plan.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
