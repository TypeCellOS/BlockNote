import path from "node:path";
import { defineConfig, loadEnv } from "vite-plus";

// The suite reads its configuration from the environment; the repo root's
// `.env` (copied from `.env.sample`) works too. Loaded here because vitest
// does not load env files into `process.env` on its own — dotenv parsing
// accepts the sample's shell-style `export KEY=value` lines. Real environment
// variables win over the file.
const fileEnv = loadEnv("", path.resolve(import.meta.dirname, "../.."), "");
for (const key of [
  "BROWSERSTACK_USERNAME",
  "BROWSERSTACK_ACCESS_KEY",
  "DEVICE_TEST_TARGET",
  "DEVICE_FILTER",
]) {
  if (process.env[key] === undefined && fileEnv[key] !== undefined) {
    process.env[key] = fileEnv[key];
  }
}

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
