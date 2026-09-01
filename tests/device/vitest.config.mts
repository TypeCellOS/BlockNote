import { defineConfig } from "vite-plus";

/**
 * Device suite (local Android emulator + iOS simulator). Not part of the
 * workspace projects on purpose: it needs a booted emulator/simulator, so it
 * only runs via `pnpm run test:device` (locally or from the emulator-tests
 * workflow). Configured through plain environment variables (`DEVICE_FILTER`,
 * `DEVICE_TEST_TARGET`).
 */
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ["**/*.device.test.ts"],
    globalSetup: ["./lib/tunnel.ts"],
    // Device sessions are slow to create and drive.
    testTimeout: 240_000,
    hookTimeout: 180_000,
    teardownTimeout: 60_000,
    // One retry absorbs genuine device flake (session allocation, emulator
    // hiccups) without hiding real regressions.
    retry: 1,
    // Serial: OS taps land on the foreground app, so only one session can
    // own the device's screen at a time.
    fileParallelism: false,
    passWithNoTests: true,
  },
});
