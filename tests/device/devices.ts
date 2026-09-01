import {
  LocalAndroidSession,
  localAndroidAvailable,
} from "./lib/localAndroid.js";
import { LocalIosSession, localIosAvailable } from "./lib/localIos.js";
import type { DeviceSession, Platform, TargetKind } from "./lib/session.js";

export type DeviceTarget = {
  /** Stable id, used in test names and `DEVICE_FILTER` matching. */
  id: string;
  platform: Platform;
  kind: TargetKind;
  /** Whether this machine/environment can drive the target right now. */
  available: () => Promise<boolean>;
  createSession: () => Promise<DeviceSession>;
};

/**
 * All targets. Both are the per-PR layer — free, deterministic, and with
 * input channels no cloud service has (the on-screen keyboard itself).
 * Real-hardware coverage (OEM keyboards like Samsung Keyboard) is a manual
 * release-checklist item; a BrowserStack backend existed behind the same
 * session interface (PR #3034 has it) and can be revived if it ever earns
 * its keep again.
 */
export const DEVICE_TARGETS: DeviceTarget[] = [
  {
    id: "local-android-emulator",
    platform: "android",
    kind: "local-android",
    available: localAndroidAvailable,
    createSession: () => LocalAndroidSession.create(),
  },
  {
    id: "local-ios-simulator",
    platform: "ios",
    kind: "local-ios",
    available: localIosAvailable,
    createSession: () => LocalIosSession.create(),
  },
];

/**
 * Targets selected for this run: reachable ones, narrowed by
 * `DEVICE_FILTER=<id substring>`. Unreachable targets are skipped so the
 * suite runs whatever a machine can drive — CI's Android job sees only the
 * emulator, the macOS job only the simulator, a laptop with both both.
 */
export async function activeDevices(): Promise<DeviceTarget[]> {
  const filter = process.env.DEVICE_FILTER;
  const candidates = filter
    ? DEVICE_TARGETS.filter((d) => d.id.includes(filter))
    : DEVICE_TARGETS;
  const flags = await Promise.all(candidates.map((d) => d.available()));
  // On CI a filtered-in target is a promise, not a suggestion: its job exists
  // to run exactly that target, so an availability-probe failure must fail
  // the job — silently skipping would render 0 tests and a green check.
  if (process.env.CI && filter) {
    const missing = candidates.filter((_, i) => !flags[i]);
    if (missing.length > 0) {
      throw new Error(
        `CI selected ${missing.map((d) => d.id).join(", ")} via ` +
          `DEVICE_FILTER=${filter}, but the availability probe failed — ` +
          `the target's toolchain is broken on this runner.`,
      );
    }
  }
  return candidates.filter((_, i) => flags[i]);
}
